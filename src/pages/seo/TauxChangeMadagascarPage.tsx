import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Equal, TrendingDown, TrendingUp } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/seo/Seo";
import {
  SeoContentSection,
  SeoCtaPanel,
  SeoDataPanel,
  SeoDataTable,
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
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { useExchangeRateHistory } from "@/hooks/useExchangeRateHistory";
import { SEO_EXCHANGE_URL, SEO_WEATHER_PATH } from "@/config/seoRoutes";
import type { ExchangeRateTrend } from "@/utils/dualCurrency";
import { cn } from "@/lib/utils";

function TrendBadge({ trend, large, onDark }: { trend: ExchangeRateTrend | null; large?: boolean; onDark?: boolean }) {
  const { t } = useTranslation("common");
  if (!trend) return null;
  const label = t(`home.dayContext.rateTrend.${trend}`);
  const iconClass = cn("shrink-0", large ? "h-6 w-6" : "h-5 w-5");
  if (trend === "up") {
    return (
      <span className={cn("inline-flex items-center", onDark ? "text-emerald-300" : "text-emerald-600 dark:text-emerald-400")} aria-label={label}>
        <TrendingUp className={iconClass} />
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className={cn("inline-flex items-center", onDark ? "text-rose-300" : "text-rose-600 dark:text-rose-400")} aria-label={label}>
        <TrendingDown className={iconClass} />
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center", onDark ? "text-white/60" : "text-muted-foreground")} aria-label={label}>
      <Equal className={iconClass} />
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
    <SeoPageShell>
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

      <SeoPageHero
        theme="exchange"
        eyebrow={t("tauxChangePage.eyebrow")}
        title={t("tauxChangePage.title")}
        intro={t("tauxChangePage.intro")}
      >
        <div className="mt-8 max-w-xl">
          <SeoStatCard
            variant="dark"
            label={t("tauxChangePage.liveLabel")}
            loading={rateLoading}
            loadingLabel={t("home.dayContext.loading")}
            icon={<TrendBadge trend={trend} large onDark />}
            value={`1 € = ${rateFormatted} Ar`}
            sub={
              <>
                <p>{mode === "live" ? t("tauxChangePage.liveSource") : t("tauxChangePage.manualSource")}</p>
                {trend ? (
                  <p className="mt-1">{t(`home.dayContext.rateTrendShort.${trend}`)}</p>
                ) : null}
                {footnote ? <p className="mt-1 text-xs">{footnote}</p> : null}
              </>
            }
          />
        </div>
      </SeoPageHero>

      <SeoDataPanel title={t("tauxChangePage.historyTitle")} hint={t("tauxChangePage.historyHint")}>
        <SeoDataTable minWidth={320}>
          <SeoTableHead>
            <SeoTableTh>{t("tauxChangePage.tableDate")}</SeoTableTh>
            <SeoTableTh>{t("tauxChangePage.tableRate")}</SeoTableTh>
          </SeoTableHead>
          <SeoTableBody>
            {historyLoading && !history.length ? (
              <SeoTableLoadingRow colSpan={2} label={t("home.dayContext.loading")} />
            ) : null}
            {[...history].reverse().map((row) => (
              <SeoTableRow key={row.date}>
                <SeoTableTd>{formatHistoryDate(row.date, locale)}</SeoTableTd>
                <SeoTableTd className="font-semibold tabular-nums">
                  {new Intl.NumberFormat("fr-FR").format(row.rate)} Ar
                </SeoTableTd>
              </SeoTableRow>
            ))}
          </SeoTableBody>
        </SeoDataTable>
      </SeoDataPanel>

      <SeoContentSection>
        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:tracking-tight">
          <h2>{t("tauxChangePage.seoBlockTitle")}</h2>
          <p>{t("tauxChangePage.seoBlock")}</p>
        </div>

        <SeoFaqSection title={t("tauxChangePage.faqTitle")} items={faqItems} />

        <SeoCtaPanel title={t("tauxChangePage.ctaTitle")} text={t("tauxChangePage.ctaText")}>
          <Button asChild className="bg-white text-primary font-semibold hover:bg-white/90 shadow-md">
            <Link to="/">{t("tauxChangePage.ctaRent")}</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/50 bg-transparent text-white hover:bg-white/10">
            <Link to={SEO_WEATHER_PATH}>{t("tauxChangePage.ctaWeather")}</Link>
          </Button>
        </SeoCtaPanel>
      </SeoContentSection>

      <Footer />
    </SeoPageShell>
  );
}
