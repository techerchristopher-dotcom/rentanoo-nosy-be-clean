/**
 * Helpers pour générer title, description et canonical dynamiques des pages véhicule/moto.
 */

const CANONICAL_BASE = "https://rentanoo.com";

export interface VehicleSeoInput {
  brand: string;
  model: string;
  year?: number | null;
  pricePerDay?: number | null;
  isMoto: boolean;
  license: string;
}

/**
 * Formate le prix pour la meta description (ex: "35€").
 */
export function formatPriceForSeo(price: number): string {
  return `${Math.round(price)}€`;
}

/**
 * Construit le title SEO pour une page véhicule.
 */
export function buildVehicleSeoTitle(
  input: VehicleSeoInput,
  options?: { yearInTitle?: boolean }
): string {
  const { brand, model, year, isMoto } = input;
  const brandModel = [brand, model].filter(Boolean).join(" ") || "Véhicule";
  const yearSuffix =
    options?.yearInTitle !== false && year ? ` (${year})` : "";
  const suffix = isMoto
    ? "– Location scooter Nosy Be | Rentanoo"
    : "– Location à Nosy Be | Rentanoo";
  return `${brandModel}${yearSuffix} ${suffix}`;
}

/**
 * Construit la meta description SEO pour une page véhicule.
 */
export function buildVehicleSeoDescription(input: VehicleSeoInput): string {
  const { brand, model, pricePerDay } = input;
  const brandModel = [brand, model].filter(Boolean).join(" ") || "véhicule";
  const pricePart =
    pricePerDay != null && pricePerDay > 0
      ? `À partir de ${formatPriceForSeo(pricePerDay)}/jour. `
      : "";
  return `Louez ce ${brandModel} à Nosy Be. ${pricePart}Réservation en ligne, livraison possible à l'hôtel ou à l'aéroport. Rentanoo.`;
}

const QUAD_MODEL_KEYWORDS = ["maxxer", "quad", "atv"];

/**
 * Détecte si le modèle indique un quad (ex: KYMCO MAXXER).
 * Priorité sur vehicle_type pour le H1 SEO.
 */
function isQuadByModel(model?: string | null): boolean {
  const m = (model || "").toLowerCase();
  return QUAD_MODEL_KEYWORDS.some((kw) => m.includes(kw));
}

/**
 * typeLabel pour H1 selon vehicle_type : scooter | moto | voiture
 */
function getTypeLabel(vehicleType?: string | null): string {
  const t = (vehicleType || "").toLowerCase();
  if (t === "scooter") return "scooter";
  if (t === "moto") return "moto";
  return "voiture";
}

/**
 * Retourne le typeLabel (quad / scooter / moto / voiture) pour affichage SEO.
 * Même logique que buildVehicleH1Title (quad prioritaire si model contient maxxer/quad/atv).
 */
export function getVehicleTypeLabel(input: {
  model?: string | null;
  vehicleType?: string | null;
}): string {
  return isQuadByModel(input.model) ? "quad" : getTypeLabel(input.vehicleType);
}

/**
 * Retourne l'article pour "Location de {article} {type} à Nosy Be".
 * moto, voiture => "cette" ; quad, scooter => "ce"
 */
export function getLocationArticle(typeLabel: string): "ce" | "cette" {
  const t = (typeLabel || "").toLowerCase();
  return t === "moto" || t === "voiture" ? "cette" : "ce";
}

/**
 * Construit le H1 SEO pour une page véhicule.
 * Format: {brand} {model} ({engine_capacity} CC) – Location {typeLabel} à Nosy Be
 * Règle quad : si model contient maxxer/quad/atv → typeLabel = "quad"
 */
export function buildVehicleH1Title(
  input: {
    brand: string;
    model: string;
    engineCapacity?: string | null;
    vehicleType?: string | null;
  }
): string {
  const { brand, model, engineCapacity, vehicleType } = input;
  const brandModel = [brand, model].filter(Boolean).join(" ") || "Véhicule";
  const rawCc = String(engineCapacity || "").trim().replace(/\s*cc$/i, "") || "";
  const enginePart = rawCc ? ` (${rawCc} CC)` : "";
  const typeLabel = isQuadByModel(model) ? "quad" : getTypeLabel(vehicleType);
  return `${brandModel}${enginePart} – Location ${typeLabel} à Nosy Be`;
}

/**
 * Construit l'URL canonique pour une page véhicule.
 */
export function buildVehicleCanonical(
  license: string,
  isMoto: boolean
): string {
  const path = isMoto ? `/moto/${license}` : `/vehicle/${license}`;
  return `${CANONICAL_BASE}${path}`;
}

const HOME_URL = `${CANONICAL_BASE}/`;

/**
 * Construit le JSON-LD schema.org BreadcrumbList pour une page véhicule.
 * OPTION B : Accueil > Location {typeLabel} à Nosy Be > {brand} {model} ({year})
 */
export function buildVehicleBreadcrumbSchema(input: {
  typeLabel: string;
  brand: string;
  model: string;
  year?: number | null;
  canonical: string;
}): object {
  const { typeLabel, brand, model, year, canonical } = input;
  const brandModel = [brand, model].filter(Boolean).join(" ") || "Véhicule";
  const yearPart = year ? ` (${year})` : "";

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: HOME_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: `Location ${typeLabel} à Nosy Be`,
        item: HOME_URL,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `${brandModel}${yearPart}`,
        item: canonical,
      },
    ],
  };
}
