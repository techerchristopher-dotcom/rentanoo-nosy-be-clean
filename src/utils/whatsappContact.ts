import { FALLBACK_WHATSAPP_E164 } from "@/constants/contact";

export type WhatsAppContactConfig = {
  phoneE164: string;
  profilePhotoUrl: string | null;
};

export const FALLBACK_WHATSAPP_CONTACT: WhatsAppContactConfig = {
  phoneE164: FALLBACK_WHATSAPP_E164,
  profilePhotoUrl: null,
};

/** Normalise une saisie utilisateur en chiffres E.164 sans « + » (ex. 33633707569). */
export function normalizePhoneToE164Digits(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("0") && digits.length === 10) {
    digits = `33${digits.slice(1)}`;
  }

  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

export function formatWhatsAppPhoneDisplay(phoneE164: string): string {
  const d = phoneE164.replace(/\D/g, "");
  if (d.startsWith("33") && d.length === 11) {
    const local = d.slice(2);
    return `+33 (0) ${local[0]} ${local.slice(1, 3)} ${local.slice(3, 5)} ${local.slice(5, 7)} ${local.slice(7)}`;
  }
  return `+${d}`;
}

export function getWhatsAppUrlFromE164(phoneE164: string): string {
  return `https://wa.me/${phoneE164.replace(/\D/g, "")}`;
}

export function parseWhatsAppContact(raw: unknown): WhatsAppContactConfig {
  if (!raw || typeof raw !== "object") return { ...FALLBACK_WHATSAPP_CONTACT };
  const o = raw as Record<string, unknown>;
  const phoneRaw = typeof o.phoneE164 === "string" ? o.phoneE164 : "";
  const phoneE164 = normalizePhoneToE164Digits(phoneRaw) ?? FALLBACK_WHATSAPP_E164;
  const profilePhotoUrl =
    typeof o.profilePhotoUrl === "string" && o.profilePhotoUrl.trim() ? o.profilePhotoUrl.trim() : null;
  return { phoneE164, profilePhotoUrl };
}
