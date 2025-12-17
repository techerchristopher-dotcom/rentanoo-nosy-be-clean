# 🗺️ Roadmap complète : Système de types véhicules (Modal → DB → Listing)

**Date** : 2025-12-17  
**Objectif** : Implémenter un système cohérent de bout en bout pour distinguer voitures et motos, avec la modal comme source de vérité.  
**Contrainte** : Aucune régression sur le flow voiture existant.

---

## A) État des lieux exact (source de vérité)

### A.1) Pipeline complet : Modal → Route → Submit → DB → Listing

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. MODAL DE SÉLECTION (Source de vérité)                       │
│    Fichier: src/components/owner/VehicleTypeModal.tsx          │
│    Handlers:                                                    │
│      - onSelectCar() → navigate("/rent-my-car/register?...")   │
│      - onSelectMoto() → navigate("/me/owner/vehicles/add-moto") │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                                 │
        ▼                                 ▼
┌──────────────────┐          ┌──────────────────────┐
│ 2. ROUTE VOITURE │          │ 2. ROUTE MOTO         │
│ /rent-my-car/    │          │ /me/owner/vehicles/   │
│ register?        │          │ add-moto              │
│ existingOwner=   │          │                       │
│ true             │          │                       │
│                  │          │                       │
│ Fichier:         │          │ Fichier:              │
│ src/pages/owner/ │          │ src/pages/owner/      │
│ RentMyCarRegister│          │ AddMotoPlaceholder.tsx │
│ .tsx             │          │                       │
│                  │          │                       │
│ Handler:         │          │ Handler:              │
│ handleSubmit()   │          │ handleSubmit()         │
│ ligne ~847       │          │ ligne ~302            │
└────────┬─────────┘          └──────────┬────────────┘
         │                               │
         │                               │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │ 3. SERVICE SUPABASE           │
         │ SupabaseVehiclesService       │
         │ .createVehicle()             │
         │                               │
         │ Fichier:                      │
         │ src/services/                 │
         │   supabaseVehiclesService.ts  │
         │                               │
         │ Méthode:                      │
         │ - createVehicle() ligne 165  │
         │ - Insert DB ligne 231-253     │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │ 4. BASE DE DONNÉES             │
         │ public.vehicles                │
         │                               │
         │ Colonnes actuelles:            │
         │ - vehicle_category (TEXT)     │
         │ - vehicle_type (à ajouter)     │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │ 5. LISTING / SEARCH           │
         │                               │
         │ Home:                         │
         │ - Fichier: src/pages/Index.tsx│
         │ - Méthode: loadVehicles()      │
         │   ligne ~121                  │
         │ - Mapping: ligne 698-721      │
         │ - Rendu: ligne ~695           │
         │                               │
         │ Search:                       │
         │ - Même fichier Index.tsx      │
         │ - Méthode: performSearch()    │
         │   ligne ~240                  │
         │ - Utilise:                    │
         │   searchAvailableVehicles()   │
         │   ligne ~416                  │
         └───────────────┬───────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │ 6. COMPOSANTS CARD             │
         │                               │
         │ Voiture (existant):           │
         │ - Fichier:                     │
         │   src/components/vehicles/    │
         │     vehicle-card.tsx          │
         │ - Props: Vehicle, primaryPhoto│
         │ - Statut: NE PAS TOUCHER      │
         │                               │
         │ Moto (à créer):                │
         │ - Fichier:                     │
         │   src/components/vehicles/    │
         │     moto-vehicle-card.tsx      │
         │ - Props: Vehicle, primaryPhoto │
         │ - Statut: NOUVEAU              │
         └───────────────────────────────┘
```

### A.2) Liste des fichiers et leur rôle

| Fichier | Rôle | Lignes clés | Statut |
|---------|------|-------------|--------|
| **Modal** | | | |
| `src/components/owner/VehicleTypeModal.tsx` | Modal de sélection type | 20-95 | ✅ Existant, ne pas modifier |
| **Routes** | | | |
| `src/pages/owner/OwnerVehicles.tsx` | Handlers navigation modal | 170-180 | ✅ Existant, ne pas modifier |
| `src/App.tsx` | Définition routes | 80-81 | ✅ Existant, ne pas modifier |
| **Formulaires** | | | |
| `src/pages/owner/RentMyCarRegister.tsx` | Formulaire voiture | 847 (submit) | ✅ Existant, optionnel à modifier |
| `src/pages/owner/AddMotoPlaceholder.tsx` | Formulaire moto | 302 (submit) | ✅ Existant, **À MODIFIER** |
| **Service** | | | |
| `src/services/supabaseVehiclesService.ts` | Service DB véhicules | 165-265 | ✅ Existant, **À MODIFIER** |
| **Listing** | | | |
| `src/pages/Index.tsx` | Home + Search | 121, 240, 695-721 | ✅ Existant, **À MODIFIER** |
| **Composants** | | | |
| `src/components/vehicles/vehicle-card.tsx` | Card voiture | 64-253 | ✅ Existant, **NE PAS TOUCHER** |
| `src/components/vehicles/moto-vehicle-card.tsx` | Card moto | - | ❌ **À CRÉER** |
| **Types** | | | |
| `src/types/index.ts` | Interface Vehicle | 92-162 | ✅ Existant, **À MODIFIER** |
| `src/services/supabaseVehiclesService.ts` | Interface Vehicle (DB) | 3-86 | ✅ Existant, **À MODIFIER** |
| **Utils** | | | |
| `src/utils/vehicle-type-detector.ts` | Helper isMoto() | - | ❌ **À CRÉER** |

### A.3) Points d'entrée confirmés

**Modal** :
- ✅ Fichier : `src/components/owner/VehicleTypeModal.tsx`
- ✅ Handler Voiture : `onSelectCar` (ligne 50) → `navigate("/rent-my-car/register?existingOwner=true")`
- ✅ Handler Moto : `onSelectMoto` (ligne 67) → `navigate("/me/owner/vehicles/add-moto")`

**Submit Moto** :
- ✅ Fichier : `src/pages/owner/AddMotoPlaceholder.tsx`
- ✅ Ligne 302 : Appel à `SupabaseVehiclesService.createVehicle()`
- ✅ Payload actuel : N'inclut **pas** `vehicle_type` (à ajouter)

**Submit Voiture** :
- ✅ Fichier : `src/pages/owner/RentMyCarRegister.tsx`
- ✅ Ligne 847 : Appel à `SupabaseVehiclesService.createVehicle()`
- ✅ Payload actuel : N'inclut **pas** `vehicle_type` (optionnel à ajouter)

**Service** :
- ✅ Fichier : `src/services/supabaseVehiclesService.ts`
- ✅ Méthode : `createVehicle()` (ligne 165)
- ✅ Insert DB : Ligne 231-253 (mapping vers colonnes DB)

**Listing** :
- ✅ Home : `src/pages/Index.tsx` ligne ~695 (rendu cards)
- ✅ Search : Même fichier, utilise `searchAvailableVehicles()` (ligne 416)
- ✅ Mapping actuel : Ligne 698-721 (hardcodé pour voiture)

---

## B) DB Roadmap (Option A) — SQL complet, ordre et rollback

### B.1) Migration Phase 1 (Safe)

**Objectif** : Ajouter `vehicle_type` sans casser l'existant.

**SQL Phase 1** :
```sql
-- ============================================
-- Migration: Ajout colonne vehicle_type
-- Date: 2025-12-17
-- Description: Distinction car vs moto
-- ============================================

-- Étape 1: Ajouter la colonne (NULLABLE par défaut)
ALTER TABLE public.vehicles 
ADD COLUMN vehicle_type TEXT NULL;

-- Étape 2: Ajouter contrainte CHECK (optionnel mais recommandé)
-- Permet seulement 'car', 'moto', 'scooter' ou NULL
ALTER TABLE public.vehicles 
ADD CONSTRAINT check_vehicle_type 
CHECK (
  vehicle_type IS NULL 
  OR vehicle_type IN ('car', 'moto', 'scooter')
);

-- Étape 3: Commentaire pour documentation
COMMENT ON COLUMN public.vehicles.vehicle_type IS 
  'Type de véhicule: car (voiture), moto, scooter. NULL = voiture par défaut (backward compat)';

-- Étape 4: Index pour performance (optionnel mais recommandé)
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_type 
ON public.vehicles(vehicle_type) 
WHERE vehicle_type IS NOT NULL;
```

**Justification du default `NULL`** :
- ✅ **Backward compatible** : Voitures existantes restent `NULL` (traitées comme 'car' par défaut)
- ✅ **Pas de migration de données** : Pas besoin de backfill immédiat pour les voitures
- ✅ **Sécurité** : Pas de risque de casser les données existantes
- ✅ **Flexibilité** : Permet de gérer les cas edge (véhicules créés avant la migration)

**Justification de la contrainte CHECK maintenant** :
- ✅ **Intégrité données** : Empêche les valeurs invalides dès le départ
- ✅ **Performance** : Index peut être créé immédiatement
- ✅ **Clarté** : Documente explicitement les valeurs acceptées

### B.2) Backfill moto(s) existante(s)

**Stratégie d'identification** :
- **Heuristique stable** : `seats <= 2` ET `engine_capacity IS NOT NULL`
- **Alternative** : Liste ciblée par `id` si on connaît les motos existantes

**SQL Backfill** :
```sql
-- ============================================
-- Backfill: Identifier et marquer les motos existantes
-- ============================================

-- Option 1: Heuristique (recommandée)
UPDATE public.vehicles
SET vehicle_type = 'moto'
WHERE seats <= 2 
  AND engine_capacity IS NOT NULL 
  AND vehicle_type IS NULL;

-- Option 2: Liste ciblée (si on connaît les IDs)
-- UPDATE public.vehicles
-- SET vehicle_type = 'moto'
-- WHERE id IN (
--   '236a9582-0729-45f1-ae93-f6f33130ffab', -- Exemple
--   -- ... autres IDs de motos connues
-- )
-- AND vehicle_type IS NULL;
```

**Requête de contrôle** :
```sql
-- Vérifier le backfill
SELECT 
  id,
  brand,
  model,
  seats,
  engine_capacity,
  vehicle_type,
  CASE 
    WHEN vehicle_type IS NULL THEN 'Non défini (sera traité comme car)'
    WHEN vehicle_type = 'moto' THEN '✅ Moto'
    WHEN vehicle_type = 'car' THEN '✅ Voiture'
    ELSE '⚠️ Valeur inattendue'
  END AS status
FROM public.vehicles
ORDER BY created_at DESC;

-- Statistiques
SELECT 
  vehicle_type,
  COUNT(*) as count
FROM public.vehicles
GROUP BY vehicle_type
ORDER BY vehicle_type NULLS LAST;
```

### B.3) Phase 2 optionnelle (plus tard)

**Objectif** : Rendre `vehicle_type` obligatoire une fois que tous les véhicules sont typés.

**SQL Phase 2** (à exécuter plus tard, quand tout est stable) :
```sql
-- ============================================
-- Phase 2: Rendre vehicle_type NOT NULL
-- ⚠️ À exécuter seulement quand tous les véhicules sont typés
-- ============================================

-- Étape 1: S'assurer que tous les véhicules ont un type
-- (Backfill les NULL restants comme 'car')
UPDATE public.vehicles
SET vehicle_type = 'car'
WHERE vehicle_type IS NULL;

-- Étape 2: Vérifier qu'il n'y a plus de NULL
SELECT COUNT(*) as null_count
FROM public.vehicles
WHERE vehicle_type IS NULL;
-- Doit retourner 0

-- Étape 3: Modifier la colonne pour NOT NULL
ALTER TABLE public.vehicles
ALTER COLUMN vehicle_type SET NOT NULL;

-- Étape 4: Ajouter une valeur par défaut (optionnel)
ALTER TABLE public.vehicles
ALTER COLUMN vehicle_type SET DEFAULT 'car';
```

**⚠️ Risque Phase 2** :
- Si des véhicules restent `NULL`, la migration échouera
- Nécessite un audit complet avant exécution

### B.4) Rollback plan

**SQL Rollback** (en cas de problème) :
```sql
-- ============================================
-- Rollback: Supprimer vehicle_type
-- ⚠️ À utiliser seulement en cas de problème critique
-- ============================================

-- Étape 1: Supprimer l'index
DROP INDEX IF EXISTS public.idx_vehicles_vehicle_type;

-- Étape 2: Supprimer la contrainte CHECK
ALTER TABLE public.vehicles
DROP CONSTRAINT IF EXISTS check_vehicle_type;

-- Étape 3: Supprimer la colonne
ALTER TABLE public.vehicles
DROP COLUMN IF EXISTS vehicle_type;

-- Vérification
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'vehicles'
  AND column_name = 'vehicle_type';
-- Doit retourner 0 lignes
```

**⚠️ Impact du rollback** :
- Les données `vehicle_type` seront perdues
- Le code front devra être adapté pour gérer l'absence de la colonne
- Recommandation : Tester en staging avant production

---

## C) Propagation type depuis la modal (modal → route → submit → DB)

### C.1) Stratégie d'injection du type

**Principe** : Injecter `vehicle_type` **uniquement au moment du submit**, pas dans la route ni dans le state du formulaire.

**Pourquoi cette approche** :
- ✅ **Simplicité** : Pas besoin de passer le type via query params ou state
- ✅ **Sécurité** : Le type est déterminé par la route utilisée (modal → route → submit)
- ✅ **Isolation** : Le formulaire moto sait qu'il crée une moto (route dédiée)

**Flow détaillé** :

1. **Modal** : Utilisateur clique "Moto / Scooter"
   - Handler `onSelectMoto()` → `navigate("/me/owner/vehicles/add-moto")`
   - **Pas de transmission du type** (la route est la source de vérité)

2. **Formulaire Moto** : `AddMotoPlaceholder.tsx`
   - Route `/me/owner/vehicles/add-moto` → Composant sait qu'il crée une moto
   - Au submit (ligne 302) : Ajouter `vehicle_type: 'moto'` dans le payload

3. **Service** : `SupabaseVehiclesService.createVehicle()`
   - Accepter `vehicle_type` dans l'interface (ligne 165)
   - Mapper vers la colonne DB (ligne 246)

4. **DB** : Insert avec `vehicle_type = 'moto'`

**Pour la voiture** :
- Route `/rent-my-car/register?existingOwner=true` → Composant sait qu'il crée une voiture
- Au submit (ligne 847) : **Optionnel** d'ajouter `vehicle_type: 'car'`
- Si non ajouté : DB default `NULL` → Traité comme 'car' dans le listing (fallback)

### C.2) Types TypeScript / DTO

**Fichiers à modifier** :

1. **Service interface** : `src/services/supabaseVehiclesService.ts`
   - Ligne 165 : Interface `createVehicle`
   - Ajouter : `vehicle_type?: 'car' | 'moto' | 'scooter';`
   - Ligne 246 : Mapping vers DB
   - Ajouter : `vehicle_type: vehicleData.vehicle_type ?? null,`

2. **Type DB** : `src/services/supabaseVehiclesService.ts`
   - Ligne 3-86 : Interface `Vehicle` (DB)
   - Ajouter : `vehicle_type: string | null;`

3. **Type Front** : `src/types/index.ts`
   - Ligne 92-162 : Interface `Vehicle` (Front)
   - **Optionnel** : Ajouter `vehicleType?: 'car' | 'moto' | 'scooter';` (si besoin dans le front)

**Stratégie pour éviter les erreurs TS** :
- ✅ Utiliser `vehicle_type?:` (optionnel) pour backward compatibility
- ✅ Utiliser `?? null` dans le mapping pour gérer les `undefined`
- ✅ Type union `'car' | 'moto' | 'scooter'` pour type safety

### C.3) Compatibilité backward

**Gestion des véhicules existants** :

**Dans le listing** (`Index.tsx`) :
```typescript
// Helper de détection
function isMoto(vehicle: SupabaseVehicle): boolean {
  return vehicle.vehicle_type === 'moto' || vehicle.vehicle_type === 'scooter';
}

// Fallback : Si vehicle_type est NULL → traiter comme car
// (comportement par défaut, pas de changement pour voitures existantes)
```

**Stratégie** :
- ✅ `vehicle_type = NULL` → Traité comme 'car' (fallback)
- ✅ `vehicle_type = 'car'` → Traité comme 'car'
- ✅ `vehicle_type = 'moto'` → Traité comme 'moto'
- ✅ Pas de migration de données nécessaire pour les voitures existantes

---

## D) Listing & Search — rendu adaptatif sans casser voiture

### D.1) Détection du type

**Helper de détection** :

**Fichier à créer** : `src/utils/vehicle-type-detector.ts`

```typescript
import { Vehicle as SupabaseVehicle } from '@/services/supabaseVehiclesService';

/**
 * Détermine si un véhicule est une moto/scooter
 * 
 * Règles :
 * 1. Si vehicle_type = 'moto' ou 'scooter' → Moto
 * 2. Sinon (NULL, 'car', ou autre) → Voiture
 */
export function isMoto(vehicle: SupabaseVehicle): boolean {
  const type = vehicle.vehicle_type;
  return type === 'moto' || type === 'scooter';
}
```

**Fallback** :
- Si `vehicle_type` est `NULL` → `isMoto()` retourne `false` → Traité comme voiture
- Garantit que les voitures existantes continuent de fonctionner

### D.2) Architecture UI

**Composants** :

1. **`VehicleCard`** (existant) :
   - Fichier : `src/components/vehicles/vehicle-card.tsx`
   - Usage : **Uniquement pour voitures**
   - Statut : **NE PAS TOUCHER** (aucune modification)

2. **`MotoVehicleCard`** (nouveau) :
   - Fichier : `src/components/vehicles/moto-vehicle-card.tsx`
   - Usage : **Uniquement pour motos**
   - Props : Identiques à `VehicleCard` (`vehicle`, `primaryPhoto`, `onClick`, etc.)
   - Structure : Similaire mais avec champs adaptés

**Placement** :
- Dossier : `src/components/vehicles/`
- Nom : `moto-vehicle-card.tsx`
- Export : `export function MotoVehicleCard({ ... })`

### D.3) Mapping séparé

**Fichier** : `src/pages/Index.tsx`

**Fonctions à créer** :

1. **`mapToCarVehicle()`** :
   - **Objectif** : Isoler le mapping existant (ligne 698-721)
   - **Contenu** : Code actuel **exactement identique** (hardcodes préservés)
   - **Garantie** : Comportement voiture inchangé

2. **`mapToMotoVehicle()`** :
   - **Objectif** : Mapping adapté pour moto
   - **Contenu** :
     - `hasAC: false` (toujours false pour moto)
     - `doors: 0` (ne sera pas affiché)
     - `color: vehicle.color || "Non spécifié"` (utiliser DB)
     - `mileage: vehicle.mileage || 0` (utiliser DB)
     - `location: vehicle.pickup_zones?.join(', ') || "Nosy Be, Madagascar"` (fallback adapté)
     - `seats: vehicle.seats || 2` (pour affichage "places")
     - `engineCapacity: vehicle.engine_capacity` (pour affichage cylindrée)

**Rendu conditionnel** :
```typescript
// Ligne ~695 dans Index.tsx
{filteredVehicles.map((vehicle) => {
  return isMoto(vehicle) ? (
    <MotoVehicleCard
      key={vehicle.id}
      vehicle={mapToMotoVehicle(vehicle)}
      primaryPhoto={photos[vehicle.id] ?? null}
      onClick={() => handleVehicleClick(vehicle)}
    />
  ) : (
    <VehicleCard
      key={vehicle.id}
      vehicle={mapToCarVehicle(vehicle)}
      primaryPhoto={photos[vehicle.id] ?? null}
      onClick={() => handleVehicleClick(vehicle)}
    />
  );
})}
```

### D.4) Champs moto à afficher (MVP)

| Élément | Source DB | Affichage | Code |
|---------|-----------|-----------|------|
| **Photo principale** | `vehicle_photos` (via `PhotoService.getPrimaryPhotosForVehicles()`) | Image cover | `primaryPhoto?.url` |
| **Code véhicule** | `id` (8 premiers) | Badge en haut à gauche | `vehicle.license` |
| **Marque + Modèle** | `brand`, `model` | Titre | `{vehicle.brand} {vehicle.model}` |
| **Année** | `year` | Sous-titre | `{vehicle.year}` |
| **Couleur** | `color` | Sous-titre | `{vehicle.color \|\| "Non spécifié"}` |
| **Places** | `seats` | Badge "X place(s)" | `{vehicle.seats} place(s)` |
| **Cylindrée** | `engine_capacity` | Badge "XXX cc" (si dispo) | `{vehicle.engineCapacity} cc` |
| **Carburant** | `fuel_type` | Badge "Essence" | `{fuelLabels[vehicle.fuel]}` |
| **Transmission** | `transmission` | Badge "Manuelle/Automatique" | `{transmissionLabels[vehicle.transmission]}` |
| **Localisation** | `pickup_zones` | Zones ou fallback | `{vehicle.location}` (fallback "Nosy Be, Madagascar") |
| **Prix/jour** | `price_per_day` | Prix en bas | `{vehicle.dailyPrice}€/jour` |

### D.5) Champs à masquer pour moto

| Élément | Raison |
|---------|--------|
| **Badge "Clim"** | Les motos n'ont pas de climatisation |
| **"X portes"** | Les motos n'ont pas de portes |

### D.6) Search page

**Confirmation** :
- ✅ **Même pipeline** : La recherche utilise `searchAvailableVehicles()` dans `Index.tsx`
- ✅ **Même fichier** : `Index.tsx` gère à la fois home et search
- ✅ **Même rendu** : Les résultats de recherche utilisent le même mapping conditionnel

**Action requise** :
- ✅ **Aucune modification supplémentaire** : Le branching conditionnel dans le rendu s'applique automatiquement à la recherche

---

## E) Roadmap complète "par étapes" (sans oubli)

### Étape 1 : Migration DB Phase 1 + Vérifications

**Objectifs** :
- Ajouter la colonne `vehicle_type` à la table `vehicles`
- Ajouter la contrainte CHECK
- Créer l'index pour performance
- Vérifier que la migration s'est bien passée

**Fichiers/DB touchés** :
- Base de données : `public.vehicles`

**Actions** :
1. Exécuter le SQL Phase 1 (section B.1)
2. Exécuter le backfill pour moto existante (section B.2)
3. Exécuter les requêtes de contrôle (section B.2)

**Risques** :
- ⚠️ **Migration échoue** : Vérifier les permissions DB
- ⚠️ **Contrainte CHECK bloque** : Vérifier qu'aucune valeur invalide n'existe

**Critères de validation** :
- [ ] Colonne `vehicle_type` existe dans `information_schema.columns`
- [ ] Contrainte `check_vehicle_type` existe
- [ ] Index `idx_vehicles_vehicle_type` existe
- [ ] Moto existante a `vehicle_type = 'moto'`
- [ ] Voitures existantes ont `vehicle_type = NULL` (ou 'car' si backfill)

---

### Étape 2 : Ajout `vehicle_type='moto'` dans submit moto + Vérifications DB

**Objectifs** :
- Modifier `AddMotoPlaceholder.tsx` pour écrire `vehicle_type='moto'` au submit
- Vérifier en DB que la valeur est bien écrite

**Fichiers touchés** :
- `src/pages/owner/AddMotoPlaceholder.tsx` (ligne 302)

**Actions** :
1. Ajouter `vehicle_type: 'moto'` dans le payload `createVehicle()`
2. Tester la création d'une moto
3. Vérifier en DB que `vehicle_type = 'moto'`

**Risques** :
- ⚠️ **Erreur TypeScript** : `vehicle_type` n'existe pas encore dans l'interface
- ⚠️ **Erreur DB** : Colonne n'existe pas (si étape 1 non faite)

**Critères de validation** :
- [ ] Code compile sans erreur TypeScript
- [ ] Création moto réussit
- [ ] En DB : `SELECT vehicle_type FROM vehicles WHERE id = '<nouvelle_moto>'` retourne `'moto'`

---

### Étape 3 : Mise à jour types + services (createVehicle) + Vérifications compile

**Objectifs** :
- Ajouter `vehicle_type` à l'interface `createVehicle` dans le service
- Ajouter le mapping vers la colonne DB
- Ajouter `vehicle_type` à l'interface `Vehicle` (DB)
- Vérifier que tout compile

**Fichiers touchés** :
- `src/services/supabaseVehiclesService.ts` :
  - Interface `createVehicle` (ligne 165)
  - Mapping DB (ligne 246)
  - Interface `Vehicle` (DB) (ligne 3-86)

**Actions** :
1. Ajouter `vehicle_type?: 'car' | 'moto' | 'scooter';` à l'interface `createVehicle`
2. Ajouter `vehicle_type: vehicleData.vehicle_type ?? null,` dans le mapping DB
3. Ajouter `vehicle_type: string | null;` à l'interface `Vehicle` (DB)
4. Compiler et vérifier qu'il n'y a pas d'erreurs

**Risques** :
- ⚠️ **Erreur TypeScript** : Types incompatibles
- ⚠️ **Erreur runtime** : Mapping incorrect

**Critères de validation** :
- [ ] `npm run build` ou `tsc --noEmit` passe sans erreur
- [ ] Aucune erreur TypeScript dans l'IDE
- [ ] Le service accepte `vehicle_type` dans `createVehicle()`

---

### Étape 4 : Listing home adaptatif (moto card) + Vérifications visuelles

**Objectifs** :
- Créer le helper `isMoto()`
- Créer `MotoVehicleCard`
- Créer `mapToCarVehicle()` et `mapToMotoVehicle()`
- Modifier le rendu conditionnel dans `Index.tsx`
- Vérifier visuellement que ça fonctionne

**Fichiers touchés** :
- `src/utils/vehicle-type-detector.ts` (créer)
- `src/components/vehicles/moto-vehicle-card.tsx` (créer)
- `src/pages/Index.tsx` (modifier)
- `src/types/index.ts` (ajouter `seats`, `engineCapacity`)

**Actions** :
1. Créer `src/utils/vehicle-type-detector.ts` avec `isMoto()`
2. Créer `src/components/vehicles/moto-vehicle-card.tsx`
3. Ajouter `seats` et `engineCapacity` à l'interface `Vehicle` dans `types/index.ts`
4. Créer `mapToCarVehicle()` dans `Index.tsx` (isoler code existant ligne 698-721)
5. Créer `mapToMotoVehicle()` dans `Index.tsx` (nouveau mapping)
6. Modifier le rendu conditionnel (ligne ~695)
7. Tester visuellement

**Risques** :
- ⚠️ **Régression voiture** : Si `mapToCarVehicle()` ne correspond pas exactement au code existant
- ⚠️ **Erreur TypeScript** : `seats` ou `engineCapacity` manquants dans l'interface
- ⚠️ **Erreur runtime** : `isMoto()` retourne un mauvais résultat

**Critères de validation** :
- [ ] Code compile sans erreur
- [ ] Home page : Voiture affiche card voiture (identique à avant)
- [ ] Home page : Moto affiche card moto (nouveau layout)
- [ ] Card moto : Pas de badge "Clim"
- [ ] Card moto : Affiche "X places" (pas "X portes")
- [ ] Card moto : Affiche cylindrée si disponible
- [ ] Card moto : Fallback localisation "Nosy Be, Madagascar"

---

### Étape 5 : Search adaptatif (si différent) + Vérifications

**Objectifs** :
- Vérifier que la recherche utilise le même pipeline
- Confirmer que le branching conditionnel s'applique automatiquement

**Fichiers touchés** :
- Aucun (si même pipeline que home)

**Actions** :
1. Vérifier que `searchAvailableVehicles()` retourne les mêmes données que `getAvailableVehicles()`
2. Vérifier que le rendu des résultats de recherche utilise le même mapping conditionnel
3. Tester visuellement la recherche

**Risques** :
- ⚠️ **Pipeline différent** : Si la recherche utilise un autre composant de card

**Critères de validation** :
- [ ] Recherche : Voiture affiche card voiture
- [ ] Recherche : Moto affiche card moto
- [ ] Comportement identique à la home page

---

### Étape 6 : QA / Non-régression voiture (Checklist)

**Objectifs** :
- Vérifier que rien n'a cassé pour les voitures
- Tester tous les flows voiture existants

**Fichiers touchés** :
- Aucun (tests uniquement)

**Actions** :
1. Créer une voiture via modal → formulaire voiture
2. Vérifier en DB : `vehicle_type = 'car'` ou `NULL`
3. Vérifier sur listing : Card voiture identique à avant
4. Vérifier sur search : Card voiture identique à avant
5. Vérifier que les photos cover fonctionnent
6. Vérifier qu'aucune erreur console n'apparaît

**Risques** :
- ⚠️ **Régression** : Si `mapToCarVehicle()` ne correspond pas exactement au code existant

**Critères de validation** :
- [ ] Création voiture : Fonctionne comme avant
- [ ] Listing voiture : Affichage identique à avant
- [ ] Search voiture : Affichage identique à avant
- [ ] Photos cover voiture : Fonctionnent
- [ ] Aucune erreur console

---

### Étape 7 : Phase 2 optionnelle (NOT NULL / constraint) — Planifiée uniquement

**Objectifs** :
- Planifier (mais ne pas exécuter) la Phase 2
- Documenter les prérequis

**Fichiers/DB touchés** :
- Base de données : `public.vehicles` (colonne `vehicle_type`)

**Actions** :
1. **Ne pas exécuter** pour l'instant
2. Documenter les prérequis :
   - Tous les véhicules existants doivent avoir un `vehicle_type`
   - Tous les nouveaux véhicules doivent avoir un `vehicle_type` (via code)
   - Audit complet de la DB

**Risques** :
- ⚠️ **Migration échoue** : Si des véhicules restent `NULL`
- ⚠️ **Downtime** : Migration peut bloquer les inserts

**Critères de validation** (pour plus tard) :
- [ ] Audit DB : 0 véhicules avec `vehicle_type = NULL`
- [ ] Code : Tous les `createVehicle()` incluent `vehicle_type`
- [ ] Test : Migration Phase 2 réussit en staging

---

## F) Checklist de validation finale (obligatoire)

### Test 1 : Créer voiture → Listing identique à avant

- [ ] Ouvrir modal "Ajouter un véhicule"
- [ ] Sélectionner "Voiture"
- [ ] Remplir formulaire voiture
- [ ] Submit
- [ ] Vérifier en DB : `SELECT vehicle_type FROM vehicles WHERE id = '<nouvelle_voiture>'` → `'car'` ou `NULL`
- [ ] Ouvrir page listing home
- [ ] Vérifier : Card voiture affiche "Clim" ✅
- [ ] Vérifier : Card voiture affiche "X portes" ✅
- [ ] Vérifier : Card voiture affiche localisation "Mayotte" (ou zones) ✅
- [ ] Vérifier : Affichage **identique** à avant ✅

### Test 2 : Créer moto via modal → DB `vehicle_type='moto'`

- [ ] Ouvrir modal "Ajouter un véhicule"
- [ ] Sélectionner "Moto / Scooter"
- [ ] Remplir formulaire moto
- [ ] Submit
- [ ] Vérifier en DB : `SELECT vehicle_type FROM vehicles WHERE id = '<nouvelle_moto>'` → `'moto'` ✅
- [ ] Vérifier : Pas d'erreur console ✅

### Test 3 : Listing home → Moto affiche bon layout, voiture inchangée

- [ ] Avoir au moins 1 voiture et 1 moto dans la DB
- [ ] Ouvrir page listing home
- [ ] Vérifier : Voiture affiche card voiture (Clim, portes) ✅
- [ ] Vérifier : Moto affiche card moto (pas Clim, pas portes) ✅
- [ ] Vérifier : Moto affiche "X places" ✅
- [ ] Vérifier : Moto affiche cylindrée si disponible ✅
- [ ] Vérifier : Moto affiche localisation "Nosy Be, Madagascar" (ou zones) ✅

### Test 4 : Search → Idem

- [ ] Avoir au moins 1 voiture et 1 moto dans la DB
- [ ] Ouvrir page listing home
- [ ] Utiliser la recherche (filtres ou texte)
- [ ] Vérifier : Résultats voiture affichent card voiture ✅
- [ ] Vérifier : Résultats moto affichent card moto ✅
- [ ] Vérifier : Comportement identique à home ✅

### Test 5 : Photos cover → Principale s'affiche sur card

- [ ] Avoir une moto avec photo principale
- [ ] Ouvrir page listing home
- [ ] Vérifier : Card moto affiche la photo principale ✅
- [ ] Avoir une voiture avec photo principale
- [ ] Vérifier : Card voiture affiche la photo principale ✅

### Test 6 : Aucune erreur console / Supabase query

- [ ] Ouvrir console navigateur (F12)
- [ ] Ouvrir page listing home
- [ ] Vérifier : Aucune erreur console ✅
- [ ] Vérifier : Requêtes Supabase réussissent (Network tab) ✅
- [ ] Vérifier : Pas d'erreur 404 pour les photos ✅

---

## G) Risques + Points d'attention

### G.1) RLS (Row Level Security)

**Risque** : Les policies RLS sur `vehicles` peuvent bloquer l'accès à `vehicle_type` si la colonne n'est pas explicitement autorisée.

**Vérification** :
```sql
-- Vérifier les policies RLS
SELECT * FROM pg_policies WHERE tablename = 'vehicles';

-- Vérifier que vehicle_type est accessible
SELECT vehicle_type FROM vehicles LIMIT 1;
```

**Action si problème** :
- Vérifier que les policies RLS n'excluent pas `vehicle_type`
- Si nécessaire, mettre à jour les policies pour inclure `vehicle_type`

### G.2) Champs NULL

**Risque** : Si `vehicle_type` est `NULL` pour des véhicules existants, le fallback doit fonctionner.

**Gestion** :
- ✅ Fallback dans `isMoto()` : `NULL` → `false` → Traité comme voiture
- ✅ Pas de migration nécessaire pour les voitures existantes

**Vérification** :
```sql
-- Compter les NULL
SELECT COUNT(*) FROM vehicles WHERE vehicle_type IS NULL;
-- Doit être acceptable (voitures existantes)
```

### G.3) Performances

**Risque** : L'ajout d'une colonne et d'un index peut impacter les performances.

**Mitigation** :
- ✅ Index créé sur `vehicle_type` (WHERE vehicle_type IS NOT NULL)
- ✅ Pas de full table scan nécessaire (index utilisé)

**Vérification** :
```sql
-- Vérifier l'utilisation de l'index
EXPLAIN ANALYZE SELECT * FROM vehicles WHERE vehicle_type = 'moto';
-- Doit utiliser l'index idx_vehicles_vehicle_type
```

### G.4) Caching photos

**Risque** : Le cache des photos peut ne pas se mettre à jour si on change de type.

**Gestion** :
- ✅ Le cache des photos est géré par `PhotoService.getPrimaryPhotosForVehicles()`
- ✅ Pas de dépendance au type de véhicule
- ✅ Pas d'impact attendu

**Vérification** :
- Tester que les photos s'affichent correctement pour voitures et motos

### G.5) Backward compatibility

**Risque** : Les véhicules créés avant la migration n'ont pas de `vehicle_type`.

**Gestion** :
- ✅ Fallback : `NULL` → Traité comme voiture
- ✅ Pas de migration nécessaire
- ✅ Code compatible avec `NULL`

**Vérification** :
- Tester avec des véhicules existants (sans `vehicle_type`)
- Vérifier qu'ils s'affichent comme des voitures

---

## H) Résumé exécutif

### Architecture finale

**Source de vérité** : **Modal `VehicleTypeModal`** → Route → Submit → DB `vehicle_type`

**DB** : **Colonne `vehicle_type`** (`'car'`, `'moto'`, `'scooter'`, `NULL`)

**Listing** : **Branching conditionnel** :
- `vehicle_type = 'moto'` ou `'scooter'` → `MotoVehicleCard`
- Sinon → `VehicleCard` (voiture, inchangé)

**Garanties** :
- ✅ **Code voiture 100% intact** (`VehicleCard` non modifié)
- ✅ **Comportement voiture identique** (hardcodes préservés)
- ✅ **Moto isolée** (composant + mapper dédiés)

### Fichiers impactés

**Création** :
- `src/components/vehicles/moto-vehicle-card.tsx`
- `src/utils/vehicle-type-detector.ts`
- Migration SQL : `supabase/migrations/XXX_add_vehicle_type.sql`

**Modification** :
- `src/services/supabaseVehiclesService.ts` (ajout `vehicle_type`)
- `src/pages/owner/AddMotoPlaceholder.tsx` (écrire `vehicle_type='moto'`)
- `src/pages/owner/RentMyCarRegister.tsx` (écrire `vehicle_type='car'` - optionnel)
- `src/pages/Index.tsx` (mapping conditionnel)
- `src/types/index.ts` (ajout `seats`, `engineCapacity`)

**Non modifié** :
- `src/components/vehicles/vehicle-card.tsx` ✅
- `src/components/owner/VehicleTypeModal.tsx` ✅

### Ordre d'exécution recommandé

1. **Étape 1** : Migration DB (sécurisée, rollback possible)
2. **Étape 2** : Submit moto (testable immédiatement)
3. **Étape 3** : Types + Service (nécessaire pour étape 2)
4. **Étape 4** : Listing (visible pour l'utilisateur)
5. **Étape 5** : Search (vérification)
6. **Étape 6** : QA (validation complète)
7. **Étape 7** : Phase 2 (plus tard, optionnel)

---

**Roadmap terminée** ✅

**Prochaine étape** : Validation du plan, puis exécution étape par étape.

