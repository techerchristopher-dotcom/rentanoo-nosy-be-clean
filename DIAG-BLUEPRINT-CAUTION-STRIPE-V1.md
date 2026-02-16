# Diagnostic + Blueprint "prêt à coder" — Caution Stripe V1

**Date** : 14 février 2026  
**Objectif** : Blueprint complet pour implémenter la caution Stripe (empreinte 48h avant, libération 48h après)  
**Mode** : Documentation uniquement — aucune modification de fichiers

---

## A) Re-scan précis du repo — où coder

### A1. UI véhicule : `vehicles.deposit_amount`

| Élément | Fichier | Chemin / Lignes | Action |
|---------|---------|-----------------|--------|
| **Types formulaire** | `src/features/vehicle-management/types/vehicle-form.types.ts` | L.8-105 `VehicleFormData` | Ajouter `depositAmount: string` (après `longDurationDiscount60`) |
| **Valeurs initiales** | `src/features/vehicle-management/types/vehicle-form.types.ts` | L.147-148 dans `initialFormData` | Ajouter `depositAmount: "1000"` |
| **Chargement depuis DB** | `src/features/vehicle-management/hooks/useManageVehicle.ts` | L.110-111 (dans le bloc setFormData) | Ajouter `depositAmount: (vehicleData.deposit_amount ?? 1000).toString()` |
| **Input UI** | `src/pages/owner/ManageVehicle.tsx` | L.2117-2120, après le bloc "Prix journalier de base" | Nouveau bloc : |
| | | | ```tsx <div className="space-y-2 mt-6"> <Label htmlFor="depositAmount">Montant caution (€)</Label> <Input id="depositAmount" type="number" value={formData.depositAmount} onChange={(e) => handleInputChange("depositAmount", e.target.value)} placeholder="1000" min="0" step="1" /> <p className="text-xs text-muted-foreground">Empreinte bancaire non débitée, bloquée 48h avant le départ.</p> </div> ``` |
| **handleInputChange** | `src/pages/owner/ManageVehicle.tsx` | L.229-380 | Aucune modif — `handleInputChange` appelle déjà `setFormData(prev => ({ ...prev, [field]: value }))` pour tout champ |
| **handleSave** | `src/pages/owner/ManageVehicle.tsx` | L.1283-1287, après `pricingUpdateData` | Nouveau bloc : `depositUpdateData = { deposit_amount: parseFloat(formData.depositAmount) || 1000 }` puis `SupabaseVehiclesService.updateVehicle(vehicle.id, depositUpdateData)` |
| **Service update** | `src/services/supabaseVehiclesService.ts` | L.384-387 | Aucune modif — `updateVehicle` accepte tout objet ; `deposit_amount` sera envoyé tel quel |

---

### A2. Booking snapshot : `deposit_amount_snapshot`

**Moment recommandé** : À l’acceptation par le propriétaire (passage à `pending_payment`).

| Élément | Fichier | Chemin | Action |
|---------|---------|--------|--------|
| **Update status** | `src/components/OwnerBookingCard.tsx` | L.260 : `SupabaseBookingsService.updateBookingStatus(booking.id, 'pending_payment')` | Remplacer par `updateBookingStatusToPendingPayment(booking.id)` qui : 1) lit `vehicle_id` du booking ; 2) lit `deposit_amount` du véhicule (COALESCE 1000) ; 3) update bookings SET status='pending_payment', deposit_amount_snapshot=..., deposit_status='pending' (ou 'not_required' si 0) |
| **Service** | `src/services/supabase/bookings.ts` | Nouvelle méthode `updateBookingStatusToPendingPayment` | Ou étendre `updateBookingStatus` pour accepter un payload additionnel optionnel. Variante simple : ajouter `updateBookingToPendingPaymentWithDeposit(bookingId)` qui fait un SELECT vehicle puis UPDATE booking. |
| **Alternative (webhook)** | `server/index.ts` | L.155-166, dans le bloc `checkout.session.completed` | Ajouter dans `updatePayload` : lecture de `vehicle_id` depuis le booking, puis SELECT vehicles.deposit_amount, puis `deposit_amount_snapshot: amount ?? 1000`, `deposit_status: (amount && amount > 0) ? 'pending' : 'not_required'` |

**Recommandation** : Faire le snapshot à l’acceptation (OwnerBookingCard) pour être cohérent avec le moment où la réservation devient payante. Créer une méthode dédiée dans `SupabaseBookingsService`.

**Alternative (createBooking)** : Dans `src/services/supabase/bookings.ts` `createBooking`, avant l’insert :  
`SELECT deposit_amount FROM vehicles WHERE id = bookingData.vehicleId`  
puis ajouter `deposit_amount_snapshot: COALESCE(deposit_amount, 1000)` et `deposit_status: (deposit_amount && deposit_amount > 0) ? 'pending' : 'not_required'` à `insertData`.  
Note : à la création le statut est `pending` ; le snapshot peut être mis à jour à l’acceptation si le propriétaire a changé le montant entre-temps.

---

### A3. UI renter : CTA "Activer la caution" → DepositFlowModal

| Élément | Fichier | Chemin | Action |
|---------|---------|--------|--------|
| **Bouton actuel** | `src/components/RenterBookingCard.tsx` | L.1193-1246 | Le bouton appelle `onRequestPay` avec les données location — **erreur de design** : il doit ouvrir la modale **caution**, pas paiement. |
| **Wording** | `src/i18n/locales/fr/common.json` | `bookings.card.finalizeBooking` | Remplacer par "Activer la caution" (voir section F) |
| **Nouvelle prop** | `src/components/RenterBookingCard.tsx` | Props L.70-89 | Ajouter `onRequestDeposit?: (booking: BookingWithDetails) => void` |
| **Bouton onClick** | `src/components/RenterBookingCard.tsx` | L.1201-1234 | Quand `showDepositCTA` : appeler `onRequestDeposit?.(booking)` au lieu de `onRequestPay` |
| **Parent** | `src/pages/renter/RenterBookings.tsx` | L.795-900 (rendu des RenterBookingCard) | Passer `onRequestDeposit={(b) => { setDepositModalBooking(b); setIsDepositModalOpen(true); }}` |
| **État modale** | `src/pages/renter/RenterBookings.tsx` | Déclarations state | `const [depositModalBooking, setDepositModalBooking] = useState<BookingWithDetails | null>(null)` et `isDepositModalOpen` |
| **Composant modale** | **Créer** `src/components/DepositFlowModal.tsx` | Nouveau fichier | Modale avec texte explicatif (section F) + Stripe Elements pour SetupIntent (CardElement ou PaymentElement) |
| **Lib API** | **Créer** `src/lib/depositCaution.ts` | Nouveau fichier | `createSetupIntentClientSecret(bookingId)`, `attachPaymentMethod(bookingId, paymentMethodId)` — appels vers Express `/api/deposit/create-setup-intent` et `/api/deposit/attach-payment-method` |
| **Condition showDepositCTA** | `src/components/RenterBookingCard.tsx` | L.399-408 `getUserBookingStatusUI` | Adapter : `deposit_status === 'pending'` pour CTA ; pour "caution OK" (ex-"paid") : `deposit_status IN ('held','released','card_registered')` selon contexte (held = bloquée, released = libérée) |
| **Mapping depositAmount** | `src/pages/renter/RenterBookings.tsx` | L.489-490, 535-536 | Utiliser `deposit_amount_snapshot ?? deposit_amount` pour `depositAmount` (compatibilité migration) |

---

### A4. Backend : routes Express + auth

| Élément | Fichier | Chemin | Détail |
|---------|---------|--------|--------|
| **supabaseAdmin** | `server/index.ts` | L.57-61 | Déjà créé : `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)` |
| **Auth JWT Supabase** | À ajouter | Middleware ou inline | Récupérer `Authorization: Bearer <token>` ; créer un client Supabase avec ce header pour valider : `const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization } } }); const { data: { user } } = await supabaseAuth.auth.getUser();` — ou utiliser `req.headers.authorization` et passer au client. |
| **Emplacement routes** | `server/index.ts` | Les routes deposit ont besoin de `express.json()` (déjà appliqué L.231-234). Placer les routes `/api/deposit/*` et `/api/cron/*` **après** `app.use(express.json())`, ex. vers L.260, avant `/api/contact` |
| **getStripe** | `server/index.ts` | Import L.7 | Déjà importé ; utilisé pour Stripe API |

**Extrait existant pour auth côté front (pattern à reproduire côté serveur)** :

```ts
// payerLocation.ts L.16-26
const { data: { session } } = await supabase.auth.getSession();
// session.access_token = JWT à envoyer en Authorization
```

**Côté Express** : le front envoie `fetch(url, { headers: { Authorization: `Bearer ${session.access_token}` } })`. Le serveur reçoit `req.headers.authorization` et peut vérifier le JWT via un client Supabase créé avec ce header.

---

### A5. Webhooks Stripe : extension pour `payment_intent.*`

| Élément | Fichier | Chemin | Action |
|---------|---------|--------|--------|
| **Handler actuel** | `server/index.ts` | L.101-218 | `if (event.type === "checkout.session.completed")` — ajouter des `else if` pour `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled` |
| **Position** | `server/index.ts` | Après le bloc checkout L.217, avant `return res.status(200)` L.220 | Insérer les nouveaux `case` dans un `switch (event.type)` ou une suite de `if / else if` |

---

### A6. n8n : sécurisation des endpoints cron

| Élément | Action |
|---------|--------|
| **Variable d’environnement** | Ajouter `CRON_SECRET` dans `server` (Railway / .env.local) — valeur aléatoire longue (ex. 32 caractères) |
| **Vérification Express** | Au début des handlers `/api/cron/deposit-hold` et `/api/cron/deposit-release` : `if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) return res.status(401).json({ error: 'Unauthorized' })` |
| **n8n HTTP Request** | Dans le node "HTTP Request" du workflow Cron, ajouter header : `X-Cron-Secret: {{ $env.CRON_SECRET }}` ou configurer la variable dans n8n et l’utiliser |
| **Rate limit** | Optionnel : compter les appels par IP dans une Map avec TTL, ou utiliser `express-rate-limit` sur ces routes (ex. max 10 req/min) |

---

## B) Machine à états V1 `deposit_status`

### Statuts

| Statut | Description |
|--------|-------------|
| `not_required` | Véhicule sans caution (deposit_amount = 0) |
| `pending` | Caution requise, carte non enregistrée |
| `card_registered` | Carte enregistrée via SetupIntent, prête pour hold |
| `requires_action` | SCA nécessaire ou action client (ex. ré-authentifier) |
| `held` | Empreinte créée, en attente de libération ou capture |
| `released` | Hold annulé, aucun débit |
| `captured_partial` | Capture partielle effectuée |
| `captured_full` | Capture totale effectuée |
| `failed` | Échec (carte refusée, erreur Stripe) |
| `expired` | Autorisation expirée avant capture (capture_before dépassé) |

### Table des transitions

| Statut actuel | Événement | Statut suivant | Champs DB mis à jour | Action UX |
|---------------|-----------|----------------|----------------------|-----------|
| `pending` | Client enregistre carte (SetupIntent OK) | `card_registered` | `stripe_payment_method_id`, `deposit_status` | Fermer modale, afficher "Caution activée" |
| `pending` | SetupIntent échoue | `pending` | - | Message d’erreur, garder modale ouverte |
| `card_registered` | Job hold : PaymentIntent `requires_capture` | `held` | `deposit_payment_intent_id`, `deposit_hold_created_at`, `deposit_capture_before`, `deposit_extended_auth_status`, `deposit_status` | Badge "Caution bloquée" |
| `card_registered` | Job hold : `requires_action` | `requires_action` | `deposit_payment_intent_id`, `deposit_status` | Message + lien pour compléter l’auth |
| `card_registered` | Job hold : payment_failed | `failed` | `deposit_status` | Message "Carte refusée", CTA "Réessayer" |
| `held` | Job release : cancel | `released` | `deposit_status` | Badge "Caution libérée" |
| `held` | Admin capture (partiel) | `captured_partial` | `deposit_status`, `deposit_capture_amount`, `deposit_reason` | - |
| `held` | Admin capture (total) | `captured_full` | `deposit_status`, `deposit_capture_amount`, `deposit_reason` | - |
| `held` | Expiration (capture_before passé) | `expired` | `deposit_status` | Message "Autorisation expirée" |
| `requires_action` | Client complète auth | `held` | `deposit_status` | Idem `held` |
| `requires_action` | Client abandonne / échec | `failed` | `deposit_status` | CTA "Réessayer" |

### Mapping par événement (résumé)

| Événement | Source | Champs DB |
|-----------|--------|-----------|
| SetupIntent confirm + attach | `attach-payment-method` | `stripe_payment_method_id`, `deposit_status='card_registered'` |
| PaymentIntent succeeded (requires_capture) | Webhook `payment_intent.succeeded` | `deposit_status='held'`, `deposit_hold_created_at`, `deposit_capture_before`, `deposit_extended_auth_status` |
| PaymentIntent payment_failed | Webhook `payment_intent.payment_failed` | `deposit_status='failed'` |
| PaymentIntent canceled | Webhook `payment_intent.canceled` | `deposit_status='released'` |
| Cron release (cancel PI) | Endpoint | `deposit_status='released'` |
| Admin capture | Endpoint | `deposit_status='captured_partial'|'captured_full'`, `deposit_capture_amount`, `deposit_reason` |
| Job hold → requires_action | Endpoint (détection) | `deposit_status='requires_action'` |
| Job hold → expired (capture_before) | Cron ou job dédié | `deposit_status='expired'` |

---

## C) Migrations SQL Supabase

### Fichier 1 : `supabase/migrations/20260214100000_add_vehicles_deposit_amount.sql`

```sql
-- Vehicles : montant caution par véhicule
ALTER TABLE public.vehicles
ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2) DEFAULT 1000;

COMMENT ON COLUMN public.vehicles.deposit_amount IS 'Montant caution (empreinte) en euros. 0 = pas de caution.';
```

### Fichier 2 : `supabase/migrations/20260214100001_add_profiles_stripe_customer_id.sql`

```sql
-- Profiles : Stripe Customer pour paiements off_session
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'ID Stripe Customer (cus_xxx) pour paiements off_session.';
```

### Fichier 3 : `supabase/migrations/20260214100002_add_bookings_deposit_columns.sql`

```sql
-- Bookings : colonnes caution
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS deposit_amount_snapshot NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT 'pending'
  CHECK (deposit_status IN (
    'not_required', 'pending', 'card_registered', 'requires_action',
    'held', 'released', 'captured_partial', 'captured_full', 'failed', 'expired'
  )),
ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT,
ADD COLUMN IF NOT EXISTS deposit_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS deposit_hold_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deposit_capture_before TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deposit_extended_auth_status TEXT,
ADD COLUMN IF NOT EXISTS deposit_capture_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS deposit_reason TEXT;

COMMENT ON COLUMN public.bookings.deposit_amount_snapshot IS 'Snapshot du montant caution du véhicule au moment de la réservation.';
COMMENT ON COLUMN public.bookings.deposit_status IS 'Machine à états caution V1.';
COMMENT ON COLUMN public.bookings.stripe_payment_method_id IS 'ID PaymentMethod Stripe (pm_xxx).';
COMMENT ON COLUMN public.bookings.deposit_payment_intent_id IS 'ID PaymentIntent caution (pi_xxx).';
COMMENT ON COLUMN public.bookings.deposit_hold_created_at IS 'Date/heure création du hold.';
COMMENT ON COLUMN public.bookings.deposit_capture_before IS 'Limite capture (timestamp Stripe).';
COMMENT ON COLUMN public.bookings.deposit_extended_auth_status IS 'Extended auth: enabled | disabled.';
COMMENT ON COLUMN public.bookings.deposit_capture_amount IS 'Montant capturé en cas de sinistre.';
COMMENT ON COLUMN public.bookings.deposit_reason IS 'Motif capture (sinistre, dégâts, etc.).';
```

---

## D) Endpoints Express

### 1. POST /api/deposit/create-setup-intent

```
Input:  { bookingId: string }
Auth:   Authorization: Bearer <supabase_jwt>
Output: { clientSecret: string }
```

**Pseudo-code :**
```
1. token = req.headers.authorization?.replace('Bearer ', '')
2. if (!token) return 401
3. supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } })
4. const { data: { user } } = await supabaseAuth.auth.getUser()
5. if (!user) return 401
6. booking = await supabaseAdmin.from('bookings').select('id, user_id, vehicle_id, status, deposit_status').eq('id', bookingId).single()
7. if (!booking || booking.user_id !== user.id) return 404
8. if (!['accepted','confirmed'].includes(booking.status) || !['pending','not_required'].includes(booking.deposit_status)) return 400
9. profile = await supabaseAdmin.from('profiles').select('id, email, stripe_customer_id').eq('id', user.id).single()
10. if (!profile.stripe_customer_id)
      customer = await stripe.customers.create({ email: profile.email || user.email })
      await supabaseAdmin.from('profiles').update({ stripe_customer_id: customer.id }).eq('id', user.id)
      stripeCustomerId = customer.id
    else stripeCustomerId = profile.stripe_customer_id
11. si = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: { bookingId }
    })
12. return { clientSecret: si.client_secret }
```

---

### 2. POST /api/deposit/attach-payment-method

```
Input:  { bookingId: string, paymentMethodId: string }
Auth:   JWT Supabase
Output: { ok: true }
```

**Pseudo-code :**
```
1-5. Idem create-setup-intent (auth)
6. booking = ... id, user_id
7. if booking.user_id !== user.id return 403
8. profile = ... stripe_customer_id
9. pm = await stripe.paymentMethods.retrieve(paymentMethodId)
10. if (pm.customer !== profile.stripe_customer_id)
      await stripe.paymentMethods.attach(paymentMethodId, { customer: profile.stripe_customer_id })
11. await supabaseAdmin.from('bookings').update({
      stripe_payment_method_id: paymentMethodId,
      deposit_status: 'card_registered',
      updated_at: new Date().toISOString()
    }).eq('id', bookingId)
12. return { ok: true }
```

---

### 3. POST /api/cron/deposit-hold

```
Protection: X-Cron-Secret === process.env.CRON_SECRET
Output: { processed: number, errors: string[] }
```

**Pseudo-code :**
```
1. if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) return 401
2. now = new Date()
3. { data: bookings } = await supabaseAdmin.from('bookings').select(`
     id, user_id, stripe_payment_method_id, deposit_amount_snapshot, vehicle_id,
     start_date, start_time, end_date, end_time
   `).eq('deposit_status','card_registered').not('stripe_payment_method_id','is',null)
     .gte('deposit_amount_snapshot', 0.01).in('status',['accepted','confirmed'])
     .is('deposit_payment_intent_id', null)
4. Pour chaque b:
   startDt = parse start_date + (start_time || '06:00')
   if (startDt - 48h > now) continue  // pas encore J-2
   profile = ... stripe_customer_id
   pi = await stripe.paymentIntents.create({
     amount: Math.round(b.deposit_amount_snapshot * 100),
     currency: 'eur',
     customer: profile.stripe_customer_id,
     payment_method: b.stripe_payment_method_id,
     off_session: true,
     confirm: true,
     capture_method: 'manual',
     payment_method_options: { card: { request_extended_authorization: 'if_available' } },
     metadata: { bookingId: b.id, type: 'deposit' }
   })
   if (pi.status === 'requires_action') {
     update deposit_status='requires_action', deposit_payment_intent_id=pi.id
     continue
   }
   if (pi.status === 'requires_capture') {
     charge = pi.latest_charge (expand)
     captureBefore = charge?.payment_method_details?.card?.capture_before  // Unix timestamp
     extAuth = charge?.payment_method_details?.card?.extended_authorization?.status
     update deposit_status='held', deposit_payment_intent_id, deposit_hold_created_at=now,
            deposit_capture_before=captureBefore? new Date(captureBefore*1000) : null,
            deposit_extended_auth_status=extAuth
   } else {
     update deposit_status='failed'
   }
5. return { processed: count }
```

---

### 4. POST /api/cron/deposit-release

```
Protection: X-Cron-Secret
Output: { processed: number }
```

**Pseudo-code :**
```
1. if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) return 401
2. now = new Date()
3. { data: bookings } = await supabaseAdmin.from('bookings').select('id, deposit_payment_intent_id, end_date, end_time, deposit_capture_before')
   .eq('deposit_status','held').not('deposit_payment_intent_id','is',null)
4. Pour chaque b:
   endDt = parse end_date + (end_time || '18:00')
   releaseDue = endDt + 48h
   effectiveDue = b.deposit_capture_before 
     ? min(releaseDue, new Date(b.deposit_capture_before.getTime() - 2*3600*1000))
     : releaseDue
   if (now < effectiveDue) continue
   // Fallback si capture_before < end+48h : voir section E
   await stripe.paymentIntents.cancel(b.deposit_payment_intent_id)
   update deposit_status='released'
5. return { processed }
```

---

### 5. POST /api/admin/deposit-capture

```
Input:  { bookingId: string, amount: number, reason?: string }
Auth:   X-Admin-Secret ou role admin
Output: { ok: true }
```

**Pseudo-code :**
```
1. if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) return 401  // ou vérifier JWT + role
2. booking = ... deposit_payment_intent_id, deposit_status='held'
3. await stripe.paymentIntents.capture(booking.deposit_payment_intent_id, {
     amount_to_capture: Math.round(amount * 100)
   })
4. update deposit_status: amount >= deposit_amount_snapshot ? 'captured_full' : 'captured_partial',
        deposit_capture_amount=amount, deposit_reason=reason
5. return { ok: true }
```

---

### 6. POST /api/admin/deposit-cancel

```
Input:  { bookingId: string }
Auth:   Admin
Output: { ok: true }
```

**Pseudo-code :**
```
1. Auth admin
2. booking = ... deposit_payment_intent_id, deposit_status
3. if (['held','requires_action'].includes(booking.deposit_status))
     await stripe.paymentIntents.cancel(booking.deposit_payment_intent_id)
4. update deposit_status='released'
5. return { ok: true }
```

---

## E) Fallback V1 — capture_before < end+48h

**Recommandation : Option A (intervention admin).**

**Règle unique :**  
Si `deposit_capture_before` existe et `deposit_capture_before < end_date + 48h`, alors :

1. Ne pas annuler le PaymentIntent tout de suite à J+2.
2. Si `now >= deposit_capture_before - 2h` : mettre `deposit_status = 'requires_action'` ou `'expired'`.
3. Notifier l’admin (log, email, dashboard) : "Caution #bookingId : autorisation expire avant libération prévue."
4. Afficher au client : "Votre caution doit être revalidée. Contactez le support."
5. Endpoint optionnel : `POST /api/admin/deposit-retry-hold` pour recréer un nouveau PaymentIntent avec la même carte (si possible) ou demander une nouvelle carte.

**Pourquoi A plutôt que B :**
- Option B (capture puis refund) introduit des mouvements d’argent et des remboursements, plus complexes à gérer et à expliquer.
- Option A laisse l’admin trancher (nouveau hold, annulation, etc.) sans mouvement d’argent superflu.

**Règle de sélection des bookings à release :**
```
effectiveReleaseDue = deposit_capture_before 
  ? min(end_date + 48h, deposit_capture_before - 2h)
  : end_date + 48h

Si now >= effectiveReleaseDue :
  - Si deposit_capture_before passé : deposit_status = 'expired' (ne pas cancel, PI déjà expiré)
  - Sinon : cancel PI, deposit_status = 'released'
```

---

## F) UX

### 1. Wording

- Remplacer "Je paye ma caution" par **"Activer la caution"**.
- Clé i18n : `bookings.card.activateDeposit` ou renommer `finalizeBooking` en `activateDeposit`.

### 2. Texte de la modale DepositFlowModal

```
La caution : ce qu'il faut savoir

• Ce n'est pas un débit : il s'agit d'une empreinte bancaire. Aucun montant n'est prélevé tant qu'aucun sinistre n'est constaté.

• L'empreinte sera placée sur votre carte 48 heures avant le début de la location.

• Elle sera libérée au plus tard 48 heures après la fin de la location, sauf sinistre.

• En cas de dommages constatés à la restitution, une partie du montant pourra être débitée pour couvrir les frais de réparation (sur justificatifs).

• L'empreinte peut temporairement réduire le plafond disponible sur votre carte. C'est normal et réversible à la libération.

• Si l'enregistrement ou l'empreinte échouent, la location peut être bloquée jusqu'à régularisation.

En enregistrant votre carte, vous acceptez ces conditions.
```

### 3. Emplacement

- Intégrer ce texte dans `src/components/DepositFlowModal.tsx`, au-dessus du formulaire de saisie de carte (Stripe Elements).

---

## G) Tests E2E

| # | Scénario | Étapes | Résultat attendu |
|---|----------|--------|------------------|
| 1 | Carte OK | Enregistrer carte valide → Job hold J-2 | `deposit_status = 'held'`, badge "Caution bloquée" |
| 2 | Carte refusée | Carte 4000000000000002 → Job hold | `deposit_status = 'failed'`, message client |
| 3 | SCA (requires_action) | Carte 4000002500003155 | `deposit_status = 'requires_action'`, lien auth |
| 4 | Extended auth enabled | Vérifier `deposit_extended_auth_status = 'enabled'` après hold | Fenêtre capture > 7 jours |
| 5 | Extended auth disabled | Carte/banque sans extended auth | `deposit_extended_auth_status = 'disabled'`, capture_before ~7 jours |
| 6 | capture_before trop court | Location longue, capture_before < end+48h | Fallback Option A : status `expired` ou `requires_action`, notification admin |
| 7 | Release normal | Job release à J+2, pas de sinistre | `deposit_status = 'released'`, PI annulé |
| 8 | Capture partielle admin | Appel `/api/admin/deposit-capture` avec amount partiel | Montant débité, `deposit_status = 'captured_partial'` |
| 9 | CTA "Activer la caution" | Booking payé, deposit_status=pending | Bouton visible, ouvre DepositFlowModal (pas PaymentFlowModal) |

---

## Liste finale des fichiers à toucher (V1)

| Fichier | Action |
|---------|--------|
| `supabase/migrations/20260214100000_add_vehicles_deposit_amount.sql` | **Créer** |
| `supabase/migrations/20260214100001_add_profiles_stripe_customer_id.sql` | **Créer** |
| `supabase/migrations/20260214100002_add_bookings_deposit_columns.sql` | **Créer** |
| `src/features/vehicle-management/types/vehicle-form.types.ts` | Ajouter `depositAmount` |
| `src/features/vehicle-management/hooks/useManageVehicle.ts` | Mapper `deposit_amount` |
| `src/pages/owner/ManageVehicle.tsx` | Input caution + `handleSave` |
| `src/services/supabase/bookings.ts` | `updateBookingToPendingPaymentWithDeposit` ou équivalent, snapshot |
| `src/components/OwnerBookingCard.tsx` | Appeler la nouvelle méthode d’acceptation |
| `server/index.ts` | 6 routes deposit + webhooks `payment_intent.*` |
| `src/lib/depositCaution.ts` | **Créer** |
| `src/components/DepositFlowModal.tsx` | **Créer** |
| `src/pages/renter/RenterBookings.tsx` | `onRequestDeposit`, `DepositFlowModal` |
| `src/components/RenterBookingCard.tsx` | `onRequestDeposit` et branchement modale caution |
| `src/i18n/locales/fr/common.json` | `bookings.card.activateDeposit` (et autres langues) |
| `src/services/supabase/vehicles.ts` ou `supabaseVehiclesService.ts` | Select avec `deposit_amount` si besoin |
| `.env.local.example` | `CRON_SECRET`, `ADMIN_SECRET` |
