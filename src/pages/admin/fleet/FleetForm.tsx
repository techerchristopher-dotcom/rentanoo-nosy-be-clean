import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import { PageLoader } from "@/components/ui/page-loader";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { MoneyInput } from "@/features/back-office/components/MoneyInput";
import { useCreateScooter, useScooter, useUpdateScooter } from "@/features/back-office/hooks/useScooters";
import { OPERATIONAL_STATUS_LABELS, type OperationalStatus } from "@/features/back-office/types";

export default function FleetForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: existing, isLoading } = useScooter(id);
  const createMutation = useCreateScooter();
  const updateMutation = useUpdateScooter();

  const [form, setForm] = useState({
    internal_code: "",
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    license_plate: "",
    vin: "",
    mileage: 0,
    purchase_date: "",
    purchase_price: 0,
    price_per_day: 15,
    operational_status: "available" as OperationalStatus,
    internal_notes: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        internal_code: existing.internal_code ?? "",
        brand: existing.brand,
        model: existing.model,
        year: existing.year,
        color: existing.color ?? "",
        license_plate: existing.license_plate ?? "",
        vin: existing.vin ?? "",
        mileage: existing.mileage ?? 0,
        purchase_date: existing.purchase_date ?? "",
        purchase_price: existing.purchase_price ?? 0,
        price_per_day: existing.price_per_day,
        operational_status: existing.operational_status,
        internal_notes: existing.internal_notes ?? "",
      });
    }
  }, [existing]);

  const set = (key: keyof typeof form, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.brand || !form.model) {
      toast({ title: "Marque et modèle requis", variant: "destructive" });
      return;
    }

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, payload: form });
        toast({ title: "Scooter mis à jour" });
        navigate(`/admin/fleet/${id}`);
      } else {
        if (!user?.id) {
          toast({ title: "Utilisateur non connecté", variant: "destructive" });
          return;
        }
        const created = await createMutation.mutateAsync({
          ...form,
          owner_id: user.id,
          vehicle_type: "scooter",
          fuel_type: "essence",
          transmission: "automatique",
          seats: 2,
        });
        toast({ title: "Scooter créé" });
        navigate(`/admin/fleet/${created.id}`);
      }
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Échec de l'enregistrement",
        variant: "destructive",
      });
    }
  };

  if (isEdit && isLoading) return <PageLoader />;

  return (
    <div className="space-y-4 max-w-2xl">
      <Button variant="ghost" size="sm" asChild>
        <Link to={isEdit ? `/admin/fleet/${id}` : "/admin/fleet"}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Link>
      </Button>

      <h1 className="text-2xl font-bold">{isEdit ? "Modifier le scooter" : "Nouveau scooter"}</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Code interne</Label>
              <Input value={form.internal_code} onChange={(e) => set("internal_code", e.target.value)} placeholder="S-001" />
            </div>
            <div>
              <Label>Immatriculation</Label>
              <Input value={form.license_plate} onChange={(e) => set("license_plate", e.target.value)} />
            </div>
            <div>
              <Label>Marque *</Label>
              <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} required />
            </div>
            <div>
              <Label>Modèle *</Label>
              <Input value={form.model} onChange={(e) => set("model", e.target.value)} required />
            </div>
            <div>
              <Label>Année</Label>
              <Input type="number" value={form.year} onChange={(e) => set("year", parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Couleur</Label>
              <Input value={form.color} onChange={(e) => set("color", e.target.value)} />
            </div>
            <div>
              <Label>VIN / Châssis</Label>
              <Input value={form.vin} onChange={(e) => set("vin", e.target.value)} />
            </div>
            <div>
              <Label>Kilométrage</Label>
              <Input type="number" value={form.mileage} onChange={(e) => set("mileage", parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Date d'achat</Label>
              <Input type="date" value={form.purchase_date} onChange={(e) => set("purchase_date", e.target.value)} />
            </div>
            <div>
              <Label>Prix d'achat</Label>
              <MoneyInput value={form.purchase_price} onChange={(v) => set("purchase_price", v)} />
            </div>
            <div>
              <Label>Tarif / jour</Label>
              <MoneyInput value={form.price_per_day} onChange={(v) => set("price_per_day", v)} />
            </div>
            <div>
              <Label>Statut opérationnel</Label>
              <Select value={form.operational_status} onValueChange={(v) => set("operational_status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(OPERATIONAL_STATUS_LABELS) as OperationalStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {OPERATIONAL_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Notes internes</Label>
              <Textarea value={form.internal_notes} onChange={(e) => set("internal_notes", e.target.value)} rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 mt-4">
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {isEdit ? "Enregistrer" : "Créer"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to={isEdit ? `/admin/fleet/${id}` : "/admin/fleet"}>Annuler</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
