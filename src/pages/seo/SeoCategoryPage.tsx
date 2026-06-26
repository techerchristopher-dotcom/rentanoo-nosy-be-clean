import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/seo/Seo";
import {
  SeoContentSection,
  SeoCtaPanel,
  SeoFaqSection,
  SeoPageHero,
  SeoPageShell,
} from "@/components/seo/SeoPageLayout";
import { SupabaseVehiclesService, Vehicle as SupabaseVehicle } from "@/services/supabaseVehiclesService";
import { getPublicListingPath } from "@/utils/vehicleType";
import { resolvePhotoUrl } from "@/utils/resolvePhotoUrl";

export interface SeoCategoryFaqItem { q: string; a: string; }
export interface SeoCategoryBreadcrumb { name: string; item: string; }
export interface SeoCategoryRelatedLink { label: string; href: string; }

export interface SeoCategoryPageProps {
  seoTitle: string;
  seoDescription: string;
  canonical: string;
  eyebrow: string;
  heroTitle: string;
  heroIntro: string;
  vehicleType: "scooter" | "moto" | "accommodation" | "car" | "quad";
  vehicleSubCategory?: string | null;
  contentTitle: string;
  contentBody: string;
  highlights: string[];
  faqTitle: string;
  faqItems: SeoCategoryFaqItem[];
  ctaTitle: string;
  ctaText: string;
  ctaHref: string;
  ctaLabel: string;
  relatedLinks?: SeoCategoryRelatedLink[];
  breadcrumbs: SeoCategoryBreadcrumb[];
}

function MiniListingCard({ v }: { v: SupabaseVehicle }) {
  const path = getPublicListingPath(v);
  const photo = resolvePhotoUrl((v as unknown as { primary_photo_url?: string }).primary_photo_url ?? null);
  const price = v.price_per_day;
  const label = `${v.brand} ${v.model}`.trim();
  const unit = v.vehicle_type === "accommodation" ? "nuit" : "jour";

  return (
    <Link
      to={path}
      className="group flex flex-col rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="h-40 bg-muted overflow-hidden">
        {photo ? (
          <img src={photo} alt={label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Photo à venir</div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1">
        <p className="font-semibold text-sm text-foreground line-clamp-1">{label}</p>
        {price ? (
          <p className="text-primary font-bold text-sm">{price.toLocaleString("fr-FR")} Ar / {unit}</p>
        ) : null}
        <span className="mt-auto inline-flex items-center gap-1 text-xs text-primary font-medium pt-1">
          Voir la fiche <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

export function SeoCategoryPage({
  seoTitle, seoDescription, canonical, eyebrow, heroTitle, heroIntro,
  vehicleType, vehicleSubCategory,
  contentTitle, contentBody, highlights, faqTitle, faqItems,
  ctaTitle, ctaText, ctaHref, ctaLabel, relatedLinks, breadcrumbs,
}: SeoCategoryPageProps) {
  const [listings, setListings] = useState<SupabaseVehicle[]>([]);

  useEffect(() => {
    SupabaseVehiclesService.getAvailableVehicles({ limit: 40 }).then((all) => {
      const QUAD_KW = ["quad", "maxxer", "atv"];
      let filtered = all.filter((v) => {
        if (vehicleType === "quad") {
          return (v.vehicle_type === "moto" || v.vehicle_type === "scooter") &&
            QUAD_KW.some((kw) => (v.model || "").toLowerCase().includes(kw));
        }
        if (vehicleType === "car") {
          return !["scooter", "moto", "accommodation"].includes(v.vehicle_type ?? "");
        }
        return v.vehicle_type === vehicleType;
      });
      if (vehicleSubCategory) {
        filtered = filtered.filter((v) =>
          (v as unknown as { vehicle_category?: string }).vehicle_category === vehicleSubCategory
        );
      }
      setListings(filtered.slice(0, 6));
    });
  }, [vehicleType, vehicleSubCategory]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((bc, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: bc.name,
      item: bc.item,
    })),
  };

  return (
    <SeoPageShell>
      <Seo
        title={seoTitle}
        description={seoDescription}
        canonical={canonical}
        structuredData={faqSchema}
        extraStructuredData={breadcrumbSchema}
      />

      <SeoPageHero theme="exchange" eyebrow={eyebrow} title={heroTitle} intro={heroIntro} />

      {/* Highlights */}
      <section className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {highlights.map((h) => (
              <li key={h} className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" aria-hidden />
                {h}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Listings */}
      {listings.length > 0 && (
        <section className="container mx-auto px-4 py-10 max-w-5xl">
          <h2 className="text-xl font-bold mb-5 tracking-tight">Annonces disponibles</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {listings.map((v) => <MiniListingCard key={v.id} v={v} />)}
          </div>
          <div className="mt-6 text-center">
            <Button asChild variant="outline">
              <Link to={ctaHref}>Voir toutes les annonces <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      )}

      <SeoContentSection>
        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:tracking-tight">
          <h2>{contentTitle}</h2>
          <p>{contentBody}</p>
        </div>

        {relatedLinks && relatedLinks.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            {relatedLinks.map((l) => (
              <Button key={l.href} asChild variant="outline" size="sm">
                <Link to={l.href}>{l.label}</Link>
              </Button>
            ))}
          </div>
        )}

        <SeoFaqSection title={faqTitle} items={faqItems} />

        <SeoCtaPanel title={ctaTitle} text={ctaText}>
          <Button asChild className="bg-white text-primary font-semibold hover:bg-white/90 shadow-md">
            <Link to={ctaHref}>{ctaLabel}</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/50 bg-transparent text-white hover:bg-white/10">
            <Link to="/">Accueil Rentanoo</Link>
          </Button>
        </SeoCtaPanel>
      </SeoContentSection>

      <Footer />
    </SeoPageShell>
  );
}
