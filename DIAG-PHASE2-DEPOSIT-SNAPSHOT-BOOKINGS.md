# DIAG Phase 2 — Snapshot caution dans bookings (DIAG ONLY)

**Date** : 2026-02-14  
**Objectif Phase 2** : Ajouter un snapshot caution dans bookings à l’acceptation owner (pending → pending_payment) ; affichage read-only côté renter/owner.

---

## Résumé (10 lignes max)

1. Les colonnes `deposit_amount_snapshot` et `deposit_status` **n’existent pas** dans `bookings` ; seule `vehicles.deposit_amount` existe.
2. Le flow d’acceptation est : `OwnerBookingCard` L.260 → `SupabaseBookingsService.updateBookingStatus(booking.id, 'pending_payment')`.
3. `updateBookingStatus` ne met à jour que `status` et `updated_at` (bookings.ts L.231-235).
4. `updateBookingStatus` est utilisé dans 4 contextes : OwnerBookingCard (accepter), RenterBookingCard (annuler), checkinReturnService (terminated), SupabaseBookingsService.cancelBooking.
5. À l’acceptation, `booking.vehicleId` est disponible via `booking.vehicle_id` (raw) / `booking.vehicleId` (mappé).
6. `vehicles.deposit_amount` est récupéré via `SupabaseVehiclesService.getVehicleById` (select *) ou requête join.
7. L’UI renter/owner attend déjà `depositStatus` et `depositAmount` (RenterBookingCard L.395-396, OwnerBookings L.214) mais les colonnes n’existent pas → valeurs toujours null.
8. Emplacement UI recommandé : bloc tarifaire existant (après Total / avant Services) dans `OwnerBookingCard` et `RenterBookingCard`.
9. Bookings existants sans snapshot : `deposit_amount_snapshot` NULL, `deposit_status` NULL → afficher "—" ou masquer.
10. Checklist : migration → snapshot au save → mapping Owner/RenterBookings → affichage read-only.

---

## A) DB — État actuel

### A.1 Colonnes dans `bookings`

| Colonne | Existe ? | Preuve |
|---------|----------|--------|
| `deposit_amount_snapshot` | **NON** | Aucune migration ne l’ajoute. Recherche `supabase/migrations/*.sql` : 0 résultat. |
| `deposit_status` | **NON** | Idem. |
| `deposit_amount` | **NON** (dans bookings) | `deposit_amount` existe uniquement dans `vehicles` (migration `20260214150000_add_vehicles_deposit_amount.sql`). |

**Références** :
- `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` L.199-227 : schéma bookings sans colonnes deposit.
- `supabase/migrations/002_add_service_fee_columns.sql` : ajoute paid_at, stripe_*, amount_total_paid, etc. — pas de deposit.
- `src/integrations/supabase/types.ts` L.18-38 : interface `bookings.Row` sans deposit_amount_snapshot ni deposit_status.

### A.2 Requête SQL de vérification (information_schema)

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'bookings'
  AND column_name IN ('deposit_amount_snapshot', 'deposit_status', 'deposit_amount')
ORDER BY column_name;
```

**Résultat attendu** : 0 lignes (aucune de ces colonnes n’existe).

---

## B) Moment exact du snapshot (preuves)

### B.1 Flow d’acceptation

| Étape | Fichier | Ligne | Constat |
|-------|---------|-------|---------|
| Clic "Accepter" | `src/components/OwnerBookingCard.tsx` | L.260 | `SupabaseBookingsService.updateBookingStatus(booking.id, 'pending_payment')` |
| Mise à jour statut | `src/services/supabase/bookings.ts` | L.221-258 | `updateBookingStatus` : construit `updateData = { status, updated_at }`, fait `.update(updateData).eq('id', bookingId).select()` |

### B.2 Contenu de `updateBookingStatus`

- Fichier : `src/services/supabase/bookings.ts` L.221-258  
- Fait : `updateData = { status, updated_at }` — **aucun autre champ**.

### B.3 Usages de `updateBookingStatus`

| Fichier | Ligne | Contexte |
|---------|-------|----------|
| `src/components/OwnerBookingCard.tsx` | L.260 | Accepter (pending → pending_payment) |
| `src/components/OwnerBookingCard.tsx` | L.449, L.517 | Refuser (via `updateBookingStatusWithReason`) |
| `src/components/RenterBookingCard.tsx` | L.499, L.548 | Annuler (via `updateBookingStatus` ou `updateBookingStatusWithReason`) |
| `src/services/checkinReturnService.ts` | L.680 | Marquer booking terminé (→ `terminated`) |
| `src/services/supabase/bookings.ts` | L.268 | `cancelBooking` délègue à `updateBookingStatus(bookingId, 'cancelled')` |

**Impact** : seul l’appel OwnerBookingCard L.260 (accepter → pending_payment) doit déclencher le snapshot. Les autres changements de statut n’en ont pas besoin.

---

## C) Données nécessaires pour le snapshot

### C.1 `booking.vehicle_id` à l’acceptation

- **OwnerBookingCard** reçoit un `booking` enrichi (OwnerBookings.tsx).
- Mapping OwnerBookings L.193 : `vehicleId: booking.vehicle_id`.
- Donc `booking.vehicleId` est disponible au moment du clic "Accepter".
- Preuve : OwnerBookingCard L.276-277, L.286 : `booking.vehicle`, `booking.vehicleId` utilisés.

### C.2 Récupération de `vehicles.deposit_amount`

| Méthode | Fichier | Lignes | Constat |
|---------|---------|--------|---------|
| `SupabaseVehiclesService.getVehicleById` | `src/services/supabaseVehiclesService.ts` | L.316-333 | `select('*')` — inclut `deposit_amount` (présent dans l’interface Vehicle L.40). |
| `SupabaseVehiclesService.getOwnerVehicles` | `src/services/supabaseVehiclesService.ts` | L.293-310 | `select('*')` — inclut `deposit_amount`. |

**Constats** :
- Aucun join bookings ↔ vehicles dans `getOwnerBookings` (L.436-442) : `select('*')` sur bookings uniquement.
- À l’acceptation, le snapshot peut être obtenu par :  
  `getVehicleById(booking.vehicleId)` → `vehicle.deposit_amount ?? 1000`.

---

## D) UI read-only

### D.1 Affichage actuel deposit_status / deposit_amount

| Composant | Fichier | Lignes | Constat |
|-----------|---------|--------|---------|
| OwnerBookings | `src/pages/owner/OwnerBookings.tsx` | L.214 | `depositStatus: (booking as any).deposit_status || null` — colonne inexistante → toujours null. |
| RenterBookings | `src/pages/renter/RenterBookings.tsx` | L.488-490, L.534-536 | `depositStatus: (booking as any).deposit_status`, `depositAmount: (booking as any).deposit_amount` — colonnes inexistantes → toujours null. |
| RenterBookingCard | `src/components/RenterBookingCard.tsx` | L.395-396 | Utilise `depositStatus`, `depositAmount` pour la logique CTA (showDepositCTA, etc.). |
| OwnerBookingCard | `src/components/OwnerBookingCard.tsx` | L.605-629 | Utilise `depositStatus` pour déterminer l’état (en attente, à venir, en cours). |

**Constat** : L’UI attend déjà ces champs mais ils ne sont jamais renseignés car les colonnes n’existent pas.

### D.2 Emplacement recommandé pour `deposit_amount_snapshot` (read-only)

| Carte | Emplacement exact |
|-------|-------------------|
| **OwnerBookingCard** | Dans le bloc tarifaire, après la ligne "Total" (L.1006-1015) et le Tooltip détail prix, avant la section "Services supplémentaires" (L.1068). Insérer une ligne type : "Caution (empreinte) : X€" si `deposit_amount_snapshot > 0`, sinon ne rien afficher. |
| **RenterBookingCard** | Dans le bloc tarifaire, après "TOTAL" (L.1146-1150) et avant la section "Services supplémentaires" (L.1165). Même logique : "Caution (empreinte) : X€" si `deposit_amount_snapshot > 0`. |

---

## E) Checklist validation Phase 2 (test manuel)

- [ ] **Migration** : Colonnes `deposit_amount_snapshot` (NUMERIC, nullable) et `deposit_status` (TEXT, nullable) ajoutées à `bookings`.
- [ ] **Acceptation owner** : Clic "Accepter" → DB : `deposit_amount_snapshot` rempli (valeur du véhicule au moment du snapshot), `deposit_status` = 'pending' (ou 'not_required' si montant 0).
- [ ] **Renter** : Voit le montant caution en read-only sur la carte (si > 0).
- [ ] **Owner** : Voit le montant caution en read-only sur la carte (si > 0).
- [ ] **Bookings existants** : Sans snapshot → `deposit_amount_snapshot` et `deposit_status` = NULL → affichage masqué ou "—", pas d’erreur.

---

FIN.
