# 🔍 Phase 1 : Diagnostic & Plan (Version Corrigée)

**Date** : 2025-01-XX  
**Projet** : Rentanoo Scoot  
**Phase** : 1 (Centralisation détection `vehicle_type` uniquement)  
**Scope** : `Checking.tsx` récupère `vehicle_type` + switch de rendu préparé (placeholder moto)

---

## A) Diagnostic factuel (avec fichiers + lignes)

### A.1 Route `/checking/:bookingId`

**Fichier** : `src/App.tsx`  
**Ligne** : 170-174

**Définition** :
```typescript
<Route path="/checking/:bookingId" element={
  <Suspense fallback={<PageLoader />}>
    <Checking />
  </Suspense>
} />
```

**Conclusion** : ✅ Route définie avec paramètre `:bookingId` (pas `:checkingId`).

### A.2 Paramètre URL `bookingId` dans `Checking.tsx`

**Fichier** : `src/pages/Checking.tsx`  
**Ligne** : 10

**Récupération** :
```typescript
const { bookingId } = useParams<{ bookingId: string }>();
```

**Usage** :
- Ligne 17 : Vérification `if (!bookingId)` → affiche erreur "Aucun identifiant de réservation fourni"
- Ligne 26 : Requête Supabase `bookings.select("reference_number").eq("id", bookingId)`
- Ligne 73 : Affichage fallback `({bookingId})` si `referenceNumber` null
- Ligne 82 : Prop passée à `EtatDesLieuxDepartForm` : `bookingId={bookingId}`

**Conclusion** : ✅ `bookingId` est bien utilisé comme UUID de la table `bookings.id`.

### A.3 Requêtes Supabase dans `Checking.tsx`

**Fichier** : `src/pages/Checking.tsx`

**Requête unique actuelle** (lignes 15-42) :

**Objectif** : Charger `reference_number` pour affichage dans le titre.

**Requête** :
- **Table** : `bookings`
- **Colonnes** : `reference_number`
- **Condition** : `.eq("id", bookingId)`
- **Méthode** : `.single()` (attend un seul résultat)

**Gestion erreur** :
- Ligne 29 : `console.error("[Checking] Erreur chargement reference_number:", error)`
- Pas de blocage UI si erreur (continue avec `referenceNumber = null`)

**État de chargement** :
- State `loadingReference` (ligne 12, initialisé `true`)
- Passe à `false` dans le `finally` (ligne 37)

**Conclusion** : ✅ Une seule requête actuelle, uniquement pour `reference_number`.

### A.4 Rendu `EtatDesLieuxDepartForm`

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

### A.5 Utilitaire `vehicleType` existant

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

---

## B) Plan Phase 1 (étapes + fichiers à modifier)

### B.1 Fichiers à modifier

**Fichier 1** : `src/utils/vehicleType.ts`
- **Action** : Ajouter fonction `getVehicleTypeForChecking()`
- **Raison** : Normalisation centralisée (`null` → `'car'`, `'scooter'` → `'moto'`, etc.)

**Fichier 2** : `src/pages/Checking.tsx`
- **Action** : Ajouter récupération `vehicle_type` + switch de rendu + placeholder moto
- **Raison** : Centralisation détection + décision de rendu

**Total** : 2 fichiers à modifier, 0 fichier à créer.

### B.2 Étapes ordonnées

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
- Valeur inconnue → `'car'` + `console.warn("[vehicleType] Valeur inattendue:", vehicleType)`

**Note** : On peut réutiliser `isMoto()` en interne si besoin, mais la fonction principale retourne `'car' | 'moto'`.

#### **Étape 2 : Ajouter states dans `Checking.tsx`**

**Fichier** : `src/pages/Checking.tsx`

**Position** : Après ligne 12 (après `loadingReference`)

**States à ajouter** :
- `vehicleType: 'car' | 'moto' | null` (initialisé `null`)
- `loadingVehicleType: boolean` (initialisé `true`)
- `bookingNotFound: boolean` (initialisé `false`) ← Nouveau pour UX booking introuvable

**Justification** :
- `vehicleType` : Stocke le type normalisé
- `loadingVehicleType` : Indique si récupération en cours
- `bookingNotFound` : Indique si booking n'existe pas (pour UI dédiée)

#### **Étape 3 : Ajouter `useEffect` pour récupérer `vehicle_type`**

**Fichier** : `src/pages/Checking.tsx`

**Position** : Après le `useEffect` existant (après ligne 42)

**Logique** :
1. Vérifier `bookingId` existe
2. Requête 1 : `bookings.select("vehicle_id").eq("id", bookingId).single()`
3. **Si erreur `PGRST116` (not found)** :
   - `setBookingNotFound(true)`
   - `setLoadingVehicleType(false)`
   - Retour (ne pas continuer)
4. **Si erreur autre** :
   - Log erreur
   - Fallback `'car'` + `setLoadingVehicleType(false)`
   - Retour
5. **Si succès et `booking.vehicle_id` existe** :
   - Requête 2 : `vehicles.select("vehicle_type").eq("id", booking.vehicle_id).single()`
   - Si erreur → Fallback `'car'` + log erreur
   - Si succès → Normaliser via `getVehicleTypeForChecking(vehicle.vehicle_type)`
   - Stocker dans `vehicleType`
6. `setLoadingVehicleType(false)`

**Dépendances** : `[bookingId]`

#### **Étape 4 : Créer composant placeholder moto**

**Fichier** : `src/pages/Checking.tsx`

**Position** : Avant le `return` principal (avant ligne 61)

**Composant** : Fonction locale (pas de fichier séparé)

**Structure** :
- Props : `{ bookingId: string }`
- Retour : JSX avec message "État des lieux moto - Interface bientôt disponible"
- Style : Card avec contenu centré

**Note** : Composant minimal pour tester le switch, sera remplacé en Phase 2.

#### **Étape 5 : Créer composant UI "Booking introuvable"**

**Fichier** : `src/pages/Checking.tsx`

**Position** : Avant le `return` principal (avant ligne 61)

**Composant** : Fonction locale

**Structure** :
- Message : "Réservation introuvable"
- Description : "La réservation demandée n'existe pas ou n'est plus disponible."
- Action : Bouton "Retour" (navigation vers `/me/renter/bookings` ou `/`)

**Note** : UI dédiée, pas de fallback vers form.

#### **Étape 6 : Ajouter rendu conditionnel**

**Fichier** : `src/pages/Checking.tsx`

**Position** : Lignes 80-85 (remplacer rendu actuel)

**Logique** :
1. **Si `bookingNotFound === true`** → `<BookingNotFoundUI />`
2. **Sinon si `loadingVehicleType === true`** → Loader "Chargement du type de véhicule..."
3. **Sinon si `vehicleType === 'car'`** → `<EtatDesLieuxDepartForm ... />` (comportement actuel)
4. **Sinon si `vehicleType === 'moto'`** → `<CheckingMotoPlaceholder bookingId={bookingId} />`
5. **Sinon (`vehicleType === null`)** → Fallback `<EtatDesLieuxDepartForm ... />` (sécurité)

**Wrapper** : Garder `ErrorBoundary` autour du rendu conditionnel.

#### **Étape 7 : Ajouter loader "chargement type véhicule"**

**Fichier** : `src/pages/Checking.tsx`

**Position** : Dans le rendu conditionnel (Étape 6)

**Structure** :
- Spinner (composant existant ou div avec animation)
- Texte : "Chargement du type de véhicule..."
- Style : Centré, même hauteur que le form pour éviter saut de layout

**Condition** : Afficher uniquement si `loadingVehicleType === true` ET `bookingNotFound === false`.

### B.3 Imports nécessaires

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

## C) Cas booking introuvable (UX + flow)

### C.1 Stratégie UX

**Principe** : Si le booking n'existe pas (`PGRST116` = "not found"), afficher une UI dédiée avec message clair, **pas** de fallback vers le form.

**Raison** : Éviter de laisser l'utilisateur remplir un form pour une réservation inexistante (mauvaise UX, données incohérentes).

### C.2 Détection "booking introuvable"

**Erreur Supabase** : `PGRST116` ("The result contains 0 rows")

**Code d'erreur** : `error.code === 'PGRST116'` ou `error.message.includes('not found')` ou `error.message.includes('0 rows')`

**Stratégie de détection** :
- Vérifier `error.code === 'PGRST116'` OU
- Vérifier `error.message` contient "not found" / "0 rows" / "PGRST116"

### C.3 Flow détaillé

**Scénario** : Requête `bookings.select("vehicle_id").eq("id", bookingId).single()` retourne erreur `PGRST116`.

**Actions** :
1. **Détecter erreur** : Vérifier `error.code === 'PGRST116'` ou message contient "not found"
2. **State** : `setBookingNotFound(true)`
3. **State** : `setLoadingVehicleType(false)` (débloquer rendu)
4. **Log** : `console.error("[Checking] Réservation introuvable:", bookingId)`
5. **Retour** : Ne pas continuer (pas de requête `vehicles`)

**Rendu** :
- Si `bookingNotFound === true` → Afficher `<BookingNotFoundUI />`
- Le composant affiche :
  - Titre : "Réservation introuvable"
  - Message : "La réservation demandée n'existe pas ou n'est plus disponible."
  - Bouton "Retour" → Navigation vers `/me/renter/bookings` (ou `/` si pas authentifié)

### C.4 Cas "vehicle introuvable" (différent de booking introuvable)

**Scénario** : Booking existe mais `vehicle_id` pointe vers un véhicule supprimé/invalide.

**Stratégie** : Fallback `'car'` + log erreur (pas de UI dédiée).

**Raison** : Le booking existe, donc l'utilisateur a le droit d'accéder à la page. Le form gérera l'erreur vehicle (déjà implémenté dans `EtatDesLieuxDepartForm.tsx`).

**Flow** :
1. Requête `vehicles.select("vehicle_type")` retourne erreur
2. Log erreur : `console.error("[Checking] Erreur récupération vehicle:", error)`
3. Fallback : `setVehicleType('car')`
4. Rendu : `<EtatDesLieuxDepartForm />` (le form gérera l'erreur vehicle)

### C.5 Résumé flow

| Cas | Détection | Action | UI |
|-----|-----------|--------|-----|
| Booking introuvable (`PGRST116`) | `error.code === 'PGRST116'` | `setBookingNotFound(true)` | `<BookingNotFoundUI />` |
| Booking erreur autre | Autre erreur | Fallback `'car'` + log | `<EtatDesLieuxDepartForm />` |
| Vehicle introuvable | Erreur requête `vehicles` | Fallback `'car'` + log | `<EtatDesLieuxDepartForm />` |
| Vehicle erreur permission | `PGRST301` | Fallback `'car'` + log | `<EtatDesLieuxDepartForm />` |

---

## D) RLS/permissions : preuves trouvées OU "statut inconnu" + comment tester

### D.1 Preuves trouvées dans le repo

**Fichier** : `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql`  
**Ligne** : 467

**Commande SQL trouvée** :
```sql
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
```

**Contexte** : Script de recréation du schéma complet (lignes 452-467).

**Note dans le script** (ligne 607) :
```sql
-- Policies pour vehicles (4 policies) - Note: RLS est DISABLED donc ces policies sont inactives
```

**Autre référence** : `DIAGNOSTIC-SCHEMA-COMPLET-RENTANOO.md` ligne 724 :
> **Note** : La table `vehicles` a des policies mais RLS est **DISABLED**, donc les policies ne sont pas actives.

### D.2 Statut selon documentation

**Statut selon script/documentation** : RLS **DISABLED** sur table `vehicles`.

**Policies définies mais inactives** :
- `"Anyone can view available vehicles"` (SELECT, `available = true`)
- `"Authenticated users can insert vehicles"` (INSERT)
- `"Owners can delete their vehicles"` (DELETE)
- `"Owners can update their vehicles"` (UPDATE)

### D.3 Vérification nécessaire

**⚠️ IMPORTANT** : Le script `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` est un script de référence, pas forcément appliqué en production.

**Statut réel** : **INCONNU** (nécessite vérification manuelle).

### D.4 Comment tester manuellement

**Test 1 : Vérifier RLS status en DB**

**Requête SQL** (à exécuter dans Supabase SQL Editor) :
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
- `rowsecurity = true` → RLS ENABLED ⚠️

**Test 2 : Tester requête avec utilisateur non-propriétaire**

**Scénario** :
1. Se connecter avec un compte utilisateur (pas propriétaire du véhicule)
2. Accéder à `/checking/{bookingId}` où `booking.vehicle_id` pointe vers un véhicule d'un autre propriétaire
3. Observer le comportement

**Résultats possibles** :
- **Si RLS disabled** : Requête `vehicles.select("vehicle_type")` réussit ✅
- **Si RLS enabled** : Erreur `PGRST301` (permission denied) ⚠️

**Test 3 : Vérifier dans Supabase Dashboard**

**Chemin** : Supabase Dashboard → Authentication → Policies → Table `vehicles`

**Vérifier** :
- RLS status (Enabled / Disabled)
- Policies existantes

### D.5 Comportement si erreur permission denied

**Erreur Supabase** : `PGRST301` ("permission denied") ou `error.message.includes('permission')`

**Stratégie** :
1. **Détecter** : Vérifier `error.code === 'PGRST301'` ou message contient "permission"
2. **Log** : `console.error("[Checking] Erreur permission vehicle:", error)`
3. **Fallback** : `setVehicleType('car')` (comportement sécurisé)
4. **Rendu** : `<EtatDesLieuxDepartForm />` (le form gérera l'erreur si nécessaire)

**Justification** : Si RLS bloque, on ne peut pas déterminer le type. Fallback `'car'` évite de bloquer l'UI.

### D.6 Résumé RLS

| Aspect | Statut | Source |
|--------|--------|--------|
| RLS status selon script | DISABLED | `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` ligne 467 |
| RLS status réel | **INCONNU** | Nécessite test manuel |
| Test recommandé | Vérifier `pg_tables.rowsecurity` | Requête SQL |
| Comportement si `PGRST301` | Fallback `'car'` + log | Stratégie Phase 1 |

---

## E) Tests manuels (checklist)

### E.1 Test 1 : `vehicle_type = 'car'` → UI voiture inchangée

**Scénario** :
1. Créer/modifier un véhicule avec `vehicle_type = 'car'`
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`

**Critères de succès** :
- ✅ Page s'affiche normalement (pas de changement visible)
- ✅ `EtatDesLieuxDepartForm` s'affiche (comportement existant)
- ✅ Pas d'erreur console
- ✅ Temps de chargement acceptable (< 2s)

**Vérifications** :
- Console : Pas d'erreur, pas de warning
- Network : Requêtes `bookings` et `vehicles` réussies
- UI : Formulaire voiture affiché normalement

### E.2 Test 2 : `vehicle_type = 'moto'` → Placeholder moto, pas de crash

**Scénario** :
1. Créer/modifier un véhicule avec `vehicle_type = 'moto'`
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`

**Critères de succès** :
- ✅ Placeholder moto s'affiche (pas `EtatDesLieuxDepartForm`)
- ✅ Message clair "État des lieux moto - Interface bientôt disponible"
- ✅ `bookingId` affiché dans le placeholder
- ✅ Pas d'erreur console
- ✅ Pas de crash React

**Vérifications** :
- Console : Pas d'erreur, log `[Checking] vehicle_type: moto`
- Network : Requêtes réussies
- UI : Placeholder moto visible, pas de formulaire voiture

### E.3 Test 3 : `vehicle_type = 'scooter'` → Placeholder moto

**Scénario** :
1. Créer/modifier un véhicule avec `vehicle_type = 'scooter'`
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`

**Critères de succès** :
- ✅ Placeholder moto s'affiche (traité comme `'moto'`)
- ✅ Pas d'erreur console
- ✅ Pas de crash

**Vérifications** :
- Console : Pas d'erreur, log `[Checking] vehicle_type: scooter → moto`
- UI : Placeholder moto visible

### E.4 Test 4 : `vehicle_type = null` → Fallback car

**Scénario** :
1. Utiliser un véhicule existant avec `vehicle_type = NULL` (ou non défini)
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`

**Critères de succès** :
- ✅ `EtatDesLieuxDepartForm` s'affiche (fallback `'car'`)
- ✅ Pas d'erreur console
- ✅ Comportement identique à Test 1

**Vérifications** :
- Console : Optionnel log `[Checking] vehicle_type NULL, fallback car`
- UI : Formulaire voiture affiché (comportement normal)

### E.5 Test 5 : `bookingId` invalide → UI "Réservation introuvable"

**Scénario** :
1. Accéder à `/checking/{bookingId_invalide}` (UUID qui n'existe pas, ex: `00000000-0000-0000-0000-000000000000`)

**Critères de succès** :
- ✅ UI "Réservation introuvable" s'affiche (pas le form)
- ✅ Message clair "La réservation demandée n'existe pas ou n'est plus disponible."
- ✅ Bouton "Retour" présent et fonctionnel
- ✅ Erreur loggée : `[Checking] Réservation introuvable: {bookingId}`
- ✅ Pas de crash React

**Vérifications** :
- Console : Erreur Supabase `PGRST116` loggée
- Network : Requête `bookings` retourne erreur `PGRST116`
- UI : Composant `<BookingNotFoundUI />` visible, pas de formulaire

### E.6 Test 6 : Permission denied sur `vehicles` → Fallback car (et log)

**Scénario** :
1. Se connecter avec un compte utilisateur (pas propriétaire)
2. Créer une réservation pour un véhicule d'un autre propriétaire
3. Accéder à `/checking/{bookingId}`
4. Si RLS enabled, requête `vehicles` retournera `PGRST301`

**Critères de succès** :
- ✅ `EtatDesLieuxDepartForm` s'affiche (fallback `'car'`)
- ✅ Erreur loggée : `[Checking] Erreur permission vehicle: {error}`
- ✅ Pas de crash

**Vérifications** :
- Console : Erreur `PGRST301` loggée
- Network : Requête `vehicles` retourne erreur permission
- UI : Formulaire voiture affiché (gestion erreur par form enfant)

**Note** : Ce test nécessite que RLS soit enabled sur `vehicles`. Si RLS disabled, ce test ne peut pas être reproduit.

### E.7 Test 7 : Loader : pas de "loader infini"

**Scénario** :
1. Accéder à `/checking/{bookingId}` (véhicule valide)
2. Observer l'affichage pendant le chargement

**Critères de succès** :
- ✅ Loader visible pendant `loadingVehicleType === true`
- ✅ Spinner + texte "Chargement du type de véhicule..."
- ✅ Loader disparaît une fois `vehicleType` déterminé
- ✅ Pas de loader infini (timeout max 5s)

**Vérifications** :
- UI : Loader visible puis disparaît
- Timing : Chargement < 2s (requêtes rapides)
- State : `loadingVehicleType` passe à `false` dans tous les cas (même en erreur)

### E.8 Test 8 : Valeur inattendue `vehicle_type` → Warning + fallback car

**Scénario** :
1. Modifier manuellement en DB : `UPDATE vehicles SET vehicle_type = 'truck' WHERE id = '...'`
2. Créer une réservation pour ce véhicule
3. Accéder à `/checking/{bookingId}`

**Critères de succès** :
- ✅ `EtatDesLieuxDepartForm` s'affiche (fallback `'car'`)
- ✅ Warning loggé : `[vehicleType] Valeur inattendue: truck`
- ✅ Pas d'erreur console (juste warning)
- ✅ Pas de crash

**Vérifications** :
- Console : Warning visible
- UI : Formulaire voiture affiché (comportement sécurisé)

### E.9 Checklist finale Phase 1

- [ ] Test 1 : `vehicle_type = 'car'` → UI voiture inchangée ✅
- [ ] Test 2 : `vehicle_type = 'moto'` → Placeholder moto ✅
- [ ] Test 3 : `vehicle_type = 'scooter'` → Placeholder moto ✅
- [ ] Test 4 : `vehicle_type = null` → Fallback car ✅
- [ ] Test 5 : `bookingId` invalide → UI "Réservation introuvable" ✅
- [ ] Test 6 : Permission denied → Fallback car + log ✅
- [ ] Test 7 : Loader affiché puis disparaît ✅
- [ ] Test 8 : Valeur inattendue → Warning + fallback car ✅

### E.10 Critères de validation Phase 1

**Phase 1 est validée si** :
- ✅ Tous les tests manuels passent
- ✅ Pas de régression sur le comportement voiture existant
- ✅ Switch de rendu fonctionne correctement
- ✅ UI "Réservation introuvable" s'affiche pour booking invalide
- ✅ Gestion erreurs robuste (fallback `'car'` sauf booking introuvable)
- ✅ Code prêt pour Phase 2 (création `EtatDesLieuxDepartFormMoto`)

---

## 📝 Résumé Phase 1

### Ce qui est fait

1. ✅ Récupération `vehicle_type` centralisée dans `Checking.tsx` (un seul endroit)
2. ✅ Fonction de normalisation `getVehicleTypeForChecking()` (gère `null`, `'scooter'`, valeurs inattendues)
3. ✅ Switch de rendu préparé (`'car'` → `EtatDesLieuxDepartForm`, `'moto'` → placeholder)
4. ✅ UI dédiée "Réservation introuvable" (pas de fallback vers form)
5. ✅ Gestion erreurs robuste (fallback `'car'` sauf booking introuvable)
6. ✅ Loader "chargement type véhicule"
7. ✅ Tests manuels définis

### Ce qui n'est PAS fait (Phase 2+)

- ❌ Création `EtatDesLieuxDepartFormMoto` (Phase 2)
- ❌ Composants Step 3, 4, 5, 6 moto (Phase 2)
- ❌ Types & Schémas Zod moto (Phase 2)

### Points d'attention

- **RLS** : Statut réel inconnu (nécessite test manuel), comportement si `PGRST301` défini
- **Booking introuvable** : UI dédiée (pas de fallback vers form)
- **Performance** : Deux requêtes séquentielles (acceptable pour Phase 1)

---

**Fin du document Phase 1 (Version Corrigée)**

