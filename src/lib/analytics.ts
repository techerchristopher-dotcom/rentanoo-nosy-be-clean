/**
 * Analytics — GA4 uniquement via le snippet dans index.html.
 * Pas de Google Tag Manager / conteneur GT : une seule source de vérité G-WVKC4DHFL3.
 */

export const GA4_MEASUREMENT_ID = "G-WVKC4DHFL3";

const GOOGLE_ADS_ID = "AW-17959989720";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function isGtagAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

/** Étape 2 (SPA) : page_view manuel à chaque changement de route. La 1re page est envoyée par gtag('config') dans index.html. */
export function trackGa4PageView(pagePath: string, pageTitle?: string): void {
  if (!isGtagAvailable()) return;
  try {
    window.gtag!("event", "page_view", {
      page_path: pagePath,
      page_title: pageTitle ?? document.title,
      page_location: `${window.location.origin}${pagePath}`,
    });
  } catch {
    // best effort
  }
}

/** Étape 3 : événements personnalisés (WhatsApp, etc.). */
export function trackGa4Event(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  if (!isGtagAvailable()) return;
  try {
    window.gtag!("event", eventName, params);
  } catch {
    // best effort
  }
}

// --- Google Ads conversions (optionnel, chargé à la demande) ---

const CONVERSION_LABEL_PURCHASE = import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL_PURCHASE || "";
const CONVERSION_LABEL_DEPOSIT = import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL_DEPOSIT || "";

let adsConfigured = false;

function ensureGoogleAdsConfig(): void {
  if (adsConfigured || !isGtagAvailable()) return;
  try {
    window.gtag!("config", GOOGLE_ADS_ID);
    adsConfigured = true;
  } catch {
    // best effort
  }
}

interface ConversionParams {
  value: number;
  currency: string;
  transaction_id: string;
}

const STORAGE_KEY_PURCHASE = "gtag_purchase_sent";
const STORAGE_KEY_DEPOSIT = "gtag_deposit_sent";

export function sendPurchaseConversion(params: ConversionParams): void {
  if (!isGtagAvailable()) return;
  const label = CONVERSION_LABEL_PURCHASE;
  if (!label) {
    if (import.meta.env.DEV) {
      console.warn("[analytics] VITE_GOOGLE_ADS_CONVERSION_LABEL_PURCHASE non configuré");
    }
    return;
  }
  ensureGoogleAdsConfig();
  try {
    window.gtag!("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${label}`,
      value: params.value,
      currency: params.currency,
      transaction_id: params.transaction_id,
    });
  } catch {
    // best effort
  }
}

export function sendDepositConversion(params: ConversionParams): void {
  if (!isGtagAvailable()) return;
  const label = CONVERSION_LABEL_DEPOSIT;
  if (!label) {
    if (import.meta.env.DEV) {
      console.warn("[analytics] VITE_GOOGLE_ADS_CONVERSION_LABEL_DEPOSIT non configuré");
    }
    return;
  }
  ensureGoogleAdsConfig();
  try {
    window.gtag!("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${label}`,
      value: params.value,
      currency: params.currency,
      transaction_id: params.transaction_id,
    });
  } catch {
    // best effort
  }
}

export function hasPurchaseConversionBeenSent(transactionId: string): boolean {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_PURCHASE);
    if (!stored) return false;
    return new Set<string>(JSON.parse(stored)).has(transactionId);
  } catch {
    return false;
  }
}

export function hasDepositConversionBeenSent(transactionId: string): boolean {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_DEPOSIT);
    if (!stored) return false;
    return new Set<string>(JSON.parse(stored)).has(transactionId);
  } catch {
    return false;
  }
}

export function markPurchaseConversionSent(transactionId: string): void {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_PURCHASE);
    const set = new Set<string>(stored ? JSON.parse(stored) : []);
    set.add(transactionId);
    const arr = [...set];
    sessionStorage.setItem(STORAGE_KEY_PURCHASE, JSON.stringify(arr.length > 50 ? arr.slice(-50) : arr));
  } catch {
    // ignore
  }
}

export function markDepositConversionSent(transactionId: string): void {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_DEPOSIT);
    const set = new Set<string>(stored ? JSON.parse(stored) : []);
    set.add(transactionId);
    const arr = [...set];
    sessionStorage.setItem(STORAGE_KEY_DEPOSIT, JSON.stringify(arr.length > 50 ? arr.slice(-50) : arr));
  } catch {
    // ignore
  }
}
