# 🏗️ Diagnostic + Proposition : Cards listing adaptatives selon type (sans casser voiture)

**Date** : 2025-12-17  
**Contexte** : Les cards affichent des infos "voiture" (Clim, portes) pour les motos. Besoin d'une architecture safe qui isole le comportement moto sans toucher au code voiture.

---

## 1️⃣ Pipeline actuel du listing (DB → mapping → UI)

### Flux complet

```
┌─────────────────┐
│   Supabase DB   │
│   vehicles.*    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ SupabaseVehiclesService     │
│ .getAvailableVehicles()     │
│ Fichier:                    │
│ src/services/               │
│   supabaseVehiclesService.ts│
│ Lignes: 92-128              │
└────────┬────────────────────┘
         │
         │ Requête: SELECT * FROM vehicles WHERE available = true
         │
         ▼
┌─────────────────────────────┐
│ Index.tsx                    │
│ Fichier: src/pages/Index.tsx│
│ Lignes: 700-721             │
│                             │
│ Mapping DB → Vehicle props  │
└────────┬────────────────────┘
         │
         │ Props mappées (hardcodées pour voiture)
         │
         ▼
┌─────────────────────────────┐
│ VehicleCard                  │
│ Fichier:                     │
│ src/components/vehicles/     │
│   vehicle-card.tsx           │
│ Lignes: 64-253               │
│                             │
│ Rendering UI                 │
└─────────────────────────────┘
```

### Détail du mapping dans `Index.tsx` (lignes 698-721)

| Champ DB | Mapping actuel | Valeur hardcodée | Ligne |
|----------|----------------|------------------|-------|
| `id` | `license: vehicle.id.substring(0, 8).toUpperCase()` | ✅ Calculé | 701 |
| `brand` | `brand: vehicle.brand` | ✅ DB | 702 |
| `model` | `model: vehicle.model` | ✅ DB | 703 |
| `color` | `color: "Non spécifié"` | ❌ **HARDCODÉ** | 704 |
| `fuel_type` | `fuel: vehicle.fuel_type \|\| "gasoline"` | ⚠️ Fallback | 705 |
| `year` | `year: vehicle.year` | ✅ DB | 706 |
| `has_ac` (n'existe pas) | `hasAC: true` | ❌ **HARDCODÉ** | 707 |
| `seats` | `doors: vehicle.seats \|\| 5` | ⚠️ **Confusion seats→doors** | 708 |
| `transmission` | `transmission: vehicle.transmission \|\| "manual"` | ⚠️ Fallback | 709 |
| `mileage` | `mileage: 0` | ❌ **HARDCODÉ** | 710 |
| `price_per_day` | `dailyPrice: vehicle.price_per_day` | ✅ DB | 711 |
| `pickup_zones` | `location: vehicle.pickup_zones?.join(', ') \|\| "Mamoudzou, Mayotte"` | ❌ **HARDCODÉ fallback** | 716-718 |
| `vehicle_category` | ❌ **NON PASSÉ** | - | - |

### Props alimentant chaque élément UI

| Élément UI | Prop utilisée | Source actuelle | Problème moto |
|------------|---------------|-----------------|---------------|
| **Code (236A9582)** | `vehicle.license` | `id.substring(0, 8)` | ✅ OK |
| **Badge "Clim"** | `vehicle.hasAC` | Hardcodé `true` | ❌ Moto n'a pas de clim |
| **Carburant** | `vehicle.fuel` | `fuel_type` DB | ✅ OK |
| **Transmission** | `vehicle.transmission` | `transmission` DB | ✅ OK |
| **"X portes"** | `vehicle.doors` | `seats` (confusion) | ❌ Moto n'a pas de portes |
| **Localisation** | `vehicle.location` | `pickup_zones` ou "Mayotte" | ⚠️ Fallback inadapté |
| **Année** | `vehicle.year` | `year` DB | ✅ OK |
| **Couleur** | `vehicle.color` | Hardcodé "Non spécifié" | ⚠️ Ignore DB |
| **Prix/jour** | `vehicle.dailyPrice` | `price_per_day` DB | ✅ OK |
| **Photo principale** | `primaryPhoto` | `PhotoService.getPrimaryPhotosForVehicles()` | ✅ OK |

---

## 2️⃣ Identification du type de véhicule (moto vs voiture)

### État actuel de la DB

**Colonne `vehicle_category`** :
- ✅ **Existe** en DB (`vehicles.vehicle_category TEXT NULLABLE`)
- ❌ **Valeurs actuelles** : Toutes les catégories sont des types de **voitures** :
  - `'Citadine'`, `'Berline'`, `'SUV'`, `'Break'`, `'Coupé'`, `'Cabriolet'`, etc.
- ❌ **Moto non représentée** : Aucune valeur pour "Moto" ou "Scooter" dans les catégories existantes

**Vérification SQL** :
```sql
SELECT DISTINCT vehicle_category FROM vehicles WHERE vehicle_category IS NOT NULL;
-- Résultat : [] (aucune valeur pour l'instant)
```

**Contrainte DB** (ligne 189 de `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql`) :
```sql
CONSTRAINT check_vehicle_category CHECK (
  vehicle_category = ANY (ARRAY['Citadine', 'Berline', 'SUV', ...]) 
  OR vehicle_category IS NULL
)
```
➡️ **Problème** : La contrainte CHECK **exclut** "Moto" ou "Scooter" !

### Formulaire moto (`AddMotoPlaceholder.tsx`)

**Ligne 302-330** : Le formulaire moto **ne remplit PAS** `vehicle_category` :
```typescript
const { data, error } = await SupabaseVehiclesService.createVehicle({
  ...
  vehicle_category: undefined, // ❌ Non renseigné
  ...
});
```

### Solution proposée : Utiliser un pattern de détection

**Option A (recommandée) : Pattern de détection basé sur `seats` + `engine_capacity`**

**Logique** :
- Si `seats <= 2` ET `engine_capacity IS NOT NULL` → Probablement une moto
- Sinon → Voiture

**Avantages** :
- ✅ Pas de modification DB
- ✅ Compatible avec données existantes
- ✅ Simple à implémenter

**Inconvénients** :
- ⚠️ Peut être imprécis (voiture 2 places)

**Option B : Ajouter "Moto" / "Scooter" à `vehicle_category`**

**Modifications requises** :
1. Migration DB : Modifier la contrainte CHECK pour inclure `'Moto'` et `'Scooter'`
2. Formulaire moto : Remplir `vehicle_category: 'Moto'` ou `'Scooter'`
3. Code : Utiliser `vehicle_category` pour distinguer

**Avantages** :
- ✅ Source de vérité explicite
- ✅ Évolutif (futurs types de véhicules)

**Inconvénients** :
- ⚠️ Nécessite migration DB
- ⚠️ Plus de modifications

**Option C (hybride recommandée) : Pattern + `vehicle_category`**

**Logique** :
1. Si `vehicle_category` contient "Moto" ou "Scooter" → Moto
2. Sinon, si `seats <= 2` ET `engine_capacity IS NOT NULL` → Moto
3. Sinon → Voiture

**Avantages** :
- ✅ Compatible avec données existantes (pattern)
- ✅ Évolutif (vehicle_category pour nouvelles motos)
- ✅ Pas de migration DB obligatoire (mais recommandée)

---

## 3️⃣ Stratégie "zéro risque pour voiture"

### Option A (recommandée) : Composant séparé `MotoVehicleCard`

**Architecture** :
```
src/components/vehicles/
  ├── vehicle-card.tsx          (existant, inchangé pour voiture)
  └── moto-vehicle-card.tsx     (nouveau, dédié moto)
```

**Logique dans `Index.tsx`** :
```typescript
// Fonction helper pour détecter le type
const isMoto = (vehicle: SupabaseVehicle): boolean => {
  // Option C (hybride)
  if (vehicle.vehicle_category?.toLowerCase().includes('moto') || 
      vehicle.vehicle_category?.toLowerCase().includes('scooter')) {
    return true;
  }
  if (vehicle.seats <= 2 && vehicle.engine_capacity) {
    return true;
  }
  return false;
};

// Rendering conditionnel
{isMoto(vehicle) ? (
  <MotoVehicleCard
    vehicle={mapToMotoVehicle(vehicle)}
    primaryPhoto={photos[vehicle.id] ?? null}
    onClick={() => handleVehicleClick(vehicle)}
  />
) : (
  <VehicleCard
    vehicle={mapToCarVehicle(vehicle)}
    primaryPhoto={photos[vehicle.id] ?? null}
    onClick={() => handleVehicleClick(vehicle)}
  />
)}
```

**Avantages** :
- ✅ **Code voiture 100% intact** (aucune modification de `VehicleCard`)
- ✅ **Séparation claire** des responsabilités
- ✅ **Facile à tester** (composants isolés)
- ✅ **Évolutif** (futurs types : `BikeVehicleCard`, etc.)

**Inconvénients** :
- ⚠️ Duplication potentielle de code commun (image, prix, etc.)

**Mitigation** : Extraire les parties communes dans des composants partagés :
```typescript
// src/components/vehicles/shared/
//   ├── VehicleImage.tsx
//   ├── VehiclePrice.tsx
//   └── VehicleLocation.tsx
```

### Option B : Variant dans `VehicleCard`

**Architecture** :
```typescript
interface VehicleCardProps {
  vehicle: Vehicle;
  variant?: 'car' | 'moto'; // Nouveau prop
  ...
}

export function VehicleCard({ vehicle, variant = 'car', ... }: VehicleCardProps) {
  const isMoto = variant === 'moto';
  
  // Branche car (inchangée)
  if (!isMoto) {
    // Code existant exactement tel quel
    return (
      <Card>
        {/* Code voiture actuel */}
      </Card>
    );
  }
  
  // Branche moto (nouvelle)
  return (
    <Card>
      {/* Code moto dédié */}
    </Card>
  );
}
```

**Avantages** :
- ✅ Un seul composant
- ✅ Code commun partagé automatiquement

**Inconvénients** :
- ⚠️ **Risque de régression** si modification accidentelle de la branche car
- ⚠️ Composant plus complexe (2 logiques dans 1 fichier)

**Recommandation** : **Option A** (composant séparé) pour garantir l'isolation.

---

## 4️⃣ Contenu d'affichage moto (proposition)

### Champs à afficher pour une moto

| Élément | Source DB | Affichage proposé | Notes |
|---------|-----------|-------------------|-------|
| **Marque + Modèle** | `brand`, `model` | `{brand} {model}` | ✅ Déjà affiché |
| **Année** | `year` | `{year}` | ✅ Déjà affiché |
| **Couleur** | `color` | `{color \|\| "Non spécifié"}` | ✅ Utiliser DB au lieu de hardcodé |
| **Places** | `seats` | `{seats} place(s)` | ✅ Remplacer "portes" |
| **Cylindrée** | `engine_capacity` | `{engine_capacity} cc` | 🆕 Si disponible |
| **Carburant** | `fuel_type` | `{fuelLabels[fuel_type]}` | ✅ Déjà affiché |
| **Transmission** | `transmission` | `{transmissionLabels[transmission]}` | ✅ Déjà affiché |
| **Localisation** | `pickup_zones` | `{pickup_zones.join(', ') \|\| "Nosy Be, Madagascar"}` | ⚠️ Fallback adapté |
| **Prix/jour** | `price_per_day` | `{price_per_day}€/jour` | ✅ Déjà affiché |
| **Code véhicule** | `id` | `{id.substring(0, 8)}` | ✅ Déjà affiché |
| **Photo principale** | `vehicle_photos` | Via `PhotoService` | ✅ Déjà fonctionnel |

### Champs à masquer pour moto

| Élément | Raison |
|---------|--------|
| **Badge "Clim"** | Les motos n'ont pas de climatisation |
| **"X portes"** | Les motos n'ont pas de portes |

### Mapping DB → Props moto (nouveau mapper)

**Fichier** : `src/pages/Index.tsx` (nouvelle fonction)

```typescript
// Fonction de mapping spécifique moto
const mapToMotoVehicle = (vehicle: SupabaseVehicle): Vehicle => ({
  id: vehicle.id,
  ownerId: vehicle.owner_id || "",
  license: vehicle.id.substring(0, 8).toUpperCase(),
  brand: vehicle.brand,
  model: vehicle.model,
  color: vehicle.color || "Non spécifié", // ✅ Utiliser DB
  fuel: (vehicle.fuel_type as any) || "gasoline",
  year: vehicle.year,
  hasAC: false, // ✅ Toujours false pour moto
  doors: 0, // ✅ 0 pour moto (ne sera pas affiché)
  transmission: (vehicle.transmission as any) || "manual",
  mileage: vehicle.mileage || 0, // ✅ Utiliser DB
  dailyPrice: vehicle.price_per_day,
  currency: "EUR",
  latitude: 0,
  longitude: 0,
  status: "available" as any,
  location: vehicle.pickup_zones && vehicle.pickup_zones.length > 0
    ? vehicle.pickup_zones.join(', ')
    : "Nosy Be, Madagascar", // ✅ Fallback adapté
  createdAt: vehicle.created_at || new Date().toISOString(),
  updatedAt: vehicle.updated_at || new Date().toISOString(),
  // 🆕 Nouveaux champs pour moto
  seats: vehicle.seats || 2,
  engineCapacity: vehicle.engine_capacity || undefined,
});
```

**⚠️ Note** : L'interface `Vehicle` devra être étendue pour inclure `seats` et `engineCapacity` si on veut les afficher dans `MotoVehicleCard`.

---

## 5️⃣ Valeurs incohérentes et plan d'isolation

### Liste des hardcodes/fallbacks problématiques

| Valeur | Fichier | Ligne | Problème | Solution |
|--------|---------|-------|----------|----------|
| `hasAC: true` | `Index.tsx` | 707 | Hardcodé, ignore DB | Isoler dans `mapToCarVehicle()` |
| `doors: vehicle.seats \|\| 5` | `Index.tsx` | 708 | Confusion seats→doors | Isoler dans `mapToCarVehicle()` |
| `color: "Non spécifié"` | `Index.tsx` | 704 | Ignore `vehicle.color` | Utiliser DB dans les 2 mappers |
| `mileage: 0` | `Index.tsx` | 710 | Ignore `vehicle.mileage` | Utiliser DB dans les 2 mappers |
| `location: "Mamoudzou, Mayotte"` | `Index.tsx` | 718 | Fallback inadapté | Isoler : car="Mayotte", moto="Nosy Be" |

### Plan d'isolation

**Étape 1 : Créer 2 fonctions de mapping séparées**

**Fichier** : `src/pages/Index.tsx`

```typescript
// Mapping voiture (code existant isolé)
const mapToCarVehicle = (vehicle: SupabaseVehicle): Vehicle => ({
  id: vehicle.id,
  ownerId: vehicle.owner_id || "",
  license: vehicle.id.substring(0, 8).toUpperCase(),
  brand: vehicle.brand,
  model: vehicle.model,
  color: vehicle.color || "Non spécifié", // ✅ Utiliser DB avec fallback
  fuel: (vehicle.fuel_type as any) || "gasoline",
  year: vehicle.year,
  hasAC: true, // ✅ Hardcodé pour voiture (comportement actuel préservé)
  doors: vehicle.seats || 5, // ✅ Confusion seats→doors préservée pour voiture
  transmission: (vehicle.transmission as any) || "manual",
  mileage: vehicle.mileage || 0, // ✅ Utiliser DB avec fallback
  dailyPrice: vehicle.price_per_day,
  currency: "EUR",
  latitude: 0,
  longitude: 0,
  status: "available" as any,
  location: vehicle.pickup_zones && vehicle.pickup_zones.length > 0
    ? vehicle.pickup_zones.join(', ')
    : "Mamoudzou, Mayotte", // ✅ Fallback voiture préservé
  createdAt: vehicle.created_at || new Date().toISOString(),
  updatedAt: vehicle.updated_at || new Date().toISOString(),
});

// Mapping moto (nouveau, valeurs adaptées)
const mapToMotoVehicle = (vehicle: SupabaseVehicle): Vehicle => ({
  // ... (voir section 4)
});
```

**Étape 2 : Utiliser le bon mapper selon le type**

```typescript
{isMoto(vehicle) ? (
  <MotoVehicleCard vehicle={mapToMotoVehicle(vehicle)} ... />
) : (
  <VehicleCard vehicle={mapToCarVehicle(vehicle)} ... />
)}
```

**Résultat** :
- ✅ **Voiture** : Comportement exactement identique (même hardcodes, même fallbacks)
- ✅ **Moto** : Valeurs adaptées (pas de clim, pas de portes, fallback "Nosy Be")

---

## 6️⃣ Output : Modifications minimales requises

### Fichiers à créer

| Fichier | Description | Lignes estimées |
|---------|-------------|-----------------|
| `src/components/vehicles/moto-vehicle-card.tsx` | Composant card dédié moto | ~200 lignes |
| `src/utils/vehicle-type-detector.ts` | Helper pour détecter moto vs voiture | ~30 lignes |

### Fichiers à modifier

| Fichier | Modifications | Impact |
|---------|---------------|--------|
| `src/pages/Index.tsx` | - Ajouter `isMoto()` helper<br>- Ajouter `mapToCarVehicle()` (isoler code existant)<br>- Ajouter `mapToMotoVehicle()` (nouveau)<br>- Remplacer mapping inline par conditionnel | ⚠️ Modifications importantes mais isolées |
| `src/types/index.ts` | - Ajouter `seats?: number` à `Vehicle`<br>- Ajouter `engineCapacity?: string` à `Vehicle` | ✅ Ajout simple (backward compatible) |

### Fichiers à ne PAS modifier (garantie)

| Fichier | Raison |
|---------|--------|
| `src/components/vehicles/vehicle-card.tsx` | ✅ **Aucune modification** - Code voiture intact |
| `src/services/supabaseVehiclesService.ts` | ✅ Aucune modification - Service inchangé |

### Logique de détection (à implémenter)

**Fichier** : `src/utils/vehicle-type-detector.ts`

```typescript
import { Vehicle as SupabaseVehicle } from '@/services/supabaseVehiclesService';

/**
 * Détermine si un véhicule est une moto/scooter
 * 
 * Règles (ordre de priorité) :
 * 1. Si vehicle_category contient "moto" ou "scooter" → Moto
 * 2. Si seats <= 2 ET engine_capacity présent → Moto
 * 3. Sinon → Voiture
 */
export function isMoto(vehicle: SupabaseVehicle): boolean {
  const category = vehicle.vehicle_category?.toLowerCase() || '';
  
  // Règle 1 : vehicle_category explicite
  if (category.includes('moto') || category.includes('scooter')) {
    return true;
  }
  
  // Règle 2 : Pattern détection (seats + engine_capacity)
  if (vehicle.seats && vehicle.seats <= 2 && vehicle.engine_capacity) {
    return true;
  }
  
  return false;
}
```

### Structure de `MotoVehicleCard` (proposition)

**Fichier** : `src/components/vehicles/moto-vehicle-card.tsx`

```typescript
interface MotoVehicleCardProps {
  vehicle: Vehicle;
  primaryPhoto?: Photo | null;
  onClick?: () => void;
  className?: string;
  rentalInfo?: VehicleRentalInfo;
}

export function MotoVehicleCard({ vehicle, primaryPhoto, onClick, className, rentalInfo }: MotoVehicleCardProps) {
  // Structure similaire à VehicleCard mais :
  // - Pas de badge "Clim"
  // - "X places" au lieu de "X portes"
  // - Affichage cylindrée si disponible
  // - Fallback localisation "Nosy Be, Madagascar"
  
  return (
    <Card>
      {/* Image (identique) */}
      {/* Code véhicule (identique) */}
      {/* Pas de badge Clim */}
      {/* Marque + Modèle (identique) */}
      {/* Année + Couleur (identique) */}
      {/* Features : Essence, Transmission, Places (pas portes) */}
      {/* Localisation (fallback Nosy Be) */}
      {/* Prix (identique) */}
    </Card>
  );
}
```

---

## 7️⃣ Checklist de validation

### Avant implémentation

- [ ] Valider l'option de détection (Option C hybride recommandée)
- [ ] Valider l'architecture (Option A : composant séparé)
- [ ] Valider les champs affichés moto (section 4)

### Après implémentation

- [ ] **Voiture** : Vérifier que l'affichage est **identique** à avant
- [ ] **Moto** : Vérifier que "Clim" et "portes" sont **masqués**
- [ ] **Moto** : Vérifier que "places" et "cylindrée" s'affichent
- [ ] **Moto** : Vérifier que le fallback localisation est "Nosy Be, Madagascar"
- [ ] **Mixte** : Vérifier que voitures et motos s'affichent correctement sur la même page

---

## 8️⃣ Résumé exécutif

### Architecture proposée

**Option recommandée** : **Composant séparé `MotoVehicleCard`** (Option A)

**Détection du type** : **Pattern hybride** (Option C)
- `vehicle_category` si présent
- Sinon : `seats <= 2` + `engine_capacity`

**Isolation** : **2 mappers séparés**
- `mapToCarVehicle()` : Code existant isolé (hardcodes préservés)
- `mapToMotoVehicle()` : Nouveau mapper avec valeurs adaptées

**Garanties** :
- ✅ **Code voiture 100% intact** (`VehicleCard` non modifié)
- ✅ **Comportement voiture identique** (même hardcodes, même fallbacks)
- ✅ **Moto isolée** (composant + mapper dédiés)

### Fichiers impactés

**Création** :
- `src/components/vehicles/moto-vehicle-card.tsx`
- `src/utils/vehicle-type-detector.ts`

**Modification** :
- `src/pages/Index.tsx` (mapping conditionnel)
- `src/types/index.ts` (ajout champs optionnels)

**Non modifié** :
- `src/components/vehicles/vehicle-card.tsx` ✅
- `src/services/supabaseVehiclesService.ts` ✅

---

**Diagnostic + Proposition terminés** ✅

**Prochaine étape** : Validation de l'architecture proposée avant implémentation.

