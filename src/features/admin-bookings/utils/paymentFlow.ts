export function todayCollectIso(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T12:00:00.000Z`;
}

export function formatPaymentSummary(booking: Record<string, unknown>, status: string): string | null {
  const paidAt = booking.paid_at;
  const stripePi = booking.stripe_payment_intent_id;
  const opm = booking.offline_payment_method;

  if (!paidAt && status !== "confirmed") return null;

  const dateStr =
    paidAt && !Number.isNaN(new Date(String(paidAt)).getTime())
      ? new Date(String(paidAt)).toLocaleDateString("fr-FR")
      : null;

  if (stripePi && dateStr) return `Payé par CB (Stripe) le ${dateStr}`;
  if (opm === "cash" && dateStr) return `Payé en espèces le ${dateStr}`;
  if (opm === "card_terminal" && dateStr) return `Payé par CB terminal le ${dateStr}`;
  if (dateStr) return `Encaissé le ${dateStr}`;
  if (status === "confirmed") return "Réservation confirmée";
  return null;
}
