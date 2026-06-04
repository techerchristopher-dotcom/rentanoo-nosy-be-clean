import { TFunction } from "i18next";
import { VehicleRentalInfo } from "@/types";
import { formatBillableDays } from "@/utils/formatDuration";

/**
 * Ligne compacte pour cartes véhicules quand des dates sont sélectionnées.
 * Ex. « 2 jours · 20,49 € total »
 */
export function getVehicleCardTotalSummary(
  t: TFunction,
  rentalInfo: VehicleRentalInfo,
  formatEurPrimary: (amountMga: number) => string
): string | null {
  const duration = formatBillableDays(t, rentalInfo.days);
  if (!duration || rentalInfo.totalCost <= 0) return null;

  return t("pricing.cardTotalSummary", {
    duration,
    total: formatEurPrimary(rentalInfo.totalCost),
    defaultValue: "{{duration}} · {{total}} total",
  });
}
