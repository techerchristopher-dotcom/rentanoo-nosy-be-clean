# DIAG Phase 2.2 — Snapshot caution à l’acceptation owner (DIAG ONLY)

**Date** : 2026-02-14  
**Objectif** : À l’acceptation (pending → pending_payment), remplir `deposit_amount_snapshot` et `deposit_status`.  
**Aucun code, aucun patch** : preuves uniquement.

---

## 1) Handler "Accepter"

### 1.1 Localisation exacte

| Élément | Valeur |
|--------|--------|
| Fichier | `src/components/OwnerBookingCard.tsx` |
| Fonction | `handleAccept` |
| Lignes | 257-269 (bloc principal), L.260 (appel critique) |

### 1.2 Fonction appelée

`SupabaseBookingsService.updateBookingStatus(booking.id, 'pending_payment')`

Preuve : L.260.

### 1.3 Données disponibles dans le scope

| Donnée | Disponible | Preuve |
|--------|------------|--------|
| `booking.id` | Oui | Utilisé L.260 |
| `booking.vehicleId` | Oui | Utilisé L.286, L.300 dans le bloc message |
| `booking.vehicle` | Oui | Utilisé L.276, L.309 — objet Vehicle (brand, model, dailyPrice, etc.) |
| `booking.renterId` | Oui | L.286 |
| `renter` | Oui | Variable closure (profil locataire) |

**Note** : `booking.vehicle` provient du mapping OwnerBookings. Le Vehicle mappé (L.253-294 OwnerBookings.tsx) n’inclut pas `deposit_amount` dans le type AppVehicle. Donc `booking.vehicle.deposit_amount` n’est pas garanti côté client. Il faut le récupérer côté service.

---

## 2) updateBookingStatus — extrait et usages

### 2.1 Extrait exact actuel

Fichier : `src/services/supabase/bookings.ts` L.221-258.

```
static async updateBookingStatus(
  bookingId: string,
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'active' | 'closed' | 'declined' | 'confirmed' | 'pending_payment' | 'terminated'
): Promise<{ data: SupabaseBooking | null; error: string | null }> {
  try {
    console.log('🔄 [BookingsService] Mise à jour du statut:', bookingId, status);
    const updateData: SupabaseBookingUpdate = {
      status,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select();
    if (error) { ... return { data: null, error: error.message }; }
    if (!data || data.length === 0) { ... return { data: null, error: '...' }; }
    return { data: data[0], error: null };
  } catch (error: any) { ... }
}
```

### 2.2 Usages de updateBookingStatus (SupabaseBookingsService)

| Fichier | Ligne | Contexte | Status passé |
|---------|-------|----------|--------------|
| `src/components/OwnerBookingCard.tsx` | 260 | Clic "Accepter" | `pending_payment` |
| `src/services/supabase/bookings.ts` | 268 | `cancelBooking(bookingId)` | `cancelled` |
| `src/services/checkinReturnService.ts` | 680 | Marquer booking terminé | `terminated` |
| `src/components/RenterBookingCard.tsx` | 499 | Annulation par locataire | `cancelled` |

**Impact** : seul l’appel OwnerBookingCard L.260 (acceptation) doit produire le snapshot. Les trois autres (cancelled, terminated) ne doivent pas être modifiés.

---

## 3) Options minimales — comparaison

### Option A : Nouvelle méthode dédiée

Signature : `updateBookingToPendingPaymentWithDepositSnapshot(bookingId: string, vehicleId: string)`

- Responsabilités : lire `vehicles.deposit_amount`, calculer snapshot + status, UPDATE booking.
- OwnerBookingCard : remplacer `updateBookingStatus(booking.id, 'pending_payment')` par cet appel.
- Autres usages : inchangés.

### Option B : Étendre updateBookingStatus avec payload optionnel

Signature : `updateBookingStatus(bookingId, status, extraPayload?: Partial<...>)`

- Si `status === 'pending_payment'` et payload fourni : fusionner dans `updateData`.
- Risque : tous les callers doivent être revus ; un payload erroné pourrait affecter d’autres mises à jour.

### Recommandation : **Option A**

| Critère | Option A | Option B |
|---------|----------|----------|
| Isolation | Méthode dédiée, un seul flux modifié | Même méthode pour tous les statuts |
| Risque de régression | Faible | Moyen (payload mal propagé, logique conditionnelle) |
| Lisibilité | Nom explicite | Signature plus complexe |
| Évolution | Facile d’ajouter d’autres méthodes ciblées | Logique conditionnelle qui s’alourdit |

---

## 4) Détail pour l’option recommandée (Option A)

### 4.1 SELECT / UPDATE nécessaires

1. **SELECT** : Récupérer `deposit_amount` du véhicule.
   - Table : `vehicles`.
   - Filtre : `id = vehicleId`.
   - Colonne : `deposit_amount`.

2. **UPDATE** : Mettre à jour le booking.
   - Table : `bookings`.
   - Filtre : `id = bookingId`.
   - Colonnes : `status`, `updated_at`, `deposit_amount_snapshot`, `deposit_status`.
   - Valeurs : `status = 'pending_payment'`, `deposit_amount_snapshot` = valeur calculée, `deposit_status` = 'pending' ou 'not_required'.

### 4.2 Service existant pour vehicles.deposit_amount

`SupabaseVehiclesService.getVehicleById(vehicleId)`

- Fichier : `src/services/supabaseVehiclesService.ts` L.316-339.
- Requête : `select('*')` sur `vehicles` → inclut `deposit_amount` (interface Vehicle L.40 : `deposit_amount: number | null`).
- Retour : `{ data: Vehicle | null; error: string | null }`.

### 4.3 Gestion de vehicle.deposit_amount NULL

**Recommandation** : fallback **1000**.

| Raison | Détail |
|--------|--------|
| Cohérence avec la DB | `vehicles.deposit_amount` a `DEFAULT 1000` (migration 20260214150000) |
| Cohérence Phase 1 | ManageVehicle utilise 1000 comme valeur par défaut |
| Edge case | Véhicules antérieurs à la migration ou cas incohérents → 1000 évite un snapshot à 0 non voulu |

Règle : `snapshotAmount = vehicle.deposit_amount ?? 1000`. Si ce montant > 0 : `deposit_status = 'pending'`, sinon `'not_required'`.

---

## 5) Checklist validation micro-impl 2.2

- [ ] **deposit_amount = 1500** : snapshot 1500, deposit_status = 'pending'.
- [ ] **deposit_amount = 0** : snapshot 0, deposit_status = 'not_required'.
- [ ] **deposit_amount = NULL** : snapshot 1000 (fallback), deposit_status = 'pending'.
- [ ] **Bookings existants** : restent NULL sauf si re-acceptés (cas théorique : annulation puis nouvelle demande).
- [ ] **Autres statuts** (cancelled, terminated) : aucun impact sur snapshot.

---

FIN.
