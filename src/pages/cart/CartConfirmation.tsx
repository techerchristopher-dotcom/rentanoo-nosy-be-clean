import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Car, CheckCircle2, PartyPopper, XCircle } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface ItemResult {
  id: string;
  label: string;
  status: "success" | "failed";
  error?: string;
  thumbnail?: string;
}

export default function CartConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const results = useMemo<ItemResult[]>(() => {
    const raw = searchParams.get("results");
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [searchParams]);

  const successCount = results.filter((r) => r.status === "success").length;
  const failedCount = results.length - successCount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft/5 to-secondary-soft/10 pt-20">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="overflow-hidden border-none shadow-xl animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-gradient-lagoon px-6 py-10 text-center text-white">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-4 ring-white/20 animate-in zoom-in duration-500">
              <PartyPopper className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold">
              {successCount > 0
                ? `${successCount} demande${successCount > 1 ? "s" : ""} envoyée${successCount > 1 ? "s" : ""} !`
                : "Aucune demande envoyée"}
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Merci pour votre confiance, on s'occupe du reste.
            </p>
          </div>

          <CardContent className="space-y-5 p-6">
            <div className="space-y-2.5">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3"
                >
                  <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted/40 flex items-center justify-center shrink-0">
                    {r.thumbnail ? (
                      <img
                        src={r.thumbnail}
                        alt={r.label}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Car className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <span className="flex-1 text-sm font-medium truncate">{r.label}</span>
                  {r.status === "success" ? (
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                  ) : (
                    <div className="text-right shrink-0">
                      <XCircle className="h-5 w-5 text-destructive inline-block" />
                      <p className="text-[11px] text-destructive">{r.error || "Indisponible"}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {failedCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {failedCount} élément{failedCount > 1 ? "s" : ""} n'a pas pu être réservé
                (devenu indisponible). Les autres demandes ont bien été envoyées.
              </p>
            )}

            <p className="text-sm text-muted-foreground text-center">
              Christopher vous recontacte sous 24h pour confirmer chaque réservation.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button
                variant={user ? "outline" : "default"}
                className="flex-1"
                onClick={() => navigate("/")}
              >
                Retour à l'accueil
              </Button>
              {user && (
                <Button
                  className="flex-1"
                  onClick={() => navigate("/me/owner/bookings")}
                >
                  Voir mes réservations
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
