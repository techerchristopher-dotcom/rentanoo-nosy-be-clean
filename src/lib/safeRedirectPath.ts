import { loadBookingResumeIntent } from "@/lib/bookingResumeIntent";

/**
 * Limite les redirections post-login aux chemins internes (évite open redirect).
 */
export function safeRedirectPath(raw: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  return trimmed;
}

/** OAuth / callback : callback de base + ?redirect= si chemin interne valide. */
export function buildAuthCallbackUrl(
  callbackBaseUrl: string,
  redirect: string | null
): string {
  const safe = safeRedirectPath(redirect);
  if (!safe) return callbackBaseUrl;
  return `${callbackBaseUrl}?redirect=${encodeURIComponent(safe)}`;
}

/**
 * Destination post-auth : ?redirect= URL, puis bookingResumeIntent, puis onboarding.
 */
export function resolvePostAuthRedirect(): string {
  const fromQuery = safeRedirectPath(
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("redirect")
      : null
  );
  if (fromQuery) return fromQuery;

  const fromIntent = safeRedirectPath(loadBookingResumeIntent()?.path ?? null);
  if (fromIntent) return fromIntent;

  return "/onboarding/client";
}
