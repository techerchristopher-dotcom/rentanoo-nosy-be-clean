# 🔍 Audit technique — Caution Stripe pour location véhicule

**Date** : 14 février 2026  
**Objectif** : Toutes les infos nécessaires pour implémenter une CAUTION Stripe (hold 48h avant → libération/capture 48h après fin de location)  
**Mode** : Audit uniquement — aucune modification de fichiers

---

## 📄 Résumé en 1 page

### Ce qu'on a aujourd'hui

| Composant | État |
|-----------|------|
| **Stripe** | Stripe Checkout (mode `payment`, capture immédiate). Pas de PaymentIntent/Elements direct. |
| **Backend** | Node.js + Express (`server/index.ts`) + Supabase Edge Functions (Deno) |
| **Création paiement** | `supabase/functions/create-checkout-session` → `stripe.checkout.sessions.create({ mode: "payment" })` |
| **Confirmation** | Webhook `checkout.session.completed` (Express `/api/stripe/webhook` OU Edge `stripe-webhook`) → update `bookings` |
| **Données Stripe en DB** | `bookings.paid_at`, `stripe_checkout_session_id`, `stripe_payment_intent_id`, `amount_total_paid`, fees |
| **Réservations** | Table `bookings` : `start_date`, `end_date`, `user_id`, `vehicle_id`, `status`, `subtotal`, `rental_days` |
| **Auth/client** | `profiles.id` = `auth.users.id`, **pas de `stripe_customer_id`** |
| **deposit_status / deposit_amount** | Utilisés dans l’UI (`deposit_status`, `deposit_amount`) mais **aucune migration trouvée** — colonnes probablement absentes en DB |
| **Scheduler** | ❌ **Aucun** — pas de cron, BullMQ, queue, workers, Vercel cron, etc. |

### Ce qu'on ajoute (pour la caution)

- **Nouvelle logique caution** : hold 48h avant début, libération/capture 48h après fin  
- **Scheduler** : à mettre en place (voir Phase B)  
- **SetupIntent** ou **PaymentMethod** sauvegardé pour paiements off_session (hold puis capture)  
- **Colonnes DB** : `stripe_payment_method_id`, `deposit_payment_intent_id`, `deposit_status`, `deposit_amount`, `deposit_hold_created_at`, `deposit_capture_due_at`  

---

## PHASE A — Comprendre l'existant

### 1) Intégrations Stripe

**Fichiers pertinents :**

| Fichier | Rôle |
|---------|------|
| `server/lib/stripe.ts` | Init Stripe serveur, `getStripe()`, `isStripeConfigured()` |
| `src/lib/stripePublicKey.ts` | Clé publique (`VITE_STRIPE_PUBLISHABLE_KEY`) — peu utilisée (pas d’Elements) |
| `src/lib/payerLocation.ts` | Appel `supabase.functions.invoke("create-checkout-session", { body: { bookingId } })` → redirection Stripe |
| `supabase/functions/create-checkout-session/index.ts` | Création Checkout Session Stripe |
| `server/index.ts` (l.64–226) | Webhook Express `/api/stripe/webhook` |
| `supabase/functions/stripe-webhook/index.ts` | Webhook Edge Function Stripe |

**(a) Création du paiement**

```typescript
// supabase/functions/create-checkout-session/index.ts, ~l.383-403
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  payment_method_types: ["card"],
  line_items: [{
    price_data: {
      currency: "eur",
      product_data: { name: description },
      unit_amount: Math.round(amountTTC * 100), // centimes
    },
    quantity: 1,
  }],
  success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: cancelUrl,
  metadata: { bookingId: String(bookingId) },
});
```

- Montant lu depuis `bookings.subtotal` + 15 % service fee renter  
- Aucun `capture_method`, `customer`, `payment_method_options`

**(b) Confirmation**

- Stripe envoie `checkout.session.completed`  
- Webhook lit `session.metadata.bookingId`, `session.payment_intent`, `session.amount_total`  
- Mise à jour DB : `status: "accepted"` (Express) ou `"confirmed"` (Edge), `paid_at`, `stripe_checkout_session_id`, `stripe_payment_intent_id`, fees

**(c) Données Stripe stockées en DB (`bookings`)**

| Colonne | Type | Source |
|---------|------|--------|
| `paid_at` | TIMESTAMPTZ | Webhook |
| `stripe_payment_intent_id` | TEXT | `session.payment_intent` |
| `stripe_checkout_session_id` | TEXT | `session.id` |
| `amount_total_paid` | NUMERIC(10,2) | Stripe ou calcul |
| `service_fee_renter`, `service_fee_owner` | NUMERIC | Calculé |
| `owner_payout_amount`, `platform_total_fee` | NUMERIC | Calculé |
| `currency` | TEXT | Stripe |

---

### 2) Flow de réservation

**Création réservation**

- Service : `src/services/supabase/bookings.ts` → `SupabaseBookingsService.createBooking()`
- Utilisation : `BookingDiscussion.tsx`, flow de conversation

**Tables principales**

| Table | Rôle |
|-------|------|
| `bookings` | Réservations (source de vérité) |
| `vehicles` | Véhicules |
| `profiles` | Utilisateurs (id = auth.users) |
| `conversations`, `messages` | Messagerie |
| `checkin_depart`, `checkin_return` | États des lieux |
| `payments` | Existe mais **non utilisée** par les webhooks |

**Colonnes `bookings` pertinentes**

| Colonne | Type | Description |
|---------|------|-------------|
| `start_date` | DATE | Début location |
| `end_date` | DATE | Fin location |
| `start_time`, `end_time` | VARCHAR | Heures |
| `user_id` | UUID | Locataire |
| `vehicle_id` | UUID | Véhicule |
| `status` | VARCHAR | pending, pending_payment, accepted, confirmed, active, completed, cancelled, etc. |
| `subtotal`, `total_price` | NUMERIC | Prix |
| `rental_days` | INTEGER | Jours de location |

**Champs caution (utilisés en UI mais colonnes probablement absentes)**

- `deposit_status` : pending | paid | refunded  
- `deposit_amount` : montant caution

---

### 3) Auth / User

- **user_id** : `bookings.user_id` = `auth.users.id` = `profiles.id`
- **stripe_customer_id** : ❌ **N'existe pas** sur `profiles`
- Mapping Stripe → user : uniquement via `metadata.bookingId` dans la session Checkout

---

## PHASE B — Capacité d'automatisation (J-2 / J+2)

### 4) Scheduler

**Recherche :** cron, schedule, bull, queue, worker, agenda, celery, sidekiq, cloud scheduler, lambda schedule, vercel cron, netlify schedule

**Résultat :** ❌ **Aucun scheduler** dans le projet.

- Références à un cron n8n pour EDL (emails) : `WORKFLOW-N8N-EDL-AUTO-EMAIL.md`, `DIAG-EMAIL-EDL-6-FOIS.md`
- `DEPLOY_DIAG_REPORT.md` : « Pas de cron jobs / tâches planifiées »

**Options recommandées (par simplicité)**

| Option | Avantages | Inconvénients |
|--------|-----------|---------------|
| **Supabase Edge Functions + pg_cron** | Déjà Supabase, DB intégrée | Nécessite activation pg_cron sur le projet |
| **n8n Cron** | n8n déjà utilisé pour emails | Dépendance externe, latence |
| **Railway cron** (si hébergement Railway) | Même infra que l’API | À vérifier selon plan Railway |
| **Vercel Cron** | Si front déployé sur Vercel | Pas adapté si seul Express est sur Railway |

**Recommandation « simple et rapide »** : **n8n Cron**  
- Workflow n8n existant déjà pour EDL  
- Nœud Cron → HTTP Request vers un endpoint dédié (ex. `/api/cron/deposit-hold`, `/api/cron/deposit-release`)  
- Endpoint protégé par secret partagé (header `X-Cron-Secret`)

---

### 5) Webhooks Stripe

**Endpoints**

- Express : `POST /api/stripe/webhook` (`server/index.ts`, l.65)
- Edge : `https://<PROJECT>.functions.supabase.co/stripe-webhook`

**Validation signature**

```typescript
// server/index.ts, l.74-89
if (webhookSecret) {
  event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
}
// Sinon mode dev non sécurisé (parsing JSON direct)
```

**Événements écoutés**

- `checkout.session.completed` uniquement

**Mise à jour DB**

- `supabaseAdmin.from("bookings").update(updatePayload).eq("id", bookingId)`
- Bypass RLS (service role)

---

## PHASE C — Ce qu'il faut pour la caution

### 6) Contexte actuel

- **Stripe Checkout** (pas de PaymentIntents/Elements directs)
- **Backend** : Node + Express + Supabase Edge Functions
- **Injection du flux caution** :
  - Soit séparer : paiement location (Checkout actuel) + flux caution (SetupIntent + PaymentIntent deposit)
  - Soit adapter `create-checkout-session` pour gérer 2 modes : paiement classique vs enregistrement carte + hold ultérieur

---

### 7) Propositions de solution

#### Variante 1 — Extended authorization (hold long)

**Faisabilité :** ✅ Oui pour location véhicule.

- Catégorie « vehicle rental » éligible (Visa, Amex, Discover)
- Fenêtre : jusqu’à **30 jours** (selon réseau)
- Location 15 jours + 48h avant + 48h après ≈ 19 jours → compatible

**Conditions Stripe :**

- `capture_method: "manual"` sur le PaymentIntent
- `payment_method_options.card.request_extended_authorization: "if_available"`
- Plan tarifaire : IC+ (ou contact Stripe si blended pricing)

**Paramétrage côté app :**

- Aujourd’hui : pas de `capture_method` ni `payment_method_options` dans `create-checkout-session`
- À modifier : `create-checkout-session` pour un mode « caution » distinct avec ces options

**Limites :**

- Autorisation max ~30 jours
- Amex : capture avant fin du séjour/location

**Surveillance :**

- Vérifier `charge.payment_method_details.card.capture_before` et `extended_authorization.status`
- Job avant expiration pour capturer ou annuler

---

#### Variante 2 — Enregistrer carte + hold proche du départ (fallback)

- **À la réservation** : SetupIntent pour sauvegarder la carte (`usage: off_session`)
- **J-2** : job crée PaymentIntent `deposit` avec `capture_method: manual` + `confirm` off_session
- **J+2** : job soit `cancel` (si OK), soit `capture` partielle (si sinistre)
- **Si `requires_action` (SCA)** : notifier le client + lien pour ré-authentifier

---

### 8) Plan d’implémentation

#### 8.1 Nouveaux champs DB (`bookings`)

```sql
-- À ajouter (migration)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_payment_intent_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_status TEXT 
  DEFAULT 'pending' CHECK (deposit_status IN ('pending', 'held', 'released', 'captured_partial', 'captured_full', 'failed'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) DEFAULT 1000;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_hold_created_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_capture_due_at TIMESTAMPTZ;
```

**Optionnel (profiles) :**

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
```

#### 8.2 Endpoints à créer

| Endpoint | Rôle |
|----------|------|
| `POST /api/deposit/create-setup-intent` | Init SetupIntent pour enregistrer carte (renvoie `client_secret`) |
| `POST /api/deposit/attach-payment-method` | Attache `pm_xxx` au booking après SetupIntent |
| `POST /api/cron/deposit-hold` | Job J-2 : crée PaymentIntent deposit, `confirm` off_session |
| `POST /api/cron/deposit-release` | Job J+2 : cancel ou capture partielle |
| `POST /api/admin/deposit-capture` | Capture manuelle (admin / sinistre) |
| `POST /api/admin/deposit-cancel` | Annulation manuelle du hold |

#### 8.3 Jobs scheduler (pseudo-code)

**Job J-2 (hold) — appelé par cron (ex. 2x/jour)**

```sql
-- Bookings dont start_date - 2 jours <= now ET deposit_status = 'pending' ET stripe_payment_method_id IS NOT NULL
SELECT id, user_id, stripe_payment_method_id, deposit_amount, start_date 
FROM bookings 
WHERE deposit_status = 'pending' 
  AND stripe_payment_method_id IS NOT NULL
  AND start_date::date - INTERVAL '2 days' <= CURRENT_DATE
  AND status IN ('confirmed', 'accepted');
```

- Pour chaque ligne : créer PaymentIntent `amount: deposit_amount*100`, `capture_method: manual`, `off_session: true`, `customer` (si Stripe Customer)
- `payment_intents.confirm` avec `payment_method`
- Mettre à jour : `deposit_payment_intent_id`, `deposit_status = 'held'`, `deposit_hold_created_at`

**Job J+2 (release) — appelé par cron**

```sql
-- Bookings dont end_date + 2 jours <= now ET deposit_status = 'held'
SELECT id, deposit_payment_intent_id 
FROM bookings 
WHERE deposit_status = 'held' 
  AND (end_date::date + INTERVAL '2 days') <= CURRENT_DATE;
```

- Pour chaque ligne : `paymentIntents.cancel(deposit_payment_intent_id)` si pas de sinistre
- Sinon : `paymentIntents.capture` avec `amount_to_capture` (partiel)
- Mettre à jour : `deposit_status = 'released'` ou `'captured_partial'` / `'captured_full'`

#### 8.4 Webhooks Stripe à écouter

| Événement | Action DB |
|-----------|-----------|
| `payment_intent.succeeded` | Vérifier si deposit → `deposit_status = 'held'` si `requires_capture` |
| `payment_intent.payment_failed` | `deposit_status = 'failed'`, notification client |
| `payment_intent.canceled` | `deposit_status = 'released'` |

#### 8.5 Règles métier

- Si `deposit_status = 'failed'` au J-2 : bloquer la location (email + CTA pour re-saisir carte)
- Si `stripe_payment_method_id` absent au J-2 : idem
- Statuts réservation bloquants pour démarrer : `deposit_status IN ('pending', 'failed')` + `start_date` atteint → pas de passage en `active` sans caution valide

---

## 📁 Liste des fichiers à modifier (sans les modifier)

| Fichier | Zone d’insertion | Modification |
|---------|------------------|--------------|
| `supabase/migrations/` | Nouvelle migration | Ajout colonnes `deposit_*`, optionnel `stripe_customer_id` |
| `supabase/functions/create-checkout-session/index.ts` | Session create | Si variante 1 : `payment_intent_data: { capture_method: 'manual' }`, `payment_method_options` |
| `server/index.ts` | Nouvelles routes | `/api/deposit/*`, `/api/cron/deposit-*` |
| `server/index.ts` | Webhook existant | Gestion `payment_intent.*` pour deposit |
| `src/lib/payerLocation.ts` | Ou nouveau fichier | Flux SetupIntent pour caution (Variante 2) |
| `src/components/PaymentFlowModal.tsx` | Ou étape dédiée | Étape « Enregistrer carte pour caution » avant paiement location |
| `src/pages/renter/RenterBookings.tsx` | Enrichissement | Utiliser `deposit_status` officiellement (colonnes créées) |
| `src/pages/owner/OwnerBookings.tsx` | Idem | Idem |
| `src/services/supabase/bookings.ts` | Types / select | Inclure `deposit_status`, `deposit_amount`, etc. |
| `src/integrations/supabase/types.ts` | Types | Ajouter colonnes deposit si généré par Supabase |

---

## ✅ Checklist de tests

| Cas | Attendu |
|-----|---------|
| **Cas OK** | Carte enregistrée → hold J-2 → libération J+2 → aucun débit |
| **SCA (3D Secure)** | `requires_action` → client reçoit lien → complète auth → hold OK |
| **Carte refusée** | `payment_intent.payment_failed` → `deposit_status = 'failed'` → email + CTA |
| **Expiration hold** | Capture avant `capture_before` OU annulation si trop tard |
| **Capture partielle** | Admin capture montant sinistre → reste annulé |
| **Annulation réservation** | Annuler PaymentIntent deposit si hold déjà créé |

---

## 📌 Synthèse

- **Stack actuel** : Stripe Checkout + Express + Supabase, sans scheduler ni `stripe_customer_id`.
- **Caution** : Variante 1 (extended auth) possible si plan IC+ et durée < 30 jours ; sinon Variante 2 (SetupIntent + PaymentIntent deposit + jobs J-2/J+2).
- **Manquant** : scheduler (recommandation n8n Cron) et colonnes `deposit_*` en migration.
- **Points critiques** : gestion SCA (`requires_action`), surveillance `capture_before`, règles de blocage si caution KO.
