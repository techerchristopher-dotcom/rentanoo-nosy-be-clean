import { SeoHebergementPageTemplate } from "@/components/seo/SeoHebergementPageTemplate";

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: "https://rentanoo.com/" },
    { "@type": "ListItem", position: 2, name: "Location vacances Nosy Be", item: "https://rentanoo.com/location-vacances-nosy-be" },
    { "@type": "ListItem", position: 3, name: "Villa avec piscine Nosy Be", item: "https://rentanoo.com/location-villa-piscine-nosy-be" },
  ],
};

const FAQ_ITEMS = [
  {
    q: "Comment fonctionne le paiement pour une villa avec piscine ?",
    a: "Vous réglez un acompte en ligne pour confirmer votre réservation, le solde se règle directement sur place à votre arrivée.",
  },
  {
    q: "Puis-je annuler ma réservation ?",
    a: "Oui. Vous êtes remboursé à 100% si vous annulez plus de 48h avant votre arrivée, à 50% entre 24h et 48h, sans remboursement en deçà de 24h. Les frais de service ne sont pas remboursables.",
  },
  {
    q: "Les villas et hébergements avec piscine sont-ils vérifiés avant d'être mis en ligne ?",
    a: "Oui, chaque hébergement — villa, bungalow ou appartement — est visité et vérifié sur place par notre équipe locale à Nosy Be avant d'être proposé sur la plateforme.",
  },
];

const RELATED_LINKS = [
  { label: "Villas Nosy Be", href: "/location-villa-nosy-be" },
  { label: "Villa bord de mer Nosy Be", href: "/location-villa-bord-de-mer-nosy-be" },
  { label: "Appartements Nosy Be", href: "/location-appartement-nosy-be" },
  { label: "Bungalows Nosy Be", href: "/location-bungalow-nosy-be" },
  { label: "Tous les hébergements", href: "/location-hebergement-nosy-be" },
  { label: "Location scooter Nosy Be", href: "/location-scooter-nosy-be" },
];

export default function LocationVillaPiscineNosyBePage() {
  return (
    <SeoHebergementPageTemplate
      seoTitle="Villa avec piscine à Nosy Be — Réservation vérifiée | Rentanoo"
      seoDescription="Réservez une villa, bungalow ou appartement avec piscine à Nosy Be. Prix clairs, hébergements vérifiés sur place, acompte sécurisé. Réservation en ligne sur Rentanoo."
      canonical="https://rentanoo.com/location-villa-piscine-nosy-be"
      breadcrumbSchema={BREADCRUMB_SCHEMA}
      eyebrow="Villa piscine · Nosy Be, Madagascar"
      h1="Trouvez votre villa avec piscine idéale à Nosy Be"
      subtitle="Villas, bungalows et appartements avec piscine vérifiés sur place par notre équipe locale à Nosy Be. Prix clairs, envoyez votre demande en 2 minutes."
      hasPool={true}
      listingNoun="hébergement"
      ctaHref="/?cat=accommodation"
      ctaLabel="Voir les hébergements avec piscine"
      faqTitle="Questions fréquentes — Villa avec piscine Nosy Be"
      faqItems={FAQ_ITEMS}
      relatedLinks={RELATED_LINKS}
      ctaPanelTitle="Réservez votre villa avec piscine à Nosy Be"
      ctaPanelText="Villas, bungalows, appartements avec piscine. Réservation sécurisée en ligne."
    />
  );
}
