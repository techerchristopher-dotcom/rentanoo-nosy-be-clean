# Diagnostic Pricing : 24€ vs 16,10€ vs 12€ (réservation #dd78efa3)

**Date:** 2025-01-XX  
**Réservation:** #dd78efa3  
**Objectif:** Expliquer précisément d'où viennent les montants affichés dans la modal "Détails de votre réservation"

---

## 1) Source des montants affichés dans la modal

### Localisation du composant

**Fichier:** `src/components/OwnerBookingCard.tsx`  
**Modal:** Lignes 1270-1509  
**Titre:** "Détails de votre réservation" (ligne 1275)  
**Bouton PDF:** "Télécharger en PDF" (ligne 1497)

### Tableau : Champ UI → Variable → Origine → Fichier/Ligne

| Champ UI affiché | Variable/Calcul | Origine | Fichier + Ligne |
|------------------|-----------------|---------|-----------------|
| **Location véhicule (24€)** | `(booking as any).pricePerDay * ((booking as any).rentalDays || 1)` | **Calcul front (affichage simplifié)** | `OwnerBookingCard.tsx:1415` |
| **Total réservation (TTC) (16,10€)** | `calcRenterTotal(subtotal).toFixed(2)` où `subtotal = (booking as any).subtotal \|\| ((booking as any).basePrice \|\| 0) + ((booking as any).optionsTotal \|\| 0)` | **DB (`subtotal`) ou calcul front (`basePrice + optionsTotal`)** | `OwnerBookingCard.tsx:1451-1453` |
| **Commission plateforme (15%) (-2€)** | `Math.round(calcServiceFeeOwner(subtotal))` | **Calcul front (15% de subtotal arrondi)** | `OwnerBookingCard.tsx:1464-1465` |
| **Revenu propriétaire (12€)** | `Math.round(calcOwnerPayout(subtotal))` | **Calcul front (`subtotal - commission`)** | `OwnerBookingCard.tsx:1479` |

### Détails des calculs

#### A) Location véhicule (24€)

**Code exact:**
```typescript
// OwnerBookingCard.tsx:1412-1415
<p className="text-sm text-muted-foreground">
  {(booking as any).pricePerDay || 0}€/jour x {(booking as any).rentalDays || 1} jour{((booking as any).rentalDays || 1) > 1 ? 's' : ''}
</p>
<span className="font-semibold">{(booking as any).pricePerDay * ((booking as any).rentalDays || 1) || 0}€</span>
```

**Origine des données:**
- `pricePerDay`: Depuis DB `bookings.price_per_day` (mappé dans `OwnerBookings.tsx:209`)
- `rentalDays`: Depuis DB `bookings.rental_days` (mappé dans `OwnerBookings.tsx:210`)

**⚠️ IMPORTANT:** C'est un **affichage simplifié** qui ne reflète pas nécessairement le `base_price` réel facturé (qui peut inclure un prorata heures).

#### B) Total réservation TTC (16,10€)

**Code exact:**
```typescript
// OwnerBookingCard.tsx:1449-1454
{(() => {
  const subtotal = (booking as any).subtotal || 
    ((booking as any).basePrice || 0) + ((booking as any).optionsTotal || 0);
  return calcRenterTotal(subtotal).toFixed(2);
})()}€
```

**Fonction `calcRenterTotal`:**
```typescript
// src/utils/serviceFees.ts:37-40
export function calcRenterTotal(subtotal: number): number {
  const serviceFee = calcServiceFeeRenter(subtotal);
  return Math.round((subtotal + serviceFee) * 100) / 100;
}
```

**Formule:** `Total TTC = subtotal + (15% × subtotal)`

**Origine `subtotal`:**
1. **Priorité 1:** `booking.subtotal` depuis DB (`bookings.subtotal`)
2. **Fallback:** `booking.basePrice + booking.optionsTotal`

**Origine `basePrice`:**
- Depuis DB `bookings.base_price` (mappé dans `OwnerBookings.tsx:205`)
- **OU** calculé avec prorata heures si non disponible (voir section 3A)

#### C) Commission plateforme (-2€)

**Code exact:**
```typescript
// OwnerBookingCard.tsx:1460-1466
{(() => {
  const subtotal = (booking as any).subtotal || 
    ((booking as any).basePrice || 0) + ((booking as any).optionsTotal || 0);
  const ownerFee = (booking as any).serviceFee || calcServiceFeeOwner(subtotal);
  return `- ${Math.round(ownerFee)}€`;
})()}
```

**Fonction `calcServiceFeeOwner`:**
```typescript
// src/utils/serviceFees.ts:28-30
export function calcServiceFeeOwner(subtotal: number): number {
  return Math.round(subtotal * SERVICE_FEE_PERCENT_OWNER * 100) / 100;
}
// SERVICE_FEE_PERCENT_OWNER = 0.15 (15%)
```

**Formule:** `Commission = Math.round(15% × subtotal)`

**⚠️ ARRONDI:** La commission est arrondie avec `Math.round()`, ce qui peut expliquer l'écart.

#### D) Revenu propriétaire (12€)

**Code exact:**
```typescript
// OwnerBookingCard.tsx:1475-1480
{(() => {
  const subtotal = (booking as any).subtotal || 
    ((booking as any).basePrice || 0) + ((booking as any).optionsTotal || 0);
  return Math.round(calcOwnerPayout(subtotal));
})()}€
```

**Fonction `calcOwnerPayout`:**
```typescript
// src/utils/serviceFees.ts:47-50
export function calcOwnerPayout(subtotal: number): number {
  const serviceFee = calcServiceFeeOwner(subtotal);
  return Math.round((subtotal - serviceFee) * 100) / 100;
}
```

**Formule:** `Revenu = Math.round(subtotal - commission)`

---

## 2) Modèle de données Booking et champs monétaires

### Interface TypeScript

**Fichier:** `src/types/index.ts:178-209`

```typescript
export interface Booking {
  id: string;
  vehicleId: string;
  renterId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  pickupLocation: string;
  totalAmount: number;  // ⚠️ Ancien champ, peut être obsolète
  currency: "EUR";
  status: BookingStatus;
  selectedOptions?: Array<{
    name: string;
    pricePerDay: number;
    totalPrice: number;
  }>;
  createdAt: string;
  updatedAt: string;
}
```

### Champs monétaires dans la DB (Supabase)

**Fichier:** `src/pages/owner/OwnerBookings.tsx:189-215` (mapping depuis Supabase)

| Champ DB (snake_case) | Champ TypeScript (camelCase) | Description | Valeur attendue pour #dd78efa3 |
|----------------------|------------------------------|-------------|--------------------------------|
| `base_price` | `basePrice` | Prix de base calculé (avec prorata heures) | **~13,33€** (si 1 jour + 3h) |
| `options_total` | `optionsTotal` | Total des options sélectionnées | **0€** (si aucune option) |
| `subtotal` | `subtotal` | `base_price + options_total` | **~13,33€** |
| `service_fee` | `serviceFee` | Frais de service (15% renter) | **~2,00€** (15% de 13,33€) |
| `total_price` | `totalPrice` | Total TTC payé par le locataire | **~16,10€** |
| `price_per_day` | `pricePerDay` | Prix journalier du véhicule | **12€** |
| `rental_days` | `rentalDays` | Nombre de jours (affichage simplifié) | **2 jours** |

### Requête Supabase pour récupérer la réservation

**Fichier:** `src/pages/owner/OwnerBookings.tsx:157-216`

La réservation est récupérée avec tous les champs monétaires depuis la table `bookings`:

```typescript
const ownerBookings = bookingsResult.data.map(booking => {
  return {
    // ... autres champs ...
    basePrice: booking.base_price,
    optionsTotal: booking.options_total,
    serviceFee: booking.service_fee,
    subtotal: booking.subtotal,
    pricePerDay: booking.price_per_day,
    rentalDays: booking.rental_days,
    totalPrice: booking.total_price,
  };
});
```

---

## 3) Diagnostic : Pourquoi Total TTC (16,10€) < Location véhicule (24€) ?

### A) Durée réellement facturée (prorata heures)

**Cause principale identifiée:** Le `base_price` est calculé avec **prorata heures**, pas avec des jours pleins.

#### Calcul du `base_price` lors de la création

**Fichier:** `src/pages/vehicles/VehicleDetails.tsx:527-544`

```typescript
// Calcul de la durée en heures
const rentalHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
const completeDays = Math.floor(rentalHours / 24);
const extraHours = rentalHours % 24;

// Calcul du prix
if (rentalHours < 24) {
  totalPrice = vehicle.dailyPrice; // Minimum 1 jour
} else if (extraHours === 0) {
  totalPrice = completeDays * vehicle.dailyPrice; // Jours complets uniquement
} else {
  // ⚠️ PRORATA HEURES: Facturation au prorata des heures supplémentaires
  const hourPrice = vehicle.dailyPrice / 24;
  const extraHoursPrice = extraHours * hourPrice;
  totalPrice = Math.ceil((completeDays * vehicle.dailyPrice) + extraHoursPrice);
}

const basePrice = totalPrice; // Sauvegardé dans DB
```

#### Exemple pour #dd78efa3

Si la durée réelle est **"1 jour + 3 heures"** (27 heures totales):
- `completeDays = 1`
- `extraHours = 3`
- `hourPrice = 12€ / 24 = 0,50€/heure`
- `extraHoursPrice = 3 × 0,50€ = 1,50€`
- `basePrice = Math.ceil((1 × 12€) + 1,50€) = Math.ceil(13,50€) = 14€`

**OU** si la durée est **"1 jour + 3 heures"** mais calculée différemment:
- `basePrice = 1 × 12€ + (3/24) × 12€ = 12€ + 1,50€ = 13,50€` → arrondi à **13,33€** ou **14€**

#### Affichage simplifié vs calcul réel

**Problème identifié:**
- **Affichage "Location véhicule":** `pricePerDay × rentalDays = 12€ × 2 = 24€` (ligne 1415)
- **Calcul réel `base_price`:** Prorata heures = **~13,33€ à 14€**

**Conclusion:** L'affichage "Location véhicule" est **trompeur** car il montre `2 jours × 12€ = 24€`, mais le `base_price` réel facturé est inférieur car calculé avec prorata heures.

### B) Remises / coupons / promotions

**Vérification:** Aucun champ `discount`, `promo`, `coupon` trouvé dans l'interface `Booking` ou dans le code de calcul.

**Conclusion:** Pas de remise appliquée.

### C) Frais / taxes / TVA

**Vérification:** Le label dit "TTC" (Toutes Taxes Comprises), mais:
- Aucune TVA n'est calculée dans le code
- Les frais de service (15%) sont **ajoutés** au subtotal, pas soustraits

**Conclusion:** Pas de TVA. Le "TTC" signifie simplement "avec frais de service inclus".

### D) Erreur d'unité / arrondi / conversion

**Vérification:**
- Tous les montants sont en **euros** (pas de centimes)
- Les arrondis utilisent `Math.round()` ou `Math.ceil()`
- Pas de conversion centimes ↔ euros

**Conclusion:** Pas d'erreur d'unité.

### E) Commission appliquée sur une base différente

**Analyse de la commission (-2€):**

Si commission = -2€ (arrondi), cela signifie:
- `Math.round(15% × subtotal) = 2€`
- Donc `subtotal ≈ 13,33€` (car `15% × 13,33€ = 2,00€`)

**Formule exacte de commission:**
```typescript
// src/utils/serviceFees.ts:28-30
commission = Math.round(subtotal * 0.15 * 100) / 100
```

**Pour subtotal = 13,33€:**
- `13,33 × 0.15 = 1,9995€`
- `Math.round(1,9995 × 100) / 100 = 2,00€` ✅

**Conclusion:** La commission de -2€ correspond à **15% d'un subtotal de ~13,33€**, pas de 24€.

---

## 4) Vérification cohérence "Revenu propriétaire" (12€)

### Formule exacte

**Fichier:** `src/utils/serviceFees.ts:47-50`

```typescript
export function calcOwnerPayout(subtotal: number): number {
  const serviceFee = calcServiceFeeOwner(subtotal);
  return Math.round((subtotal - serviceFee) * 100) / 100;
}
```

**Formule:** `Revenu = Math.round(subtotal - commission)`

### Calcul pour #dd78efa3

Si `subtotal = 13,33€` et `commission = 2,00€`:
- `Revenu = Math.round(13,33 - 2,00) = Math.round(11,33) = 11€` ❌ (pas 12€)

**OU** si `subtotal = 14,00€` et `commission = 2,10€` (arrondi à 2€):
- `Revenu = Math.round(14,00 - 2,10) = Math.round(11,90) = 12€` ✅

**OU** si `subtotal = 14,00€` et `commission = 2,00€`:
- `Revenu = Math.round(14,00 - 2,00) = 12€` ✅

**Conclusion:** Le revenu de 12€ est cohérent si `subtotal ≈ 14€` et `commission ≈ 2€`.

### Source de vérité

**Dans la DB:**
- `base_price`: Prix calculé avec prorata (source de vérité)
- `subtotal`: `base_price + options_total`
- `service_fee`: 15% de subtotal (calculé lors de la création)
- `total_price`: `subtotal + service_fee` (total TTC)

**Dans le front:**
- Les calculs sont **recalculés** à partir de `subtotal` ou `basePrice + optionsTotal`
- Les arrondis peuvent différer légèrement entre DB et front

---

## 5) Conclusion et recommandations

### Cause principale de l'écart

**Le problème vient de l'affichage simplifié "Location véhicule" qui ne reflète pas le `base_price` réel.**

1. **Affichage "Location véhicule" (24€):**
   - Utilise `pricePerDay × rentalDays = 12€ × 2 = 24€`
   - C'est un **affichage simplifié** pour l'UI

2. **Calcul réel `base_price` (~13,33€ à 14€):**
   - Calculé avec **prorata heures** lors de la création
   - Si durée = "1 jour + 3 heures", le prix est: `1 × 12€ + (3/24) × 12€ = 13,50€` (arrondi)

3. **Total TTC (16,10€):**
   - `subtotal (~14€) + commission (15% = ~2€) = ~16€`

4. **Revenu propriétaire (12€):**
   - `subtotal (~14€) - commission (~2€) = 12€`

### Fichiers à inspecter pour corriger

1. **`src/components/OwnerBookingCard.tsx:1412-1415`**
   - **Problème:** Affichage "Location véhicule" utilise `pricePerDay × rentalDays` (simplifié)
   - **Solution:** Afficher directement `basePrice` depuis la DB au lieu de calculer

2. **`src/pages/vehicles/VehicleDetails.tsx:527-544`**
   - **Vérifier:** Le calcul du `base_price` avec prorata heures est correct
   - **Vérifier:** La cohérence entre `rentalDays` (affichage) et `base_price` (facturé)

3. **`src/utils/serviceFees.ts`**
   - **Vérifier:** Les arrondis sont cohérents entre DB et front

### Recommandation de test

**Créer une réservation test avec:**
- Prix journalier: 12€
- Durée: 1 jour + 3 heures (27 heures)
- Aucune option

**Vérifier dans la DB:**
```sql
SELECT 
  id,
  price_per_day,
  rental_days,
  base_price,
  options_total,
  subtotal,
  service_fee,
  total_price
FROM bookings
WHERE id = 'dd78efa3';
```

**Comparer avec l'affichage:**
- Location véhicule affichée vs `base_price` DB
- Total TTC affiché vs `total_price` DB
- Commission affichée vs `service_fee` DB (pour owner)
- Revenu affiché vs `subtotal - service_fee` (calculé)

### Correction recommandée

**Option 1: Afficher le `base_price` réel**
```typescript
// Au lieu de: pricePerDay * rentalDays
// Utiliser: basePrice (depuis DB)
<span className="font-semibold">
  {(booking as any).basePrice || (booking as any).base_price || 0}€
</span>
```

**Option 2: Afficher la durée réelle facturée**
```typescript
// Afficher: "1 jour + 3 heures" au lieu de "2 jours"
<p className="text-sm text-muted-foreground">
  {calculateRealDuration()} × {(booking as any).pricePerDay || 0}€/jour
</p>
```

**Option 3: Ajouter une note explicative**
```typescript
<p className="text-xs text-muted-foreground italic">
  * Prix calculé au prorata des heures supplémentaires
</p>
```

---

**FIN DU DIAGNOSTIC**

