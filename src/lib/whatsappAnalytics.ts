import { trackGa4Event } from "@/lib/analytics";

export type WhatsAppFabEvent =
  | "whatsapp_fab_click"
  | "whatsapp_bubble_shown"
  | "whatsapp_fab_drag"
  | "whatsapp_pdp_click";

const ANALYTICS_EVENTS = new Set<string>([
  "whatsapp_fab_click",
  "whatsapp_bubble_shown",
  "whatsapp_fab_drag",
  "whatsapp_pdp_click",
  "page_view",
]);

function persistSiteEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  const pagePath = typeof params?.page_path === "string" ? params.page_path : undefined;
  const metadata: Record<string, string | number | boolean> = {};
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (key !== "page_path") metadata[key] = value;
    }
  }

  fetch("/api/public/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, pagePath, metadata }),
    keepalive: true,
  }).catch(() => {
    /* best effort */
  });
}

export function trackWhatsAppFabEvent(
  name: WhatsAppFabEvent,
  params?: Record<string, string | number | boolean>
): void {
  trackGa4Event(name, params);
  persistSiteEvent(name, params);
}

export function trackPageViewEvent(pagePath: string, pageTitle?: string): void {
  trackGa4Event("page_view", { page_path: pagePath, page_title: pageTitle ?? document.title });
  persistSiteEvent("page_view", { page_path: pagePath, page_title: pageTitle ?? document.title });
}

export function trackSiteEvent(
  name: string,
  params?: Record<string, string | number | boolean>
): void {
  if (!ANALYTICS_EVENTS.has(name)) return;
  trackGa4Event(name, params);
  persistSiteEvent(name, params);
}
