import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, CreditCard, MapPin } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/seo/Seo";
import {
  SeoContentSection,
  SeoCtaPanel,
  SeoFaqSection,
  SeoPageShell,
} from "@/components/seo/SeoPageLayout";
import { WaveDivider } from "@/components/seo/WaveDivider";
import { SupabaseVehiclesService, Vehicle as SupabaseVehicle } from "@/services/supabaseVehiclesService";
import { getPublicListingPath } from "@/utils/vehicleType";
import { cn } from "@/lib/utils";

// ─── Données de la page ─────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "Comment fonctionne le paiement de mon hébergement ?",
    a: "Vous réglez un acompte en ligne pour confirmer votre réservation, le solde se règle directement sur place.",
  },
  {
    q: "Puis-je annuler ma réservation ?",
    a: "Oui. Vous êtes remboursé à 100% si vous annulez plus de 48h avant votre arrivée, à 50% entre 24h et 48h, sans remboursement en deçà de 24h. Les frais de service ne sont pas remboursables.",
  },
  {
    q: "Les hébergements sont-ils vérifiés avant d'être mis en ligne ?",
    a: "Oui, chaque hébergement est vérifié sur place par notre équipe locale à Nosy Be avant d'être proposé sur la plateforme.",
  },
];

const TRUST_ITEMS = [
  {
    icon: <MapPin className="h-3.5 w-3.5" aria-hidden />,
    label: "Vérifiés sur place par notre équipe",
  },
  {
    icon: <Shield className="h-3.5 w-3.5" aria-hidden />,
    label: "Prix clairs, aucune surprise",
  },
  {
    icon: <CreditCard className="h-3.5 w-3.5" aria-hidden />,
    label: "Acompte sécurisé, solde sur place",
  },
];

const RELATED_LINKS = [
  { label: "Appartements Nosy Be", href: "/location-appartement-nosy-be" },
  { label: "Villas Nosy Be", href: "/location-villa-nosy-be" },
  { label: "Bungalows Nosy Be", href: "/location-bungalow-nosy-be" },
  { label: "Location vacances Nosy Be", href: "/location-vacances-nosy-be" },
  { label: "Location scooter Nosy Be", href: "/location-scooter-nosy-be" },
];

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: "https://rentanoo.com/" },
    { "@type": "ListItem", position: 2, name: "Hébergement Nosy Be", item: "https://rentanoo.com/location-hebergement-nosy-be" },
  ],
};

// ─── Hook : apparition au scroll ────────────────────────────────────────────

function useScrollReveal(ref: React.RefObject<Element>, threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold]);
  return visible;
}

// ─── Carte listing locale (avec hover-lift) ──────────────────────────────────

function ListingCard({ v }: { v: SupabaseVehicle }) {
  const path = getPublicListingPath(v);
  const photoUrl = (v as unknown as { primaryPhotoUrl?: string }).primaryPhotoUrl ?? null;
  const price = v.price_per_day;
  const label = `${v.brand} ${v.model}`.trim();

  return (
    <Link
      to={path}
      className="group flex flex-col rounded-xl border bg-card overflow-hidden shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lagoon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="h-44 bg-muted overflow-hidden">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={label}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            Photo à venir
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1">
        <p className="font-semibold text-sm text-foreground line-clamp-1">{label}</p>
        {price ? (
          <p className="text-primary font-bold text-sm">
            {price.toLocaleString("fr-FR")} Ar / nuit
          </p>
        ) : null}
        <span className="mt-auto inline-flex items-center gap-1 text-xs text-primary font-medium pt-1">
          Voir la fiche <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function LocationHebergementNosyBePage() {
  const [listings, setListings] = useState<SupabaseVehicle[]>([]);
  const [heroBg, setHeroBg] = useState<string | null>(null);

  const trustRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const trustVisible = useScrollReveal(trustRef as React.RefObject<Element>);
  const gridVisible = useScrollReveal(gridRef as React.RefObject<Element>);

  useEffect(() => {
    SupabaseVehiclesService.getAvailableVehicles({ limit: 40 }).then((all) => {
      const accommodations = all.filter((v) => v.vehicle_type === "accommodation");
      setListings(accommodations.slice(0, 6));
      // Photo de héros : première accommodation avec photo
      const firstWithPhoto = accommodations.find(
        (v) => (v as unknown as { primaryPhotoUrl?: string }).primaryPhotoUrl
      );
      if (firstWithPhoto) {
        setHeroBg((firstWithPhoto as unknown as { primaryPhotoUrl?: string }).primaryPhotoUrl ?? null);
      }
    });
  }, []);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const fadeUp = (delay: number) =>
    prefersReducedMotion
      ? {}
      : { animationDelay: `${delay}ms`, animationFillMode: "both" as const };

  return (
    <SeoPageShell>
      <Seo
        title="Hébergement à Nosy Be — Réservation en ligne vérifiée | Rentanoo"
        description="Réservez votre hébergement à Nosy Be en ligne. Prix clairs, logements vérifiés sur place, acompte sécurisé. Réservation en 2 minutes sur Rentanoo."
        canonical="https://rentanoo.com/location-hebergement-nosy-be"
        structuredData={FAQ_SCHEMA}
        extraStructuredData={BREADCRUMB_SCHEMA}
      />

      {/* ── HÉROS ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-lagoon text-white min-h-[360px] md:min-h-[440px] flex items-center">
        {/* Photo de fond dynamique */}
        {heroBg && (
          <div
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: heroBg ? 0.25 : 0 }}
            aria-hidden
          >
            <img
              src={heroBg}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Overlay gradient-lagoon */}
        <div className="absolute inset-0 bg-gradient-lagoon opacity-85" aria-hidden />

        {/* Orbes décoratifs (identiques à SeoPageHero) */}
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" style={{ animationDelay: "2s" }} aria-hidden />

        <div className="relative mx-auto max-w-4xl px-4 py-14 md:py-20 w-full">
          {/* Eyebrow */}
          <div
            className={cn("flex items-center gap-3", !prefersReducedMotion && "animate-fade-up")}
            style={fadeUp(0)}
          >
            <span className="h-px w-8 bg-gradient-to-r from-amber-200/80 to-transparent" aria-hidden />
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-100/90">
              Hébergement à Nosy Be
            </p>
          </div>

          {/* H1 */}
          <h1
            className={cn(
              "mt-4 text-3xl font-bold tracking-tight md:text-5xl md:leading-[1.1] lg:text-[3.25rem]",
              !prefersReducedMotion && "animate-fade-up"
            )}
            style={fadeUp(100)}
          >
            Trouvez votre hébergement idéal à Nosy Be
          </h1>

          {/* Intro */}
          <p
            className={cn(
              "mt-5 max-w-2xl text-base md:text-lg leading-relaxed text-white/80",
              !prefersReducedMotion && "animate-fade-up"
            )}
            style={fadeUp(200)}
          >
            Hébergements vérifiés sur place par notre équipe locale à Nosy Be.
            Prix clairs, réservation en 2 minutes.
          </p>

          {/* Trust strip glassmorphism */}
          <div
            className={cn(
              "mt-8 flex flex-wrap gap-2",
              !prefersReducedMotion && "animate-fade-up"
            )}
            style={fadeUp(300)}
            aria-label="Garanties Rentanoo"
          >
            {TRUST_ITEMS.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm"
              >
                {item.icon}
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* Ligne séparatrice basse */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" aria-hidden />
      </section>

      {/* ── VAGUE SÉPARATRICE ──────────────────────────────────────────────── */}
      <WaveDivider className="-mt-1" />

      {/* ── TRUST STRIP SCROLL REVEAL ──────────────────────────────────────── */}
      <div ref={trustRef} className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {TRUST_ITEMS.map((item, i) => (
              <li
                key={i}
                className={cn(
                  "flex items-center gap-2 text-sm text-foreground transition-all duration-500",
                  trustVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3",
                  prefersReducedMotion && "opacity-100 translate-y-0"
                )}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span className="text-primary">{item.icon}</span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── GRILLE DE LISTINGS ─────────────────────────────────────────────── */}
      {listings.length > 0 && (
        <section className="container mx-auto px-4 py-10 max-w-5xl">
          {/* Compteur dynamique (vraies données Supabase) */}
          <p className="text-sm text-muted-foreground mb-3">
            <span className="font-semibold text-primary">{listings.length} hébergement{listings.length > 1 ? "s" : ""}</span>
            {" "}disponible{listings.length > 1 ? "s" : ""} cette semaine à Nosy Be
          </p>

          <h2 className="text-xl font-bold mb-5 tracking-tight">Annonces disponibles</h2>

          <div
            ref={gridRef}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-4"
          >
            {listings.map((v, i) => (
              <div
                key={v.id}
                className={cn(
                  "transition-all duration-500",
                  gridVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4",
                  prefersReducedMotion && "opacity-100 translate-y-0"
                )}
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <ListingCard v={v} />
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Button asChild variant="outline">
              <Link to="/?cat=accommodation">
                Voir tous les hébergements <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* ── VAGUE SÉPARATRICE ──────────────────────────────────────────────── */}
      <WaveDivider />

      {/* ── SECTION CONTENU (HISTOIRE FONDATEUR) ──────────────────────────── */}
      <SeoContentSection>
        <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:tracking-tight">
          <h2>Pourquoi Rentanoo ?</h2>
          <p>
            Je m'appelle Christopher, développeur installé à Nosy Be depuis décembre 2025.
            Avant même d'arriver, j'ai galéré pendant des semaines pour trouver un logement
            fiable : messages sans réponse, prix qui changeaient une fois sur place parce que
            j'étais étranger, aucune facture, tout en espèces. J'ai créé Rentanoo pour que
            ça n'arrive plus à personne : des prix clairs, affichés à l'avance, et des
            hébergements vérifiés avant de vous les proposer.
          </p>
        </div>

        {/* Liens internes */}
        <div className="flex flex-wrap gap-3 mt-4">
          {RELATED_LINKS.map((l) => (
            <Button key={l.href} asChild variant="outline" size="sm">
              <Link to={l.href}>{l.label}</Link>
            </Button>
          ))}
        </div>

        <SeoFaqSection
          title="Questions fréquentes — Hébergement à Nosy Be"
          items={FAQ_ITEMS}
        />

        <SeoCtaPanel
          title="Réservez votre hébergement à Nosy Be"
          text="Logements vérifiés, prix clairs, réservation sécurisée en ligne."
        >
          <Button asChild className="bg-white text-primary font-semibold hover:bg-white/90 shadow-md">
            <Link to="/?cat=accommodation">Voir les hébergements disponibles</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/50 bg-transparent text-white hover:bg-white/10">
            <Link to="/">Accueil Rentanoo</Link>
          </Button>
        </SeoCtaPanel>
      </SeoContentSection>

      <Footer />

      {/* ── BARRE CTA STICKY MOBILE ─────────────────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 sm:hidden border-t border-border/50 bg-background/95 backdrop-blur-sm px-4 py-3 shadow-[0_-4px_24px_-4px_hsl(200_10%_20%/0.12)]"
        aria-label="Réserver un hébergement"
      >
        <Button asChild className="w-full bg-gradient-lagoon text-white font-semibold shadow-lagoon">
          <Link to="/?cat=accommodation">
            Voir les hébergements disponibles
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </SeoPageShell>
  );
}
