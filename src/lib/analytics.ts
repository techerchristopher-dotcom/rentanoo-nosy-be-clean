/**
 * Analytics — gtag chargé via GT-TXZW7HG8 dans index.html.
 * GA4 measurement ID G-WVKC4DHFL3 ne peut pas charger gtag/js en direct (404 Google).
 * Le conteneur GT route vers GA4 + Google Ads.
 */

export const GOOGLE_TAG_ID = "GT-TXZW7HG8";
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

/** SPA : page_view manuel à chaque changement de route. La 1re page est envoyée par gtag('config', 'GT-…') dans index.html. */
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

// --- Paiements V1 (A2) — déduplication GA4 ---

/** Devise des montants booking stockés en DB (ariary). */
export const ANALYTICS_BOOKING_CURRENCY = "MGA";

const STORAGE_KEY_STRIPE_REDIRECT = "ga4_stripe_redirect_sent";
const STORAGE_KEY_PAYMENT_COMPLETED = "ga4_payment_completed_sent";

function readDedupSet(storageKey: string): Set<string> {
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (!stored) return new Set();
    return new Set<string>(JSON.parse(stored));
  } catch {
    return new Set();
  }
}

function writeDedupSet(storageKey: string, set: Set<string>): void {
  try {
    const arr = [...set];
    sessionStorage.setItem(
      storageKey,
      JSON.stringify(arr.length > 50 ? arr.slice(-50) : arr)
    );
  } catch {
    // ignore
  }
}

export function hasStripeRedirectBeenSent(bookingId: string): boolean {
  return readDedupSet(STORAGE_KEY_STRIPE_REDIRECT).has(bookingId);
}

export function markStripeRedirectSent(bookingId: string): void {
  const set = readDedupSet(STORAGE_KEY_STRIPE_REDIRECT);
  set.add(bookingId);
  writeDedupSet(STORAGE_KEY_STRIPE_REDIRECT, set);
}

export function hasPaymentCompletedBeenSent(bookingId: string): boolean {
  return readDedupSet(STORAGE_KEY_PAYMENT_COMPLETED).has(bookingId);
}

export function markPaymentCompletedSent(bookingId: string): void {
  const set = readDedupSet(STORAGE_KEY_PAYMENT_COMPLETED);
  set.add(bookingId);
  writeDedupSet(STORAGE_KEY_PAYMENT_COMPLETED, set);
}
