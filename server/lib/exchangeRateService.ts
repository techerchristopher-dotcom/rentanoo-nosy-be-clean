import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_EXCHANGE_SETTINGS,
  parseExchangeSettings,
  type EurMgaExchangeSettings,
} from "@/utils/dualCurrency";

const EXCHANGE_KEY = "eur_mga_exchange";
const FRANKFURTER_EUR_MGA_URL = "https://api.frankfurter.dev/v2/rate/EUR/MGA";
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 h — Frankfurter met à jour 1×/jour

export type FrankfurterEurMgaQuote = {
  rate: number;
  date: string;
};

export type ExchangeRateTrend = "up" | "down" | "stable";

export type ExchangeRateHistoryPoint = {
  date: string;
  rate: number;
};

const HISTORY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let historyCache: { points: ExchangeRateHistoryPoint[]; expiresAt: number } | null = null;

export async function fetchFrankfurterEurMgaOnDate(date: string): Promise<FrankfurterEurMgaQuote | null> {
  const url = `https://api.frankfurter.dev/v2/rates?date=${date}&base=EUR&quotes=MGA`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as Array<{ rate?: number; date?: string }>;
  const row = Array.isArray(json) ? json[0] : null;
  const rate = Number(row?.rate);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return {
    rate: Math.round(rate),
    date: typeof row?.date === "string" ? row.date : date,
  };
}

export async function fetchFrankfurterEurMga(): Promise<FrankfurterEurMgaQuote> {
  const res = await fetch(FRANKFURTER_EUR_MGA_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Frankfurter indisponible (${res.status})`);
  }
  const json = (await res.json()) as { rate?: number; date?: string };
  const rate = Number(json.rate);
  const date =
    typeof json.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(json.date)
      ? json.date
      : new Date().toISOString().slice(0, 10);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Réponse Frankfurter invalide (taux MGA manquant)");
  }
  return { rate: Math.round(rate), date };
}

function nowIso(): string {
  return new Date().toISOString();
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function loadExchangeSettings(supabaseAdmin: SupabaseClient): Promise<EurMgaExchangeSettings> {
  const { data, error } = await supabaseAdmin
    .from("platform_settings")
    .select("value")
    .eq("key", EXCHANGE_KEY)
    .maybeSingle();
  if (error || !data?.value) return { ...DEFAULT_EXCHANGE_SETTINGS };
  return parseExchangeSettings(data.value);
}

async function saveExchangeSettings(
  supabaseAdmin: SupabaseClient,
  settings: EurMgaExchangeSettings
): Promise<void> {
  const { error } = await supabaseAdmin.from("platform_settings").upsert(
    { key: EXCHANGE_KEY, value: settings, updated_at: nowIso() },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);
}

export function applyFrankfurterQuote(
  settings: EurMgaExchangeSettings,
  quote: FrankfurterEurMgaQuote
): EurMgaExchangeSettings {
  return {
    ...settings,
    mode: "live",
    liveProvider: "frankfurter",
    rate: quote.rate,
    effectiveFrom: quote.date,
    lastLiveRate: quote.rate,
    lastFetchedAt: nowIso(),
  };
}

/** Rafraîchit le taux depuis Frankfurter et persiste en base. */
export async function refreshLiveExchangeRate(
  supabaseAdmin: SupabaseClient
): Promise<EurMgaExchangeSettings> {
  const current = await loadExchangeSettings(supabaseAdmin);
  const quote = await fetchFrankfurterEurMga();
  const next = applyFrankfurterQuote({ ...current, mode: "live" }, quote);
  await saveExchangeSettings(supabaseAdmin, next);
  return next;
}

/** Si mode live et date du taux < aujourd'hui, tente un refresh (non bloquant en cas d'échec). */
export async function ensureLiveExchangeFresh(
  supabaseAdmin: SupabaseClient
): Promise<EurMgaExchangeSettings> {
  const settings = await loadExchangeSettings(supabaseAdmin);
  if (settings.mode !== "live") return settings;

  const today = todayYmd();
  if (settings.effectiveFrom >= today) return settings;

  try {
    return await refreshLiveExchangeRate(supabaseAdmin);
  } catch (e: unknown) {
    console.warn(
      "[exchange-rate] Refresh Frankfurter échoué, conservation du dernier taux:",
      e instanceof Error ? e.message : e
    );
    return settings;
  }
}

let schedulerStarted = false;

const TREND_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
let trendCache: { key: string; trend: ExchangeRateTrend | null; expiresAt: number } | null = null;

function shiftYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function fetchPreviousFrankfurterRate(beforeDate: string): Promise<number | null> {
  for (let i = 1; i <= 7; i++) {
    const quote = await fetchFrankfurterEurMgaOnDate(shiftYmd(beforeDate, -i));
    if (quote) return quote.rate;
  }
  return null;
}

function computeTrend(current: number, previous: number | null): ExchangeRateTrend | null {
  if (previous == null) return null;
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "stable";
}

/** Tendance vs veille Frankfurter (live uniquement). */
export async function getExchangeRateTrend(
  settings: EurMgaExchangeSettings
): Promise<ExchangeRateTrend | null> {
  if (settings.mode !== "live") return null;

  const cacheKey = `${settings.rate}:${settings.effectiveFrom}`;
  if (trendCache && trendCache.key === cacheKey && Date.now() < trendCache.expiresAt) {
    return trendCache.trend;
  }

  let trend: ExchangeRateTrend | null = null;
  try {
    const previous = await fetchPreviousFrankfurterRate(settings.effectiveFrom);
    trend = computeTrend(settings.rate, previous);
  } catch {
    trend = null;
  }

  trendCache = { key: cacheKey, trend, expiresAt: Date.now() + TREND_CACHE_TTL_MS };
  return trend;
}

/** Historique EUR/MGA sur ~14 jours (Frankfurter) pour pages SEO. */
export async function getExchangeRateHistory(days = 14): Promise<ExchangeRateHistoryPoint[]> {
  if (historyCache && Date.now() < historyCache.expiresAt) {
    return historyCache.points;
  }

  const to = todayYmd();
  const from = shiftYmd(to, -(days - 1));
  const url = `https://api.frankfurter.dev/v2/rates?from=${from}&to=${to}&base=EUR&quotes=MGA`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Frankfurter historique indisponible (${res.status})`);
  }

  const json = (await res.json()) as Array<{ date?: string; rate?: number }>;
  const points: ExchangeRateHistoryPoint[] = (Array.isArray(json) ? json : [])
    .map((row) => ({
      date: String(row.date ?? ""),
      rate: Math.round(Number(row.rate)),
    }))
    .filter((p) => p.date && Number.isFinite(p.rate) && p.rate > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  historyCache = { points, expiresAt: Date.now() + HISTORY_CACHE_TTL_MS };
  return points;
}

export function startExchangeRateScheduler(supabaseAdmin: SupabaseClient): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const tick = () => {
    void ensureLiveExchangeFresh(supabaseAdmin).catch((e: unknown) => {
      console.warn("[exchange-rate] Scheduler tick error:", e instanceof Error ? e.message : e);
    });
  };

  tick();
  setInterval(tick, SYNC_INTERVAL_MS);
  console.log("✅ [ExchangeRate] Scheduler Frankfurter démarré (vérif. toutes les 6 h)");
}

export { saveExchangeSettings };
