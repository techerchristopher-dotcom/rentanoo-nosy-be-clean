import { TFunction } from "i18next";
import { VehicleRentalInfo } from "@/types";
import { formatDuration } from "@/utils/formatDuration";
import { formatCurrency } from "@/utils/currency";

/**
 * Helper de compatibilité pour les vues legacy qui utilisaient formattedPrice.
 * Construit une phrase localisée à partir de VehicleRentalInfo.
 */
export function formatLegacyFormattedPrice(
  t: TFunction,
  info: VehicleRentalInfo
): string {
  const duration = formatDuration(t, info.days, info.hours);

  if (!duration) {
    // Pas de durée exploitable → afficher simplement le prix par jour
    return `${formatCurrency(info.pricePerDay)} ${t("common.par_jour")}`;
  }

  return t("pricing.total_for_duration", {
    total: formatCurrency(info.totalCost),
    duration,
  });
}


