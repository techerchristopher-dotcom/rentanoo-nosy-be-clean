# Diagnostic complet: Flow Paiement Stripe → Prise en compte DB Supabase

**Date**: 2025-01-XX  
**Mode**: DIAG uniquement (pas de modification, pas de déploiement)  
**Objectif**: Expliquer précisément le flow de paiement Stripe actuel et son impact sur Supabase

---

## 0) Timeline du flow de paiement

### Timeline numérotée

| # | Étape | Fichier | Fonction/Route | Table/Endpoint | Description |
|---|-------|---------|----------------|----------------|-------------|
| **1** | Clic "Payer" | `src/components/PaymentFlowModal.tsx` | `onPayNow` (ligne 78) | - | Utilisateur clique sur le bouton "Payer" dans la modale |
| **2** | Appel `payerLocation()` | `src/lib/payerLocation.ts` | `payerLocation()` (ligne 12) | - | Fonction appelée avec `reservation` (ReservationPayment) |
| **3** | Création session Stripe | `supabase/functions/create-checkout-session/index.ts` | `Deno.serve()` (ligne 114) | Stripe API | Edge Function crée une Checkout Session Stripe |
| **4** | Redirection Checkout | `src/lib/payerLocation.ts` | `window.location.href = data.url` (ligne 94) | Stripe Checkout | Redirection navigateur vers Stripe Checkout |
| **5** | Paiement validé côté Stripe | Stripe (externe) | - | Stripe API | Utilisateur complète le paiement sur Stripe |
| **6** | Retour sur `/success` | `src/pages/renter/PaymentSuccess.tsx` | `PaymentSuccess` (ligne 4) | - | Stripe redirige vers `STRIPE_SUCCESS_URL` (ex: `/success`) |
| **7** | Réception webhook Stripe | `server/index.ts` OU `supabase/functions/stripe-webhook/index.ts` | `/api/stripe/webhook` (ligne 28) OU `/functions/v1/stripe-webhook` | - | Stripe envoie `checkout.session.completed` (selon config Dashboard) |
| **8** | Mise à jour DB Supabase | `server/index.ts` (ligne 149) OU `supabase/functions/stripe-webhook/index.ts` (ligne 215) | `supabaseAdmin.from("bookings").update()` | `bookings` | Webhook met à jour la table `bookings` avec les infos de paiement |

**Note**: Les étapes 7-8 peuvent se produire **avant** l'étape 6 (retour sur `/success`), car Stripe envoie le webhook de manière asynchrone.

---

## 1) Où le paiement démarre (Front)

### Fichier: `src/lib/payerLocation.ts`

### Appel exact qui initie le paiement

**Fonction**: `payerLocation(reservation: ReservationPayment)` (ligne 12)

**Payload envoyé à l'Edge Function** (lignes 29-33, 55-57):
```typescript
const requestBody = {
  amount: reservation.totalTTC,           // Montant total TTC (subtotal + service_fee_renter)
  description: `Location de ${reservation.voiture}`,  // Description du produit
  bookingId: reservation.id,              // ID de la réservation
};

const { data, error } = await supabase.functions.invoke("create-checkout-session", {
  body: requestBody,
});
```

**Informations transmises**:
- ✅ `amount`: Montant total TTC (number)
- ✅ `description`: Description du produit (string)
- ✅ `bookingId`: ID de la réservation (string | number)

**Réponse attendue** (lignes 87-94):
```typescript
{
  url: "https://checkout.stripe.com/..."  // URL de redirection Stripe Checkout
}
```

**Redirection**: `window.location.href = data.url` (ligne 94)

---

### Pages / Routes liées au retour paiement

**Route `/success`** (`src/App.tsx` ligne 79):
```typescript
<Route path="/success" element={<PaymentSuccess />} />
```

**Composant**: `src/pages/renter/PaymentSuccess.tsx`

**Comportement au chargement** (lignes 7-12):
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    navigate("/me/renter/bookings?afterPayment=1");
  }, 2500);
  return () => clearTimeout(timer);
}, [navigate]);
```

**Actions**:
- ❌ **Aucun fetch** vers l'API
- ❌ **Aucune mise à jour DB** côté client
- ❌ **Aucune lecture** de query params (`session_id`, etc.)
- ✅ **Redirection automatique** vers `/me/renter/bookings?afterPayment=1` après 2.5 secondes

**Route `/cancel`** (`src/App.tsx` ligne 80):
```typescript
<Route path="/cancel" element={<PaymentCancel />} />
```

**Composant**: `src/pages/renter/PaymentCancel.tsx` - Affiche simplement un message, aucune action DB.

---

## 2) Création Stripe Checkout (Edge Function)

### Fichier: `supabase/functions/create-checkout-session/index.ts`

### Création de la Checkout Session

**Lignes 342-362**:
```typescript
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  payment_method_types: ["card"],
  line_items: [
    {
      price_data: {
        currency: "eur",
        product_data: {
          name: description,
        },
        unit_amount: Math.round(amount * 100), // Convertir en centimes
      },
      quantity: 1,
    },
  ],
  success_url: successUrl,    // Depuis Deno.env.get("STRIPE_SUCCESS_URL")
  cancel_url: cancelUrl,    // Depuis Deno.env.get("STRIPE_CANCEL_URL")
  metadata: {
    ...(bookingId ? { bookingId: String(bookingId) } : {}),
  },
});
```

### Metadata envoyée à Stripe

| Clé | Valeur | Source | Usage |
|-----|--------|--------|-------|
| `bookingId` | `String(bookingId)` | Body de la requête (ligne 229) | Utilisé par le webhook pour identifier la réservation à mettre à jour |

**Note**: Seul `bookingId` est envoyé dans les metadata. Aucun `userId`, `amount`, ou autre info.

---

### Réponse renvoyée au front

**Lignes 371-379**:
```typescript
return new Response(
  JSON.stringify({ url: session.url }),
  { 
    status: 200,
    headers: { 
      "Content-Type": "application/json",
      ...corsHeaders
    }
  }
);
```

**Tableau réponse**:

| Champ | Type | Usage |
|-------|------|-------|
| `url` | `string` | URL Stripe Checkout pour redirection (`https://checkout.stripe.com/...`) |

**Note**: Seule l'URL est renvoyée. Aucun `sessionId`, `paymentIntentId`, ou autre info n'est retournée au front.

---

## 3) Comment la DB est censée être mise à jour après paiement

### 3A) Existe-t-il un webhook ?

✅ **OUI** - Deux webhooks existent dans le code (mais seul celui configuré dans Stripe Dashboard recevra les événements)

#### Webhook #1: Express Server

**Fichier**: `server/index.ts`  
**Route**: `/api/stripe/webhook` (ligne 28)  
**URL complète**: `https://[DOMAIN]/api/stripe/webhook`  
**Event écouté**: `checkout.session.completed` (ligne 64)

**Méthode de vérification**:
- Signature Stripe vérifiée si `STRIPE_WEBHOOK_SECRET` présent (lignes 37-51)
- Mode DEV non sécurisé si `STRIPE_WEBHOOK_SECRET` absent (lignes 52-60)

---

#### Webhook #2: Supabase Edge Function

**Fichier**: `supabase/functions/stripe-webhook/index.ts`  
**Route**: `/functions/v1/stripe-webhook` (déduit du nom de fonction)  
**URL complète**: `https://[PROJECT_REF].functions.supabase.co/stripe-webhook`  
**Event écouté**: `checkout.session.completed` (ligne 104)

**Méthode de vérification**:
- Signature Stripe vérifiée si `STRIPE_WEBHOOK_SECRET` présent (lignes 64-87)
- Mode DEV non sécurisé si `STRIPE_WEBHOOK_SECRET` absent (lignes 88-93)

---

### 3B) Qu'est-ce qui est écrit dans Supabase quand un webhook est reçu ?

#### Table impactée

**Table**: `bookings` (unique table modifiée)

---

#### Champs modifiés (Webhook Express - `server/index.ts`)

**Lignes 117-129**:
```typescript
const updatePayload = {
  status: "accepted",                                    // Statut de la réservation
  paid_at: new Date().toISOString(),                     // Timestamp du paiement
  stripe_payment_intent_id: paymentIntentId || null,     // ID PaymentIntent Stripe
  stripe_checkout_session_id: checkoutSessionId,         // ID Checkout Session Stripe
  amount_total_paid: amountTotal || amountTotalPaid,     // Montant total payé (depuis Stripe ou calculé)
  service_fee_renter: serviceFeeRenter,                  // Frais service locataire (15% subtotal)
  service_fee_owner: serviceFeeOwner,                    // Frais service propriétaire (15% subtotal)
  owner_payout_amount: ownerPayoutAmount,                // Revenu propriétaire (subtotal - service_fee_owner)
  platform_total_fee: platformTotalFee,                 // Commission totale plateforme (30% subtotal)
  currency,                                              // Devise (EUR)
  updated_at: new Date().toISOString(),                  // Timestamp de mise à jour
};
```

**Requête Supabase** (lignes 149-153):
```typescript
const { data: updateData, error: updateErr } = await supabaseAdmin
  .from("bookings")
  .update(updatePayload)
  .eq("id", bookingId)
  .select();
```

---

#### Champs modifiés (Webhook Edge Function - `supabase/functions/stripe-webhook/index.ts`)

**Lignes 181-193**:
```typescript
const updatePayload = {
  status: "accepted",
  paid_at: now,
  stripe_payment_intent_id: paymentIntentId,
  stripe_checkout_session_id: checkoutSessionId,
  amount_total_paid: amountTotalPaid,                   // Depuis Stripe (amount_total / 100)
  service_fee_renter: serviceFeeRenter,
  service_fee_owner: serviceFeeOwner,
  owner_payout_amount: ownerPayoutAmount,
  platform_total_fee: platformTotalFee,
  currency,
  updated_at: now,
};
```

**Requête Supabase** (lignes 215-219):
```typescript
const { data: updateData, error: updateErr } = await supabaseAdmin
  .from("bookings")
  .update(updatePayload)
  .eq("id", bookingId)
  .select();
```

---

#### Tableau récapitulatif des champs modifiés

| Champ | Type | Source | Valeur |
|-------|------|--------|--------|
| `status` | `varchar` | Hardcodé | `"accepted"` |
| `paid_at` | `timestamptz` | `new Date().toISOString()` | Timestamp actuel |
| `stripe_payment_intent_id` | `text` | `session.payment_intent` (Stripe) | ID PaymentIntent ou `null` |
| `stripe_checkout_session_id` | `text` | `session.id` (Stripe) | ID Checkout Session |
| `amount_total_paid` | `numeric(10,2)` | `session.amount_total / 100` (Stripe) OU `calcRenterTotal(subtotal)` | Montant total payé |
| `service_fee_renter` | `numeric(10,2)` | `calcServiceFeeRenter(subtotal)` | 15% du subtotal |
| `service_fee_owner` | `numeric(10,2)` | `calcServiceFeeOwner(subtotal)` | 15% du subtotal |
| `owner_payout_amount` | `numeric(10,2)` | `calcOwnerPayout(subtotal)` | `subtotal - service_fee_owner` |
| `platform_total_fee` | `numeric(10,2)` | `calcPlatformTotalFee(subtotal)` | `service_fee_renter + service_fee_owner` |
| `currency` | `text` | `session.currency` (Stripe) | Devise (ex: "EUR") |
| `updated_at` | `timestamptz` | `new Date().toISOString()` | Timestamp actuel |

---

#### Condition "paiement considéré OK"

**Dans le webhook**:
- ✅ Event type: `checkout.session.completed` (ligne 64 Express, ligne 104 Edge Function)
- ✅ `bookingId` présent dans `session.metadata.bookingId` (ligne 66 Express, ligne 114 Edge Function)
- ✅ Booking existe dans DB (ligne 78-82 Express, ligne 141-145 Edge Function)

**Résultat**: Si toutes ces conditions sont remplies, le webhook met à jour la DB avec `status: "accepted"` et `paid_at: <timestamp>`.

---

## 4) Analyse DB Supabase : schéma, triggers, RLS

### Tables "métier" liées au paiement

**Table principale**: `bookings`

**Colonnes liées au paiement** (d'après `supabase/migrations/002_add_service_fee_columns.sql`):
- `status` (varchar) - Statut de la réservation
- `paid_at` (timestamptz) - Timestamp du paiement
- `stripe_payment_intent_id` (text) - ID PaymentIntent Stripe
- `stripe_checkout_session_id` (text) - ID Checkout Session Stripe
- `amount_total_paid` (numeric(10,2)) - Montant total payé
- `service_fee_renter` (numeric(10,2)) - Frais service locataire
- `service_fee_owner` (numeric(10,2)) - Frais service propriétaire
- `owner_payout_amount` (numeric(10,2)) - Revenu propriétaire
- `platform_total_fee` (numeric(10,2)) - Commission totale plateforme
- `currency` (text) - Devise du paiement

**Table secondaire**: `payments` (d'après `SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` lignes 334-347)
- Existe dans le schéma mais **n'est pas utilisée** par les webhooks actuels
- Les webhooks mettent à jour directement `bookings`, pas `payments`

---

### Triggers

**Recherche dans les migrations**:
- ❌ **Aucun trigger** trouvé sur la table `bookings` lié au paiement
- ✅ Trigger `trg_dictionary_entries_updated_at` trouvé (mais pour `dictionary_entries`, pas `bookings`)

**Conclusion**: Aucun trigger automatique ne met à jour d'autres tables quand un paiement est enregistré.

---

### RLS (Row Level Security)

**Recherche dans les migrations**:
- ✅ **RLS activé** sur `bookings` (`SCRIPT-ALIGN-RLS-POLICIES.sql` ligne 21)
- ✅ **Policies RLS** trouvées pour `bookings` (`SCRIPT-ALIGN-RLS-POLICIES.sql` lignes 95-139)

**Policies RLS pour `bookings`**:

| Policy | Opération | Condition |
|--------|-----------|-----------|
| `Users can create bookings` | INSERT | `auth.uid() = user_id` |
| `Users can update their bookings` | UPDATE | `auth.uid() = user_id` |
| `Users can view their bookings` | SELECT | `auth.uid() = user_id` |
| `owners_can_update_vehicle_bookings_status` | UPDATE | Owner du véhicule |
| `owners_can_view_vehicle_bookings` | SELECT | Owner du véhicule |
| `renters_can_delete_own_bookings` | DELETE | `auth.uid() = user_id` |
| `renters_can_insert_own_bookings` | INSERT | `auth.uid() = user_id` |
| `renters_can_update_own_bookings` | UPDATE | `auth.uid() = user_id` |
| `renters_can_view_own_bookings` | SELECT | `auth.uid() = user_id` |

**Qui a le droit de mettre à jour ces colonnes ?**

**Webhooks**:
- ✅ Utilisent `supabaseAdmin` (service role) - **bypass RLS**
- ✅ Peuvent mettre à jour toutes les colonnes sans restriction RLS
- ✅ **Seuls les webhooks** peuvent mettre à jour les colonnes de paiement (`paid_at`, `stripe_*`, etc.)

**Client frontend**:
- ⚠️ **Policies RLS** permettent UPDATE si `auth.uid() = user_id` OU si owner du véhicule
- ⚠️ **Risque**: Un utilisateur pourrait théoriquement mettre à jour `status` via RLS, mais **pas** les colonnes de paiement (pas de policy spécifique)
- ⚠️ **Recommandation**: Les colonnes de paiement (`paid_at`, `stripe_*`, etc.) devraient être **read-only** côté client (pas de policy UPDATE spécifique pour ces colonnes)

---

## 5) Vérité produit : "à quel moment on considère la réservation payée ?"

### Conclusion en 3 lignes

1. **Aujourd'hui**: "paiement pris en compte" = **webhook Stripe reçu et DB mise à jour** (pas juste l'arrivée sur `/success`)
2. **DB modifiée quand**: **Webhook Stripe `checkout.session.completed`** met à jour la table `bookings` avec `status: "accepted"`, `paid_at: <timestamp>`, et les infos Stripe
3. **Si fail webhook**: **Conséquence**: La DB n'est **pas** mise à jour, la réservation reste en statut `pending` ou `pending_payment`, et l'utilisateur voit "non payé" même s'il a payé sur Stripe

---

### Détails

**Fonction de vérification** (`src/pages/renter/RenterBookings.tsx` lignes 44-57):
```typescript
function isBookingPaid(booking: BookingWithDetails): boolean {
  // Vérifier le statut
  if (booking.status === "accepted" || booking.status === "confirmed") {
    return true;
  }
  
  // Vérifier les champs de paiement
  const bookingAny = booking as any;
  if (bookingAny.paid_at || bookingAny.stripe_checkout_session_id || bookingAny.stripe_payment_intent_id) {
    return true;
  }
  
  return false;
}
```

**Critères "payé"**:
- ✅ `status === "accepted"` OU `status === "confirmed"`
- ✅ `paid_at` défini (non null)
- ✅ `stripe_checkout_session_id` défini (non null)
- ✅ `stripe_payment_intent_id` défini (non null)

**Conclusion**: La page `/success` **ne vérifie pas** si le paiement est réellement enregistré. Elle fait simplement une redirection. La vérification se fait lors du rechargement de `/me/renter/bookings` via `isBookingPaid()`.

---

## 6) Format final obligatoire

### 6.1) Diagramme texte (sequence diagram)

```
Frontend (payerLocation.ts)
  │
  ├─> [1] Clic "Payer" (PaymentFlowModal)
  │
  ├─> [2] Appel payerLocation(reservation)
  │     │
  │     └─> Payload: { amount, description, bookingId }
  │
  ├─> [3] supabase.functions.invoke("create-checkout-session", { body })
  │     │
  │     └─> Edge Function (create-checkout-session/index.ts)
  │           │
  │           ├─> [4] stripe.checkout.sessions.create({ metadata: { bookingId } })
  │           │     │
  │           │     └─> Stripe API
  │           │
  │           └─> [5] Retourne { url: "https://checkout.stripe.com/..." }
  │
  ├─> [6] window.location.href = data.url
  │     │
  │     └─> Redirection vers Stripe Checkout
  │
  │
Stripe Checkout (externe)
  │
  ├─> [7] Utilisateur complète le paiement
  │
  ├─> [8] Stripe envoie webhook checkout.session.completed
  │     │
  │     ├─> Option A: server/index.ts (/api/stripe/webhook)
  │     │     │
  │     │     └─> [9] supabaseAdmin.from("bookings").update({ status: "accepted", paid_at, ... })
  │     │
  │     └─> Option B: supabase/functions/stripe-webhook/index.ts
  │           │
  │           └─> [9] supabaseAdmin.from("bookings").update({ status: "accepted", paid_at, ... })
  │
  └─> [10] Redirection vers STRIPE_SUCCESS_URL (/success)
        │
        └─> PaymentSuccess.tsx
              │
              └─> [11] Redirection vers /me/renter/bookings?afterPayment=1 (après 2.5s)
                    │
                    └─> RenterBookings.tsx
                          │
                          └─> [12] isBookingPaid() vérifie status/paid_at/stripe_* (lecture DB)
```

---

### 6.2) Tables & champs modifiés

| Table | Opération | Champs modifiés | Condition |
|-------|-----------|-----------------|-----------|
| `bookings` | `UPDATE` | `status`, `paid_at`, `stripe_payment_intent_id`, `stripe_checkout_session_id`, `amount_total_paid`, `service_fee_renter`, `service_fee_owner`, `owner_payout_amount`, `platform_total_fee`, `currency`, `updated_at` | `id = bookingId` (depuis metadata Stripe) |

**Quand**: Lors de la réception du webhook `checkout.session.completed` (asynchrone, peut arriver avant ou après la redirection `/success`)

**Qui**: Webhook (Express ou Edge Function) via `supabaseAdmin` (service role, bypass RLS)

---

### 6.3) Code locations : fichiers + lignes

| Étape | Fichier | Lignes | Description |
|-------|---------|--------|-------------|
| **Init paiement** | `src/lib/payerLocation.ts` | 12-104 | Fonction `payerLocation()` qui appelle l'Edge Function |
| **Création session** | `supabase/functions/create-checkout-session/index.ts` | 114-406 | Edge Function qui crée la Checkout Session Stripe |
| **Metadata Stripe** | `supabase/functions/create-checkout-session/index.ts` | 359-361 | Envoi de `bookingId` dans `metadata` |
| **Webhook Express** | `server/index.ts` | 27-189 | Route `/api/stripe/webhook` qui traite `checkout.session.completed` |
| **Webhook Edge** | `supabase/functions/stripe-webhook/index.ts` | 49-261 | Edge Function qui traite `checkout.session.completed` |
| **Update DB Express** | `server/index.ts` | 149-153 | `supabaseAdmin.from("bookings").update()` |
| **Update DB Edge** | `supabase/functions/stripe-webhook/index.ts` | 215-219 | `supabaseAdmin.from("bookings").update()` |
| **Page success** | `src/pages/renter/PaymentSuccess.tsx` | 4-33 | Composant qui redirige vers `/me/renter/bookings?afterPayment=1` |
| **Vérification payé** | `src/pages/renter/RenterBookings.tsx` | 44-57 | Fonction `isBookingPaid()` qui vérifie status/paid_at/stripe_* |

---

### 6.4) Point de vérité : où on décide "paid"

**Point de vérité**: **Webhook Stripe** (Express ou Edge Function)

**Critères**:
1. ✅ Event `checkout.session.completed` reçu
2. ✅ `bookingId` présent dans `session.metadata.bookingId`
3. ✅ Booking existe dans DB
4. ✅ Update DB réussi avec `status: "accepted"` et `paid_at: <timestamp>`

**Vérification côté front**: `isBookingPaid()` lit la DB et vérifie:
- `status === "accepted"` OU `status === "confirmed"`
- OU `paid_at` défini
- OU `stripe_checkout_session_id` défini
- OU `stripe_payment_intent_id` défini

**Conclusion**: Le front **ne décide pas** si c'est payé. Il **lit** la DB mise à jour par le webhook.

---

### 6.5) Gaps / risques

#### Gap #1: Page `/success` ne vérifie pas le paiement (RISQUE: Moyen)

**Problème**: La page `/success` redirige automatiquement sans vérifier si:
- Le webhook a été reçu
- La DB a été mise à jour
- Le paiement est réellement confirmé

**Conséquence**: L'utilisateur peut arriver sur `/success` même si le webhook a échoué, et voir "non payé" après redirection.

**Preuve**: `src/pages/renter/PaymentSuccess.tsx` lignes 7-12 - Aucun fetch, aucune vérification.

---

#### Gap #2: Deux webhooks existent, seul un est actif (RISQUE: Faible)

**Problème**: Deux webhooks sont implémentés (Express et Edge Function), mais seul celui configuré dans Stripe Dashboard recevra les événements.

**Conséquence**: Si le webhook configuré échoue, l'autre ne recevra pas les événements (pas de fallback).

**Preuve**: 
- `server/index.ts` ligne 28: `/api/stripe/webhook`
- `supabase/functions/stripe-webhook/index.ts` ligne 49: Edge Function webhook

---

#### Gap #3: Pas de vérification server-side du `session_id` sur `/success` (RISQUE: Faible)

**Problème**: La page `/success` ne vérifie pas avec Stripe API si le `session_id` (si présent dans query params) correspond à un paiement réellement complété.

**Conséquence**: Un utilisateur pourrait accéder à `/success` manuellement sans avoir payé (mais la DB ne serait pas mise à jour car le webhook ne serait pas déclenché).

**Preuve**: `src/pages/renter/PaymentSuccess.tsx` - Aucune vérification Stripe.

---

#### Gap #4: Si le webhook échoue, la DB n'est pas mise à jour (RISQUE: Critique)

**Problème**: Si le webhook échoue (erreur DB, timeout, secret manquant, etc.), la DB n'est **jamais** mise à jour, même si le paiement a été complété sur Stripe.

**Conséquence**: 
- L'utilisateur a payé sur Stripe
- La DB reste en statut `pending` ou `pending_payment`
- L'utilisateur voit "non payé" dans l'app
- **Pas de mécanisme de récupération automatique**

**Preuve**: Les webhooks retournent une erreur si l'update DB échoue (ligne 166-169 Express, ligne 232-241 Edge Function), mais Stripe peut retenter. Si l'erreur persiste, la DB ne sera jamais mise à jour.

---

#### Gap #5: Table `payments` existe mais n'est pas utilisée (RISQUE: Faible)

**Problème**: Une table `payments` existe dans le schéma (`SCRIPT-RECREATE-SCHEMA-RENTANOO.sql` lignes 334-347), mais les webhooks mettent à jour directement `bookings`, pas `payments`.

**Conséquence**: La table `payments` est inutilisée, ce qui peut créer de la confusion.

**Preuve**: Aucun `INSERT` ou `UPDATE` sur `payments` dans les webhooks.

---

## 7) Bonus: Stockage des IDs Stripe

### IDs Stripe stockés dans DB

**Table**: `bookings`

**Colonnes**:
- ✅ `stripe_checkout_session_id` (text) - ID de la Checkout Session (ex: `cs_test_xxx`)
- ✅ `stripe_payment_intent_id` (text) - ID du PaymentIntent (ex: `pi_xxx`) - peut être `null`

**Où sont-ils stockés**:
- Webhook Express: Lignes 120-121 (`server/index.ts`)
- Webhook Edge Function: Lignes 184-185 (`supabase/functions/stripe-webhook/index.ts`)

**Source**: `session.id` (Checkout Session ID) et `session.payment_intent` (PaymentIntent ID) depuis l'event Stripe.

---

### Vérification server-side du `session_id` sur `/success`

❌ **Aucune vérification** server-side du `session_id` sur la page `/success`.

**Preuve**: `src/pages/renter/PaymentSuccess.tsx` - Aucun code qui:
- Lit les query params (`session_id`)
- Appelle Stripe API pour vérifier le statut
- Vérifie si le paiement est réellement complété

**Conclusion**: La page `/success` fait confiance à Stripe pour la redirection, mais ne vérifie pas explicitement le statut du paiement.

---

## 8) Résumé exécutif

### Flow complet

1. **Front** → Appel `payerLocation()` avec `{ amount, description, bookingId }`
2. **Edge Function** → Crée Checkout Session Stripe avec `metadata: { bookingId }`
3. **Stripe** → Utilisateur paie sur Checkout
4. **Stripe** → Envoie webhook `checkout.session.completed` (asynchrone)
5. **Webhook** → Met à jour `bookings` avec `status: "accepted"`, `paid_at`, et infos Stripe
6. **Stripe** → Redirige vers `/success`
7. **Front** → `/success` redirige vers `/me/renter/bookings?afterPayment=1`
8. **Front** → `isBookingPaid()` vérifie la DB et affiche "payé" si `status === "accepted"` ou `paid_at` défini

### Point de vérité

**"Paiement pris en compte"** = **Webhook Stripe a mis à jour la DB** avec `status: "accepted"` et `paid_at: <timestamp>`

**Pas** juste l'arrivée sur `/success`.

### Risques identifiés

1. **Critique**: Si le webhook échoue, la DB n'est jamais mise à jour (paiement perdu côté app)
2. **Moyen**: Page `/success` ne vérifie pas si le paiement est réellement enregistré
3. **Faible**: Pas de vérification server-side du `session_id` sur `/success`
4. **Faible**: Deux webhooks existent, seul un est actif (pas de fallback)

---

**Note**: Ce diagnostic est **uniquement informatif**. Aucune modification n'a été apportée au code, aux secrets, ou à la configuration. Les actions correctives doivent être effectuées manuellement après analyse des risques identifiés.

