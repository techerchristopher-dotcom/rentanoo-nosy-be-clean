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
