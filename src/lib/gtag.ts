/**
 * Google Analytics 4 + Google Ads (gtag.js) - Analytics et conversions
 *
 * Mode "best effort" : GA4/Ads ne doivent JAMAIS empêcher l'app de démarrer.
 * Le tag est chargé de façon différée après requestIdleCallback.
 */

const GA4_MEASUREMENT_ID = "G-WVKC4DHFL3";
const GOOGLE_ADS_ID = "AW-17959989720";

/** URLs de fallback pour gtag.js (certains réseaux bloquent www) */
const GTAG_URLS = [
  "https://googletagmanager.com/gtag/js?id=" + GA4_MEASUREMENT_ID,
  "https://www.googletagmanager.com/gtag/js?id=" + GA4_MEASUREMENT_ID,
];

/**
 * Initialise dataLayer, gtag stub et charge le script gtag après requestIdleCallback (fallback 2s).
 * Ne throw jamais : échec = warning + app continue.
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
    gtagFn("config", GA4_MEASUREMENT_ID);
    gtagFn("config", GOOGLE_ADS_ID);

    const loadGtagScript = (urlIndex = 0) => {
      try {
        const url = GTAG_URLS[urlIndex];
        if (!url) return;
        const s = document.createElement("script");
        s.async = true;
        s.src = url;
        s.onerror = () => {
          console.warn("[gtag] Script load failed:", url);
          if (urlIndex + 1 < GTAG_URLS.length) {
            loadGtagScript(urlIndex + 1);
          }
        };
        document.head.appendChild(s);
      } catch (e) {
        console.warn("[gtag] Script injection failed:", e);
      }
    };

    if ("requestIdleCallback" in window) {
      (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout?: number }) => void })
        .requestIdleCallback(() => loadGtagScript(), { timeout: 2000 });
    } else {
      setTimeout(() => loadGtagScript(), 2000);
    }
  } catch (e) {
    console.warn("[gtag] Init failed (app continues):", e);
  }
}

/**
 * Envoie un page_view GA4 à chaque changement de route (SPA).
 * No-op si gtag indisponible ou erreur.
 */
export function sendPageView(path: string, title?: string): void {
  if (!window.gtag) return;
  try {
    window.gtag("event", "page_view", {
      page_path: path,
      page_title: title ?? document.title,
      send_to: GA4_MEASUREMENT_ID,
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

/** Label de conversion "Purchase" (location) - À récupérer dans Google Ads > Mesures > Conversions */
const CONVERSION_LABEL_PURCHASE = import.meta.env.VITE_GOOGLE_ADS_CONVERSION_LABEL_PURCHASE || "";

/** Label de conversion "Deposit" (caution) - À configurer séparément si besoin */
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

/**
 * Envoie une conversion "purchase" (location payée).
 * Utilise transaction_id pour déduplication Google Ads.
 */
export function sendPurchaseConversion(params: PurchaseConversionParams): void {
  if (!window.gtag) return;

  const label = CONVERSION_LABEL_PURCHASE;
  if (!label) {
    if (import.meta.env.DEV) {
      console.warn("[gtag] VITE_GOOGLE_ADS_CONVERSION_LABEL_PURCHASE non configuré - conversion non envoyée");
    }
    return;
  }

  try {
    window.gtag("event", "conversion", {
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
  if (!window.gtag) return;

  const label = CONVERSION_LABEL_DEPOSIT;
  if (!label) {
    if (import.meta.env.DEV) {
      console.warn("[gtag] VITE_GOOGLE_ADS_CONVERSION_LABEL_DEPOSIT non configuré - conversion non envoyée");
    }
    return;
  }

  try {
    window.gtag("event", "conversion", {
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
