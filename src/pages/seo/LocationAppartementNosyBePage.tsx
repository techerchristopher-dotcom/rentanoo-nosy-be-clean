import { SeoHebergementPageTemplate } from "@/components/seo/SeoHebergementPageTemplate";

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: "https://rentanoo.com/" },
    { "@type": "ListItem", position: 2, name: "Location vacances Nosy Be", item: "https://rentanoo.com/location-vacances-nosy-be" },
    { "@type": "ListItem", position: 3, name: "Appartements Nosy Be", item: "https://rentanoo.com/location-appartement-nosy-be" },
  ],
};

const FAQ_ITEMS = [
  {
    q: "Comment fonctionne le paiement pour un appartement ?",
    a: "Vous réglez un acompte en ligne pour confirmer votre réservation, le solde se règle directement sur place à votre arrivée.",
  },
  {
    q: "Puis-je annuler ma réservation ?",
    a: "Oui. Vous êtes remboursé à 100% si vous annulez plus de 48h avant votre arrivée, à 50% entre 24h et 48h, sans remboursement en deçà de 24h. Les frais de service ne sont pas remboursables.",
  },
  {
    q: "Les appartements sont-ils vérifiés avant d'être mis en ligne ?",
    a: "Oui, chaque appartement est visité et vérifié sur place par notre équipe locale à Nosy Be avant d'être proposé sur la plateforme.",
  },
];

const RELATED_LINKS = [
  { label: "Villas Nosy Be", href: "/location-villa-nosy-be" },
  { label: "Villa bord de mer Nosy Be", href: "/location-villa-bord-de-mer-nosy-be" },
  { label: "Villa avec piscine Nosy Be", href: "/location-villa-piscine-nosy-be" },
  { label: "Bungalows Nosy Be", href: "/location-bungalow-nosy-be" },
  { label: "Tous les hébergements", href: "/location-hebergement-nosy-be" },
  { label: "Location vacances Nosy Be", href: "/location-vacances-nosy-be" },
  { label: "Location scooter Nosy Be", href: "/location-scooter-nosy-be" },
];

export default function LocationAppartementNosyBePage() {
  return (
    <SeoHebergementPageTemplate
      seoTitle="Location appartement à Nosy Be – Ambatoloaka & Madirokely | Rentanoo"
      seoDescription="Louez un appartement à Nosy Be. Proches de la plage d'Ambatoloaka, climatisés, tout équipés. Réservation en ligne sécurisée sur Rentanoo."
      canonical="https://rentanoo.com/location-appartement-nosy-be"
      breadcrumbSchema={BREADCRUMB_SCHEMA}
      eyebrow="Location appartement · Nosy Be, Madagascar"
      h1="Trouvez votre appartement idéal à Nosy Be"
      subtitle="Appartements vérifiés sur place par notre équipe locale à Nosy Be. Prix clairs, envoyez votre demande en 2 minutes."
      vehicleSubCategory="Appartement"
      listingNoun="appartement"
      ctaHref="/?cat=accommodation"
      ctaLabel="Voir les appartements"
      faqTitle="Questions fréquentes — Location appartement Nosy Be"
      faqItems={FAQ_ITEMS}
      relatedLinks={RELATED_LINKS}
      ctaPanelTitle="Réservez votre appartement à Nosy Be"
      ctaPanelText="Confirmation immédiate. Prix clairs. Proche de la plage."
    />
  );
}
