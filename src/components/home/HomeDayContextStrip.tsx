import {
  Clock,
  Cloud,
  CloudFog,
  CloudRain,
  CloudSun,
  Sun,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { useNosyBeLocalTime } from "@/hooks/useNosyBeLocalTime";
import { useNosyBeWeather } from "@/hooks/useNosyBeWeather";
import type { ExchangeRateTrend } from "@/utils/dualCurrency";
import { weatherCodeCategory, type WeatherCategory } from "@/utils/weatherCodes";
import { cn } from "@/lib/utils";

type HomeDayContextStripProps = {
  variant: "hero" | "results";
  className?: string;
};

function WeatherIcon({ category, className }: { category: WeatherCategory; className?: string }) {
  const props = { className: cn("h-4 w-4 shrink-0", className), "aria-hidden": true as const };
  switch (category) {
    case "clear":
      return <Sun {...props} />;
    case "fog":
      return <CloudFog {...props} />;
    case "rain":
      return <CloudRain {...props} />;
    case "storm":
      return <Zap {...props} />;
    case "snow":
      return <Cloud {...props} />;
    default:
      return <CloudSun {...props} />;
  }
}

function RateTrendIcon({
  trend,
  isHero,
}: {
  trend: ExchangeRateTrend;
  isHero: boolean;
}) {
  const { t } = useTranslation("common");
  const label = t(`home.dayContext.rateTrend.${trend}`);
  const upClass = isHero ? "text-emerald-300" : "text-emerald-600";
  const downClass = isHero ? "text-rose-300" : "text-rose-600";
  const iconClass = "h-3.5 w-3.5 shrink-0";

  if (trend === "up") {
    return <TrendingUp className={cn(iconClass, upClass)} aria-label={label} />;
  }
  if (trend === "down") {
    return <TrendingDown className={cn(iconClass, downClass)} aria-label={label} />;
  }
  return null;
}

export function HomeDayContextStrip({ variant, className }: HomeDayContextStripProps) {
  const { t } = useTranslation("common");
  const { config, mode, trend, loading: rateLoading } = useExchangeRate();
  const { weather, loading: weatherLoading, error: weatherError } = useNosyBeWeather();
  const localTime = useNosyBeLocalTime();

  const isHero = variant === "hero";
  const loading = rateLoading || weatherLoading;

  const weatherCategory = weather ? weatherCodeCategory(weather.weatherCode) : null;
  const weatherLabel = weatherCategory
    ? t(`home.dayContext.weather.${weatherCategory}`)
    : weatherError
      ? t("home.dayContext.weatherUnavailable")
      : "…";

  const rateFormatted = new Intl.NumberFormat("fr-FR").format(config.rate);
  const exchangeLine =
    mode === "live"
      ? t("home.dayContext.exchangeLive", { rate: rateFormatted })
      : t("home.dayContext.exchangeManual", { rate: rateFormatted });

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-4xl",
        isHero ? "mb-8" : "mb-6",
        className
      )}
      aria-label={t("home.dayContext.ariaLabel")}
    >
      <div
        className={cn(
          "flex flex-col sm:flex-row sm:flex-wrap items-center justify-center gap-3 sm:gap-4 px-4 py-3 rounded-2xl text-sm",
          isHero
            ? "bg-white/10 border border-white/25 text-white backdrop-blur-sm"
            : "bg-muted/50 border border-border text-foreground"
        )}
      >
        <div className="flex items-center gap-2 font-medium">
          <span className={cn("text-xs uppercase tracking-wide", isHero ? "text-white/70" : "text-muted-foreground")}>
            {t("home.dayContext.title")}
          </span>
          <span className={cn("hidden sm:block w-px h-4", isHero ? "bg-white/30" : "bg-border")} aria-hidden />
          <span className="flex items-center gap-1.5 tabular-nums">
            <Clock className={cn("h-3.5 w-3.5 shrink-0", isHero ? "text-white/70" : "text-muted-foreground")} aria-hidden />
            <span className={cn("text-xs font-semibold", isHero ? "text-white/90" : "text-foreground")}>
              {localTime}
            </span>
          </span>
        </div>

        <span className={cn("hidden sm:block w-px h-4", isHero ? "bg-white/30" : "bg-border")} aria-hidden />

        <div className="flex items-center gap-2">
          {weatherCategory ? <WeatherIcon category={weatherCategory} className={isHero ? "text-amber-200" : "text-primary"} /> : null}
          <span className={cn("font-semibold tabular-nums", loading && "opacity-60")}>
            {loading && !weather ? "…" : weather ? `${weather.tempC}°C` : "—"}
          </span>
          <span className={cn(isHero ? "text-white/85" : "text-muted-foreground")}>{weatherLabel}</span>
        </div>

        <span className={cn("hidden sm:block w-px h-4", isHero ? "bg-white/30" : "bg-border")} aria-hidden />

        <div className={cn("text-center sm:text-left", loading && "opacity-60")}>
          <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
            {trend === "up" || trend === "down" ? <RateTrendIcon trend={trend} isHero={isHero} /> : null}
            <span>{exchangeLine}</span>
          </span>
          <span className={cn("block text-xs mt-0.5", isHero ? "text-white/70" : "text-muted-foreground")}>
            {t("home.dayContext.pricesHint")}
          </span>
        </div>
      </div>
    </div>
  );
}
