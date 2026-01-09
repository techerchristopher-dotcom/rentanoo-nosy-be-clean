# FEES-B1 — Diagnostic: Webhook actif et colonnes écrites

**Date**: 2025-01-27  
**Objectif**: Identifier le webhook Stripe actif et les colonnes DB écrites

---

## ✅ A) PREUVE DU WEBHOOK UTILISÉ

### A.1 Configuration depuis le frontend

**Fichier**: `src/lib/payerLocation.ts`

**Ligne 8**: 
```typescript
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/create-checkout-session`;
```

**Ligne 14-24**: Appel à `create-checkout-session` (Edge Function Supabase)
```typescript
const response = await fetch(EDGE_FUNCTION_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    amount: reservation.totalTTC,
    description: `Location de ${reservation.voiture}`,
    bookingId: reservation.id,
  }),
});
```

**Conclusion**: Le frontend appelle uniquement `create-checkout-session`, pas de configuration de webhook dans le code frontend.

### A.2 Configuration dans create-checkout-session

**Fichier**: `supabase/functions/create-checkout-session/index.ts`

**Lignes 145-165**: Création de la session Stripe Checkout
```typescript
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  payment_method_types: ["card"],
  line_items: [...],
  success_url: successUrl,
  cancel_url: cancelUrl,
  metadata: {
    ...(bookingId ? { bookingId: String(bookingId) } : {}),
  },
});
```

**⚠️ OBSERVATION**: Aucune configuration de webhook URL dans le code. Stripe envoie les événements `checkout.session.completed` vers l'URL webhook configurée dans le **Stripe Dashboard**.

### A.3 Webhooks disponibles dans le code

#### Webhook 1: Express Server (`server/index.ts`)

**Fichier**: `server/index.ts`  
**Route**: `/api/stripe/webhook` (ligne 28)  
**Type**: Express route handler  
**Event**: `checkout.session.completed` (ligne 64)

**URL complète**: `https://[DOMAIN]/api/stripe/webhook`

**Configuration requise**:
- Variable d'environnement: `STRIPE_WEBHOOK_SECRET` (ligne 32)
- Signature vérifiée si `STRIPE_WEBHOOK_SECRET` présent (lignes 37-51)
- Mode dev sans vérification si secret absent (lignes 52-60)

#### Webhook 2: Supabase Edge Function (`supabase/functions/stripe-webhook`)

**Fichier**: `supabase/functions/stripe-webhook/index.ts`  
**Route**: `/functions/v1/stripe-webhook` (déduit du nom de fonction)  
**Type**: Supabase Edge Function (Deno)  
**Event**: `checkout.session.completed` (ligne 104)

**URL complète**: `https://[PROJECT_REF].functions.supabase.co/stripe-webhook`

**Configuration requise**:
- Variables d'environnement: `STRIPE_SECRET_KEY`, `PROJECT_URL`, `SERVICE_ROLE_KEY` (lignes 24-27)
- Variable optionnelle: `STRIPE_WEBHOOK_SECRET` (ligne 25)
- Signature vérifiée si `STRIPE_WEBHOOK_SECRET` présent (lignes 64-87)
- Mode dev sans vérification si secret absent (lignes 88-94)

### A.4 Identification du webhook actif

**⚠️ IMPOSSIBLE À DÉTERMINER DEPUIS LE CODE**

Le webhook actif est configuré dans le **Stripe Dashboard** → Webhooks → Endpoints.

**Pour identifier le webhook actif**:

1. **Stripe Dashboard**:
   - Aller dans: Developers → Webhooks
   - Vérifier l'URL de l'endpoint configuré pour `checkout.session.completed`
   - Comparer avec:
     - `https://[DOMAIN]/api/stripe/webhook` → Webhook Express (`server/index.ts`)
     - `https://[PROJECT_REF].functions.supabase.co/stripe-webhook` → Webhook Edge Function (`supabase/functions/stripe-webhook`)

2. **Variables d'environnement**:
   - Vérifier `STRIPE_WEBHOOK_SECRET` dans les deux environnements
   - Le webhook avec secret configuré est probablement celui utilisé en production

3. **Logs**:
   - Vérifier les logs des deux webhooks lors d'un paiement test
   - Le webhook actif recevra l'événement et loguera `✅ checkout.session.completed reçu`

**Conclusion**: Les deux webhooks sont fonctionnels dans le code, mais seul celui configuré dans Stripe Dashboard recevra les événements.

---

## ✅ B) PAYLOAD DB EXACT (WRITESET)

### B.1 Webhook Express (`server/index.ts`)

**Fichier**: `server/index.ts`  
**Lignes**: 116-131

**Payload DB écrit**:
```typescript
{
  status: "accepted",
  paid_at: new Date().toISOString(),
  stripe_payment_intent_id: paymentIntentId || null,
  stripe_checkout_session_id: checkoutSessionId,
  amount_total_paid: amountTotal || amountTotalPaid,
  service_fee_renter: serviceFeeRenter,
  service_fee_owner: serviceFeeOwner,
  owner_payout_amount: ownerPayoutAmount,
  platform_total_fee: platformTotalFee,
  currency,
  updated_at: new Date().toISOString(),
}
```

**Colonnes écrites** (11 colonnes):
1. `status` → `"accepted"`
2. `paid_at` → `new Date().toISOString()`
3. `stripe_payment_intent_id` → `paymentIntentId || null`
4. `stripe_checkout_session_id` → `checkoutSessionId`
5. `amount_total_paid` → `amountTotal || amountTotalPaid`
6. `service_fee_renter` → `serviceFeeRenter`
7. `service_fee_owner` → `serviceFeeOwner`
8. `owner_payout_amount` → `ownerPayoutAmount`
9. `platform_total_fee` → `platformTotalFee`
10. `currency` → `currency` (ex: "EUR")
11. `updated_at` → `new Date().toISOString()`

### B.2 Webhook Edge Function (`supabase/functions/stripe-webhook`)

**Fichier**: `supabase/functions/stripe-webhook/index.ts`  
**Lignes**: 181-195

**Payload DB écrit**:
```typescript
{
  status: "accepted",
  paid_at: now,
  stripe_payment_intent_id: paymentIntentId,
  stripe_checkout_session_id: checkoutSessionId,
  amount_total_paid: amountTotalPaid,
  service_fee_renter: serviceFeeRenter,
  service_fee_owner: serviceFeeOwner,
  owner_payout_amount: ownerPayoutAmount,
  platform_total_fee: platformTotalFee,
  currency,
  updated_at: now,
}
```

**Colonnes écrites** (11 colonnes):
1. `status` → `"accepted"`
2. `paid_at` → `now` (ISO string)
3. `stripe_payment_intent_id` → `paymentIntentId`
4. `stripe_checkout_session_id` → `checkoutSessionId`
5. `amount_total_paid` → `amountTotalPaid`
6. `service_fee_renter` → `serviceFeeRenter`
7. `service_fee_owner` → `serviceFeeOwner`
8. `owner_payout_amount` → `ownerPayoutAmount`
9. `platform_total_fee` → `platformTotalFee`
10. `currency` → `currency` (ex: "EUR")
11. `updated_at` → `now` (ISO string)

### B.3 Comparaison des deux webhooks

**✅ IDENTIQUES**: Les deux webhooks écrivent exactement les mêmes colonnes avec les mêmes valeurs.

**Différences mineures**:
- `server/index.ts`: `amount_total_paid: amountTotal || amountTotalPaid` (fallback)
- `supabase/functions/stripe-webhook/index.ts`: `amount_total_paid: amountTotalPaid` (pas de fallback)
- `server/index.ts`: `stripe_payment_intent_id: paymentIntentId || null` (explicit null)
- `supabase/functions/stripe-webhook/index.ts`: `stripe_payment_intent_id: paymentIntentId` (peut être null)

**Impact**: Aucun — les deux webhooks écrivent les mêmes données.

---

## ✅ C) VÉRIFICATION SCHÉMA ACTUEL

### C.1 Schéma TypeScript (types générés)

**Fichier**: `src/integrations/supabase/types.ts`  
**Lignes**: 17-83

**Colonnes existantes dans le type `bookings`**:
```typescript
{
  id: string
  user_id: string
  vehicle_id: string
  start_date: string
  end_date: string
  total_price: number
  status: string | null
  created_at: string | null
  updated_at: string | null
  start_time: string | null
  end_time: string | null
  pickup_location: string | null
  selected_options: Json | null
  base_price: number
  options_total: number
  service_fee: number          // ✅ EXISTE
  subtotal: number
  price_per_day: number
  rental_days: number | null
  reference_number: number | null
}
```

### C.2 Schéma SQL (plan de création)

**Fichier**: `ETAPE-3-PLAN-RECREATE-SANS-DONNEES.md`  
**Lignes**: 206-227

**Colonnes définies dans le CREATE TABLE**:
```sql
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  vehicle_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  pickup_location TEXT,
  total_price NUMERIC(10, 2) NOT NULL,
  base_price NUMERIC(10, 2),
  options_total NUMERIC(10, 2),
  service_fee NUMERIC(10, 2),      -- ✅ EXISTE
  subtotal NUMERIC(10, 2),
  price_per_day NUMERIC(10, 2),
  rental_days INTEGER,
  reference_number INTEGER,
  status TEXT,
  selected_options JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### C.3 Colonnes écrites par les webhooks vs schéma actuel

| Colonne | Écrite par webhook | Existe dans schéma | Statut |
|--------|-------------------|-------------------|--------|
| `status` | ✅ | ✅ | ✅ EXISTE |
| `paid_at` | ✅ | ❌ | ❌ **MANQUE** |
| `stripe_payment_intent_id` | ✅ | ❌ | ❌ **MANQUE** |
| `stripe_checkout_session_id` | ✅ | ❌ | ❌ **MANQUE** |
| `amount_total_paid` | ✅ | ❌ | ❌ **MANQUE** |
| `service_fee_renter` | ✅ | ❌ | ❌ **MANQUE** |
| `service_fee_owner` | ✅ | ❌ | ❌ **MANQUE** |
| `owner_payout_amount` | ✅ | ❌ | ❌ **MANQUE** |
| `platform_total_fee` | ✅ | ❌ | ❌ **MANQUE** |
| `currency` | ✅ | ❌ | ❌ **MANQUE** |
| `updated_at` | ✅ | ✅ | ✅ EXISTE |

**Résultat**: **10 colonnes sur 11 manquent** dans le schéma actuel.

**Seules colonnes existantes**:
- ✅ `status` (déjà dans le schéma)
- ✅ `updated_at` (déjà dans le schéma)

**Colonnes manquantes** (8):
- ❌ `paid_at` (TIMESTAMPTZ)
- ❌ `stripe_payment_intent_id` (TEXT)
- ❌ `stripe_checkout_session_id` (TEXT)
- ❌ `amount_total_paid` (NUMERIC(10, 2))
- ❌ `service_fee_renter` (NUMERIC(10, 2))
- ❌ `service_fee_owner` (NUMERIC(10, 2))
- ❌ `owner_payout_amount` (NUMERIC(10, 2))
- ❌ `platform_total_fee` (NUMERIC(10, 2))
- ❌ `currency` (TEXT)

**⚠️ IMPACT CRITIQUE**: Les webhooks échoueront lors de la mise à jour de la table `bookings` car 8 colonnes n'existent pas.

---

## 📊 RÉSUMÉ

### Webhook actif

**⚠️ IMPOSSIBLE À DÉTERMINER DEPUIS LE CODE**

- Les deux webhooks sont fonctionnels dans le code
- Le webhook actif est configuré dans **Stripe Dashboard** → Webhooks
- Vérifier l'URL de l'endpoint dans Stripe Dashboard

**Webhooks disponibles**:
1. Express: `https://[DOMAIN]/api/stripe/webhook` (`server/index.ts`)
2. Edge Function: `https://[PROJECT_REF].functions.supabase.co/stripe-webhook` (`supabase/functions/stripe-webhook`)

### Colonnes écrites

**Les deux webhooks écrivent les mêmes 11 colonnes**:
1. `status` → `"accepted"`
2. `paid_at` → ISO timestamp
3. `stripe_payment_intent_id` → PaymentIntent ID ou null
4. `stripe_checkout_session_id` → Checkout Session ID
5. `amount_total_paid` → Montant total payé (EUR)
6. `service_fee_renter` → Frais renter (15% subtotal)
7. `service_fee_owner` → Frais owner (15% subtotal)
8. `owner_payout_amount` → Revenu owner (subtotal - fee)
9. `platform_total_fee` → Commission totale (renterFee + ownerFee)
10. `currency` → "EUR"
11. `updated_at` → ISO timestamp

### Schéma actuel

**Statut**: ❌ **8 colonnes sur 11 manquent**

**Colonnes existantes** (2/11):
- ✅ `status`
- ✅ `updated_at`

**Colonnes manquantes** (8/11):
- ❌ `paid_at`
- ❌ `stripe_payment_intent_id`
- ❌ `stripe_checkout_session_id`
- ❌ `amount_total_paid`
- ❌ `service_fee_renter`
- ❌ `service_fee_owner`
- ❌ `owner_payout_amount`
- ❌ `platform_total_fee`
- ❌ `currency`

**⚠️ ACTION REQUISE**: Exécuter `scripts/add-service-fee-columns.sql` pour ajouter les colonnes manquantes avant que les webhooks ne soient utilisés.

---

**FIN DU DIAGNOSTIC**

