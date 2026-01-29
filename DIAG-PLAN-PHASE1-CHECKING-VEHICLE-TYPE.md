# 🔍 Phase 1 : Diagnostic & Plan - Centralisation détection type véhicule

**Date** : 2025-01-XX  
**Projet** : Rentanoo Scoot  
**Phase** : 1 (Centralisation uniquement, pas d'UI moto)  
**Scope** : Détection `vehicle_type` dans `Checking.tsx` + switch de rendu préparé

---

## 📋 Table des matières

1. [A) Diagnostic actuel (factuel)](#a-diagnostic-actuel-factuel)
2. [B) Plan d'implémentation Phase 1](#b-plan-dimplémentation-phase-1)
3. [C) Gestion erreurs & fallback](#c-gestion-erreurs--fallback)
4. [D) Tests manuels Phase 1](#d-tests-manuels-phase-1)

---

## A) Diagnostic actuel (factuel)

### A.1 Récupération `bookingId`

**Fichier** : `src/pages/Checking.tsx`

**Ligne 10** :
```typescript
const { bookingId } = useParams<{ bookingId: string }>();
```

**Source** : Route React Router définie dans `src/App.tsx` ligne 170 :
```typescript
<Route path="/checking/:bookingId" element={<Checking />} />
```

**Conclusion** : ✅ `bookingId` est récupéré depuis l'URL via `useParams()`.

### A.2 Requêtes Supabase dans `Checking.tsx`

**Requête actuelle** (lignes 15-42) :

**Objectif** : Charger `reference_number` pour affichage dans le titre.

**Requête** :
```typescript
const { data, error } = await supabase
  .from("bookings")
  .select("reference_number")
  .eq("id", bookingId)
  .single();
```

**Données récupérées** :
- `reference_number` (number | null)

**Stockage** : State `referenceNumber` (ligne 11)

**Gestion erreur** : Log console uniquement, pas de blocage UI (lignes 29-35)

**État de chargement** : `loadingReference` (ligne 12)

### A.3 Rendu `EtatDesLieuxDepartForm`

**Fichier** : `src/pages/Checking.tsx`

**Lignes 80-85** :
```typescript
<ErrorBoundary>
  <EtatDesLieuxDepartForm 
    bookingId={bookingId} 
    bookingReferenceNumber={referenceNumber}
  />
</ErrorBoundary>
```

**Props passées** :
- `bookingId` : string (depuis `useParams()`)
- `bookingReferenceNumber` : number | null (depuis state)

**Wrapper** : `ErrorBoundary` pour capturer les erreurs React

**Position** : Dans le `<main>` de la page, après le titre

### A.4 Utilitaire existant `isMoto()`

**Fichier** : `src/utils/vehicleType.ts`

**Code actuel** :
```typescript
export const isMoto = (v: { vehicle_type?: string | null } | null | undefined): boolean => {
  if (!v) return false;
  return v.vehicle_type === 'moto';
};
```

**Limitations identifiées** :
- ❌ Ne gère pas `'scooter'` (doit être traité comme `'moto'`)
- ❌ Retourne `boolean` (pas adapté pour switch de rendu qui a besoin de `'car' | 'moto'`)
- ✅ Gère déjà `null` / `undefined` (retourne `false`)

**Usage actuel** : Utilisé dans `src/pages/Index.tsx` et `src/pages/vehicles/MotoVehicleDetails.tsx` pour détecter si un véhicule est une moto.

### A.5 Flux de données actuel

**Schéma** :
```
URL /checking/:bookingId
  ↓
useParams() → bookingId
  ↓
useEffect() → Requête Supabase bookings.select("reference_number")
  ↓
State referenceNumber
  ↓
Rendu <EtatDesLieuxDepartForm bookingId={bookingId} bookingReferenceNumber={referenceNumber} />
```

**⚠️ PROBLÈME IDENTIFIÉ** : `vehicle_type` n'est **PAS** récupéré actuellement dans `Checking.tsx`.

**Note** : `EtatDesLieuxDepartForm.tsx` récupère le véhicule (ligne 637-641) mais **sans** `vehicle_type` :
```typescript
.select("id, brand, model, license_plate, owner_id")  // vehicle_type manquant
```

---

## B) Plan d'implémentation Phase 1

### B.1 Vue d'ensemble

**Objectif** : Centraliser la détection `vehicle_type` dans `Checking.tsx` et préparer le switch de rendu (sans créer l'UI moto).

**Fichiers à modifier** :
1. `src/pages/Checking.tsx` (ajout récupération `vehicle_type` + switch)
2. `src/utils/vehicleType.ts` (étendre/utiliser fonction de normalisation)

**Fichiers à créer** :
- Aucun (Phase 1 uniquement)

### B.2 Étapes détaillées

#### **Étape 1 : Étendre fonction utilitaire de normalisation**

**Fichier** : `src/utils/vehicleType.ts`

**Action** : Ajouter fonction `getVehicleTypeForChecking()`

**Signature proposée** :
```typescript
export function getVehicleTypeForChecking(
  vehicleType: string | null | undefined
): 'car' | 'moto'
```

**Règles de normalisation** :
- `null` / `undefined` → `'car'` (fallback)
- `'car'` → `'car'`
- `'moto'` → `'moto'`
- `'scooter'` → `'moto'` (traité comme moto)
- Valeur inconnue (ex: `'truck'`, `'van'`) → `'car'` + `console.warn()`

**Note** : On peut réutiliser `isMoto()` existant mais il faut l'adapter pour gérer `'scooter'` et retourner `'car' | 'moto'` au lieu de `boolean`.

**Alternative** : Créer nouvelle fonction dédiée `getVehicleTypeForChecking()` qui appelle `isMoto()` en interne si besoin.

#### **Étape 2 : Ajouter states dans `Checking.tsx`**

**Fichier** : `src/pages/Checking.tsx`

**Ligne ~12** (après `loadingReference`) :

**States à ajouter** :
- `vehicleType: 'car' | 'moto' | null` (initialisé à `null`)
- `loadingVehicleType: boolean` (initialisé à `true`)

**Justification** :
- `vehicleType` : Stocke le type normalisé (`'car'` ou `'moto'`)
- `loadingVehicleType` : Indique si la récupération est en cours (pour afficher loader)

#### **Étape 3 : Ajouter `useEffect` pour récupérer `vehicle_type`**

**Fichier** : `src/pages/Checking.tsx`

**Position** : Après le `useEffect` existant (ligne ~42, après `loadBookingReference()`)

**Logique** :
1. Vérifier que `bookingId` existe
2. Requête 1 : `bookings.select("vehicle_id").eq("id", bookingId).single()`
3. Si erreur → Fallback `'car'` + log erreur
4. Si `booking.vehicle_id` existe :
   - Requête 2 : `vehicles.select("vehicle_type").eq("id", booking.vehicle_id).single()`
   - Si erreur → Fallback `'car'` + log erreur
   - Si succès → Normaliser via `getVehicleTypeForChecking(vehicle.vehicle_type)`
5. Stocker résultat dans state `vehicleType`
6. Mettre `loadingVehicleType` à `false`

**Gestion erreurs** : Voir section C

**Dépendances** : `[bookingId]` (se déclenche quand `bookingId` change)

#### **Étape 4 : Créer composant placeholder moto**

**Fichier** : `src/pages/Checking.tsx` (composant local, pas de fichier séparé)

**Position** : Avant le `return` principal (ligne ~60)

**Composant** :
```typescript
function CheckingMotoPlaceholder({ bookingId }: { bookingId: string }) {
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <h2 className="text-2xl font-semibold mb-4">État des lieux moto</h2>
        <p className="text-muted-foreground">
          L'interface d'état des lieux pour les motos et scooters sera disponible prochainement.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Réservation : {bookingId}
        </p>
      </CardContent>
    </Card>
  );
}
```

**Note** : Composant minimal, juste pour tester le switch. Sera remplacé par `EtatDesLieuxDepartFormMoto` en Phase 2.

#### **Étape 5 : Ajouter rendu conditionnel**

**Fichier** : `src/pages/Checking.tsx`

**Position** : Lignes 80-85 (remplacer le rendu actuel de `EtatDesLieuxDepartForm`)

**Logique** :
1. Si `loadingVehicleType === true` → Afficher loader (spinner + texte "Chargement du type de véhicule...")
2. Si `loadingVehicleType === false` :
   - Si `vehicleType === 'car'` → `<EtatDesLieuxDepartForm ... />` (comportement actuel)
   - Si `vehicleType === 'moto'` → `<CheckingMotoPlaceholder bookingId={bookingId} />` (placeholder)
   - Si `vehicleType === null` → Fallback `<EtatDesLieuxDepartForm ... />` (sécurité)

**Wrapper** : Garder `ErrorBoundary` autour du rendu conditionnel

### B.3 Ordre d'implémentation recommandé

1. **Étape 1** : Étendre `src/utils/vehicleType.ts` (fonction `getVehicleTypeForChecking()`)
2. **Étape 2** : Ajouter states dans `Checking.tsx`
3. **Étape 3** : Ajouter `useEffect` pour récupérer `vehicle_type`
4. **Étape 4** : Créer composant placeholder moto
5. **Étape 5** : Ajouter rendu conditionnel

**Justification** : Ordre logique, chaque étape dépend de la précédente.

### B.4 Imports nécessaires

**Fichier** : `src/pages/Checking.tsx`

**Imports à ajouter** :
- `getVehicleTypeForChecking` depuis `@/utils/vehicleType`
- `Card, CardContent` depuis `@/components/ui/card` (pour placeholder)

**Imports existants** (à conserver) :
- `useParams` depuis `react-router-dom`
- `useState, useEffect` depuis `react`
- `supabase` depuis `@/integrations/supabase/client`
- `EtatDesLieuxDepartForm` depuis `@/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm`
- `ErrorBoundary` depuis `@/components/ErrorBoundary`
- `Navbar, Footer` depuis `@/components/layout/...`

---

## C) Gestion erreurs & fallback

### C.1 Cas : Booking introuvable

**Scénario** : Requête `bookings.select("vehicle_id").eq("id", bookingId)` retourne erreur.

**Erreur Supabase typique** : `PGRST116` ("not found") ou `PGRST301` ("permission denied")

**Stratégie** :
1. **Log erreur** : `console.error("[Checking] Erreur récupération booking:", error)`
2. **Fallback** : `setVehicleType('car')` (comportement sécurisé)
3. **UI** : Afficher `EtatDesLieuxDepartForm` (comportement existant, l'erreur sera gérée par le composant enfant)
4. **État** : `setLoadingVehicleType(false)` pour débloquer le rendu

**Justification** : Si le booking n'existe pas, `EtatDesLieuxDepartForm` gérera l'erreur (déjà implémenté ligne 548-552). On évite de bloquer l'UI.

### C.2 Cas : Vehicle introuvable

**Scénario** : Requête `vehicles.select("vehicle_type").eq("id", booking.vehicle_id)` retourne erreur.

**Erreur Supabase typique** : `PGRST116` ("not found") ou `PGRST301` ("permission denied")

**Stratégie** :
1. **Log erreur** : `console.error("[Checking] Erreur récupération vehicle:", error)`
2. **Fallback** : `setVehicleType('car')` (comportement sécurisé)
3. **UI** : Afficher `EtatDesLieuxDepartForm` (comportement existant)
4. **État** : `setLoadingVehicleType(false)`

**Justification** : Si le véhicule n'existe pas, `EtatDesLieuxDepartForm` gérera l'erreur. Fallback `'car'` évite de bloquer l'UI.

### C.3 Cas : `vehicle_type` null

**Scénario** : `vehicle.vehicle_type` est `null` ou `undefined`.

**Stratégie** :
1. **Normalisation** : `getVehicleTypeForChecking(null)` retourne `'car'`
2. **Stockage** : `setVehicleType('car')`
3. **UI** : Afficher `EtatDesLieuxDepartForm` (comportement existant)
4. **Log** : Optionnel `console.log("[Checking] vehicle_type NULL, fallback car")` (pas d'erreur, comportement attendu)

**Justification** : Fallback `NULL` → `'car'` est le comportement attendu (véhicules existants sans `vehicle_type`).

### C.4 Cas : `vehicle_type` inconnu

**Scénario** : `vehicle.vehicle_type` a une valeur inattendue (ex: `'truck'`, `'van'`, `'bike'`).

**Stratégie** :
1. **Normalisation** : `getVehicleTypeForChecking('truck')` retourne `'car'` + `console.warn()`
2. **Stockage** : `setVehicleType('car')`
3. **UI** : Afficher `EtatDesLieuxDepartForm` (comportement sécurisé)
4. **Log** : `console.warn("[Checking] vehicle_type inattendu:", vehicleType, "fallback car")`

**Justification** : Fallback sécurisé vers `'car'` évite de crasher l'UI. Warning permet de détecter les valeurs inattendues en production.

### C.5 Cas : RLS bloquant

**Scénario** : Policy RLS sur `vehicles` bloque l'accès à `vehicle_type`.

**Analyse** :
- **RLS status** : `vehicles` table a RLS **DISABLED** (selon `DIAGNOSTIC-SCHEMA-COMPLET-RENTANOO.md` ligne 528)
- **Policies existantes** : 4 policies définies mais **inactives** car RLS disabled
- **Risque** : ⚠️ **FAIBLE** (RLS disabled = pas de restriction)

**Stratégie préventive** :
1. **Test** : Vérifier que la requête `vehicles.select("vehicle_type")` fonctionne avec un utilisateur non-propriétaire
2. **Si RLS activé plus tard** : S'assurer que la policy `"Anyone can view available vehicles"` inclut `vehicle_type` dans le SELECT
3. **Gestion erreur** : Si erreur `PGRST301` (permission denied) → Fallback `'car'` + log erreur

**Mitigation** :
- Si RLS est activé sur `vehicles` dans le futur, vérifier que `vehicle_type` est accessible via les policies existantes
- Alternative : Récupérer `vehicle_type` via `bookings` avec JOIN si nécessaire (mais complexe, à éviter)

### C.6 Cas : Latence / Double fetch

**Problème** : Deux requêtes séquentielles (`bookings` puis `vehicles`) peuvent ralentir le chargement.

**Stratégie** :
1. **Optimisation requête** : `vehicles.select("vehicle_type")` (une seule colonne, rapide)
2. **Loader** : Afficher spinner pendant `loadingVehicleType === true`
3. **Parallélisation** : Si possible, faire les deux requêtes en parallèle (mais nécessite `vehicle_id` d'abord, donc séquentiel)
4. **Cache** : Stocker `vehicleType` dans state pour éviter re-fetch si `bookingId` change

**Alternative** : Requête JOIN (mais plus complexe) :
```typescript
bookings.select("vehicle_id, vehicles(vehicle_type)").eq("id", bookingId)
```

**Recommandation** : Garder requêtes séquentielles pour Phase 1 (simplicité). Optimiser en Phase 2 si nécessaire.

### C.7 Résumé gestion erreurs

| Cas | Action | Fallback | Log |
|-----|--------|----------|-----|
| Booking introuvable | Log erreur | `'car'` | `console.error` |
| Vehicle introuvable | Log erreur | `'car'` | `console.error` |
| `vehicle_type` null | Normalisation | `'car'` | Optionnel `console.log` |
| `vehicle_type` inconnu | Normalisation + warning | `'car'` | `console.warn` |
| RLS bloquant | Log erreur | `'car'` | `console.error` |
| Latence | Afficher loader | - | - |

**Règle d'or** : **Toujours fallback vers `'car'`** pour éviter de bloquer l'UI.

---

## D) Tests manuels Phase 1

### D.1 Test 1 : `vehicle_type = 'car'` → Page s'affiche comme avant

**Scénario** :
1. Créer/modifier un véhicule avec `vehicle_type = 'car'`
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`
4. Vérifier le comportement

**Critères de succès** :
- ✅ Page s'affiche normalement (pas de changement visible)
- ✅ `EtatDesLieuxDepartForm` s'affiche (comportement existant)
- ✅ Pas d'erreur console
- ✅ Temps de chargement acceptable (< 2s)

**Vérifications** :
- Console : Pas d'erreur, pas de warning
- Network : Requêtes `bookings` et `vehicles` réussies
- UI : Formulaire voiture affiché normalement

### D.2 Test 2 : `vehicle_type = 'moto'` → Placeholder moto affiché

**Scénario** :
1. Créer/modifier un véhicule avec `vehicle_type = 'moto'`
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`
4. Vérifier le comportement

**Critères de succès** :
- ✅ Placeholder moto s'affiche (pas `EtatDesLieuxDepartForm`)
- ✅ Message clair "État des lieux moto - L'interface sera disponible prochainement"
- ✅ `bookingId` affiché dans le placeholder
- ✅ Pas d'erreur console
- ✅ Pas de crash React

**Vérifications** :
- Console : Pas d'erreur, log `[Checking] vehicle_type: moto`
- Network : Requêtes réussies
- UI : Placeholder moto visible, pas de formulaire voiture

### D.3 Test 3 : `vehicle_type = 'scooter'` → Placeholder moto affiché

**Scénario** :
1. Créer/modifier un véhicule avec `vehicle_type = 'scooter'`
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`
4. Vérifier le comportement

**Critères de succès** :
- ✅ Placeholder moto s'affiche (traité comme `'moto'`)
- ✅ Pas d'erreur console
- ✅ Pas de crash

**Vérifications** :
- Console : Pas d'erreur, log `[Checking] vehicle_type: scooter → moto`
- UI : Placeholder moto visible

### D.4 Test 4 : `vehicle_type = null` → Fallback car

**Scénario** :
1. Utiliser un véhicule existant avec `vehicle_type = NULL` (ou non défini)
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`
4. Vérifier le comportement

**Critères de succès** :
- ✅ `EtatDesLieuxDepartForm` s'affiche (fallback `'car'`)
- ✅ Pas d'erreur console
- ✅ Comportement identique à Test 1

**Vérifications** :
- Console : Optionnel log `[Checking] vehicle_type NULL, fallback car`
- UI : Formulaire voiture affiché (comportement normal)

### D.5 Test 5 : Erreur Supabase (booking introuvable) → Fallback car

**Scénario** :
1. Accéder à `/checking/{bookingId_invalide}` (UUID qui n'existe pas)
2. Vérifier le comportement

**Critères de succès** :
- ✅ Page ne crash pas
- ✅ `EtatDesLieuxDepartForm` s'affiche (fallback `'car'`)
- ✅ Erreur loggée dans console : `[Checking] Erreur récupération booking: ...`
- ✅ `loadingVehicleType` passe à `false` (pas de loader infini)

**Vérifications** :
- Console : Erreur Supabase loggée (`PGRST116` ou similaire)
- UI : Formulaire voiture affiché (gestion erreur par composant enfant)

### D.6 Test 6 : Erreur Supabase (vehicle introuvable) → Fallback car

**Scénario** :
1. Créer une réservation avec `vehicle_id` pointant vers un véhicule supprimé/invalide
2. Accéder à `/checking/{bookingId}`
3. Vérifier le comportement

**Critères de succès** :
- ✅ Page ne crash pas
- ✅ `EtatDesLieuxDepartForm` s'affiche (fallback `'car'`)
- ✅ Erreur loggée : `[Checking] Erreur récupération vehicle: ...`
- ✅ `loadingVehicleType` passe à `false`

**Vérifications** :
- Console : Erreur Supabase loggée
- UI : Formulaire voiture affiché (gestion erreur par composant enfant)

### D.7 Test 7 : Loader affiché pendant chargement

**Scénario** :
1. Accéder à `/checking/{bookingId}` (véhicule valide)
2. Observer l'affichage pendant le chargement

**Critères de succès** :
- ✅ Loader visible pendant `loadingVehicleType === true`
- ✅ Spinner + texte "Chargement du type de véhicule..."
- ✅ Loader disparaît une fois `vehicleType` déterminé
- ✅ Pas de flash blanc

**Vérifications** :
- UI : Loader visible puis disparaît
- Timing : Chargement < 1s (requêtes rapides)

### D.8 Test 8 : Valeur inattendue `vehicle_type` → Fallback car + warning

**Scénario** :
1. Modifier manuellement en DB : `UPDATE vehicles SET vehicle_type = 'truck' WHERE id = '...'`
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`
4. Vérifier le comportement

**Critères de succès** :
- ✅ `EtatDesLieuxDepartForm` s'affiche (fallback `'car'`)
- ✅ Warning loggé : `[Checking] vehicle_type inattendu: truck, fallback car`
- ✅ Pas d'erreur console (juste warning)
- ✅ Pas de crash

**Vérifications** :
- Console : Warning visible
- UI : Formulaire voiture affiché (comportement sécurisé)

### D.9 Checklist finale Phase 1

- [ ] Test 1 : `vehicle_type = 'car'` → UI voiture inchangée ✅
- [ ] Test 2 : `vehicle_type = 'moto'` → Placeholder moto ✅
- [ ] Test 3 : `vehicle_type = 'scooter'` → Placeholder moto ✅
- [ ] Test 4 : `vehicle_type = null` → Fallback car ✅
- [ ] Test 5 : Erreur booking → Fallback car ✅
- [ ] Test 6 : Erreur vehicle → Fallback car ✅
- [ ] Test 7 : Loader affiché ✅
- [ ] Test 8 : Valeur inattendue → Warning + fallback car ✅

### D.10 Critères de validation Phase 1

**Phase 1 est validée si** :
- ✅ Tous les tests manuels passent
- ✅ Pas de régression sur le comportement voiture existant
- ✅ Switch de rendu fonctionne correctement
- ✅ Gestion erreurs robuste (fallback `'car'` dans tous les cas)
- ✅ Code prêt pour Phase 2 (création `EtatDesLieuxDepartFormMoto`)

---

## 📝 Résumé Phase 1

### Ce qui est fait

1. ✅ Récupération `vehicle_type` centralisée dans `Checking.tsx`
2. ✅ Fonction de normalisation `getVehicleTypeForChecking()`
3. ✅ Switch de rendu préparé (`'car'` → `EtatDesLieuxDepartForm`, `'moto'` → placeholder)
4. ✅ Gestion erreurs robuste (fallback `'car'` dans tous les cas)
5. ✅ Tests manuels définis

### Ce qui n'est PAS fait (Phase 2+)

- ❌ Création `EtatDesLieuxDepartFormMoto` (Phase 2)
- ❌ Composants Step 3, 4, 5, 6 moto (Phase 2)
- ❌ Types & Schémas Zod moto (Phase 2)
- ❌ Compatibilité PDF moto (Phase 3)

### Points d'attention

- **RLS** : Vérifier que `vehicle_type` est accessible (actuellement RLS disabled, pas de problème)
- **Performance** : Deux requêtes séquentielles (acceptable pour Phase 1, optimiser si nécessaire)
- **Fallback** : Toujours `'car'` pour éviter de bloquer l'UI

---

**Fin du document Phase 1**

