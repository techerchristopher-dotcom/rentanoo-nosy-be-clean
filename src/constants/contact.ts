export const WHATSAPP_NUMBER = "+33633707569";
export const WHATSAPP_DISPLAY = "+33 (0) 6 33 70 75 69";
export const FALLBACK_WHATSAPP_E164 = "33633707569";

/** @deprecated Préférer useWhatsAppContact() ou getWhatsAppUrlFromE164 */
export function getWhatsAppUrl(): string {
  return `https://wa.me/${FALLBACK_WHATSAPP_E164}`;
}
