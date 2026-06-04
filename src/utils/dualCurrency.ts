/** Taux EUR → ariary (MGA) et helpers d'affichage double monnaie. */

export const DEFAULT_EUR_MGA_RATE = 5000;

export type ExchangeRateMode = "manual" | "live";
export type LiveExchangeProvider = "frankfurter";

export type EurMgaExchangeConfig = {
  rate: number;
  effectiveFrom: string;
};

/** Valeur stockée dans platform_settings.eur_mga_exchange */
export type EurMgaExchangeSettings = EurMgaExchangeConfig & {
  mode: ExchangeRateMode;
  liveProvider?: LiveExchangeProvider;
  lastLiveRate?: number;
  lastFetchedAt?: string;
};

export const FALLBACK_EXCHANGE: EurMgaExchangeConfig = {
  rate: DEFAULT_EUR_MGA_RATE,
  effectiveFrom: new Date().toISOString().slice(0, 10),
};

export const DEFAULT_EXCHANGE_SETTINGS: EurMgaExchangeSettings = {
  mode: "manual",
  ...FALLBACK_EXCHANGE,
};

function parseYmd(value: unknown, fallback: string): string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

export function parseExchangeSettings(raw: unknown): EurMgaExchangeSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_EXCHANGE_SETTINGS };
  const o = raw as Record<string, unknown>;
  const mode: ExchangeRateMode = o.mode === "live" ? "live" : "manual";
  const rate = Number(o.rate);
  const effectiveFrom = parseYmd(o.effectiveFrom, DEFAULT_EXCHANGE_SETTINGS.effectiveFrom);
  const liveProvider: LiveExchangeProvider | undefined =
    o.liveProvider === "frankfurter" ? "frankfurter" : mode === "live" ? "frankfurter" : undefined;
  const lastLiveRate = o.lastLiveRate != null ? Number(o.lastLiveRate) : undefined;
  const lastFetchedAt = typeof o.lastFetchedAt === "string" ? o.lastFetchedAt : undefined;

  if (!Number.isFinite(rate) || rate <= 0) {
    return { ...DEFAULT_EXCHANGE_SETTINGS, mode, liveProvider, lastLiveRate, lastFetchedAt, effectiveFrom };
  }
  return {
    mode,
    rate: Math.round(rate),
    effectiveFrom,
    liveProvider,
    lastLiveRate: Number.isFinite(lastLiveRate) && lastLiveRate! > 0 ? Math.round(lastLiveRate!) : undefined,
    lastFetchedAt,
  };
}

export function toPublicExchangeConfig(settings: EurMgaExchangeSettings): EurMgaExchangeConfig {
  return { rate: settings.rate, effectiveFrom: settings.effectiveFrom };
}

/** Compat : extrait rate + date depuis le JSON stocké */
export function parseExchangeConfig(raw: unknown): EurMgaExchangeConfig {
  return toPublicExchangeConfig(parseExchangeSettings(raw));
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

export function formatExchangeRateFootnote(
  config: EurMgaExchangeConfig,
  opts?: { mode?: ExchangeRateMode }
): string {
  const rateLabel = new Intl.NumberFormat("fr-FR").format(config.rate);
  const [y, m, d] = config.effectiveFrom.split("-");
  const dateLabel = d && m && y ? `${d}/${m}/${y}` : config.effectiveFrom;
  if (opts?.mode === "live") {
    return `Taux Frankfurter en date du ${dateLabel} : 1 € = ${rateLabel} Ar`;
  }
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
