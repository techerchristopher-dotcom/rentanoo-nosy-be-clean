# DIAG STRICT — Pourquoi le snapshot caution n’est pas écrit (Phase 2)

**Date** : 2026-02-14  
**Symptôme** : Booking accepté → `bookings.status = 'pending_payment'` ✅ mais `deposit_amount_snapshot` et `deposit_status` restent NULL.

---

## 1) Écritures de status = 'pending_payment'

### 1.1 Recherche `"pending_payment"` dans src/

| Fichier | Ligne | Contexte |
|---------|-------|----------|
| src/services/supabase/bookings.ts | 283 | `status: 'pending_payment' as const` dans `updateBookingToPendingPaymentWithDepositSnapshot` |
| (autres) | - | Lectures/filtres uniquement (RenterBookings, OwnerBookings, status-badge, etc.) |

**Seul endroit qui écrit** : `updateBookingToPendingPaymentWithDepositSnapshot` L.283.

### 1.2 Recherche `updateBookingStatus(` dans src/

| Fichier | Ligne | Appel |
|---------|-------|-------|
| src/components/RenterBookingCard.tsx | 499 | `updateBookingStatus(booking.id, 'cancelled')` |
| src/services/supabase/bookings.ts | 222 | Définition de la méthode |
| src/services/supabase/bookings.ts | 316 | `cancelBooking` délègue à `updateBookingStatus(..., 'cancelled')` |
| src/services/checkinReturnService.ts | 680 | `updateBookingStatus(bookingId, 'terminated')` |
| src/services/bookings.ts | 137 | Méthode différente (API legacy) |

**Constat** : `updateBookingStatus` n’est jamais appelé avec `'pending_payment'` dans le code actuel.  
Seul `updateBookingToPendingPaymentWithDepositSnapshot` fait passer un booking en `pending_payment`.

### 1.3 Recherche `.update(` sur la table `bookings`

| Fichier | Lignes | Méthode |
|---------|--------|---------|
| src/services/supabase/bookings.ts | 194-196 | `updateBookingStatusWithReason` |
| src/services/supabase/bookings.ts | 237-239 | `updateBookingStatus` |
| src/services/supabase/bookings.ts | 289-291 | `updateBookingToPendingPaymentWithDepositSnapshot` |

---

## 2) Handlers UI “Accepter” côté owner

### 2.1 Bouton “Accepter” et handlers

| Page/Composant | Fichier | Ligne | Handler | Service appelé |
|----------------|---------|-------|---------|----------------|
| OwnerBookingCard (liste bookings) | OwnerBookingCard.tsx | L.1166, L.1172 | `handleAccept` | `SupabaseBookingsService.updateBookingToPendingPaymentWithDepositSnapshot(booking.id, booking.vehicleId)` |
| OwnerBookings (onglet requests) | OwnerBookings.tsx | L.409 | `handleAcceptRequest` | Aucun — TODO, toast seul |
| OwnerBookingRequests | OwnerBookingRequests.tsx | L.133, L.347 | `handleAcceptRequest` | Aucun — TODO, toast seul |
| OwnerBookingDiscussion | OwnerBookingDiscussion.tsx | L.305, L.501 | `handleAcceptRequest` | Aucun — TODO, toast seul |

**Seul handler qui modifie vraiment le statut** : `OwnerBookingCard.handleAccept` (L.257-260).

---

## 3) Pas de 2e OwnerBookingCard

| Fichier | Import | Rendu |
|---------|--------|-------|
| src/pages/owner/OwnerBookings.tsx | L.31 `import OwnerBookingCard from "@/components/OwnerBookingCard"` | L.715-731 `ownerBookings` → `filteredBookings.map` → `<OwnerBookingCard key={booking.id} booking={...} />` |

Un seul composant `OwnerBookingCard` est utilisé, importé depuis `@/components/OwnerBookingCard`.  
Aucun doublon trouvé.

---

## 4) Implémentation au runtime

### 4.1 Code actuel OwnerBookingCard.handleAccept

**Fichier** : `src/components/OwnerBookingCard.tsx` L.257-260

```ts
const handleAccept = async () => {
  setIsUpdating(true)
  try {
    const result = await SupabaseBookingsService.updateBookingToPendingPaymentWithDepositSnapshot(booking.id, booking.vehicleId)
```

**Appel utilisé** : `updateBookingToPendingPaymentWithDepositSnapshot` ✅ (avec snapshot)

### 4.2 Diff “avant/après” (chemin d’exécution)

| Avant (Phase 2.2) | Après (Phase 2.2) |
|-------------------|-------------------|
| `updateBookingStatus(booking.id, 'pending_payment')` | `updateBookingToPendingPaymentWithDepositSnapshot(booking.id, booking.vehicleId)` |
| Met à jour uniquement `status` et `updated_at` | Récupère `vehicles.deposit_amount`, calcule snapshot, met à jour `status`, `updated_at`, `deposit_amount_snapshot`, `deposit_status` |

Si l’ancienne version était encore utilisée (build non régénéré), seul le statut serait mis à jour, sans snapshot.

---

## 5) Donnée `vehicleId` à l’acceptation

### 5.1 Mapping OwnerBookings

**Fichier** : `src/pages/owner/OwnerBookings.tsx` L.193

```ts
vehicleId: booking.vehicle_id,
```

`vehicle_id` provient de `getOwnerBookings` (select `*`), donc toujours présent pour un booking valide.

### 5.2 Type Booking

**Fichier** : `src/types/index.ts` L.183

```ts
vehicleId: string;  // non optionnel
```

### 5.3 Enrichissement

`enrichedBookings` fait `return { ...booking, renter, vehicle, ... }` (L.286-292).  
`vehicleId` reste inchangé.

**Conclusion** : `booking.vehicleId` est disponible et non-null pour les bookings affichés.

---

## 6) Migration DB — prérequis critique

**Fichiers de migration présents** (dépôt) :

- `20260214150000_add_vehicles_deposit_amount.sql` (colonne `vehicles.deposit_amount`)
- **Aucune migration** pour `bookings.deposit_amount_snapshot` ni `bookings.deposit_status`

**DIAG Phase 2.1** : décrit la migration à créer, mais **aucun fichier de migration prêt à pousser**.

**Impact** : si ces colonnes n’existent pas en DB, l’`update` contenant `deposit_amount_snapshot` et `deposit_status` peut échouer, ou ces champs seront ignorés selon le comportement de PostgREST.

---

## Tableau : chemins qui amènent un booking à `pending_payment`

| # | Fichier | Lignes | Fonction / flux | Snapshot écrit ? |
|---|---------|--------|------------------|------------------|
| 1 | OwnerBookingCard.tsx | 257-260 | `handleAccept` → `updateBookingToPendingPaymentWithDepositSnapshot` | **OUI** (par conception) |
| 2 | (ancien code) | - | `handleAccept` → `updateBookingStatus(..., 'pending_payment')` | **NON** |

---

## Conclusion : cause la plus probable

**Cause la plus probable** : **exécution d’une ancienne version du frontend** dans laquelle `handleAccept` appelle encore `updateBookingStatus` au lieu de `updateBookingToPendingPaymentWithDepositSnapshot`.

**Preuves à l’appui** :
1. Le code actuel utilise bien `updateBookingToPendingPaymentWithDepositSnapshot`.
2. `updateBookingStatus` ne met à jour que `status` et `updated_at`, pas les colonnes de snapshot.
3. Le symptôme (status mis à jour, snapshot restant NULL) correspond à l’utilisation de `updateBookingStatus`.
4. Aucun autre flux n’écrit `pending_payment` dans le dépôt.

**Actions recommandées** :
1. Rebuild / redéployer le frontend pour garantir l’usage du code actuel.
2. Vérifier en DB que les colonnes `deposit_amount_snapshot` et `deposit_status` existent ; sinon, créer et appliquer la migration Phase 2.1.
3. Ajouter un log dans `handleAccept` (ex. avant l’appel) pour confirmer au runtime que c’est bien `updateBookingToPendingPaymentWithDepositSnapshot` qui est invoqué.

---

FIN.
