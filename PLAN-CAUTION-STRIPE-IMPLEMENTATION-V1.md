# Plan Caution Stripe — Implémentation V1

**Date** : 14 février 2026  
**Objectif** : Plan clair + implémentation pour ajouter la caution Stripe (hold 48h avant, libération/capture 48h après)  
**Mode** : Documentation uniquement — aucune modification de fichiers

---

## A) Localisation précise

### A1. Vehicle settings UI et update vehicles

| Élément | Fichier | Emplacement / Contenu |
|---------|---------|------------------------|
| **Onglets véhicule** | `src/pages/owner/ManageVehicle.tsx` | L.1616 : `Tabs` avec `TabsList`, valeurs : `vehicle-info`, `listing`, `pricing`, `photos`, `preview` |
| **Onglet Tarifs (où ajouter caution)** | `src/pages/owner/ManageVehicle.tsx` | L.2033-3199 : `TabsContent value="pricing"` — section "Tarifs & conditions" |
| **Exemple input tarif** | `src/pages/owner/ManageVehicle.tsx` | L.2095-2115 : Input `pricePerDay` avec Label, onChange via `handleInputChange("pricePerDay", e.target.value)` |
| ** handleInputChange** | `src/pages/owner/ManageVehicle.tsx` | Rechercher `handleInputChange` ou `updateField` — le hook expose `updateField` |
| **Sauvegarde** | `src/pages/owner/ManageVehicle.tsx` | L.1153 : `handleSave()` — appelle `SupabaseVehiclesService.updateVehicle(vehicle.id, xxxUpdateData)` |
| **Blocs de données envoyées** | `src/pages/owner/ManageVehicle.tsx` | L.1261-1375 : `baseUpdateData`, `pricingUpdateData`, `bookingUpdateData`, etc. |
| **Service update** | `src/services/supabaseVehiclesService.ts` | L.368-407 : `updateVehicle(vehicleId, updateData)` → `supabase.from('vehicles').update(safeUpdateData)` |
| **Hook formData** | `src/features/vehicle-management/hooks/useManageVehicle.ts` | L.92-178 : `setFormData` avec mapping depuis `vehicleData` (snake_case DB → camelCase form) |
| **Types formulaire** | `src/features/vehicle-management/types/vehicle-form.types.ts` | L.8-105 : `VehicleFormData` — ajouter `depositAmount: string` |
| **Valeurs initiales** | `src/features/vehicle-management/types/vehicle-form.types.ts` | L.137-211 : `initialFormData` — ajouter `depositAmount: "1000"` |

**Extrait existant (pattern à suivre pour deposit_amount) :**

```tsx
// ManageVehicle.tsx ~L.2095 - pattern Input
<Label htmlFor="pricePerDay">Prix journalier de base *</Label>
<Input
  id="pricePerDay"
  type="number"
  value={formData.pricePerDay}
  onChange={(e) => handleInputChange("pricePerDay", e.target.value)}
  placeholder="50"
  min="1"
  step="0.01"
/>
```

**Où insérer l’input caution :** Dans `TabsContent value="pricing"`, après le bloc "Prix journalier de base" (~L.2117), ajouter une section :

```
Caution (empreinte bancaire)
- Label : "Montant de la caution (€)"
- Input number, placeholder "1000", min 0, step 1
- Texte d’aide : "Montant bloqué sur la carte 48h avant le départ, libéré 48h après le retour."
```

---

### A2. Affichage booking payé + actions côté renter

| Élément | Fichier | Emplacement / Contenu |
|---------|---------|------------------------|
| **Liste des bookings** | `src/pages/renter/RenterBookings.tsx` | Boucle sur `filteredBookings` → `<RenterBookingCard key={...} booking={...} />` |
| **Carte réservation** | `src/components/RenterBookingCard.tsx` | Composant principal — affichage statut, boutons d’action |
| **Logique statut + deposit** | `src/components/RenterBookingCard.tsx` | L.391-457 : `getUserBookingStatusUI()` — utilise `depositStatus`, `depositAmount` |
| **Cas "caution en attente"** | `src/components/RenterBookingCard.tsx` | L.399-408 : `confirmed + deposit_status pending` → `showDepositCTA: true`, `depositCTALabel: t('bookings.card.finalizeBooking')` |
| **Bouton "Je paye ma caution"** | `src/components/RenterBookingCard.tsx` | L.1196-1246 : Bouton visible si `statusUI?.showDepositCTA` — appelle `onRequestPay?.({ ... })` |
| **Problème actuel** | `src/pages/renter/RenterBookings.tsx` | L.934-971 : `PaymentFlowModal` + `onPayNow={payerLocation}` — modal de paiement **location**, pas caution |
| **Wiring onRequestPay** | `src/pages/renter/RenterBookings.tsx` | `RenterBookingCard` reçoit `onRequestPay` — utilisé pour location ET pour caution (même CTA) |

**Correction à prévoir :**  
- Distinguer `onRequestPay` (paiement location) de `onRequestDeposit` (enregistrement carte caution).  
- Quand `showDepositCTA` : le bouton doit appeler `onRequestDeposit(booking)` et ouvrir une **DepositFlowModal** (SetupIntent).  
- Quand `pending_payment` : le bouton appelle `onRequestPay` et ouvre **PaymentFlowModal** (existant).

---

### A3. Stockage / mise à jour deposit_status dans l’UI

| Élément | Fichier | Détail |
|---------|---------|--------|
| **Source données** | `src/pages/renter/RenterBookings.tsx` | L.488-490, 534-536 : `depositStatus: (booking as any).deposit_status`, `depositAmount: (booking as any).deposit_amount` |
| **Enrichissement booking** | `src/pages/renter/RenterBookings.tsx` | Mapping de la réponse Supabase (select `*`) vers objet enrichi passé à `RenterBookingCard` |
| **Requête Supabase** | `src/services/supabase/bookings.ts` | `getRenterBookings` — select `*` ; une fois les colonnes créées, `deposit_status`, `deposit_amount_snapshot` seront automatiquement retournées |
| **Mise à jour côté client** | N/A (read-only) | `deposit_status` est mis à jour uniquement par : webhooks Stripe, jobs cron, endpoints admin |

**À faire :**  
1. Inclure `deposit_status`, `deposit_amount_snapshot` dans le `select` des bookings (ou garder `*` après migration).  
2. S’assurer que `RenterBookings` et `OwnerBookings` mappent ces champs vers `depositStatus`, `depositAmount` (ou `depositAmountSnapshot`).

---

## B) Migrations SQL Supabase

```sql
-- ============================================================
-- Migration 1: vehicles.deposit_amount
-- ============================================================
-- Fichier suggéré: supabase/migrations/YYYYMMDDHHMMSS_add_deposit_amount_vehicles.sql

ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2) DEFAULT 1000;

COMMENT ON COLUMN public.vehicles.deposit_amount IS 'Montant de la caution (empreinte) en euros, par véhicule';


-- ============================================================
-- Migration 2: bookings - colonnes caution
-- ============================================================
-- Fichier suggéré: supabase/migrations/YYYYMMDDHHMMSS_add_deposit_columns_bookings.sql

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS deposit_amount_snapshot NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT 'pending'
  CHECK (deposit_status IN ('pending', 'card_registered', 'held', 'released', 'captured_partial', 'captured_full', 'failed')),
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT,
ADD COLUMN IF NOT EXISTS deposit_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS deposit_hold_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deposit_capture_before TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deposit_extended_auth_status TEXT;

COMMENT ON COLUMN public.bookings.deposit_amount_snapshot IS 'Snapshot du montant caution du véhicule au moment de la réservation';
COMMENT ON COLUMN public.bookings.deposit_status IS 'Statut de la caution: pending, card_registered, held, released, captured_partial, captured_full, failed';
COMMENT ON COLUMN public.bookings.stripe_payment_method_id IS 'ID PaymentMethod Stripe (pm_xxx) pour hold off_session';
COMMENT ON COLUMN public.bookings.deposit_payment_intent_id IS 'ID PaymentIntent caution (pi_xxx)';
COMMENT ON COLUMN public.bookings.deposit_hold_created_at IS 'Date/heure création du hold';
COMMENT ON COLUMN public.bookings.deposit_capture_before IS 'Date limite capture (depuis Stripe charge.payment_method_details.card.capture_before)';
COMMENT ON COLUMN public.bookings.deposit_extended_auth_status IS 'Status extended auth: enabled | disabled';


-- ============================================================
-- Migration 3: profiles.stripe_customer_id
-- ============================================================
-- Fichier suggéré: supabase/migrations/YYYYMMDDHHMMSS_add_stripe_customer_id_profiles.sql

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'ID Stripe Customer (cus_xxx) pour paiements off_session';
```

---

## C) Endpoints Express à créer

**Fichier** : `server/index.ts` (après les routes existantes, avant le `app.listen`)

| Endpoint | Méthode | Rôle | Pseudo-code |
|----------|---------|------|-------------|
| `/api/deposit/create-setup-intent` | POST | Créer SetupIntent pour enregistrer carte | Voir C1 |
| `/api/deposit/attach-payment-method` | POST | Attacher pm + mettre à jour booking | Voir C2 |
| `/api/cron/deposit-hold` | POST | Job J-2 : créer et confirmer PaymentIntent | Voir C3 |
| `/api/cron/deposit-release` | POST | Job J+2 : cancel ou capture | Voir C4 |
| `/api/admin/deposit-capture` | POST | Capture partielle manuelle | Voir C5 |
| `/api/admin/deposit-cancel` | POST | Annuler le hold | Voir C6 |

### C1. POST /api/deposit/create-setup-intent

**Body :** `{ bookingId: string }`  
**Auth :** JWT Supabase (header `Authorization: Bearer <token>`)  
**Réponse :** `{ clientSecret: string }`

```txt
1. Vérifier auth.uid()
2. Récupérer booking par id, vérifier user_id === auth.uid()
3. Vérifier status IN ('accepted','confirmed') ET deposit_status === 'pending'
4. Récupérer profile pour stripe_customer_id (ou null)
5. Si pas de stripe_customer_id: stripe.customers.create({ email }) → sauvegarder en profiles
6. stripe.setupIntents.create({
     customer: stripe_customer_id,
     payment_method_types: ['card'],
     usage: 'off_session',
     metadata: { bookingId }
   })
7. return { clientSecret: si.client_secret }
```

### C2. POST /api/deposit/attach-payment-method

**Body :** `{ bookingId: string, paymentMethodId: string }`  
**Auth :** JWT  
**Réponse :** `{ ok: true }`

```txt
1. Vérifier auth.uid(), booking.user_id
2. Attacher pm au customer si besoin (stripe.paymentMethods.attach)
3. supabaseAdmin.from('bookings').update({
     stripe_payment_method_id: paymentMethodId,
     deposit_status: 'card_registered'
   }).eq('id', bookingId)
4. return { ok: true }
```

### C3. POST /api/cron/deposit-hold

**Protection :** `X-Cron-Secret: process.env.CRON_SECRET`  
**Réponse :** `{ processed: number }`

```txt
1. if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) return 401
2. Requête bookings (voir section D)
3. Pour chaque booking: créer PaymentIntent amount=deposit_amount_snapshot*100, capture_method=manual,
   payment_method=stripe_payment_method_id, confirm=true, off_session=true,
   payment_method_options: { card: { request_extended_authorization: 'if_available' } }
4. Récupérer latest_charge, capture_before, extended_authorization.status
5. Update booking: deposit_payment_intent_id, deposit_status='held', deposit_hold_created_at, deposit_capture_before, deposit_extended_auth_status
6. Gérer requires_action → deposit_status='failed' ou notifier
```

### C4. POST /api/cron/deposit-release

**Protection :** idem C3

```txt
1. Requête bookings à release (voir section D)
2. Pour chaque: stripe.paymentIntents.cancel(deposit_payment_intent_id)
3. Update booking: deposit_status='released'
```

### C5. POST /api/admin/deposit-capture

**Body :** `{ bookingId: string, amount: number }` (amount en euros)  
**Auth :** admin (vérifier role ou secret)

```txt
1. stripe.paymentIntents.capture(deposit_payment_intent_id, { amount_to_capture: amount*100 })
2. Update booking: deposit_status='captured_partial' ou 'captured_full'
```

### C6. POST /api/admin/deposit-cancel

**Body :** `{ bookingId: string }`

```txt
1. stripe.paymentIntents.cancel(deposit_payment_intent_id)
2. Update booking: deposit_status='released'
```

---

## D) Requêtes DB pour jobs hold/release

### D1. Bookings à HOLD (J-2)

```sql
-- Début location = start_date + start_time
-- Hold à déclencher si (start_date, start_time) - 48h <= now()

SELECT b.id, b.user_id, b.vehicle_id, b.stripe_payment_method_id, b.deposit_amount_snapshot,
       b.start_date, b.start_time, b.end_date, b.end_time,
       p.stripe_customer_id
FROM bookings b
LEFT JOIN profiles p ON p.id = b.user_id
WHERE b.deposit_status = 'card_registered'
  AND b.stripe_payment_method_id IS NOT NULL
  AND b.deposit_amount_snapshot IS NOT NULL
  AND b.deposit_amount_snapshot > 0
  AND b.status IN ('accepted', 'confirmed')
  AND (
    (b.start_date::date + COALESCE(b.start_time::time, '00:00'::time)::interval)
    - interval '48 hours'
  ) <= now()
  AND b.deposit_payment_intent_id IS NULL;
```

**Version simplifiée (sans start_time si absent) :**

```sql
SELECT b.id, b.user_id, b.stripe_payment_method_id, b.deposit_amount_snapshot, p.stripe_customer_id
FROM bookings b
LEFT JOIN profiles p ON p.id = b.user_id
WHERE b.deposit_status = 'card_registered'
  AND b.stripe_payment_method_id IS NOT NULL
  AND b.deposit_amount_snapshot > 0
  AND b.status IN ('accepted', 'confirmed')
  AND (b.start_date + COALESCE(b.start_time, '06:00')::interval - interval '48 hours') <= now()
  AND b.deposit_payment_intent_id IS NULL;
```

### D2. Bookings à RELEASE (J+2)

```sql
-- Fin location = end_date + end_time
-- Release à déclencher si now() >= (end_date, end_time) + 48h

SELECT b.id, b.deposit_payment_intent_id
FROM bookings b
WHERE b.deposit_status = 'held'
  AND b.deposit_payment_intent_id IS NOT NULL
  AND (
    (b.end_date::date + COALESCE(b.end_time::time, '18:00'::time)::interval)
    + interval '48 hours'
  ) <= now();
```

**Version simplifiée :**

```sql
SELECT b.id, b.deposit_payment_intent_id
FROM bookings b
WHERE b.deposit_status = 'held'
  AND b.deposit_payment_intent_id IS NOT NULL
  AND (b.end_date + COALESCE(b.end_time, '18:00')::interval + interval '48 hours') <= now();
```

---

## E) Webhooks Stripe additionnels

**Fichier :** `server/index.ts` — étendre le handler existant `/api/stripe/webhook`

| Événement | Mapping deposit_status |
|-----------|------------------------|
| `setup_intent.succeeded` | Rien (attach géré côté client après confirm) |
| `setup_intent.setup_failed` | Optionnel : log, notification si metadata.bookingId |
| `payment_intent.succeeded` | Si metadata.type === 'deposit' → `deposit_status = 'held'` (si requires_capture) |
| `payment_intent.payment_failed` | Si metadata.type === 'deposit' → `deposit_status = 'failed'` |
| `payment_intent.canceled` | Si metadata.type === 'deposit' → `deposit_status = 'released'` |
| `payment_intent.amount_capturable_updated` | Pas d’action obligatoire |

**Pseudo-code :**

```txt
switch (event.type) {
  case 'checkout.session.completed':
    // Existant — paiement location
    break;
  case 'payment_intent.succeeded':
    const pi = event.data.object;
    if (pi.metadata?.type === 'deposit' && pi.status === 'requires_capture') {
      // Récupérer capture_before depuis latest_charge
      const charge = pi.latest_charge;
      const captureBefore = charge?.payment_method_details?.card?.capture_before;
      const extAuth = charge?.payment_method_details?.card?.extended_authorization?.status;
      await supabaseAdmin.from('bookings').update({
        deposit_status: 'held',
        deposit_hold_created_at: new Date().toISOString(),
        deposit_capture_before: captureBefore ? new Date(captureBefore*1000).toISOString() : null,
        deposit_extended_auth_status: extAuth || null,
      }).eq('id', pi.metadata.bookingId);
    }
    break;
  case 'payment_intent.payment_failed':
    if (event.data.object.metadata?.type === 'deposit') {
      await supabaseAdmin.from('bookings').update({ deposit_status: 'failed' })
        .eq('id', event.data.object.metadata.bookingId);
    }
    break;
  case 'payment_intent.canceled':
    if (event.data.object.metadata?.type === 'deposit') {
      await supabaseAdmin.from('bookings').update({ deposit_status: 'released' })
        .eq('id', event.data.object.metadata.bookingId);
    }
    break;
}
```

**Metadata PaymentIntent :** Lors de la création du PI dans le job hold, passer `metadata: { bookingId, type: 'deposit' }`.

---

## F) Implementation Plan — Étapes 1 à 8

### Étape 1 : Migrations DB  
**Durée estimée :** 15 min

- [ ] Créer et exécuter migration `vehicles.deposit_amount`
- [ ] Créer et exécuter migration `bookings` (deposit_*)
- [ ] Créer et exécuter migration `profiles.stripe_customer_id`
- [ ] Mettre à jour `src/integrations/supabase/types.ts` si nécessaire (génération types)

---

### Étape 2 : Montant caution par véhicule (UI)  
**Durée estimée :** 30 min

- [ ] Ajouter `depositAmount` dans `VehicleFormData` et `initialFormData` (`vehicle-form.types.ts`)
- [ ] Dans `useManageVehicle.loadVehicle`, mapper `vehicleData.deposit_amount` → `formData.depositAmount`
- [ ] Dans `ManageVehicle.tsx` onglet "pricing", ajouter input "Montant caution (€)" + texte d’aide
- [ ] Dans `handleSave`, ajouter `deposit_amount: parseFloat(formData.depositAmount) || 1000` dans un bloc `depositUpdateData` et appeler `SupabaseVehiclesService.updateVehicle(vehicle.id, depositUpdateData)`

---

### Étape 3 : Snapshot caution à la réservation  
**Durée estimée :** 20 min

- [ ] Dans `SupabaseBookingsService.createBooking`, récupérer `deposit_amount` du véhicule (`vehicles.deposit_amount`) et l’ajouter à `insertData` comme `deposit_amount_snapshot`
- [ ] Ou : au moment de l’acceptation par le propriétaire (update status → pending_payment), faire un update qui set `deposit_amount_snapshot` depuis `vehicles.deposit_amount`
- [ ] Vérifier que le booking créé a bien `deposit_amount_snapshot` et `deposit_status = 'pending'`

---

### Étape 4 : Endpoints Express deposit  
**Durée estimée :** 1h

- [ ] Implémenter `POST /api/deposit/create-setup-intent`
- [ ] Implémenter `POST /api/deposit/attach-payment-method`
- [ ] Implémenter `POST /api/cron/deposit-hold` (protégé `X-Cron-Secret`)
- [ ] Implémenter `POST /api/cron/deposit-release` (protégé `X-Cron-Secret`)
- [ ] Implémenter `POST /api/admin/deposit-capture` et `POST /api/admin/deposit-cancel`
- [ ] Ajouter variable `CRON_SECRET` dans `.env` et `.env.local.example`

---

### Étape 5 : Webhooks Stripe  
**Durée estimée :** 30 min

- [ ] Étendre le handler webhook pour `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`
- [ ] Configurer ces événements dans le Dashboard Stripe pour l’endpoint webhook
- [ ] Tester avec Stripe CLI : `stripe trigger payment_intent.succeeded`

---

### Étape 6 : Modale caution (SetupIntent) + flow frontend  
**Durée estimée :** 1h30

- [ ] Créer composant `DepositFlowModal.tsx` : texte explicatif (empreinte, 48h avant/après, capture partielle), `CardElement` ou `PaymentElement` pour SetupIntent
- [ ] Créer `src/lib/depositCaution.ts` : `createSetupIntentClientSecret(bookingId)`, `attachPaymentMethod(bookingId, pmId)`
- [ ] Dans `RenterBookings.tsx` : ajouter state `depositModalBooking`, `onRequestDeposit(booking)` → ouvrir `DepositFlowModal`
- [ ] Dans `RenterBookingCard` : si `showDepositCTA`, le bouton appelle `onRequestDeposit?.(booking)` au lieu de `onRequestPay`
- [ ] Après succès SetupIntent : appeler `attach-payment-method` puis fermer la modale et rafraîchir les bookings

---

### Étape 7 : Scheduler n8n Cron  
**Durée estimée :** 30 min

- [ ] Workflow n8n "deposit-hold" : Cron (ex. toutes les 6h ou 2x/jour) → HTTP Request POST `https://<API>/api/cron/deposit-hold` avec header `X-Cron-Secret`
- [ ] Workflow n8n "deposit-release" : Cron (ex. toutes les 6h) → HTTP Request POST `https://<API>/api/cron/deposit-release`
- [ ] Vérifier que l’API est accessible depuis n8n (URL publique, HTTPS)

---

### Étape 8 : Intégration UI deposit_status  
**Durée estimée :** 20 min

- [ ] S’assurer que les selects bookings incluent `deposit_status`, `deposit_amount_snapshot`
- [ ] Adapter `getUserBookingStatusUI` si nouveaux statuts (`card_registered`, `held`, etc.)
- [ ] Afficher un badge "Caution enregistrée" quand `deposit_status === 'card_registered'`
- [ ] Afficher un badge "Caution bloquée" quand `deposit_status === 'held'`

---

## Checklist de tests end-to-end

| # | Scénario | Étapes | Résultat attendu |
|---|----------|--------|------------------|
| 1 | Créer véhicule avec caution 1000€ | Onglet Tarifs → input caution 1000 → Save | `vehicles.deposit_amount = 1000` |
| 2 | Réservation avec snapshot | Créer réservation → accepter | `bookings.deposit_amount_snapshot = 1000` |
| 3 | Payer location | Paiement Stripe Checkout | `status = accepted/confirmed`, `paid_at` renseigné |
| 4 | Enregistrer carte caution | Bouton "Je paye ma caution" → modale → saisie carte → Succès | `deposit_status = 'card_registered'`, `stripe_payment_method_id` renseigné |
| 5 | Job hold J-2 | Démarrer job cron (ou appel manuel) avec booking dont start_date - 48h <= now | `deposit_status = 'held'`, `deposit_payment_intent_id` renseigné, PI `requires_capture` |
| 6 | Job release J+2 | Démarrer job avec booking dont end_date + 48h <= now | `deposit_status = 'released'`, PI annulé |
| 7 | Capture partielle admin | Appeler `/api/admin/deposit-capture` avec montant | Montant débité, `deposit_status = 'captured_partial'` ou `'captured_full'` |
| 8 | Carte refusée (hold) | Carte de test `4000000000000002` | `deposit_status = 'failed'` (webhook) |
| 9 | SCA (3D Secure) | Carte `4000002500003155` | `requires_action` → redirection client pour authentification |

---

## Liste exacte des fichiers à toucher

| Fichier | Modifications |
|---------|----------------|
| `supabase/migrations/YYYYMMDDHHMMSS_add_deposit_amount_vehicles.sql` | **Créer** — migration vehicles |
| `supabase/migrations/YYYYMMDDHHMMSS_add_deposit_columns_bookings.sql` | **Créer** — migration bookings |
| `supabase/migrations/YYYYMMDDHHMMSS_add_stripe_customer_id_profiles.sql` | **Créer** — migration profiles |
| `src/features/vehicle-management/types/vehicle-form.types.ts` | Ajouter `depositAmount` |
| `src/features/vehicle-management/hooks/useManageVehicle.ts` | Mapper `deposit_amount` dans loadVehicle |
| `src/pages/owner/ManageVehicle.tsx` | Input caution + handleSave deposit_update |
| `src/services/supabase/bookings.ts` | Snapshot `deposit_amount_snapshot` à la création/acceptation |
| `server/index.ts` | 6 routes deposit + extension webhook |
| `src/lib/depositCaution.ts` | **Créer** — appels API deposit |
| `src/components/DepositFlowModal.tsx` | **Créer** — modale SetupIntent |
| `src/pages/renter/RenterBookings.tsx` | `onRequestDeposit`, `DepositFlowModal` |
| `src/components/RenterBookingCard.tsx` | Différencier `onRequestDeposit` vs `onRequestPay` |
| `src/services/supabase/vehicles.ts` ou `supabaseVehiclesService.ts` | Select incluant `deposit_amount` |
| `src/integrations/supabase/types.ts` | Mise à jour si génération manuelle |
| `.env.local.example` | `CRON_SECRET` |
