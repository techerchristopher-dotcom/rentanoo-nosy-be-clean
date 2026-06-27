import { SeoHebergementPageTemplate } from "@/components/seo/SeoHebergementPageTemplate";

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: "https://rentanoo.com/" },
    { "@type": "ListItem", position: 2, name: "Location vacances Nosy Be", item: "https://rentanoo.com/location-vacances-nosy-be" },
    { "@type": "ListItem", position: 3, name: "Villas Nosy Be", item: "https://rentanoo.com/location-villa-nosy-be" },
  ],
};

const FAQ_ITEMS = [
  {
    q: "Comment fonctionne le paiement pour une villa ?",
    a: "Vous réglez un acompte en ligne pour confirmer votre réservation, le solde se règle directement sur place à votre arrivée.",
  },
  {
    q: "Puis-je annuler ma réservation ?",
    a: "Oui. Vous êtes remboursé à 100% si vous annulez plus de 48h avant votre arrivée, à 50% entre 24h et 48h, sans remboursement en deçà de 24h. Les frais de service ne sont pas remboursables.",
  },
  {
    q: "Les villas sont-elles vérifiées avant d'être mises en ligne ?",
    a: "Oui, chaque villa est visitée et vérifiée sur place par notre équipe locale à Nosy Be avant d'être proposée sur la plateforme.",
  },
];

const RELATED_LINKS = [
  { label: "Villa bord de mer Nosy Be", href: "/location-villa-bord-de-mer-nosy-be" },
  { label: "Villa avec piscine Nosy Be", href: "/location-villa-piscine-nosy-be" },
  { label: "Appartements Nosy Be", href: "/location-appartement-nosy-be" },
  { label: "Bungalows Nosy Be", href: "/location-bungalow-nosy-be" },
  { label: "Tous les hébergements", href: "/location-hebergement-nosy-be" },
  { label: "Location vacances Nosy Be", href: "/location-vacances-nosy-be" },
  { label: "Location scooter Nosy Be", href: "/location-scooter-nosy-be" },
];

export default function LocationVillaNosyBePage() {
  return (
    <SeoHebergementPageTemplate
      seoTitle="Location villa à Nosy Be – Avec piscine & vue mer | Rentanoo"
      seoDescription="Louez une villa à Nosy Be : piscine, vue mer, espaces extérieurs. Andilana, Madirokely. Réservation en ligne sécurisée sur Rentanoo."
      canonical="https://rentanoo.com/location-villa-nosy-be"
      breadcrumbSchema={BREADCRUMB_SCHEMA}
      eyebrow="Location villa · Nosy Be, Madagascar"
      h1="Trouvez votre villa idéale à Nosy Be"
      subtitle="Villas vérifiées sur place par notre équipe locale à Nosy Be. Prix clairs, envoyez votre demande en 2 minutes."
      vehicleSubCategory="Villa"
      listingNoun="villa"
      ctaHref="/?cat=accommodation"
      ctaLabel="Voir les villas"
      faqTitle="Questions fréquentes — Location villa Nosy Be"
      faqItems={FAQ_ITEMS}
      relatedLinks={RELATED_LINKS}
      ctaPanelTitle="Réservez votre villa à Nosy Be"
      ctaPanelText="Espaces, piscine, vue mer. Réservation sécurisée en ligne."
    />
  );
}
