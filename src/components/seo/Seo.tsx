import { Helmet } from "react-helmet-async";

export const DEFAULT_TITLE = "Location scooter, moto, voiture & hébergement à Nosy Be | Rentanoo";
export const DEFAULT_DESCRIPTION =
  "Réservez en ligne scooter, moto, voiture ou hébergement à Nosy Be. Livraison à l'aéroport Fascène ou à votre hôtel. Assurance incluse. Plateforme 100 % en ligne.";
export const DEFAULT_OG_IMAGE = "https://rentanoo.com/og-rentanoo-nosy-be.webp";

export interface SeoProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  /** Prevent Google from indexing this page (noindex, nofollow) */
  noIndex?: boolean;
  /** JSON-LD structured data (Schema.org) — injecté en script type="application/ld+json" */
  structuredData?: object;
  /** Second JSON-LD script (ex: BreadcrumbList) — rendu en plus de structuredData */
  extraStructuredData?: object;
}

/**
 * Injects SEO meta tags (title, description, og, twitter, canonical) via react-helmet-async.
 * Uses defaults from index.html when props are absent.
 * Optionally injects JSON-LD structured data when structuredData / extraStructuredData are provided.
 */
export function Seo({ title, description, canonical, ogImage, noIndex, structuredData, extraStructuredData }: SeoProps) {
  const effectiveTitle = title ?? DEFAULT_TITLE;
  const effectiveDescription = description ?? DEFAULT_DESCRIPTION;
  const effectiveOgImage = ogImage ?? DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{effectiveTitle}</title>
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
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
      {extraStructuredData && (
        <script type="application/ld+json">
          {JSON.stringify(extraStructuredData)}
        </script>
      )}
    </Helmet>
  );
}
