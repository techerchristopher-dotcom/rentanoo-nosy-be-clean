/**
 * SEO helpers for accommodation listing pages.
 */

import { ariaryToEur, formatEur, FALLBACK_EXCHANGE } from "./dualCurrency";
import type { LocationAreaRef } from "@/types/locationArea";

const CANONICAL_BASE = "https://rentanoo.com";

/** Quartiers Nosy Be reconnus pour l'extraction SEO. */
export const NOSY_BE_LOCALITIES = [
  "Ambatoloaka",
  "Madirokely",
  "Ambondrona",
  "Andilana",
  "Dzamandzar",
  "Hell-Ville",
  "Hell Ville",
  "Fascène",
  "Fascene",
  "Palm Beach",
  "Dar Es Salam",
] as const;

export interface AccommodationSeoInput {
  model: string;
  vehicleCategory?: string | null;
  description?: string | null;
  /** @deprecated Préférer locationArea */
  location?: string | null;
  locationArea?: LocationAreaRef | null;
  pricePerDay?: number | null;
  license: string;
  seats?: number | null;
  pickupZones?: string[] | null;
}

function formatPriceForSeo(priceMga: number, rate = FALLBACK_EXCHANGE.rate): string {
  return formatEur(ariaryToEur(priceMga, rate));
}

/** Extrait un quartier connu depuis texte libre (modèle, description, location). */
export function extractAccommodationLocality(
  ...sources: Array<string | null | undefined>
): string | null {
  const haystack = sources
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  for (const place of NOSY_BE_LOCALITIES) {
    const normalizedPlace = place
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/-/g, "[\\s-]?");
    const re = new RegExp(normalizedPlace, "i");
    if (re.test(haystack)) {
      return place.replace("Hell Ville", "Hell-Ville");
    }
  }
  return null;
}

/** Libellé SEO minuscule pour la catégorie (Appartement → appartement). */
export function getAccommodationCategoryLabel(
  vehicleCategory?: string | null
): string | null {
  if (!vehicleCategory?.trim()) return null;
  return vehicleCategory.trim().toLowerCase();
}

function getAccommodationDemonstrative(category?: string | null): "ce" | "cet" | "cette" {
  const c = (category || "").trim().toLowerCase();
  if (c === "villa" || c === "maison" || c === "chambre") return "cette";
  if (c === "appartement" || c === "hébergement" || c === "hebergement") return "cet";
  return "ce";
}

/** Résout le nom de quartier : location_area > pickup_zones > texte libre. */
export function resolveAccommodationLocalityName(
  input: Pick<
    AccommodationSeoInput,
    "locationArea" | "location" | "pickupZones" | "model" | "description"
  >
): string | null {
  if (input.locationArea?.name?.trim()) {
    return input.locationArea.name.trim();
  }

  const pickupHaystack = (input.pickupZones || []).join(" ");
  const fromText = extractAccommodationLocality(
    input.location,
    pickupHaystack,
    input.model,
    input.description
  );
  if (fromText) return fromText;

  return null;
}

function buildLocationPhrase(input: AccommodationSeoInput): string {
  const category = getAccommodationCategoryLabel(input.vehicleCategory);
  const locality = resolveAccommodationLocalityName(input);

  if (category && locality) {
    return `Location ${category} à ${locality}, Nosy Be`;
  }
  if (category) {
    return `Location ${category} à Nosy Be`;
  }
  if (locality) {
    return `Location hébergement à ${locality}, Nosy Be`;
  }
  const name = input.model?.trim() || "hébergement";
  return `Location ${name} à Nosy Be`;
}

export function buildAccommodationSeoTitle(input: AccommodationSeoInput): string {
  return `${buildLocationPhrase(input)} | Rentanoo`;
}

export function buildAccommodationH1Title(input: AccommodationSeoInput): string {
  return buildLocationPhrase(input);
}

export function buildAccommodationSeoDescription(
  input: AccommodationSeoInput
): string {
  const category = getAccommodationCategoryLabel(input.vehicleCategory);
  const locality = resolveAccommodationLocalityName(input);

  const demonstrative = category
    ? getAccommodationDemonstrative(category)
    : "cet";
  const noun = category || "hébergement";

  const subject =
    locality
      ? `${demonstrative} ${noun} à ${locality}`
      : `${demonstrative} ${noun} à Nosy Be`;

  const pricePart =
    input.pricePerDay != null && input.pricePerDay > 0
      ? `À partir de ${formatPriceForSeo(input.pricePerDay)}/nuit. `
      : "";

  const capacityPart =
    typeof input.seats === "number" && input.seats > 0
      ? `Jusqu'à ${input.seats} voyageurs. `
      : "";

  return `Louez ${subject}, Nosy Be. ${capacityPart}${pricePart}Réservation en ligne sur Rentanoo.`;
}

export function buildAccommodationCanonical(license: string): string {
  return `${CANONICAL_BASE}/hebergement/${license}`;
}

/** Nom court pour breadcrumb / schema (sans emoji). */
export function buildAccommodationShortName(input: AccommodationSeoInput): string {
  const category = getAccommodationCategoryLabel(input.vehicleCategory);
  const locality = resolveAccommodationLocalityName(input);
  if (category && locality) {
    return `${category.charAt(0).toUpperCase()}${category.slice(1)} ${locality}`;
  }
  return (input.model || "Hébergement").replace(/[\u{1F300}-\u{1FAFF}]/gu, "").trim();
}

export function buildAccommodationOgImage(primaryPhotoUrl?: string | null): string {
  const fallback = "https://rentanoo.com/og-rentanoo-nosy-be.webp";
  const url = (primaryPhotoUrl || "").trim();
  if (!url) return fallback;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return url.startsWith("/") ? `https://rentanoo.com${url}` : `https://rentanoo.com/${url}`;
}
