import type { SupabaseClient } from "@supabase/supabase-js";
import {
  FALLBACK_WHATSAPP_CONTACT,
  normalizePhoneToE164Digits,
  parseWhatsAppContact,
  type WhatsAppContactConfig,
} from "@/utils/whatsappContact";

export const WHATSAPP_CONTACT_KEY = "whatsapp_contact";
export const WHATSAPP_PHOTO_BUCKET = "platform-assets";
export const WHATSAPP_PHOTO_PATH = "whatsapp/profile";

export type WhatsAppContactStored = WhatsAppContactConfig & {
  profilePhotoPath?: string | null;
};

function nowIso(): string {
  return new Date().toISOString();
}

export async function loadWhatsAppContact(
  supabaseAdmin: SupabaseClient
): Promise<WhatsAppContactStored> {
  const { data, error } = await supabaseAdmin
    .from("platform_settings")
    .select("value")
    .eq("key", WHATSAPP_CONTACT_KEY)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const parsed = parseWhatsAppContact(data?.value);
  const raw = (data?.value ?? {}) as Record<string, unknown>;
  const profilePhotoPath =
    typeof raw.profilePhotoPath === "string" && raw.profilePhotoPath.trim()
      ? raw.profilePhotoPath.trim()
      : null;

  return { ...parsed, profilePhotoPath };
}

async function saveWhatsAppContact(
  supabaseAdmin: SupabaseClient,
  value: WhatsAppContactStored
): Promise<void> {
  const { error } = await supabaseAdmin.from("platform_settings").upsert(
    {
      key: WHATSAPP_CONTACT_KEY,
      value: {
        phoneE164: value.phoneE164,
        profilePhotoUrl: value.profilePhotoUrl,
        profilePhotoPath: value.profilePhotoPath ?? null,
      },
      updated_at: nowIso(),
    },
    { onConflict: "key" }
  );
  if (error) throw new Error(error.message);
}

export async function updateWhatsAppPhone(
  supabaseAdmin: SupabaseClient,
  phoneInput: string
): Promise<WhatsAppContactStored> {
  const phoneE164 = normalizePhoneToE164Digits(phoneInput);
  if (!phoneE164) {
    throw new Error("Numéro WhatsApp invalide.");
  }

  const current = await loadWhatsAppContact(supabaseAdmin);
  const next: WhatsAppContactStored = { ...current, phoneE164 };
  await saveWhatsAppContact(supabaseAdmin, next);
  return next;
}

export async function removeWhatsAppProfilePhoto(
  supabaseAdmin: SupabaseClient
): Promise<WhatsAppContactStored> {
  const current = await loadWhatsAppContact(supabaseAdmin);

  if (current.profilePhotoPath) {
    await supabaseAdmin.storage.from(WHATSAPP_PHOTO_BUCKET).remove([current.profilePhotoPath]);
  }

  const next: WhatsAppContactStored = {
    ...current,
    profilePhotoUrl: null,
    profilePhotoPath: null,
  };
  await saveWhatsAppContact(supabaseAdmin, next);
  return next;
}

function extFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

export async function uploadWhatsAppProfilePhoto(
  supabaseAdmin: SupabaseClient,
  buffer: Buffer,
  mime: string
): Promise<WhatsAppContactStored> {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(mime)) {
    throw new Error("Format non supporté (JPG, PNG ou WebP).");
  }

  const current = await loadWhatsAppContact(supabaseAdmin);
  const ext = extFromMime(mime);
  const storagePath = `${WHATSAPP_PHOTO_PATH}.${ext}`;

  if (current.profilePhotoPath && current.profilePhotoPath !== storagePath) {
    await supabaseAdmin.storage.from(WHATSAPP_PHOTO_BUCKET).remove([current.profilePhotoPath]);
  }

  const { error: uploadError } = await supabaseAdmin.storage
    .from(WHATSAPP_PHOTO_BUCKET)
    .upload(storagePath, buffer, { upsert: true, contentType: mime });

  if (uploadError) throw new Error(uploadError.message);

  const { data: urlData } = supabaseAdmin.storage
    .from(WHATSAPP_PHOTO_BUCKET)
    .getPublicUrl(storagePath);

  const next: WhatsAppContactStored = {
    ...current,
    profilePhotoUrl: urlData.publicUrl,
    profilePhotoPath: storagePath,
  };
  await saveWhatsAppContact(supabaseAdmin, next);
  return next;
}

export function whatsAppContactToPublicJson(contact: WhatsAppContactConfig) {
  return {
    ok: true,
    phoneE164: contact.phoneE164 || FALLBACK_WHATSAPP_CONTACT.phoneE164,
    profilePhotoUrl: contact.profilePhotoUrl,
  };
}
