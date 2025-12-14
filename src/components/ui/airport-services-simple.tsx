import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const AirportServicesSimple = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Service Aéroport - Version Simple</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Test du composant simplifié</p>
          <Button className="mt-4">
            Bouton de test
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
