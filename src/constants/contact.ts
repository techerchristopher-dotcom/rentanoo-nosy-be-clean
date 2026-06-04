export const WHATSAPP_NUMBER = "+33633707569";
export const WHATSAPP_DISPLAY = "+33 (0) 6 33 70 75 69";

/** Ouvre WhatsApp / WhatsApp Business (wa.me deep link). */
export function getWhatsAppUrl(): string {
  return `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}`;
}
