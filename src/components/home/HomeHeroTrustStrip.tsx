import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface HomeHeroTrustStripProps {
  vehicleCount: number;
  minPriceLabel: string | null;
  className?: string;
}

function TrustChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium text-white/95 backdrop-blur-sm">
      {children}
    </span>
  );
}

export function HomeHeroTrustStrip({
  vehicleCount,
  minPriceLabel,
  className,
}: HomeHeroTrustStripProps) {
  const { t } = useTranslation("common");

  const countLabel =
    vehicleCount === 1
      ? t("home.trustStrip.vehicleCount_one")
      : t("home.trustStrip.vehicleCount", { count: vehicleCount });

  return (
    <div
      className={cn(
        "mx-auto mb-8 flex max-w-3xl flex-wrap items-center justify-center gap-2",
        className,
      )}
      aria-label={t("home.trustStrip.ariaLabel")}
    >
      <TrustChip>{countLabel}</TrustChip>
      {minPriceLabel ? (
        <TrustChip>
          {t("home.trustStrip.fromPrice", { price: minPriceLabel })}
        </TrustChip>
      ) : null}
      <TrustChip>{t("home.trustStrip.airportDelivery")}</TrustChip>
      <TrustChip>{t("home.trustStrip.helmetIncluded")}</TrustChip>
      <TrustChip>{t("home.trustStrip.insuranceIncluded")}</TrustChip>
      <TrustChip>{t("home.trustStrip.accommodationAvailable")}</TrustChip>
      <TrustChip>{t("home.trustStrip.secureBooking")}</TrustChip>
    </div>
  );
}
