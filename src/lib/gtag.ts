/**
 * Google Tag — complète le snippet GA4 dans index.html (Ads + conteneur GT).
 * GA4 G-WVKC4DHFL3 est configuré dans index.html pour garantir les hits /g/collect.
 */

const GOOGLE_TAG_ID = "GT-TXZW7HG8";
export const GA4_MEASUREMENT_ID = "G-WVKC4DHFL3";
const GOOGLE_ADS_ID = "AW-17959989720";

function isGtagAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

/**
 * Complète la config gtag (GA4 déjà initialisé dans index.html).
 */
export function initGtag(): void {
  if (!isGtagAvailable()) return;
  try {
    window.gtag!("config", GOOGLE_TAG_ID);
    window.gtag!("config", GOOGLE_ADS_ID);
  } catch (e) {
    console.warn("[gtag] Ads/GT config failed (app continues):", e);
  }
}

/**
 * Envoie un page_view à chaque changement de route (SPA).
 */
export function sendPageView(path: string, title?: string): void {
  if (!isGtagAvailable()) return;
  try {
    window.gtag!("event", "page_view", {
      send_to: GA4_MEASUREMENT_ID,
      page_path: path,
      page_title: title ?? document.title,
    });
  } catch {
    // no-op
  }
}

/** Événement GA4 générique (best effort). */
export function sendGtagEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  if (!isGtagAvailable()) return;
  try {
    window.gtag!("event", eventName, {
      send_to: GA4_MEASUREMENT_ID,
      ...params,
    });
  } catch {
    // no-op
  }
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/** Label conversion Purchase - configuré dans Google Ads > Mesures > Conversions */
const CONVERSION_LABEL_PURCHASE = import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL_PURCHASE || "";
const CONVERSION_LABEL_DEPOSIT = import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL_DEPOSIT || "";

interface PurchaseConversionParams {
  value: number;
  currency: string;
  transaction_id: string;
}

interface DepositConversionParams {
  value: number;
  currency: string;
  transaction_id: string;
}

const STORAGE_KEY_PURCHASE = "gtag_purchase_sent";
const STORAGE_KEY_DEPOSIT = "gtag_deposit_sent";

export function sendPurchaseConversion(params: PurchaseConversionParams): void {
  if (!isGtagAvailable()) return;

  const label = CONVERSION_LABEL_PURCHASE;
  if (!label) {
    if (import.meta.env.DEV) {
      console.warn("[gtag] VITE_GOOGLE_ADS_CONVERSION_LABEL_PURCHASE non configuré - conversion non envoyée");
    }
    return;
  }

  try {
    window.gtag!("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${label}`,
      value: params.value,
      currency: params.currency,
      transaction_id: params.transaction_id,
    });
  } catch {
    // no-op
  }
}

export function sendDepositConversion(params: DepositConversionParams): void {
  if (!isGtagAvailable()) return;

  const label = CONVERSION_LABEL_DEPOSIT;
  if (!label) {
    if (import.meta.env.DEV) {
      console.warn("[gtag] VITE_GOOGLE_ADS_CONVERSION_LABEL_DEPOSIT non configuré - conversion non envoyée");
    }
    return;
  }

  try {
    window.gtag!("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${label}`,
      value: params.value,
      currency: params.currency,
      transaction_id: params.transaction_id,
    });
  } catch {
    // no-op
  }
}

export function hasPurchaseConversionBeenSent(transactionId: string): boolean {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_PURCHASE);
    if (!stored) return false;
    const set = new Set<string>(JSON.parse(stored));
    return set.has(transactionId);
  } catch {
    return false;
  }
}

export function hasDepositConversionBeenSent(transactionId: string): boolean {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_DEPOSIT);
    if (!stored) return false;
    const set = new Set<string>(JSON.parse(stored));
    return set.has(transactionId);
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
    if (arr.length > 50) {
      sessionStorage.setItem(STORAGE_KEY_PURCHASE, JSON.stringify(arr.slice(-50)));
    } else {
      sessionStorage.setItem(STORAGE_KEY_PURCHASE, JSON.stringify(arr));
    }
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
    if (arr.length > 50) {
      sessionStorage.setItem(STORAGE_KEY_DEPOSIT, JSON.stringify(arr.slice(-50)));
    } else {
      sessionStorage.setItem(STORAGE_KEY_DEPOSIT, JSON.stringify(arr));
    }
  } catch {
    // ignore
  }
}
