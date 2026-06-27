import { SeoHebergementPageTemplate } from "@/components/seo/SeoHebergementPageTemplate";

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: "https://rentanoo.com/" },
    { "@type": "ListItem", position: 2, name: "Location vacances Nosy Be", item: "https://rentanoo.com/location-vacances-nosy-be" },
  ],
};

const FAQ_ITEMS = [
  {
    q: "Comment fonctionne le paiement pour mon hébergement ?",
    a: "Vous réglez un acompte en ligne pour confirmer votre réservation, le solde se règle directement sur place à votre arrivée.",
  },
  {
    q: "Puis-je annuler ma réservation ?",
    a: "Oui. Vous êtes remboursé à 100% si vous annulez plus de 48h avant votre arrivée, à 50% entre 24h et 48h, sans remboursement en deçà de 24h. Les frais de service ne sont pas remboursables.",
  },
  {
    q: "Les hébergements sont-ils vérifiés avant d'être mis en ligne ?",
    a: "Oui, chaque hébergement (appartement, villa ou bungalow) est visité et vérifié sur place par notre équipe locale à Nosy Be avant d'être proposé sur la plateforme.",
  },
];

const RELATED_LINKS = [
  { label: "Appartements Nosy Be", href: "/location-appartement-nosy-be" },
  { label: "Villas Nosy Be", href: "/location-villa-nosy-be" },
  { label: "Villa bord de mer Nosy Be", href: "/location-villa-bord-de-mer-nosy-be" },
  { label: "Villa avec piscine Nosy Be", href: "/location-villa-piscine-nosy-be" },
  { label: "Bungalows Nosy Be", href: "/location-bungalow-nosy-be" },
  { label: "Hébergements Nosy Be", href: "/location-hebergement-nosy-be" },
  { label: "Location scooter Nosy Be", href: "/location-scooter-nosy-be" },
];

export default function LocationVacancesNosyBePage() {
  return (
    <SeoHebergementPageTemplate
      seoTitle="Location vacances Nosy Be – Appartements, villas, bungalows | Rentanoo"
      seoDescription="Louez votre hébergement à Nosy Be : appartements, villas, bungalows à Ambatoloaka et Madirokely. Réservation sécurisée en ligne sur Rentanoo."
      canonical="https://rentanoo.com/location-vacances-nosy-be"
      breadcrumbSchema={BREADCRUMB_SCHEMA}
      eyebrow="Location vacances · Nosy Be, Madagascar"
      h1="Trouvez votre hébergement de vacances à Nosy Be"
      subtitle="Appartements, villas et bungalows vérifiés sur place par notre équipe locale. Prix clairs, envoyez votre demande en 2 minutes."
      listingNoun="hébergement"
      ctaHref="/?cat=accommodation"
      ctaLabel="Voir tous les hébergements"
      faqTitle="Questions fréquentes — Location vacances Nosy Be"
      faqItems={FAQ_ITEMS}
      relatedLinks={RELATED_LINKS}
      ctaPanelTitle="Trouvez votre hébergement à Nosy Be"
      ctaPanelText="Appartements, villas, bungalows. Disponibilité en temps réel, réservation sécurisée."
    />
  );
}
