import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Placeholder({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">{title}</h1>
      {children ?? (
        <Card>
          <CardHeader>
            <CardTitle>Bientôt disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Cette section sera branchée dans un prochain bloc fonctionnel.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function AdminPlaceholderUsers() {
  return <Placeholder title="Utilisateurs" />;
}

export function AdminPlaceholderVehicles() {
  return <Placeholder title="Véhicules" />;
}

export function AdminPlaceholderBookings() {
  return (
    <Placeholder title="Réservations">
      <Card className="mb-4">
        <CardContent className="pt-6">
          <Link to="/admin/bookings/new" className="text-primary font-medium hover:underline">
            Nouvelle réservation (agence)
          </Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Liste</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Liste et filtres à brancher plus tard.</p>
        </CardContent>
      </Card>
    </Placeholder>
  );
}

export function AdminPlaceholderPayments() {
  return <Placeholder title="Paiements" />;
}
