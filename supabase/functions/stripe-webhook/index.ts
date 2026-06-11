// deno-lint-ignore-file
// @ts-nocheck
// @allowPublic: true

/**
 * Webhook Stripe (Edge Function Supabase)
 *
 * P2 (fees dynamic v2) :
 *   - Ne RECALCULE PLUS les frais locataire (la source de vérité est
 *     `bookings.service_fee_renter` figé par create_web_booking via
 *     compute_renter_fee côté Postgres).
 *   - N'écrit PLUS service_fee_owner, owner_payout_amount, platform_total_fee
 *     (déprécation gracieuse : ces colonnes restent en base pour l'historique
 *     mais ne sont plus alimentées pour les nouveaux bookings).
 *   - Écrit uniquement : status='confirmed', paid_at, amount_total_paid,
 *     currency, stripe_payment_intent_id, stripe_checkout_session_id,
 *     updated_at.
 *   - pricing_mode='admin' : même politique (les frais admin sont gérés par
 *     le backend admin, hors scope webhook).
 *
 * Variables d'environnement nécessaires :
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET (optionnel en dev)
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import Stripe from "https://esm.sh/stripe@latest";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Chargement des secrets d'environnement
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY manquant");
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant");
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// Client Supabase admin (service role)
const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let event: any;

  try {
    // 1. Lire le body brut
    const rawBody = await req.text();

    // 2. Si on a un STRIPE_WEBHOOK_SECRET, on vérifie la signature Stripe
    if (STRIPE_WEBHOOK_SECRET) {
      const sig = req.headers.get("stripe-signature");
      if (!sig) {
        console.error("❌ Pas de stripe-signature dans les headers");
        return new Response(
          JSON.stringify({ ok: false, error: "Signature manquante" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      try {
        event = await stripe.webhooks.constructEventAsync(
          rawBody,
          sig,
          STRIPE_WEBHOOK_SECRET
        );
        console.log("✅ Signature Stripe vérifiée");
      } catch (err) {
        console.error("❌ Signature Stripe invalide:", err?.message);
        return new Response(
          JSON.stringify({ ok: false, error: "Signature invalide" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      // 3. Mode DEV (pas de vérification)
      console.warn(
        "⚠️ STRIPE_WEBHOOK_SECRET non défini -> MODE DEV (pas de vérification de signature)"
      );
      event = JSON.parse(rawBody);
    }
  } catch (err) {
    console.error("❌ Erreur parsing body:", err?.message);
    return new Response(
      JSON.stringify({ ok: false, error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 4. On ne traite que checkout.session.completed
  if (event.type !== "checkout.session.completed") {
    console.log("ℹ️ Event ignoré:", event.type);
    return new Response(
      JSON.stringify({ ok: true, ignored: true, type: event.type }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // 5. Récupérer les infos utiles de la session Stripe
  const session = event.data.object;
  const bookingId = session?.metadata?.bookingId;
  const paymentIntentId = session?.payment_intent ?? null;
  const checkoutSessionId = session?.id ?? null;
  const amountTotalCents = session?.amount_total ?? 0;
  const currency = (session?.currency || "eur").toUpperCase();
  const amountTotalPaid = amountTotalCents / 100;

  console.log("💳 checkout.session.completed reçu:", {
    bookingId,
    checkoutSessionId,
    paymentIntentId,
    amountTotalPaid,
    currency,
  });

  if (!bookingId) {
    console.error("❌ bookingId manquant dans metadata");
    return new Response(
      JSON.stringify({
        ok: false,
        error: "bookingId manquant dans metadata",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    ); // 200 pour que Stripe arrête de retenter
  }

  // 6. Lecture du booking — uniquement pour logger l'état attendu vs payé.
  //    P2 : on ne recalcule PLUS aucun frais ici (la source de vérité est
  //    `bookings.service_fee_renter` + `amount_total_expected`, figés par
  //    create_web_booking côté Postgres).
  const { data: bookingRow, error: fetchErr } = await supabaseAdmin
    .from("bookings")
    .select(
      "subtotal, pricing_mode, payment_method, service_fee_renter, amount_total_expected, service_fee_percent_applied"
    )
    .eq("id", bookingId)
    .single();

  if (fetchErr) {
    console.error("❌ Impossible de lire la réservation:", fetchErr);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Booking not found in DB",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const now = new Date().toISOString();

  // Mapping status: checkout.session.completed (payment_status == 'paid') => 'confirmed'
  const oldStatus = "accepted"; // Ancien statut invalide
  const newStatus = "confirmed"; // Statut conforme à la contrainte DB
  console.log(`📝 [status-mapping] checkout.session.completed → status: "${oldStatus}" → "${newStatus}"`);

  // P2 : payload minimaliste, n'écrit que les colonnes d'encaissement.
  // service_fee_renter, service_fee_owner, owner_payout_amount,
  // platform_total_fee NE SONT PLUS écrits ici.
  const updatePayload = {
    status: newStatus,
    paid_at: now,
    stripe_payment_intent_id: paymentIntentId,
    stripe_checkout_session_id: checkoutSessionId,
    amount_total_paid: amountTotalPaid,
    currency,
    updated_at: now,
  };

  const isDev = !Deno.env.get("DENO_ENV") || Deno.env.get("DENO_ENV") !== "production";
  if (isDev) {
    console.info("[fees-webhook-write:before]", {
      webhook: "EDGE_WEBHOOK",
      bookingId,
      pricing_mode: bookingRow?.pricing_mode,
      payment_method: bookingRow?.payment_method,
      subtotal_DB: bookingRow?.subtotal,
      service_fee_renter_DB: bookingRow?.service_fee_renter,
      service_fee_percent_applied_DB: bookingRow?.service_fee_percent_applied,
      amount_total_expected_DB: bookingRow?.amount_total_expected,
      stripe_amount_total_paid: amountTotalPaid,
      stripe_currency: currency,
      status: updatePayload.status,
      paid_at: updatePayload.paid_at,
      stripe_checkout_session_id: updatePayload.stripe_checkout_session_id,
      stripe_payment_intent_id: updatePayload.stripe_payment_intent_id,
      note: "P2: service_fee_*/owner_payout_amount/platform_total_fee non écrits ici (déprécation).",
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
    return new Response(
      JSON.stringify({
        ok: false,
        error: "DB update failed",
        details: updateErr.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  console.log("✅ Réservation mise à jour avec succès:", {
    bookingId,
    status: newStatus,
    paid_at: now,
    amount_total_paid: amountTotalPaid,
  });

  // 8. Répondre 200 à Stripe -> il arrête de retenter
  return new Response(
    JSON.stringify({
      ok: true,
      bookingId,
      status: newStatus,
      updated: true,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
