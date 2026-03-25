import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { adminGetBooking } from "@/services/adminApi";
import { PageLoader } from "@/components/ui/page-loader";

export default function AdminBookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<{
    booking: Record<string, unknown>;
    vehicle: Record<string, unknown> | null;
    renter: Record<string, unknown> | null;
  } | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await adminGetBooking(bookingId);
        if (!cancelled) setPayload(data);
      } catch (e: unknown) {
        if (!cancelled) {
          toast({
            title: "Chargement impossible",
            description: e instanceof Error ? e.message : "Erreur",
            variant: "destructive",
          });
          setPayload(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  if (!bookingId) {
    return <p className="text-muted-foreground">ID manquant.</p>;
  }

  if (loading) {
    return <PageLoader />;
  }

  if (!payload?.booking) {
    return (
      <div className="max-w-xl space-y-4">
        <p className="text-muted-foreground">Réservation introuvable ou accès refusé.</p>
        <Button asChild variant="outline">
          <Link to="/admin/bookings/new">Nouvelle réservation</Link>
        </Button>
      </div>
    );
  }

  const b = payload.booking;
  const v = payload.vehicle;
  const r = payload.renter;

  const status = typeof b.status === "string" ? b.status : "—";
  const total =
    typeof b.total_price === "number"
      ? `${b.total_price.toFixed(2)} €`
      : b.total_price != null
        ? String(b.total_price)
        : "—";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Réservation (admin)</h1>
        <p className="font-mono text-sm text-muted-foreground break-all">{bookingId}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <Link to="/admin/bookings/new" className="text-primary font-medium hover:underline">
            Nouvelle réservation
          </Link>
          <span className="text-border">·</span>
          <Link to="/admin" className="text-primary font-medium hover:underline">
            Tableau de bord
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Synthèse</CardTitle>
          <CardDescription>Données issues de l’API admin (service role). Paiement / caution au bloc 3.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className="text-muted-foreground">Statut</div>
              <div className="font-medium">{status}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total (locataire)</div>
              <div className="font-medium">{total}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Début</div>
              <div className="font-medium">
                {String(b.start_date ?? "—")}
                {b.start_time ? ` ${String(b.start_time)}` : ""}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Fin</div>
              <div className="font-medium">
                {String(b.end_date ?? "—")}
                {b.end_time ? ` ${String(b.end_time)}` : ""}
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-muted-foreground">Prise en charge</div>
              <div className="font-medium">{String(b.pickup_location ?? "—")}</div>
            </div>
          </div>

          {r ? (
            <div className="border-t border-border pt-4">
              <div className="text-muted-foreground mb-1">Locataire</div>
              <div className="font-medium">
                {String(r.first_name ?? "")} {String(r.last_name ?? "")}
              </div>
              <div>{String(r.email ?? "—")}</div>
              <div>{String(r.phone ?? "—")}</div>
            </div>
          ) : null}

          {v ? (
            <div className="border-t border-border pt-4">
              <div className="text-muted-foreground mb-1">Véhicule</div>
              <div className="font-medium">
                {String(v.brand ?? "")} {String(v.model ?? "")}
              </div>
              {v.price_per_day != null ? <div>{String(v.price_per_day)} € / jour</div> : null}
            </div>
          ) : null}

          <div className="border-t border-border pt-4 flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to={`/checking/${bookingId}`}>État des lieux départ</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={`/checkin-return/${bookingId}`}>État des lieux retour</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
