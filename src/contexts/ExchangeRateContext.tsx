import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  FALLBACK_EXCHANGE,
  formatDualPrice,
  formatDualPriceInline,
  formatExchangeRateFootnote,
  parseExchangeConfig,
  type DualPriceFormatted,
  type EurMgaExchangeConfig,
  type ExchangeRateMode,
  type ExchangeRateTrend,
} from "@/utils/dualCurrency";

type ExchangeRateContextValue = {
  config: EurMgaExchangeConfig;
  mode: ExchangeRateMode;
  trend: ExchangeRateTrend | null;
  loading: boolean;
  refresh: () => Promise<void>;
  formatClient: (eur: number) => DualPriceFormatted;
  formatAdmin: (eur: number) => DualPriceFormatted;
  formatClientInline: (eur: number) => string;
  formatAdminInline: (eur: number) => string;
  footnote: string;
};

const ExchangeRateContext = createContext<ExchangeRateContextValue | null>(null);

async function fetchPublicExchangeRate(): Promise<{
  config: EurMgaExchangeConfig;
  mode: ExchangeRateMode;
  trend: ExchangeRateTrend | null;
}> {
  try {
    const res = await fetch("/api/public/exchange-rate");
    if (!res.ok) return { config: { ...FALLBACK_EXCHANGE }, mode: "manual", trend: null };
    const json = (await res.json()) as {
      rate?: number;
      effectiveFrom?: string;
      mode?: string;
      trend?: ExchangeRateTrend | null;
    };
    const mode: ExchangeRateMode = json.mode === "live" ? "live" : "manual";
    const trend =
      json.trend === "up" || json.trend === "down" || json.trend === "stable" ? json.trend : null;
    return { config: parseExchangeConfig(json), mode, trend };
  } catch {
    return { config: { ...FALLBACK_EXCHANGE }, mode: "manual", trend: null };
  }
}

export function ExchangeRateProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<EurMgaExchangeConfig>(FALLBACK_EXCHANGE);
  const [mode, setMode] = useState<ExchangeRateMode>("manual");
  const [trend, setTrend] = useState<ExchangeRateTrend | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchPublicExchangeRate();
      setConfig(next.config);
      setMode(next.mode);
      setTrend(next.trend);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<ExchangeRateContextValue>(() => {
    return {
      config,
      mode,
      trend,
      loading,
      refresh,
      formatClient: (eur) => formatDualPrice(eur, config, "client"),
      formatAdmin: (eur) => formatDualPrice(eur, config, "admin"),
      formatClientInline: (eur) => formatDualPriceInline(eur, config, "client"),
      formatAdminInline: (eur) => formatDualPriceInline(eur, config, "admin"),
      footnote: formatExchangeRateFootnote(config, { mode }),
    };
  }, [config, mode, trend, loading, refresh]);

  return <ExchangeRateContext.Provider value={value}>{children}</ExchangeRateContext.Provider>;
}

export function useExchangeRate(): ExchangeRateContextValue {
  const ctx = useContext(ExchangeRateContext);
  if (!ctx) {
    return {
      config: FALLBACK_EXCHANGE,
      mode: "manual",
      trend: null,
      loading: false,
      refresh: async () => {},
      formatClient: (eur) => formatDualPrice(eur, FALLBACK_EXCHANGE, "client"),
      formatAdmin: (eur) => formatDualPrice(eur, FALLBACK_EXCHANGE, "admin"),
      formatClientInline: (eur) => formatDualPriceInline(eur, FALLBACK_EXCHANGE, "client"),
      formatAdminInline: (eur) => formatDualPriceInline(eur, FALLBACK_EXCHANGE, "admin"),
      footnote: formatExchangeRateFootnote(FALLBACK_EXCHANGE),
    };
  }
  return ctx;
}
