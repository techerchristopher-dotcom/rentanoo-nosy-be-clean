# DIAGNOSTIC MOTO — Step 1 (Architecture + Hydratation)

## 📊 Architecture du form moto + Point d'insertion pour `damageReports`

---

## A. FORM STATE (RHF vs state local) + PREUVES

### ✅ RHF utilisé pour sections 1, 2, 6

**Preuve** (`EtatDesLieuxDepartFormMoto.tsx:122-128`) :
```typescript
const methods = useForm<MotoFormData>({
  resolver: zodResolver(MotoFormSchema),
  mode: "onChange",
  defaultValues,
  shouldUnregister: false,
});
```

**FormProvider** (ligne 715) :
```typescript
<FormProvider {...methods}>
  {/* Sections 1, 2, 6 utilisent useFormContext */}
</FormProvider>
```

**Paths RHF utilisés** :
- `methods.setValue("conducteur.nom", ...)` (ligne 147)
- `methods.getValues("conducteur.nom")` (ligne 144)
- `methods.setValue("vehicule.marque", ...)` (ligne 543)
- Sections 1, 2, 6 : `useFormContext()` pour accès RHF

---

### ⚠️ State local pour Step3 et Step5

**Preuve** (`EtatDesLieuxDepartFormMoto.tsx:172-178`) :
```typescript
const [initialStep3Data, setInitialStep3Data] = useState<Step3MotoData | null>(null);
const [initialStep5Data, setInitialStep5Data] = useState<{
  completedAt?: string;
  accessories: Record<string, boolean>;
  photos: Array<{ url: string; storagePath: string }>;
  notes?: string;
} | null>(null);
```

**Passage en props** (ligne 622) :
```typescript
<Section3ExterieurMoto
  initialData={initialStep3Data}  // ⭐ State local, pas RHF
  // ...
/>
```

**Section3ExterieurMoto utilise state local** (ligne 70-72) :
```typescript
const [zonesPhotos, setZonesPhotos] = useState<Step3MotoData["zonesPhotos"]>(
  initialData?.zonesPhotos || {}  // ⭐ Depuis props, pas RHF
);
```

**Conclusion** : Step3 utilise un **state local** (`initialStep3Data`) passé en props, **pas RHF**. Step5 idem.

---

## B. HYDRATATION DRAFT : SOURCE(S) LUES + PREUVES

### Requête Supabase

**Fichier** : `EtatDesLieuxDepartFormMoto.tsx`  
**Fonction** : `loadExistingCheckinDraftMoto()` (ligne 232)

**Requête** (lignes 242-249) :
```typescript
const { data: existingCheckin, error } = await supabase
  .from("checkin_depart" as any)
  .select("*")
  .eq("booking_id", bookingId)
  .in("status", ["draft", "completed"])  // ⭐ Draft ET completed (pour read-only)
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
```

**Choix des statuts** :
- ✅ `"draft"` : Modifiable, hydratation normale
- ✅ `"completed"` : Read-only, hydratation pour affichage

---

### Extraction Step3

**Extraction** (lignes 303-338) :
```typescript
const step3 = checkin.data?.step3;
if (step3 && !cancelled) {
  const zonesPhotos = step3.zonesPhotos || {};
  
  // Mapping inverse : DB → UI moto
  const mappedZonesPhotos: Step3MotoData["zonesPhotos"] = {};
  if (zonesPhotos.avant) mappedZonesPhotos.avant = zonesPhotos.avant;
  if (zonesPhotos.droit) mappedZonesPhotos.cote_droit = zonesPhotos.droit;
  if (zonesPhotos.arriere) mappedZonesPhotos.arriere = zonesPhotos.arriere;
  if (zonesPhotos.gauche) mappedZonesPhotos.cote_gauche = zonesPhotos.gauche;
  
  // Jantes : agrégation
  const jantesPhotos: any[] = [];
  if (zonesPhotos.janteAvDroit) jantesPhotos.push(...zonesPhotos.janteAvDroit);
  if (zonesPhotos.janteArDroit) jantesPhotos.push(...zonesPhotos.janteArDroit);
  if (zonesPhotos.janteAvGauche) jantesPhotos.push(...zonesPhotos.janteAvGauche);
  if (zonesPhotos.janteArGauche) jantesPhotos.push(...zonesPhotos.janteArGauche);
  if (zonesPhotos.jantes) jantesPhotos.push(...zonesPhotos.jantes);
  if (jantesPhotos.length > 0) {
    mappedZonesPhotos.jantes = jantesPhotos;
  }

  setInitialStep3Data({
    zonesPhotos: mappedZonesPhotos,
    completedAt: step3.completedAt,
    degats: step3.degats,  // ⭐ Lecture actuelle : step3.degats
  });
}
```

---

### ❌ Pas de lecture `damageReports`

**Preuve** : Aucune occurrence de `damageReports` dans `loadExistingCheckinDraftMoto()` (grep ligne 331 uniquement : `degats: step3.degats`)

**Lecture actuelle** :
- ✅ `checkin.data.step3.degats` (ligne 331)
- ❌ `checkin.data.step3.damageReports` → **N'existe pas**
- ❌ `checkin.degats` (colonne SQL) → **N'est pas lu**

---

## C. MAPPING ZONES : RÈGLES EXISTANTES + PREUVES

### Enum zones moto

**Fichier** : `src/modules/etatDesLieuxDepartMoto/types/step3Moto.ts`

**Type** (lignes 4-9) :
```typescript
export type MotoExteriorZone =
  | "avant"
  | "cote_droit"
  | "arriere"
  | "cote_gauche"
  | "jantes";
```

**Liste exacte** : `["avant", "cote_droit", "arriere", "cote_gauche", "jantes"]`

---

### Mapping moto → voiture (DB)

**Fichier** : `src/services/checkinDepartService.ts`  
**Fonction** : `saveStep3DraftMoto()` (lignes 1254-1265)

**Règles** :
```typescript
// Mapper les zones moto vers le format attendu par le service
if (step3.zonesPhotos.avant) adaptedZonesPhotos.avant = step3.zonesPhotos.avant;
if (step3.zonesPhotos.cote_droit) adaptedZonesPhotos.droit = step3.zonesPhotos.cote_droit;  // ⭐ cote_droit → droit
if (step3.zonesPhotos.arriere) adaptedZonesPhotos.arriere = step3.zonesPhotos.arriere;
if (step3.zonesPhotos.cote_gauche) adaptedZonesPhotos.gauche = step3.zonesPhotos.cote_gauche;  // ⭐ cote_gauche → gauche

// Jantes : le service attend janteAvDroit, janteArDroit, janteAvGauche, janteArGauche
// Pour moto, on a juste "jantes" - on peut les répartir ou les mettre dans une seule clé
// Pour l'instant, on les met dans janteAvDroit (le service les agrègera dans photos_jantes)
if (step3.zonesPhotos.jantes) {
  adaptedZonesPhotos.janteAvDroit = step3.zonesPhotos.jantes;  // ⭐ jantes → janteAvDroit
}
```

**Résumé** :
- `avant` → `avant` (inchangé)
- `cote_droit` → `droit` (DB)
- `arriere` → `arriere` (inchangé)
- `cote_gauche` → `gauche` (DB)
- `jantes` → `janteAvDroit` (agrégation, DB)

---

### Mapping inverse DB → moto (hydratation)

**Fichier** : `EtatDesLieuxDepartFormMoto.tsx`  
**Lignes** : 307-326

**Règles** :
```typescript
// Mapping inverse : DB stocke (droit/gauche) → UI moto veut (cote_droit/cote_gauche)
if (zonesPhotos.avant) mappedZonesPhotos.avant = zonesPhotos.avant;
if (zonesPhotos.droit) mappedZonesPhotos.cote_droit = zonesPhotos.droit;  // ⭐ droit → cote_droit
if (zonesPhotos.arriere) mappedZonesPhotos.arriere = zonesPhotos.arriere;
if (zonesPhotos.gauche) mappedZonesPhotos.cote_gauche = zonesPhotos.gauche;  // ⭐ gauche → cote_gauche

// Jantes : DB peut avoir janteAvDroit, janteArDroit, etc. → on agrège en "jantes"
const jantesPhotos: any[] = [];
if (zonesPhotos.janteAvDroit) jantesPhotos.push(...zonesPhotos.janteAvDroit);
if (zonesPhotos.janteArDroit) jantesPhotos.push(...zonesPhotos.janteArDroit);
if (zonesPhotos.janteAvGauche) jantesPhotos.push(...zonesPhotos.janteAvGauche);
if (zonesPhotos.janteArGauche) jantesPhotos.push(...zonesPhotos.janteArGauche);
if (zonesPhotos.jantes) jantesPhotos.push(...zonesPhotos.jantes);
if (jantesPhotos.length > 0) {
  mappedZonesPhotos.jantes = jantesPhotos;  // ⭐ Agrégation → jantes
}
```

---

## D. POINT D'INSERTION MINIMAL RECOMMANDÉ + JUSTIFICATION

### ✅ Option A : Dans `EtatDesLieuxDepartFormMoto.tsx` après hydratation Step3

**Point exact** : Ligne 332, juste après `setInitialStep3Data({ ..., degats: step3.degats })`

**Justification** :
1. ✅ **Cohérence** : Hydratation Step3 déjà présente à cet endroit
2. ✅ **Source de vérité** : `step3` est déjà extrait (ligne 303)
3. ✅ **Mapping zones** : Logique de mapping DB → moto déjà présente (lignes 307-326)
4. ✅ **Conversion** : On peut convertir `step3.degats` → `damageReports` au même endroit
5. ✅ **State RHF** : On peut utiliser `methods.setValue("damageReports", ...)` pour hydrater RHF

**Extrait proposé (conceptuel, pas implémentation)** :
```typescript
// Après setInitialStep3Data (ligne 332)
// Convertir step3.degats → damageReports (si existe)
// Mapper zones moto → zones voiture pour damageReports
// methods.setValue("damageReports", convertedDamageReports);
```

**Pourquoi pas Option B** : Pas de fonction `hydrate...` dédiée, hydratation inline dans `loadExistingCheckinDraftMoto()`.

**Pourquoi pas Option C** : `Section3ExterieurMoto` reçoit `initialData` en props mais ne gère pas `damageReports` actuellement. L'hydratation doit être dans le form parent pour alimenter RHF.

---

## E. LISTE DES QUESTIONS RESTANTES

### Questions pour implémenter Step 1 sans ambiguïté

1. **Conversion `degats` → `damageReports`** :
   - Structure actuelle : `{ zone: MotoExteriorZone, description: string, photos: MotoPhoto[] }`
   - Structure cible : `{ side: string, typeDegats: string[], commentaire: string, photos: ExteriorPhoto[] }`
   - **Question** : Comment mapper `zone` → `side` ? (mapping inverse : `cote_droit` → `droit`, etc.)
   - **Question** : Comment convertir `description` → `typeDegats[]` + `commentaire` ? (split ? ou tout dans `commentaire` ?)

2. **Mapping zones pour `damageReports`** :
   - Zones moto : `["avant", "cote_droit", "arriere", "cote_gauche", "jantes"]`
   - Zones voiture : `["avant", "droit", "arriere", "gauche", "coffre", "janteAvDroit", ...]`
   - **Question** : `jantes` moto → quel `side` voiture ? (`"janteAvDroit"` ? ou créer un mapping spécial ?)

3. **State RHF vs state local** :
   - Step3 utilise state local (`initialStep3Data`)
   - `damageReports` doit être dans RHF (comme voiture)
   - **Question** : Faut-il migrer Step3 vers RHF ? Ou garder hybride (Step3 state local, `damageReports` RHF) ?

4. **Migration données existantes** :
   - Drafts existants ont `step3.degats` (ancien format)
   - Nouveaux drafts auront `step3.damageReports` (nouveau format)
   - **Question** : Faut-il migrer les anciens `degats` → `damageReports` au chargement ? Ou garder compatibilité bidirectionnelle ?

5. **Colonne SQL `degats`** :
   - Voiture : `degats` extrait depuis `step3.damageReports` (ligne 164, 267)
   - Moto : `degats` existe-t-il déjà dans la colonne SQL ? Ou faut-il l'extraire aussi ?

6. **Composant UI dégâts** :
   - Voiture : `ExteriorInspectionAccordionSimple.tsx` utilise `watch("damageReports")`
   - Moto : Pas de composant équivalent
   - **Question** : Créer un composant moto ? Ou réutiliser `ExteriorInspectionAccordionSimple.tsx` avec adaptation zones ?

---

## RÉSUMÉ EXÉCUTIF

| Aspect | Réponse |
|--------|---------|
| **RHF utilisé** | ✅ Oui (sections 1, 2, 6) |
| **Step3 state** | ⚠️ State local (`initialStep3Data`), pas RHF |
| **Source de vérité** | `checkin.data.step3.degats` (actuel) |
| **`damageReports` lu ?** | ❌ Non (à ajouter) |
| **Point d'insertion** | ✅ Ligne 332, après `setInitialStep3Data` |
| **Mapping zones** | ✅ Existe (moto ↔ voiture) |
| **Questions restantes** | 6 questions (conversion, mapping, state, migration, colonne SQL, composant UI) |

**Conclusion** : Le point d'insertion le plus sûr est **Option A** (ligne 332, après hydratation Step3), car :
- Cohérence avec l'existant
- Accès direct à `step3` et mapping zones
- Possibilité d'hydrater RHF via `methods.setValue("damageReports", ...)`

---

**FIN DIAGNOSTIC STEP 1**

