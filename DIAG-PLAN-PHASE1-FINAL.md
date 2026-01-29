# 🔍 Phase 1 : Diagnostic & Plan (Version Finale)

**Date** : 2025-01-XX  
**Projet** : Rentanoo Scoot  
**Phase** : 1 (Centralisation détection `vehicle_type` uniquement)  
**Scope** : `Checking.tsx` récupère `vehicle_type` + switch de rendu préparé (placeholder moto)

---

## 📋 Table des matières

1. [Diagnostic factuel (preuves repo)](#1-diagnostic-factuel-preuves-repo)
2. [Proposition (2 options) + Recommandation](#2-proposition-2-options--recommandation)
3. [Plan Phase 1 (étapes)](#3-plan-phase-1-étapes)
4. [Cas d'erreurs & Fallback (table)](#4-cas-derreurs--fallback-table)
5. [Tests manuels + Critères de validation Phase 1](#5-tests-manuels--critères-de-validation-phase-1)

---

## 1) Diagnostic factuel (preuves repo)

### 1.1 Route `/checking/:bookingId`

**Fichier** : `src/App.tsx`  
**Ligne** : 170-174

**Déclaration** :
```typescript
<Route path="/checking/:bookingId" element={
  <Suspense fallback={<PageLoader />}>
    <Checking />
  </Suspense>
} />
```

**Conclusion** : ✅ Route définie avec paramètre `:bookingId` (pas `:checkingId`).

### 1.2 Lecture `bookingId` dans `Checking.tsx`

**Fichier** : `src/pages/Checking.tsx`  
**Ligne** : 10

**Code** :
```typescript
const { bookingId } = useParams<{ bookingId: string }>();
```

**Usage identifié** :
- Ligne 17 : Vérification `if (!bookingId)` → affiche erreur "Aucun identifiant de réservation fourni"
- Ligne 26 : Requête Supabase `.eq("id", bookingId)` (table `bookings`)
- Ligne 73 : Affichage fallback `({bookingId})` si `referenceNumber` null
- Ligne 82 : Prop passée à `EtatDesLieuxDepartForm` : `bookingId={bookingId}`

**Conclusion** : ✅ `bookingId` est bien utilisé comme UUID de la table `bookings.id`.

### 1.3 Requêtes Supabase existantes dans `Checking.tsx`

**Fichier** : `src/pages/Checking.tsx`  
**Lignes** : 15-42

**Requête unique actuelle** :

**Objectif** : Charger `reference_number` pour affichage dans le titre.

**Requête** :
- **Table** : `bookings`
- **Colonnes** : `reference_number` uniquement
- **Condition** : `.eq("id", bookingId)`
- **Méthode** : `.single()` (attend un seul résultat)

**Gestion erreur actuelle** :
- Ligne 29 : `if (error)` → `console.error()` uniquement
- Ligne 31 : `else if (data)` → Stocke `referenceNumber`
- **⚠️ PROBLÈME** : Pas de distinction entre "not found" et autres erreurs
- **⚠️ PROBLÈME** : Pas de state `bookingNotFound`, continue avec `referenceNumber = null`

**État de chargement** :
- State `loadingReference` (ligne 12, initialisé `true`) ← **Phase 1 refactorera ce state en `loadingPage`**
- Passe à `false` dans le `finally` (ligne 37)

**Conclusion** : ✅ Une seule requête actuelle, uniquement pour `reference_number`. Gestion erreur minimale (pas de distinction "not found").

### 1.4 Rendu `EtatDesLieuxDepartForm`

**Fichier** : `src/pages/Checking.tsx`  
**Lignes** : 80-85

**Bloc de rendu** :
```typescript
<ErrorBoundary>
  <EtatDesLieuxDepartForm 
    bookingId={bookingId} 
    bookingReferenceNumber={referenceNumber}
  />
</ErrorBoundary>
```

**Position** : Dans le `<main>` (ligne 64), après le titre (lignes 65-79).

**Wrapper** : `ErrorBoundary` pour capturer les erreurs React.

**Props passées** :
- `bookingId` : string (depuis `useParams()`)
- `bookingReferenceNumber` : number | null (depuis state)

**Conclusion** : ✅ Rendu conditionnel actuel : toujours `EtatDesLieuxDepartForm` (pas de switch).

### 1.5 Utilitaire `vehicleType` existant

**Fichier** : `src/utils/vehicleType.ts`  
**Lignes** : 1-4

**Fonction existante** :
```typescript
export const isMoto = (v: { vehicle_type?: string | null } | null | undefined): boolean => {
  if (!v) return false;
  return v.vehicle_type === 'moto';
};
```

**Comportement exact** :
- **Paramètre** : Objet avec propriété `vehicle_type` optionnelle, ou `null`, ou `undefined`
- **Retour** : `boolean` (`true` si `vehicle_type === 'moto'`, sinon `false`)
- **Gestion null/undefined** : Retourne `false` (pas de crash)

**Limitations identifiées** :
- ❌ Ne gère pas `'scooter'` (doit être traité comme `'moto'` selon contraintes)
- ❌ Retourne `boolean` (pas adapté pour switch qui a besoin de `'car' | 'moto'`)
- ✅ Gère déjà `null` / `undefined` (retourne `false`)

**Usage actuel dans le repo** :
- `src/pages/Index.tsx` ligne 29 : `import { isMoto } from "@/utils/vehicleType"`
- `src/pages/vehicles/MotoVehicleDetails.tsx` ligne 81 : `import { isMoto } from "@/utils/vehicleType"`

**Conclusion** : ✅ Utilitaire existe mais nécessite extension pour Phase 1.

### 1.6 Diagnostic "booking introuvable" — Contradiction actuelle

**Problème identifié** :

**Fetch actuel `reference_number`** (lignes 23-27) :
- Si erreur → Log uniquement, continue avec `referenceNumber = null`
- Pas de distinction "not found" vs autres erreurs
- Pas de state `bookingNotFound`

**Fetch futur `vehicle_type`** (à ajouter) :
- Nécessite `booking.vehicle_id` depuis `bookings`
- Si booking introuvable → Doit afficher UI dédiée "Réservation introuvable"
- Nécessite state `bookingNotFound`

**Contradiction** :
- Le fetch `reference_number` actuel ignore "not found" (continue avec `null`)
- Le fetch `vehicle_type` futur doit détecter "not found" (afficher UI dédiée)
- **Risque** : Deux fetchs avec comportements différents pour le même cas "booking introuvable"

**Conclusion** : ⚠️ **Stratégie incohérente identifiée**. Nécessite unification (voir section 2).

### 1.7 Détection erreurs Supabase dans le repo

**Patterns trouvés** :

**Pattern 1 : `error.code === 'PGRST116'`** (recommandé, robuste) :
- `src/services/supabase/profile.ts` ligne 62 : `if (error.code === 'PGRST116')`
- `src/services/supabaseCheckinReturnService.ts` ligne 65 : `if (draftError && draftError.code !== "PGRST116")`
- `src/services/supabase/conversations.ts` ligne 79 : `if (searchError && searchError.code !== 'PGRST116')`

**Pattern 2 : `error.message.includes(...)`** (moins robuste) :
- `src/components/ErrorBoundary.tsx` ligne 181 : `error?.message?.includes('PGRST116') || error?.message?.includes('not found')`
- `src/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm.tsx` ligne 1814 : `result.error.includes("PGRST116") || result.error.includes("not found")`

**Conclusion** : ✅ Le repo utilise principalement `error.code === 'PGRST116'` pour détecter "not found". Pattern à suivre pour Phase 1.

### 1.8 Routes de navigation dans `App.tsx`

**Fichier** : `src/App.tsx`

**Route "renter bookings" trouvée** :
- **Ligne 105** : `<Route path="/me/renter/bookings" element={<RenterBookings />} />`

**Preuve d'usage** :
- `src/pages/renter/PaymentSuccess.tsx` ligne 42 : `navigate("/me/renter/bookings?afterPayment=1")`
- `src/pages/renter/PaymentSuccess.tsx` ligne 63 : `onClick={() => navigate("/me/renter/bookings")}`
- `src/pages/renter/RenterBookings.tsx` ligne 940 : `navigate("/me/renter/bookings", { replace: true })`

**Route "home" trouvée** :
- **Ligne 73** : `<Route path="/" element={<Index />} />`

**Conclusion** : ✅ Route `/me/renter/bookings` existe et est utilisée. Route `/` existe pour fallback.

### 1.9 RLS (Row Level Security) sur table `vehicles`

**Fichiers de référence trouvés** :
- `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` ligne 467 : `ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;`
- `SCRIPT-ALIGN-RLS-POLICIES.sql` ligne 15 : `ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;`

**Note dans les scripts** :
- `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` ligne 607 : `-- Policies pour vehicles (4 policies) - Note: RLS est DISABLED donc ces policies sont inactives`

**⚠️ IMPORTANT** : Les scripts du repo indiquent que RLS est **DISABLED** sur la table `vehicles`, mais **le statut réel en prod doit être vérifié dans Supabase**. On se base donc sur des tests manuels pour confirmer le comportement.

**Test SQL pour vérifier le statut RLS** :
```sql
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'vehicles' 
AND schemaname = 'public';
```

**Résultat attendu** :
- `rowsecurity = false` → RLS DISABLED ✅
- `rowsecurity = true` → RLS ENABLED ⚠️ (nécessite gestion erreur `PGRST301`)

**Conclusion** : ⚠️ **Statut réel en prod inconnu**. Nécessite vérification manuelle via SQL ou test fonctionnel (voir Test 7 section 5.7).

## 2) Proposition (2 options) + Recommandation

### 2.1 Option A : Un seul fetch booking (recommandée)

**Principe** : Fusionner les deux fetchs en un seul `useEffect` qui récupère `reference_number` + `vehicle_id` en une seule requête.

**Avantages** :
- ✅ **Une seule source de vérité** : Un seul endroit détecte "booking introuvable"
- ✅ **Moins de requêtes** : 1 requête au lieu de 2 (performance)
- ✅ **Cohérence** : Même gestion erreur pour `reference_number` et `vehicle_id`
- ✅ **Simplicité** : Un seul `useEffect` à maintenir

**Inconvénients** :
- ⚠️ Refactoring du fetch `reference_number` existant (mais simple)

**Implémentation** :
- **Requête unique** : `bookings.select("reference_number, vehicle_id").eq("id", bookingId).single()`
- **Si erreur `PGRST116`** : `setBookingNotFound(true)`, ne pas continuer
- **Si succès** : Stocker `reference_number` ET `vehicle_id`, puis fetch `vehicle_type`
- **Un seul `useEffect`** : Gère booking + vehicle_type

**Flow** :
1. Fetch booking (`reference_number` + `vehicle_id`) ← **Un seul fetch pour les deux données**
2. Si booking introuvable (`PGRST116`) → UI dédiée "Réservation introuvable"
3. Si booking existe mais `vehicle_id` null → Fallback `'car'` + warning, afficher form voiture
4. Si booking existe avec `vehicle_id` → Fetch `vehicle_type` depuis `vehicle_id`
5. Normaliser et stocker `vehicleType`

### 2.2 Option B : Deux fetchs séparés mais orchestrés

**Principe** : Garder deux `useEffect` séparés, mais le deuxième vérifie le résultat du premier avant de continuer.

**Avantages** :
- ✅ Pas de refactoring du fetch `reference_number` existant
- ✅ Séparation des responsabilités (booking vs vehicle)

**Inconvénients** :
- ❌ **Deux sources de vérité** : Risque de contradiction si un fetch dit "not found" et l'autre continue
- ❌ **Plus de requêtes** : 2 requêtes séquentielles
- ❌ **Complexité** : Orchestration nécessaire entre les deux `useEffect`
- ❌ **Risque** : Si le premier fetch ignore "not found", le deuxième peut quand même s'exécuter

**Implémentation** :
- **Fetch 1** : `reference_number` (existant, à modifier pour détecter "not found")
- **State** : `bookingNotFound` partagé entre les deux `useEffect`
- **Fetch 2** : `vehicle_type` (nouveau, vérifie `bookingNotFound` avant de s'exécuter)
- **Orchestration** : Si Fetch 1 détecte "not found", Fetch 2 ne s'exécute pas

**Flow** :
1. Fetch booking (`reference_number`)
2. Si erreur `PGRST116` → `setBookingNotFound(true)`, Fetch 2 ne s'exécute pas
3. Si succès → Fetch `vehicle_type` depuis `vehicle_id`
4. Normaliser et stocker `vehicleType`

### 2.3 Recommandation : Option A

**Justification** :
1. **Cohérence** : Une seule source de vérité pour "booking introuvable"
2. **Performance** : Moins de requêtes (1 au lieu de 2)
3. **Maintenabilité** : Un seul `useEffect` à maintenir
4. **Simplicité** : Pas d'orchestration complexe entre fetchs

**Refactoring nécessaire** :
- Modifier le `useEffect` existant (lignes 15-42) pour récupérer `reference_number, vehicle_id`
- Ajouter la logique de détection "not found" avec `error.code === 'PGRST116'`
- Ajouter le fetch `vehicle_type` dans le même `useEffect` (après succès booking)

**Impact** : Minimal (refactoring d'un seul `useEffect`, pas de changement de comportement pour les cas normaux).

---

## 3) Plan Phase 1 (étapes)

### 3.1 Fichiers autorisés à modifier

**Fichier 1** : `src/utils/vehicleType.ts`
- **Action** : Ajouter fonction `getVehicleTypeForChecking()`
- **Raison** : Normalisation centralisée (`null` → `'car'`, `'scooter'` → `'moto'`, etc.)

**Fichier 2** : `src/pages/Checking.tsx`
- **Action** : Refactorer fetch booking + ajouter fetch vehicle_type + switch de rendu + placeholder moto + UI booking introuvable
- **Raison** : Centralisation détection + décision de rendu

**Total** : 2 fichiers à modifier, 0 fichier à créer.

### 3.2 Étapes détaillées

#### **Étape 1 : Ajouter fonction de normalisation**

**Fichier** : `src/utils/vehicleType.ts`

**Action** : Ajouter fonction `getVehicleTypeForChecking()`

**Signature** :
```typescript
export function getVehicleTypeForChecking(
  vehicleType: string | null | undefined
): 'car' | 'moto'
```

**Règles** :
- `null` / `undefined` → `'car'`
- `'car'` → `'car'`
- `'moto'` → `'moto'`
- `'scooter'` → `'moto'`
- Valeur inconnue → `'car'` + `console.warn("[Checking] Valeur inattendue vehicle_type:", rawVehicleType)` où `rawVehicleType` est la valeur brute reçue

**Note** : On peut réutiliser `isMoto()` en interne si besoin, mais la fonction principale retourne `'car' | 'moto'`.

#### **Étape 2 : Ajouter states dans `Checking.tsx`**

**Fichier** : `src/pages/Checking.tsx`

**Position** : Après ligne 12 (remplacer `loadingReference` existant)

**States à ajouter** :
- `vehicleType: 'car' | 'moto' | null` (initialisé `null`)
- `loadingPage: boolean` (initialisé `true`) ← Un seul loader pour booking + vehicle_type
- `bookingNotFound: boolean` (initialisé `false`) ← Pour UI dédiée

**States existants à modifier** :
- `referenceNumber: number | null` (existant, à conserver) ← **Sera alimenté par le fetch booking unifié (même fetch que `vehicle_id`)**
- `loadingReference: boolean` (existant, à supprimer et remplacer par `loadingPage`)

**Justification** :
- `vehicleType` : Stocke le type normalisé
- `loadingPage` : Indique si récupération booking + vehicle_type en cours (un seul loader unifié)
- `bookingNotFound` : Indique si booking n'existe pas (pour UI dédiée)

#### **Étape 3 : Refactorer fetch booking (Option A)**

**Fichier** : `src/pages/Checking.tsx`

**Position** : Modifier le `useEffect` existant (lignes 15-42)

**Action** : Refactorer pour récupérer `reference_number` + `vehicle_id` en une seule requête

**⚠️ IMPORTANT** : Ce fetch unifié remplace le fetch `reference_number` existant. Le state `referenceNumber` sera donc alimenté par ce même fetch unifié (pas un fetch séparé).

**Requête modifiée** :
- **Avant** : `bookings.select("reference_number").eq("id", bookingId).single()`
- **Après** : `bookings.select("reference_number, vehicle_id").eq("id", bookingId).single()`

**Gestion erreur modifiée** :
- **Avant** : `if (error)` → Log uniquement, continue
- **Après** : 
  - Si `error.code === 'PGRST116'` → `setBookingNotFound(true)`, `setLoadingPage(false)`, retour (ne pas continuer)
  - Si autre erreur → Log erreur, fallback `'car'`, `setLoadingPage(false)`, retour
  - Si succès → Vérifier `vehicle_id` :
    - Si `vehicle_id` est `null`/absent → `setVehicleType('car')` + warning `[Checking] vehicle_id NULL, fallback car`, `setLoadingPage(false)`, retour (afficher form voiture)
    - Si `vehicle_id` existe → Stocker `reference_number` ET `vehicle_id`, continuer vers fetch `vehicle_type`

**Stockage** :
- `setReferenceNumber(data.reference_number || null)` ← **Alimenté par le même fetch unifié**
- Stocker `vehicle_id` dans variable locale (pas de state nécessaire)

#### **Étape 4 : Ajouter fetch `vehicle_type` (dans le même `useEffect`)**

**Fichier** : `src/pages/Checking.tsx`

**Position** : Dans le même `useEffect` que l'Étape 3, après succès fetch booking

**Action** : Ajouter fetch `vehicle_type` depuis `vehicle_id`

**Requête** :
- `vehicles.select("vehicle_type").eq("id", vehicle_id).single()`

**Gestion erreur** :
- Si erreur `PGRST301` (permission denied) → Log `[Checking] Erreur permission vehicle: {error}`, fallback `'car'`
- Si autre erreur → Log `[Checking] Erreur récupération vehicle: {error}`, fallback `'car'`
- Si succès → Normaliser via `getVehicleTypeForChecking(vehicle.vehicle_type)`, stocker dans `vehicleType`

**Stockage** :
- `setVehicleType(normalizedType)` où `normalizedType = getVehicleTypeForChecking(vehicle.vehicle_type)`

**Finalisation** :
- `setLoadingPage(false)` dans le `finally` du `useEffect` (garantit que le loader disparaît toujours)

#### **Étape 5 : Créer composant placeholder moto**

**Fichier** : `src/pages/Checking.tsx`

**Position** : Avant le `return` principal (avant ligne 61)

**Composant** : Fonction locale (pas de fichier séparé)

**Props** : `{ bookingId: string }`

**Structure** :
- Message : "État des lieux moto"
- Description : "L'interface d'état des lieux pour les motos et scooters sera disponible prochainement."
- Affichage : `bookingId` (optionnel)
- Style : Card avec contenu centré

**Note** : Composant minimal pour tester le switch, sera remplacé en Phase 2.

#### **Étape 6 : Créer composant UI "Booking introuvable"**

**Fichier** : `src/pages/Checking.tsx`

**Position** : Avant le `return` principal (avant ligne 61)

**Composant** : Fonction locale

**Structure** :
- Titre : "Réservation introuvable"
- Message : "La réservation demandée n'existe pas ou n'est plus disponible."
- Bouton "Retour" : Navigation vers `/me/renter/bookings` (route existante ligne 105 de `App.tsx`)
- Fallback : Si route `/me/renter/bookings` inaccessible, utiliser `navigate(-1)` ou `/`

**Navigation** :
- Utiliser `useNavigate()` depuis `react-router-dom`
- Route principale : `/me/renter/bookings`
- Fallback : `navigate(-1)` (retour navigateur) ou `/` (home)

#### **Étape 7 : Ajouter rendu conditionnel**

**Fichier** : `src/pages/Checking.tsx`

**Position** : Lignes 80-85 (remplacer rendu actuel)

**Logique** :
1. **Si `bookingNotFound === true`** → `<BookingNotFoundUI />`
2. **Sinon si `loadingPage === true`** → Loader "Chargement du type de véhicule..."
3. **Sinon si `vehicleType === 'car'`** → `<EtatDesLieuxDepartForm ... />` (comportement actuel)
4. **Sinon si `vehicleType === 'moto'`** → `<CheckingMotoPlaceholder bookingId={bookingId} />`
5. **Sinon (`vehicleType === null`)** → Fallback `<EtatDesLieuxDepartForm ... />` (sécurité)

**Wrapper** : Garder `ErrorBoundary` autour du rendu conditionnel.

#### **Étape 8 : Ajouter loader "chargement type véhicule"**

**Fichier** : `src/pages/Checking.tsx`

**Position** : Dans le rendu conditionnel (Étape 7)

**Structure** :
- Spinner (composant existant ou div avec animation)
- Texte : "Chargement du type de véhicule..."
- Style : Centré, même hauteur que le form pour éviter saut de layout

**Condition** : Afficher uniquement si `loadingPage === true` ET `bookingNotFound === false`.

### 3.3 Imports nécessaires

**Fichier** : `src/pages/Checking.tsx`

**Imports à ajouter** :
- `getVehicleTypeForChecking` depuis `@/utils/vehicleType`
- `Card, CardContent` depuis `@/components/ui/card` (pour placeholder et UI booking introuvable)
- `Button` depuis `@/components/ui/button` (pour bouton retour)
- `useNavigate` depuis `react-router-dom` (pour navigation retour)

**Imports existants** (à conserver) :
- `useParams` depuis `react-router-dom`
- `useState, useEffect` depuis `react`
- `supabase` depuis `@/integrations/supabase/client`
- `EtatDesLieuxDepartForm` depuis `@/modules/etatDesLieuxDepart/EtatDesLieuxDepartForm`
- `ErrorBoundary` depuis `@/components/ErrorBoundary`
- `Navbar, Footer` depuis `@/components/layout/...`

---

## 4) Cas d'erreurs & Fallback (table)

| Cas | Détection | Action | UI | Log |
|-----|-----------|--------|-----|-----|
| **Booking introuvable** (`PGRST116`) | `error.code === 'PGRST116'` | `setBookingNotFound(true)`, `setLoadingPage(false)`, retour | `<BookingNotFoundUI />` | `console.error("[Checking] Réservation introuvable:", bookingId)` |
| **Booking erreur autre** | Autre erreur Supabase | Fallback `'car'` + `setLoadingPage(false)` | `<EtatDesLieuxDepartForm />` | `console.error("[Checking] Erreur récupération booking:", error)` |
| **`booking.vehicle_id` null** | `booking.vehicle_id === null` ou absent | Fallback `'car'` + warning + `setLoadingPage(false)` | `<EtatDesLieuxDepartForm />` | `console.warn("[Checking] vehicle_id NULL, fallback car")` |
| **Vehicle introuvable** (`PGRST116`) | `error.code === 'PGRST116'` sur `vehicles` | Fallback `'car'` + log + `setLoadingPage(false)` | `<EtatDesLieuxDepartForm />` | `console.error("[Checking] Vehicle introuvable:", error)` |
| **Vehicle permission denied** (`PGRST301`) | `error.code === 'PGRST301'` | Fallback `'car'` + log + `setLoadingPage(false)` | `<EtatDesLieuxDepartForm />` | `console.error("[Checking] Erreur permission vehicle:", error)` |
| **Vehicle erreur autre** | Autre erreur Supabase | Fallback `'car'` + log + `setLoadingPage(false)` | `<EtatDesLieuxDepartForm />` | `console.error("[Checking] Erreur récupération vehicle:", error)` |
| **`vehicle_type` null** | `vehicle.vehicle_type === null` | Normalisation `'car'` + `setLoadingPage(false)` | `<EtatDesLieuxDepartForm />` | Optionnel `console.log("[Checking] vehicle_type NULL, fallback car")` |
| **`vehicle_type` inconnu** | Valeur inattendue (ex: `'truck'`) | Normalisation `'car'` + warning + `setLoadingPage(false)` | `<EtatDesLieuxDepartForm />` | `console.warn("[Checking] Valeur inattendue vehicle_type:", rawVehicleType)` |

**Règle d'or** : **Toujours fallback vers `'car'`** sauf si booking introuvable (UI dédiée).

---

## 5) Tests manuels + Critères de validation Phase 1

### 5.1 Test 1 : `vehicle_type = 'car'` → UI voiture inchangée

**Scénario** :
1. Créer/modifier un véhicule avec `vehicle_type = 'car'`
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`

**Critères de succès** :
- ✅ Page s'affiche normalement (pas de changement visible)
- ✅ `EtatDesLieuxDepartForm` s'affiche (comportement existant)
- ✅ Pas d'erreur console
- ✅ Temps de chargement acceptable (< 2s)

### 5.2 Test 2 : `vehicle_type = 'moto'` → Placeholder moto, pas de crash

**Scénario** :
1. Créer/modifier un véhicule avec `vehicle_type = 'moto'`
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`

**Critères de succès** :
- ✅ Placeholder moto s'affiche (pas `EtatDesLieuxDepartForm`)
- ✅ Message clair "État des lieux moto - Interface bientôt disponible"
- ✅ Pas d'erreur console
- ✅ Pas de crash React

### 5.3 Test 3 : `vehicle_type = 'scooter'` → Placeholder moto

**Scénario** :
1. Créer/modifier un véhicule avec `vehicle_type = 'scooter'`
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`

**Critères de succès** :
- ✅ Placeholder moto s'affiche (traité comme `'moto'`)
- ✅ Pas d'erreur console

### 5.4 Test 4 : `vehicle_type = null` → Fallback car

**Scénario** :
1. Utiliser un véhicule existant avec `vehicle_type = NULL`
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`

**Critères de succès** :
- ✅ `EtatDesLieuxDepartForm` s'affiche (fallback `'car'`)
- ✅ Pas d'erreur console
- ✅ Comportement identique à Test 1

### 5.4b Test 4b : `booking.vehicle_id = null` → Fallback car + warning

**Scénario** :
1. Créer/modifier une réservation avec `vehicle_id = NULL` (ou booking sans véhicule associé)
2. Accéder à `/checking/{bookingId}`

**Critères de succès** :
- ✅ `EtatDesLieuxDepartForm` s'affiche (fallback `'car'`)
- ✅ Warning loggé : `[Checking] vehicle_id NULL, fallback car`
- ✅ Pas d'erreur console (juste warning)
- ✅ Pas de crash

### 5.5 Test 5 : `bookingId` invalide → UI "Réservation introuvable"

**Scénario** :
1. Accéder à `/checking/{bookingId_invalide}` (UUID qui n'existe pas)

**Critères de succès** :
- ✅ UI "Réservation introuvable" s'affiche (pas le form)
- ✅ Message clair "La réservation demandée n'existe pas ou n'est plus disponible."
- ✅ Bouton "Retour" présent et fonctionnel (navigation vers `/me/renter/bookings`)
- ✅ Erreur loggée : `[Checking] Réservation introuvable: {bookingId}`
- ✅ Pas de crash React

### 5.6 Test 6 : Valeur inattendue `vehicle_type` → Warning + fallback car

**Scénario** :
1. Modifier manuellement en DB : `UPDATE vehicles SET vehicle_type = 'truck' WHERE id = '...'`
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`

**Critères de succès** :
- ✅ `EtatDesLieuxDepartForm` s'affiche (fallback `'car'`)
- ✅ Warning loggé : `[Checking] Valeur inattendue vehicle_type: truck` (valeur brute loggée, pas le state `vehicleType`)
- ✅ Pas d'erreur console (juste warning)
- ✅ Pas de crash

### 5.7 Test 7 : Permission denied sur `vehicles` → Fallback car (et log)

**Scénario** :
1. Se connecter avec un compte utilisateur (pas propriétaire)
2. Créer une réservation pour un véhicule d'un autre propriétaire
3. Accéder à `/checking/{bookingId}`
4. Si RLS enabled, requête `vehicles` retournera `PGRST301`

**Critères de succès** :
- ✅ `EtatDesLieuxDepartForm` s'affiche (fallback `'car'`)
- ✅ Erreur loggée : `[Checking] Erreur permission vehicle: {error}`
- ✅ Pas de crash

**Note** : Ce test nécessite que RLS soit enabled sur `vehicles`. Si RLS est disabled (cas probable selon les scripts du repo), le test ne sera pas reproductible ; c'est un garde-fou si RLS est activé plus tard.

### 5.8 Test 8 : Loader : pas de "loader infini"

**Scénario** :
1. Accéder à `/checking/{bookingId}` (véhicule valide)
2. Observer l'affichage pendant le chargement

**Critères de succès** :
- ✅ Loader visible pendant `loadingPage === true`
- ✅ Spinner + texte "Chargement du type de véhicule..."
- ✅ Loader disparaît une fois `vehicleType` déterminé
- ✅ Pas de loader infini : `loadingPage` doit toujours passer à `false` via `finally` + retours contrôlés dans tous les cas (booking introuvable, erreurs, succès)

### 5.9 Checklist finale Phase 1

- [ ] Test 1 : `vehicle_type = 'car'` → UI voiture inchangée ✅
- [ ] Test 2 : `vehicle_type = 'moto'` → Placeholder moto ✅
- [ ] Test 3 : `vehicle_type = 'scooter'` → Placeholder moto ✅
- [ ] Test 4 : `vehicle_type = null` → Fallback car ✅
- [ ] Test 4b : `booking.vehicle_id = null` → Fallback car + warning ✅
- [ ] Test 5 : `bookingId` invalide → UI "Réservation introuvable" ✅
- [ ] Test 6 : Valeur inattendue → Warning + fallback car ✅
- [ ] Test 7 : Permission denied → Fallback car + log ✅
- [ ] Test 8 : Loader affiché puis disparaît ✅

### 5.10 Critères de validation Phase 1

**Phase 1 est validée si** :
- ✅ Tous les tests manuels passent
- ✅ Pas de régression sur le comportement voiture existant
- ✅ Switch de rendu fonctionne correctement
- ✅ UI "Réservation introuvable" s'affiche pour booking invalide
- ✅ Gestion erreurs robuste (fallback `'car'` sauf booking introuvable)
- ✅ Une seule source de vérité pour "booking introuvable" (Option A)
- ✅ Code prêt pour Phase 2 (création `EtatDesLieuxDepartFormMoto`)

---

## 📝 Résumé Phase 1

### Ce qui sera fait en Phase 1 (après validation)

1. ✅ Récupération `vehicle_type` sera centralisée dans `Checking.tsx` (un seul endroit) après validation
2. ✅ Fonction de normalisation `getVehicleTypeForChecking()` sera ajoutée (gère `null`, `'scooter'`, valeurs inattendues) après validation
3. ✅ Switch de rendu sera préparé (`'car'` → `EtatDesLieuxDepartForm`, `'moto'` → placeholder) après validation
4. ✅ UI dédiée "Réservation introuvable" sera ajoutée (pas de fallback vers form) après validation
5. ✅ **Une seule source de vérité** pour "booking introuvable" sera implémentée (Option A : fetch unifié) après validation
6. ✅ Gestion erreurs robuste avec `error.code === 'PGRST116'` sera implémentée (pattern repo) après validation
7. ✅ Navigation "Retour" vers `/me/renter/bookings` sera ajoutée (route existante) après validation
8. ✅ Tests manuels définis (9 tests incluant edge case `vehicle_id` null)
9. ✅ **Un seul loader unifié** (`loadingPage`) sera implémenté pour booking + vehicle_type après validation
10. ✅ **Edge case `booking.vehicle_id` null** sera géré dans le flow (fallback car + warning) après validation

### Ce qui n'est PAS fait (Phase 2+)

- ❌ Création `EtatDesLieuxDepartFormMoto` (Phase 2)
- ❌ Composants Step 3, 4, 5, 6 moto (Phase 2)
- ❌ Types & Schémas Zod moto (Phase 2)

### Points d'attention

- **RLS** : Les scripts du repo indiquent `ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY` (`SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` ligne 467), mais **le statut réel en prod doit être vérifié dans Supabase**. On se base donc sur des tests manuels pour confirmer le comportement (voir section 1.9).
- **Booking introuvable** : UI dédiée (pas de fallback vers form)
- **Performance** : Un seul fetch booking (Option A) au lieu de 2
- **Loader unifié** : Un seul state `loadingPage` sera implémenté (remplace `loadingReference` existant) après validation
- **Fetch booking unifié** : `reference_number` sera récupéré via le même fetch que `vehicle_id` (pas de fetch séparé) après validation

---

**Fin du document Phase 1 (Version Finale)**

