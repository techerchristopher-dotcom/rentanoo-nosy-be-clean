import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/layout/footer";
import { Seo } from "@/components/seo/Seo";

const REFUND_RULES = [
  {
    delay: "Plus de 48h avant",
    refund: "100% du montant payé (hors frais de service)",
  },
  {
    delay: "Entre 24h et 48h avant",
    refund: "50% du montant payé",
  },
  {
    delay: "Moins de 24h avant / no-show",
    refund: "Aucun remboursement",
  },
];

function RefundTable() {
  return (
    <>
      {/* Tableau classique — visible à partir de sm */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-4 font-semibold">
                Délai avant le retrait du véhicule / l'arrivée au logement
              </th>
              <th className="text-left py-2 font-semibold">Remboursement</th>
            </tr>
          </thead>
          <tbody>
            {REFUND_RULES.map((rule) => (
              <tr key={rule.delay} className="border-b last:border-b-0">
                <td className="py-3 pr-4 text-muted-foreground">{rule.delay}</td>
                <td className="py-3 font-medium">{rule.refund}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards empilées — mobile */}
      <div className="sm:hidden space-y-3">
        {REFUND_RULES.map((rule) => (
          <div key={rule.delay} className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{rule.delay}</p>
            <p className="mt-1 font-medium text-sm">{rule.refund}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export default function PolitiqueAnnulation() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-soft">
      <Seo
        title="Politique d'annulation et de remboursement — Rentanoo"
        description="Conditions d'annulation et de remboursement pour les réservations de véhicules et hébergements sur Rentanoo, Nosy Be."
        canonical="https://rentanoo.com/politique-annulation"
      />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Politique d'annulation et de remboursement
            </h1>
            <p className="text-xl text-muted-foreground">
              Comprendre vos droits en cas de changement de plan
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Conditions d'annulation</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none">
              <p>
                Chez Rentanoo, nous savons que les plans de voyage peuvent changer. Cette
                politique s'applique à toutes les réservations effectuées sur rentanoo.com,
                qu'il s'agisse de véhicules, de logements, ou des deux.
              </p>

              <h3>1. Annulation par le client</h3>
              <div className="not-prose">
                <RefundTable />
              </div>
              <p>
                Les frais de service appliqués lors de la réservation ne sont pas
                remboursables, quel que soit le délai d'annulation.
              </p>

              <h3>2. Réservations groupées (plusieurs véhicules et/ou logements)</h3>
              <p>
                Vous pouvez annuler un ou plusieurs éléments au sein d'une même réservation
                sans annuler l'ensemble du panier. Le remboursement est calculé élément par
                élément (véhicule ou logement), selon la grille ci-dessus appliquée à son prix
                et ses options associées. Le reste de la réservation demeure inchangé.
              </p>

              <h3>3. Annulation par Rentanoo ou le prestataire</h3>
              <p>
                Si une réservation confirmée doit être annulée de notre côté (véhicule ou
                logement indisponible, panne non réparable, etc.), vous recevez un
                remboursement intégral, sans pénalité. Lorsque cela est possible, nous vous
                proposons également une solution de remplacement équivalente.
              </p>

              <h3>4. Cas de force majeure</h3>
              <p>
                Si la prestation ne peut pas avoir lieu pour des raisons indépendantes de
                votre volonté — alerte météo officielle, route impraticable, panne mécanique
                ou problème majeur constaté sur place — vous bénéficiez d'un remboursement
                intégral, même si l'annulation intervient à moins de 24h. Les conditions
                météo habituelles (pluie, vent) ne constituent pas en elles-mêmes un motif
                de remboursement tant qu'elles ne rendent pas la prestation impossible.
              </p>

              <h3>5. Comment annuler</h3>
              <p>
                L'annulation se fait directement depuis votre espace réservation sur
                rentanoo.com, ou en nous contactant si besoin. Le remboursement, lorsqu'il
                est dû, est traité dans un délai de 5 à 7 jours ouvrés sur le moyen de
                paiement utilisé lors de la réservation.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
