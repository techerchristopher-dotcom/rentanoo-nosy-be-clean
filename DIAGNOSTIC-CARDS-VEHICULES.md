# 🔍 Diagnostic : Origine des informations affichées sur les cards véhicules

**Date** : 2025-12-17  
**Contexte** : Les cards sur la page "Véhicules disponibles" affichent des informations qui ne sont pas cohérentes pour une moto (clim, portes) et une localisation "Mayotte" qui ne correspond plus au contexte (Madagascar / Nosy Be).

---

## 1️⃣ Composant Front responsable de l'affichage

### Fichier : `src/components/vehicles/vehicle-card.tsx`

**Composant** : `VehicleCard`  
**Props utilisées** : `vehicle: Vehicle`, `primaryPhoto?: Photo | null`

### Mapping UI → Prop utilisée

| Élément affiché | Ligne | Prop utilisée | Code exact |
|----------------|-------|---------------|------------|
| **Code véhicule (236A9582)** | 147 | `vehicle.license` | `{vehicle.license}` |
| **Badge "Clim"** | 151-155 | `vehicle.hasAC` | `{vehicle.hasAC && <Badge>Clim</Badge>}` |
| **Carburant (Essence)** | 174 | `vehicle.fuel` | `{fuelLabels[vehicle.fuel]}` |
| **Transmission (Automatique)** | 178 | `vehicle.transmission` | `{transmissionLabels[vehicle.transmission]}` |
| **Nombre de portes (2 portes)** | 182 | `vehicle.doors` | `{vehicle.doors} portes` |
| **Localisation (Mayotte)** | 189-209 | `vehicle.location` | `vehicle.location !== "Mamoudzou, Mayotte" ? zones : {t('common.mayotte')}` |
| **Année** | 166 | `vehicle.year` | `{vehicle.year}` |
| **Couleur** | 166 | `vehicle.color` | `{vehicle.color}` |
| **Prix par jour** | 220, 232 | `vehicle.dailyPrice` | `{vehicle.dailyPrice}` |

---

## 2️⃣ Source Back / Service pour chaque champ

### Service utilisé : `SupabaseVehiclesService.getAvailableVehicles()`

**Fichier** : `src/services/supabaseVehiclesService.ts` (lignes 92-128)

**Requête Supabase exacte** :
```typescript
let query = supabase
  .from('vehicles')
  .select('*')
  .eq('available', true)
  .order('created_at', { ascending: false });
```

**Colonnes récupérées depuis la DB** (toutes les colonnes de `vehicles`) :
- `id`, `owner_id`, `brand`, `model`, `year`, `color`, `license_plate`
- `mileage`, `fuel_type`, `transmission`, `seats`, `price_per_day`
- `available`, `vehicle_category`, `pickup_zones`, `description`
- `rental_count`, `created_at`, `updated_at`, `engine_capacity`

**⚠️ Colonnes qui n'existent PAS en DB** (mais utilisées dans le code) :
- ❌ `doors` (n'existe pas)
- ❌ `has_ac` (n'existe pas)
- ❌ `image_url` (n'existe pas)
- ❌ `status` (n'existe pas)
- ❌ `location` (n'existe pas directement, mais `pickup_zones` existe)

**✅ Colonnes qui EXISTENT en DB** :
- ✅ `vehicle_category` (text, nullable) - **Peut être utilisé pour distinguer moto vs voiture**

---

## 3️⃣ Mapping DB → UI (source réelle de chaque champ)

### Tableau complet de mapping

| Élément affiché | Champ DB réel | Table | Valeur actuelle (moto) | Source réelle | Code de mapping |
|----------------|---------------|-------|------------------------|---------------|-----------------|
| **236A9582** | `id` (8 premiers caractères) | `vehicles` | `236a9582...` | **Calculé côté front** | `vehicle.id.substring(0, 8).toUpperCase()` |
| **Clim** | ❌ `has_ac` n'existe pas | - | `true` (hardcodé) | **Valeur par défaut hardcodée** | `hasAC: true` (ligne 707) |
| **Essence** | `fuel_type` | `vehicles` | `gasoline` | Formulaire création | `fuel: vehicle.fuel_type` |
| **Automatique** | `transmission` | `vehicles` | `automatic` | Formulaire création | `transmission: vehicle.transmission` |
| **2 portes** | ❌ `doors` n'existe pas | - | `2` (vient de `seats`) | **Fallback : `seats`** | `doors: vehicle.seats \|\| 5` (ligne 708) |
| **Mayotte** | ❌ `location` n'existe pas | - | `"Mamoudzou, Mayotte"` | **Valeur par défaut hardcodée** | `location: vehicle.pickup_zones?.join(', ') \|\| "Mamoudzou, Mayotte"` (ligne 716-718) |
| **Année** | `year` | `vehicles` | `2025` | Formulaire création | `year: vehicle.year` |
| **Couleur** | `color` | `vehicles` | `null` → "Non spécifié" | **Fallback hardcodé** | `color: "Non spécifié"` (ligne 704) |
| **Prix/jour** | `price_per_day` | `vehicles` | `12` | Formulaire création | `dailyPrice: vehicle.price_per_day` |

---

## 4️⃣ Valeurs par défaut (où elles sont définies)

### Valeurs hardcodées dans `Index.tsx` (mapping vers VehicleCard)

**Fichier** : `src/pages/Index.tsx` (lignes 700-719)

```typescript
vehicle={{
  ...
  license: vehicle.id.substring(0, 8).toUpperCase(), // ✅ Calculé depuis DB
  color: "Non spécifié", // ❌ HARDCODÉ (ignore vehicle.color de la DB)
  fuel: (vehicle.fuel_type as any) || "gasoline", // ✅ DB avec fallback
  year: vehicle.year, // ✅ DB
  hasAC: true, // ❌ HARDCODÉ (ignore has_ac de la DB)
  doors: vehicle.seats || 5, // ⚠️ FALLBACK : utilise seats au lieu de doors
  transmission: (vehicle.transmission as any) || "manual", // ✅ DB avec fallback
  mileage: 0, // ❌ HARDCODÉ (ignore vehicle.mileage de la DB)
  dailyPrice: vehicle.price_per_day, // ✅ DB
  location: vehicle.pickup_zones && vehicle.pickup_zones.length > 0 
    ? vehicle.pickup_zones.join(', ') 
    : "Mamoudzou, Mayotte", // ❌ HARDCODÉ comme fallback
  ...
}}
```

### Valeurs par défaut lors de la création d'une moto

**Fichier** : `src/pages/owner/AddMotoPlaceholder.tsx` (lignes 310-330)

```typescript
{
  ...
  seats: parsedSeats, // ✅ Vient du formulaire
  doors: undefined, // ✅ Non défini pour moto
  transmission: (transmission || "manual") as any, // ✅ Formulaire avec fallback
  fuel_type: (fuelType || "gasoline") as any, // ✅ Formulaire avec fallback
  has_ac: false, // ✅ Explicitement false pour moto
  ...
}
```

**⚠️ Problème** : Même si la moto est créée avec `has_ac: false` et `doors: undefined`, le mapping dans `Index.tsx` **écrase ces valeurs** avec :
- `hasAC: true` (hardcodé)
- `doors: vehicle.seats || 5` (utilise `seats` au lieu de `doors`)

---

## 5️⃣ Localisation "Mayotte" (source et modification)

### Source de la localisation

**Fichier** : `src/pages/Index.tsx` (lignes 716-718)

```typescript
location: vehicle.pickup_zones && vehicle.pickup_zones.length > 0 
  ? vehicle.pickup_zones.join(', ') 
  : "Mamoudzou, Mayotte", // ❌ Fallback hardcodé
```

**Logique d'affichage** : `src/components/vehicles/vehicle-card.tsx` (lignes 189-209)

```typescript
{vehicle.location && vehicle.location !== "Mamoudzou, Mayotte" ? (
  // Afficher les zones de pickup
  vehicle.location.split(', ').map(...)
) : (
  // Afficher "Mayotte" via i18n
  <span>{t('common.mayotte')}</span>
)}
```

**Source i18n** : `src/i18n/locales/fr/common.json` (ligne 39)
```json
"mayotte": "Mayotte"
```

### Comment modifier la localisation

#### Option 1 : Modifier le fallback dans `Index.tsx`

**Fichier** : `src/pages/Index.tsx` ligne 718

**Avant** :
```typescript
: "Mamoudzou, Mayotte", // Utiliser les zones de prise en charge
```

**Après** :
```typescript
: "Nosy Be, Madagascar", // Fallback pour Madagascar
```

#### Option 2 : Remplir `pickup_zones` lors de la création

**Fichier** : `src/pages/owner/AddMotoPlaceholder.tsx` ou formulaire de création

Ajouter des zones de pickup lors de la création :
```typescript
pickup_zones: ["Nosy Be", "Hell-Ville", "Ambondrona"]
```

#### Option 3 : Modifier la traduction i18n

**Fichier** : `src/i18n/locales/fr/common.json` ligne 39

**Avant** :
```json
"mayotte": "Mayotte"
```

**Après** :
```json
"mayotte": "Nosy Be, Madagascar"
```

**⚠️ Impact** : Cette modification affectera **tous** les endroits où `t('common.mayotte')` est utilisé.

---

## 6️⃣ Champs spécifiques voiture vs moto (non pertinents pour moto)

### Champs à masquer pour une moto

| Champ | Pourquoi non pertinent | Où masquer |
|-------|------------------------|------------|
| **Clim (`hasAC`)** | Les motos n'ont pas de climatisation | Condition dans `VehicleCard` |
| **Portes (`doors`)** | Les motos n'ont pas de portes | Condition dans `VehicleCard` ou utiliser `vehicle_category` |

### Solution recommandée : Masquer conditionnellement dans `VehicleCard`

**Fichier** : `src/components/vehicles/vehicle-card.tsx`

**Logique à ajouter** :
```typescript
// Déterminer si c'est une moto (basé sur vehicle_category ou autre indicateur)
const isMoto = vehicle.vehicleCategory?.toLowerCase().includes('moto') || 
               vehicle.vehicleCategory?.toLowerCase().includes('scooter');

// Masquer Clim si moto
{vehicle.hasAC && !isMoto && (
  <Badge>Clim</Badge>
)}

// Masquer "portes" si moto, afficher "places" à la place
{!isMoto ? (
  <div>{vehicle.doors} portes</div>
) : (
  <div>{vehicle.seats} places</div>
)}
```

**⚠️ Problème actuel** : Le champ `vehicle_category` n'est **pas passé** à `VehicleCard` dans le mapping de `Index.tsx`.

---

## 7️⃣ Conclusion : Tableau récapitulatif et actions

### Tableau "Ce champ vient d'ici → se modifie là"

| Élément affiché | Source DB | Valeur actuelle | Où modifier | Action requise |
|----------------|-----------|-----------------|-------------|----------------|
| **Code (236A9582)** | `vehicles.id` (8 premiers) | Calculé | `Index.tsx` ligne 701 | ✅ OK (temporaire) |
| **Clim** | ❌ N'existe pas | `true` (hardcodé) | `Index.tsx` ligne 707 | ⚠️ Utiliser `has_ac` de la DB |
| **Essence** | `vehicles.fuel_type` | `gasoline` | Formulaire création | ✅ OK |
| **Automatique** | `vehicles.transmission` | `automatic` | Formulaire création | ✅ OK |
| **2 portes** | ❌ N'existe pas | `seats` (fallback) | `Index.tsx` ligne 708 | ⚠️ Masquer pour moto |
| **Mayotte** | ❌ N'existe pas | `"Mamoudzou, Mayotte"` (hardcodé) | `Index.tsx` ligne 718 | ⚠️ Changer fallback |
| **Année** | `vehicles.year` | `2025` | Formulaire création | ✅ OK |
| **Couleur** | `vehicles.color` | `null` → "Non spécifié" | `Index.tsx` ligne 704 | ⚠️ Utiliser `color` de la DB |
| **Prix/jour** | `vehicles.price_per_day` | `12` | Formulaire création | ✅ OK |

### Actions concrètes recommandées

#### Action 1 : Corriger le mapping `hasAC` (Clim)

**Fichier** : `src/pages/Index.tsx` ligne 707

**Avant** :
```typescript
hasAC: true, // À ajouter dans la DB plus tard
```

**Après** :
```typescript
hasAC: false, // Par défaut false (les motos n'ont pas de clim)
```

**⚠️ Note** : La colonne `has_ac` **n'existe pas en DB**. Options :
1. **Option A (recommandée)** : Masquer le badge "Clim" pour les motos (voir Action 2)
2. **Option B** : Ajouter la colonne `has_ac BOOLEAN DEFAULT false` à la table `vehicles` via migration

#### Action 2 : Masquer "Clim" et "portes" pour les motos

**Fichier** : `src/components/vehicles/vehicle-card.tsx`

**Modification** :
```typescript
// Ajouter vehicle_category dans les props ou le déterminer autrement
const isMoto = vehicle.vehicleCategory?.toLowerCase().includes('moto') || 
               vehicle.vehicleCategory?.toLowerCase().includes('scooter');

// Ligne 151-156 : Masquer Clim si moto
{vehicle.hasAC && !isMoto && (
  <Badge variant="secondary" className="bg-primary-soft/20 backdrop-blur-sm text-primary">
    <Wind className="h-3 w-3 mr-1" />
    Clim
  </Badge>
)}

// Ligne 180-183 : Masquer "portes" si moto
{!isMoto && (
  <div className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
    <Users className="h-3 w-3 mr-1" />
    {vehicle.doors} portes
  </div>
)}
```

#### Action 3 : Changer le fallback "Mayotte" → "Nosy Be, Madagascar"

**Fichier** : `src/pages/Index.tsx` ligne 718

**Avant** :
```typescript
: "Mamoudzou, Mayotte", // Utiliser les zones de prise en charge
```

**Après** :
```typescript
: "Nosy Be, Madagascar", // Fallback pour Madagascar
```

#### Action 4 : Passer `vehicle_category` à `VehicleCard`

**Fichier** : `src/pages/Index.tsx` ligne 700-719

**Ajouter** :
```typescript
vehicle={{
  ...
  vehicleCategory: vehicle.vehicle_category, // ✅ Ajouter cette ligne
  ...
}}
```

**Fichier** : `src/types/index.ts` (interface `Vehicle`)

**Vérifier** que `vehicleCategory` existe dans l'interface `Vehicle`.

**✅ Confirmation** : L'interface `Vehicle` dans `src/types/index.ts` n'a **pas** de champ `vehicleCategory`. Il faudra :
1. Ajouter `vehicleCategory?: string;` à l'interface `Vehicle` (ligne ~111)
2. Passer `vehicleCategory` dans le mapping de `Index.tsx` (ligne 698-721)

#### Action 5 : Utiliser `color` de la DB au lieu de "Non spécifié"

**Fichier** : `src/pages/Index.tsx` ligne 704

**Avant** :
```typescript
color: "Non spécifié", // À ajouter dans la DB plus tard
```

**Après** :
```typescript
color: vehicle.color || "Non spécifié", // Utiliser la valeur de la DB
```

---

### Menus / Écrans pour modifier ces infos

| Information | Où modifier | Chemin dans l'app |
|-------------|-------------|-------------------|
| **Clim** | Formulaire création/édition | `/me/owner/vehicles/{id}/manage` → Onglet "Équipements" |
| **Portes** | Formulaire création/édition | `/me/owner/vehicles/{id}/manage` → Onglet "Informations de base" |
| **Localisation** | Zones de pickup | `/me/owner/vehicles/{id}/manage` → Onglet "Zones de prise en charge" |
| **Carburant** | Formulaire création/édition | `/me/owner/vehicles/{id}/manage` → Onglet "Informations de base" |
| **Transmission** | Formulaire création/édition | `/me/owner/vehicles/{id}/manage` → Onglet "Informations de base" |
| **Couleur** | Formulaire création/édition | `/me/owner/vehicles/{id}/manage` → Onglet "Informations de base" |
| **Prix/jour** | Formulaire création/édition | `/me/owner/vehicles/{id}/manage` → Onglet "Tarifs" |

---

### Résumé des problèmes identifiés

1. **`hasAC: true` hardcodé** → Ignore la valeur DB (`has_ac: false` pour moto)
2. **`doors` n'existe pas en DB** → Utilise `seats` comme fallback (2 pour moto = 2 portes ❌)
3. **`color: "Non spécifié"` hardcodé** → Ignore `vehicle.color` de la DB
4. **`location: "Mamoudzou, Mayotte"` hardcodé** → Fallback inadapté pour Madagascar
5. **`vehicle_category` non passé** → Impossible de distinguer moto vs voiture dans `VehicleCard`

---

**Diagnostic terminé** ✅

