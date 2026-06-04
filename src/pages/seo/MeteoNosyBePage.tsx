import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Clock,
  Cloud,
  CloudFog,
  CloudRain,
  CloudSun,
  Sun,
  Zap,
} from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/seo/Seo";
import {
  SeoContentSection,
  SeoCtaPanel,
  SeoDataPanel,
  SeoFaqSection,
  SeoForecastDayCard,
  SeoForecastSkeleton,
  SeoPageHero,
  SeoPageShell,
  SeoStatCard,
} from "@/components/seo/SeoPageLayout";
import { useNosyBeLocalTime } from "@/hooks/useNosyBeLocalTime";
import { useNosyBeWeatherExtended } from "@/hooks/useNosyBeWeatherExtended";
import { SEO_EXCHANGE_PATH, SEO_WEATHER_URL } from "@/config/seoRoutes";
import { weatherCodeCategory, resolveWeatherCategory, type WeatherCategory } from "@/utils/weatherCodes";
import { cn } from "@/lib/utils";

function WeatherIcon({ category, className }: { category: WeatherCategory; className?: string }) {
  const props = { className: cn("h-5 w-5 shrink-0", className), "aria-hidden": true as const };
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
    <SeoPageShell>
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

      <SeoPageHero
        theme="weather"
        eyebrow={t("meteoNosyBePage.eyebrow")}
        title={t("meteoNosyBePage.title")}
        intro={t("meteoNosyBePage.intro")}
      >
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <SeoStatCard
            variant="dark"
            label={t("meteoNosyBePage.liveLabel")}
            loading={loading && !weather}
            loadingLabel={t("home.dayContext.loading")}
            icon={category ? <WeatherIcon category={category} className="text-amber-500" /> : null}
            value={weather ? `${weather.tempC}°C` : "—"}
            sub={
              category ? (
                <span className="inline-flex items-center gap-2">
                  <WeatherIcon category={category} className="text-amber-500" />
                  {t(`home.dayContext.weather.${category}`)}
                </span>
              ) : error ? (
                t("home.dayContext.weatherUnavailable")
              ) : undefined
            }
          />
          <SeoStatCard
            variant="dark"
            label={t("meteoNosyBePage.localTime")}
            icon={<Clock className="h-5 w-5 text-amber-200" aria-hidden />}
            value={localTime}
            sub={t("meteoNosyBePage.timezone")}
          />
        </div>
      </SeoPageHero>

      <SeoDataPanel title={t("meteoNosyBePage.forecastTitle")} hint={t("meteoNosyBePage.sourceNote")}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {(weather?.forecast ?? []).map((day, index) => {
            const cat = resolveWeatherCategory({
              weatherCode: day.weatherCode,
              precipitationMm: day.precipitationMm,
              precipitationProbMax: day.precipitationProbMax,
            });
            return (
              <SeoForecastDayCard
                key={day.date}
                highlight={index === 0}
                dateLabel={formatForecastDate(day.date, locale)}
                icon={<WeatherIcon category={cat} className="h-6 w-6 text-primary" />}
                temps={`${day.tempMinC}° / ${day.tempMaxC}°`}
                condition={t(`home.dayContext.weather.${cat}`)}
              />
            );
          })}
          {loading && !weather?.forecast?.length
            ? Array.from({ length: 7 }).map((_, i) => <SeoForecastSkeleton key={i} />)
            : null}
        </div>
      </SeoDataPanel>

      <SeoContentSection>
        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:tracking-tight">
          <h2>{t("meteoNosyBePage.seoBlockTitle")}</h2>
          <p>{t("meteoNosyBePage.seoBlock")}</p>
        </div>

        <SeoFaqSection title={t("meteoNosyBePage.faqTitle")} items={faqItems} />

        <SeoCtaPanel title={t("meteoNosyBePage.ctaTitle")} text={t("meteoNosyBePage.ctaText")}>
          <Button asChild className="bg-white text-primary font-semibold hover:bg-white/90 shadow-md">
            <Link to="/">{t("meteoNosyBePage.ctaRent")}</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/50 bg-transparent text-white hover:bg-white/10">
            <Link to={SEO_EXCHANGE_PATH}>{t("meteoNosyBePage.ctaExchange")}</Link>
          </Button>
        </SeoCtaPanel>
      </SeoContentSection>

      <Footer />
    </SeoPageShell>
  );
}
