import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { MoneyInput } from "@/features/back-office/components/MoneyInput";
import { useCreateRepair } from "@/features/back-office/hooks/useRepairs";
import { useScooters } from "@/features/back-office/hooks/useScooters";
import { INTERVENTION_TYPE_LABELS, type InterventionType } from "@/features/back-office/types";

export default function RepairForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: scooters } = useScooters();
  const createRepair = useCreateRepair();

  const [form, setForm] = useState({
    vehicle_id: searchParams.get("vehicle") ?? "",
    intervention_type: "autre" as InterventionType,
    title: "",
    description: "",
    mileage_at_repair: "",
    labor_cost: 0,
    notes: "",
  });

  useEffect(() => {
    const v = searchParams.get("vehicle");
    if (v) setForm((f) => ({ ...f, vehicle_id: v }));
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicle_id || !form.title) {
      toast({ title: "Scooter et titre requis", variant: "destructive" });
      return;
    }

    try {
      const created = await createRepair.mutateAsync({
        vehicle_id: form.vehicle_id,
        intervention_type: form.intervention_type,
        title: form.title,
        description: form.description || null,
        mileage_at_repair: form.mileage_at_repair ? parseInt(form.mileage_at_repair) : null,
        labor_cost: form.labor_cost,
        notes: form.notes || null,
      });
      toast({ title: "Intervention créée" });
      navigate(`/admin/workshop/${created.id}`);
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/admin/workshop">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Link>
      </Button>

      <h1 className="text-2xl font-bold">Nouvelle intervention</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Détails</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label>Scooter *</Label>
              <Select value={form.vehicle_id} onValueChange={(v) => setForm((f) => ({ ...f, vehicle_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un scooter..." />
                </SelectTrigger>
                <SelectContent>
                  {(scooters ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.internal_code ?? s.license_plate ?? s.id.slice(0, 8)} — {s.brand} {s.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type d'intervention</Label>
              <Select value={form.intervention_type} onValueChange={(v) => setForm((f) => ({ ...f, intervention_type: v as InterventionType }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(INTERVENTION_TYPE_LABELS) as InterventionType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {INTERVENTION_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Titre *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <Label>Kilométrage</Label>
              <Input type="number" value={form.mileage_at_repair} onChange={(e) => setForm((f) => ({ ...f, mileage_at_repair: e.target.value }))} />
            </div>
            <div>
              <Label>Main-d'œuvre</Label>
              <MoneyInput value={form.labor_cost} onChange={(v) => setForm((f) => ({ ...f, labor_cost: v }))} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="mt-4" disabled={createRepair.isPending}>
          Créer l'intervention
        </Button>
      </form>
    </div>
  );
}
