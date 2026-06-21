import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ItemResult {
  id: string;
  label: string;
  status: "success" | "failed";
  error?: string;
}

export default function CartConfirmation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

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
        <Card>
          <CardHeader>
            <CardTitle>
              {successCount > 0
                ? `${successCount} demande${successCount > 1 ? "s" : ""} envoyée${successCount > 1 ? "s" : ""}`
                : "Aucune demande envoyée"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 rounded-lg border p-3 text-sm"
                >
                  {r.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  <span className="flex-1">{r.label}</span>
                  {r.status === "failed" && (
                    <span className="text-xs text-destructive">{r.error || "Indisponible"}</span>
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

            <p className="text-sm text-muted-foreground">
              Christopher vous recontacte sous 24h pour confirmer chaque réservation.
            </p>

            <Button className="w-full" onClick={() => navigate("/")}>
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
