import { SeoHebergementPageTemplate } from "@/components/seo/SeoHebergementPageTemplate";

const BREADCRUMB_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: "https://rentanoo.com/" },
    { "@type": "ListItem", position: 2, name: "Location vacances Nosy Be", item: "https://rentanoo.com/location-vacances-nosy-be" },
    { "@type": "ListItem", position: 3, name: "Villa bord de mer Nosy Be", item: "https://rentanoo.com/location-villa-bord-de-mer-nosy-be" },
  ],
};

const FAQ_ITEMS = [
  {
    q: "Comment fonctionne le paiement pour un hébergement en bord de mer ?",
    a: "Vous réglez un acompte en ligne pour confirmer votre réservation, le solde se règle directement sur place à votre arrivée.",
  },
  {
    q: "Puis-je annuler ma réservation ?",
    a: "Oui. Vous êtes remboursé à 100% si vous annulez plus de 48h avant votre arrivée, à 50% entre 24h et 48h, sans remboursement en deçà de 24h. Les frais de service ne sont pas remboursables.",
  },
  {
    q: "Les hébergements en bord de mer sont-ils vérifiés avant d'être mis en ligne ?",
    a: "Oui, chaque hébergement — villa, bungalow ou appartement — est visité et vérifié sur place par notre équipe locale à Nosy Be avant d'être proposé sur la plateforme.",
  },
];

const RELATED_LINKS = [
  { label: "Villas Nosy Be", href: "/location-villa-nosy-be" },
  { label: "Appartements Nosy Be", href: "/location-appartement-nosy-be" },
  { label: "Bungalows Nosy Be", href: "/location-bungalow-nosy-be" },
  { label: "Tous les hébergements", href: "/location-hebergement-nosy-be" },
  { label: "Location scooter Nosy Be", href: "/location-scooter-nosy-be" },
];

export default function LocationVillaBordDeMerNosyBePage() {
  return (
    <SeoHebergementPageTemplate
      seoTitle="Villa en bord de mer à Nosy Be — Réservation vérifiée | Rentanoo"
      seoDescription="Réservez une villa, bungalow ou appartement en bord de mer à Nosy Be. Prix clairs, hébergements vérifiés sur place, acompte sécurisé. Réservation en ligne sur Rentanoo."
      canonical="https://rentanoo.com/location-villa-bord-de-mer-nosy-be"
      breadcrumbSchema={BREADCRUMB_SCHEMA}
      eyebrow="Bord de mer · Nosy Be, Madagascar"
      h1="Trouvez votre villa en bord de mer à Nosy Be"
      subtitle="Villas, bungalows et appartements en bord de mer vérifiés sur place par notre équipe locale à Nosy Be. Prix clairs, envoyez votre demande en 2 minutes."
      nearBeach={true}
      listingNoun="hébergement"
      ctaHref="/?cat=accommodation"
      ctaLabel="Voir les hébergements bord de mer"
      faqTitle="Questions fréquentes — Villa bord de mer Nosy Be"
      faqItems={FAQ_ITEMS}
      relatedLinks={RELATED_LINKS}
      ctaPanelTitle="Réservez votre hébergement en bord de mer à Nosy Be"
      ctaPanelText="Villas, bungalows, appartements proches de la plage. Réservation sécurisée en ligne."
    />
  );
}
