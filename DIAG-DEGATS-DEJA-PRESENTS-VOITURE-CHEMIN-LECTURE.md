# DIAGNOSTIC "Dégâts déjà présents" (VOITURE) — CHEMIN DE LECTURE

## 📊 DB/snapshot → service → hydratation RHF → UI

---

## A) SOURCE(S) DE DONNÉES LUES AU CHARGEMENT

### 1. `loadExistingCheckinDraft()` — Point d'entrée principal

**Fichier** : `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx`  
**Lignes** : 1061-1124

**Où c'est appelé** :
```typescript
useEffect(() => {
  async function loadExistingCheckinDraft() {
    // ...
  }
  loadExistingCheckinDraft();
}, [bookingId, loadingProfile]);  // ⭐ Se déclenche après le chargement des profils
```

**Requête Supabase exacte** :
```typescript
const { data: existingCheckin, error } = await supabase
  .from("checkin_depart")
  .select("*")  // ⭐ Charger TOUTES les colonnes
  .eq("booking_id", bookingId)
  .eq("status", "draft")  // ⭐ Uniquement les drafts
  .order("created_at", { ascending: false })  // Plus récent en premier
  .limit(1)
  .maybeSingle();
```

**Ce qui est chargé** :
- ✅ **Toutes les colonnes** incluant :
  - `data` (JSONB) → contient `data.step3.damageReports`
  - `degats` (JSONB array) → colonne SQL dédiée
  - `snapshot_legal` (JSONB) → snapshot complet si `status='completed'`
  - Toutes les autres colonnes SQL

**Stockage** :
```typescript
setExistingDraft(existingCheckin as CheckinDepartDraft);
```

**Type `CheckinDepartDraft`** (lignes 313-329) :
```typescript
type CheckinDepartDraft = {
  id: string;
  booking_id: string;
  status: string;
  data: any;  // ⭐ Contient step3.damageReports
  degats: any[] | null;  // ⭐ Colonne SQL (chargée mais non utilisée)
  // ... autres colonnes
};
```

**⚠️ IMPORTANT** : Cette fonction **ne hydrate PAS** automatiquement. Elle ouvre une modal de choix ("Poursuivre" / "Redémarrer").

---

### 2. `hydrateFormFromCheckin()` — Hydratation effective

**Fichier** : `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx`  
**Lignes** : 822-1054

**Où c'est appelé** :
```typescript
// Dans handleContinueDraft() (ligne 1388-1434)
const handleContinueDraft = () => {
  // ...
  // 3️⃣ Hydrater le formulaire (réutiliser la fonction existante)
  hydrateFormFromCheckin(existingDraft);  // ⭐ Ligne 1415
  // ...
};
```

**Lecture des dégâts** (lignes 924-938) :
```typescript
// ============================================================================
// STEP 3 : Extérieur & Coffre (préparation)
// ============================================================================
if (step3) {
  console.log("[CHECKIN_DRAFT] 📋 Hydratation Step3...");
  
  // Photos par zone
  if (step3.zonesPhotos) {
    methods.setValue("exteriorInspection.zonesPhotos", step3.zonesPhotos);
  }
  
  // ⭐ DÉGÂTS : Lecture depuis data.step3.damageReports
  if (step3.damageReports && Array.isArray(step3.damageReports)) {
    methods.setValue("damageReports", step3.damageReports);
    console.log(`[CHECKIN_DRAFT] ✅ ${step3.damageReports.length} dégât(s) chargé(s)`);
  }
  
  // Switches zonesHasDamage
  if (step3.zonesHasDamage) {
    methods.setValue("exteriorInspection.zonesHasDamage", step3.zonesHasDamage);
  }
  
  // ...
}
```

**Extraction de `step3`** (ligne 829) :
```typescript
const step3 = checkin.data?.step3;  // ⭐ Depuis JSONB data
```

**❌ CE QUI N'EST PAS LU** :

1. **Colonne SQL `checkin.degats`** :
   - ✅ Chargée via `.select("*")` dans `loadExistingCheckinDraft()`
   - ✅ Disponible dans `existingDraft.degats`
   - ❌ **Jamais utilisée** dans `hydrateFormFromCheckin()`
   - ❌ Aucune ligne de code ne lit `checkin.degats`

2. **`snapshot_legal.exterior.damages`** :
   - ✅ Chargé via `.select("*")` (si `status='completed'`)
   - ✅ Disponible dans `existingDraft.snapshot_legal`
   - ❌ **Jamais utilisé** pour hydrater les dégâts
   - ✅ Utilisé uniquement pour `snapshot_legal.booking` (lieux départ/retour, lignes 1033-1049)

---

### 3. `getCheckinById()` — Service Supabase

**Fichier** : `src/services/supabaseCheckinService.ts`  
**Lignes** : 335-353

**Requête** :
```typescript
async getCheckinById(checkinId: string): Promise<{ data: CheckinDepart | null; error: string | null }> {
  const { data, error } = await supabase
    .from("checkin_depart" as any)
    .select("*")  // ⭐ Toutes les colonnes
    .eq("id", checkinId)
    .single();
  
  return { data: data as unknown as CheckinDepart, error: null };
}
```

**Type retourné `CheckinDepart`** (lignes 26-67) :
```typescript
export interface CheckinDepart {
  id: string;
  booking_id: string;
  // ...
  data: any;  // JSONB column
  degats: any[] | null;  // ⭐ Colonne SQL (ligne 40)
  // ...
  snapshot_legal?: CheckinLegalSnapshot | null;  // ⭐ Snapshot complet (ligne 64)
}
```

**⚠️ UTILISATION** :
- Cette fonction est appelée dans `EtatDesLieuxDepartForm.tsx:1807` mais **uniquement pour vérifier le status** après un changement de `checkinId`
- **N'est PAS utilisée** pour charger le draft initial

---

## B) SOURCE DE VÉRITÉ AU CHARGEMENT

### ✅ Réponse directe

**Source unique** : `checkin_depart.data.step3.damageReports` (JSONB)

**Priorité/fallback** :
1. **Source principale** : `checkin.data.step3.damageReports` (ligne 935-937)
   - Extrait depuis : `const step3 = checkin.data?.step3;` (ligne 829)
   - Condition : `if (step3.damageReports && Array.isArray(step3.damageReports))`
   - Écriture RHF : `methods.setValue("damageReports", step3.damageReports)`

2. **Fallback** : Aucun
   - ❌ Pas de fallback sur `checkin.degats` (colonne SQL)
   - ❌ Pas de fallback sur `snapshot_legal.exterior.damages`
   - ❌ Si `step3.damageReports` est absent/vide → `damageReports` reste `[]` (valeur par défaut, ligne 531)

### 📋 Preuve par code

**Extrait exact** (`EtatDesLieuxDepartForm.tsx:935-937`) :
```typescript
// Dégâts
if (step3.damageReports && Array.isArray(step3.damageReports)) {
  methods.setValue("damageReports", step3.damageReports);
  console.log(`[CHECKIN_DRAFT] ✅ ${step3.damageReports.length} dégât(s) chargé(s)`);
}
```

**Valeur par défaut** (`EtatDesLieuxDepartForm.tsx:531`) :
```typescript
defaultValues: {
  // ...
  damageReports: [],  // ⭐ Vide par défaut
}
```

### 🔍 Colonne SQL `degats` — Statut

**Écriture** : ✅ Oui
- `supabaseCheckinService.ts:164, 267` : `const degats = step3?.damageReports || [];`
- `supabaseCheckinService.ts:202, 301` : `degats: degats,` (écriture colonne SQL)

**Lecture pour hydratation** : ❌ Non
- Aucune ligne de code ne lit `checkin.degats` pour hydrater le formulaire
- La colonne est chargée (via `.select("*")`) mais **ignorée** dans `hydrateFormFromCheckin()`

**Conclusion** : La colonne SQL `degats` est un **dédupliqué** de `data.step3.damageReports`, utilisé uniquement pour :
- Performance (requêtes SQL directes)
- Snapshot légal (extraction automatique)
- **PAS pour hydratation du formulaire**

### 🔍 `snapshot_legal.exterior.damages` — Statut

**Écriture** : ✅ Oui
- `supabaseCheckinService.ts:646-656` : Mapping `damageReports` → `snapshot_legal.exterior.damages`

**Lecture pour hydratation** : ❌ Non
- `hydrateFormFromCheckin()` lit uniquement `snapshot_legal.booking` (lignes 1033-1049)
- **Aucune lecture** de `snapshot_legal.exterior.damages`

**Conclusion** : Le snapshot est utilisé uniquement pour :
- PDF génération (lecture depuis `snapshot_legal` uniquement)
- Affichage récapitulatif (Step 8 Validation)
- **PAS pour pré-remplir les dégâts au chargement**

---

## C) CHEMIN COMPLET (DB → UI)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. DB : checkin_depart                                      │
│    ├─ data (JSONB)                                          │
│    │  └─ step3.damageReports[]  ⭐ SOURCE DE VÉRITÉ         │
│    ├─ degats (JSONB array)     ❌ Chargé mais ignoré        │
│    └─ snapshot_legal (JSONB)   ❌ Utilisé pour PDF uniquement│
└─────────────────────────────────────────────────────────────┘
                          │
                          │ .select("*")
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. loadExistingCheckinDraft() (ligne 1062)                 │
│    └─ existingCheckin = { data, degats, snapshot_legal }   │
│    └─ setExistingDraft(existingCheckin)                     │
│    └─ Modal ouverte (pas d'hydratation auto)                │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Utilisateur clique "Poursuivre"
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. handleContinueDraft() (ligne 1388)                       │
│    └─ hydrateFormFromCheckin(existingDraft)                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Extraction step3
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. hydrateFormFromCheckin() (ligne 822)                     │
│    └─ const step3 = checkin.data?.step3;                    │
│    └─ if (step3.damageReports) {                            │
│         methods.setValue("damageReports", step3.damageReports)│
│       }                                                      │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ RHF state
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. RHF State : damageReports[]                              │
│    └─ watch("damageReports")                                │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ watch() / getValues()
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. UI : ExteriorInspectionAccordionSimple.tsx                │
│    └─ const damageReports = watch("damageReports") || []    │
│    └─ Affichage des dégâts par zone                         │
└─────────────────────────────────────────────────────────────┘
```

---

## D) RÉSUMÉ EXÉCUTIF

| Question | Réponse |
|---------|---------|
| **Source de vérité** | `checkin_depart.data.step3.damageReports` (JSONB) |
| **Colonne SQL `degats` lue ?** | ❌ Non — chargée mais jamais utilisée pour hydratation |
| **`snapshot_legal.exterior.damages` lu ?** | ❌ Non — utilisé uniquement pour PDF/récap, pas pour pré-remplir |
| **Fallback si `damageReports` absent ?** | ❌ Aucun — reste `[]` (valeur par défaut) |
| **Moment de chargement** | Au clic "Poursuivre" dans la modal (pas automatique) |
| **Fonction d'hydratation** | `hydrateFormFromCheckin()` (ligne 822) |
| **Écriture RHF** | `methods.setValue("damageReports", step3.damageReports)` (ligne 936) |

---

**FIN DIAGNOSTIC CHEMIN DE LECTURE**

