import { sendGtagEvent } from "@/lib/gtag";

export type WhatsAppFabEvent =
  | "whatsapp_fab_click"
  | "whatsapp_bubble_shown"
  | "whatsapp_fab_drag";

export function trackWhatsAppFabEvent(
  name: WhatsAppFabEvent,
  params?: Record<string, string | number | boolean>
): void {
  sendGtagEvent(name, params);
}
