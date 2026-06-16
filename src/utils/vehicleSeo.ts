/**
 * Helpers pour générer title, description et canonical dynamiques des pages véhicule/moto.
 */

import { ariaryToEur, formatEur, FALLBACK_EXCHANGE } from "./dualCurrency";
import type { AccommodationSeoInput } from "./accommodationSeo";
import {
  buildAccommodationSeoTitle as buildAccommodationSeoTitleImpl,
  buildAccommodationSeoDescription as buildAccommodationSeoDescriptionImpl,
  buildAccommodationCanonical as buildAccommodationCanonicalImpl,
} from "./accommodationSeo";

export type { AccommodationSeoInput };

const CANONICAL_BASE = "https://rentanoo.com";

export interface VehicleSeoInput {
  brand: string;
  model: string;
  year?: number | null;
  pricePerDay?: number | null;
  isMoto: boolean;
  vehicleType?: string | null;
  license: string;
}

function formatPriceForSeo(priceMga: number, rate = FALLBACK_EXCHANGE.rate): string {
  return formatEur(ariaryToEur(priceMga, rate));
}

/** @deprecated Préférer buildAccommodationSeoTitle depuis accommodationSeo.ts */
export function buildAccommodationSeoTitle(input: AccommodationSeoInput): string {
  return buildAccommodationSeoTitleImpl(input);
}

/** @deprecated Préférer buildAccommodationSeoDescription depuis accommodationSeo.ts */
export function buildAccommodationSeoDescription(input: AccommodationSeoInput): string {
  return buildAccommodationSeoDescriptionImpl(input);
}

export function buildAccommodationCanonical(license: string): string {
  return buildAccommodationCanonicalImpl(license);
}

/**
 * Construit le title SEO pour une page véhicule.
 */
export function buildVehicleSeoTitle(
  input: VehicleSeoInput,
  options?: { yearInTitle?: boolean }
): string {
  const { brand, model, year, vehicleType } = input;
  const brandModel = [brand, model].filter(Boolean).join(" ") || "Véhicule";
  const yearSuffix =
    options?.yearInTitle !== false && year ? ` (${year})` : "";
  const typeLabel = getVehicleTypeLabel({ model, vehicleType });
  return `${brandModel}${yearSuffix} – Location ${typeLabel} Nosy Be | Rentanoo`;
}

/**
 * Construit la meta description SEO pour une page véhicule.
 */
export function buildVehicleSeoDescription(input: VehicleSeoInput): string {
  const { brand, model, pricePerDay, vehicleType } = input;
  const brandModel = [brand, model].filter(Boolean).join(" ") || "véhicule";
  const typeLabel = getVehicleTypeLabel({ model, vehicleType });
  const article = getLocationArticle(typeLabel);
  const pricePart =
    pricePerDay != null && pricePerDay > 0
      ? `À partir de ${formatPriceForSeo(pricePerDay)}/jour. `
      : "";
  return `Louez ${article} ${brandModel} (${typeLabel}) à Nosy Be. ${pricePart}Réservation en ligne, livraison à l'hôtel ou à l'aéroport. Rentanoo.`;
}

const QUAD_MODEL_KEYWORDS = ["maxxer", "quad", "atv"];

function isQuadByModel(model?: string | null): boolean {
  const m = (model || "").toLowerCase();
  return QUAD_MODEL_KEYWORDS.some((kw) => m.includes(kw));
}

function getTypeLabel(vehicleType?: string | null): string {
  const t = (vehicleType || "").toLowerCase();
  if (t === "scooter") return "scooter";
  if (t === "moto") return "moto";
  if (t === "accommodation") return "hébergement";
  // "car" ou toute valeur inconnue → voiture
  return "voiture";
}

export function getVehicleTypeLabel(input: {
  model?: string | null;
  vehicleType?: string | null;
}): string {
  return isQuadByModel(input.model) ? "quad" : getTypeLabel(input.vehicleType);
}

export function getLocationArticle(typeLabel: string): "ce" | "cette" {
  const t = (typeLabel || "").toLowerCase();
  return t === "moto" || t === "voiture" ? "cette" : "ce";
}

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

export function buildVehicleCanonical(
  license: string,
  isMoto: boolean
): string {
  const path = isMoto ? `/moto/${license}` : `/vehicle/${license}`;
  return `${CANONICAL_BASE}${path}`;
}

const HOME_URL = `${CANONICAL_BASE}/`;

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
