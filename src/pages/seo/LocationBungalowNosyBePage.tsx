import { SeoHebergementPageTemplate } from "@/components/seo/SeoHebergementPageTemplate";

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: "https://rentanoo.com/" },
    { "@type": "ListItem", position: 2, name: "Location vacances Nosy Be", item: "https://rentanoo.com/location-vacances-nosy-be" },
    { "@type": "ListItem", position: 3, name: "Bungalows Nosy Be", item: "https://rentanoo.com/location-bungalow-nosy-be" },
  ],
};

const FAQ_ITEMS = [
  {
    q: "Comment fonctionne le paiement pour un bungalow ?",
    a: "Vous réglez un acompte en ligne pour confirmer votre réservation, le solde se règle directement sur place à votre arrivée.",
  },
  {
    q: "Puis-je annuler ma réservation ?",
    a: "Oui. Vous êtes remboursé à 100% si vous annulez plus de 48h avant votre arrivée, à 50% entre 24h et 48h, sans remboursement en deçà de 24h. Les frais de service ne sont pas remboursables.",
  },
  {
    q: "Les bungalows sont-ils vérifiés avant d'être mis en ligne ?",
    a: "Oui, chaque bungalow est visité et vérifié sur place par notre équipe locale à Nosy Be avant d'être proposé sur la plateforme.",
  },
];

const RELATED_LINKS = [
  { label: "Appartements Nosy Be", href: "/location-appartement-nosy-be" },
  { label: "Villas Nosy Be", href: "/location-villa-nosy-be" },
  { label: "Villa bord de mer Nosy Be", href: "/location-villa-bord-de-mer-nosy-be" },
  { label: "Villa avec piscine Nosy Be", href: "/location-villa-piscine-nosy-be" },
  { label: "Tous les hébergements", href: "/location-hebergement-nosy-be" },
  { label: "Location vacances Nosy Be", href: "/location-vacances-nosy-be" },
  { label: "Location scooter Nosy Be", href: "/location-scooter-nosy-be" },
];

export default function LocationBungalowNosyBePage() {
  return (
    <SeoHebergementPageTemplate
      seoTitle="Location bungalow à Nosy Be – Authentique & proche mer | Rentanoo"
      seoDescription="Louez un bungalow à Nosy Be. Style traditionnel malgache, proche de la plage. Ambatoloaka, Madirokely. Réservation en ligne sur Rentanoo."
      canonical="https://rentanoo.com/location-bungalow-nosy-be"
      breadcrumbSchema={BREADCRUMB_SCHEMA}
      eyebrow="Location bungalow · Nosy Be, Madagascar"
      h1="Trouvez votre bungalow idéal à Nosy Be"
      subtitle="Bungalows vérifiés sur place par notre équipe locale à Nosy Be. Prix clairs, envoyez votre demande en 2 minutes."
      vehicleSubCategory="Bungalow"
      listingNoun="bungalow"
      ctaHref="/?cat=accommodation"
      ctaLabel="Voir les bungalows"
      faqTitle="Questions fréquentes — Location bungalow Nosy Be"
      faqItems={FAQ_ITEMS}
      relatedLinks={RELATED_LINKS}
      ctaPanelTitle="Réservez votre bungalow à Nosy Be"
      ctaPanelText="Authenticité tropicale à prix maîtrisé. Réservation sécurisée en ligne."
    />
  );
}
