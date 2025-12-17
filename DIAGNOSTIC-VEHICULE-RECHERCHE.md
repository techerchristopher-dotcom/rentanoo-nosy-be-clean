# 🔍 Diagnostic : Véhicule visible en owner mais absent des résultats de recherche

**Date** : 2025-12-17  
**Problème** : Un véhicule (moto) créé avec succès est visible dans le dashboard owner mais n'apparaît pas dans les résultats de recherche (home page + search).

---

## 1️⃣ Source de vérité de la recherche

### Fichiers identifiés

#### Page d'accueil (`Index.tsx`)
- **Fichier** : `src/pages/Index.tsx`
- **Ligne** : 120
- **Service utilisé** : `SupabaseVehiclesService.getAvailableVehicles()`
- **Source** : `src/services/supabaseVehiclesService.ts`

#### Recherche avec critères (`Index.tsx`)
- **Fichier** : `src/pages/Index.tsx`
- **Ligne** : 221
- **Service utilisé** : `SupabaseVehiclesService.searchAvailableVehicles(filters)`
- **Source** : `src/services/supabaseVehiclesService.ts`

### Requête Supabase exacte

#### `getAvailableVehicles()` (lignes 98-102)
```typescript
let query = supabase
  .from('vehicles')
  .select('*')
  .eq('available', true)
  .eq('status', 'active');  // ⚠️ PROBLÈME ICI
```

#### `searchAvailableVehicles()` (lignes 412-416)
```typescript
let query = supabase
  .from('vehicles')
  .select('*')
  .eq('available', true)
  .eq('status', 'active');  // ⚠️ PROBLÈME ICI
```

---

## 2️⃣ Liste exhaustive des filtres appliqués

### Filtres Supabase (côté backend)

| Filtre | Condition | Fichier | Ligne | Statut |
|--------|-----------|---------|-------|--------|
| `available = true` | `.eq('available', true)` | `supabaseVehiclesService.ts` | 101, 415 | ✅ **OK** |
| `status = 'active'` | `.eq('status', 'active')` | `supabaseVehiclesService.ts` | 102, 416 | ❌ **PROBLÈME** |

### Filtres optionnels (si fournis)

| Filtre | Condition | Fichier | Ligne | Statut |
|--------|-----------|---------|-------|--------|
| `vehicle_category IN (...)` | `.in('vehicle_category', ...)` | `supabaseVehiclesService.ts` | 106 | ✅ **OK** |
| `fuel_type IN (...)` | `.in('fuel_type', ...)` | `supabaseVehiclesService.ts` | 110 | ✅ **OK** |
| `transmission IN (...)` | `.in('transmission', ...)` | `supabaseVehiclesService.ts` | 114 | ✅ **OK** |

### Filtres côté frontend (après récupération)

| Filtre | Condition | Fichier | Ligne | Statut |
|--------|-----------|---------|-------|--------|
| Filtre carburant | `v.fuel_type && selectedFuelTypes.includes(v.fuel_type)` | `Index.tsx` | 418-420 | ✅ **OK** |
| Filtre transmission | `v.transmission && selectedTransmissions.includes(v.transmission)` | `Index.tsx` | 424-427 | ✅ **OK** |
| Filtre catégorie | `v.vehicle_category && selectedCategories.includes(v.vehicle_category)` | `Index.tsx` | 431-434 | ✅ **OK** |

---

## 3️⃣ Différences CAR vs MOTO

### Vérification du schéma de la table `vehicles`

**Résultat de la requête** : La table `vehicles` **n'a PAS de colonne `status`**.

Colonnes existantes dans `vehicles` :
- `id`, `owner_id`, `brand`, `model`, `year`, `color`, `license_plate`
- `mileage`, `fuel_type`, `transmission`, `seats`, `price_per_day`
- `available`, `vehicle_category`, `pickup_zones`, `description`
- `rental_count`, `created_at`, `updated_at`, `engine_capacity`

**Colonnes manquantes** :
- ❌ `status` (utilisée dans le code mais n'existe pas)
- ❌ `image_url` (mentionnée dans l'interface mais n'existe pas)

### Vérification des valeurs du véhicule test

**Véhicule dans la base** :
```json
{
  "id": "236a9582-0729-45f1-ae93-f6f33130ffab",
  "brand": "t",
  "model": "t",
  "vehicle_category": null,
  "available": true,
  "price_per_day": "12",
  "seats": 2,
  "fuel_type": "gasoline",
  "transmission": "automatic"
}
```

**Critères de filtrage** :
- ✅ `available = true` → **SATISFAIT**
- ❌ `status = 'active'` → **ÉCHEC** (colonne n'existe pas)

---

## 4️⃣ Conditions "business" invisibles

### Vérifications effectuées

| Condition | Vérifiée | Résultat |
|-----------|----------|----------|
| Au moins 1 photo primaire | ❌ Non vérifiée | Pas de filtre sur `vehicle_photos` |
| Au moins 1 entrée dans `vehicle_photos` | ❌ Non vérifiée | Pas de filtre sur `vehicle_photos` |
| `image_url` non null | ❌ Non vérifiée | Colonne n'existe pas |
| `price_per_day > 0` | ✅ Vérifiée | Contrainte CHECK en base |
| `location` défini | ❌ Non vérifiée | Pas de filtre sur `location` |
| `pickup_zones` défini | ❌ Non vérifiée | Pas de filtre sur `pickup_zones` |

**Conclusion** : Aucune condition business invisible ne bloque la moto. Le seul problème est le filtre sur `status`.

---

## 5️⃣ Vérification des policies RLS

### Statut RLS sur `vehicles`

**RLS Status** : ❌ **DISABLED**

Les policies existent mais sont **inactives** car RLS est désactivé sur la table `vehicles`.

### Policies existantes (inactives)

1. **`Anyone can view available vehicles`**
   - Type : SELECT
   - Condition : `available = true`
   - Statut : ❌ Inactive (RLS disabled)

2. **`Authenticated users can insert vehicles`**
   - Type : INSERT
   - Condition : `auth.uid() = owner_id`
   - Statut : ❌ Inactive (RLS disabled)

3. **`Owners can delete their vehicles`**
   - Type : DELETE
   - Condition : `auth.uid() = owner_id`
   - Statut : ❌ Inactive (RLS disabled)

4. **`Owners can update their vehicles`**
   - Type : UPDATE
   - Condition : `auth.uid() = owner_id`
   - Statut : ❌ Inactive (RLS disabled)

**Conclusion** : Les policies RLS ne sont **pas la cause** du problème car elles sont inactives.

---

## 6️⃣ Vérification concrète avec requêtes SQL

### Test 1 : Requête avec filtre `status` (utilisée par le code)

```sql
SELECT *
FROM vehicles
WHERE available = true
  AND status = 'active'
ORDER BY created_at DESC;
```

**Résultat** : ❌ **ERREUR**
```
ERROR: 42703: column "status" does not exist
LINE 5:   AND status = 'active'
              ^
HINT:  Perhaps you meant to reference the column "vehicles.seats".
```

### Test 2 : Requête SANS filtre `status` (ce qui devrait fonctionner)

```sql
SELECT *
FROM vehicles
WHERE available = true
ORDER BY created_at DESC;
```

**Résultat** : ✅ **SUCCÈS**
- Retourne 1 véhicule : `236a9582-0729-45f1-ae93-f6f33130ffab`
- Véhicule avec `available = true` ✅

### Test 3 : Vérification du véhicule spécifique

```sql
SELECT 
  id,
  brand,
  model,
  vehicle_category,
  available,
  price_per_day
FROM vehicles
WHERE id = '236a9582-0729-45f1-ae93-f6f33130ffab';
```

**Résultat** : ✅ **Véhicule existe et est disponible**
- `available = true` ✅
- `price_per_day = 12` ✅
- `vehicle_category = null` (pas de filtre sur catégorie)

---

## 7️⃣ Conclusion : Cause racine exacte

### 🔴 Cause racine

**Le code filtre sur une colonne `status` qui n'existe pas dans la table `vehicles`.**

**Fichiers concernés** :
1. `src/services/supabaseVehiclesService.ts` ligne 102 (dans `getAvailableVehicles()`)
2. `src/services/supabaseVehiclesService.ts` ligne 416 (dans `searchAvailableVehicles()`)

**Comportement** :
- Quand Supabase exécute `.eq('status', 'active')` sur une colonne inexistante, cela génère une erreur SQL
- L'erreur est catchée dans le bloc `try/catch` (ligne 125-128)
- Le service retourne un tableau vide `[]` au lieu de lever l'erreur
- Résultat : **aucun véhicule n'est retourné**, même ceux qui sont disponibles

### ✅ Correction minimale proposée

**Option 1 : Supprimer le filtre `status` (recommandé)**

Supprimer les lignes qui filtrent sur `status` car :
- La colonne n'existe pas dans la table
- Le filtre `available = true` suffit pour déterminer la disponibilité
- Pas d'impact sur les voitures existantes (elles n'ont pas de `status` non plus)

**Fichiers à modifier** :
- `src/services/supabaseVehiclesService.ts` ligne 102
- `src/services/supabaseVehiclesService.ts` ligne 416

**Code avant** :
```typescript
.eq('available', true)
.eq('status', 'active');  // ❌ À supprimer
```

**Code après** :
```typescript
.eq('available', true);  // ✅ Suffisant
```

**Option 2 : Ajouter la colonne `status` (si nécessaire pour le business)**

Si le statut est vraiment nécessaire, ajouter la colonne via migration :
```sql
ALTER TABLE vehicles 
ADD COLUMN status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'inactive', 'review'));
```

**Recommandation** : **Option 1** (supprimer le filtre) car plus simple et le champ `available` suffit.

### 📊 Impact

| Aspect | Impact | Détails |
|--------|--------|---------|
| **Voitures existantes** | ✅ Aucun impact | Elles n'ont pas de `status` non plus, donc elles sont aussi bloquées |
| **Motos** | ✅ Résolu | Les motos apparaîtront après correction |
| **Sécurité** | ✅ Safe | Le filtre `available = true` reste actif |
| **Phase 1** | ✅ Safe | Pas de changement de schéma, juste suppression d'un filtre incorrect |

### 🎯 Actions recommandées

1. **Immédiat** : Supprimer `.eq('status', 'active')` des deux méthodes
2. **Vérification** : Tester que les véhicules apparaissent après correction
3. **Optionnel** : Ajouter des logs pour détecter ce type d'erreur à l'avenir

---

## 📝 Fichiers à modifier

### `src/services/supabaseVehiclesService.ts`

**Ligne 98-102** (méthode `getAvailableVehicles`) :
```typescript
// AVANT
let query = supabase
  .from('vehicles')
  .select('*')
  .eq('available', true)
  .eq('status', 'active');  // ❌ À supprimer

// APRÈS
let query = supabase
  .from('vehicles')
  .select('*')
  .eq('available', true);  // ✅ Suffisant
```

**Ligne 412-416** (méthode `searchAvailableVehicles`) :
```typescript
// AVANT
let query = supabase
  .from('vehicles')
  .select('*')
  .eq('available', true)
  .eq('status', 'active');  // ❌ À supprimer

// APRÈS
let query = supabase
  .from('vehicles')
  .select('*')
  .eq('available', true);  // ✅ Suffisant
```

---

## ✅ Validation post-correction

Après correction, vérifier que :
1. ✅ Les véhicules avec `available = true` apparaissent sur la home page
2. ✅ Les véhicules avec `available = true` apparaissent dans les résultats de recherche
3. ✅ Les véhicules avec `available = false` n'apparaissent pas
4. ✅ Les filtres optionnels (catégorie, carburant, transmission) fonctionnent toujours

---

**Diagnostic terminé** ✅

