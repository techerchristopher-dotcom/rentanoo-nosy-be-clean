# DIAGNOSTIC "Dégâts déjà présents" (VOITURE) — PARTIE 1/2

## 📋 SCAN + MAP "où ça vit"

---

## 1. LISTE DES OCCURRENCES (mots-clés)

### `damageReports` / `degats`

| Fichier | Lignes | Extrait |
|---------|--------|---------|
| `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx` | 198, 531, 935-937 | ```typescript<br>damageReports: z.array(z.object({<br>  side: z.enum(["avant", "droit", "arriere", "gauche", "coffre", ...]),<br>  typeDegats: z.array(z.string()).optional(),<br>  commentaire: z.string().optional(),<br>  photos: z.array(z.any()).optional(),<br>})).optional()``` |
| `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx` | 935-937 | ```typescript<br>if (step3.damageReports && Array.isArray(step3.damageReports)) {<br>  methods.setValue("damageReports", step3.damageReports);<br>  console.log(`[CHECKIN_DRAFT] ✅ ${step3.damageReports.length} dégât(s) chargé(s)`);``` |
| `src/components/ExteriorInspectionAccordionSimple.tsx` | 209, 278, 282, 288 | ```typescript<br>const damageReports = watch("damageReports") || []<br>const addDamage = (side) => {<br>  const newDamage = { side, typeDegats: [], commentaire: "", photos: [] }<br>  setValue("damageReports", [...damageReports, newDamage])<br>}``` |
| `src/services/checkinDepartService.ts` | 387, 403-410 | ```typescript<br>const existingDamageReports = existingStep3.damageReports || [];<br>let mergedDamageReports = existingDamageReports;<br>if (Array.isArray(zoneDamageReports)) {<br>  mergedDamageReports = [<br>    ...existingDamageReports.filter((d) => !sidesToReplace.includes(d?.side)),<br>    ...zoneDamageReports,<br>  ];<br>}``` |
| `src/services/supabaseCheckinService.ts` | 164, 267, 551 | ```typescript<br>const degats = step3?.damageReports || [];<br>// Extraction vers colonne SQL<br>degats: degats,``` |

### `existing` / `loadExistingCheckinDraft`

| Fichier | Lignes | Extrait |
|---------|--------|---------|
| `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx` | 1062-1123 | ```typescript<br>async function loadExistingCheckinDraft() {<br>  const { data: existingCheckin, error } = await supabase<br>    .from("checkin_depart")<br>    .select("*")<br>    .eq("booking_id", bookingId)<br>    .eq("status", "draft")<br>    .maybeSingle();<br>  if (existingCheckin) {<br>    setExistingDraft(existingCheckin);<br>  }<br>}``` |
| `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx` | 822-1054 | ```typescript<br>const hydrateFormFromCheckin = (checkin: any) => {<br>  const step3 = checkin.data?.step3;<br>  if (step3.damageReports && Array.isArray(step3.damageReports)) {<br>    methods.setValue("damageReports", step3.damageReports);<br>  }<br>}``` |

### `snapshot` / `snapshot_legal`

| Fichier | Lignes | Extrait |
|---------|--------|---------|
| `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx` | 1031-1049 | ```typescript<br>if (checkin.snapshot_legal?.booking) {<br>  const bookingSnapshot = checkin.snapshot_legal.booking;<br>  methods.setValue("snapshot_legal", checkin.snapshot_legal);<br>  // Hydratation lieux depuis snapshot<br>}``` |
| `src/services/supabaseCheckinService.ts` | 551, 646-656 | ```typescript<br>const damageReports = step3?.damageReports || [];<br>// Dans createLegalSnapshot:<br>damages: (damageReports || []).map((damage: any) => ({<br>  zone: damage.side || damage.zone || null,<br>  typeDegats: damage.typeDegats || [],<br>  commentaire: damage.commentaire ?? null,<br>  photos: damage.photos || []<br>}))``` |

### `checkin_depart` / `checkin_return`

| Fichier | Lignes | Extrait |
|---------|--------|---------|
| `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx` | 1077-1084 | ```typescript<br>const { data: existingCheckin, error } = await supabase<br>  .from("checkin_depart")<br>  .select("*")<br>  .eq("booking_id", bookingId)<br>  .eq("status", "draft")<br>  .order("created_at", { ascending: false })<br>  .limit(1)<br>  .maybeSingle();``` |
| `src/modules/etatDesLieuxRetour/steps/Step1DepartRecap.tsx` | 90, 400-460 | ```typescript<br>const damageReports = departData?.step3?.damageReports || [];<br>// Affichage "Dégâts présents au départ"<br>{damageReports.length > 0 && (<br>  <Card><br>    <CardTitle>Dégâts présents au départ</CardTitle><br>    {damageReports.map((d, idx) => (...))}<br>  </Card><br>)}``` |

---

## 2. POINTS D'ENTRÉE VOITURE

### UI — Fichiers réellement utilisés

| Fichier | Fonction principale | Ce qu'elle lit/écrit |
|---------|-------------------|---------------------|
| `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx` | `loadExistingCheckinDraft()` (ligne 1062) | **Lit** : `checkin_depart` par `booking_id` + `status='draft'`<br>**Stocke** : `existingDraft` (state) |
| `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx` | `hydrateFormFromCheckin()` (ligne 822) | **Lit** : `checkin.data.step3.damageReports`<br>**Écrit** : `methods.setValue("damageReports", step3.damageReports)` (ligne 936) |
| `src/components/ExteriorInspectionAccordionSimple.tsx` | `watch("damageReports")` (ligne 209) | **Lit** : `damageReports` depuis RHF<br>**Affiche** : Liste des dégâts par zone |
| `src/modules/etatDesLieuxDepart/sections/Section8Validation.tsx` | `watch("damageReports")` (ligne 169) | **Lit** : `damageReports` pour récapitulatif final<br>**Groupe** : Par zone pour affichage PDF |

### Services

| Fichier | Fonction principale | Ce qu'elle lit/écrit |
|---------|-------------------|---------------------|
| `src/services/checkinDepartService.ts` | `saveStep3ZoneDraft()` (ligne 350) | **Lit** : `existingStep3.damageReports` (ligne 387)<br>**Merge** : `mergedDamageReports` (ligne 403-410)<br>**Écrit** : `step3.damageReports` dans `checkin_depart.data` |
| `src/services/supabaseCheckinService.ts` | `saveCheckinDraft()` (ligne 79) | **Lit** : `step3?.damageReports` (lignes 164, 267)<br>**Écrit** : Colonne SQL `degats` (JSONB array) |
| `src/services/supabaseCheckinService.ts` | `createLegalSnapshot()` (ligne 395) | **Lit** : `step3.damageReports` (ligne 551)<br>**Écrit** : `snapshot_legal.exterior.damages` (ligne 646-656) |

---

## 3. HYPOTHÈSES CANDIDATES (source de vérité)

### Hypothèse 1 : Dégâts depuis `checkin_depart.data.step3.damageReports` (draft actuel)

**Indices** :
- `EtatDesLieuxDepartForm.tsx:935-937` : Hydratation directe depuis `step3.damageReports`
- `ExteriorInspectionAccordionSimple.tsx:209` : Lecture via `watch("damageReports")`

**Probabilité** : ⭐⭐⭐⭐⭐ (très probable — c'est le draft en cours)

---

### Hypothèse 2 : Dégâts depuis `checkin_depart.snapshot_legal.exterior.damages` (si completed)

**Indices** :
- `EtatDesLieuxDepartForm.tsx:1031-1049` : Hydratation depuis `snapshot_legal` (mais seulement pour `booking`)
- `supabaseCheckinService.ts:646-656` : Snapshot contient `exterior.damages` avec mapping `side → zone`

**Probabilité** : ⭐⭐ (peu probable — snapshot utilisé pour PDF, pas pour hydratation form)

---

### Hypothèse 3 : Dégâts depuis `checkin_return` (retour précédent) → départ suivant

**Indices** :
- `Step1DepartRecap.tsx:90` : Affiche `departData?.step3?.damageReports` dans le retour
- **Aucune occurrence** de lecture `checkin_return` dans les fichiers départ

**Probabilité** : ⭐ (très peu probable — pas de logique trouvée)

---

### Hypothèse 4 : Dégâts depuis colonne SQL `checkin_depart.degats` (JSONB)

**Indices** :
- `supabaseCheckinService.ts:164, 267` : Extraction `degats = step3?.damageReports || []`
- `supabaseCheckinService.ts:202` : Écriture `degats: degats` (colonne SQL)

**Probabilité** : ⭐⭐⭐ (possible — colonne existe mais pas de lecture directe trouvée)

---

## 4. À INVESTIGUER EN PARTIE 2

### Checklist des fichiers/fonctions à creuser

- [ ] **`src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx`**
  - [ ] Ligne 822-1054 : `hydrateFormFromCheckin()` — **Vérifier si snapshot_legal.exterior.damages est lu**
  - [ ] Ligne 1062-1123 : `loadExistingCheckinDraft()` — **Vérifier si colonne `degats` est chargée**

- [ ] **`src/components/ExteriorInspectionAccordionSimple.tsx`**
  - [ ] Ligne 422-444 : `useEffect` validation — **Vérifier si dégâts sont filtrés par "déjà présent"**
  - [ ] Ligne 883-1596 : Rendu des dégâts — **Chercher badges/indicateurs visuels "ancien" vs "nouveau"**

- [ ] **`src/services/supabaseCheckinService.ts`**
  - [ ] Ligne 79-330 : `saveCheckinDraft()` — **Vérifier si colonne `degats` est lue au chargement**
  - [ ] Ligne 335-353 : `getCheckinById()` — **Vérifier si `degats` est retourné**

- [ ] **`src/services/checkinDepartService.ts`**
  - [ ] Ligne 350-459 : `saveStep3ZoneDraft()` — **Vérifier logique de merge des dégâts existants**

- [ ] **`src/types/step3.ts`**
  - [ ] Ligne 47-52 : `ExteriorDamage` — **Vérifier si champ `isExisting` ou `isPreexisting` existe**

- [ ] **`src/types/snapshot-legal.ts`**
  - [ ] Ligne 138-147 : `CheckinLegalSnapshotExterior.damages` — **Vérifier structure complète**

- [ ] **Base de données**
  - [ ] Table `checkin_depart` — **Vérifier colonne `degats` (JSONB) et son contenu réel**
  - [ ] Table `checkin_return` — **Vérifier si lien avec `checkin_depart_id` permet récupération dégâts**

- [ ] **UI — Affichage visuel**
  - [ ] `ExteriorZoneRecapCard.tsx` — **Chercher badges "déjà présent" / "ancien" / "pré-existant"**
  - [ ] `Section8Validation.tsx` — **Vérifier si distinction visuelle nouveaux vs anciens dégâts**

- [ ] **Logique de dédoublonnage**
  - [ ] `ExteriorInspectionAccordionSimple.tsx:1217` — **Vérifier `alreadyHas` — empêche doublons par zone ?**

---

**FIN PARTIE 1**

