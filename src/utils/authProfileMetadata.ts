import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

export type ExtractedAuthProfileFields = {
  firstName: string;
  lastName: string;
  /** Présent seulement si fourni dans les métadonnées (ex. inscription email) — jamais supposé pour Google. */
  phone?: string;
};

function trimStr(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim();
}

/**
 * Déduit prénom / nom / téléphone depuis `user.user_metadata` (email signup, Google OIDC, etc.).
 * Ordre : firstName/lastName (app) → given_name/family_name → parsing full_name / name.
 */
export function extractProfileFieldsFromAuthUser(authUser: SupabaseAuthUser): ExtractedAuthProfileFields {
  const identityData = (authUser.identities?.[0]?.identity_data || {}) as Record<string, unknown>;
  const meta = {
    ...identityData,
    ...(authUser.user_metadata || {}),
  } as Record<string, unknown>;

  let firstName = trimStr(meta.firstName);
  let lastName = trimStr(meta.lastName);

  if (!firstName) firstName = trimStr(meta.given_name);
  if (!lastName) lastName = trimStr(meta.family_name);

  if (!firstName || !lastName) {
    const combined = trimStr(meta.full_name) || trimStr(meta.name);
    if (combined) {
      const parts = combined.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        if (!firstName) firstName = parts[0];
        if (!lastName) lastName = parts.slice(1).join(" ");
      } else if (parts.length === 1) {
        if (!firstName && !lastName) {
          firstName = parts[0];
        } else if (!firstName) {
          firstName = parts[0];
        } else if (!lastName) {
          lastName = parts[0];
        }
      }
    }
  }

  const phoneRaw = meta.phone;
  const phone =
    typeof phoneRaw === "string" && phoneRaw.trim().length > 0 ? phoneRaw.trim() : undefined;

  return { firstName, lastName, phone };
}
