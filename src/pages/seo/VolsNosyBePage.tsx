import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExternalLink, Info, Loader2, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Seo } from "@/components/seo/Seo";
import {
  SeoContentSection,
  SeoCtaPanel,
  SeoDataPanel,
  SeoDataTable,
  SeoDayPills,
  SeoFaqSection,
  SeoPageHero,
  SeoPageShell,
  SeoStatCard,
  SeoTableBody,
  SeoTableHead,
  SeoTableLoadingRow,
  SeoTableRow,
  SeoTableTd,
  SeoTableTh,
} from "@/components/seo/SeoPageLayout";
import { useNosyBeFlights, type NosyBeFlight } from "@/hooks/useNosyBeFlights";
import { NOSY_BE_OFFICIAL_FLIGHTS_URL, SEO_EXCHANGE_PATH, SEO_FLIGHTS_URL, SEO_WEATHER_PATH } from "@/config/seoRoutes";
import { formatYmdLabel, todayYmdNosyBe } from "@/utils/nosyBeDates";

function FlightTable({
  title,
  flights,
  type,
  emptyLabel,
  loading,
  loadingLabel,
}: {
  title: string;
  flights: NosyBeFlight[];
  type: "arrival" | "departure";
  emptyLabel: string;
  loading?: boolean;
  loadingLabel?: string;
}) {
  const { t } = useTranslation("common");
  const Icon = type === "arrival" ? PlaneLanding : PlaneTakeoff;

  return (
    <div>
      <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight md:text-2xl">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" aria-hidden />
        </span>
        {title}
      </h2>
      <div className="mt-4">
        <SeoDataTable minWidth={520}>
          <SeoTableHead>
            <SeoTableTh>{t("volsNosyBePage.tableTime")}</SeoTableTh>
            <SeoTableTh>{t("volsNosyBePage.tableFlight")}</SeoTableTh>
            <SeoTableTh>{t("volsNosyBePage.tableAirline")}</SeoTableTh>
            <SeoTableTh>{type === "arrival" ? t("volsNosyBePage.tableFrom") : t("volsNosyBePage.tableTo")}</SeoTableTh>
            <SeoTableTh>{t("volsNosyBePage.tableStatus")}</SeoTableTh>
          </SeoTableHead>
          <SeoTableBody>
            {loading && !flights.length ? (
              <SeoTableLoadingRow colSpan={5} label={loadingLabel} />
            ) : null}
            {flights.map((f, i) => (
              <SeoTableRow key={`${f.flightNumber}-${f.scheduledDate}-${f.scheduledTime}-${i}`}>
                <SeoTableTd className="font-semibold tabular-nums">{f.scheduledTime}</SeoTableTd>
                <SeoTableTd className="font-medium">{f.flightNumber}</SeoTableTd>
                <SeoTableTd>{f.airline}</SeoTableTd>
                <SeoTableTd>
                  {f.airportCode !== "—" ? `${f.airportCode} — ${f.airportName}` : f.airportName}
                </SeoTableTd>
                <SeoTableTd className="text-muted-foreground">{f.status}</SeoTableTd>
              </SeoTableRow>
            ))}
            {!loading && !flights.length ? (
              <SeoTableRow>
                <SeoTableTd colSpan={5} className="py-8 text-center text-muted-foreground">
                  {emptyLabel}
                </SeoTableTd>
              </SeoTableRow>
            ) : null}
          </SeoTableBody>
        </SeoDataTable>
      </div>
    </div>
  );
}

export default function VolsNosyBePage() {
  const { t, i18n } = useTranslation("common");
  const [selectedDate, setSelectedDate] = useState(todayYmdNosyBe);
  const { data, loading, error, configured } = useNosyBeFlights(selectedDate);

  const nextArrival = data?.nextArrival ?? null;
  const nextDeparture = data?.nextDeparture ?? null;

  const dayOptions = useMemo(() => {
    if (data?.availableDates?.length) return data.availableDates;
    const today = todayYmdNosyBe();
    return Array.from({ length: data?.forecastDays ?? 7 }, (_, i) => {
      const d = new Date(`${today}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [data?.availableDates, data?.forecastDays]);

  const dayPillOptions = useMemo(
    () =>
      dayOptions.map((ymd) => ({
        id: ymd,
        label: formatYmdLabel(ymd, i18n.language, {
          today: t("volsNosyBePage.dayToday"),
          tomorrow: t("volsNosyBePage.dayTomorrow"),
        }),
      })),
    [dayOptions, i18n.language, t]
  );

  const arrivalsForDay = data?.arrivals ?? [];
  const departuresForDay = data?.departures ?? [];

  const faqItems = t("volsNosyBePage.faq.items", { returnObjects: true }) as Array<{
    q: string;
    a: string;
  }>;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const formatFlightSub = (flight: NosyBeFlight | null) => {
    if (!flight) return undefined;
    const dateLabel =
      flight.scheduledDate !== todayYmdNosyBe()
        ? formatYmdLabel(flight.scheduledDate, i18n.language, {
            today: t("volsNosyBePage.dayToday"),
            tomorrow: t("volsNosyBePage.dayTomorrow"),
          })
        : null;
    return [flight.flightNumber, flight.airportCode, dateLabel].filter(Boolean).join(" · ");
  };

  return (
    <SeoPageShell>
      <Seo
        title={t("seo.volsNosyBe.title")}
        description={t("seo.volsNosyBe.description")}
        canonical={SEO_FLIGHTS_URL}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: t("seo.volsNosyBe.title"),
          description: t("seo.volsNosyBe.description"),
          url: SEO_FLIGHTS_URL,
          about: { "@type": "Airport", name: "Aéroport Fascène Nosy Be", iataCode: "NOS" },
        }}
        extraStructuredData={faqSchema}
      />

      <SeoPageHero
        theme="flights"
        eyebrow={t("volsNosyBePage.eyebrow")}
        title={t("volsNosyBePage.title")}
        intro={t("volsNosyBePage.intro")}
      >
        <Alert className="mt-8 rounded-2xl border-amber-200/80 bg-amber-50/90 text-amber-950 shadow-sm backdrop-blur-sm dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-50">
          <Info className="h-4 w-4 text-amber-700 dark:text-amber-300" aria-hidden />
          <AlertTitle>{t("volsNosyBePage.officialDisclaimerTitle")}</AlertTitle>
          <AlertDescription className="text-amber-900/90 dark:text-amber-100/90">
            <p>{t("volsNosyBePage.officialDisclaimerText")}</p>
            <a
              href={NOSY_BE_OFFICIAL_FLIGHTS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 font-semibold text-amber-950 underline underline-offset-2 hover:text-amber-800 dark:text-amber-50 dark:hover:text-amber-200"
            >
              {t("volsNosyBePage.officialDisclaimerLink")}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </a>
          </AlertDescription>
        </Alert>

        {!configured ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border/60 bg-card/50 p-6 text-sm text-muted-foreground">
            {t("volsNosyBePage.notConfigured")}
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <SeoStatCard
              label={t("volsNosyBePage.nextArrival")}
              loading={loading && !data}
              loadingLabel={t("home.dayContext.loading")}
              icon={<PlaneLanding className="h-5 w-5 text-sky-600 dark:text-sky-400" aria-hidden />}
              value={nextArrival?.scheduledTime ?? "—"}
              sub={formatFlightSub(nextArrival)}
            />
            <SeoStatCard
              label={t("volsNosyBePage.nextDeparture")}
              loading={loading && !data}
              loadingLabel={t("home.dayContext.loading")}
              icon={<PlaneTakeoff className="h-5 w-5 text-sky-600 dark:text-sky-400" aria-hidden />}
              value={nextDeparture?.scheduledTime ?? "—"}
              sub={formatFlightSub(nextDeparture)}
            />
          </div>
        )}
        {error ? <p className="mt-4 text-sm text-muted-foreground">{t("volsNosyBePage.unavailable")}</p> : null}
      </SeoPageHero>

      {configured ? (
        <SeoDataPanel title={t("volsNosyBePage.forecastTitle")} hint={t("volsNosyBePage.forecastHint")}>
          <SeoDayPills
            options={dayPillOptions}
            value={selectedDate}
            onChange={setSelectedDate}
            ariaLabel={t("volsNosyBePage.forecastTitle")}
          />
          <p className="mt-4 text-xs text-muted-foreground">{t("volsNosyBePage.sourceNote")}</p>
          <div className="mt-8 space-y-10">
            <FlightTable
              title={t("volsNosyBePage.arrivalsTitle")}
              flights={arrivalsForDay}
              type="arrival"
              loading={loading}
              loadingLabel={t("home.dayContext.loading")}
              emptyLabel={t("volsNosyBePage.noFlights")}
            />
            <FlightTable
              title={t("volsNosyBePage.departuresTitle")}
              flights={departuresForDay}
              type="departure"
              loading={loading}
              loadingLabel={t("home.dayContext.loading")}
              emptyLabel={t("volsNosyBePage.noFlights")}
            />
          </div>
          {loading && data ? (
            <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {t("home.dayContext.loading")}
            </p>
          ) : null}
        </SeoDataPanel>
      ) : null}

      <SeoContentSection>
        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:tracking-tight">
          <h2>{t("volsNosyBePage.seoBlockTitle")}</h2>
          <p>{t("volsNosyBePage.seoBlock")}</p>
        </div>

        <SeoFaqSection title={t("volsNosyBePage.faqTitle")} items={faqItems} />

        <SeoCtaPanel title={t("volsNosyBePage.ctaTitle")} text={t("volsNosyBePage.ctaText")}>
          <Button asChild className="bg-gradient-lagoon shadow-lagoon hover:opacity-90">
            <Link to="/">{t("volsNosyBePage.ctaRent")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={SEO_WEATHER_PATH}>{t("volsNosyBePage.ctaWeather")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={SEO_EXCHANGE_PATH}>{t("volsNosyBePage.ctaExchange")}</Link>
          </Button>
        </SeoCtaPanel>
      </SeoContentSection>

      <Footer />
    </SeoPageShell>
  );
}
