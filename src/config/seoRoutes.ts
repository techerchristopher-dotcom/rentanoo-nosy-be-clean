/** URLs SEO fixes (slugs FR — canoniques pour le référencement). */

// --- Pages catégorie véhicules ---
export const SEO_SCOOTER_PATH = "/location-scooter-nosy-be";
export const SEO_MOTO_PATH = "/location-moto-nosy-be";
export const SEO_QUAD_PATH = "/location-quad-nosy-be";
export const SEO_VOITURE_PATH = "/location-voiture-nosy-be";
export const SEO_4X4_PATH = "/location-4x4-nosy-be";
export const SEO_MINIBUS_PATH = "/location-minibus-nosy-be";

export const SEO_SCOOTER_URL = `https://rentanoo.com${SEO_SCOOTER_PATH}`;
export const SEO_MOTO_URL = `https://rentanoo.com${SEO_MOTO_PATH}`;
export const SEO_QUAD_URL = `https://rentanoo.com${SEO_QUAD_PATH}`;
export const SEO_VOITURE_URL = `https://rentanoo.com${SEO_VOITURE_PATH}`;
export const SEO_4X4_URL = `https://rentanoo.com${SEO_4X4_PATH}`;
export const SEO_MINIBUS_URL = `https://rentanoo.com${SEO_MINIBUS_PATH}`;

// --- Blog ---
export const BLOG_PATH = "/blog";
export const BLOG_URL = `https://rentanoo.com${BLOG_PATH}`;

export const SEO_WEATHER_PATH = "/meteo-nosy-be";
export const SEO_EXCHANGE_PATH = "/taux-change-euro-ariary-madagascar";
export const SEO_FLIGHTS_PATH = "/vols-aeroport-nosy-be";

export const SITE_ORIGIN = "https://rentanoo.com";

export const SEO_WEATHER_URL = `${SITE_ORIGIN}${SEO_WEATHER_PATH}`;
export const SEO_EXCHANGE_URL = `${SITE_ORIGIN}${SEO_EXCHANGE_PATH}`;
export const SEO_FLIGHTS_URL = `${SITE_ORIGIN}${SEO_FLIGHTS_PATH}`;

/** Horaires officiels — Aéroport international de Nosy Be (Ravinala Airports). */
export const NOSY_BE_OFFICIAL_FLIGHTS_URL = "https://www.nosybe-airport.aero/vols/";

// --- Hébergements : hubs SEO (Phase 2 — routes réservées, pages à implémenter) ---

export const SEO_ACCOMMODATION_HUB_VACANCES_PATH = "/location-vacances-nosy-be";
export const SEO_ACCOMMODATION_HUB_APPARTEMENT_PATH = "/location-appartement-nosy-be";
export const SEO_ACCOMMODATION_HUB_VILLA_PATH = "/location-villa-nosy-be";
export const SEO_ACCOMMODATION_HUB_BUNGALOW_PATH = "/location-bungalow-nosy-be";

export const SEO_ACCOMMODATION_HUB_VACANCES_URL = `${SITE_ORIGIN}${SEO_ACCOMMODATION_HUB_VACANCES_PATH}`;
export const SEO_ACCOMMODATION_HUB_APPARTEMENT_URL = `${SITE_ORIGIN}${SEO_ACCOMMODATION_HUB_APPARTEMENT_PATH}`;
export const SEO_ACCOMMODATION_HUB_VILLA_URL = `${SITE_ORIGIN}${SEO_ACCOMMODATION_HUB_VILLA_PATH}`;
export const SEO_ACCOMMODATION_HUB_BUNGALOW_URL = `${SITE_ORIGIN}${SEO_ACCOMMODATION_HUB_BUNGALOW_PATH}`;

/**
 * Architecture hubs hébergement — maillage interne recommandé :
 *
 * Home (/)
 *   → /location-vacances-nosy-be (hub principal)
 *       → /location-appartement-nosy-be
 *       → /location-villa-nosy-be
 *       → /location-bungalow-nosy-be
 *       → /hebergement/:license (fiches)
 *
 * Fiches → breadcrumb → hub vacances → home
 * Explorer filtres hébergement → hub appartement / villa / bungalow
 */
export const ACCOMMODATION_SEO_HUBS = [
  {
    id: "vacances",
    path: SEO_ACCOMMODATION_HUB_VACANCES_PATH,
    url: SEO_ACCOMMODATION_HUB_VACANCES_URL,
    priority: "high",
    i18nTitleKey: "seo.accommodationHubs.vacances.title",
    parentId: null,
    filterCategory: null,
  },
  {
    id: "appartement",
    path: SEO_ACCOMMODATION_HUB_APPARTEMENT_PATH,
    url: SEO_ACCOMMODATION_HUB_APPARTEMENT_URL,
    priority: "high",
    i18nTitleKey: "seo.accommodationHubs.appartement.title",
    parentId: "vacances",
    filterCategory: "Appartement",
  },
  {
    id: "villa",
    path: SEO_ACCOMMODATION_HUB_VILLA_PATH,
    url: SEO_ACCOMMODATION_HUB_VILLA_URL,
    priority: "medium",
    i18nTitleKey: "seo.accommodationHubs.villa.title",
    parentId: "vacances",
    filterCategory: "Villa",
  },
  {
    id: "bungalow",
    path: SEO_ACCOMMODATION_HUB_BUNGALOW_PATH,
    url: SEO_ACCOMMODATION_HUB_BUNGALOW_URL,
    priority: "medium",
    i18nTitleKey: "seo.accommodationHubs.bungalow.title",
    parentId: "vacances",
    filterCategory: "Bungalow",
  },
] as const;

/** Routes à enregistrer dans App.tsx lors de la Phase 2 SEO hubs. */
export const ACCOMMODATION_SEO_HUB_ROUTE_PATHS = ACCOMMODATION_SEO_HUBS.map(
  (hub) => hub.path
);

/**
 * Hub SEO quartier dynamique (Phase 2) — slug depuis location_areas.slug.
 * Ex. buildAccommodationAreaSeoPath("ambatoloaka") → /location-appartement-ambatoloaka
 */
export function buildAccommodationAreaSeoPath(
  areaSlug: string,
  categorySlug: "appartement" | "villa" | "bungalow" | "vacances" = "appartement"
): string {
  if (categorySlug === "vacances") {
    return SEO_ACCOMMODATION_HUB_VACANCES_PATH;
  }
  return `/location-${categorySlug}-${areaSlug}`;
}
