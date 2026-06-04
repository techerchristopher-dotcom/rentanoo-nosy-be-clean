import { TFunction } from "i18next";
import { VehicleRentalInfo } from "@/types";
import { formatBillableDays } from "@/utils/formatDuration";

/**
 * Phrase localisée durée + total (montants MGA → € via formatPrimary).
 */
export function formatLegacyFormattedPrice(
  t: TFunction,
  info: VehicleRentalInfo,
  formatPrimary: (amountMga: number) => string
): string {
  const duration = formatBillableDays(t, info.days);

  if (!duration) {
    return `${formatPrimary(info.pricePerDay)} / ${t("pricing.perDayShort", "jour")}`;
  }

  return t("pricing.total_for_duration", {
    total: formatPrimary(info.totalCost),
    duration,
  });
}
