// deno-lint-ignore-file
// @ts-nocheck
// @allowPublic: true

/**
 * Webhook Stripe (Edge Function Supabase)
 *
 * Reçoit l'event checkout.session.completed
 * -> Récupère bookingId dans metadata
 * -> Calcule les montants
 * -> Met à jour la table 'bookings'
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

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

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

  // 6. On va chercher la réservation pour calculer les frais
  const { data: bookingRow, error: fetchErr } = await supabaseAdmin
    .from("bookings")
    .select("subtotal")
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

  const commissionBase = Number(bookingRow?.subtotal || 0);

  // 15% locataire / 15% propriétaire
  // Fonctions de calcul des fees (inline pour éviter import externe)
  const SERVICE_FEE_PERCENT_RENTER = 0.15;
  const SERVICE_FEE_PERCENT_OWNER = 0.15;
  
  function calcServiceFeeRenter(subtotal: number): number {
    return Math.round(subtotal * SERVICE_FEE_PERCENT_RENTER * 100) / 100;
  }
  
  function calcServiceFeeOwner(subtotal: number): number {
    return Math.round(subtotal * SERVICE_FEE_PERCENT_OWNER * 100) / 100;
  }
  
  function calcOwnerPayout(subtotal: number): number {
    const serviceFee = calcServiceFeeOwner(subtotal);
    return Math.round((subtotal - serviceFee) * 100) / 100;
  }
  
  function calcPlatformTotalFee(subtotal: number): number {
    const renterFee = calcServiceFeeRenter(subtotal);
    const ownerFee = calcServiceFeeOwner(subtotal);
    return Math.round((renterFee + ownerFee) * 100) / 100;
  }
  
  const serviceFeeRenter = calcServiceFeeRenter(commissionBase);
  const serviceFeeOwner = calcServiceFeeOwner(commissionBase);
  const ownerPayoutAmount = calcOwnerPayout(commissionBase);
  const platformTotalFee = calcPlatformTotalFee(commissionBase);

  const now = new Date().toISOString();

  // Mapping status: checkout.session.completed (payment_status == 'paid') => 'confirmed'
  const oldStatus = "accepted"; // Ancien statut invalide
  const newStatus = "confirmed"; // Statut conforme à la contrainte DB
  console.log(`📝 [status-mapping] checkout.session.completed → status: "${oldStatus}" → "${newStatus}"`);

  // Préparer le payload pour l'update
  const updatePayload = {
    status: newStatus,
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
