import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/layout/footer";
import { Seo } from "@/components/seo/Seo";

export default function Legal() {
  const { t } = useTranslation("common");
  return (
    <div className="min-h-screen flex flex-col bg-gradient-soft">
      <Seo
        title={t("seo.legal.title")}
        description={t("seo.legal.description")}
        canonical="https://rentanoo.com/legal"
      />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Mentions légales
            </h1>
            <p className="text-xl text-muted-foreground">
              Informations légales et conditions d'utilisation
            </p>
          </div>

          <div className="space-y-8">
            {/* CGU */}
            <Card>
              <CardHeader>
                <CardTitle>Conditions Générales d'Utilisation</CardTitle>
                <CardDescription>
                  Dernière mise à jour : 14 septembre 2024
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-slate max-w-none">
                <h3>1. Objet</h3>
                <p>
                  Rentanoo est un service de location de scooters à Nosy Be, Madagascar. 
                  La plateforme permet de réserver et louer des scooters en ligne, 
                  avec livraison possible à l'aéroport ou à l'hôtel.
                </p>

                <h3>2. Utilisation de la plateforme</h3>
                <p>
                  L'utilisation du site Rentanoo permet de consulter les véhicules disponibles, 
                  effectuer des réservations et gérer vos locations. Les transactions sont 
                  sécurisées et les données personnelles traitées conformément à notre politique de confidentialité.
                </p>

                <h3>3. Responsabilité</h3>
                <p>
                  L'utilisation du service se fait sous votre propre responsabilité. 
                  Rentanoo s'engage à fournir des véhicules en bon état et une assistance 
                  en cas de besoin pendant la durée de la location.
                </p>

                <h3>4. Propriété intellectuelle</h3>
                <p>
                  Le code source et le design de cette application sont protégés par 
                  les droits d'auteur. L'utilisation commerciale nécessite une autorisation préalable.
                </p>

                <h3>5. Contact</h3>
                <p>
                  Pour toute question concernant nos services de location à Nosy Be, 
                  veuillez nous contacter via la page contact ou les coordonnées indiquées sur le site.
                </p>
              </CardContent>
            </Card>

            {/* Politique de Confidentialité */}
            <Card>
              <CardHeader>
                <CardTitle>Politique de Confidentialité</CardTitle>
                <CardDescription>
                  Protection de vos données dans cette démonstration
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-slate max-w-none">
                <h3>1. Collecte des données</h3>
                <p>
                  Rentanoo collecte les données nécessaires à la réservation et à la location 
                  de scooters (identité, coordonnées, informations de paiement). Ces données 
                  sont transmises de manière sécurisée et utilisées uniquement pour le service de location.
                </p>

                <h3>2. Utilisation des données</h3>
                <p>
                  Les données collectées servent à gérer vos réservations, communiquer avec vous 
                  et améliorer notre service de location à Nosy Be. Nous ne partageons pas vos 
                  données avec des tiers à des fins commerciales sans votre consentement.
                </p>

                <h3>3. Stockage et sécurité</h3>
                <p>
                  Vos données sont stockées de manière sécurisée. Nous mettons en œuvre les 
                  mesures techniques appropriées pour protéger vos informations personnelles.
                </p>

                <h3>4. Durée de conservation</h3>
                <p>
                  Les données sont conservées pendant la durée nécessaire au service et aux 
                  obligations légales (facturation, litiges éventuels).
                </p>

                <h3>5. Vos droits</h3>
                <p>
                  Conformément à la réglementation en vigueur, vous disposez d'un droit d'accès, 
                  de rectification et de suppression de vos données. Contactez-nous pour exercer ces droits.
                </p>
              </CardContent>
            </Card>

            {/* Informations sur Nosy Be */}
            <Card>
              <CardHeader>
                <CardTitle>À propos de Nosy Be</CardTitle>
                <CardDescription>
                  L'île aux parfums, destination incontournable de Madagascar
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-slate max-w-none">
                <h3>Nosy Be, perle de l'océan Indien</h3>
                <p>
                  Nosy Be est une île de Madagascar située dans le canal du Mozambique, 
                  réputée pour ses plages de sable blanc, ses lémuriens et ses eaux turquoise. 
                  C'est une destination prisée des touristes du monde entier.
                </p>

                <h3>Notre service de location</h3>
                <p>
                  Rentanoo propose la location de scooters à Nosy Be pour explorer l'île 
                  en toute liberté. Livraison à l'aéroport de Fascène ou à votre hôtel, 
                  casques et assurance inclus.
                </p>

                <h3>Notre engagement</h3>
                <p>
                  Nous nous adaptons aux besoins des voyageurs qui visitent Nosy Be : 
                  réservation simple en ligne, véhicules entretenus et assistance locale 
                  tout au long de votre séjour.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}