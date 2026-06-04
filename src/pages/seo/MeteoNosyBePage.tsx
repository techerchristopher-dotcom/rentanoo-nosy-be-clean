import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Cloud,
  CloudFog,
  CloudRain,
  CloudSun,
  Sun,
  Zap,
} from "lucide-react";
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
import { useNosyBeLocalTime } from "@/hooks/useNosyBeLocalTime";
import { useNosyBeWeatherExtended } from "@/hooks/useNosyBeWeatherExtended";
import { SEO_EXCHANGE_PATH, SEO_WEATHER_URL } from "@/config/seoRoutes";
import { weatherCodeCategory, type WeatherCategory } from "@/utils/weatherCodes";
import { cn } from "@/lib/utils";

function WeatherIcon({ category, className }: { category: WeatherCategory; className?: string }) {
  const props = { className: cn("h-5 w-5 shrink-0", className), "aria-hidden": true as const };
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

function formatForecastDate(dateStr: string, locale: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export default function MeteoNosyBePage() {
  const { t, i18n } = useTranslation("common");
  const { weather, loading, error } = useNosyBeWeatherExtended();
  const localTime = useNosyBeLocalTime();
  const locale = i18n.language?.startsWith("fr") ? "fr-FR" : i18n.language?.startsWith("de") ? "de-DE" : i18n.language?.startsWith("it") ? "it-IT" : "en-GB";

  const category = weather ? weatherCodeCategory(weather.weatherCode) : null;
  const faqItems = t("meteoNosyBePage.faq.items", { returnObjects: true }) as Array<{
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
        title={t("seo.meteoNosyBe.title")}
        description={t("seo.meteoNosyBe.description")}
        canonical={SEO_WEATHER_URL}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: t("seo.meteoNosyBe.title"),
          description: t("seo.meteoNosyBe.description"),
          url: SEO_WEATHER_URL,
          about: { "@type": "Place", name: "Nosy Be", addressCountry: "MG" },
        }}
        extraStructuredData={faqSchema}
      />

      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sky-50 via-background to-background dark:from-sky-950/30" />
        <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
          <p className="text-sm font-semibold text-primary">{t("meteoNosyBePage.eyebrow")}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            {t("meteoNosyBePage.title")}
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {t("meteoNosyBePage.intro")}
          </p>

          <Card className="mt-8 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">{t("meteoNosyBePage.liveLabel")}</p>
                <p className="mt-1 text-4xl font-bold tabular-nums">
                  {loading && !weather ? "…" : weather ? `${weather.tempC}°C` : "—"}
                </p>
                {category ? (
                  <p className="mt-1 flex items-center gap-2 text-muted-foreground">
                    <WeatherIcon category={category} className="text-amber-500" />
                    {t(`home.dayContext.weather.${category}`)}
                  </p>
                ) : error ? (
                  <p className="mt-1 text-sm text-muted-foreground">{t("home.dayContext.weatherUnavailable")}</p>
                ) : null}
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>{t("meteoNosyBePage.localTime")}</p>
                <p className="text-lg font-semibold tabular-nums text-foreground">{localTime}</p>
                <p className="mt-1">{t("meteoNosyBePage.timezone")}</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10">
        <h2 className="text-xl font-semibold">{t("meteoNosyBePage.forecastTitle")}</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium">{t("meteoNosyBePage.tableDay")}</th>
                <th className="px-4 py-3 font-medium">{t("meteoNosyBePage.tableCondition")}</th>
                <th className="px-4 py-3 font-medium">{t("meteoNosyBePage.tableTemp")}</th>
              </tr>
            </thead>
            <tbody>
              {(weather?.forecast ?? []).map((day) => {
                const cat = weatherCodeCategory(day.weatherCode);
                return (
                  <tr key={day.date} className="border-b last:border-0">
                    <td className="px-4 py-3 capitalize">{formatForecastDate(day.date, locale)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <WeatherIcon category={cat} className="text-primary" />
                        {t(`home.dayContext.weather.${cat}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {day.tempMinC}° / {day.tempMaxC}°C
                    </td>
                  </tr>
                );
              })}
              {loading && !weather?.forecast?.length ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">…</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-10">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <h2>{t("meteoNosyBePage.seoBlockTitle")}</h2>
          <p>{t("meteoNosyBePage.seoBlock")}</p>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-semibold">{t("meteoNosyBePage.faqTitle")}</h2>
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
          <h2 className="text-lg font-semibold">{t("meteoNosyBePage.ctaTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("meteoNosyBePage.ctaText")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/">{t("meteoNosyBePage.ctaRent")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={SEO_EXCHANGE_PATH}>{t("meteoNosyBePage.ctaExchange")}</Link>
            </Button>
          </div>
        </Card>
      </section>

      <Footer />
    </div>
  );
}
