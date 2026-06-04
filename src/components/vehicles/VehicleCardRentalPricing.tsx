import { useTranslation } from "react-i18next";
import { VehicleRentalInfo } from "@/types";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { getVehicleCardTotalSummary } from "@/utils/formatVehicleCardRental";

interface VehicleCardRentalPricingProps {
  dailyPrice: number;
  rentalInfo?: VehicleRentalInfo;
}

export function VehicleCardRentalPricing({
  dailyPrice,
  rentalInfo,
}: VehicleCardRentalPricingProps) {
  const { t } = useTranslation();
  const { formatClient } = useExchangeRate();

  const daily = formatClient(dailyPrice);
  const perDayShort = t("pricing.perDayShort", "jour");
  const totalSummary =
    rentalInfo && rentalInfo.days > 0 && rentalInfo.totalCost > 0
      ? getVehicleCardTotalSummary(t, rentalInfo, (mga) => formatClient(mga).primary)
      : null;

  return (
    <div className="flex shrink-0 flex-col items-end text-right">
      <span className="text-2xl font-bold tabular-nums leading-none text-primary">{daily.primary}</span>
      <span className="mt-0.5 text-xs tabular-nums text-muted-foreground">
        {daily.secondary} / {perDayShort}
      </span>
      {totalSummary ? (
        <span className="mt-1.5 text-xs font-medium tabular-nums text-muted-foreground">{totalSummary}</span>
      ) : null}
    </div>
  );
}
