import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  adminDraftConvert,
  adminDraftDelete,
  adminDraftsList,
  type AdminBookingDraft,
} from "@/services/adminDraftsApi";

function fmtDate(isoOrYmd: string | null | undefined): string {
  if (!isoOrYmd) return "—";
  return isoOrYmd.slice(0, 10);
}

export default function AdminDrafts() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<AdminBookingDraft[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await adminDraftsList();
      setDrafts(rows);
    } catch (e: unknown) {
      toast({
        title: "Chargement impossible",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runDelete = async (id: string) => {
    setBusyId(id);
    try {
      await adminDraftDelete(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      toast({ title: "Brouillon supprimé" });
    } catch (e: unknown) {
      toast({
        title: "Suppression impossible",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const runConvert = async (id: string) => {
    setBusyId(id);
    try {
      const out = await adminDraftConvert(id);
      if (out.createdClientPassword) {
        toast({
          title: "Client créé à la conversion",
          description: `Mot de passe généré (à transmettre) : ${out.createdClientPassword}`,
        });
      } else {
        toast({ title: "Conversion OK", description: `Réservation ${out.bookingId.slice(0, 8)}…` });
      }
      navigate(`/admin/bookings/${out.bookingId}`);
    } catch (e: unknown) {
      toast({
        title: "Conversion impossible",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mes brouillons</h1>
          <p className="text-muted-foreground text-sm">Brouillons visibles uniquement par vous. Conversion = création d’une vraie réservation agence.</p>
          <p className="mt-2 text-sm">
            <Link to="/admin" className="text-primary font-medium hover:underline">
              ← Tableau de bord
            </Link>
            <span className="mx-2 text-border">·</span>
            <Link to="/admin/bookings/new" className="text-primary font-medium hover:underline">
              Nouvelle réservation
            </Link>
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>
          Actualiser
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste</CardTitle>
          <CardDescription>{loading ? "Chargement…" : `${drafts.length} brouillon(s)`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && drafts.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun brouillon pour le moment.</div>
          ) : null}

          {drafts.map((d) => {
            const disabled = busyId === d.id;
            const period = d.start_date && d.end_date ? `${fmtDate(d.start_date)} → ${fmtDate(d.end_date)}` : "Période: —";
            const clientHint = d.renter_user_id ? "Client: existant" : d.walk_in_payload ? "Client: walk-in" : "Client: —";
            const vehicleHint = d.vehicle_id ? `Véhicule: ${d.vehicle_id.slice(0, 8)}…` : "Véhicule: —";
            return (
              <div key={d.id} className="rounded-lg border border-border bg-muted/30 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">
                    Brouillon {d.id.slice(0, 8)}… <span className="text-xs text-muted-foreground">· {d.status}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {period} <span className="mx-2 text-border">·</span> {clientHint} <span className="mx-2 text-border">·</span> {vehicleHint}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Modifié: {fmtDate(d.updated_at)}</div>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button asChild variant="secondary" disabled={disabled}>
                    <Link to={`/admin/bookings/new?draftId=${encodeURIComponent(d.id)}`}>Ouvrir</Link>
                  </Button>
                  <Button type="button" onClick={() => void runConvert(d.id)} disabled={disabled}>
                    Convertir
                  </Button>
                  <Button type="button" variant="destructive" onClick={() => void runDelete(d.id)} disabled={disabled}>
                    Supprimer
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

