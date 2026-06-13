/**
 * JSON-LD schema.org for accommodation listing pages.
 */

import {
  resolveAccommodationLocalityName,
  getAccommodationCategoryLabel,
  type AccommodationSeoInput,
} from "./accommodationSeo";

const SITE_BASE = "https://rentanoo.com";
const MAX_IMAGES = 5;
const DESCRIPTION_FALLBACK =
  "Location de vacances à Nosy Be, Madagascar. Réservation en ligne sur Rentanoo.";

function cleanDescription(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return DESCRIPTION_FALLBACK;
  const cleaned = raw
    .replace(/[#*✅📍🏖️🍹🚕💵🛏️🌴]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned.slice(0, 320) : DESCRIPTION_FALLBACK;
}

function ensureAbsoluteUrl(url: string, base = SITE_BASE): string {
  const trimmed = (url || "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

export interface AccommodationSchemaInput extends AccommodationSeoInput {
  canonical: string;
  description?: string | null;
  images: string[];
}

export function buildAccommodationVacationRentalSchema(
  input: AccommodationSchemaInput
): object {
  const locality = resolveAccommodationLocalityName(input);
  const category = getAccommodationCategoryLabel(input.vehicleCategory);

  let imageUrls = input.images
    .filter((u): u is string => !!u && typeof u === "string")
    .map((u) => ensureAbsoluteUrl(u))
    .filter((u) => u.length > 0)
    .slice(0, MAX_IMAGES);

  if (imageUrls.length === 0) {
    imageUrls = [`${SITE_BASE}/og-rentanoo-nosy-be.webp`];
  }

  const price =
    typeof input.pricePerDay === "number" && input.pricePerDay > 0
      ? Number(input.pricePerDay)
      : null;

  const offer: Record<string, unknown> = {
    "@type": "Offer",
    url: input.canonical,
    availability: "https://schema.org/InStock",
    priceCurrency: "EUR",
  };

  if (price != null) {
    offer.price = price;
    offer.priceSpecification = {
      "@type": "UnitPriceSpecification",
      price,
      priceCurrency: "EUR",
      unitText: "NIGHT",
    };
  }

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    name: input.model?.trim() || "Hébergement Nosy Be",
    description: cleanDescription(input.description),
    image: imageUrls,
    url: input.canonical,
    offers: offer,
    address: {
      "@type": "PostalAddress",
      addressLocality: locality || "Nosy Be",
      addressRegion: "Nosy Be",
      addressCountry: "MG",
    },
    containedInPlace: {
      "@type": "Place",
      name: "Nosy Be, Madagascar",
    },
  };

  if (category) {
    schema.additionalType = category;
  }

  if (typeof input.seats === "number" && input.seats > 0) {
    schema.occupancy = {
      "@type": "QuantitativeValue",
      maxValue: input.seats,
      unitText: "guests",
    };
  }

  return schema;
}

export function buildAccommodationBreadcrumbSchema(input: {
  shortName: string;
  canonical: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: `${SITE_BASE}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Location vacances Nosy Be",
        item: `${SITE_BASE}/`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: input.shortName,
        item: input.canonical,
      },
    ],
  };
}
