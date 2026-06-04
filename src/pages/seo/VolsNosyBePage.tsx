import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PlaneLanding, PlaneTakeoff } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Seo } from "@/components/seo/Seo";
import { useNosyBeFlights, type NosyBeFlight } from "@/hooks/useNosyBeFlights";
import { SEO_EXCHANGE_PATH, SEO_FLIGHTS_URL, SEO_WEATHER_PATH } from "@/config/seoRoutes";
import { formatYmdLabel, todayYmdNosyBe } from "@/utils/nosyBeDates";
import { cn } from "@/lib/utils";

function FlightTable({
  title,
  flights,
  type,
  emptyLabel,
}: {
  title: string;
  flights: NosyBeFlight[];
  type: "arrival" | "departure";
  emptyLabel: string;
}) {
  const { t } = useTranslation("common");
  const Icon = type === "arrival" ? PlaneLanding : PlaneTakeoff;

  return (
    <div>
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" aria-hidden />
        {title}
      </h2>
      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium">{t("volsNosyBePage.tableTime")}</th>
              <th className="px-4 py-3 font-medium">{t("volsNosyBePage.tableFlight")}</th>
              <th className="px-4 py-3 font-medium">{t("volsNosyBePage.tableAirline")}</th>
              <th className="px-4 py-3 font-medium">
                {type === "arrival" ? t("volsNosyBePage.tableFrom") : t("volsNosyBePage.tableTo")}
              </th>
              <th className="px-4 py-3 font-medium">{t("volsNosyBePage.tableStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {flights.map((f, i) => (
              <tr key={`${f.flightNumber}-${f.scheduledDate}-${f.scheduledTime}-${i}`} className="border-b last:border-0">
                <td className="px-4 py-3 tabular-nums font-semibold">{f.scheduledTime}</td>
                <td className="px-4 py-3 font-medium">{f.flightNumber}</td>
                <td className="px-4 py-3">{f.airline}</td>
                <td className="px-4 py-3">
                  {f.airportCode !== "—" ? `${f.airportCode} — ${f.airportName}` : f.airportName}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{f.status}</td>
              </tr>
            ))}
            {!flights.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  {emptyLabel}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function VolsNosyBePage() {
  const { t, i18n } = useTranslation("common");
  const [selectedDate, setSelectedDate] = useState(todayYmdNosyBe);
  const { data: liveData, loading: liveLoading } = useNosyBeFlights();
  const { data, loading, error, configured } = useNosyBeFlights(selectedDate);

  const nextArrival = liveData?.nextArrival ?? null;
  const nextDeparture = liveData?.nextDeparture ?? null;

  const dayOptions = useMemo(() => {
    if (data?.availableDates?.length) return data.availableDates;
    const today = todayYmdNosyBe();
    return Array.from({ length: data?.forecastDays ?? 7 }, (_, i) => {
      const d = new Date(`${today}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [data?.availableDates, data?.forecastDays]);

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

  return (
    <div className="min-h-screen flex flex-col bg-background">
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

      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sky-50 via-background to-background dark:from-sky-950/20" />
        <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
          <p className="text-sm font-semibold text-primary">{t("volsNosyBePage.eyebrow")}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            {t("volsNosyBePage.title")}
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {t("volsNosyBePage.intro")}
          </p>

          {!configured ? (
            <Card className="mt-8 p-6 border-dashed">
              <p className="text-sm text-muted-foreground">{t("volsNosyBePage.notConfigured")}</p>
            </Card>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Card className="p-5">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <PlaneLanding className="h-4 w-4" aria-hidden />
                  {t("volsNosyBePage.nextArrival")}
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums">
                  {liveLoading && !liveData ? "…" : nextArrival?.scheduledTime ?? "—"}
                </p>
                {nextArrival ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {nextArrival.flightNumber} · {nextArrival.airportCode}
                    {nextArrival.scheduledDate !== todayYmdNosyBe()
                      ? ` · ${formatYmdLabel(nextArrival.scheduledDate, i18n.language, {
                          today: t("volsNosyBePage.dayToday"),
                          tomorrow: t("volsNosyBePage.dayTomorrow"),
                        })}`
                      : null}
                  </p>
                ) : null}
              </Card>
              <Card className="p-5">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <PlaneTakeoff className="h-4 w-4" aria-hidden />
                  {t("volsNosyBePage.nextDeparture")}
                </p>
                <p className="mt-2 text-2xl font-bold tabular-nums">
                  {liveLoading && !liveData ? "…" : nextDeparture?.scheduledTime ?? "—"}
                </p>
                {nextDeparture ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {nextDeparture.flightNumber} · {nextDeparture.airportCode}
                    {nextDeparture.scheduledDate !== todayYmdNosyBe()
                      ? ` · ${formatYmdLabel(nextDeparture.scheduledDate, i18n.language, {
                          today: t("volsNosyBePage.dayToday"),
                          tomorrow: t("volsNosyBePage.dayTomorrow"),
                        })}`
                      : null}
                  </p>
                ) : null}
              </Card>
            </div>
          )}
          {error ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("volsNosyBePage.unavailable")}</p>
          ) : null}
        </div>
      </section>

      {configured ? (
        <section className="mx-auto max-w-4xl px-4 py-10 space-y-10">
          <div>
            <p className="text-sm font-medium">{t("volsNosyBePage.forecastTitle")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("volsNosyBePage.forecastHint")}</p>
            <div
              className="mt-4 flex gap-2 overflow-x-auto pb-1"
              role="tablist"
              aria-label={t("volsNosyBePage.forecastTitle")}
            >
              {dayOptions.map((ymd) => {
                const label = formatYmdLabel(ymd, i18n.language, {
                  today: t("volsNosyBePage.dayToday"),
                  tomorrow: t("volsNosyBePage.dayTomorrow"),
                });
                const selected = ymd === selectedDate;
                return (
                  <button
                    key={ymd}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setSelectedDate(ymd)}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{t("volsNosyBePage.sourceNote")}</p>
          <FlightTable
            title={t("volsNosyBePage.arrivalsTitle")}
            flights={arrivalsForDay}
            type="arrival"
            emptyLabel={loading ? "…" : t("volsNosyBePage.noFlights")}
          />
          <FlightTable
            title={t("volsNosyBePage.departuresTitle")}
            flights={departuresForDay}
            type="departure"
            emptyLabel={loading ? "…" : t("volsNosyBePage.noFlights")}
          />
        </section>
      ) : null}

      <section className="mx-auto max-w-4xl px-4 pb-10">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <h2>{t("volsNosyBePage.seoBlockTitle")}</h2>
          <p>{t("volsNosyBePage.seoBlock")}</p>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-semibold">{t("volsNosyBePage.faqTitle")}</h2>
          <Accordion type="single" collapsible className="mt-4">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <Card className="mt-10 p-6 bg-primary/5 border-primary/20">
          <h2 className="text-lg font-semibold">{t("volsNosyBePage.ctaTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("volsNosyBePage.ctaText")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/">{t("volsNosyBePage.ctaRent")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={SEO_WEATHER_PATH}>{t("volsNosyBePage.ctaWeather")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={SEO_EXCHANGE_PATH}>{t("volsNosyBePage.ctaExchange")}</Link>
            </Button>
          </div>
        </Card>
      </section>

      <Footer />
    </div>
  );
}
