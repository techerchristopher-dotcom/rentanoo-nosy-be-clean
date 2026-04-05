import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

/**
 * Met à jour une ligne booking_claim_charges après réponse / webhook PaymentIntent.
 */
export async function updateClaimChargeRowFromPaymentIntent(
  supabaseAdmin: SupabaseClient,
  stripe: Stripe,
  claimRowId: string,
  pi: Stripe.PaymentIntent
): Promise<void> {
  const now = new Date().toISOString();

  if (pi.status === "succeeded") {
    const chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id ?? null;
    let receiptUrl: string | null = null;
    if (chargeId) {
      try {
        const ch = await stripe.charges.retrieve(chargeId);
        receiptUrl = ch.receipt_url ?? null;
      } catch {
        /* ignore */
      }
    }
    await supabaseAdmin
      .from("booking_claim_charges")
      .update({
        status: "succeeded",
        stripe_payment_intent_id: pi.id,
        stripe_charge_id: chargeId,
        receipt_url: receiptUrl,
        failure_code: null,
        failure_message: null,
        updated_at: now,
      })
      .eq("id", claimRowId);
    return;
  }

  const lp = pi.last_payment_error;
  let failureCode = lp?.code ?? "payment_failed";
  let failureMessage = lp?.message ?? "Le paiement a échoué.";

  if (pi.status === "requires_action") {
    failureCode = "authentication_required";
    failureMessage =
      "Authentification forte requise : la banque refuse le prélèvement hors session. Le locataire doit ré-authentifier la carte ou en enregistrer une autre.";
  }

  await supabaseAdmin
    .from("booking_claim_charges")
    .update({
      status: "failed",
      stripe_payment_intent_id: pi.id,
      failure_code: failureCode,
      failure_message: failureMessage,
      updated_at: now,
    })
    .eq("id", claimRowId);
}

/**
 * Webhook : réconcilie si metadata.rentanoo_charge_type = booking_claim.
 */
export async function reconcileClaimChargeFromWebhookPaymentIntent(
  supabaseAdmin: SupabaseClient,
  stripe: Stripe,
  pi: Stripe.PaymentIntent
): Promise<void> {
  if (pi.metadata?.rentanoo_charge_type !== "booking_claim") return;

  const claimId = typeof pi.metadata?.claim_charge_id === "string" ? pi.metadata.claim_charge_id.trim() : "";
  if (claimId) {
    await updateClaimChargeRowFromPaymentIntent(supabaseAdmin, stripe, claimId, pi);
    return;
  }

  const { data: row } = await supabaseAdmin
    .from("booking_claim_charges")
    .select("id")
    .eq("stripe_payment_intent_id", pi.id)
    .maybeSingle();

  if (row?.id) {
    await updateClaimChargeRowFromPaymentIntent(supabaseAdmin, stripe, row.id, pi);
  }
}
