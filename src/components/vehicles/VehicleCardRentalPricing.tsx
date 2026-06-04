import { useTranslation } from "react-i18next";
import { VehicleRentalInfo } from "@/types";
import { getVehicleCardRentalPricing } from "@/utils/formatVehicleCardRental";
import { DualPrice } from "@/components/currency/DualPrice";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";

interface VehicleCardRentalPricingProps {
  dailyPrice: number;
  rentalInfo?: VehicleRentalInfo;
}

export function VehicleCardRentalPricing({
  dailyPrice,
  rentalInfo,
}: VehicleCardRentalPricingProps) {
  const { t } = useTranslation();
  const { footnote, formatClientInline } = useExchangeRate();

  if (!rentalInfo) {
    return (
      <>
        <DualPrice
          amountMga={dailyPrice}
          variant="client"
          className="items-end"
          primaryClassName="text-2xl font-bold text-primary flex items-center gap-0.5"
        />
        <div className="text-xs text-muted-foreground">{t("par_jour", "par jour")}</div>
      </>
    );
  }

  const { perDayLabel, detailLine, totalLine } = getVehicleCardRentalPricing(t, rentalInfo, formatClientInline);

  return (
    <div className="flex flex-col items-end">
      <DualPrice
        amountMga={dailyPrice}
        variant="client"
        className="items-end"
        primaryClassName="text-2xl font-bold text-primary"
      />
      <div className="text-xs text-muted-foreground">{perDayLabel}</div>
      {detailLine && (
        <div className="text-sm text-muted-foreground mt-1">{detailLine}</div>
      )}
      {totalLine && (
        <div className="text-sm text-muted-foreground mt-0.5">{totalLine}</div>
      )}
      <div className="text-[10px] text-muted-foreground/80 mt-1 text-right max-w-[200px]">{footnote}</div>
    </div>
  );
}
