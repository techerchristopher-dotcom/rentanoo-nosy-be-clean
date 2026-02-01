# DIAGNOSTIC MOTO — Step 1 "Verrouillage mapping + schema"

## 📊 Réponses définitives pour implémenter Step 1 (hydratation damageReports moto)

---

## A. SCHEMA + DEFAULTVALUES (PREUVES)

### Schema Zod — `damageReports` à la racine

**Fichier** : `src/modules/etatDesLieuxDepartMoto/schemas/formSchemaMoto.ts`

**Preuve** (lignes 135-153) :
```typescript
// Damage reports (optionnel, pour compatibilité)
damageReports: z.array(
  z.object({
    side: z.enum([
      "avant",
      "droit",
      "arriere",
      "gauche",
      "coffre",
      "janteAvDroit",
      "janteArDroit",
      "janteAvGauche",
      "janteArGauche",
    ]).optional(),
    typeDegats: z.array(z.string()).optional(),
    commentaire: z.string().optional(),
    photos: z.array(z.any()).optional(),
  })
).optional(),
```

**Réponse** :
- ✅ **`damageReports` autorisé à la racine** du schema (ligne 136)
- ❌ **Pas dans `step3`** : `step3MotoSchema` contient uniquement `degats` (ligne 19-25), pas `damageReports`

---

### Schema `step3` — uniquement `degats`

**Preuve** (lignes 9-26) :
```typescript
const step3MotoSchema = z.object({
  completedAt: z.string().optional(),
  zonesPhotos: z.object({...}).optional(),
  degats: z.array(  // ⭐ Ancien format
    z.object({
      zone: z.enum(["avant", "cote_droit", "arriere", "cote_gauche", "jantes"]).optional(),
      description: z.string().optional(),
      photos: z.array(motoPhotoSchema).optional(),
    })
  ).optional(),
});
```

**Réponse** : `step3` contient uniquement `degats` (ancien format), **pas `damageReports`**.

---

### DefaultValues — `damageReports` absent

**Fichier** : `src/modules/etatDesLieuxDepartMoto/EtatDesLieuxDepartFormMoto.tsx`

**Preuve** (lignes 81-114) :
```typescript
const defaultValues = useMemo<MotoFormData>(
  () => ({
    bookingId: "",
    conducteur: {...},
    vehicule: {...},
    releves: {...},
    remarques: {...},
    ownerSignature: "",
    driverSignature: "",
    // ⚠️ damageReports absent
  }),
  []
);
```

**Réponse** :
- ❌ **`damageReports` n'existe pas** dans `defaultValues`
- ⚠️ **Valeur par défaut implicite** : `undefined` (car `.optional()` dans schema)

---

### `setValue("damageReports", ...)` — absent

**Preuve** : Grep sur `setValue.*damageReports` → **0 résultat**

**Réponse** : ❌ **Aucun `setValue("damageReports", ...)` trouvé** dans le code moto.

---

## B. ENUM SIDE / ACCEPTATION DE "jantes" (PREUVES)

### Enum `side` — définition

**Fichier** : `src/modules/etatDesLieuxDepartMoto/schemas/formSchemaMoto.ts`

**Preuve** (lignes 138-148) :
```typescript
side: z.enum([
  "avant",
  "droit",
  "arriere",
  "gauche",
  "coffre",
  "janteAvDroit",
  "janteArDroit",
  "janteAvGauche",
  "janteArGauche",
]).optional(),
```

**Valeurs acceptées** :
- ✅ `"avant"`, `"droit"`, `"arriere"`, `"gauche"`, `"coffre"`
- ✅ `"janteAvDroit"`, `"janteArDroit"`, `"janteAvGauche"`, `"janteArGauche"`
- ❌ **`"jantes"` n'est PAS accepté**

---

### Comparaison avec voiture

**Fichier** : `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx`

**Preuve** (lignes 199-208) :
```typescript
side: z.enum([
  "avant", 
  "droit", 
  "arriere",
  "gauche", 
  "coffre",
  "janteAvDroit",
  "janteArDroit", 
  "janteAvGauche",
  "janteArGauche"
]).optional(),
```

**Réponse** : ✅ **Enum identique** entre moto et voiture. **Pas de `"jantes"`** dans aucun des deux.

---

## C. MAPPING UTILITAIRE EXISTANT (OUI/NON)

### ❌ Pas de fonction utilitaire centralisée

**Preuve** : Grep sur `function.*map.*zone|const.*map.*zone|mapZone|zoneMap|motoToCar|carToMoto` → **0 résultat** (sauf mappings inline)

**Mapping inline trouvé** :

1. **`saveStep3DraftMoto()`** (`checkinDepartService.ts:1256-1265`) :
```typescript
if (step3.zonesPhotos.cote_droit) adaptedZonesPhotos.droit = step3.zonesPhotos.cote_droit;
if (step3.zonesPhotos.cote_gauche) adaptedZonesPhotos.gauche = step3.zonesPhotos.cote_gauche;
if (step3.zonesPhotos.jantes) {
  adaptedZonesPhotos.janteAvDroit = step3.zonesPhotos.jantes;
}
```

2. **`loadExistingCheckinDraftMoto()`** (`EtatDesLieuxDepartFormMoto.tsx:311-313`) :
```typescript
if (zonesPhotos.droit) mappedZonesPhotos.cote_droit = zonesPhotos.droit;
if (zonesPhotos.gauche) mappedZonesPhotos.cote_gauche = zonesPhotos.gauche;
```

3. **`Section3ExterieurMoto.tsx:144`** :
```typescript
const serviceZoneMap: Record<MotoExteriorZone, string> = {
  cote_droit: "droit",
  // ...
};
```

**Réponse** : ❌ **Pas de fonction utilitaire centralisée**. Mapping inline dans 3 endroits différents.

---

## D. CONCLUSION DIAG : CHOIX RÉALISABLE SANS CHANGER SCHEMA

### Option A : Utiliser `side="janteAvDroit"` (compatible enum)

**Justification** :
- ✅ **Compatible enum** : `"janteAvDroit"` est accepté (ligne 144)
- ✅ **Cohérence DB** : `saveStep3DraftMoto()` mappe déjà `jantes → janteAvDroit` (ligne 1264)
- ✅ **Pas de changement schema** : Enum déjà compatible

**Mapping recommandé** :
- Zone moto `"jantes"` → `side="janteAvDroit"` (pour `damageReports`)

---

### Option B : Utiliser `side="jantes"` — ❌ IMPOSSIBLE

**Justification** :
- ❌ **Non accepté par enum** : `"jantes"` n'est pas dans la liste (lignes 138-148)
- ❌ **Nécessiterait changement schema** : Ajouter `"jantes"` à l'enum

**Conclusion** : ❌ **Option B impossible sans modifier le schema**.

---

### Où stocker `damageReports` — Racine (pas `step3`)

**Justification** :
- ✅ **Schema autorise** : `damageReports` est à la racine (ligne 136)
- ✅ **Cohérence voiture** : Voiture stocke aussi à la racine (`EtatDesLieuxDepartForm.tsx:198`)
- ✅ **Pas de conflit** : `step3.degats` reste pour compatibilité (ancien format)

**Réponse** : ✅ **Stocker à la racine** (`damageReports`), **pas dans `step3`**.

---

## RÉSUMÉ EXÉCUTIF

| Question | Réponse |
|---------|---------|
| **`damageReports` autorisé racine ?** | ✅ Oui (ligne 136) |
| **`damageReports` autorisé dans `step3` ?** | ❌ Non (seulement `degats`) |
| **`damageReports` dans defaultValues ?** | ❌ Non (à ajouter) |
| **`setValue("damageReports")` existe ?** | ❌ Non (à ajouter) |
| **Enum accepte `"jantes"` ?** | ❌ Non |
| **Enum accepte `"janteAvDroit"` ?** | ✅ Oui |
| **Fonction mapping utilitaire ?** | ❌ Non (mapping inline) |
| **Option réalisable sans changer schema** | ✅ Option A : `side="janteAvDroit"` |
| **Où stocker `damageReports`** | ✅ Racine (pas `step3`) |

**Conclusion** :
- ✅ **Stocker `damageReports` à la racine** (compatible schema)
- ✅ **Utiliser `side="janteAvDroit"` pour jantes** (compatible enum, cohérent avec mapping DB existant)
- ✅ **Ajouter `damageReports: []` dans defaultValues** (pour éviter `undefined`)
- ✅ **Réutiliser mapping inline existant** (pas de fonction utilitaire, mais logique claire)

---

**FIN DIAGNOSTIC VERROUILLAGE MAPPING + SCHEMA**

