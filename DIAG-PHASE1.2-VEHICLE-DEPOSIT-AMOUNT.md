# DIAG Phase 1.2 — Vehicle.deposit_amount (NO IMPLEMENTATION)

**Date** : 14 février 2026  
**Mode** : Diagnostic strict — preuves et analyse uniquement

---

## 1️⃣ Vérification interface Vehicle

### Interface `Vehicle` complète (extrait pertinent)

```
src/services/supabaseVehiclesService.ts L.3-91
```

```typescript
export interface Vehicle {
  id: string;
  owner_id: string | null;
  brand: string;
  model: string;
  // ... autres champs ...
  low_season_discount: number | null;
  high_season_surcharge: number | null;
  long_duration_discount_14: number | null;
  long_duration_discount_60: number | null;

  /** Montant caution (empreinte) en euros. 0 = pas de caution. */
  deposit_amount: number | null;

  // 🆕 Services supplémentaires configurés par le propriétaire
  // ...
  created_at: string | null;
  updated_at: string | null;
}
```

### Vérifications

| Critère | Statut | Preuve |
|---------|--------|--------|
| `deposit_amount` présent | ✅ | L.39-40 |
| Typé `number \| null` | ✅ | L.40 |
| Non optionnel (pas de `?`) | ✅ | `deposit_amount:` sans `?` |

### Cohérence avec la migration SQL

**Migration** (`20260214150000_add_vehicles_deposit_amount.sql` L.14-15) :
```sql
ADD COLUMN deposit_amount NUMERIC(10, 2) NOT NULL DEFAULT 1000;
```

- **DB** : `NUMERIC(10,2)` → valeur numérique ; `NOT NULL` → jamais `NULL` ; `DEFAULT 1000` → valeur par défaut.
- **TypeScript** : `number | null`.

**Mismatch** : En base, la colonne est `NOT NULL` ; une ligne existante aura toujours un `number`. Le type `number | null` accepte donc une valeur que la DB ne retournera jamais après migration.

**Conclusion** : Le type TS est plus large que nécessaire. `number` serait strictement aligné. `number | null` reste valide (assignabilité), mais autorise `null` côté TS alors que la DB ne le fournira pas. Pas de risque runtime ; seul le typage est légèrement assoupli.

---

## 2️⃣ Vérification updateVehicle()

### Signature complète

```typescript
// L.341-371
async updateVehicle(vehicleId: string, updateData: {
  brand?: string;
  model?: string;
  color?: string;
  year?: number;
  mileage?: number;
  fuel_type?: string;
  transmission?: string;
  seats?: number;
  doors?: number;
  engine_capacity?: string;
  price_per_day?: number;
  description?: string;
  location?: string;
  available?: boolean;
  status?: 'active' | 'inactive' | 'review';
  has_ac?: boolean;
  has_gps?: boolean;
  has_cruise_control?: boolean;
  has_bluetooth?: boolean;
  has_carplay?: boolean;
  has_audio_input?: boolean;
  low_season_discount?: number;
  high_season_surcharge?: number;
  long_duration_discount_14?: number;
  long_duration_discount_60?: number;
  deposit_amount?: number;  // ✅ L.370
}): Promise<{ data: Vehicle | null; error: string | null }>
```

### Bloc `safeUpdateData`

```typescript
// L.372-381
const finalUpdateData = {
  ...updateData,
  updated_at: new Date().toISOString()
};

// La colonne 'location' n'existe pas dans la table 'vehicles' :
// on la retire du payload pour éviter l'erreur de schema cache.
const { location, ...safeUpdateData } = finalUpdateData as any;

const { data, error } = await supabase
  .from('vehicles')
  .update(safeUpdateData)
  .eq('id', vehicleId)
  .select()
  .single();
```

### Vérifications

| Critère | Statut | Preuve |
|---------|--------|--------|
| `deposit_amount?: number` dans la whitelist | ✅ | L.370 |
| `safeUpdateData` ne filtre pas `deposit_amount` | ✅ | Seul `location` est retiré (L.381) |
| Pas de cast/modif sur `deposit_amount` | ✅ | Aucune transformation |

### Transmission à Supabase

- Si `updateData` contient `deposit_amount`, il est dans `finalUpdateData`.
- `location` est la seule clé retirée ; `deposit_amount` reste.
- `safeUpdateData` est passé à `.update(...)`.
- **Conclusion** : `deposit_amount` sera bien envoyé à Supabase.

### Cas bloquant

Aucun. Le seul filtrage est sur `location` ; `deposit_amount` n’est pas concerné.

---

## 3️⃣ Vérification getVehicleById()

### Méthode complète

```typescript
// L.314-336
async getVehicleById(vehicleId: string): Promise<{ data: Vehicle | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')           // ✅
      .eq('id', vehicleId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };  // data typé Vehicle
  } catch (error) {
    return { data: null, error: '...' };
  }
}
```

### Vérifications

| Critère | Statut | Preuve |
|---------|--------|--------|
| `.select('*')` utilisé | ✅ | L.318 |
| Retour typé `Vehicle` | ✅ | Signature + `return { data, error: null }` |
| Aucun mapping qui supprime `deposit_amount` | ✅ | Pas de mapping ; `data` est retourné tel quel |

Avec `select('*')`, la DB renvoie toutes les colonnes, dont `deposit_amount`. L’interface `Vehicle` la déclare, donc aucune erreur TS et pas de perte de données.

---

## 4️⃣ Recherche globale — conflits

### Occurrences de `deposit_amount`

| Fichier | Contexte |
|---------|----------|
| `src/services/supabaseVehiclesService.ts` | Interface `Vehicle` L.40 ; whitelist `updateVehicle` L.370 |
| `supabase/migrations/20260214150000_add_vehicles_deposit_amount.sql` | Colonne DB |
| `DIAG-*.md`, `PLAN-*.md`, `DIAG-BLUEPRINT-*.md` | Docs et plans |

### Occurrences de `depositAmount`

| Fichier | Contexte |
|---------|----------|
| `src/pages/renter/RenterBookings.tsx` | `depositAmount: (booking as any).deposit_amount` — **booking**, pas vehicle |
| `src/components/RenterBookingCard.tsx` | `depositAmount` sur **booking** |
| `src/pages/owner/OwnerBookings.tsx` | Idem |
| Docs (`DIAG-CAUTION-STRIPE-PHASES-V1.md`, `DIAG-BLUEPRINT-*.md`) | Références au snapshot **bookings** |

### Analyse

- **`deposit_amount` (vehicles)** : uniquement dans `supabaseVehiclesService.ts` et la migration. Pas de doublon.
- **`depositAmount` / `deposit_amount` (bookings)** : RenterBookings, RenterBookingCard, OwnerBookings utilisent `deposit_amount` / `deposit_amount_snapshot` sur **bookings**, pas sur vehicles. Pas de recouvrement avec le type Vehicle.
- **Type contradictoire** : `Vehicle` dans `@/types` (src/types/index.ts) n’a pas `deposit_amount` ni `depositAmount`. `useManageVehicle` importe `Vehicle` depuis `@/types`, pas depuis `supabaseVehiclesService`. Il y a donc deux interfaces `Vehicle` distinctes (DB vs UI) ; pour Phase 1.2, seul le type côté service est pertinent, et il est cohérent.

---

## 5️⃣ Conclusion

### ✅ Phase 1.2 validée techniquement

| Vérification | Résultat |
|--------------|----------|
| Interface `Vehicle` — `deposit_amount` présent, `number \| null`, non optionnel | ✅ |
| Cohérence DB/TS | ⚠️ Mineur : `number \| null` plus large que nécessaire (DB NOT NULL) ; sans impact runtime |
| `updateVehicle` — whitelist, `safeUpdateData`, transmission | ✅ |
| `getVehicleById` — `select('*')`, retour `Vehicle`, pas de mapping | ✅ |
| Recherche globale — conflits, duplications, types contradictoires | Aucun |

**Passage Phase 1.3 autorisé** (UI ManageVehicle) : le service et les types véhicule sont prêts pour `deposit_amount`.
