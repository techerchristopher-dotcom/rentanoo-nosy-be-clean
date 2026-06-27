import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Shield, CreditCard, MapPin, ChevronLeft, ChevronRight,
  Waves, Users, Wifi, UtensilsCrossed,
} from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/seo/Seo";
import {
  SeoContentSection,
  SeoCtaPanel,
  SeoFaqSection,
  SeoPageShell,
} from "@/components/seo/SeoPageLayout";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { WaveDivider } from "@/components/seo/WaveDivider";
import { HowItWorksTimeline } from "@/components/seo/HowItWorksTimeline";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { ClientMgaPrice } from "@/components/currency/ClientMgaPrice";
import { SupabaseVehiclesService, Vehicle as SupabaseVehicle } from "@/services/supabaseVehiclesService";
import { supabase } from "@/integrations/supabase/client";
import { getPublicListingPath } from "@/utils/vehicleType";
import { getCapacityBadge } from "@/utils/getCapacityBadge";
import { cn } from "@/lib/utils";

// IDs courts (8 premiers chars UUID) des logements toujours affichés
const PINNED_SHORT_IDS = ["285a520f", "da287e92"] as const;

// ─── Données statiques ───────────────────────────────────────────────────────

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
  { icon: <MapPin className="h-3.5 w-3.5" aria-hidden />, label: "Vérifiés sur place par notre équipe" },
  { icon: <Shield className="h-3.5 w-3.5" aria-hidden />, label: "Prix clairs, aucune surprise" },
  { icon: <CreditCard className="h-3.5 w-3.5" aria-hidden />, label: "Acompte sécurisé, solde sur place" },
];

const RELATED_LINKS = [
  { label: "Appartements Nosy Be", href: "/location-appartement-nosy-be" },
  { label: "Villas Nosy Be", href: "/location-villa-nosy-be" },
  { label: "Villa bord de mer Nosy Be", href: "/location-villa-bord-de-mer-nosy-be" },
  { label: "Villa avec piscine Nosy Be", href: "/location-villa-piscine-nosy-be" },
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

// ─── Hook scroll-reveal (réutilisé uniquement sur les éléments toujours présents dans le DOM) ──

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

// ─── Équipements clés (données réelles uniquement, max 4) ────────────────────

function AmenitiesList({ v }: { v: SupabaseVehicle }) {
  const items: { icon: React.ReactNode; label: string }[] = [];

  // Ordre de priorité strict (prompt Phase 4)
  if (v.near_beach) {
    items.push({ icon: <Waves className="h-3 w-3 shrink-0" aria-hidden />, label: "Proche de la plage" });
  }
  if (v.has_pool) {
    items.push({ icon: <span className="text-[10px] shrink-0" aria-hidden>🏊</span>, label: "Piscine" });
  }
  if (v.seats && v.seats > 0) {
    items.push({ icon: <Users className="h-3 w-3 shrink-0" aria-hidden />, label: `Jusqu'à ${v.seats} pers.` });
  }
  const areaName = (v as unknown as { location_areas?: { name?: string } }).location_areas?.name;
  if (items.length < 4 && areaName) {
    items.push({ icon: <MapPin className="h-3 w-3 shrink-0" aria-hidden />, label: areaName });
  }
  if (items.length < 4 && v.has_wifi) {
    items.push({ icon: <Wifi className="h-3 w-3 shrink-0" aria-hidden />, label: "Wifi" });
  }
  if (items.length < 4 && !v.has_wifi) {
    if (v.near_nightlife) {
      items.push({ icon: <span className="text-[10px] shrink-0" aria-hidden>🎵</span>, label: "Vie nocturne proche" });
    } else if (v.near_shopping_center) {
      items.push({ icon: <UtensilsCrossed className="h-3 w-3 shrink-0" aria-hidden />, label: "Commerces proches" });
    }
  }

  if (items.length === 0) return null;

  return (
    <ul className="flex flex-col gap-0.5 mt-0.5">
      {items.slice(0, 4).map((item, i) => (
        <li key={i} className="flex items-center gap-1 text-[11px] text-muted-foreground leading-snug">
          <span className="text-primary/70">{item.icon}</span>
          {item.label}
        </li>
      ))}
    </ul>
  );
}

// ─── Carte listing avec mini-carrousel ───────────────────────────────────────

interface ListingCardProps {
  v: SupabaseVehicle;
  photos: string[];  // URLs de toutes les photos disponibles
  animDelay: number;
}

function ListingCard({ v, photos, animDelay }: ListingCardProps) {
  const path = getPublicListingPath(v);
  const price = v.price_per_day;
  const label = `${v.brand} ${v.model}`.trim();
  const hasMultiple = photos.length > 1;
  const capacityBadge = getCapacityBadge(v.seats);

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => { api.off("select", onSelect); };
  }, [api]);

  return (
    <Link
      to={path}
      className="group flex flex-col rounded-xl border bg-card overflow-hidden shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lagoon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary animate-fade-up"
      style={{ animationDelay: `${animDelay}ms`, animationFillMode: "both" }}
    >
      {/* Zone photo avec mini-carrousel */}
      <div className="relative h-44 bg-muted overflow-hidden">
        {photos.length > 0 ? (
          <>
            <Carousel
              setApi={setApi}
              opts={{ loop: false, dragFree: false }}
              className="h-full w-full"
            >
              <CarouselContent className="-ml-0 h-44">
                {photos.map((url, i) => (
                  <CarouselItem key={i} className="pl-0">
                    <img
                      src={url}
                      alt={i === 0 ? label : `${label} — photo ${i + 1}`}
                      className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                      loading={i === 0 ? "eager" : "lazy"}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            {/* Badge capacité — top-left, coexiste avec les flèches */}
            {capacityBadge && (
              <div className="absolute top-2 left-2 z-10 pointer-events-none">
                <span className="inline-flex items-center rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                  {capacityBadge}
                </span>
              </div>
            )}

            {/* Flèches custom — overlay discret, visibles au hover desktop & toujours sur mobile */}
            {hasMultiple && (
              <>
                <button
                  type="button"
                  aria-label="Photo précédente"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); api?.scrollPrev(); }}
                  className={cn(
                    "absolute left-1.5 top-1/2 -translate-y-1/2 z-10",
                    "flex h-7 w-7 items-center justify-center rounded-full",
                    "bg-black/40 text-white backdrop-blur-sm transition-opacity duration-200",
                    "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                    current === 0 && "pointer-events-none opacity-0 group-hover:opacity-30"
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Photo suivante"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); api?.scrollNext(); }}
                  className={cn(
                    "absolute right-1.5 top-1/2 -translate-y-1/2 z-10",
                    "flex h-7 w-7 items-center justify-center rounded-full",
                    "bg-black/40 text-white backdrop-blur-sm transition-opacity duration-200",
                    "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                    current === photos.length - 1 && "pointer-events-none opacity-0 group-hover:opacity-30"
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                {/* Indicateurs dots */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 pointer-events-none">
                  {photos.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "inline-block h-1 rounded-full transition-all duration-300",
                        i === current ? "w-4 bg-white" : "w-1 bg-white/50"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
            Photo à venir
          </div>
        )}
      </div>

      {/* Infos de la carte */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        {/* Titre */}
        <p className="font-semibold text-sm text-foreground line-clamp-1">{label}</p>

        {/* Prix EUR + Ar (ClientMgaPrice — composant existant) */}
        {price ? (
          <ClientMgaPrice
            amountMga={price}
            primaryClassName="text-base font-bold tabular-nums leading-none text-primary"
            secondaryClassName="text-xs tabular-nums text-muted-foreground"
            secondarySuffix=" / nuit"
          />
        ) : null}

        {/* Équipements clés (max 4, données réelles uniquement) */}
        <AmenitiesList v={v} />

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
  // Map vehicleId → tableau de photo URLs triées
  const [photosByVehicle, setPhotosByVehicle] = useState<Record<string, string[]>>({});
  const [heroBg, setHeroBg] = useState<string | null>(null);
  const [cancellationOpen, setCancellationOpen] = useState(false);

  // Trust strip : toujours dans le DOM → scroll-reveal safe
  const trustRef = useRef<HTMLDivElement>(null);
  const trustVisible = useScrollReveal(trustRef as React.RefObject<Element>);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    // Filtre server-side : uniquement les hébergements, limit 20 (on n'en affiche que 6)
    SupabaseVehiclesService.getAvailableVehicles({ vehicleType: "accommodation", limit: 20 }).then(async (all) => {
      const accommodations = all; // déjà filtrés par le service

      // ── Sélection des 6 logements ────────────────────────────────────────
      // 1. Logements imposés (toujours affichés en premier)
      const pinned = PINNED_SHORT_IDS
        .map((shortId) => accommodations.find((v) => v.id.toLowerCase().startsWith(shortId)))
        .filter((v): v is SupabaseVehicle => !!v);
      const pinnedIds = new Set(pinned.map((v) => v.id));
      const pool = accommodations.filter((v) => !pinnedIds.has(v.id));

      // 2. 2-3 logements capacité ~4 personnes (3-5 places)
      const near4 = pool.filter((v) => v.seats != null && v.seats >= 3 && v.seats <= 5).slice(0, 3);
      const near4Ids = new Set(near4.map((v) => v.id));

      // 3. 1 logement grande capacité (8+ places)
      const large = pool
        .filter((v) => !near4Ids.has(v.id) && v.seats != null && (v.seats as number) >= 8)
        .slice(0, 1);
      const largeIds = new Set(large.map((v) => v.id));

      // 4. Remplissage si manque encore des slots
      const usedIds = new Set([...pinnedIds, ...near4Ids, ...largeIds]);
      const needed = 6 - pinned.length - near4.length - large.length;
      const fill = pool.filter((v) => !usedIds.has(v.id)).slice(0, Math.max(0, needed));

      const sliced = [...pinned, ...near4, ...large, ...fill].slice(0, 6);
      setListings(sliced);

      // Hero bg : première photo disponible
      const firstPhoto = (sliced[0] as unknown as { primaryPhotoUrl?: string })?.primaryPhotoUrl;
      if (firstPhoto) setHeroBg(firstPhoto);

      // Batch fetch toutes les photos pour le carrousel
      if (sliced.length === 0) return;
      const ids = sliced.map((v) => v.id);
      const { data: rows } = await supabase
        .from("vehicle_photos")
        .select("vehicle_id, photo_url, is_primary, display_order")
        .in("vehicle_id", ids)
        .not("photo_url", "ilike", "%.heic%")
        .order("display_order", { ascending: true });

      if (!rows) return;

      const grouped: Record<string, string[]> = {};
      for (const row of rows) {
        const vid = row.vehicle_id as string;
        if (!grouped[vid]) grouped[vid] = [];
        if (row.photo_url) {
          // Mettre la photo principale en premier
          if (row.is_primary) {
            grouped[vid].unshift(row.photo_url);
          } else {
            grouped[vid].push(row.photo_url);
          }
        }
      }
      // Limiter à 5 photos par carte
      for (const vid of Object.keys(grouped)) {
        grouped[vid] = grouped[vid].slice(0, 5);
      }
      setPhotosByVehicle(grouped);
    });
  }, []);

  const fadeUp = (delay: number) =>
    prefersReducedMotion ? {} : { animationDelay: `${delay}ms`, animationFillMode: "both" as const };

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
          <div className="absolute inset-0" aria-hidden>
            <img src={heroBg} alt="" className="w-full h-full object-cover opacity-25" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-lagoon opacity-85" aria-hidden />
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" aria-hidden />

        <div className="relative mx-auto max-w-4xl px-4 py-14 md:py-20 w-full">
          <div
            className={cn("flex items-center gap-3", !prefersReducedMotion && "animate-fade-up")}
            style={fadeUp(0)}
          >
            <span className="h-px w-8 bg-gradient-to-r from-amber-200/80 to-transparent" aria-hidden />
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-100/90">
              Hébergement à Nosy Be
            </p>
          </div>

          <h1
            className={cn("mt-4 text-3xl font-bold tracking-tight md:text-5xl md:leading-[1.1] lg:text-[3.25rem]", !prefersReducedMotion && "animate-fade-up")}
            style={fadeUp(100)}
          >
            Trouvez votre hébergement idéal à Nosy Be
          </h1>

          <p
            className={cn("mt-5 max-w-2xl text-base md:text-lg leading-relaxed text-white/80", !prefersReducedMotion && "animate-fade-up")}
            style={fadeUp(200)}
          >
            Hébergements vérifiés sur place par notre équipe locale à Nosy Be.
            Prix clairs, envoyez votre demande en 2 minutes.
          </p>

          {/* Trust chips glassmorphism */}
          <div
            className={cn("mt-8 flex flex-wrap gap-2", !prefersReducedMotion && "animate-fade-up")}
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

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" aria-hidden />
      </section>

      <WaveDivider className="-mt-1" />

      {/* ── TRUST STRIP (toujours dans le DOM → scroll-reveal safe) ─────────── */}
      <div ref={trustRef} className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {TRUST_ITEMS.map((item, i) => (
              <li
                key={i}
                className={cn(
                  "flex items-center gap-2 text-sm text-foreground transition-all duration-500",
                  trustVisible || prefersReducedMotion ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
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
          {/* Compteur réel — aucun chiffre inventé */}
          <p className="text-sm text-muted-foreground mb-3">
            <span className="font-semibold text-primary">
              {listings.length} hébergement{listings.length > 1 ? "s" : ""}
            </span>
            {" "}disponible{listings.length > 1 ? "s" : ""} cette semaine à Nosy Be
          </p>

          <h2 className="text-xl font-bold mb-5 tracking-tight">Annonces disponibles</h2>

          {/*
            FIX BUG OPACITÉ : les cartes utilisent animate-fade-up avec delay CSS.
            Pas d'IntersectionObserver ici — le hook ne peut pas s'attacher avant
            que listings soit chargé (rendu conditionnel), ce qui bloquait opacity à 0.
          */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {listings.map((v, i) => {
              // Fallback : si pas de photos batch, utiliser primaryPhotoUrl
              const primaryUrl = (v as unknown as { primaryPhotoUrl?: string }).primaryPhotoUrl;
              const photos = photosByVehicle[v.id] ?? (primaryUrl ? [primaryUrl] : []);
              return (
                <ListingCard
                  key={v.id}
                  v={v}
                  photos={photos}
                  animDelay={i * 60}
                />
              );
            })}
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

      <WaveDivider />

      {/* ── SECTION FONDATEUR ──────────────────────────────────────────────── */}
      <SeoContentSection>
        {/* ── SECTION FONDATEUR — mobile-first ──────────────────────────────── */}

        {/* Mobile : empilé verticalement / Desktop : 2 colonnes (photo | texte) */}
        <div className="flex flex-col items-center gap-5 md:flex-row md:items-start md:gap-10">
          {/* Photo ronde — centrée sur mobile, alignée en haut à gauche sur desktop */}
          <div className="shrink-0 flex justify-center md:justify-start md:w-48">
            <img
              src="https://tbsgzykqcksmqxpimwry.supabase.co/storage/v1/object/public/photo%20fondateur/photo%20techer%20christopher%20.png"
              alt="Christopher, fondateur de Rentanoo"
              width={160}
              height={160}
              className="h-24 w-24 md:h-44 md:w-44 rounded-full object-cover shadow-card ring-2 ring-primary/20"
              loading="lazy"
            />
          </div>

          {/* Texte — titre + histoire */}
          <div className="text-center md:text-left">
            <h2 className="premium-section-title text-xl font-bold tracking-tight md:text-2xl mb-3">
              Pourquoi Rentanoo ?
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
              Je m'appelle Christopher, développeur installé à Nosy Be depuis décembre 2025.
              Avant même d'arriver, j'ai galéré pendant des semaines pour trouver un logement
              fiable : messages sans réponse, prix qui changeaient une fois sur place parce que
              j'étais étranger, aucune facture, tout en espèces. J'ai créé Rentanoo pour que
              ça n'arrive plus à personne : des prix clairs, affichés à l'avance, et des
              hébergements vérifiés avant de vous les proposer.
            </p>
          </div>
        </div>

        {/* Chips liens internes — pleine largeur sous les 2 colonnes */}
        <div className="flex flex-wrap gap-3 mt-6">
          {RELATED_LINKS.map((l) => (
            <Button key={l.href} asChild variant="outline" size="sm">
              <Link to={l.href}>{l.label}</Link>
            </Button>
          ))}
        </div>

        <HowItWorksTimeline />

        {/* FAQ inline — permet du JSX dans les réponses (lien modal annulation) */}
        <div className="mt-14">
          <h2 className="premium-section-title text-xl font-bold tracking-tight md:text-2xl">
            Questions fréquentes — Hébergement à Nosy Be
          </h2>
          <Accordion
            type="single"
            collapsible
            className="mt-6 overflow-hidden rounded-2xl border border-border/50 bg-card/40 shadow-sm ring-1 ring-black/[0.03] dark:ring-white/[0.04]"
          >
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border-border/40 px-4">
                <AccordionTrigger className="py-4 text-left font-medium hover:no-underline hover:text-primary">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pb-4 leading-relaxed text-muted-foreground">
                  {item.a}
                  {/* Lien modal uniquement sur la question annulation */}
                  {item.q === "Puis-je annuler ma réservation ?" && (
                    <>
                      {" "}
                      <button
                        type="button"
                        onClick={() => setCancellationOpen(true)}
                        className="underline text-primary hover:text-primary/80 transition-colors text-sm"
                      >
                        Voir les conditions complètes
                      </button>
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Modal politique d'annulation */}
        <Dialog open={cancellationOpen} onOpenChange={setCancellationOpen}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader className="pr-8">
              <DialogTitle className="text-lg font-bold tracking-tight">
                Conditions d'annulation
              </DialogTitle>
            </DialogHeader>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" />
            <div className="mt-2 space-y-5 text-sm text-muted-foreground leading-relaxed">
              <p>
                Chez Rentanoo, nous savons que les plans de voyage peuvent changer. Cette politique
                s'applique à toutes les réservations effectuées sur rentanoo.com, qu'il s'agisse
                de véhicules, de logements, ou des deux.
              </p>

              <section>
                <h3 className="font-semibold text-foreground mb-2">1. Annulation par le client</h3>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="text-left py-2 pr-4 font-medium text-foreground">Délai avant arrivée</th>
                      <th className="text-left py-2 font-medium text-foreground">Remboursement</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/30">
                      <td className="py-2 pr-4">Plus de 48h avant</td>
                      <td className="py-2 font-medium text-green-600 dark:text-green-400">100% du montant payé (hors frais de service)</td>
                    </tr>
                    <tr className="border-b border-border/30">
                      <td className="py-2 pr-4">Entre 24h et 48h avant</td>
                      <td className="py-2 font-medium text-amber-600 dark:text-amber-400">50% du montant payé</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Moins de 24h / no-show</td>
                      <td className="py-2 font-medium text-destructive">Aucun remboursement</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-2 text-xs">
                  Les frais de service appliqués lors de la réservation ne sont pas remboursables,
                  quel que soit le délai d'annulation.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">2. Réservations groupées</h3>
                <p>
                  Vous pouvez annuler un ou plusieurs éléments au sein d'une même réservation sans
                  annuler l'ensemble du panier. Le remboursement est calculé élément par élément
                  (véhicule ou logement), selon la grille ci-dessus appliquée à son prix et ses
                  options associées. Le reste de la réservation demeure inchangé.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">3. Annulation par Rentanoo ou le prestataire</h3>
                <p>
                  Si une réservation confirmée doit être annulée de notre côté (véhicule ou
                  logement indisponible, panne non réparable, etc.), vous recevez un remboursement
                  intégral, sans pénalité. Lorsque cela est possible, nous vous proposons également
                  une solution de remplacement équivalente.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">4. Cas de force majeure</h3>
                <p>
                  Si la prestation ne peut pas avoir lieu pour des raisons indépendantes de votre
                  volonté — alerte météo officielle, route impraticable, panne mécanique ou
                  problème majeur constaté sur place — vous bénéficiez d'un remboursement
                  intégral, même si l'annulation intervient à moins de 24h. Les conditions météo
                  habituelles (pluie, vent) ne constituent pas en elles-mêmes un motif de
                  remboursement tant qu'elles ne rendent pas la prestation impossible.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-foreground mb-1">5. Comment annuler</h3>
                <p>
                  L'annulation se fait directement depuis votre espace réservation sur rentanoo.com,
                  ou en nous contactant si besoin. Le remboursement, lorsqu'il est dû, est traité
                  dans un délai de 5 à 7 jours ouvrés sur le moyen de paiement utilisé lors de la
                  réservation.
                </p>
              </section>
            </div>
          </DialogContent>
        </Dialog>

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
