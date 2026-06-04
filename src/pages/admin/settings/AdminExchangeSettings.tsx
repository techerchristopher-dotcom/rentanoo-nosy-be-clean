import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import {
  adminGetExchangeRate,
  adminRefreshExchangeRate,
  adminUpdateExchangeRate,
  type EurMgaExchangeRate,
} from "@/services/adminApi";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { formatExchangeRateFootnote, formatAriary, formatEur, ariaryToEur } from "@/utils/dualCurrency";
import { cn } from "@/lib/utils";

type RateMode = "manual" | "live";

function formatFetchedAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminExchangeSettings() {
  const { toast } = useToast();
  const { refresh: refreshPublicRate } = useExchangeRate();
  const [mode, setMode] = useState<RateMode>("manual");
  const [rateStr, setRateStr] = useState("5000");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [liveMeta, setLiveMeta] = useState<Pick<EurMgaExchangeRate, "lastFetchedAt" | "lastLiveRate">>({
    lastFetchedAt: null,
    lastLiveRate: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const applySettings = (data: EurMgaExchangeRate) => {
    setMode(data.mode);
    setRateStr(String(data.rate));
    setEffectiveFrom(data.effectiveFrom);
    setLiveMeta({ lastFetchedAt: data.lastFetchedAt, lastLiveRate: data.lastLiveRate });
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminGetExchangeRate();
        if (!cancelled) applySettings(data);
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
  const displayRate = mode === "live" ? (liveMeta.lastLiveRate ?? previewRate) : previewRate;
  const exampleMga = 50_000;
  const exampleEur =
    Number.isFinite(displayRate) && displayRate > 0 ? ariaryToEur(exampleMga, displayRate) : 0;

  const footnotePreview = formatExchangeRateFootnote(
    {
      rate: Math.round(Number.isFinite(displayRate) ? displayRate : 0),
      effectiveFrom: effectiveFrom || new Date().toISOString().slice(0, 10),
    },
    { mode }
  );

  const runSaveManual = async () => {
    const rate = parseFloat(rateStr.replace(",", "."));
    if (!Number.isFinite(rate) || rate <= 0) {
      toast({ title: "Taux invalide", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const data = await adminUpdateExchangeRate({
        mode: "manual",
        rate: Math.round(rate),
        effectiveFrom: effectiveFrom || undefined,
      });
      applySettings(data);
      await refreshPublicRate();
      toast({ title: "Taux fixe enregistré" });
    } catch (e: unknown) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const runSwitchToLive = async () => {
    setSaving(true);
    try {
      const data = await adminUpdateExchangeRate({ mode: "live" });
      applySettings(data);
      await refreshPublicRate();
      toast({ title: "Taux live activé", description: "Taux Frankfurter appliqué." });
    } catch (e: unknown) {
      toast({
        title: "Frankfurter indisponible",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const runRefreshLive = async () => {
    setRefreshing(true);
    try {
      const data = await adminRefreshExchangeRate();
      applySettings(data);
      await refreshPublicRate();
      toast({ title: "Taux actualisé", description: `1 € = ${data.rate.toLocaleString("fr-FR")} Ar` });
    } catch (e: unknown) {
      toast({
        title: "Actualisation impossible",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const onModeChange = (next: RateMode) => {
    setMode(next);
    if (next === "live") void runSwitchToLive();
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Taux de change EUR / Ariary</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Affichage double monnaie et encaissements en ariary. Mode live : taux mid-market Frankfurter, sans marge.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Source du taux</CardTitle>
          <CardDescription>{footnotePreview}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <RadioGroup
            value={mode}
            onValueChange={(v) => onModeChange(v as RateMode)}
            className="space-y-3"
            disabled={loading || saving || refreshing}
          >
            <Label
              htmlFor="mode-manual"
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 cursor-pointer",
                mode === "manual" ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <RadioGroupItem value="manual" id="mode-manual" className="mt-0.5" />
              <div>
                <div className="font-medium">Taux fixe (manuel)</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Vous saisissez 1 € = … Ar et la date du taux.
                </div>
              </div>
            </Label>
            <Label
              htmlFor="mode-live"
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 cursor-pointer",
                mode === "live" ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <RadioGroupItem value="live" id="mode-live" className="mt-0.5" />
              <div>
                <div className="font-medium">Taux live Frankfurter</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Mid-market quotidien (banques centrales). Actualisation auto toutes les 6 h.
                </div>
              </div>
            </Label>
          </RadioGroup>

          {mode === "manual" ? (
            <>
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
              <Button type="button" onClick={() => void runSaveManual()} disabled={loading || saving}>
                {saving ? "Enregistrement…" : "Enregistrer le taux fixe"}
              </Button>
            </>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Taux appliqué</span>
                <span className="font-bold tabular-nums">
                  1 € = {Number.isFinite(displayRate) ? displayRate.toLocaleString("fr-FR") : "—"} Ar
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Date Frankfurter</span>
                <span>{effectiveFrom || "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Dernière sync</span>
                <span>{formatFetchedAt(liveMeta.lastFetchedAt)}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void runRefreshLive()}
                disabled={loading || saving || refreshing}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
                {refreshing ? "Actualisation…" : "Actualiser depuis Frankfurter"}
              </Button>
            </div>
          )}

          {Number.isFinite(displayRate) && displayRate > 0 ? (
            <div className="rounded-lg bg-muted/40 p-3 text-sm space-y-1">
              <div className="text-muted-foreground">Aperçu (scooter 50 000 Ar / jour) :</div>
              <div>
                Client : <strong>{formatEur(exampleEur)}</strong> · {formatAriary(exampleMga)}
              </div>
              <div>
                Admin : <strong>{formatAriary(exampleMga)}</strong> · ≈ {formatEur(exampleEur)}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
