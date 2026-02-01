# DIAGNOSTIC MOTO — Step 2A (Affichage lecture seule damageReports en validation moto)

## 📊 Où et comment ajouter un affichage minimal "Dégâts (draft)" dans la validation moto

---

## A. PARENT RENDERING (FormProvider + rendu Section8ValidationMoto)

### Composant principal

**Fichier** : `src/modules/etatDesLieuxDepartMoto/sections/Section8ValidationMoto.tsx`

**Signature** (lignes 55-66) :
```typescript
export function Section8ValidationMoto({
  onInvalidStepsChange,
  onMissingFieldsChange,
  onNavigateToMissingField,
  bookingId,
  ownerId,
  renterId,
  checkinId,
  onCheckinIdChange,
  isCheckinCompleted = false,
  onComplete,
}: Section8ValidationMotoProps) {
```

### Rendu depuis parent

**Fichier** : `src/modules/etatDesLieuxDepartMoto/EtatDesLieuxDepartFormMoto.tsx`

**Rendu** (lignes 716-750) :
```typescript
case 7:
  return (
    <Section8ValidationMoto
      key="step-7-validation"
      onInvalidStepsChange={setInvalidSteps}
      onMissingFieldsChange={(fields) => {...}}
      onNavigateToMissingField={(target) => {...}}
      bookingId={bookingId}
      ownerId={null}
      renterId={null}
      checkinId={checkinId}
      onCheckinIdChange={(id, status) => {...}}
      isCheckinCompleted={isReadOnly}
      onComplete={onComplete}
    />
  );
```

### FormProvider — Section8ValidationMoto est dans FormProvider

**Preuve** (`EtatDesLieuxDepartFormMoto.tsx:777-897`) :
```typescript
return (
  <FormProvider {...methods}>
    <div className="space-y-6">
      {/* ... */}
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div key={`step-content-${currentStep}`}>
            {renderStep()}  // ⭐ Section8ValidationMoto est rendu ici (case 7)
          </div>
        </CardContent>
      </Card>
      {/* ... */}
    </div>
  </FormProvider>
);
```

**Réponse** : ✅ **Section8ValidationMoto est dans `<FormProvider {...methods}>`**, donc accès RHF via `useFormContext()`.

---

## B. ACCÈS RHF POSSIBLE (useFormContext/watch/getValues)

### Utilisation actuelle de RHF

**Preuve** (`Section8ValidationMoto.tsx:7, 67, 69-70, 251-252`) :
```typescript
import { useFormContext } from "react-hook-form";

export function Section8ValidationMoto({...}) {
  const { watch, setValue, getValues } = useFormContext();

  const ownerSignature = watch("ownerSignature");
  const driverSignature = watch("driverSignature");
  
  // ...
  const vehicule = getValues("vehicule");
  const releves = getValues("releves");
```

**Réponse** :
- ✅ **Utilise `useFormContext()`** (ligne 67)
- ✅ **Utilise `watch()`** pour signatures (lignes 69-70)
- ✅ **Utilise `getValues()`** pour véhicule/relevés (lignes 251-252)

### Accès `damageReports` possible

**Confirmation** : ✅ **On peut faire** :
```typescript
const damageReports = watch("damageReports") || [];
// ou
const damageReports = getValues("damageReports") || [];
```

**Sans casser** : ✅ Compatible avec l'architecture existante (même pattern que `ownerSignature`, `driverSignature`).

---

## C. POINT D'INSERTION RECOMMANDÉ (avec extrait de contexte)

### Blocs UI présents

**Structure** (`Section8ValidationMoto.tsx:360-483`) :
1. **En-tête** (lignes 362-370) : Titre "Validation & Signature"
2. **Card indicateur validation** (lignes 373-416) : État complet/incomplet
3. **Card signatures** (lignes 419-435) : SignatureCanvas propriétaire/locataire
4. **Card "Vérifier les données"** (lignes 438-452) : Bouton vérification manuelle
5. **Bouton Finaliser** (lignes 455-477) : Bouton de finalisation
6. **Message finalisé** (lignes 478-482) : Texte si `isCheckinCompleted`

### Point d'insertion recommandé

**Endroit le plus sûr** : **Après le Card "Vérifier les données" (ligne 452), avant le bouton Finaliser (ligne 455)**

**Justification** :
- ✅ Logique : Après vérification, avant finalisation
- ✅ Cohérence : Suit le flow "vérifier → récapituler → finaliser"
- ✅ Pas de conflit : N'interfère pas avec les signatures ni le bouton

**Extrait de contexte** (lignes 437-456) :
```typescript
      {/* Bouton de validation manuelle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vérifier les données</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => checkValidationData(true)}
            className="w-full"
          >
            Vérifier les champs requis
          </Button>
        </CardContent>
      </Card>

      {/* ⭐ POINT D'INSERTION RECOMMANDÉ ICI : Card "Dégâts (draft)" */}

      {/* Bouton Finaliser */}
      <div className="flex justify-end pt-4">
        <Button
          type="button"
          onClick={handleFinalize}
          disabled={!canSubmit || isFinalizing || isCheckinCompleted}
```

---

## D. COMPOSANTS RÉUTILISABLES (OUI/NON)

### Composant `ExteriorZoneRecapCard` (voiture)

**Fichier** : `src/modules/etatDesLieuxDepart/components/ExteriorZoneRecapCard.tsx`

**Type** (lignes 65-70) :
```typescript
export type ExteriorZoneRecapCardProps = {
  zoneKey: string; // "avant", "droit", "arriere", "coffre", "gauche"
  zoneLabel: string;
  mainPhoto?: MainPhoto;
  damages?: DamageReport[]; // ⭐ Accepte damageReports
};
```

**Type `DamageReport`** (lignes 58-63) :
```typescript
export type DamageReport = {
  side?: string;
  typeDegats?: string[];
  commentaire?: string;
  photos?: (PhotoWithTimestamp | File | string)[];
};
```

**Réponse** : ✅ **Composant réutilisable** — `ExteriorZoneRecapCard` accepte `damages?: DamageReport[]` compatible avec `damageReports` moto.

**⚠️ Adaptation nécessaire** :
- Zones moto : `["avant", "cote_droit", "arriere", "cote_gauche", "jantes"]`
- Zones voiture : `["avant", "droit", "arriere", "gauche", "coffre", "janteAvDroit", ...]`
- **Mapping requis** : `cote_droit → droit`, `cote_gauche → gauche`, `jantes → janteAvDroit` (ou agrégation)

**Aucun composant recap dégâts moto** : ❌ Pas de composant spécifique moto trouvé.

---

## E. EDGE CASES (GUARDS)

### Si `damageReports` est `undefined` ou `[]`

**Preuve** : Pattern existant dans le code (ligne 70) :
```typescript
const driverSignature = watch("driverSignature");
// Pas de guard explicite, mais utilisé avec condition : if (!driverSignature) missing.push(...)
```

**Recommandation** :
- ✅ **Guard à mettre** : `const damageReports = watch("damageReports") || [];`
- ✅ **Condition d'affichage** : `{damageReports.length > 0 && (...)}` pour ne pas afficher le Card si vide

**Où mettre le guard** : Dans le composant `Section8ValidationMoto`, au début du `return`, avant le rendu conditionnel.

---

### Validation moto en `completed` (read-only)

**Preuve** (`Section8ValidationMoto.tsx:20, 64, 171, 478-482`) :
```typescript
interface Section8ValidationMotoProps {
  isCheckinCompleted?: boolean;  // ⭐ Prop existe
}

export function Section8ValidationMoto({
  isCheckinCompleted = false,  // ⭐ Default false
  // ...
}) {
  // ⚠️ Protection : ne pas finaliser si déjà completed
  if (isCheckinCompleted) {
    toast.error("État des lieux finalisé", {...});
    return;
  }
  
  // ...
  {isCheckinCompleted && (
    <p className="text-xs text-muted-foreground text-center max-w-md mx-auto mt-2">
      ✅ Cet état des lieux a été finalisé et est maintenant verrouillé.
    </p>
  )}
```

**Réponse** :
- ✅ **Peut être `completed`** : Prop `isCheckinCompleted` existe
- ✅ **UI doit rester affichable** : Le message finalisé est affiché (ligne 478), donc l'UI reste visible en read-only
- ✅ **Pas de boutons** : Le bouton Finaliser est `disabled={isCheckinCompleted}` (ligne 459)

**Recommandation** : Afficher les dégâts même en mode `completed` (lecture seule), sans boutons d'action.

---

## RÉSUMÉ EXÉCUTIF

| Question | Réponse |
|---------|---------|
| **Section8ValidationMoto dans FormProvider ?** | ✅ Oui (ligne 777) |
| **Accès RHF possible ?** | ✅ Oui (`useFormContext()`, `watch()`, `getValues()`) |
| **Point d'insertion** | ✅ Après Card "Vérifier les données" (ligne 452), avant bouton Finaliser |
| **Composant réutilisable** | ✅ `ExteriorZoneRecapCard` (avec mapping zones) |
| **Guard `damageReports` vide** | ✅ `watch("damageReports") || []` + condition `length > 0` |
| **Mode `completed`** | ✅ UI affichable (read-only), pas de boutons |

**Conclusion** : Insertion possible après le Card "Vérifier les données" avec `watch("damageReports")`, réutilisation de `ExteriorZoneRecapCard` avec mapping zones moto → voiture.

---

**FIN DIAGNOSTIC STEP 2A**

