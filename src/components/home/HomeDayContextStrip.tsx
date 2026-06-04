import type { ReactNode } from "react";
import {
  Clock,
  Cloud,
  CloudFog,
  CloudRain,
  CloudSun,
  Equal,
  PlaneLanding,
  PlaneTakeoff,
  Sun,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { useNosyBeLocalTime } from "@/hooks/useNosyBeLocalTime";
import { useNosyBeWeather } from "@/hooks/useNosyBeWeather";
import { useNosyBeFlights } from "@/hooks/useNosyBeFlights";
import type { ExchangeRateTrend } from "@/utils/dualCurrency";
import { weatherCodeCategory, type WeatherCategory } from "@/utils/weatherCodes";
import { SEO_EXCHANGE_PATH, SEO_FLIGHTS_PATH, SEO_WEATHER_PATH } from "@/config/seoRoutes";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type HomeDayContextStripProps = {
  variant: "hero" | "results";
  className?: string;
};

function todayYmdNosyBe(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Indian/Antananarivo" }).format(new Date());
}

function WeatherIcon({ category, className }: { category: WeatherCategory; className?: string }) {
  const props = { className: cn("h-[18px] w-[18px] shrink-0", className), "aria-hidden": true as const };
  switch (category) {
    case "clear":
      return <Sun {...props} />;
    case "fog":
      return <CloudFog {...props} />;
    case "drizzle":
      return <CloudRain {...props} />;
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
  const stableClass = isHero ? "text-white/70" : "text-muted-foreground";
  const iconClass = "h-3.5 w-3.5 shrink-0";

  if (trend === "up") {
    return <TrendingUp className={cn(iconClass, upClass)} aria-label={label} />;
  }
  if (trend === "down") {
    return <TrendingDown className={cn(iconClass, downClass)} aria-label={label} />;
  }
  return <Equal className={cn(iconClass, stableClass)} aria-label={label} />;
}

type ContextChipProps = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  href?: string;
  ariaLabel?: string;
  isHero: boolean;
  loading?: boolean;
  tooltip?: string;
};

function ContextChip({
  label,
  value,
  sub,
  icon,
  href,
  ariaLabel,
  isHero,
  loading,
  tooltip,
}: ContextChipProps) {
  const cardClass = cn(
    "group flex flex-col gap-1 rounded-xl px-4 py-3.5 text-left transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2",
    isHero
      ? "bg-white/[0.08] border border-white/20 text-white backdrop-blur-md hover:bg-white/[0.14] hover:scale-[1.02] focus-visible:ring-white/50"
      : "bg-background/80 border border-border text-foreground shadow-sm hover:bg-muted/80 hover:scale-[1.01] focus-visible:ring-ring"
  );

  const labelClass = cn(
    "text-[10px] font-medium uppercase tracking-widest",
    isHero ? "text-white/55" : "text-muted-foreground"
  );

  const subClass = cn("text-xs truncate", isHero ? "text-white/65" : "text-muted-foreground");

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className={labelClass}>{label}</span>
        {icon ? <span className="opacity-90">{icon}</span> : null}
      </div>
      <div
        className={cn(
          "text-base font-semibold tabular-nums tracking-tight leading-tight",
          loading && "animate-pulse opacity-60",
          isHero ? "text-white" : "text-foreground"
        )}
      >
        {value}
      </div>
      {sub ? <div className={subClass}>{sub}</div> : null}
    </>
  );

  const inner = href ? (
    <Link to={href} className={cardClass} aria-label={ariaLabel}>
      {content}
    </Link>
  ) : (
    <div className={cardClass} aria-label={ariaLabel}>
      {content}
    </div>
  );

  if (!tooltip) return inner;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-center">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function HomeDayContextStrip({ variant, className }: HomeDayContextStripProps) {
  const { t } = useTranslation("common");
  const { config, mode, trend, loading: rateLoading } = useExchangeRate();
  const { weather, loading: weatherLoading, error: weatherError } = useNosyBeWeather();
  const { data: flights, loading: flightsLoading, configured: flightsConfigured } = useNosyBeFlights();
  const localTime = useNosyBeLocalTime();

  const isHero = variant === "hero";
  const weatherLoadingState = weatherLoading && !weather;
  const rateLoadingState = rateLoading;
  const flightsLoadingState = flightsLoading && !flights;

  const weatherCategory = weather ? weatherCodeCategory(weather.weatherCode) : null;
  const weatherSub = weatherCategory
    ? t(`home.dayContext.weather.${weatherCategory}`)
    : weatherError
      ? t("home.dayContext.weatherUnavailable")
      : "…";

  const rateFormatted = new Intl.NumberFormat("fr-FR").format(config.rate);
  const exchangeValue = t("home.dayContext.exchangeShort", { rate: rateFormatted });
  const exchangeSub =
    trend && mode === "live"
      ? t(`home.dayContext.rateTrendShort.${trend}`)
      : mode === "live"
        ? t("home.dayContext.exchangeLiveHint")
        : undefined;

  const today = todayYmdNosyBe();
  const nextArrival = flights?.nextArrival;
  const nextDeparture = flights?.nextDeparture;
  const flightDate = nextArrival?.scheduledDate ?? nextDeparture?.scheduledDate;
  const flightsAreTomorrow = Boolean(flightDate && flightDate !== today);
  const flightsSub = flightsAreTomorrow
    ? t("home.dayContext.flightsTomorrow")
    : t("home.dayContext.flightsToday");

  const arrivalTime = flightsLoadingState ? "…" : nextArrival?.scheduledTime ?? "—";
  const departureTime = flightsLoadingState ? "…" : nextDeparture?.scheduledTime ?? "—";

  const cardCount = flightsConfigured ? 4 : 3;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn("mx-auto w-full max-w-4xl", isHero ? "mb-8" : "mb-6", className)}
        aria-label={t("home.dayContext.ariaLabel")}
      >
        <div
          className={cn(
            "grid gap-3",
            cardCount === 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-3"
          )}
        >
          <ContextChip
            isHero={isHero}
            label={t("home.dayContext.weatherLabel")}
            href={SEO_WEATHER_PATH}
            ariaLabel={t("home.dayContext.weatherLinkLabel")}
            loading={weatherLoadingState}
            icon={
              weatherCategory ? (
                <WeatherIcon category={weatherCategory} className={isHero ? "text-amber-200" : "text-primary"} />
              ) : null
            }
            value={weatherLoadingState ? "…" : weather ? `${weather.tempC}°C` : "—"}
            sub={weatherSub}
          />

          {flightsConfigured ? (
            <ContextChip
              isHero={isHero}
              label={t("home.dayContext.flightsLabel")}
              href={SEO_FLIGHTS_PATH}
              ariaLabel={t("home.dayContext.flightsLinkLabel")}
              loading={flightsLoadingState}
              sub={flightsSub}
              value={
                <span className="inline-flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <PlaneLanding
                      className={cn("h-3.5 w-3.5 shrink-0", isHero ? "text-sky-200" : "text-primary")}
                      aria-hidden
                    />
                    {arrivalTime}
                  </span>
                  <span className={cn("font-normal", isHero ? "text-white/40" : "text-muted-foreground/60")}>·</span>
                  <span className="inline-flex items-center gap-1">
                    <PlaneTakeoff
                      className={cn("h-3.5 w-3.5 shrink-0", isHero ? "text-sky-200" : "text-primary")}
                      aria-hidden
                    />
                    {departureTime}
                  </span>
                </span>
              }
            />
          ) : null}

          <ContextChip
            isHero={isHero}
            label={t("home.dayContext.exchangeLabel")}
            href={SEO_EXCHANGE_PATH}
            ariaLabel={t("home.dayContext.exchangeLinkLabel")}
            loading={rateLoadingState}
            tooltip={t("home.dayContext.pricesHint")}
            value={
              <span className="inline-flex items-center gap-1.5">
                {trend ? <RateTrendIcon trend={trend} isHero={isHero} /> : null}
                <span>{exchangeValue}</span>
              </span>
            }
            sub={exchangeSub}
          />

          <ContextChip
            isHero={isHero}
            label={t("home.dayContext.timeLabel")}
            icon={<Clock className={cn(isHero ? "text-white/60" : "text-muted-foreground")} aria-hidden />}
            value={localTime}
            sub={t("home.dayContext.timeSub")}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
