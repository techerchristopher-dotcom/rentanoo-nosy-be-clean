# DIAG — Migration "1 passage carte" (setup_future_usage)

**Mode** : DIAG ONLY — aucun patch, pas de modification de logique.  
**Objectif** : Analyser factuellement le passage du flow "caution séparée (SetupIntent)" vers "1 seul paiement + carte sauvegardée (setup_future_usage)".

---

## 1️⃣ INVENTAIRE — Points d’entrée Stripe "paiement location"

### Où est créé le paiement location

| Fichier | Lignes | Rôle |
|---------|--------|------|
| `supabase/functions/create-checkout-session/index.ts` | 507-526 | `stripe.checkout.sessions.create()` — mode `"payment"` |
| `server/index.ts` | — | Aucune route Express pour créer un paiement (voir L1037 : endpoint obsolète) |

### Extrait Checkout Session (create-checkout-session L507-526)

```typescript
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  payment_method_types: ["card"],
  line_items: [...],
  success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: cancelUrl,
  metadata: { bookingId: String(bookingId) },
});
```

**Options actuelles** : pas de `customer`, `customer_creation`, `payment_intent_data`, `setup_future_usage`, `customer_email`.

### Champs Stripe sauvegardés en DB

| Champ | Source | Fichier | Lignes |
|------|--------|---------|--------|
| `stripe_checkout_session_id` | `session.id` | Express webhook L165, Edge L199 | — |
| `stripe_payment_intent_id` | `session.payment_intent` | Express L116-117, L165 ; Edge L115, L200 | — |
| `paid_at` | `new Date().toISOString()` | Express L164, Edge L196 | — |
| `status` | `"accepted"` (Express) ou `"confirmed"` (Edge) | Express L163, Edge L195 | — |
| `amount_total_paid`, `service_fee_*`, `owner_payout_amount`, `platform_total_fee`, `currency` | Calculé + Stripe | Express L166-172, Edge L200-207 | — |

**Non écrit par le webhook** : `stripe_payment_method_id`, `deposit_status`.

### Webhooks

| Webhook | Fichier | Event | Status écrit |
|---------|---------|-------|--------------|
| Express | `server/index.ts` L72-234 | `checkout.session.completed` | `"accepted"` |
| Edge | `supabase/functions/stripe-webhook/index.ts` L48-276 | `checkout.session.completed` | `"confirmed"` |

Un seul endpoint est configuré dans Stripe pour recevoir les événements.

---

## 2️⃣ INVENTAIRE — Points d’entrée Stripe "caution séparée"

### Backend

| Endpoint | Fichier | Lignes | Rôle |
|----------|---------|--------|------|
| `POST /api/deposit/create-setup-intent` | `server/index.ts` | 269-349 | Création SetupIntent, lecture booking + profile, création customer si absent |
| `POST /api/deposit/attach-payment-method` | `server/index.ts` | 351-425 | Attach PM au customer, update `stripe_payment_method_id`, `deposit_status='card_registered'` |

### Logique create-setup-intent (L281-341)

- Lecture `bookings` : `id, user_id, status, deposit_status, deposit_amount_snapshot, stripe_payment_method_id`
- Garde : `status IN [confirmed, accepted]`, `deposit_status === 'pending'`, `stripe_payment_method_id` null, `deposit_amount_snapshot > 0`
- Lecture `profiles` : `id, email, stripe_customer_id`
- Si `stripe_customer_id` absent → `stripe.customers.create()` + `profiles.update(stripe_customer_id)`
- `stripe.setupIntents.create({ customer, payment_method_types: ["card"], usage: "off_session", metadata: { bookingId } })`
- Renvoie `clientSecret`

### Front

| Composant | Fichier | Lignes | Rôle |
|-----------|---------|--------|------|
| `DepositFlowModal` | `src/components/DepositFlowModal.tsx` | 113-230 | Modale, appel `createSetupIntentClientSecret`, rendu `Elements` + `DepositPaymentForm` |
| `DepositPaymentForm` | idem | 23-110 | `PaymentElement`, `confirmSetup`, puis `attachPaymentMethod` |
| `depositCaution.ts` | `src/lib/depositCaution.ts` | 14-52, 55-91 | `createSetupIntentClientSecret`, `attachPaymentMethod` |
| Ouverture modale | `RenterBookings.tsx` | 1010-1024 | `DepositFlowModal` avec `depositModalBooking` |

### Champs DB caution

| Champ | Table | Rôle |
|-------|-------|------|
| `stripe_customer_id` | `profiles` | Lien Stripe Customer ↔ profile |
| `deposit_status` | `bookings` | `pending` → `card_registered` après attach |
| `deposit_amount_snapshot` | `bookings` | Montant caution (snapshot à l’acceptation) |
| `stripe_payment_method_id` | `bookings` | ID PaymentMethod (pm_xxx) après confirmSetup + attach |

### Gating UI "Payer" vs "Activer caution"

| Condition | Fichier | Lignes |
|------------|---------|--------|
| Bouton "Payer" | `RenterBookingCard`, `BookingDiscussion` | `status === 'pending_payment'` |
| Bouton "Activer caution" | `RenterBookingCard` | `getUserBookingStatusUI` : `status in (confirmed, accepted)` ET `deposit_status === 'pending'` ET `snapshot > 0` ET `!stripePmId` |
| `canOpenDepositModal` | `RenterBookings.tsx` | L63-76 : idem |

---

## 3️⃣ CIBLE "1 PASSAGE CARTE"

### Option A — Checkout Session avec sauvegarde carte

Stripe permet d’enregistrer la carte lors du paiement Checkout via :

- `payment_intent_data: { setup_future_usage: "off_session" }`
- `customer_creation: "always"` ou `customer` si customer connu

(Doc Stripe : https://docs.stripe.com/payments/checkout/save-during-payment)

**Où modifier** : `supabase/functions/create-checkout-session/index.ts` L507-526, dans l’objet passé à `stripe.checkout.sessions.create()`.

**Ajouts possibles** :

- `payment_intent_data: { setup_future_usage: "off_session" }` — carte sauvegardée pour off-session
- `customer_creation: "always"` — création customer par Stripe si absent
- OU `customer: stripeCustomerId` — si on récupère `profiles.stripe_customer_id` avant création

**Prérequis** : pour réutiliser un customer existant, il faut charger `user_id` du booking, puis `profiles.stripe_customer_id`. Actuellement le select booking (L305-309) ne charge pas `user_id`.

### Option B — PaymentIntent direct (sans Checkout)

| Élément | Actuel | À créer |
|---------|--------|---------|
| Endpoint création PaymentIntent | Aucun | Nouvel endpoint (Express ou Edge) |
| Front Payment Element | Seulement dans DepositFlowModal (SetupIntent) | Flow paiement location avec PaymentIntent |
| Redirection Stripe Checkout | Oui | Non (tout in-app) |

**Impact** : nouveau flow complet (endpoints, UI, webhooks). Plus lourd qu’Option A.

### Comparaison A vs B

| Critère | Option A (Checkout + setup_future_usage) | Option B (PaymentIntent direct) |
|---------|----------------------------------------|----------------------------------|
| Fichiers modifiés | 2–4 (create-checkout-session, webhooks, éventuel front) | 10+ |
| Complexité | Faible | Forte |
| Expérience utilisateur | Inchangée (même Checkout) | Nouveau flux intégré |
| Recommandation | Préférable | Si besoin d’un flux sur-mesure |

---

## 4️⃣ RISQUES DE CASSE

| Risque | Preuve | Impact | Éviter | Stratégie migration |
|--------|--------|--------|--------|----------------------|
| Flow caution dépend du SetupIntent / `clientSecret` | `DepositFlowModal` L127-137, L206-225 | Si carte déjà enregistrée au paiement, SetupIntent inutile | Bypass DepositFlowModal si `stripe_payment_method_id` déjà présent (déjà fait L408) | Garder flow SetupIntent pour anciens bookings |
| UI "Activer caution" sur `status` + `deposit_status` | `RenterBookingCard` L407-416 | Aucun si `deposit_status` et `stripe_payment_method_id` sont mis à jour par le webhook | Webhook écrit bien ces champs | Idem |
| Backend utilise `profiles.stripe_customer_id` | `server/index.ts` L317, L325-327 | Si Checkout crée un nouveau customer, risque de doublon | Passer `customer` si existant, ou lier `session.customer` au profile dans le webhook | Webhook : `profiles.update({ stripe_customer_id: session.customer })` si pas encore renseigné |
| Webhook actuel n’écrit pas `stripe_payment_method_id` | Express L161-174, Edge L194-209 | PaymentMethod non stocké → flow caution toujours nécessaire | Extraire `payment_method` du PaymentIntent et l’écrire | `stripe.paymentIntents.retrieve(piId)` → `payment_method` |
| Express vs Edge status (`accepted` vs `confirmed`) | Express L163, Edge L195 | Incohérence selon webhook actif | Aligner sur un seul status (`confirmed` recommandé) | Vérifier quel webhook est utilisé en prod |
| Customer TEST vs LIVE | Clés Stripe | Customer créé en TEST non utilisable en LIVE | Aligner clés (test/live) | Vérifier configuration Stripe |
| Bookings existants déjà payés | DB | `deposit_status = 'pending'`, pas de PM | Ne pas modifier le flow pour eux | Rétrocompat : SetupIntent reste pour ces cas |
| Users sans `stripe_customer_id` | `profiles` | Checkout avec `customer_creation: "always"` crée un customer | Webhook enregistre `session.customer` dans `profiles` | Traiter `session.customer` dans le webhook |
| Booking sans `deposit_amount_snapshot` au paiement | Acceptation owner | Snapshot défini à l’acceptation (pending → pending_payment) | Vérifier que le snapshot existe avant paiement | Lecture `deposit_amount_snapshot` dans le webhook pour décider si on écrit `stripe_payment_method_id` |

---

## 5️⃣ TRAVAIL ESTIMÉ (scope réel)

### Fichiers à modifier

| Fichier | Changements | Effort |
|---------|-------------|--------|
| `supabase/functions/create-checkout-session/index.ts` | `payment_intent_data`, `customer` ou `customer_creation`, éventuellement select `user_id` | Faible |
| `server/index.ts` (webhook Express) | Extraire PM du PI, update `stripe_payment_method_id`, `deposit_status`, `profiles.stripe_customer_id` | Moyen |
| `supabase/functions/stripe-webhook/index.ts` | Idem | Moyen |
| `src/components/RenterBookingCard.tsx` | Aucun si logique inchangée | — |
| `src/pages/renter/RenterBookings.tsx` | Aucun | — |
| `server/index.ts` (deposit routes) | Garder create-setup-intent et attach pour rétrocompat | — |

### Types de changements

| Zone | Changements |
|------|-------------|
| DB | Aucune nouvelle colonne si `stripe_payment_method_id`, `deposit_status` existent déjà |
| Backend | create-checkout-session : ajout options ; webhooks : extraction PM + updates booking + profile |
| Webhooks | Récupération PaymentIntent, `payment_method`, mise à jour bookings + profiles |
| Front | Aucun si bypass DepositFlowModal déjà géré (`!stripePmId`) |

### Compat rétro

| Cas | Comportement |
|-----|--------------|
| Bookings déjà payés (avant migration) | `deposit_status = 'pending'`, `stripe_payment_method_id` null → flow SetupIntent inchangé |
| Bookings `pending_payment` | Nouveau paiement avec setup_future_usage → webhook remplit PM + deposit |
| Users sans customer | `customer_creation: "always"` + webhook enregistre `session.customer` |

---

## 6️⃣ PLAN DE MIGRATION SAFE

### Step 1 — Modifier create-checkout-session

- Ajouter `payment_intent_data: { setup_future_usage: "off_session" }`
- Charger `user_id` du booking
- Si `profiles.stripe_customer_id` présent : `customer: stripeCustomerId`
- Sinon : `customer_creation: "always"`
- GO/NO GO : session créée avec ces options, paiement test réussi

### Step 2 — Modifier le webhook (Express et/ou Edge)

- Lire `session.payment_intent`, `session.customer`
- `stripe.paymentIntents.retrieve(piId)` pour obtenir `payment_method`
- Lire `deposit_amount_snapshot` du booking
- Update booking : status, paid_at, fees, `stripe_payment_method_id` (si snapshot > 0), `deposit_status: 'card_registered'` (si snapshot > 0)
- Si `session.customer` et profile sans `stripe_customer_id` : `profiles.update({ stripe_customer_id: session.customer })`
- GO/NO GO : après paiement test, booking a bien `stripe_payment_method_id` et `deposit_status = 'card_registered'`

### Step 3 — Validation front

- Vérifier que "Activer caution" n’apparaît plus pour les nouveaux paiements (car déjà `stripe_payment_method_id`)
- Vérifier que les anciens bookings gardent le bouton "Activer caution"
- GO/NO GO : UI correcte pour anciens et nouveaux cas

### Mode dual-run / feature flag

- Pas de flag nécessaire si la migration est purement additive
- Anciens bookings : flow SetupIntent inchangé
- Nouveaux paiements : Checkout avec setup_future_usage + webhook enrichi

### Rollback

- Retirer `payment_intent_data` et `customer_creation` dans create-checkout-session
- Retirer les updates PM/deposit dans le webhook
- Les anciens paiements restent valides ; les nouveaux redeviendront "sans PM sauvegardé"

---

## 7️⃣ TABLEAU FINAL

| Zone | Changement requis | Risque de casse | Preuves (fichier + ligne) | Comment confirmer | Fix minimal (descriptif) |
|------|-------------------|-----------------|----------------------------|-------------------|---------------------------|
| create-checkout-session | `payment_intent_data`, `customer` / `customer_creation` | Faible | L507-526 | Tester création session | Ajouter les options Stripe |
| Webhook Express | Extraction PM, update booking + profile | Moyen | L108-226 | Tester après paiement | `paymentIntents.retrieve` + updates |
| Webhook Edge | Idem | Moyen | L111-232 | Idem | Idem |
| deposit create-setup-intent | Aucun (rétrocompat) | Faible | L269-349 | Anciens bookings | Conserver tel quel |
| deposit attach-payment-method | Aucun | Faible | L351-425 | Idem | Conserver tel quel |
| Front DepositFlowModal | Aucun (déjà bypass si PM) | Nul | L206-225, RenterBookingCard L408 | Vérifier UI | — |
| profiles.stripe_customer_id | Enregistrer `session.customer` si absent | Moyen | Webhook, L317 | Vérifier profils après paiement | Update profile dans webhook |
| bookings.deposit_status | Mettre `card_registered` quand PM issu du paiement | Faible | L411-412 (attach) | Vérifier booking après paiement | Écrire dans webhook checkout |

---

## 8️⃣ RÉSUMÉ GO / NO GO

| Condition | GO | NO GO |
|-----------|-----|-------|
| Stripe Checkout supporte setup_future_usage | Oui | — |
| Webhook peut extraire payment_method du PaymentIntent | Oui | — |
| Colonnes DB existantes | `stripe_payment_method_id`, `deposit_status` déjà là | — |
| Rétrocompat anciens bookings | Flow SetupIntent conservé | — |
| Risque global | Faible à moyen | — |
| Recommandation | Option A (Checkout + setup_future_usage) | Option B trop lourde |

**Conclusion** : La migration vers "1 passage carte" via Checkout + `setup_future_usage` est faisable avec un risque maîtrisé. Les changements se concentrent sur create-checkout-session et les webhooks. Le flow caution actuel reste en place pour les bookings déjà payés avant la migration.
