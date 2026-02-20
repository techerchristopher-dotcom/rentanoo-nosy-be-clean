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
