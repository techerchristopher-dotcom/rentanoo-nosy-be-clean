import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function Legal() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-soft">
      <Navbar />
      
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
                  MayCar est une plateforme de démonstration d'autopartage entre particuliers 
                  spécialement conçue pour Mayotte. Cette application est un prototype technique 
                  sans backend réel, utilisant des données simulées.
                </p>

                <h3>2. Utilisation de la plateforme</h3>
                <p>
                  Cette application est fournie à titre de démonstration uniquement. 
                  Aucune transaction réelle ne peut être effectuée, et aucune donnée 
                  personnelle n'est collectée ou transmise à des serveurs externes.
                </p>

                <h3>3. Responsabilité</h3>
                <p>
                  L'utilisation de cette démonstration se fait sous votre propre responsabilité. 
                  L'application est fournie "en l'état" sans aucune garantie.
                </p>

                <h3>4. Propriété intellectuelle</h3>
                <p>
                  Le code source et le design de cette application sont protégés par 
                  les droits d'auteur. L'utilisation commerciale nécessite une autorisation préalable.
                </p>

                <h3>5. Contact</h3>
                <p>
                  Pour toute question concernant cette démonstration technique, 
                  veuillez nous contacter via les canaux appropriés.
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
                  Cette application de démonstration utilise uniquement le stockage local 
                  de votre navigateur (localStorage). Aucune donnée n'est transmise à 
                  des serveurs externes ou à des tiers.
                </p>

                <h3>2. Utilisation des données</h3>
                <p>
                  Les données mockées utilisées dans cette démonstration sont fictives 
                  et servent uniquement à illustrer les fonctionnalités de la plateforme.
                </p>

                <h3>3. Stockage local</h3>
                <p>
                  Les données de session sont stockées localement dans votre navigateur 
                  et peuvent être supprimées à tout moment en effaçant les données 
                  de navigation ou le localStorage.
                </p>

                <h3>4. Sécurité</h3>
                <p>
                  Bien qu'aucune donnée réelle ne soit collectée, l'application 
                  implémente les meilleures pratiques de sécurité front-end.
                </p>

                <h3>5. Vos droits</h3>
                <p>
                  Vous pouvez à tout moment supprimer toutes les données simulées 
                  en effaçant les données de votre navigateur.
                </p>
              </CardContent>
            </Card>

            {/* Informations sur Mayotte */}
            <Card>
              <CardHeader>
                <CardTitle>À propos de Mayotte</CardTitle>
                <CardDescription>
                  Cette démonstration technique honore le 101ème département français
                </CardDescription>
              </CardHeader>
              <CardContent className="prose prose-slate max-w-none">
                <h3>Mayotte, le lagon aux eaux turquoise</h3>
                <p>
                  Mayotte est un département et région d'outre-mer français situé dans 
                  l'archipel des Comores, dans l'océan Indien. Devenu le 101ème département 
                  français en 2011, Mayotte est réputée pour son lagon exceptionnel, 
                  l'un des plus beaux au monde.
                </p>

                <h3>Une inspiration naturelle</h3>
                <p>
                  Le design de MayCar s'inspire directement des couleurs du lagon mahorais : 
                  les bleus turquoise de ses eaux cristallines, les verts de sa végétation 
                  luxuriante, et les tons dorés de ses plages de sable fin.
                </p>

                <h3>Vision technique</h3>
                <p>
                  Cette application démontre comment une solution d'autopartage pourrait 
                  s'adapter aux spécificités insulaires de Mayotte, en tenant compte de 
                  ses défis logistiques uniques et de sa communauté soudée.
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