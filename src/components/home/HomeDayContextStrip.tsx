import type { ReactNode } from "react";
import {
  ArrowLeftRight,
  Clock,
  Cloud,
  CloudFog,
  CloudRain,
  CloudSun,
  Equal,
  Loader2,
  Plane,
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
  const iconClass = "h-[18px] w-[18px] shrink-0";

  if (trend === "up") {
    return <TrendingUp className={cn(iconClass, upClass)} aria-label={label} />;
  }
  if (trend === "down") {
    return <TrendingDown className={cn(iconClass, downClass)} aria-label={label} />;
  }
  return <Equal className={cn(iconClass, stableClass)} aria-label={label} />;
}

function ChipLoadingValue({ isHero }: { isHero: boolean }) {
  const { t } = useTranslation("common");
  return (
    <Loader2
      className={cn("h-5 w-5 animate-spin", isHero ? "text-white/75" : "text-muted-foreground")}
      aria-label={t("home.dayContext.loading")}
    />
  );
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
    "premium-card-shine premium-accent-top premium-accent-top-dark group relative flex h-full min-h-[7.25rem] flex-col rounded-2xl px-4 py-3.5 text-left",
    "transition-all duration-300 focus-visible:outline-none focus-visible:ring-2",
    isHero
      ? "premium-glass-dark hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-6px_hsl(200_20%_10%/0.45)] focus-visible:ring-white/50"
      : "premium-glass-light premium-accent-top hover:-translate-y-0.5 hover:shadow-lagoon focus-visible:ring-ring"
  );

  const labelClass = cn(
    "min-w-0 truncate text-[10px] font-semibold uppercase tracking-[0.18em] leading-none",
    isHero ? "text-white/55" : "text-muted-foreground"
  );

  const subClass = cn(
    "w-full truncate text-xs leading-tight",
    isHero ? "text-white/65" : "text-muted-foreground"
  );

  const valueClass = cn(
    "w-full min-w-0 text-base font-bold tabular-nums leading-none tracking-tight sm:text-lg",
    isHero ? "text-white" : "text-foreground"
  );

  const iconBadgeClass = cn(
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105",
    isHero ? "bg-white/10 ring-1 ring-white/15" : "bg-primary/10 ring-1 ring-primary/15"
  );

  const content = (
    <>
      <div className="mb-2 flex h-8 shrink-0 items-center justify-between gap-2">
        <span className={labelClass}>{label}</span>
        <div className={iconBadgeClass} aria-hidden={!icon}>
          {icon ?? <span className="block h-[18px] w-[18px]" />}
        </div>
      </div>
      <div className={cn("flex min-h-[2.25rem] flex-1 items-center", valueClass)}>
        {loading ? <ChipLoadingValue isHero={isHero} /> : value}
      </div>
      <div className="mt-auto flex h-4 shrink-0 items-end">
        {!loading && sub ? (
          <p className={subClass}>{sub}</p>
        ) : (
          <span className="invisible select-none text-xs leading-tight" aria-hidden>
            —
          </span>
        )}
      </div>
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
  const rateLoadingState = rateLoading && !trend;
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

  const arrivalTime = nextArrival?.scheduledTime ?? "—";
  const departureTime = nextDeparture?.scheduledTime ?? "—";

  const cardCount = flightsConfigured ? 4 : 3;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn("mx-auto w-full max-w-4xl", isHero ? "mb-8" : "mb-6", className)}
        aria-label={t("home.dayContext.ariaLabel")}
      >
        {isHero ? (
          <div className="mb-3 flex items-center justify-center gap-2">
            <span className="h-px w-6 bg-gradient-to-r from-transparent to-white/40" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">
              {t("home.dayContext.title")}
            </span>
            <span className="h-px w-6 bg-gradient-to-l from-transparent to-white/40" aria-hidden />
          </div>
        ) : null}
        <div
          className={cn(
            "grid items-stretch gap-3",
            cardCount === 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-3",
            isHero && "rounded-2xl p-1.5 ring-1 ring-white/10"
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
            value={weather ? `${weather.tempC}°C` : "—"}
            sub={weatherLoadingState ? undefined : weatherSub}
          />

          {flightsConfigured ? (
            <ContextChip
              isHero={isHero}
              label={t("home.dayContext.flightsLabel")}
              href={SEO_FLIGHTS_PATH}
              ariaLabel={t("home.dayContext.flightsLinkLabel")}
              loading={flightsLoadingState}
              icon={
                <Plane
                  className={cn("h-[18px] w-[18px] shrink-0", isHero ? "text-sky-200" : "text-primary")}
                  aria-hidden
                />
              }
              sub={flightsLoadingState ? undefined : flightsSub}
              value={
                <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1">
                    <PlaneLanding
                      className={cn("h-3.5 w-3.5 shrink-0", isHero ? "text-sky-200/90" : "text-primary/80")}
                      aria-hidden
                    />
                    {arrivalTime}
                  </span>
                  <span className={cn("font-normal opacity-50", isHero ? "text-white" : "text-foreground")}>·</span>
                  <span className="inline-flex items-center gap-1">
                    <PlaneTakeoff
                      className={cn("h-3.5 w-3.5 shrink-0", isHero ? "text-sky-200/90" : "text-primary/80")}
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
            icon={
              trend ? (
                <RateTrendIcon trend={trend} isHero={isHero} />
              ) : (
                <ArrowLeftRight
                  className={cn("h-[18px] w-[18px] shrink-0", isHero ? "text-amber-200" : "text-primary")}
                  aria-hidden
                />
              )
            }
            value={
              <span className="block truncate text-sm font-bold tabular-nums sm:text-base">{exchangeValue}</span>
            }
            sub={rateLoadingState ? undefined : exchangeSub}
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
