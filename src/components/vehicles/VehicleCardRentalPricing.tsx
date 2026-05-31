import { Euro } from "lucide-react";
import { useTranslation } from "react-i18next";
import { VehicleRentalInfo } from "@/types";
import { getVehicleCardRentalPricing } from "@/utils/formatVehicleCardRental";

interface VehicleCardRentalPricingProps {
  dailyPrice: number;
  rentalInfo?: VehicleRentalInfo;
}

export function VehicleCardRentalPricing({
  dailyPrice,
  rentalInfo,
}: VehicleCardRentalPricingProps) {
  const { t } = useTranslation();

  if (!rentalInfo) {
    return (
      <>
        <div className="flex items-center text-2xl font-bold text-primary">
          <Euro className="h-5 w-5" />
          {dailyPrice}
        </div>
        <div className="text-xs text-muted-foreground">{t("par_jour", "par jour")}</div>
      </>
    );
  }

  const { perDayLabel, detailLine, totalLine } = getVehicleCardRentalPricing(t, rentalInfo);

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center text-2xl font-bold text-primary">
        <Euro className="h-5 w-5" />
        {dailyPrice}
      </div>
      <div className="text-xs text-muted-foreground">{perDayLabel}</div>
      {detailLine && (
        <div className="text-sm text-muted-foreground mt-1">{detailLine}</div>
      )}
      {totalLine && (
        <div className="text-sm text-muted-foreground mt-0.5">{totalLine}</div>
      )}
    </div>
  );
}
