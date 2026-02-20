import { Helmet } from "react-helmet-async";

export const DEFAULT_TITLE = "Location scooter Nosy Be – Louer un scooter en ligne | Rentanoo";
export const DEFAULT_DESCRIPTION =
  "Louez votre scooter à Nosy Be en quelques clics. Livraison à l'aéroport ou à l'hôtel. Casques et assurance inclus. Réservation 100 % en ligne.";
export const DEFAULT_OG_IMAGE = "https://rentanoo.com/og-rentanoo-nosy-be.webp";

export interface SeoProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  /** JSON-LD structured data (Schema.org) — injecté en script type="application/ld+json" */
  structuredData?: object;
}

/**
 * Injects SEO meta tags (title, description, og, twitter, canonical) via react-helmet-async.
 * Uses defaults from index.html when props are absent.
 * Optionally injects JSON-LD structured data when structuredData is provided.
 */
export function Seo({ title, description, canonical, ogImage, structuredData }: SeoProps) {
  const effectiveTitle = title ?? DEFAULT_TITLE;
  const effectiveDescription = description ?? DEFAULT_DESCRIPTION;
  const effectiveOgImage = ogImage ?? DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{effectiveTitle}</title>
      <meta name="description" content={effectiveDescription} />
      <meta property="og:title" content={effectiveTitle} />
      <meta property="og:description" content={effectiveDescription} />
      <meta property="og:image" content={effectiveOgImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={effectiveTitle} />
      <meta name="twitter:description" content={effectiveDescription} />
      <meta name="twitter:image" content={effectiveOgImage} />
      {canonical && <link rel="canonical" href={canonical} />}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
