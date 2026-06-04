/** Taux EUR → ariary (MGA) et helpers d'affichage double monnaie. */

export const DEFAULT_EUR_MGA_RATE = 5000;

export type EurMgaExchangeConfig = {
  rate: number;
  effectiveFrom: string;
};

export const FALLBACK_EXCHANGE: EurMgaExchangeConfig = {
  rate: DEFAULT_EUR_MGA_RATE,
  effectiveFrom: new Date().toISOString().slice(0, 10),
};

export function parseExchangeConfig(raw: unknown): EurMgaExchangeConfig {
  if (!raw || typeof raw !== "object") return { ...FALLBACK_EXCHANGE };
  const o = raw as Record<string, unknown>;
  const rate = Number(o.rate);
  const effectiveFrom =
    typeof o.effectiveFrom === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.effectiveFrom)
      ? o.effectiveFrom
      : FALLBACK_EXCHANGE.effectiveFrom;
  if (!Number.isFinite(rate) || rate <= 0) {
    return { ...FALLBACK_EXCHANGE, effectiveFrom };
  }
  return { rate, effectiveFrom };
}

/** Ariary arrondi au millier (usage caisse). */
export function eurToAriary(eur: number, rate: number): number {
  if (!Number.isFinite(eur) || eur <= 0) return 0;
  return Math.round((eur * rate) / 1000) * 1000;
}

export function ariaryToEurLabel(ar: number, rate: number): number {
  if (!Number.isFinite(ar) || ar <= 0 || rate <= 0) return 0;
  return Math.round((ar / rate) * 100) / 100;
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount ?? 0);
}

export function formatAriary(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(amount))} Ar`;
}

export function formatExchangeRateFootnote(config: EurMgaExchangeConfig): string {
  const rateLabel = new Intl.NumberFormat("fr-FR").format(config.rate);
  const [y, m, d] = config.effectiveFrom.split("-");
  const dateLabel = d && m && y ? `${d}/${m}/${y}` : config.effectiveFrom;
  return `Taux en date du ${dateLabel} : 1 € = ${rateLabel} Ar`;
}

export type DualPriceFormatted = {
  primary: string;
  secondary: string;
  footnote: string;
  ariary: number;
  eur: number;
};

export function formatDualPrice(
  eur: number,
  config: EurMgaExchangeConfig,
  variant: "client" | "admin"
): DualPriceFormatted {
  const eurAmount = Number.isFinite(eur) ? eur : 0;
  const ariary = eurToAriary(eurAmount, config.rate);
  const eurStr = formatEur(eurAmount);
  const arStr = formatAriary(ariary);
  const footnote = formatExchangeRateFootnote(config);

  if (variant === "client") {
    return {
      primary: eurStr,
      secondary: `≈ ${arStr}`,
      footnote,
      ariary,
      eur: eurAmount,
    };
  }

  return {
    primary: arStr,
    secondary: `≈ ${eurStr}`,
    footnote,
    ariary,
    eur: eurAmount,
  };
}

/** Ligne compacte pour listes admin : « 350 000 Ar (≈ 70,00 €) » */
export function formatDualPriceInline(
  eur: number,
  config: EurMgaExchangeConfig,
  variant: "client" | "admin"
): string {
  const { primary, secondary } = formatDualPrice(eur, config, variant);
  return `${primary} (${secondary})`;
}
