/**
 * Google Analytics 4 + Google Ads (gtag.js) - Analytics et conversions
 *
 * Le tag est chargé de façon différée après requestIdleCallback pour limiter
 * l'impact des scripts tiers sur le chargement initial.
 */

const GA4_MEASUREMENT_ID = "G-WVKC4DHFL3";
const GOOGLE_ADS_ID = "AW-17959989720";

/**
 * Initialise dataLayer, gtag stub et charge le script gtag après requestIdleCallback (fallback 2s).
 * À appeler au démarrage (main.tsx).
 */
export function initGtag(): void {
  window.dataLayer = window.dataLayer || [];
  const gtagFn = (...args: unknown[]) => {
    window.dataLayer!.push(args);
  };
  window.gtag = gtagFn;

  gtagFn("js", new Date());
  gtagFn("config", GA4_MEASUREMENT_ID);
  gtagFn("config", GOOGLE_ADS_ID);

  const loadGtagScript = () => {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
    document.head.appendChild(s);
  };

  if ("requestIdleCallback" in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout?: number }) => void })
      .requestIdleCallback(loadGtagScript, { timeout: 2000 });
  } else {
    setTimeout(loadGtagScript, 2000);
  }
}

/**
 * Envoie un page_view GA4 à chaque changement de route (SPA).
 * À appeler depuis un composant qui écoute useLocation().
 */
export function sendPageView(path: string, title?: string): void {
  if (!window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title ?? document.title,
    send_to: GA4_MEASUREMENT_ID,
  });
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

  window.gtag("event", "conversion", {
    send_to: `${GOOGLE_ADS_ID}/${label}`,
    value: params.value,
    currency: params.currency,
    transaction_id: params.transaction_id,
  });

  if (import.meta.env.DEV) {
    console.log("[gtag] purchase conversion sent:", { ...params, send_to: `${GOOGLE_ADS_ID}/${label}` });
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

  window.gtag("event", "conversion", {
    send_to: `${GOOGLE_ADS_ID}/${label}`,
    value: params.value,
    currency: params.currency,
    transaction_id: params.transaction_id,
  });

  if (import.meta.env.DEV) {
    console.log("[gtag] deposit conversion sent:", { ...params, send_to: `${GOOGLE_ADS_ID}/${label}` });
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
