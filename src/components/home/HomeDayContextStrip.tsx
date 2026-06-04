import { Cloud, CloudFog, CloudRain, CloudSun, Sun, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { useNosyBeWeather } from "@/hooks/useNosyBeWeather";
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

export function HomeDayContextStrip({ variant, className }: HomeDayContextStripProps) {
  const { t } = useTranslation("common");
  const { config, mode, loading: rateLoading } = useExchangeRate();
  const { weather, loading: weatherLoading, error: weatherError } = useNosyBeWeather();

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
        "mx-auto w-full max-w-3xl",
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
          <span className="font-semibold tabular-nums">{exchangeLine}</span>
          <span className={cn("block text-xs mt-0.5", isHero ? "text-white/70" : "text-muted-foreground")}>
            {t("home.dayContext.pricesHint")}
          </span>
        </div>
      </div>
    </div>
  );
}
