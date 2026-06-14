/**
 * Génère le JSON-LD schema.org Product + Offer pour les pages véhicule/moto.
 * Utilisé par VehicleDetails et MotoVehicleDetails via <Seo structuredData={...}>.
 */

const DESCRIPTION_FALLBACK =
  "Location de véhicule à Nosy Be (Madagascar). Livraison à l'aéroport ou à l'hôtel selon disponibilité.";

const MAX_IMAGES = 5;

export interface VehicleProductSchemaInput {
  canonical: string;
  license: string;
  brand: string;
  model: string;
  year?: number | null;
  description?: string | null;
  pricePerDay: number;
  currency: "EUR";
  images: string[];
  isMoto: boolean;
  vehicleType?: string | null;
}

/**
 * Nettoie la description (trim, suppression de retours à la ligne excessifs).
 * Retourne le fallback si vide ou invalide.
 */
function cleanDescription(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return DESCRIPTION_FALLBACK;
  const cleaned = raw.trim().replace(/\s+/g, " ");
  return cleaned.length > 0 ? cleaned : DESCRIPTION_FALLBACK;
}

/**
 * Garantit qu'une URL est absolue (déjà OK si commence par http/https).
 */
function ensureAbsoluteUrl(url: string, base = "https://rentanoo.com"): string {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

/**
 * Construit le JSON-LD Product + Offer pour une page véhicule ou moto.
 * À injecter uniquement quand vehicle est chargé (success state).
 */
export function buildVehicleProductSchema(
  input: VehicleProductSchemaInput
): object {
  const {
    canonical,
    license,
    brand,
    model,
    year,
    description,
    pricePerDay,
    currency,
    images,
    vehicleType,
  } = input;

  const QUAD_KEYWORDS = ["maxxer", "quad", "atv"];
  const isQuad = QUAD_KEYWORDS.some((kw) => (model || "").toLowerCase().includes(kw));
  const typeLabel = isQuad ? "quad" : (() => {
    const t = (vehicleType || "").toLowerCase();
    if (t === "scooter") return "scooter";
    if (t === "moto") return "moto";
    return "voiture";
  })();

  const brandModel = [brand, model].filter(Boolean).join(" ") || "Véhicule";
  const yearPart = year ? ` (${year})` : "";
  const name = `${brandModel}${yearPart} – Location ${typeLabel} Nosy Be`;

  let imageUrls = images
    .filter((u): u is string => !!u && typeof u === "string")
    .map((u) => ensureAbsoluteUrl(u))
    .filter((u) => u.length > 0)
    .slice(0, MAX_IMAGES);

  if (imageUrls.length === 0) {
    imageUrls = ["https://rentanoo.com/og-rentanoo-nosy-be.webp"];
  }

  const price =
    typeof pricePerDay === "number" && pricePerDay > 0
      ? Number(pricePerDay)
      : null;

  const offer: Record<string, unknown> = {
    "@type": "Offer",
    url: canonical,
    availability: "https://schema.org/InStock",
    itemCondition: "https://schema.org/UsedCondition",
    areaServed: {
      "@type": "Place",
      name: "Nosy Be, Madagascar",
    },
  };

  if (price !== null && price > 0) {
    offer.price = price;
    offer.priceCurrency = currency;
    offer.priceSpecification = {
      "@type": "UnitPriceSpecification",
      price,
      priceCurrency: currency,
      unitText: "DAY",
    };
  }

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: cleanDescription(description),
    image: imageUrls,
    brand: {
      "@type": "Brand",
      name: brand || "Unknown",
    },
    sku: license || "",
    offers: offer,
  };
}
