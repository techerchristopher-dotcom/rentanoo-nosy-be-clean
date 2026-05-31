/**
 * Prix de location de base (sans options), aligné sur VehicleDetails.handleConfirmBooking.
 */

/** Combine YYYY-MM-DD (ou ISO) + HH:mm en Date locale (aligné VehicleDetails / AdminBookingNew). */
export function combineBookingDateTime(
  dateInput: string,
  timeHm?: string | null
): Date | null {
  if (!dateInput) return null;
  const day = dateInput.split("T")[0];
  const [ys, ms, ds] = day.split("-").map(Number);
  if (!ys || !ms || !ds) return null;
  const t = (timeHm ?? "00:00").trim();
  const [hs, mins] = t.split(":");
  const hh = Number(hs);
  const mm = Number(mins);
  return new Date(
    ys,
    ms - 1,
    ds,
    Number.isFinite(hh) ? hh : 0,
    Number.isFinite(mm) ? mm : 0,
    0,
    0
  );
}

export type TrustedBaseRentalPriceResult =
  | {
      ok: true;
      basePrice: number;
      rentalDays: number;
      rentalHours: number;
      pricePerDay: number;
    }
  | { ok: false; error: "INVALID_DATETIME_RANGE" };

/**
 * Recalcule le prix de base depuis le tarif journalier véhicule et la plage date/heure.
 * Source de vérité côté service — ne pas faire confiance au base_price frontend.
 */
export function computeTrustedBaseRentalPrice(input: {
  pricePerDay: number;
  startDateIso: string;
  endDateIso: string;
  startTime?: string | null;
  endTime?: string | null;
}): TrustedBaseRentalPriceResult {
  const start = combineBookingDateTime(input.startDateIso, input.startTime);
  const end = combineBookingDateTime(input.endDateIso, input.endTime);
  if (!start || !end || end.getTime() <= start.getTime()) {
    return { ok: false, error: "INVALID_DATETIME_RANGE" };
  }

  const pricePerDay = Math.max(0, Number(input.pricePerDay) || 0);
  const { basePrice, rentalDays, rentalHours } = computeBaseRentalPrice(
    pricePerDay,
    start,
    end
  );

  return { ok: true, basePrice, rentalDays, rentalHours, pricePerDay };
}

export function computeBaseRentalPrice(
  pricePerDay: number,
  startDate: Date,
  endDate: Date
): { basePrice: number; rentalDays: number; rentalHours: number } {
  const rentalHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  const completeDays = Math.floor(rentalHours / 24);
  const extraHours = rentalHours % 24;

  let totalPrice: number;
  if (rentalHours < 24) {
    totalPrice = pricePerDay;
  } else if (extraHours === 0) {
    totalPrice = completeDays * pricePerDay;
  } else {
    const hourPrice = pricePerDay / 24;
    const extraHoursPrice = extraHours * hourPrice;
    totalPrice = Math.ceil(completeDays * pricePerDay + extraHoursPrice);
  }

  const rentalDays = rentalHours < 24 ? 1 : completeDays + (extraHours > 0 ? 1 : 0);

  return { basePrice: totalPrice, rentalDays, rentalHours };
}
