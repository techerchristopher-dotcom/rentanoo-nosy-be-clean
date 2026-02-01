# DIAGNOSTIC MOTO — Points d'entrée + Modèle de données

## 📊 Collecte minimale pour plan d'implémentation calqué sur VOITURE

---

## A. UI – POINTS D'ENTRÉE (fichiers + composants + imports)

### Form principal

**Fichier** : `src/modules/etatDesLieuxDepartMoto/EtatDesLieuxDepartFormMoto.tsx`

**Composant** : `EtatDesLieuxDepartFormMoto`

**Imports** :
```typescript
import Section1IdentificationMoto from "./sections/Section1IdentificationMoto";
import Section2RelevesMoto from "./sections/Section2RelevesMoto";
import { Section3ExterieurMoto } from "./sections/Section3ExterieurMoto";
import { Section5AccessoiresMoto } from "./sections/Section5AccessoiresMoto";
import Section6RemarquesMoto from "./sections/Section6RemarquesMoto";
import { Section8ValidationMoto } from "./sections/Section8ValidationMoto";
```

**Steps visibles** : `[1, 2, 3, 5, 6, 7]` (Step 4 masqué pour moto)

---

### Section saisie dégâts extérieurs

**Fichier** : `src/modules/etatDesLieuxDepartMoto/sections/Section3ExterieurMoto.tsx`

**Composant** : `Section3ExterieurMoto`

**Imports** :
```typescript
import { saveStep3DraftMoto } from "@/services/checkinDepartService";
import type { Step3MotoData, MotoExteriorZone, MotoPhoto } from "../types/step3Moto";
```

**Zones moto** : `["avant", "cote_droit", "arriere", "cote_gauche", "jantes"]`

**⚠️ Pas de composant accordion dégâts** : Section3ExterieurMoto gère uniquement les photos par zone, **pas de gestion structurée des dégâts** (pas d'équivalent `ExteriorInspectionAccordionSimple.tsx`).

---

### Section validation/récap

**Fichier** : `src/modules/etatDesLieuxDepartMoto/sections/Section8ValidationMoto.tsx`

**Composant** : `Section8ValidationMoto`

**Imports** :
```typescript
import { SupabaseCheckinService } from "@/services/supabaseCheckinService";
```

---

## B. SERVICES – LECTURE/ÉCRITURE SUPABASE (tables + champs)

### Table utilisée

**Table** : `checkin_depart` (même table que voiture)

**Preuve** (`EtatDesLieuxDepartFormMoto.tsx:243`) :
```typescript
const { data: existingCheckin, error } = await supabase
  .from("checkin_depart" as any)
  .select("*")
  .eq("booking_id", bookingId)
  .in("status", ["draft", "completed"])
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
```

---

### Fonction lecture draft

**Fichier** : `src/modules/etatDesLieuxDepartMoto/EtatDesLieuxDepartFormMoto.tsx`

**Fonction** : `loadExistingCheckinDraftMoto()` (ligne 232)

**Requête** :
```typescript
.from("checkin_depart")
.select("*")
.eq("booking_id", bookingId)
.in("status", ["draft", "completed"])
.order("created_at", { ascending: false })
.limit(1)
.maybeSingle();
```

**Champs lus** :
- ✅ `data` (JSONB) → `data.step3.degats`
- ✅ `status`
- ✅ `id`

---

### Fonction sauvegarde draft

**Fichier** : `src/services/checkinDepartService.ts`

**Fonction** : `saveStep3DraftMoto()` (ligne 1232)

**Appel service** :
```typescript
await SupabaseCheckinService.saveCheckinDraft({
  checkin_id: checkinId || null,
  booking_id: bookingId,
  status: "draft",
  data: {
    step3: adaptedStep3,  // ⭐ Contient zonesPhotos + degats
    step4: null,  // ⚠️ IMPORTANT : Step 4 toujours null pour moto
  },
});
```

**Champs écrits** (via `saveCheckinDraft`) :
- ✅ `data.step3` (JSONB) → contient `zonesPhotos` + `degats`
- ✅ `data.step4` → toujours `null` pour moto
- ✅ Colonnes SQL extraites : `photos_exterieur`, `photos_jantes`, `degats` (si extraction automatique)

**Mapping zones** (lignes 1251-1266) :
- `cote_droit` → `droit` (DB)
- `cote_gauche` → `gauche` (DB)
- `jantes` → `janteAvDroit` (DB, agrégation)

---

### Snapshot légal

**Statut** : ✅ Existe (même mécanisme que voiture)

**Preuve** : `supabaseCheckinService.ts:createLegalSnapshot()` gère le type véhicule (`isMoto`) et adapte le snapshot :
- `exterior.coffre` → `[]` pour moto (ligne 639)
- `interior` → `null` pour moto (ligne 661)

**Champ DB** : `snapshot_legal` (JSONB, même colonne que voiture)

---

## C. FORM STATE – RHF/ZOD/TYPES (paths dégâts + shape)

### Schéma Zod

**Fichier** : `src/modules/etatDesLieuxDepartMoto/schemas/formSchemaMoto.ts`

**Path dégâts** : `step3.degats[]` (ligne 19-25)

**Shape actuelle** :
```typescript
degats: z.array(
  z.object({
    zone: z.enum(["avant", "cote_droit", "arriere", "cote_gauche", "jantes"]).optional(),
    description: z.string().optional(),
    photos: z.array(motoPhotoSchema).optional(),
  })
).optional(),
```

**Path alternatif** : `damageReports[]` (ligne 136-153, pour compatibilité, **non utilisé actuellement**)

**Shape `damageReports`** (identique voiture) :
```typescript
damageReports: z.array(
  z.object({
    side: z.enum(["avant", "droit", "arriere", "gauche", "coffre", ...]).optional(),
    typeDegats: z.array(z.string()).optional(),
    commentaire: z.string().optional(),
    photos: z.array(z.any()).optional(),
  })
).optional(),
```

---

### Types TypeScript

**Fichier** : `src/modules/etatDesLieuxDepartMoto/types/step3Moto.ts`

**Type** : `Step3MotoData` (ligne 18-26)

**Shape** :
```typescript
degats?: Array<{
  zone?: MotoExteriorZone;  // "avant" | "cote_droit" | "arriere" | "cote_gauche" | "jantes"
  description: string;
  photos?: MotoPhoto[];
}>;
```

**⚠️ Différence avec voiture** :
- Moto : `zone` + `description` (champ texte libre)
- Voiture : `side` + `typeDegats[]` + `commentaire` (types prédéfinis)

---

## D. REPRISE DE DRAFT – EXISTE ? (preuves)

### ✅ OUI, existe déjà

**Fichier** : `src/modules/etatDesLieuxDepartMoto/EtatDesLieuxDepartFormMoto.tsx`

**Fonction** : `loadExistingCheckinDraftMoto()` (ligne 232)

**Preuve** :
```typescript
const { data: existingCheckin, error } = await supabase
  .from("checkin_depart" as any)
  .select("*")
  .eq("booking_id", bookingId)
  .in("status", ["draft", "completed"])
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
```

**Hydratation Step3** (lignes 302-338) :
```typescript
const step3 = checkin.data?.step3;
if (step3 && !cancelled) {
  setInitialStep3Data({
    zonesPhotos: mappedZonesPhotos,
    completedAt: step3.completedAt,
    degats: step3.degats,  // ⭐ Dégâts chargés depuis draft
  });
}
```

**⚠️ Différence avec voiture** :
- Moto : Hydratation automatique (pas de modal de choix)
- Voiture : Modal "Poursuivre" / "Redémarrer"

---

## E. TODO MINIMAL – Liste des 5-10 fichiers à modifier

### Fichiers à modifier (sans proposer comment)

1. **`src/modules/etatDesLieuxDepartMoto/sections/Section3ExterieurMoto.tsx`**
   - Ajouter gestion structurée des dégâts (équivalent `ExteriorInspectionAccordionSimple.tsx`)

2. **`src/modules/etatDesLieuxDepartMoto/schemas/formSchemaMoto.ts`**
   - Aligner `step3.degats` sur structure voiture (`typeDegats[]` + `commentaire`)

3. **`src/modules/etatDesLieuxDepartMoto/types/step3Moto.ts`**
   - Mettre à jour `Step3MotoData.degats` pour correspondre à `ExteriorDamage` (voiture)

4. **`src/modules/etatDesLieuxDepartMoto/EtatDesLieuxDepartFormMoto.tsx`**
   - Ajouter `damageReports` dans RHF (path racine, comme voiture)
   - Hydrater `damageReports` depuis `step3.degats` (migration/conversion)

5. **`src/services/checkinDepartService.ts`**
   - Modifier `saveStep3DraftMoto()` pour extraire `damageReports` vers `step3.damageReports`
   - Ajouter logique de merge (comme `saveStep3ZoneDraft()` voiture)

6. **`src/services/supabaseCheckinService.ts`**
   - Vérifier extraction `degats` depuis `step3.damageReports` (déjà fait pour voiture)

7. **`src/modules/etatDesLieuxDepartMoto/sections/Section8ValidationMoto.tsx`**
   - Ajouter affichage récapitulatif des dégâts (groupés par zone)

8. **`src/types/snapshot-legal.ts`** (si nécessaire)
   - Vérifier mapping `damageReports` → `snapshot_legal.exterior.damages` pour moto

9. **Créer composant** : `src/components/ExteriorInspectionAccordionMoto.tsx` (optionnel)
   - Réutiliser logique `ExteriorInspectionAccordionSimple.tsx` adaptée zones moto

10. **Migration données** : Script de migration `step3.degats` → `step3.damageReports` (si nécessaire)

---

## RÉSUMÉ EXÉCUTIF

| Aspect | Réponse |
|--------|---------|
| **Table DB** | `checkin_depart` (même que voiture) |
| **Path dégâts actuel** | `step3.degats[]` (structure différente voiture) |
| **Path dégâts cible** | `damageReports[]` (racine RHF, comme voiture) |
| **Shape actuelle** | `{ zone, description, photos[] }` |
| **Shape cible** | `{ side, typeDegats[], commentaire, photos[] }` |
| **Reprise draft** | ✅ Existe (`loadExistingCheckinDraftMoto`) |
| **Composant accordion dégâts** | ❌ N'existe pas (à créer/adapter) |
| **Snapshot légal** | ✅ Existe (gère `isMoto`) |

**Conclusion** : Moto réutilise `checkin_depart` mais avec structure dégâts différente (`degats` vs `damageReports`). Migration nécessaire pour aligner sur voiture.

---

**FIN DIAGNOSTIC MOTO**

