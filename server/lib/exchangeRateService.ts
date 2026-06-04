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
