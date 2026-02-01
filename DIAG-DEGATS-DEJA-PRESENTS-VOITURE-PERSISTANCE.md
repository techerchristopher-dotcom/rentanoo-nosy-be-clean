# DIAGNOSTIC "Dégâts déjà présents" (VOITURE) — PERSISTANCE (ÉCRITURE)

## 📊 UI/RHF → save payload → DB → snapshot_legal/PDF + edge cases

---

## 1) SAVE PAYLOAD (OÙ ÇA S'ÉCRIT EXACTEMENT)

### `saveStep3ZoneDraft()` — Merge des dégâts

**Fichier** : `src/services/checkinDepartService.ts`  
**Lignes** : 350-459

**Logique de merge** (lignes 402-412) :
```typescript
// Remplacer les dégâts de cette zone par ceux fournis (si fournis)
let mergedDamageReports = existingDamageReports;
if (Array.isArray(zoneDamageReports)) {
  const sidesToReplace = Array.isArray(scopeSides) && scopeSides.length > 0 ? scopeSides : [zoneKey];
  mergedDamageReports = [
    // garder les dégâts des côtés hors scope
    ...existingDamageReports.filter((d) => !sidesToReplace.includes((d as any)?.side)),
    // ajouter ceux fournis pour le scope courant
    ...zoneDamageReports,
  ];
}
```

**Règle précise** :
- ✅ **On remplace les dégâts des zones spécifiées** (`sidesToReplace`)
- ✅ **On garde les dégâts des autres zones** (hors scope)
- ✅ **Pas de merge** : remplacement complet des dégâts de la zone courante

**Payload envoyé** (lignes 431-440) :
```typescript
await SupabaseCheckinService.saveCheckinDraft({
  checkin_id: existing?.id || checkinId || null,
  booking_id: bookingId,
  status: "draft",
  data: {
    step3: mergedStep3,  // ⭐ Contient damageReports mergé
  },
});
```

---

### `saveCheckinDraft()` — Écriture DB

**Fichier** : `src/services/supabaseCheckinService.ts`  
**Lignes** : 79-330

**Extraction depuis `step3.damageReports`** (lignes 164, 267) :
```typescript
// ⭐ Extraire Step3 : Extérieur & Coffre
const step3 = mergedData?.step3;
const degats = step3?.damageReports || [];
```

**Écriture double** :

1. **JSONB `data.step3.damageReports`** (ligne 189) :
```typescript
const updatePayload: any = {
  status: dataToSave.status || "draft",
  data: mergedData,  // ⭐ Contient step3.damageReports
  // ...
  degats: degats,  // ⭐ Colonne SQL
};
```

2. **Colonne SQL `degats`** (lignes 202, 301) :
```typescript
degats: degats,  // ⭐ Écriture directe dans colonne SQL
```

**Les 2 sont écrits** :
- ✅ `checkin_depart.data.step3.damageReports` (JSONB)
- ✅ `checkin_depart.degats` (JSONB array, colonne SQL)

**Quel est relu ensuite** :
- ✅ **Source de vérité pour hydratation** : `data.step3.damageReports` uniquement
- ❌ **Colonne SQL `degats`** : jamais relue pour hydratation (utilisée pour requêtes SQL directes)

---

## 2) MERGE / DÉDOUBLONNAGE (RÈGLES EXACTES)

### Règle de remplacement par zone

**Fichier** : `src/services/checkinDepartService.ts`  
**Lignes** : 402-412

**Logique** :
```typescript
const sidesToReplace = Array.isArray(scopeSides) && scopeSides.length > 0 ? scopeSides : [zoneKey];
mergedDamageReports = [
  // garder les dégâts des côtés hors scope
  ...existingDamageReports.filter((d) => !sidesToReplace.includes((d as any)?.side)),
  // ajouter ceux fournis pour le scope courant
  ...zoneDamageReports,
];
```

**Règle** :
- ✅ **Filtrage** : Supprime tous les dégâts dont `side` est dans `sidesToReplace`
- ✅ **Ajout** : Ajoute tous les nouveaux dégâts de `zoneDamageReports`
- ✅ **Conservation** : Garde tous les dégâts des zones hors scope

**Exemple** :
- Zone courante : `"avant"`
- Dégâts existants : `[{side: "avant", ...}, {side: "droit", ...}]`
- Nouveaux dégâts : `[{side: "avant", ...}]`
- Résultat : `[{side: "droit", ...}, {side: "avant", ...}]` (droit conservé, avant remplacé)

**Pas de dédoublonnage** : Si `zoneDamageReports` contient plusieurs dégâts pour la même zone, ils sont tous ajoutés.

---

## 3) SNAPSHOT_LÉGAL / PDF (MAPPING EXACT)

### `createLegalSnapshot()` — Mapping vers snapshot

**Fichier** : `src/services/supabaseCheckinService.ts`  
**Lignes** : 395-883

**Source** (ligne 551) :
```typescript
const damageReports = step3?.damageReports || [];
```

**Mapping** (lignes 645-656) :
```typescript
// ⭐ Phase 4.B.3 : Transformation side → zone pour les dégâts extérieurs
// Les damageReports de step3 utilisent 'side', mais le snapshot attend 'zone'
damages: (damageReports || []).map((damage: any) => ({
  zone: damage.side || damage.zone || null, // Priorité à side, sinon zone (rétrocompatibilité), sinon null
  typeDegats: damage.typeDegats || [],
  commentaire: damage.commentaire ?? null,
  photos: (damage.photos || []).map((photo: any) => ({
    publicUrl: photo.publicUrl || '',
    uploadedAt: photo.uploadedAt || '',
    storagePath: photo.storagePath || '',
  })),
})),
```

**Transformation** :
- ✅ `side` → `zone` (mapping de champ)
- ✅ `typeDegats` → `typeDegats` (inchangé)
- ✅ `commentaire` → `commentaire` (inchangé)
- ✅ `photos[]` → `photos[]` (mapping des champs de chaque photo : `publicUrl`, `uploadedAt`, `storagePath`)

**Destination** : `snapshot_legal.exterior.damages[]`

**Écriture snapshot** (lignes 750-780) :
```typescript
const { data, error } = await supabase
  .from("checkin_depart" as any)
  .update({
    snapshot_legal: snapshot,  // ⭐ JSONB complet
    // ... colonnes SQL extraites
  })
  .eq("id", checkinId);
```

**PDF** : Non trouvé dans le code analysé. Le PDF consomme probablement `snapshot_legal` (immutable) plutôt que `data.step3.damageReports` (modifiable).

---

## 4) EDGE CASES (AVEC CONDITIONS CITÉES)

### Statuts de `checkin_depart`

**Statuts existants** :
- ✅ `"draft"` : Modifiable, peut être sauvegardé
- ✅ `"completed"` : Verrouillé, ne peut plus être modifié
- ✅ `"cancelled"` : Verrouillé, ne peut plus être modifié

**Vérification verrouillage** (`supabaseCheckinService.ts:115-125`) :
```typescript
const currentStatus = (existingCheckinStatus as any)?.status;
if (currentStatus === "completed" || currentStatus === "cancelled") {
  console.warn(
    "[SupabaseCheckinService] ⚠️ Tentative de modification d'un check-in finalisé:",
    { checkin_id, currentStatus }
  );
  return {
    data: null,
    error: `Impossible de modifier un état des lieux finalisé (status = ${currentStatus}).`,
  };
}
```

**Création snapshot** (`supabaseCheckinService.ts:428-438`) :
```typescript
if (checkinTyped.status !== "draft") {
  console.warn(
    "[SupabaseCheckinService] ⚠️ Le check-in doit être en statut 'draft' pour créer un snapshot. Statut actuel:",
    checkinTyped.status
  );
  return {
    data: null,
    error: `Le check-in doit être en statut 'draft' pour créer un snapshot. Statut actuel: ${checkinTyped.status}`,
    snapshotCreated: false,
  };
}
```

---

### Cas 1 : Pas de draft existant

**Condition** (`checkinDepartService.ts:372-381`) :
```typescript
let existing: CheckinDepart | null = null;
if (checkinId) {
  const { data, error } = await SupabaseCheckinService.getCheckinById(checkinId);
  existing = data;
} else {
  const { data, error } = await SupabaseCheckinService.getCheckinByBookingId(bookingId);
  existing = data;
}
```

**Comportement** :
- Si `existing === null` → `existingData = {}`, `existingStep3 = {}`, `existingDamageReports = []`
- `mergedDamageReports = zoneDamageReports` (pas de merge, remplacement complet)

---

### Cas 2 : Draft partiel sans `step3`

**Condition** (`checkinDepartService.ts:383-387`) :
```typescript
const existingData = existing?.data || {};
const existingStep3 = existingData.step3 || {};
const existingDamageReports: ExteriorDamage[] = existingStep3.damageReports || [];
```

**Comportement** :
- Si `step3` absent → `existingStep3 = {}`, `existingDamageReports = []`
- `mergedDamageReports = zoneDamageReports` (pas de merge, remplacement complet)

---

### Cas 3 : `damageReports` absent / null / non-array

**Condition** (`checkinDepartService.ts:404`) :
```typescript
if (Array.isArray(zoneDamageReports)) {
  // Merge
} else {
  // Pas de merge, garde existingDamageReports
}
```

**Comportement** :
- Si `zoneDamageReports` n'est pas un array → `mergedDamageReports = existingDamageReports` (aucun changement)
- Si `existingDamageReports` est `null/undefined` → `existingDamageReports = []` (ligne 387)

**Extraction DB** (`supabaseCheckinService.ts:164, 267`) :
```typescript
const degats = step3?.damageReports || [];  // ⭐ Fallback [] si absent/null
```

---

### Cas 4 : Plusieurs drafts (order/limit)

**Requête chargement** (`EtatDesLieuxDepartForm.tsx:1077-1084`) :
```typescript
const { data: existingCheckin, error } = await supabase
  .from("checkin_depart")
  .select("*")
  .eq("booking_id", bookingId)
  .eq("status", "draft")
  .order("created_at", { ascending: false })  // ⭐ Plus récent en premier
  .limit(1)  // ⭐ Un seul draft
  .maybeSingle();
```

**Comportement** :
- ✅ **Un seul draft** est chargé (le plus récent)
- ✅ Les autres drafts sont ignorés
- ⚠️ **Risque** : Si plusieurs drafts existent, seul le plus récent est utilisé

---

### Cas 5 : Snapshot déjà existant

**Condition** (`supabaseCheckinService.ts:441-448`) :
```typescript
if (checkinTyped.snapshot_legal && !options?.force) {
  console.log("[SupabaseCheckinService] ℹ️ Snapshot déjà existant (force=false, on ne l'écrase pas)");
  return {
    data: checkinTyped,
    error: null,
    snapshotCreated: false,
  };
}
```

**Comportement** :
- ✅ Si `snapshot_legal` existe et `force=false` → pas de réécriture
- ✅ Si `force=true` → snapshot réécrit

---

## RÉSUMÉ EXÉCUTIF

| Aspect | Réponse |
|--------|---------|
| **Écriture DB** | Double : `data.step3.damageReports` (JSONB) + `degats` (colonne SQL) |
| **Règle de merge** | Remplacement par zone : supprime dégâts de la zone, garde les autres |
| **Mapping snapshot** | `side` → `zone`, autres champs inchangés |
| **Statuts** | `draft` (modifiable), `completed`/`cancelled` (verrouillé) |
| **Pas de draft** | `existingDamageReports = []`, remplacement complet |
| **Draft sans step3** | `existingStep3 = {}`, `existingDamageReports = []` |
| **damageReports absent** | Fallback `[]`, pas de merge si `zoneDamageReports` non-array |
| **Plusieurs drafts** | Un seul chargé (le plus récent via `.order().limit(1)`) |

---

**FIN RAPPORT PERSISTANCE**

