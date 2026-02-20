/**
 * Google Tag (gtag.js) - Tag principal GT-TXZW7HG8
 *
 * Mode "best effort" : ne jamais empêcher l'app de démarrer.
 * L'échec du chargement d'un script externe n'est jamais une erreur applicative.
 */

const GOOGLE_TAG_ID = "GT-TXZW7HG8";

const GTAG_SCRIPT_URL = "https://www.googletagmanager.com/gtag/js?id=" + GOOGLE_TAG_ID;

function isGtagAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.gtag === "function";
}

/**
 * Charge le script gtag. Promise toujours resolve (jamais reject).
 * onload => resolve(true), onerror => console.warn + resolve(false).
 */
function loadGtagScript(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const s = document.createElement("script");
      s.async = true;
      s.src = GTAG_SCRIPT_URL;
      s.onload = () => {
        try {
          resolve(true);
        } catch {
          resolve(false);
        }
      };
      s.onerror = () => {
        console.warn("[gtag] Script load failed (app continues):", GTAG_SCRIPT_URL);
        resolve(false);
      };
      document.head.appendChild(s);
    } catch (e) {
      console.warn("[gtag] Script injection failed (app continues):", e);
      resolve(false);
    }
  });
}

/**
 * Initialise dataLayer, gtag stub, charge le script en arrière-plan.
 * Ne throw jamais. Ne bloque jamais l'app sur le résultat du loader.
 */
export function initGtag(): void {
  try {
    window.dataLayer = window.dataLayer || [];
    const gtagFn = (...args: unknown[]) => {
      try {
        window.dataLayer!.push(args);
      } catch {
        // no-op
      }
    };
    window.gtag = gtagFn;

    gtagFn("js", new Date());
    gtagFn("config", GOOGLE_TAG_ID);

    // Chargement différé, sans await : l'app démarre immédiatement
    const schedule = () => {
      loadGtagScript(); // fire-and-forget, résultat ignoré
    };
    if ("requestIdleCallback" in window) {
      (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout?: number }) => void })
        .requestIdleCallback(schedule, { timeout: 2000 });
    } else {
      setTimeout(schedule, 2000);
    }
  } catch (e) {
    console.warn("[gtag] Init failed (app continues):", e);
  }
}

/**
 * Envoie un page_view à chaque changement de route (SPA).
 * No-op si gtag indisponible ou erreur.
 */
export function sendPageView(path: string, title?: string): void {
  if (!isGtagAvailable()) return;
  try {
    window.gtag!("event", "page_view", {
      page_path: path,
      page_title: title ?? document.title,
      send_to: GOOGLE_TAG_ID,
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

/** Label conversion Purchase - configuré dans le tag GTM si besoin */
const CONVERSION_LABEL_PURCHASE = import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL_PURCHASE || "";
const CONVERSION_LABEL_DEPOSIT = import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL_DEPOSIT || "";
const GOOGLE_ADS_ID = "AW-17959989720"; // pour send_to des conversions (tag GTM peut router)

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

/**
 * Envoie une conversion "purchase" (location payée).
 * Utilise transaction_id pour déduplication Google Ads.
 */
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
    if (import.meta.env.DEV) {
      console.log("[gtag] purchase conversion sent:", { ...params, send_to: `${GOOGLE_ADS_ID}/${label}` });
    }
  } catch {
    // no-op
  }
}

/**
 * Envoie une conversion "deposit" (caution activée).
 * À appeler après succès de l'attachement de la carte pour la caution.
 */
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
    if (import.meta.env.DEV) {
      console.log("[gtag] deposit conversion sent:", { ...params, send_to: `${GOOGLE_ADS_ID}/${label}` });
    }
  } catch {
    // no-op
  }
}

/**
 * Vérifie si une conversion a déjà été envoyée pour ce transaction_id (anti-double).
 */
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

/**
 * Marque une conversion comme envoyée (à appeler après sendPurchaseConversion).
 */
export function markPurchaseConversionSent(transactionId: string): void {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY_PURCHASE);
    const set = new Set<string>(stored ? JSON.parse(stored) : []);
    set.add(transactionId);
    // Garder uniquement les 50 derniers pour éviter croissance infinie
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
