import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { adminGetExchangeRate, adminUpdateExchangeRate } from "@/services/adminApi";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { formatExchangeRateFootnote, formatAriary, eurToAriary } from "@/utils/dualCurrency";

export default function AdminExchangeSettings() {
  const { toast } = useToast();
  const { refresh, footnote } = useExchangeRate();
  const [rateStr, setRateStr] = useState("5000");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminGetExchangeRate();
        if (!cancelled) {
          setRateStr(String(data.rate));
          setEffectiveFrom(data.effectiveFrom);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          toast({
            title: "Chargement impossible",
            description: e instanceof Error ? e.message : "Erreur",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const previewRate = parseFloat(rateStr.replace(",", "."));
  const exampleEur = 70;
  const exampleAr =
    Number.isFinite(previewRate) && previewRate > 0 ? eurToAriary(exampleEur, previewRate) : 0;

  const runSave = async () => {
    const rate = parseFloat(rateStr.replace(",", "."));
    if (!Number.isFinite(rate) || rate <= 0) {
      toast({ title: "Taux invalide", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await adminUpdateExchangeRate({
        rate: Math.round(rate),
        effectiveFrom: effectiveFrom || undefined,
      });
      await refresh();
      toast({ title: "Taux enregistré" });
    } catch (e: unknown) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Taux de change EUR / Ariary</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Utilisé pour l&apos;affichage double monnaie (client et admin) et les encaissements en ariary.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration</CardTitle>
          <CardDescription>{footnote}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rate">1 € = … Ar</Label>
            <Input
              id="rate"
              inputMode="numeric"
              value={rateStr}
              onChange={(e) => setRateStr(e.target.value)}
              disabled={loading || saving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="effective">Date du taux</Label>
            <Input
              id="effective"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              disabled={loading || saving}
            />
          </div>
          {Number.isFinite(previewRate) && previewRate > 0 ? (
            <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
              <div className="text-muted-foreground">Aperçu (location 70 €) :</div>
              <div>
                Client : <strong>70,00 €</strong> · ≈ {formatAriary(exampleAr)}
              </div>
              <div>
                Admin : <strong>{formatAriary(exampleAr)}</strong> · ≈ 70,00 €
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                {formatExchangeRateFootnote({ rate: Math.round(previewRate), effectiveFrom: effectiveFrom || new Date().toISOString().slice(0, 10) })}
              </div>
            </div>
          ) : null}
          <Button type="button" onClick={() => void runSave()} disabled={loading || saving}>
            {saving ? "Enregistrement…" : "Enregistrer le taux"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
