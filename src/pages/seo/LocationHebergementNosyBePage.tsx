import { SeoCategoryPage } from "./SeoCategoryPage";

export default function LocationHebergementNosyBePage() {
  return (
    <SeoCategoryPage
      seoTitle="Hébergement à Nosy Be — Réservation en ligne vérifiée | Rentanoo"
      seoDescription="Réservez votre hébergement à Nosy Be en ligne. Prix clairs, logements vérifiés sur place, acompte sécurisé. Réservation en 2 minutes sur Rentanoo."
      canonical="https://rentanoo.com/location-hebergement-nosy-be"
      eyebrow="Hébergement à Nosy Be"
      heroTitle="Trouvez votre hébergement idéal à Nosy Be"
      heroIntro="Hébergements vérifiés sur place par notre équipe locale à Nosy Be. Prix clairs, réservation en 2 minutes."
      vehicleType="accommodation"
      contentTitle="Pourquoi Rentanoo ?"
      contentBody="Je m'appelle Christopher, développeur installé à Nosy Be depuis décembre 2025. Avant même d'arriver, j'ai galéré pendant des semaines pour trouver un logement fiable : messages sans réponse, prix qui changeaient une fois sur place parce que j'étais étranger, aucune facture, tout en espèces. J'ai créé Rentanoo pour que ça n'arrive plus à personne : des prix clairs, affichés à l'avance, et des hébergements vérifiés avant de vous les proposer."
      highlights={[
        "Hébergements vérifiés sur place par notre équipe",
        "Prix affichés clairement, aucune surprise",
        "Acompte sécurisé en ligne, le reste se règle sur place",
      ]}
      faqTitle="Questions fréquentes — Hébergement à Nosy Be"
      faqItems={[
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
      ]}
      ctaTitle="Réservez votre hébergement à Nosy Be"
      ctaText="Logements vérifiés, prix clairs, réservation sécurisée en ligne."
      ctaHref="/?cat=accommodation"
      ctaLabel="Voir les hébergements disponibles"
      relatedLinks={[
        { label: "Appartements Nosy Be", href: "/location-appartement-nosy-be" },
        { label: "Villas Nosy Be", href: "/location-villa-nosy-be" },
        { label: "Bungalows Nosy Be", href: "/location-bungalow-nosy-be" },
        { label: "Location vacances Nosy Be", href: "/location-vacances-nosy-be" },
        { label: "Location scooter Nosy Be", href: "/location-scooter-nosy-be" },
      ]}
      breadcrumbs={[
        { name: "Accueil", item: "https://rentanoo.com/" },
        { name: "Hébergement Nosy Be", item: "https://rentanoo.com/location-hebergement-nosy-be" },
      ]}
    />
  );
}
