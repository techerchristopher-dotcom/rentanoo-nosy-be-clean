import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExternalLink, Info, Loader2, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/seo/Seo";
import {
  SeoContentSection,
  SeoCtaPanel,
  SeoDataPanel,
  SeoDataTable,
  SeoDayPills,
  SeoDisclaimerAlert,
  SeoFaqSection,
  SeoPageHero,
  SeoPageShell,
  SeoSectionIconTitle,
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
      <SeoSectionIconTitle
        icon={<Icon className="h-5 w-5 text-primary" aria-hidden />}
        title={title}
      />
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
        <SeoDisclaimerAlert>
          <div className="flex gap-3 text-amber-50">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" aria-hidden />
            <div>
              <p className="font-semibold text-white">{t("volsNosyBePage.officialDisclaimerTitle")}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/80">{t("volsNosyBePage.officialDisclaimerText")}</p>
              <a
                href={NOSY_BE_OFFICIAL_FLIGHTS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-100 underline underline-offset-2 hover:text-white"
              >
                {t("volsNosyBePage.officialDisclaimerLink")}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
              </a>
            </div>
          </div>
        </SeoDisclaimerAlert>

        {!configured ? (
          <div className="mt-8 rounded-2xl border border-dashed border-white/25 bg-white/5 p-6 text-sm text-white/70 backdrop-blur-sm">
            {t("volsNosyBePage.notConfigured")}
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <SeoStatCard
              variant="dark"
              label={t("volsNosyBePage.nextArrival")}
              loading={loading && !data}
              loadingLabel={t("home.dayContext.loading")}
              icon={<PlaneLanding className="h-5 w-5 text-sky-200" aria-hidden />}
              value={nextArrival?.scheduledTime ?? "—"}
              sub={formatFlightSub(nextArrival)}
            />
            <SeoStatCard
              variant="dark"
              label={t("volsNosyBePage.nextDeparture")}
              loading={loading && !data}
              loadingLabel={t("home.dayContext.loading")}
              icon={<PlaneTakeoff className="h-5 w-5 text-sky-200" aria-hidden />}
              value={nextDeparture?.scheduledTime ?? "—"}
              sub={formatFlightSub(nextDeparture)}
            />
          </div>
        )}
        {error ? <p className="mt-4 text-sm text-white/70">{t("volsNosyBePage.unavailable")}</p> : null}
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
          <Button asChild className="bg-white text-primary font-semibold hover:bg-white/90 shadow-md">
            <Link to="/">{t("volsNosyBePage.ctaRent")}</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/50 bg-transparent text-white hover:bg-white/10">
            <Link to={SEO_WEATHER_PATH}>{t("volsNosyBePage.ctaWeather")}</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/50 bg-transparent text-white hover:bg-white/10">
            <Link to={SEO_EXCHANGE_PATH}>{t("volsNosyBePage.ctaExchange")}</Link>
          </Button>
        </SeoCtaPanel>
      </SeoContentSection>

      <Footer />
    </SeoPageShell>
  );
}
