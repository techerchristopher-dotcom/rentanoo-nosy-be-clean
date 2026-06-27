import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Shield, CreditCard, MapPin,
  ChevronLeft, ChevronRight, AlertCircle,
} from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Seo } from "@/components/seo/Seo";
import {
  SeoContentSection, SeoCtaPanel, SeoPageShell,
} from "@/components/seo/SeoPageLayout";
import {
  Carousel, CarouselContent, CarouselItem, type CarouselApi,
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
import { cn } from "@/lib/utils";

// ─── SEO data ─────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "Ai-je besoin d'un permis pour conduire un quad à Nosy Be ?",
    a: "Oui. Un quad est un véhicule à 4 roues assimilé à une voiture : le permis B (voiture) est requis. Vous n'avez pas besoin d'un permis moto (A). Si vous n'avez pas de permis, notre équipe peut orienter vers des balades accompagnées disponibles localement.",
  },
  {
    q: "Le casque est-il fourni avec la location de quad ?",
    a: "Oui, un casque homologué est inclus dans chaque location quad sur Rentanoo. La protection est obligatoire et fournie d'office.",
  },
  {
    q: "Peut-on payer en ligne pour réserver un quad à Nosy Be ?",
    a: "Oui, Rentanoo propose une réservation en ligne avec acompte sécurisé (50% par Orange Money ou carte bancaire). Le solde est réglé sur place au moment de la remise des clés.",
  },
  {
    q: "Quelles zones peut-on explorer en quad à Nosy Be ?",
    a: "Les quads sont idéaux pour les pistes du nord (Andilana, Ambonara), les plages isolées et les villages de l'intérieur. Certaines zones côtières sont accessibles uniquement en quad ou 4×4 — l'équipe Rentanoo vous conseille les itinéraires selon votre niveau.",
  },
];

const RELATED_LINKS = [
  { label: "Location scooter Nosy Be", href: "/location-scooter-nosy-be" },
  { label: "Location moto Nosy Be", href: "/location-moto-nosy-be" },
  { label: "Location voiture Nosy Be", href: "/location-voiture-nosy-be" },
  { label: "Hébergements Nosy Be", href: "/location-vacances-nosy-be" },
  { label: "Villas Nosy Be", href: "/location-villa-nosy-be" },
];

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: "https://rentanoo.com/" },
    { "@type": "ListItem", position: 2, name: "Location quad Nosy Be", item: "https://rentanoo.com/location-quad-nosy-be" },
  ],
};

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

// ─── Trust strip ──────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  { icon: <Shield className="h-3.5 w-3.5" aria-hidden />, label: "Casque inclus" },
  { icon: <Shield className="h-3.5 w-3.5" aria-hidden />, label: "Assurance incluse" },
  { icon: <MapPin className="h-3.5 w-3.5" aria-hidden />, label: "Livraison aéroport Fascène" },
  { icon: <AlertCircle className="h-3.5 w-3.5" aria-hidden />, label: "Permis voiture (B) requis" },
  { icon: <CreditCard className="h-3.5 w-3.5" aria-hidden />, label: "Acompte sécurisé" },
];

// ─── Utilitaire scroll-reveal ─────────────────────────────────────────────────

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

// ─── Équipements quad ─────────────────────────────────────────────────────────

function QuadAmenitiesList({ v }: { v: SupabaseVehicle }) {
  const items: { icon: React.ReactNode; label: string }[] = [];
  const areaName = (v as unknown as { location_areas?: { name?: string } }).location_areas?.name;
  if (areaName) items.push({ icon: <MapPin className="h-3 w-3 shrink-0" aria-hidden />, label: areaName });
  if (v.engine_capacity) items.push({ icon: <span className="text-[10px] shrink-0 font-bold" aria-hidden>cc</span>, label: `${v.engine_capacity} cc` });
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

// ─── Carte quad ───────────────────────────────────────────────────────────────

function QuadCard({ v, photos, animDelay, isNew }: { v: SupabaseVehicle; photos: string[]; animDelay: number; isNew?: boolean }) {
  const path = getPublicListingPath(v);
  const price = v.price_per_day;
  const label = `${v.brand} ${v.model}`.trim();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [failedUrls, setFailedUrls] = useState<Set<string>>(new Set());

  const validPhotos = photos.filter((url) => !failedUrls.has(url));
  const hasMultiple = validPhotos.length > 1;

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
      <div className="relative h-44 bg-muted overflow-hidden">
        {validPhotos.length > 0 ? (
          <>
            <Carousel setApi={setApi} opts={{ loop: false, dragFree: false }} className="h-full w-full">
              <CarouselContent className="-ml-0 h-44">
                {validPhotos.map((url, i) => (
                  <CarouselItem key={url} className="pl-0">
                    <img
                      src={url}
                      alt={i === 0 ? label : `${label} — photo ${i + 1}`}
                      className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                      loading={i === 0 ? "eager" : "lazy"}
                      onError={() => setFailedUrls((prev) => new Set([...prev, url]))}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            <div className="absolute top-2 left-2 z-10 pointer-events-none flex gap-1 flex-wrap">
              <span className="inline-flex items-center rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                300 cc
              </span>
              {isNew && (
                <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                  Quad neuf
                </span>
              )}
            </div>

            {hasMultiple && (
              <>
                <button
                  type="button"
                  aria-label="Photo précédente"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); api?.scrollPrev(); }}
                  className={cn(
                    "absolute left-1.5 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity duration-200",
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
                    "absolute right-1.5 top-1/2 -translate-y-1/2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-opacity duration-200",
                    "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                    current === validPhotos.length - 1 && "pointer-events-none opacity-0 group-hover:opacity-30"
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 pointer-events-none">
                  {validPhotos.map((_, i) => (
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

      <div className="p-3 flex-1 flex flex-col gap-2">
        <p className="font-semibold text-sm text-foreground line-clamp-1">{label}</p>
        {price ? (
          <ClientMgaPrice
            amountMga={price}
            primaryClassName="text-base font-bold tabular-nums leading-none text-primary"
            secondaryClassName="text-xs tabular-nums text-muted-foreground"
            secondarySuffix=" / jour"
          />
        ) : null}
        <QuadAmenitiesList v={v} />
        <span className="mt-auto inline-flex items-center gap-1 text-xs text-primary font-medium pt-1">
          Voir la fiche <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function LocationQuadNosyBePage() {
  const [listings, setListings] = useState<SupabaseVehicle[]>([]);
  const [photosByVehicle, setPhotosByVehicle] = useState<Record<string, string[]>>({});
  const [heroBg, setHeroBg] = useState<string | null>(null);
  const [cancellationOpen, setCancellationOpen] = useState(false);
  const fetchedRef = useRef(false);

  const trustRef = useRef<HTMLDivElement>(null);
  const trustVisible = useScrollReveal(trustRef as React.RefObject<Element>);

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    SupabaseVehiclesService.getAvailableVehicles({ vehicleType: "quad", limit: 40 })
      .then(async (quads) => {
        if (quads.length === 0) return;

        const sorted = [...quads].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
        setListings(sorted);

        const firstPhoto = (sorted[0] as unknown as { primaryPhotoUrl?: string })?.primaryPhotoUrl;
        if (firstPhoto) setHeroBg(firstPhoto);

        const ids = sorted.map((v) => v.id);

        const { data: rows } = await supabase
          .from("vehicle_photos")
          .select("vehicle_id, photo_url, is_primary, display_order, created_at")
          .in("vehicle_id", ids)
          .not("photo_url", "ilike", "%.heic%")
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: false });

        if (!rows) return;

        const grouped: Record<string, string[]> = {};
        for (const row of rows) {
          const vid = row.vehicle_id as string;
          if (!grouped[vid]) grouped[vid] = [];
          if (row.photo_url) {
            if (row.is_primary) grouped[vid].unshift(row.photo_url);
            else grouped[vid].push(row.photo_url);
          }
        }
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
        title="Location quad à Nosy Be — KYMCO 300cc | Rentanoo"
        description="Louez un quad à Nosy Be. Casque inclus, assurance incluse, livraison aéroport Fascène. Quads KYMCO 300cc vérifiés par notre équipe locale. Réservation en ligne sur Rentanoo."
        canonical="https://rentanoo.com/location-quad-nosy-be"
        structuredData={FAQ_SCHEMA}
        extraStructuredData={BREADCRUMB_SCHEMA}
      />

      {/* ── HÉROS ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-lagoon text-white min-h-[360px] md:min-h-[440px] flex items-center">
        {heroBg && (
          <div className="absolute inset-0" aria-hidden>
            <img src={heroBg} alt="" className="w-full h-full object-cover opacity-25" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-lagoon opacity-85" aria-hidden />
        <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" aria-hidden />

        <div className="relative mx-auto max-w-4xl px-4 py-14 md:py-20 w-full">
          <div className={cn("flex items-center gap-3", !prefersReducedMotion && "animate-fade-up")} style={fadeUp(0)}>
            <span className="h-px w-8 bg-gradient-to-r from-amber-200/80 to-transparent" aria-hidden />
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-100/90">Location quad · Nosy Be, Madagascar</p>
          </div>

          <h1
            className={cn("mt-4 text-3xl font-bold tracking-tight md:text-5xl md:leading-[1.1] lg:text-[3.25rem]", !prefersReducedMotion && "animate-fade-up")}
            style={fadeUp(100)}
          >
            Location quad à Nosy Be
          </h1>

          <p
            className={cn("mt-5 max-w-2xl text-base md:text-lg leading-relaxed text-white/80", !prefersReducedMotion && "animate-fade-up")}
            style={fadeUp(200)}
          >
            Quads vérifiés sur place par notre équipe locale à Nosy Be. Casque inclus, envoyez votre demande en 2 minutes.
          </p>

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

      {/* ── TRUST STRIP ──────────────────────────────────────────────────── */}
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

      {/* ── GRILLE LISTINGS ──────────────────────────────────────────────── */}
      {listings.length > 0 && (
        <section className="container mx-auto px-4 py-10 max-w-5xl">
          <p className="text-sm text-muted-foreground mb-3">
            <span className="font-semibold text-primary">
              {listings.length} quad{listings.length > 1 ? "s" : ""}
            </span>
            {" "}disponible{listings.length > 1 ? "s" : ""} cette semaine à Nosy Be
          </p>
          <h2 className="text-xl font-bold mb-5 tracking-tight">Quads disponibles à Nosy Be</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {listings.map((v, i) => {
              const primaryUrl = (v as unknown as { primaryPhotoUrl?: string }).primaryPhotoUrl;
              const photos = photosByVehicle[v.id] ?? (primaryUrl ? [primaryUrl] : []);
              const isNew = (v.year ?? 0) >= 2025;
              return <QuadCard key={v.id} v={v} photos={photos} animDelay={i * 60} isNew={isNew} />;
            })}
          </div>
          <div className="mt-6 text-center">
            <Button asChild variant="outline">
              <Link to="/?cat=quad">Voir tous les quads <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      )}

      <WaveDivider />

      {/* ── CONTENU SEO ──────────────────────────────────────────────────── */}
      <SeoContentSection>
        {/* Section fondateur */}
        <div className="flex flex-col items-center gap-5 md:flex-row md:items-start md:gap-10">
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
          <div className="text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary/60 mb-1">Notre équipe locale</p>
            <h2 className="text-xl font-bold tracking-tight mb-3">
              Des quads vérifiés par notre équipe sur place à Nosy Be
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
              Je m'appelle Christopher, développeur installé à Nosy Be depuis décembre 2025.
              Avant même d'arriver, j'ai vu le même problème côté véhicules qu'avec les
              hébergements : des engins mal entretenus, des prix qui grimpent dès qu'on sent
              un étranger, et des loueurs locaux sans aucune visibilité en ligne.
              J'ai créé Rentanoo pour que ça change aussi sur ce point : des quads vérifiés
              par notre équipe avant chaque location, des prix affichés clairement, et plus
              jamais de mauvaise surprise sur l'état du véhicule.
            </p>
          </div>
        </div>

        {/* Réassurance permis */}
        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="font-semibold text-sm text-foreground mb-1">Permis voiture (B) requis — pas de permis moto</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Un quad est assimilé à un véhicule à 4 roues : c'est le permis B (voiture) qui
              est requis, et non le permis moto (A). Si vous n'avez pas de permis, notre
              équipe peut vous orienter vers des alternatives disponibles localement.
            </p>
          </div>
        </div>

        {/* Texte SEO */}
        <div className="mt-6 prose prose-neutral dark:prose-invert max-w-none prose-headings:tracking-tight text-sm md:text-base">
          <h2>Tout savoir sur la location de quad à Nosy Be</h2>
          <p>
            Rentanoo propose des quads KYMCO 300cc — des modèles robustes parfaitement
            adaptés aux pistes de Nosy Be. Les quads permettent d'accéder à des zones
            inaccessibles en scooter ou en voiture ordinaire : plages isolées du nord
            (Andilana, Ambonara), sentiers dans les collines, villages de l'intérieur de
            l'île. La livraison est possible directement à l'aéroport international Fascène
            ou dans les principaux hôtels d'Ambatoloaka, Madirokely et Andilana.
          </p>
          <p>
            Chaque quad est fourni avec casque homologué et assurance de base incluse.
            Contrairement au scooter, le quad nécessite un permis voiture (catégorie B) —
            pas de permis moto. La réservation s'effectue entièrement en ligne avec acompte
            sécurisé et solde sur place au moment de la remise des clés.
          </p>
        </div>

        {/* Comment ça marche */}
        <HowItWorksTimeline />

        {/* FAQ */}
        <h2 className="mt-10 text-xl font-bold tracking-tight">Questions fréquentes — Location quad Nosy Be</h2>
        <Accordion type="single" collapsible className="mt-4 space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium text-left hover:no-underline py-4">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                {item.a}
                {i === 2 && (
                  <button
                    type="button"
                    onClick={() => setCancellationOpen(true)}
                    className="block mt-2 text-xs text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    Voir les conditions complètes d'annulation →
                  </button>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Modal annulation */}
        <Dialog open={cancellationOpen} onOpenChange={setCancellationOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Politique d'annulation Rentanoo</DialogTitle>
            </DialogHeader>
            <div className="mt-2 space-y-5 text-sm text-muted-foreground leading-relaxed">
              <p>
                Chez Rentanoo, nous savons que les plans de voyage peuvent changer. Cette politique
                s'applique à toutes les réservations effectuées sur rentanoo.com.
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
                      <td className="py-2 font-medium text-green-600 dark:text-green-400">100% (hors frais de service)</td>
                    </tr>
                    <tr className="border-b border-border/30">
                      <td className="py-2 pr-4">Entre 24h et 48h avant</td>
                      <td className="py-2 font-medium text-amber-600 dark:text-amber-400">50%</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4">Moins de 24h / no-show</td>
                      <td className="py-2 font-medium text-destructive">Aucun remboursement</td>
                    </tr>
                  </tbody>
                </table>
              </section>
              <section>
                <h3 className="font-semibold text-foreground mb-1">2. Annulation par Rentanoo</h3>
                <p>Remboursement intégral + solution de remplacement si possible.</p>
              </section>
              <section>
                <h3 className="font-semibold text-foreground mb-1">3. Comment annuler</h3>
                <p>Depuis votre espace réservation sur rentanoo.com. Remboursement sous 5–7 jours ouvrés.</p>
              </section>
            </div>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100" />
          </DialogContent>
        </Dialog>

        {/* CTA panel */}
        <SeoCtaPanel
          title="Prêt à explorer Nosy Be en quad ?"
          text="Réservez votre quad en quelques minutes. Disponibilité en temps réel, confirmation immédiate."
        >
          <Button asChild className="bg-white text-primary font-semibold hover:bg-white/90 shadow-md">
            <Link to="/?cat=quad">Voir les quads disponibles</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/50 bg-transparent text-white hover:bg-white/10">
            <Link to="/">Accueil Rentanoo</Link>
          </Button>
        </SeoCtaPanel>

        {/* Liens SEO discrets — bas de page */}
        <nav aria-label="Pages connexes Rentanoo" className="mt-10 border-t border-border/40 pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Découvrir aussi à Nosy Be
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {RELATED_LINKS.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
      </SeoContentSection>

      <Footer />

      {/* ── STICKY MOBILE CTA ────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex sm:hidden border-t bg-card/95 backdrop-blur-sm px-4 py-3 gap-3 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <Button asChild className="flex-1 bg-gradient-lagoon text-white font-semibold">
          <Link to="/?cat=quad">Voir les quads</Link>
        </Button>
      </div>
    </SeoPageShell>
  );
}
