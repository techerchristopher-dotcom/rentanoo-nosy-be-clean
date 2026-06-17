import { SeoCategoryPage } from "./SeoCategoryPage";

export default function LocationMinibusNosyBePage() {
  return (
    <SeoCategoryPage
      seoTitle="Location minibus à Nosy Be – Groupes & transferts | Rentanoo"
      seoDescription="Louez un minibus à Nosy Be pour vos groupes, excursions ou transferts aéroport. 7 à 9 places. Réservation en ligne sur Rentanoo."
      canonical="https://rentanoo.com/location-minibus-nosy-be"
      eyebrow="Location minibus · Nosy Be, Madagascar"
      heroTitle="Location minibus à Nosy Be"
      heroIntro="Déplacements en groupe, excursions, transferts aéroport ou mariage : le minibus est la solution idéale pour 6 à 9 personnes à Nosy Be."
      vehicleType="car"
      vehicleSubCategory="Minibus"
      contentTitle="Location de minibus à Nosy Be : pour qui, pour quoi ?"
      contentBody="Le minibus est le véhicule idéal pour les familles nombreuses, les groupes d'amis ou les équipes en déplacement professionnel à Nosy Be. Avec 7 à 9 places assises, il permet de voyager ensemble sans se séparer. Rentanoo propose des minibus climatisés, disponibles avec ou sans chauffeur, livrés à l'aéroport Fascène ou dans les principales zones touristiques (Ambatoloaka, Madirokely, Hell-Ville). Parfait pour les excursions vers Nosy Komba, les plages de l'ouest ou les marchés locaux."
      highlights={["7 à 9 places", "Climatisation", "Groupes & familles", "Livraison aéroport", "Option chauffeur", "Excursions & transferts"]}
      faqTitle="Questions fréquentes — Location minibus Nosy Be"
      faqItems={[
        { q: "Combien de personnes peut accueillir un minibus à Nosy Be ?", a: "Les minibus disponibles sur Rentanoo accueillent généralement 7 à 9 passagers assis, idéal pour les familles ou groupes." },
        { q: "Peut-on louer un minibus avec chauffeur à Nosy Be ?", a: "Oui, l'option chauffeur est disponible sur demande via WhatsApp selon les disponibilités et la période." },
        { q: "Le minibus peut-il aller sur les pistes ?", a: "Les minibus sont adaptés aux routes goudronnées principales. Pour les pistes difficiles, préférez un SUV ou 4x4." },
        { q: "Quel est le tarif d'un minibus par jour à Nosy Be ?", a: "Les tarifs varient selon la durée et le type de minibus. Consultez les annonces disponibles sur Rentanoo pour des prix en temps réel." },
        { q: "Le minibus est-il disponible pour un transfert aéroport ?", a: "Oui. Les transferts aéroport Fascène vers tous les hôtels de l'île sont proposés. Contactez-nous sur WhatsApp pour organiser votre transfert." },
      ]}
      ctaTitle="Réservez un minibus à Nosy Be"
      ctaText="Groupes, familles, excursions. Minibus climatisés avec livraison à l'aéroport."
      ctaHref="/?cat=car"
      ctaLabel="Voir les minibus disponibles"
      relatedLinks={[
        { label: "Location voiture Nosy Be", href: "/location-voiture-nosy-be" },
        { label: "Location 4x4 Nosy Be", href: "/location-4x4-nosy-be" },
        { label: "Hébergements Nosy Be", href: "/location-vacances-nosy-be" },
      ]}
      breadcrumbs={[
        { name: "Accueil", item: "https://rentanoo.com/" },
        { name: "Location voiture Nosy Be", item: "https://rentanoo.com/location-voiture-nosy-be" },
        { name: "Location minibus Nosy Be", item: "https://rentanoo.com/location-minibus-nosy-be" },
      ]}
    />
  );
}
