import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Equal, TrendingDown, TrendingUp } from "lucide-react";
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
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { useExchangeRateHistory } from "@/hooks/useExchangeRateHistory";
import { SEO_EXCHANGE_URL, SEO_WEATHER_PATH } from "@/config/seoRoutes";
import type { ExchangeRateTrend } from "@/utils/dualCurrency";
import { cn } from "@/lib/utils";

function TrendBadge({ trend }: { trend: ExchangeRateTrend | null }) {
  const { t } = useTranslation("common");
  if (!trend) return null;
  const label = t(`home.dayContext.rateTrend.${trend}`);
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400" aria-label={label}>
        <TrendingUp className="h-5 w-5" />
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400" aria-label={label}>
        <TrendingDown className="h-5 w-5" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground" aria-label={label}>
      <Equal className="h-5 w-5" />
    </span>
  );
}

function formatHistoryDate(dateStr: string, locale: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(d);
}

export default function TauxChangeMadagascarPage() {
  const { t, i18n } = useTranslation("common");
  const { config, mode, trend, loading: rateLoading, footnote } = useExchangeRate();
  const { history, loading: historyLoading } = useExchangeRateHistory();
  const locale = i18n.language?.startsWith("fr") ? "fr-FR" : i18n.language?.startsWith("de") ? "de-DE" : i18n.language?.startsWith("it") ? "it-IT" : "en-GB";
  const rateFormatted = new Intl.NumberFormat("fr-FR").format(config.rate);

  const faqItems = t("tauxChangePage.faq.items", { returnObjects: true }) as Array<{
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
        title={t("seo.tauxChange.title")}
        description={t("seo.tauxChange.description")}
        canonical={SEO_EXCHANGE_URL}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: t("seo.tauxChange.title"),
          description: t("seo.tauxChange.description"),
          url: SEO_EXCHANGE_URL,
          about: { "@type": "Country", name: "Madagascar" },
        }}
        extraStructuredData={faqSchema}
      />

      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-background to-background dark:from-emerald-950/20" />
        <div className="mx-auto max-w-4xl px-4 py-10 md:py-14">
          <p className="text-sm font-semibold text-primary">{t("tauxChangePage.eyebrow")}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            {t("tauxChangePage.title")}
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {t("tauxChangePage.intro")}
          </p>

          <Card className="mt-8 p-6">
            <p className="text-sm text-muted-foreground">{t("tauxChangePage.liveLabel")}</p>
            <div className={cn("mt-2 flex flex-wrap items-center gap-3", rateLoading && "opacity-60")}>
              <TrendBadge trend={trend} />
              <p className="text-4xl font-bold tabular-nums">
                1 € = {rateFormatted} Ar
              </p>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "live" ? t("tauxChangePage.liveSource") : t("tauxChangePage.manualSource")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{footnote}</p>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10">
        <h2 className="text-xl font-semibold">{t("tauxChangePage.historyTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("tauxChangePage.historyHint")}</p>
        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[320px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium">{t("tauxChangePage.tableDate")}</th>
                <th className="px-4 py-3 font-medium">{t("tauxChangePage.tableRate")}</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((row) => (
                <tr key={row.date} className="border-b last:border-0">
                  <td className="px-4 py-3">{formatHistoryDate(row.date, locale)}</td>
                  <td className="px-4 py-3 tabular-nums font-medium">
                    {new Intl.NumberFormat("fr-FR").format(row.rate)} Ar
                  </td>
                </tr>
              ))}
              {historyLoading && !history.length ? (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-muted-foreground">…</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-10">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <h2>{t("tauxChangePage.seoBlockTitle")}</h2>
          <p>{t("tauxChangePage.seoBlock")}</p>
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-semibold">{t("tauxChangePage.faqTitle")}</h2>
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
          <h2 className="text-lg font-semibold">{t("tauxChangePage.ctaTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("tauxChangePage.ctaText")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/">{t("tauxChangePage.ctaRent")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={SEO_WEATHER_PATH}>{t("tauxChangePage.ctaWeather")}</Link>
            </Button>
          </div>
        </Card>
      </section>

      <Footer />
    </div>
  );
}
