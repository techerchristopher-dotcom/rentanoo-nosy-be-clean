import { normalizeBookingOptions } from "@/utils/bookingOptions";
import { calcRenterTotal, calcServiceFeeRenter } from "@/utils/serviceFees";

function parseBookingSelectedOptions(raw: unknown): unknown {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

export function extractPayableOptions(raw: unknown) {
  const parsed = parseBookingSelectedOptions(raw);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Array.isArray((parsed as { items?: unknown[] }).items)) {
    return normalizeBookingOptions((parsed as { items: unknown[] }).items).filter((opt) => Boolean(opt.name?.trim()));
  }
  return normalizeBookingOptions(parsed).filter((opt) => Boolean(opt.name?.trim()));
}

export type BookingFinancials = {
  basePrice: number;
  options: ReturnType<typeof extractPayableOptions>;
  optionsTotal: number;
  subtotal: number;
  serviceFee: number;
  totalTTC: number;
  amountTotalPaid: number;
  totalPriceStoredAsSubtotal: number;
};

export function computeBookingFinancials(
  booking: Record<string, unknown>,
  isAdminPricing: boolean
): BookingFinancials {
  const basePrice = Number(booking.base_price ?? 0) || 0;
  const options = extractPayableOptions(booking.selected_options);
  const optionsSumFromList = options.reduce((sum, opt) => sum + opt.totalPrice, 0);
  const optionsTotalDB = Number(booking.options_total ?? 0) || 0;
  const optionsTotal = optionsTotalDB > 0 ? optionsTotalDB : optionsSumFromList;

  const subtotalDB = Number(booking.subtotal ?? 0) || 0;
  const totalPriceDB = Number(booking.total_price ?? 0) || 0;
  const subtotal =
    subtotalDB > 0 ? subtotalDB : totalPriceDB > 0 ? totalPriceDB : basePrice + optionsTotal;

  const serviceFeeDB = Number(booking.service_fee_renter ?? booking.service_fee ?? 0) || 0;
  const serviceFee = isAdminPricing
    ? 0
    : serviceFeeDB > 0
      ? serviceFeeDB
      : calcServiceFeeRenter(subtotal);

  const amountTotalPaid = Number(booking.amount_total_paid ?? 0) || 0;
  const totalTTC =
    amountTotalPaid > 0 ? amountTotalPaid : isAdminPricing ? subtotal : calcRenterTotal(subtotal);

  return {
    basePrice,
    options,
    optionsTotal,
    subtotal,
    serviceFee,
    totalTTC,
    amountTotalPaid,
    totalPriceStoredAsSubtotal: totalPriceDB,
  };
}
