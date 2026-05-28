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
import { PART_CATEGORIES } from "@/features/back-office/constants";
import { MoneyInput } from "@/features/back-office/components/MoneyInput";
import { useCreatePart, usePart, useUpdatePart } from "@/features/back-office/hooks/useParts";
import { useSuppliers } from "@/features/back-office/hooks/useSuppliers";

export default function PartForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: existing, isLoading } = usePart(id);
  const { data: suppliers } = useSuppliers();
  const createMutation = useCreatePart();
  const updateMutation = useUpdatePart();

  const [form, setForm] = useState({
    sku: "",
    name: "",
    category: "",
    description: "",
    unit: "unité",
    quantity_min: 0,
    purchase_price: 0,
    sale_price: 0,
    location: "",
    compatible_models: "",
    supplier_id: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        sku: existing.sku,
        name: existing.name,
        category: existing.category ?? "",
        description: existing.description ?? "",
        unit: existing.unit,
        quantity_min: existing.quantity_min,
        purchase_price: existing.purchase_price ?? 0,
        sale_price: existing.sale_price ?? 0,
        location: existing.location ?? "",
        compatible_models: (existing.compatible_models ?? []).join(", "),
        supplier_id: existing.supplier_id ?? "",
      });
    }
  }, [existing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sku || !form.name) {
      toast({ title: "SKU et nom requis", variant: "destructive" });
      return;
    }

    const payload = {
      ...form,
      category: form.category || null,
      description: form.description || null,
      location: form.location || null,
      supplier_id: form.supplier_id || null,
      compatible_models: form.compatible_models
        ? form.compatible_models.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    };

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, payload });
        toast({ title: "Pièce mise à jour" });
        navigate(`/admin/parts/${id}`);
      } else {
        const created = await createMutation.mutateAsync(payload);
        toast({ title: "Pièce créée" });
        navigate(`/admin/parts/${created.id}`);
      }
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    }
  };

  if (isEdit && isLoading) return <PageLoader />;

  return (
    <div className="space-y-4 max-w-2xl">
      <Button variant="ghost" size="sm" asChild>
        <Link to={isEdit ? `/admin/parts/${id}` : "/admin/parts"}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Link>
      </Button>

      <h1 className="text-2xl font-bold">{isEdit ? "Modifier la pièce" : "Nouvelle pièce"}</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informations</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>SKU *</Label>
              <Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} disabled={isEdit} />
            </div>
            <div>
              <Label>Nom *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir..." />
                </SelectTrigger>
                <SelectContent>
                  {PART_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unité</Label>
              <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
            </div>
            <div>
              <Label>Stock minimum</Label>
              <Input type="number" min={0} value={form.quantity_min} onChange={(e) => setForm((f) => ({ ...f, quantity_min: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <Label>Emplacement</Label>
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <div>
              <Label>Prix d'achat</Label>
              <MoneyInput value={form.purchase_price} onChange={(v) => setForm((f) => ({ ...f, purchase_price: v }))} />
            </div>
            <div>
              <Label>Prix de vente</Label>
              <MoneyInput value={form.sale_price} onChange={(v) => setForm((f) => ({ ...f, sale_price: v }))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Modèles compatibles (séparés par virgule)</Label>
              <Input value={form.compatible_models} onChange={(e) => setForm((f) => ({ ...f, compatible_models: e.target.value }))} placeholder="PCX 125, Forza 300" />
            </div>
            <div className="sm:col-span-2">
              <Label>Fournisseur</Label>
              <Select value={form.supplier_id || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, supplier_id: v === "__none__" ? "" : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucun</SelectItem>
                  {(suppliers ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 mt-4">
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
