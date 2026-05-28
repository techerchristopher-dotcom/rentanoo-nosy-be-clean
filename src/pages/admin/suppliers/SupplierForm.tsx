import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageLoader } from "@/components/ui/page-loader";
import { useToast } from "@/hooks/use-toast";
import { useCreateSupplier, useSupplier, useUpdateSupplier } from "@/features/back-office/hooks/useSuppliers";
import { getSupplierParts, getSupplierStockHistory } from "@/features/back-office/services/suppliersService";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/features/back-office/components/MoneyInput";

export default function SupplierForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: existing, isLoading } = useSupplier(id);
  const createMutation = useCreateSupplier();
  const updateMutation = useUpdateSupplier();

  const { data: parts } = useQuery({
    queryKey: ["supplier-parts", id],
    queryFn: () => getSupplierParts(id!),
    enabled: isEdit && !!id,
  });

  const { data: stockHistory } = useQuery({
    queryKey: ["supplier-stock", id],
    queryFn: () => getSupplierStockHistory(id!),
    enabled: isEdit && !!id,
  });

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    country: "Madagascar",
    notes: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        phone: existing.phone ?? "",
        email: existing.email ?? "",
        address: existing.address ?? "",
        city: existing.city ?? "",
        country: existing.country ?? "Madagascar",
        notes: existing.notes ?? "",
      });
    }
  }, [existing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, payload: form });
        toast({ title: "Fournisseur mis à jour" });
      } else {
        const created = await createMutation.mutateAsync(form);
        toast({ title: "Fournisseur créé" });
        navigate(`/admin/suppliers/${created.id}`);
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
        <Link to={isEdit ? `/admin/suppliers/${id}` : "/admin/suppliers"}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Link>
      </Button>

      <h1 className="text-2xl font-bold">{isEdit ? "Fournisseur" : "Nouveau fournisseur"}</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Nom *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Adresse</Label>
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <Label>Ville</Label>
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <Label>Pays</Label>
              <Input value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="mt-4" disabled={createMutation.isPending || updateMutation.isPending}>
          {isEdit ? "Enregistrer" : "Créer"}
        </Button>
      </form>

      {isEdit && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pièces fournies</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableBody>
                  {(parts ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell className="text-muted-foreground py-4">Aucune pièce liée</TableCell>
                    </TableRow>
                  ) : (
                    (parts as Array<{ id: string; sku: string; name: string }>).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link to={`/admin/parts/${p.id}`} className="text-primary hover:underline">
                            {p.sku} — {p.name}
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique entrées stock</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Pièce</TableHead>
                    <TableHead>Qté</TableHead>
                    <TableHead>Coût</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stockHistory ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground py-4">Aucune entrée</TableCell>
                    </TableRow>
                  ) : (
                    stockHistory!.map((m: {
                      id: string;
                      created_at: string;
                      quantity: number;
                      unit_cost: number | null;
                      parts: { sku: string; name: string } | null;
                    }) => (
                      <TableRow key={m.id}>
                        <TableCell>{new Date(m.created_at).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell>{m.parts ? `${m.parts.sku} — ${m.parts.name}` : "—"}</TableCell>
                        <TableCell>+{m.quantity}</TableCell>
                        <TableCell>{formatMoney(m.unit_cost)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
