# 📋 Plan d'implémentation : Modal comme source de vérité du type véhicule

**Date** : 2025-12-17  
**Objectif** : Utiliser la modal de sélection comme source de vérité, propager le type jusqu'à la DB, et adapter le listing sans casser le flow voiture.

---

## 1️⃣ Vérification : Modal et routes actuelles

### Modal de sélection

**Fichier** : `src/components/owner/VehicleTypeModal.tsx`

**Options définies** :
- ✅ **Voiture** : Bouton avec icône `Car` (ligne 48-62)
- ✅ **Moto / Scooter** : Bouton avec icône `Bike` (ligne 64-79)

**Handlers** :
- `onSelectCar` : Appelé au clic sur "Voiture"
- `onSelectMoto` : Appelé au clic sur "Moto / Scooter"

### Routes actuelles

**Fichier** : `src/pages/owner/OwnerVehicles.tsx` (lignes 170-180)

**Handler Voiture** (`handleSelectCar`) :
```typescript
const handleSelectCar = () => {
  setShowVehicleTypeModal(false);
  navigate("/rent-my-car/register?existingOwner=true");
};
```
➡️ **Route** : `/rent-my-car/register?existingOwner=true`

**Handler Moto** (`handleSelectMoto`) :
```typescript
const handleSelectMoto = () => {
  setShowVehicleTypeModal(false);
  navigate("/me/owner/vehicles/add-moto");
};
```
➡️ **Route** : `/me/owner/vehicles/add-moto`

**Routes définies dans `App.tsx`** :
- ✅ `/rent-my-car/register` → `RentMyCarRegister`
- ✅ `/me/owner/vehicles/add-moto` → `AddMotoPlaceholder`

**✅ Confirmation** : Les routes sont déjà en place et fonctionnelles.

---

## 2️⃣ Source de vérité DB : Option recommandée

### État actuel de la DB

**Colonne `vehicle_category`** :
- ✅ Existe : `TEXT NULLABLE`
- ❌ **Contrainte CHECK** : Bloque les valeurs autres que les catégories voiture
- ❌ **Valeur actuelle** : `NULL` pour la moto existante

**Contrainte CHECK** (à vérifier) :
```sql
CONSTRAINT check_vehicle_category CHECK (
  vehicle_category = ANY (ARRAY['Citadine', 'Berline', 'SUV', ...]) 
  OR vehicle_category IS NULL
)
```

### Option A (recommandée) : Nouvelle colonne `vehicle_type`

**Avantages** :
- ✅ **Pas de migration de contrainte** (plus simple)
- ✅ **Séparation claire** : `vehicle_category` = type de voiture, `vehicle_type` = voiture vs moto
- ✅ **Backward compatible** : Voitures existantes restent `NULL` (détectées comme voiture par défaut)
- ✅ **Évolutif** : Facile d'ajouter d'autres types (vélo, camion, etc.)

**Inconvénients** :
- ⚠️ Nouvelle colonne à maintenir

**SQL de migration** :
```sql
-- Migration : Ajouter vehicle_type
ALTER TABLE vehicles 
ADD COLUMN vehicle_type TEXT NULL 
CHECK (vehicle_type IN ('car', 'moto', 'scooter') OR vehicle_type IS NULL);

-- Commentaire pour documentation
COMMENT ON COLUMN vehicles.vehicle_type IS 
  'Type de véhicule : car (voiture), moto, scooter. NULL = voiture par défaut (backward compat)';

-- Index pour performance (optionnel)
CREATE INDEX idx_vehicles_vehicle_type ON vehicles(vehicle_type) WHERE vehicle_type IS NOT NULL;
```

**Backfill pour moto existante** :
```sql
-- Backfill : Moto existante (seats <= 2 + engine_capacity)
UPDATE vehicles
SET vehicle_type = 'moto'
WHERE seats <= 2 
  AND engine_capacity IS NOT NULL 
  AND vehicle_type IS NULL;
```

### Option B : Étendre `vehicle_category`

**Avantages** :
- ✅ Réutilise une colonne existante

**Inconvénients** :
- ⚠️ **Migration de contrainte** plus complexe
- ⚠️ **Confusion sémantique** : `vehicle_category` = type de voiture, pas type de véhicule
- ⚠️ **Risque de régression** si contrainte mal gérée

**SQL de migration** :
```sql
-- 1. Supprimer l'ancienne contrainte
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS check_vehicle_category;

-- 2. Créer nouvelle contrainte avec moto/scooter
ALTER TABLE vehicles 
ADD CONSTRAINT check_vehicle_category CHECK (
  vehicle_category = ANY (ARRAY[
    'Citadine', 'Berline', 'SUV', 'Break', 'Coupé', 'Cabriolet', 
    'Utilitaire', 'Camionnette', 'Minibus', 'Pick-up', 'Non spécifié',
    'Moto', 'Scooter'  -- 🆕 Ajout
  ]) 
  OR vehicle_category IS NULL
);
```

**Recommandation** : **Option A** (nouvelle colonne `vehicle_type`) pour la simplicité et la clarté.

---

## 3️⃣ Propagation du type depuis la modal jusqu'au submit

### Flux proposé

```
┌─────────────────┐
│ VehicleTypeModal│
│ (source vérité)  │
└────────┬────────┘
         │
         ├─ Voiture → navigate("/rent-my-car/register?existingOwner=true")
         │
         └─ Moto → navigate("/me/owner/vehicles/add-moto")
                    │
                    ▼
         ┌──────────────────────┐
         │ AddMotoPlaceholder    │
         │ (formulaire moto)     │
         └──────────┬────────────┘
                    │
                    │ Submit
                    ▼
         ┌──────────────────────┐
         │ SupabaseVehiclesService│
         │ .createVehicle()      │
         │ vehicle_type='moto'   │
         └──────────┬────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │ Supabase DB          │
         │ vehicles.vehicle_type │
         └──────────────────────┘
```

### Modifications requises

#### Étape 1 : Ajouter `vehicle_type` au service

**Fichier** : `src/services/supabaseVehiclesService.ts`

**Ligne 165-229** : Interface `createVehicle`

**Ajouter** :
```typescript
async createVehicle(vehicleData: {
  // ... champs existants ...
  vehicle_type?: 'car' | 'moto' | 'scooter'; // 🆕 Nouveau champ
  // ... autres champs ...
}): Promise<{ data: Vehicle | null; error: string | null }> {
```

**Ligne 246** : Mapping vers Supabase

**Ajouter** :
```typescript
vehicle_type: vehicleData.vehicle_type ?? null, // 🆕 Nouveau champ
```

#### Étape 2 : Écrire `vehicle_type='moto'` dans le submit moto

**Fichier** : `src/pages/owner/AddMotoPlaceholder.tsx`

**Ligne 302-330** : Appel à `SupabaseVehiclesService.createVehicle`

**Modification** :
```typescript
const { data, error } = await SupabaseVehiclesService.createVehicle({
  owner_id: user.id,
  brand: brand.trim(),
  model: model.trim(),
  // ... autres champs existants ...
  vehicle_type: 'moto', // 🆕 Ajouter cette ligne
  // ... reste inchangé ...
});
```

#### Étape 3 : Écrire `vehicle_type='car'` dans le submit voiture (optionnel mais recommandé)

**Fichier** : `src/pages/owner/RentMyCarRegister.tsx`

**Ligne 847** : Appel à `SupabaseVehiclesService.createVehicle`

**Modification** :
```typescript
const vehicleResult = await SupabaseVehiclesService.createVehicle({
  owner_id: currentUser.id,
  // ... autres champs existants ...
  vehicle_type: 'car', // 🆕 Ajouter cette ligne (explicite)
  // ... reste inchangé ...
});
```

**⚠️ Note** : Si on ne modifie pas le submit voiture, les voitures auront `vehicle_type = NULL`, ce qui est acceptable si on gère le fallback dans le listing (voir section 4).

---

## 4️⃣ Listing : Branching moto sans casser voiture

### Architecture proposée

**Composant séparé** : `MotoVehicleCard` (Option A de la proposition précédente)

**Fichier à créer** : `src/components/vehicles/moto-vehicle-card.tsx`

**Fichier à modifier** : `src/pages/Index.tsx`

### Helper de détection du type

**Fichier à créer** : `src/utils/vehicle-type-detector.ts`

```typescript
import { Vehicle as SupabaseVehicle } from '@/services/supabaseVehiclesService';

/**
 * Détermine si un véhicule est une moto/scooter
 * 
 * Règles (ordre de priorité) :
 * 1. Si vehicle_type = 'moto' ou 'scooter' → Moto
 * 2. Si vehicle_type = 'car' ou NULL → Voiture
 */
export function isMoto(vehicle: SupabaseVehicle): boolean {
  const type = vehicle.vehicle_type;
  
  // Règle 1 : vehicle_type explicite
  if (type === 'moto' || type === 'scooter') {
    return true;
  }
  
  // Règle 2 : Par défaut, c'est une voiture
  return false;
}
```

### Mapping conditionnel dans `Index.tsx`

**Fichier** : `src/pages/Index.tsx`

**Ligne 695-725** : Rendu des cards

**Modification** :
```typescript
// Imports
import { isMoto } from '@/utils/vehicle-type-detector';
import { MotoVehicleCard } from '@/components/vehicles/moto-vehicle-card';

// ... code existant ...

// Fonction de mapping voiture (isoler le code existant)
const mapToCarVehicle = (vehicle: SupabaseVehicle): Vehicle => ({
  id: vehicle.id,
  ownerId: vehicle.owner_id || "",
  license: vehicle.id.substring(0, 8).toUpperCase(),
  brand: vehicle.brand,
  model: vehicle.model,
  color: "Non spécifié", // ✅ Comportement actuel préservé
  fuel: (vehicle.fuel_type as any) || "gasoline",
  year: vehicle.year,
  hasAC: true, // ✅ Comportement actuel préservé
  doors: vehicle.seats || 5, // ✅ Comportement actuel préservé
  transmission: (vehicle.transmission as any) || "manual",
  mileage: 0, // ✅ Comportement actuel préservé
  dailyPrice: vehicle.price_per_day,
  currency: "EUR",
  latitude: 0,
  longitude: 0,
  status: "available" as any,
  location: vehicle.pickup_zones && vehicle.pickup_zones.length > 0 
    ? vehicle.pickup_zones.join(', ') 
    : "Mamoudzou, Mayotte", // ✅ Comportement actuel préservé
  createdAt: vehicle.created_at || new Date().toISOString(),
  updatedAt: vehicle.updated_at || new Date().toISOString(),
});

// Fonction de mapping moto (nouveau)
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
  // 🆕 Champs spécifiques moto
  seats: vehicle.seats || 2,
  engineCapacity: vehicle.engine_capacity || undefined,
});

// Rendu conditionnel (ligne ~695)
{filteredVehicles.map((vehicle) => {
  const vehicleRentalInfo = calculateRentalInfo(vehicle, startDate, endDate, startTime, endTime);
  
  return isMoto(vehicle) ? (
    <MotoVehicleCard
      key={vehicle.id}
      vehicle={mapToMotoVehicle(vehicle)}
      primaryPhoto={photos[vehicle.id] ?? null}
      rentalInfo={vehicleRentalInfo}
      onClick={() => handleVehicleClick(vehicle)}
    />
  ) : (
    <VehicleCard
      key={vehicle.id}
      vehicle={mapToCarVehicle(vehicle)}
      primaryPhoto={photos[vehicle.id] ?? null}
      rentalInfo={vehicleRentalInfo}
      onClick={() => handleVehicleClick(vehicle)}
    />
  );
})}
```

**✅ Garanties** :
- `VehicleCard` reste **100% intact** (aucune modification)
- Code voiture isolé dans `mapToCarVehicle()` (hardcodes préservés)
- Code moto isolé dans `mapToMotoVehicle()` (valeurs adaptées)

---

## 5️⃣ Affichage moto : Champs et sources DB

### Champs à afficher dans `MotoVehicleCard`

| Élément | Source DB | Affichage | Code |
|---------|-----------|-----------|------|
| **Photo principale** | `vehicle_photos` (via `PhotoService`) | Image cover | `primaryPhoto?.url` |
| **Code véhicule** | `id` (8 premiers) | Badge en haut à gauche | `vehicle.license` |
| **Marque + Modèle** | `brand`, `model` | Titre | `{vehicle.brand} {vehicle.model}` |
| **Année** | `year` | Sous-titre | `{vehicle.year}` |
| **Couleur** | `color` | Sous-titre | `{vehicle.color \|\| "Non spécifié"}` |
| **Places** | `seats` | Badge "X place(s)" | `{vehicle.seats} place(s)` |
| **Cylindrée** | `engine_capacity` | Badge "XXX cc" (si dispo) | `{vehicle.engineCapacity} cc` |
| **Carburant** | `fuel_type` | Badge "Essence" | `{fuelLabels[vehicle.fuel]}` |
| **Transmission** | `transmission` | Badge "Manuelle/Automatique" | `{transmissionLabels[vehicle.transmission]}` |
| **Localisation** | `pickup_zones` | Zones ou fallback | `{vehicle.location}` |
| **Prix/jour** | `price_per_day` | Prix en bas | `{vehicle.dailyPrice}€/jour` |

### Champs à masquer dans `MotoVehicleCard`

| Élément | Raison |
|---------|--------|
| **Badge "Clim"** | Les motos n'ont pas de climatisation |
| **"X portes"** | Les motos n'ont pas de portes |

### Structure de `MotoVehicleCard` (proposition)

**Fichier** : `src/components/vehicles/moto-vehicle-card.tsx`

```typescript
import React, { useState, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Fuel, 
  Settings, 
  MapPin, 
  Euro,
  Users,
  Gauge,
  Plane,
  Ship
} from "lucide-react";
import { Vehicle, Photo, VehicleRentalInfo } from "@/types";
import { cn } from "@/lib/utils";
import { PhotoService } from "@/services/supabase/photos";

interface MotoVehicleCardProps {
  vehicle: Vehicle;
  primaryPhoto?: Photo | null;
  onClick?: () => void;
  className?: string;
  rentalInfo?: VehicleRentalInfo;
}

const PLACEHOLDER_URL = "https://images.unsplash.com/photo-1549924231-f129b911e442?w=800&h=600&fit=crop";

export function MotoVehicleCard({ vehicle, primaryPhoto, onClick, className, rentalInfo }: MotoVehicleCardProps) {
  const { t } = useTranslation('common');
  
  // ... handleImageError (identique à VehicleCard) ...
  
  return (
    <Card className={cn("overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lagoon hover:scale-[1.02] bg-gradient-to-br from-card to-card/50", className)} onClick={onClick}>
      {/* Image */}
      <div className="aspect-[4/3] relative overflow-hidden">
        <img
          src={primaryPhoto?.url || PLACEHOLDER_URL}
          alt={`${vehicle.brand} ${vehicle.model}`}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={handleImageError}
        />
        {/* Code véhicule (pas de badge Clim) */}
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm">
            {vehicle.license}
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-4">
        {/* Title & Year */}
        <div className="mb-3">
          <h3 className="font-semibold text-lg text-foreground">
            {vehicle.brand} {vehicle.model}
          </h3>
          <p className="text-sm text-muted-foreground">
            {vehicle.year} • {vehicle.color}
          </p>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Places (pas portes) */}
          <div className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
            <Users className="h-3 w-3 mr-1" />
            {vehicle.seats || 2} place{(vehicle.seats || 2) > 1 ? 's' : ''}
          </div>
          
          {/* Cylindrée (si disponible) */}
          {vehicle.engineCapacity && (
            <div className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
              <Gauge className="h-3 w-3 mr-1" />
              {vehicle.engineCapacity} cc
            </div>
          )}
          
          {/* Carburant */}
          <div className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
            <Fuel className="h-3 w-3 mr-1" />
            {fuelLabels[vehicle.fuel] || "Non spécifié"}
          </div>
          
          {/* Transmission */}
          <div className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
            <Settings className="h-3 w-3 mr-1" />
            {transmissionLabels[vehicle.transmission] || "Non spécifié"}
          </div>
        </div>

        {/* Localisation & Prix */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {vehicle.location && vehicle.location !== "Nosy Be, Madagascar" ? (
              <div className="flex flex-wrap gap-1">
                {vehicle.location.split(', ').slice(0, 2).map((zone, index) => {
                  const IconComponent = getLocationIcon(zone.trim());
                  return (
                    <div key={index} className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
                      <IconComponent className="h-3 w-3 mr-1" />
                      <span className="truncate">{zone.trim()}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mr-1" />
                <span>Nosy Be, Madagascar</span>
              </div>
            )}
          </div>
          
          <div className="text-right ml-2">
            <div className="flex items-center text-2xl font-bold text-primary">
              <Euro className="h-5 w-5" />
              {vehicle.dailyPrice}
            </div>
            <div className="text-xs text-muted-foreground">{t('common.par_jour')}</div>
          </div>
        </div>

        {/* CTA Button */}
        {onClick && (
          <Button 
            className="w-full mt-4 bg-gradient-lagoon hover:opacity-90 shadow-soft"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >{t('common.voir_la_fiche')}</Button>
        )}
      </CardContent>
    </Card>
  );
}
```

**⚠️ Note** : L'interface `Vehicle` devra être étendue pour inclure `seats` et `engineCapacity` :

**Fichier** : `src/types/index.ts` (ligne ~111)

**Ajouter** :
```typescript
export interface Vehicle {
  // ... champs existants ...
  seats?: number; // 🆕 Pour moto
  engineCapacity?: string; // 🆕 Pour moto
}
```

---

## 6️⃣ Checklist de validation

### Avant implémentation

- [ ] Valider l'option DB (Option A : `vehicle_type` recommandée)
- [ ] Valider l'architecture (composant séparé `MotoVehicleCard`)
- [ ] Valider les champs affichés moto

### Étapes d'implémentation

#### Étape 1 : Migration DB
- [ ] Exécuter la migration SQL pour ajouter `vehicle_type`
- [ ] Exécuter le backfill pour la moto existante
- [ ] Vérifier que la contrainte CHECK fonctionne

#### Étape 2 : Service
- [ ] Ajouter `vehicle_type` à l'interface `createVehicle` dans `supabaseVehiclesService.ts`
- [ ] Ajouter le mapping dans `createVehicle` (ligne 246)

#### Étape 3 : Submit moto
- [ ] Modifier `AddMotoPlaceholder.tsx` pour écrire `vehicle_type='moto'`

#### Étape 4 : Submit voiture (optionnel)
- [ ] Modifier `RentMyCarRegister.tsx` pour écrire `vehicle_type='car'`

#### Étape 5 : Types TypeScript
- [ ] Ajouter `seats` et `engineCapacity` à l'interface `Vehicle` dans `types/index.ts`
- [ ] Ajouter `vehicle_type` à l'interface `Vehicle` dans `supabaseVehiclesService.ts`

#### Étape 6 : Helper de détection
- [ ] Créer `src/utils/vehicle-type-detector.ts` avec `isMoto()`

#### Étape 7 : Composant moto
- [ ] Créer `src/components/vehicles/moto-vehicle-card.tsx`

#### Étape 8 : Listing
- [ ] Modifier `Index.tsx` pour ajouter `mapToCarVehicle()` et `mapToMotoVehicle()`
- [ ] Modifier le rendu conditionnel dans `Index.tsx`

### Tests de validation

#### Test 1 : Créer une voiture
- [ ] Ouvrir modal → Sélectionner "Voiture"
- [ ] Remplir formulaire voiture → Submit
- [ ] Vérifier en DB : `vehicle_type = 'car'` (ou `NULL` si pas modifié)
- [ ] Vérifier sur listing : Card voiture affiche "Clim" et "X portes" ✅

#### Test 2 : Créer une moto
- [ ] Ouvrir modal → Sélectionner "Moto / Scooter"
- [ ] Remplir formulaire moto → Submit
- [ ] Vérifier en DB : `vehicle_type = 'moto'` ✅
- [ ] Vérifier sur listing : Card moto affiche "X places" et "XXX cc", **pas** "Clim" ni "portes" ✅

#### Test 3 : Listing mixte
- [ ] Avoir au moins 1 voiture et 1 moto dans la DB
- [ ] Ouvrir page listing
- [ ] Vérifier : Voiture affiche card voiture, Moto affiche card moto ✅

#### Test 4 : Backward compatibility
- [ ] Vérifier que les voitures existantes (sans `vehicle_type`) s'affichent toujours correctement ✅

---

## 7️⃣ Résumé exécutif

### Architecture finale

**Source de vérité** : **Modal `VehicleTypeModal`** → Routes → Submit → DB `vehicle_type`

**DB** : **Nouvelle colonne `vehicle_type`** (`'car'`, `'moto'`, `'scooter'`, `NULL`)

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
- `src/components/owner/VehicleTypeModal.tsx` ✅ (déjà en place)

---

**Plan terminé** ✅

**Prochaine étape** : Validation du plan, puis implémentation étape par étape.

