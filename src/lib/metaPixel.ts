/**
 * Meta Pixel — snippet de base chargé dans index.html (fbq init + PageView).
 * Ce module fournit les helpers pour les événements de conversion custom
 * avec déduplication (même pattern que src/lib/analytics.ts pour GA4/Google Ads).
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function isFbqAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

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

const STORAGE_KEY_INITIATE_CHECKOUT = "fbq_initiate_checkout_sent";
const STORAGE_KEY_PURCHASE = "fbq_purchase_sent";
const STORAGE_KEY_VIEW_CONTENT = "fbq_view_content_sent";

function hasBeenSent(storageKey: string, dedupId: string): boolean {
  return readDedupSet(storageKey).has(dedupId);
}

function markAsSent(storageKey: string, dedupId: string): void {
  const set = readDedupSet(storageKey);
  set.add(dedupId);
  writeDedupSet(storageKey, set);
}

/** PageView — déclenché au chargement initial (snippet index.html) ET à chaque changement de route SPA. */
export function trackMetaPageView(): void {
  if (!isFbqAvailable()) return;
  try {
    window.fbq!("track", "PageView");
  } catch {
    // best effort
  }
}

/** ViewContent — fiche véhicule/hébergement. dedupId = vehicle/listing id (1x par session). */
export function trackMetaViewContent(params: {
  contentId: string;
  contentName: string;
  value: number;
  currency: string;
}): void {
  if (!isFbqAvailable()) return;
  if (hasBeenSent(STORAGE_KEY_VIEW_CONTENT, params.contentId)) return;
  try {
    window.fbq!("track", "ViewContent", {
      content_type: "product",
      content_ids: [params.contentId],
      content_name: params.contentName,
      value: params.value,
      currency: params.currency,
    });
    markAsSent(STORAGE_KEY_VIEW_CONTENT, params.contentId);
  } catch {
    // best effort
  }
}

/** InitiateCheckout — clic "Réserver" / "Je lance la recherche". dedupId pour éviter le spam sur double-clic. */
export function trackMetaInitiateCheckout(params: {
  dedupId: string;
  value: number;
  currency: string;
}): void {
  if (!isFbqAvailable()) return;
  if (hasBeenSent(STORAGE_KEY_INITIATE_CHECKOUT, params.dedupId)) return;
  try {
    window.fbq!("track", "InitiateCheckout", {
      content_type: "product",
      value: params.value,
      currency: params.currency,
    });
    markAsSent(STORAGE_KEY_INITIATE_CHECKOUT, params.dedupId);
  } catch {
    // best effort
  }
}

/** InitiateCheckout — clic "Je lance la recherche" (pas de dédup : une recherche relancée doit re-déclencher). */
export function trackMetaSearchInitiateCheckout(params: { value: number; currency: string }): void {
  if (!isFbqAvailable()) return;
  try {
    window.fbq!("track", "InitiateCheckout", {
      content_type: "product",
      value: params.value,
      currency: params.currency,
    });
  } catch {
    // best effort
  }
}

/** Contact — clic WhatsApp (bouton flottant ou fiche produit). */
export function trackMetaContact(): void {
  if (!isFbqAvailable()) return;
  try {
    window.fbq!("track", "Contact");
  } catch {
    // best effort
  }
}

/** Lead — demande de réservation créée avec succès. */
export function trackMetaLead(): void {
  if (!isFbqAvailable()) return;
  try {
    window.fbq!("track", "Lead");
  } catch {
    // best effort
  }
}

/** Purchase — paiement confirmé (Stripe session_id côté client, après vérif backend). */
export function trackMetaPurchase(params: { value: number; currency: string; dedupId: string }): void {
  if (!isFbqAvailable()) return;
  if (hasBeenSent(STORAGE_KEY_PURCHASE, params.dedupId)) return;
  try {
    window.fbq!("track", "Purchase", {
      value: params.value,
      currency: params.currency,
    });
    markAsSent(STORAGE_KEY_PURCHASE, params.dedupId);
  } catch {
    // best effort
  }
}
