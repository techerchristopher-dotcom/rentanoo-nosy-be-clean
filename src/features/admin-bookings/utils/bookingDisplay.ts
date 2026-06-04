import { combineBookingDateTime } from "@/utils/rentalPriceFromDates";
import { getBookingRentalPricing } from "@/utils/rentalPriceFromDates";

export function formatBookingRef(referenceNumber: unknown): string {
  if (referenceNumber == null || referenceNumber === "") return "Réservation";
  return `AG #${referenceNumber}`;
}

export function formatDateFr(ymd: string, time?: string | null): string {
  const dt = combineBookingDateTime(ymd, time ?? "09:00");
  if (!dt) return ymd;
  const datePart = dt.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  if (time) return `${datePart} · ${time.slice(0, 5)}`;
  return datePart;
}

export function formatRentalDuration(
  startDate: string,
  endDate: string,
  startTime?: string | null,
  endTime?: string | null
): string {
  const pricing = getBookingRentalPricing({
    pricePerDay: 1,
    startDate,
    endDate,
    startTime: startTime ?? "09:00",
    endTime: endTime ?? "09:00",
  });
  if (!pricing) return "—";
  const days = pricing.rentalDays;
  if (days === 1) return "1 jour";
  if (Number.isInteger(days)) return `${days} jours`;
  return `${days.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} j`;
}
