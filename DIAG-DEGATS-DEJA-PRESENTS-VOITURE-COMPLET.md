# DIAGNOSTIC "Dégâts déjà présents" (VOITURE) — RAPPORT COMPLET

## 📊 DB/snapshot → service → hydratation RHF → UI

---

## 1) SOURCE(S) LUES + PRIORITÉ/FALLBACK

### Source unique : `checkin_depart.data.step3.damageReports` (JSONB)

**Requête Supabase** (`EtatDesLieuxDepartForm.tsx:1077-1084`) :
```typescript
const { data: existingCheckin, error } = await supabase
  .from("checkin_depart")
  .select("*")  // ⭐ Charge toutes les colonnes (incluant degats, snapshot_legal)
  .eq("booking_id", bookingId)
  .eq("status", "draft")
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
```

**Extraction** (`EtatDesLieuxDepartForm.tsx:829, 935-937`) :
```typescript
const step3 = checkin.data?.step3;  // ⭐ Depuis JSONB data

// Dégâts
if (step3.damageReports && Array.isArray(step3.damageReports)) {
  methods.setValue("damageReports", step3.damageReports);
  console.log(`[CHECKIN_DRAFT] ✅ ${step3.damageReports.length} dégât(s) chargé(s)`);
}
```

**Priorité/fallback** :
- ✅ **Source principale** : `checkin.data.step3.damageReports`
- ❌ **Pas de fallback** sur `checkin.degats` (colonne SQL chargée mais ignorée)
- ❌ **Pas de fallback** sur `snapshot_legal.exterior.damages` (utilisé uniquement pour PDF/récap)

**Valeur par défaut** : `[]` (ligne 531)

---

## 2) HYDRATATION RHF (PATHS + SHAPE)

### Path RHF exact

**Path** : `damageReports` (racine du form)

**Appel `setValue`** (`EtatDesLieuxDepartForm.tsx:936`) :
```typescript
methods.setValue("damageReports", step3.damageReports);
```

**Pas de `reset()`** : L'hydratation utilise uniquement `setValue()` pour chaque champ individuellement.

### Shape exacte de `damageReports[]`

**Schéma Zod** (`EtatDesLieuxDepartForm.tsx:198-213`) :
```typescript
damageReports: z.array(z.object({
  side: z.enum([
    "avant", 
    "droit", 
    "arriere",  // ✅ SANS accent
    "gauche", 
    "coffre",
    "janteAvDroit",
    "janteArDroit", 
    "janteAvGauche",
    "janteArGauche"
  ]).optional(),
  typeDegats: z.array(z.string()).optional(),
  commentaire: z.string().optional(),
  photos: z.array(z.any()).optional(),
})).optional(),
```

**Type TypeScript** (`src/types/step3.ts:47-52`) :
```typescript
export interface ExteriorDamage {
  side: "avant" | "droit" | "arriere" | "gauche" | "coffre";
  typeDegats: string[];     // ["Rayure", "Bosse", ...]
  commentaire: string;
  photos: ExteriorPhoto[];  // Photos du dégât (avec URLs)
}
```

**Champs réels utilisés** :
- ✅ `side` : string (zone du dégât)
- ✅ `typeDegats` : string[] (types de dégâts sélectionnés)
- ✅ `commentaire` : string (description textuelle)
- ✅ `photos` : ExteriorPhoto[] (array d'objets avec `publicUrl`, `storagePath`, `uploadedAt`)
- ❌ **Aucun champ** : `id`, `createdAt`, `isExisting`, `isPreexisting`, `already`, etc.

**Note** : `indexGlobal` est ajouté dynamiquement lors du rendu (`ExteriorInspectionAccordionSimple.tsx:884`), **pas stocké** dans RHF.

---

## 3) UI : RENDU + DISTINCTION "DÉJÀ PRÉSENT"

### Lecture dans UI

**Fichier** : `src/components/ExteriorInspectionAccordionSimple.tsx`

**Lecture** (ligne 209) :
```typescript
const damageReports = watch("damageReports") || []
```

**Filtrage par zone** (lignes 883-885) :
```typescript
const damagesForThisSide = damageReports
  .map((d: any, globalIndex: number) => ({ ...d, indexGlobal: globalIndex }))
  .filter((d: any) => d.side === sideValue)
```

### Affichage des dégâts

**Rendu** (lignes 1244-1460) :
```typescript
{damagesForThisSide.map((damage: any) => {
  return (
    <div key={damage.indexGlobal} className="bg-red-50 border border-red-300 rounded-md p-3 text-sm text-red-900 space-y-3">
      <div className="flex items-start justify-between">
        <div className="font-semibold text-red-900">
          Dégât #{damage.indexGlobal + 1}  // ⭐ Numérotation simple
        </div>
        <button onClick={() => removeDamage(damage.indexGlobal)}>
          Supprimer
        </button>
      </div>
      {/* Type, commentaire, photos */}
    </div>
  )
})}
```

### ❌ AUCUNE DISTINCTION "DÉJÀ PRÉSENT"

**Preuve** :
- ❌ **Aucun badge** : Pas de `<Badge>`, pas de texte "déjà présent", "ancien", "pré-existant"
- ❌ **Aucun flag** : Pas de champ `isExisting`, `isPreexisting`, `already`, `ancien` dans la structure
- ❌ **Aucune couleur différente** : Tous les dégâts ont le même style (`bg-red-50 border-red-300`)
- ❌ **Aucune section séparée** : Pas de bloc "Dégâts existants" vs "Nouveaux dégâts"
- ❌ **Aucun rendu conditionnel** : Pas de `if (damage.isExisting)` ou équivalent

**Seule logique trouvée** (ligne 1217) :
```typescript
const alreadyHas = damageReports.some((d: any) => d.side === sideValue)
if (!alreadyHas) {
  addDamage(sideValue)  // ⭐ Empêche doublon par zone, pas distinction visuelle
}
```

**Conclusion** : Les dégâts chargés depuis le draft sont **indistinguables** des nouveaux dégâts créés dans la même session. Aucune logique de distinction "déjà présent" n'existe.

### Récapitulatif (Section8Validation)

**Fichier** : `src/modules/etatDesLieuxDepart/sections/Section8Validation.tsx`

**Groupement par zone** (lignes 358-380) :
```typescript
const groupedDamages: Record<ExteriorZoneKey, DamageReport[]> = {
  avant: [],
  droit: [],
  arriere: [],
  coffre: [],
  gauche: [],
  janteAvDroit: [],
  janteArDroit: [],
  janteAvGauche: [],
  janteArGauche: [],
};

damageReports.forEach((d: any) => {
  if (!isDamageValid(d)) return;  // ⭐ Filtre dégâts vides
  if (d.side && groupedDamages[d.side as ExteriorZoneKey]) {
    groupedDamages[d.side as ExteriorZoneKey].push(d);
  }
});
```

**Affichage** (lignes 660-673) :
```typescript
{EXTERIOR_ZONES.map((zone) => {
  const damages = groupedDamages[zone.key] || [];
  return (
    <ExteriorZoneRecapCard
      zoneKey={zone.key}
      zoneLabel={zone.label}
      mainPhoto={mainPhoto}
      damages={damages}  // ⭐ Array de dégâts pour cette zone
    />
  );
})}
```

**Pas de distinction** : `ExteriorZoneRecapCard` affiche tous les dégâts de la même manière, sans distinction "ancien" vs "nouveau".

---

## 4) LISTE DES FONCTIONS CLÉS

| Fonction | Fichier | Lignes | Rôle |
|----------|---------|--------|------|
| `loadExistingCheckinDraft()` | `EtatDesLieuxDepartForm.tsx` | 1062-1124 | Charge draft depuis DB (`.select("*")`) |
| `hydrateFormFromCheckin()` | `EtatDesLieuxDepartForm.tsx` | 822-1054 | Hydrate RHF depuis `checkin.data.step3.damageReports` |
| `handleContinueDraft()` | `EtatDesLieuxDepartForm.tsx` | 1388-1434 | Appelle `hydrateFormFromCheckin()` après choix utilisateur |
| `watch("damageReports")` | `ExteriorInspectionAccordionSimple.tsx` | 209 | Lit `damageReports` depuis RHF |
| `addDamage()` | `ExteriorInspectionAccordionSimple.tsx` | 271-279 | Ajoute un dégât au tableau |
| `updateDamage()` | `ExteriorInspectionAccordionSimple.tsx` | 281-285 | Met à jour un champ d'un dégât |
| `removeDamage()` | `ExteriorInspectionAccordionSimple.tsx` | 287-290 | Supprime un dégât du tableau |
| `getCheckinById()` | `supabaseCheckinService.ts` | 335-353 | Service : lit checkin par ID (`.select("*")`) |
| `getCheckinByBookingId()` | `supabaseCheckinService.ts` | 358-376 | Service : lit checkin par booking_id |
| `saveStep3ZoneDraft()` | `checkinDepartService.ts` | 350-459 | Merge `existingDamageReports` avec nouveaux dégâts |
| `groupedDamages` | `Section8Validation.tsx` | 358-380 | Regroupe dégâts par zone pour récap |

---

## RÉSUMÉ EXÉCUTIF

| Aspect | Réponse |
|--------|---------|
| **Source de vérité** | `checkin_depart.data.step3.damageReports` (JSONB) uniquement |
| **Colonne SQL `degats`** | Chargée mais **jamais utilisée** pour hydratation |
| **`snapshot_legal.exterior.damages`** | Utilisé uniquement pour PDF/récap, **pas pour pré-remplir** |
| **Path RHF** | `damageReports` (racine) |
| **Shape** | `{ side, typeDegats[], commentaire, photos[] }` — **pas de flag "déjà présent"** |
| **Distinction visuelle** | ❌ **Aucune** — tous les dégâts ont le même style (rouge) |
| **Badge/texte "déjà présent"** | ❌ **Aucun** |
| **Section séparée** | ❌ **Aucune** |

**Conclusion** : Les "dégâts déjà présents" sont simplement les dégâts chargés depuis `data.step3.damageReports` du draft. Ils sont **indistinguables** des nouveaux dégâts créés dans la même session. Aucune logique de distinction n'existe actuellement.

---

**FIN RAPPORT COMPLET**

