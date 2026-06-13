import { SITE_ORIGIN } from "@/config/seoRoutes";
import { buildLocationAreaSeoHubPath } from "@/utils/locationAreaSlug";

/**
 * Filtre quartiers home / explorer — désactivé jusqu'à Phase 2b UI.
 * Les slugs viennent de location_areas.slug en runtime.
 */
export const LOCATION_AREA_HOME_FILTER = {
  enabled: false,
  paramKey: "area",
  i18nAllKey: "homeFilters.area.all",
  i18nLabelPrefix: "homeFilters.area.",
} as const;

/** URL hub SEO pour un quartier (ex. /location-appartement-ambatoloaka). */
export function locationAreaSeoHubUrl(
  areaSlug: string,
  categorySlug = "appartement"
): string {
  return `${SITE_ORIGIN}${buildLocationAreaSeoHubPath(areaSlug, categorySlug)}`;
}
