import { useTranslation } from "react-i18next";
import { VehicleRentalInfo } from "@/types";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { getVehicleCardTotalSummary } from "@/utils/formatVehicleCardRental";
import { ClientMgaPrice } from "@/components/currency/ClientMgaPrice";

interface VehicleCardRentalPricingProps {
  dailyPrice: number;
  rentalInfo?: VehicleRentalInfo;
  /** i18n key for the price unit suffix (default: pricing.perDayShort) */
  priceUnitKey?: string;
}

export function VehicleCardRentalPricing({
  dailyPrice,
  rentalInfo,
  priceUnitKey = "pricing.perDayShort",
}: VehicleCardRentalPricingProps) {
  const { t } = useTranslation();
  const { formatClient } = useExchangeRate();
  const perDayShort = t(priceUnitKey, priceUnitKey === "pricing.perNightShort" ? "nuit" : "jour");
  const totalSummary =
    rentalInfo && rentalInfo.days > 0 && rentalInfo.totalCost > 0
      ? getVehicleCardTotalSummary(t, rentalInfo, (mga) => formatClient(mga).primary)
      : null;

  return (
    <div className="flex shrink-0 flex-col items-end text-right">
      <ClientMgaPrice
        amountMga={dailyPrice}
        primaryClassName="text-2xl font-bold tabular-nums leading-none text-primary"
        secondarySuffix={` / ${perDayShort}`}
      />
      {totalSummary ? (
        <span className="mt-1.5 text-xs font-medium tabular-nums text-muted-foreground">{totalSummary}</span>
      ) : null}
    </div>
  );
}
