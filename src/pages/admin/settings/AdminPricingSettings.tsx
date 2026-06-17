import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  adminGetPricingConfig,
  adminSaveFeeRules,
  adminSaveDepositRules,
  adminCreateBookingOption,
  adminUpdateBookingOption,
  adminDeleteBookingOption,
  type PricingConfig,
  type PricingVehicleType,
  type PricingPaymentMethod,
  type BookingOptionRow,
} from "@/services/adminApi";

const CATEGORY_LABELS: Record<PricingVehicleType, string> = {
  car: "Voiture",
  moto: "Moto",
  scooter: "Scooter",
  quad: "Quad",
  accommodation: "Hébergement",
};

const PAYMENT_LABELS: Record<PricingPaymentMethod, string> = {
  card_online: "Carte en ligne",
  cash_on_site: "Espèces sur place",
};

type FeeGrid = Record<string, string>; // key: `${vehicleType}:${paymentMethod}` -> "% string"
type DepositGrid = Record<PricingVehicleType, boolean>;

const EMPTY_OPTION_FORM = {
  optionKey: "",
  name: "",
  description: "",
  priceMga: "",
  pricingMode: "flat" as "flat" | "per_day",
  categories: [] as PricingVehicleType[],
};

export default function AdminPricingSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [feeGrid, setFeeGrid] = useState<FeeGrid>({});
  const [savingFees, setSavingFees] = useState(false);
  const [depositGrid, setDepositGrid] = useState<DepositGrid>({} as DepositGrid);
  const [savingDeposit, setSavingDeposit] = useState(false);
  const [options, setOptions] = useState<BookingOptionRow[]>([]);
  const [newOption, setNewOption] = useState(EMPTY_OPTION_FORM);
  const [creatingOption, setCreatingOption] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminGetPricingConfig();
      setConfig(data);
      setOptions(data.options);

      const fg: FeeGrid = {};
      for (const vt of data.vehicleTypes) {
        for (const pm of data.paymentMethods) {
          const rule = data.feeRules.find((r) => r.vehicle_type === vt && r.payment_method === pm);
          fg[`${vt}:${pm}`] = rule ? String(Math.round(rule.fee_percent * 1000) / 10) : "";
        }
      }
      setFeeGrid(fg);

      const dg: DepositGrid = {} as DepositGrid;
      for (const vt of data.vehicleTypes) {
        const rule = data.depositRules.find((r) => r.vehicle_type === vt);
        dg[vt] = rule ? rule.deposit_enabled : true;
      }
      setDepositGrid(dg);
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
  }, []);

  const saveFees = async () => {
    if (!config) return;
    setSavingFees(true);
    try {
      const rules = config.vehicleTypes.flatMap((vt) =>
        config.paymentMethods.map((pm) => {
          const raw = feeGrid[`${vt}:${pm}`] ?? "";
          const pct = parseFloat(raw.replace(",", "."));
          return { vehicleType: vt, paymentMethod: pm, feePercent: Number.isFinite(pct) ? pct / 100 : 0 };
        })
      );
      for (const r of rules) {
        if (r.feePercent < 0 || r.feePercent > 1) {
          toast({ title: "Pourcentage invalide", description: "Entre 0 et 100%.", variant: "destructive" });
          setSavingFees(false);
          return;
        }
      }
      await adminSaveFeeRules(rules);
      toast({ title: "Frais de service enregistrés" });
    } catch (e: unknown) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setSavingFees(false);
    }
  };

  const saveDeposit = async () => {
    if (!config) return;
    setSavingDeposit(true);
    try {
      const rules = config.vehicleTypes.map((vt) => ({
        vehicleType: vt,
        depositEnabled: depositGrid[vt] ?? true,
      }));
      await adminSaveDepositRules(rules);
      toast({ title: "Réglages caution enregistrés" });
    } catch (e: unknown) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setSavingDeposit(false);
    }
  };

  const toggleOptionActive = async (opt: BookingOptionRow, active: boolean) => {
    setOptions((prev) => prev.map((o) => (o.id === opt.id ? { ...o, active } : o)));
    try {
      await adminUpdateBookingOption(opt.id, { active });
    } catch (e: unknown) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
      setOptions((prev) => prev.map((o) => (o.id === opt.id ? { ...o, active: !active } : o)));
    }
  };

  const updateOptionPrice = (id: string, priceMga: string) => {
    setOptions((prev) =>
      prev.map((o) => (o.id === id ? { ...o, price_mga: Number(priceMga) || 0 } : o))
    );
  };

  const saveOptionPrice = async (opt: BookingOptionRow) => {
    try {
      await adminUpdateBookingOption(opt.id, { priceMga: opt.price_mga });
      toast({ title: "Prix mis à jour" });
    } catch (e: unknown) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    }
  };

  const toggleOptionCategory = async (opt: BookingOptionRow, category: PricingVehicleType) => {
    const has = opt.categories.includes(category);
    const nextCategories = has
      ? opt.categories.filter((c) => c !== category)
      : [...opt.categories, category];
    setOptions((prev) => prev.map((o) => (o.id === opt.id ? { ...o, categories: nextCategories } : o)));
    try {
      await adminUpdateBookingOption(opt.id, { categories: nextCategories });
    } catch (e: unknown) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
      setOptions((prev) => prev.map((o) => (o.id === opt.id ? { ...o, categories: opt.categories } : o)));
    }
  };

  const deleteOption = async (opt: BookingOptionRow) => {
    if (!window.confirm(`Supprimer l'option "${opt.name}" ?`)) return;
    try {
      await adminDeleteBookingOption(opt.id);
      setOptions((prev) => prev.filter((o) => o.id !== opt.id));
      toast({ title: "Option supprimée" });
    } catch (e: unknown) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    }
  };

  const createOption = async () => {
    if (!newOption.optionKey || !newOption.name || !newOption.priceMga) {
      toast({ title: "Champs requis manquants", variant: "destructive" });
      return;
    }
    setCreatingOption(true);
    try {
      const created = await adminCreateBookingOption({
        optionKey: newOption.optionKey,
        name: newOption.name,
        description: newOption.description || undefined,
        priceMga: Number(newOption.priceMga),
        pricingMode: newOption.pricingMode,
        categories: newOption.categories,
      });
      setOptions((prev) => [...prev, created]);
      setNewOption(EMPTY_OPTION_FORM);
      toast({ title: "Option créée" });
    } catch (e: unknown) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setCreatingOption(false);
    }
  };

  if (loading || !config) {
    return <div className="p-6 text-muted-foreground">Chargement…</div>;
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Tarification & options</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Frais de service, catalogue d'options et caution, configurables par catégorie de bien.
          Les changements se reflètent immédiatement côté client (nouvelles réservations).
        </p>
      </div>

      {/* Frais de service */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Frais de service par catégorie</CardTitle>
          <CardDescription>
            % appliqué au sous-total client selon la catégorie du bien et le mode de paiement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Catégorie</TableHead>
                {config.paymentMethods.map((pm) => (
                  <TableHead key={pm}>{PAYMENT_LABELS[pm]}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {config.vehicleTypes.map((vt) => (
                <TableRow key={vt}>
                  <TableCell className="font-medium">{CATEGORY_LABELS[vt]}</TableCell>
                  {config.paymentMethods.map((pm) => (
                    <TableCell key={pm}>
                      <div className="flex items-center gap-1">
                        <Input
                          className="w-20"
                          inputMode="decimal"
                          value={feeGrid[`${vt}:${pm}`] ?? ""}
                          onChange={(e) =>
                            setFeeGrid((prev) => ({ ...prev, [`${vt}:${pm}`]: e.target.value }))
                          }
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button className="mt-4" onClick={() => void saveFees()} disabled={savingFees}>
            {savingFees ? "Enregistrement…" : "Enregistrer les frais"}
          </Button>
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Options de réservation</CardTitle>
          <CardDescription>
            Prix, activation et catégories autorisées pour chaque option proposée au client.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {options.map((opt) => (
            <div key={opt.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{opt.name}</div>
                  <div className="text-xs text-muted-foreground">{opt.option_key}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={opt.active} onCheckedChange={(v) => void toggleOptionActive(opt, v)} />
                  <Button variant="ghost" size="sm" onClick={() => void deleteOption(opt)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  className="w-32"
                  inputMode="numeric"
                  value={opt.price_mga}
                  onChange={(e) => updateOptionPrice(opt.id, e.target.value)}
                />
                <span className="text-sm text-muted-foreground">Ar ({opt.pricing_mode === "flat" ? "forfait" : "par jour"})</span>
                <Button variant="outline" size="sm" onClick={() => void saveOptionPrice(opt)}>
                  Enregistrer le prix
                </Button>
              </div>

              <div className="flex flex-wrap gap-3">
                {config.vehicleTypes.map((vt) => (
                  <label key={vt} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={opt.categories.includes(vt)}
                      onCheckedChange={() => void toggleOptionCategory(opt, vt)}
                    />
                    {CATEGORY_LABELS[vt]}
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* Nouvelle option */}
          <div className="rounded-lg border border-dashed p-4 space-y-3">
            <div className="font-medium text-sm">Ajouter une option</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="opt-key">Identifiant (option_key)</Label>
                <Input
                  id="opt-key"
                  placeholder="ex: child-seat"
                  value={newOption.optionKey}
                  onChange={(e) => setNewOption((p) => ({ ...p, optionKey: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="opt-name">Nom</Label>
                <Input
                  id="opt-name"
                  placeholder="ex: Siège bébé"
                  value={newOption.name}
                  onChange={(e) => setNewOption((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="opt-price">Prix (Ar)</Label>
                <Input
                  id="opt-price"
                  inputMode="numeric"
                  value={newOption.priceMga}
                  onChange={(e) => setNewOption((p) => ({ ...p, priceMga: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="opt-desc">Description (optionnel)</Label>
                <Input
                  id="opt-desc"
                  value={newOption.description}
                  onChange={(e) => setNewOption((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {config.vehicleTypes.map((vt) => (
                <label key={vt} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={newOption.categories.includes(vt)}
                    onCheckedChange={(checked) =>
                      setNewOption((p) => ({
                        ...p,
                        categories: checked
                          ? [...p.categories, vt]
                          : p.categories.filter((c) => c !== vt),
                      }))
                    }
                  />
                  {CATEGORY_LABELS[vt]}
                </label>
              ))}
            </div>
            <Button onClick={() => void createOption()} disabled={creatingOption}>
              <Plus className="h-4 w-4 mr-2" />
              {creatingOption ? "Création…" : "Créer l'option"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Caution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Caution par catégorie</CardTitle>
          <CardDescription>
            Désactive la caution pour toutes les annonces d'une catégorie, indépendamment du montant
            réglé par chaque propriétaire.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.vehicleTypes.map((vt) => (
            <div key={vt} className="flex items-center justify-between rounded-lg border p-3">
              <span>{CATEGORY_LABELS[vt]}</span>
              <Switch
                checked={depositGrid[vt] ?? true}
                onCheckedChange={(v) => setDepositGrid((prev) => ({ ...prev, [vt]: v }))}
              />
            </div>
          ))}
          <Button onClick={() => void saveDeposit()} disabled={savingDeposit}>
            {savingDeposit ? "Enregistrement…" : "Enregistrer la caution"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
