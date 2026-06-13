export function buildWhatsAppUrl(waUrl: string, message: string): string {
  const separator = waUrl.includes("?") ? "&" : "?";
  return `${waUrl}${separator}text=${encodeURIComponent(message)}`;
}
