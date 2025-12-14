import { useState } from "react";
import { AirportServices, AirportServiceData } from "@/components/ui/airport-services";
import { AirportServicesSimple } from "@/components/ui/airport-services-simple";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const initialData: AirportServiceData = {
  enabled: true,
  pickup: {
    enabled: true,
    pricing: 'paid',
    price: 25
  },
  dropoff: {
    enabled: true,
    pricing: 'paid',
    price: 25
  }
};

export default function AirportServicesDemo() {
  const [data, setData] = useState<AirportServiceData>(initialData);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header de la démo */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-primary">
            Démonstration - Services Aéroport
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Nouveau design UX optimisé pour la gestion des services aéroport. 
            Interface plus intuitive avec une hiérarchie visuelle claire.
          </p>
        </div>

        {/* Composant simple pour test */}
        <div className="space-y-6">
          <AirportServicesSimple />
        </div>

        {/* Composant principal */}
        <div className="space-y-6">
          <AirportServices 
            data={data} 
            onChange={setData}
          />
        </div>

        {/* État actuel (pour debug) */}
        <div className="mt-12">
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">État actuel des données</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-background p-4 rounded-lg overflow-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Comparaison avant/après */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-destructive">Ancien Design</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>❌ Redondance visuelle (cartes identiques)</p>
                <p>❌ Hiérarchie confuse</p>
                <p>❌ Espace mal optimisé</p>
                <p>❌ Navigation peu intuitive</p>
                <p>❌ Trop de niveaux de contrôle</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-success">Nouveau Design</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>✅ Hiérarchie visuelle claire</p>
                <p>✅ Réduction de la redondance</p>
                <p>✅ Navigation intuitive</p>
                <p>✅ Design cohérent avec la charte</p>
                <p>✅ Optimisation de l'espace</p>
                <p>✅ Accessibilité améliorée</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
