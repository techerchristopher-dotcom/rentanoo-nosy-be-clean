/**
 * Prix et jours facturables — logique calendaire du loueur.
 * Montants en ariary (MGA), arrondis au millier.
 */

import { roundAriaryToThousand } from "@/utils/dualCurrency";

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

/** Parse HH:mm → minutes depuis minuit. */
export function parseTimeToMinutes(time: string): number {
  const [hs, mins] = (time ?? "00:00").trim().split(":");
  const hh = Number(hs);
  const mm = Number(mins);
  return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
}

/**
 * Fraction facturable du jour de retour uniquement.
 * - avant 9h00 → 0
 * - 9h00–12h00 inclus → 0,5
 * - après 12h00 → 1
 */
export function computeReturnDayFraction(endTime: string): 0 | 0.5 | 1 {
  const minutes = parseTimeToMinutes(endTime);
  if (minutes < 9 * 60) return 0;
  if (minutes <= 12 * 60) return 0.5;
  return 1;
}

function calendarDayStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function elapsedRentalHours(
  startDate: Date,
  endDate: Date,
  startTime: string,
  endTime: string
): number {
  const startDateTime = new Date(startDate);
  const endDateTime = new Date(endDate);
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  startDateTime.setHours(sh, sm ?? 0, 0, 0);
  endDateTime.setHours(eh, em ?? 0, 0, 0);
  return (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
}

/**
 * Jours facturables (peut être décimal : 3,5 pour 3 jours + demi-journée retour).
 */
export function computeBillableRentalDays(
  startDate: Date,
  endDate: Date,
  startTime: string,
  endTime: string
): number {
  if (!startDate || !endDate || !startTime || !endTime) return 0;

  const rentalHours = elapsedRentalHours(startDate, endDate, startTime, endTime);
  if (rentalHours <= 0) return 0;

  const returnFraction = computeReturnDayFraction(endTime);
  const startDay = calendarDayStart(startDate);
  const endDay = calendarDayStart(endDate);

  if (startDay.getTime() === endDay.getTime()) {
    return Math.max(1, returnFraction);
  }

  const calendarDiffDays =
    (endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24);
  const middleDays = Math.max(0, calendarDiffDays - 1);

  return 1 + middleDays + returnFraction;
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

export type RentalPricingResult = {
  basePrice: number;
  rentalDays: number;
  rentalHours: number;
  billableDays: number;
};

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
  const pricing = computeRentalPricing(
    pricePerDay,
    start,
    end,
    input.startTime ?? "00:00",
    input.endTime ?? "00:00"
  );

  return {
    ok: true,
    basePrice: pricing.basePrice,
    rentalDays: pricing.rentalDays,
    rentalHours: pricing.rentalHours,
    pricePerDay,
  };
}

export function computeRentalPricing(
  pricePerDay: number,
  startDate: Date,
  endDate: Date,
  startTime: string,
  endTime: string
): RentalPricingResult {
  const rentalHours = elapsedRentalHours(startDate, endDate, startTime, endTime);
  const billableDays = computeBillableRentalDays(
    startDate,
    endDate,
    startTime,
    endTime
  );
  const basePrice = roundAriaryToThousand(
    Math.max(0, billableDays) * Math.max(0, pricePerDay)
  );

  return {
    basePrice,
    rentalDays: billableDays,
    rentalHours,
    billableDays,
  };
}

function formatTimeFromDate(d: Date): string {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function computeBaseRentalPrice(
  pricePerDay: number,
  startDate: Date,
  endDate: Date,
  startTime?: string,
  endTime?: string
): { basePrice: number; rentalDays: number; rentalHours: number } {
  const st = startTime ?? formatTimeFromDate(startDate);
  const et = endTime ?? formatTimeFromDate(endDate);
  const { basePrice, rentalDays, rentalHours } = computeRentalPricing(
    pricePerDay,
    startDate,
    endDate,
    st,
    et
  );
  return { basePrice, rentalDays, rentalHours };
}

export type BookingRentalPricingInput = {
  pricePerDay: number;
  startDate: Date | string;
  endDate: Date | string;
  startTime?: string | null;
  endTime?: string | null;
};

/** Helper pour les composants (preview prix + durée facturable). */
export function getBookingRentalPricing(
  input: BookingRentalPricingInput
): RentalPricingResult | null {
  const startTime = input.startTime ?? "00:00";
  const endTime = input.endTime ?? "00:00";

  let start: Date | null;
  let end: Date | null;

  if (input.startDate instanceof Date) {
    start = new Date(input.startDate);
    const [sh, sm] = startTime.split(":").map(Number);
    start.setHours(sh, sm ?? 0, 0, 0);
  } else {
    start = combineBookingDateTime(input.startDate, startTime);
  }

  if (input.endDate instanceof Date) {
    end = new Date(input.endDate);
    const [eh, em] = endTime.split(":").map(Number);
    end.setHours(eh, em ?? 0, 0, 0);
  } else {
    end = combineBookingDateTime(input.endDate, endTime);
  }

  if (!start || !end || end.getTime() <= start.getTime()) return null;

  return computeRentalPricing(
    input.pricePerDay,
    start,
    end,
    startTime,
    endTime
  );
}
