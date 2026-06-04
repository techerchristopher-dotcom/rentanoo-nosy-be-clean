import { TFunction } from "i18next";
import { VehicleRentalInfo } from "@/types";
import { formatCurrency } from "@/utils/currency";
import { formatBillableDays } from "@/utils/formatDuration";

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
  rentalInfo: VehicleRentalInfo,
  formatAmount: (eur: number) => string = (n) => formatCurrency(n)
): VehicleCardRentalPricingLabels {
  const duration = formatBillableDays(t, rentalInfo.days);
  const perDayShort = t("pricing.perDayShort", "jour");

  return {
    perDayLabel: t("par_jour", "par jour"),
    detailLine: duration
      ? `${formatAmount(rentalInfo.pricePerDay)}/${perDayShort} × ${duration}`
      : null,
    totalLine: t("pricing.totalExcludingOptions", {
      total: formatAmount(rentalInfo.totalCost),
      defaultValue: `soit ${formatAmount(rentalInfo.totalCost)} (hors options supplémentaires)`,
    }),
  };
}
