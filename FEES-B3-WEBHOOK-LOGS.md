# FEES-B3 — Logs DEV-only pour tracer l'écriture webhook → DB

**Date**: 2025-01-27  
**Statut**: ✅ **LOGS AJOUTÉS**

---

## ✅ MODIFICATIONS EFFECTUÉES

### B3.1 Logs DEV-only ajoutés

#### Webhook Express (`server/index.ts`)

**Fichier**: `server/index.ts`  
**Lignes modifiées**: 115-136

**Changements**:
1. ✅ Extraction du payload dans une variable `updatePayload` (lignes 117-130)
2. ✅ Log DEV-only **avant** update (lignes 132-145) — condition: `process.env.NODE_ENV !== "production"`
3. ✅ Ajout de `.select()` pour récupérer les données après update (ligne 147)
4. ✅ Log DEV-only **après** update (lignes 149-156) — condition: `process.env.NODE_ENV !== "production"`

**Trace marker**: `"EXPRESS_WEBHOOK"`

#### Webhook Edge Function (`supabase/functions/stripe-webhook/index.ts`)

**Fichier**: `supabase/functions/stripe-webhook/index.ts`  
**Lignes modifiées**: 175-199

**Changements**:
1. ✅ Extraction du payload dans une variable `updatePayload` (lignes 179-192)
2. ✅ Détection environnement DEV (ligne 194): `!Deno.env.get("DENO_ENV") || Deno.env.get("DENO_ENV") !== "production"`
3. ✅ Log DEV-only **avant** update (lignes 195-208) — condition: `isDev`
4. ✅ Ajout de `.select()` pour récupérer les données après update (ligne 211)
5. ✅ Log DEV-only **après** update (lignes 213-220) — condition: `isDev`

**Trace marker**: `"EDGE_WEBHOOK"`

---

## 📋 DIFF EXACT DES MODIFICATIONS

### Diff 1: `server/index.ts`

**Avant** (lignes 108-136):
```typescript
        // Alerte si désalignement montant Stripe vs calcul (tolérance arrondis)
        if (amountTotal && Math.abs(amountTotal - amountTotalPaid) > 0.02) {
          console.warn("⚠️ Stripe amount_total différent du calcul business", {
            amountTotalFromStripe: amountTotal,
            amountTotalPaid,
          });
        }

        const { error: updateErr } = await supabaseAdmin
          .from("bookings")
          .update({
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
          })
          .eq("id", bookingId);

        if (updateErr) {
          console.error("❌ Update bookings après paiement:", updateErr);
          return res.status(500).json({ ok: false, error: updateErr.message });
        }
```

**Après** (lignes 108-156):
```typescript
        // Alerte si désalignement montant Stripe vs calcul (tolérance arrondis)
        if (amountTotal && Math.abs(amountTotal - amountTotalPaid) > 0.02) {
          console.warn("⚠️ Stripe amount_total différent du calcul business", {
            amountTotalFromStripe: amountTotal,
            amountTotalPaid,
          });
        }

        // Préparer le payload pour l'update
        const updatePayload = {
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
        };

        // Log DEV-only avant update
        if (process.env.NODE_ENV !== "production") {
          console.info("[fees-webhook-write:before]", {
            webhook: "EXPRESS_WEBHOOK",
            bookingId,
            status: updatePayload.status,
            currency: updatePayload.currency,
            paid_at: updatePayload.paid_at,
            stripe_checkout_session_id: updatePayload.stripe_checkout_session_id,
            stripe_payment_intent_id: updatePayload.stripe_payment_intent_id,
            amount_total_paid: updatePayload.amount_total_paid,
            service_fee_renter: updatePayload.service_fee_renter,
            service_fee_owner: updatePayload.service_fee_owner,
            owner_payout_amount: updatePayload.owner_payout_amount,
            platform_total_fee: updatePayload.platform_total_fee,
          });
        }

        const { data: updateData, error: updateErr } = await supabaseAdmin
          .from("bookings")
          .update(updatePayload)
          .eq("id", bookingId)
          .select();

        // Log DEV-only après update
        if (process.env.NODE_ENV !== "production") {
          console.info("[fees-webhook-write:after]", {
            webhook: "EXPRESS_WEBHOOK",
            bookingId,
            ok: !updateErr,
            error: updateErr?.message || null,
            data: updateData ? "updated" : null,
          });
        }

        if (updateErr) {
          console.error("❌ Update bookings après paiement:", updateErr);
          return res.status(500).json({ ok: false, error: updateErr.message });
        }
```

### Diff 2: `supabase/functions/stripe-webhook/index.ts`

**Avant** (lignes 175-199):
```typescript
  // Self-check DEV-only
  validateFeeCalculations(commissionBase, serviceFeeRenter, serviceFeeOwner, platformTotalFee);

  const now = new Date().toISOString();

  // 7. Mise à jour de la réservation dans Supabase
  const { error: updateErr } = await supabaseAdmin
    .from("bookings")
    .update({
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
    })
    .eq("id", bookingId);

  if (updateErr) {
    console.error("❌ Erreur mise à jour réservation:", updateErr);
```

**Après** (lignes 175-220):
```typescript
  // Self-check DEV-only
  validateFeeCalculations(commissionBase, serviceFeeRenter, serviceFeeOwner, platformTotalFee);

  const now = new Date().toISOString();

  // Préparer le payload pour l'update
  const updatePayload = {
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
  };

  // Log DEV-only avant update (Edge Function - utiliser Deno.env ou vérifier si pas en prod)
  const isDev = !Deno.env.get("DENO_ENV") || Deno.env.get("DENO_ENV") !== "production";
  if (isDev) {
    console.info("[fees-webhook-write:before]", {
      webhook: "EDGE_WEBHOOK",
      bookingId,
      status: updatePayload.status,
      currency: updatePayload.currency,
      paid_at: updatePayload.paid_at,
      stripe_checkout_session_id: updatePayload.stripe_checkout_session_id,
      stripe_payment_intent_id: updatePayload.stripe_payment_intent_id,
      amount_total_paid: updatePayload.amount_total_paid,
      service_fee_renter: updatePayload.service_fee_renter,
      service_fee_owner: updatePayload.service_fee_owner,
      owner_payout_amount: updatePayload.owner_payout_amount,
      platform_total_fee: updatePayload.platform_total_fee,
    });
  }

  // 7. Mise à jour de la réservation dans Supabase
  const { data: updateData, error: updateErr } = await supabaseAdmin
    .from("bookings")
    .update(updatePayload)
    .eq("id", bookingId)
    .select();

  // Log DEV-only après update
  if (isDev) {
    console.info("[fees-webhook-write:after]", {
      webhook: "EDGE_WEBHOOK",
      bookingId,
      ok: !updateErr,
      error: updateErr?.message || null,
      data: updateData ? "updated" : null,
    });
  }

  if (updateErr) {
    console.error("❌ Erreur mise à jour réservation:", updateErr);
```

---

## ✅ B3.2 TRACE MARKERS

**Trace markers ajoutés**:
- ✅ `"EXPRESS_WEBHOOK"` dans `server/index.ts`
- ✅ `"EDGE_WEBHOOK"` dans `supabase/functions/stripe-webhook/index.ts`

**Utilisation**: Rechercher `[fees-webhook-write:before]` ou `[fees-webhook-write:after]` dans les logs pour identifier quel webhook est actif.

---

## ✅ B3.3 REQUÊTE SQL DE VÉRIFICATION

### Requête SQL (prête à coller dans Supabase SQL Editor)

```sql
-- Vérifier l'écriture des frais après un paiement test
-- Remplacer <BOOKING_ID> ou <SESSION_ID> par les valeurs réelles

SELECT 
  id, 
  status, 
  paid_at, 
  stripe_payment_intent_id, 
  stripe_checkout_session_id,
  amount_total_paid, 
  service_fee_renter, 
  service_fee_owner,
  owner_payout_amount, 
  platform_total_fee, 
  currency, 
  updated_at
FROM public.bookings
WHERE id = '<BOOKING_ID>'
   OR stripe_checkout_session_id = '<SESSION_ID>'
ORDER BY updated_at DESC
LIMIT 1;
```

### Exemple avec valeurs réelles

```sql
-- Exemple: vérifier par booking ID
SELECT 
  id, 
  status, 
  paid_at, 
  stripe_payment_intent_id, 
  stripe_checkout_session_id,
  amount_total_paid, 
  service_fee_renter, 
  service_fee_owner,
  owner_payout_amount, 
  platform_total_fee, 
  currency, 
  updated_at
FROM public.bookings
WHERE id = '123e4567-e89b-12d3-a456-426614174000'
ORDER BY updated_at DESC
LIMIT 1;

-- Exemple: vérifier par session Stripe
SELECT 
  id, 
  status, 
  paid_at, 
  stripe_payment_intent_id, 
  stripe_checkout_session_id,
  amount_total_paid, 
  service_fee_renter, 
  service_fee_owner,
  owner_payout_amount, 
  platform_total_fee, 
  currency, 
  updated_at
FROM public.bookings
WHERE stripe_checkout_session_id = 'cs_test_...'
ORDER BY updated_at DESC
LIMIT 1;
```

### Vérification des colonnes non-null

```sql
-- Vérifier que les colonnes ont bien été remplies après un paiement
SELECT 
  id,
  CASE WHEN paid_at IS NOT NULL THEN '✅' ELSE '❌' END as paid_at_set,
  CASE WHEN stripe_checkout_session_id IS NOT NULL THEN '✅' ELSE '❌' END as session_id_set,
  CASE WHEN stripe_payment_intent_id IS NOT NULL THEN '✅' ELSE '❌' END as payment_intent_set,
  CASE WHEN amount_total_paid IS NOT NULL THEN '✅' ELSE '❌' END as amount_set,
  CASE WHEN service_fee_renter IS NOT NULL THEN '✅' ELSE '❌' END as fee_renter_set,
  CASE WHEN service_fee_owner IS NOT NULL THEN '✅' ELSE '❌' END as fee_owner_set,
  CASE WHEN owner_payout_amount IS NOT NULL THEN '✅' ELSE '❌' END as payout_set,
  CASE WHEN platform_total_fee IS NOT NULL THEN '✅' ELSE '❌' END as platform_fee_set,
  CASE WHEN currency IS NOT NULL THEN '✅' ELSE '❌' END as currency_set
FROM public.bookings
WHERE id = '<BOOKING_ID>'
   OR stripe_checkout_session_id = '<SESSION_ID>'
ORDER BY updated_at DESC
LIMIT 1;
```

---

## ✅ B3.4 VALIDATION

### Lint/Build

**Vérification effectuée**: ✅ Aucune erreur de lint détectée

### Résumé des modifications

**Fichiers modifiés**: 2
1. ✅ `server/index.ts` — Logs DEV-only ajoutés (avant/après update)
2. ✅ `supabase/functions/stripe-webhook/index.ts` — Logs DEV-only ajoutés (avant/après update)

**Lignes ajoutées**:
- `server/index.ts`: ~30 lignes (extraction payload + 2 logs)
- `supabase/functions/stripe-webhook/index.ts`: ~30 lignes (extraction payload + 2 logs)

**Trace markers**: ✅ Ajoutés (`EXPRESS_WEBHOOK` / `EDGE_WEBHOOK`)

**Requête SQL**: ✅ Prête à utiliser

---

## 📊 FORMAT DES LOGS

### Log avant update (`[fees-webhook-write:before]`)

```json
{
  "webhook": "EXPRESS_WEBHOOK" | "EDGE_WEBHOOK",
  "bookingId": "uuid",
  "status": "accepted",
  "currency": "EUR",
  "paid_at": "2025-01-27T...",
  "stripe_checkout_session_id": "cs_test_...",
  "stripe_payment_intent_id": "pi_...",
  "amount_total_paid": 138.00,
  "service_fee_renter": 18.00,
  "service_fee_owner": 18.00,
  "owner_payout_amount": 102.00,
  "platform_total_fee": 36.00
}
```

### Log après update (`[fees-webhook-write:after]`)

```json
{
  "webhook": "EXPRESS_WEBHOOK" | "EDGE_WEBHOOK",
  "bookingId": "uuid",
  "ok": true,
  "error": null,
  "data": "updated"
}
```

**En cas d'erreur**:
```json
{
  "webhook": "EXPRESS_WEBHOOK" | "EDGE_WEBHOOK",
  "bookingId": "uuid",
  "ok": false,
  "error": "error message",
  "data": null
}
```

---

## 🎯 UTILISATION

### Identifier le webhook actif

Après un paiement test, chercher dans les logs:
- `[fees-webhook-write:before]` avec `"webhook": "EXPRESS_WEBHOOK"` → Webhook Express actif
- `[fees-webhook-write:before]` avec `"webhook": "EDGE_WEBHOOK"` → Webhook Edge Function actif

### Vérifier l'écriture en DB

1. Récupérer le `bookingId` ou `stripe_checkout_session_id` depuis les logs
2. Exécuter la requête SQL de vérification dans Supabase SQL Editor
3. Vérifier que toutes les colonnes sont remplies (non-null)

---

**FIN DE FEES-B3**

