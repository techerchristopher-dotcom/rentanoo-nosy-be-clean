import type { ReservationPayment } from "@/components/PaymentFlowModal";

export type RenterPaymentMethod = "card_online" | "cash_on_site" | string;

export function getPaymentMethodFromBooking(booking: Record<string, unknown>): RenterPaymentMethod {
  const raw = booking.payment_method ?? booking.paymentMethod ?? "card_online";
  return String(raw);
}

export function isCashOnSitePayment(method: string): boolean {
  return method === "cash_on_site";
}

export function getRenterPaymentAmountsFromBooking(booking: Record<string, unknown>) {
  const subtotal = Number(booking.subtotal ?? 0) || 0;
  const serviceFeeRenter =
    Number(booking.service_fee_renter ?? booking.serviceFeeRenter ?? 0) || 0;
  const amountTotalExpected =
    Number(booking.amount_total_expected ?? booking.amountTotalExpected ?? 0) || 0;
  const serviceFeePercentApplied =
    Number(booking.service_fee_percent_applied ?? booking.serviceFeePercentApplied ?? 0) || 0;
  const paymentMethod = getPaymentMethodFromBooking(booking);

  return {
    subtotal,
    serviceFeeRenter,
    amountTotalExpected,
    serviceFeePercentApplied,
    paymentMethod,
  };
}

export type BuildReservationPaymentOptions = {
  voiture: string;
  dateDebut: string;
  dateFin: string;
  duree: string;
  extras?: Array<{ label: string; price: number }>;
};

export function buildReservationPaymentFromBooking(
  booking: Record<string, unknown>,
  display: BuildReservationPaymentOptions
): ReservationPayment {
  const amounts = getRenterPaymentAmountsFromBooking(booking);

  return {
    id: String(booking.id ?? ""),
    voiture: display.voiture,
    dateDebut: display.dateDebut,
    dateFin: display.dateFin,
    duree: display.duree,
    montantDeBase: amounts.subtotal,
    fraisService: amounts.serviceFeeRenter,
    totalTTC: amounts.amountTotalExpected,
    extras: display.extras,
    paymentMethod: amounts.paymentMethod,
    serviceFeePercentApplied: amounts.serviceFeePercentApplied,
    amountTotalExpected: amounts.amountTotalExpected,
    serviceFeeRenter: amounts.serviceFeeRenter,
  };
}
