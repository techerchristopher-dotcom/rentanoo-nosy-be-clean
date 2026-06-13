/**
 * Génère un slug URL depuis un nom de quartier (ex. "Dar Es Salam" → "dar-es-salam").
 */
export function slugifyLocationAreaName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Chemin hub SEO quartier (Phase 2 pages). */
export function buildLocationAreaSeoHubPath(
  areaSlug: string,
  categorySlug = "appartement"
): string {
  return `/location-${categorySlug}-${areaSlug}`;
}
