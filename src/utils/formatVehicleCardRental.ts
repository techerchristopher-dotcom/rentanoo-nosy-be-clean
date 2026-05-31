import { TFunction } from "i18next";
import { VehicleRentalInfo } from "@/types";
import { formatCurrency } from "@/utils/currency";
import { formatDuration } from "@/utils/formatDuration";

export interface VehicleCardRentalPricingLabels {
  perDayLabel: string;
  detailLine: string | null;
  totalLine: string | null;
}

/**
 * Libellés prix/durée/total pour les cartes véhicules (home, résultats recherche).
 * Utiliser avec le namespace `translation` (defaultNS).
 */
export function getVehicleCardRentalPricing(
  t: TFunction,
  rentalInfo: VehicleRentalInfo
): VehicleCardRentalPricingLabels {
  const duration = formatDuration(t, rentalInfo.days, rentalInfo.hours);
  const perDayShort = t("pricing.perDayShort", "jour");

  return {
    perDayLabel: t("par_jour", "par jour"),
    detailLine: duration
      ? `${formatCurrency(rentalInfo.pricePerDay)}/${perDayShort} × ${duration}`
      : null,
    totalLine: t("pricing.totalExcludingOptions", {
      total: formatCurrency(rentalInfo.totalCost),
      defaultValue: `soit ${formatCurrency(rentalInfo.totalCost)} (hors options supplémentaires)`,
    }),
  };
}
