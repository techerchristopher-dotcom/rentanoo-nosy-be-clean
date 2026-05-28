import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Edit, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/page-loader";
import { useToast } from "@/hooks/use-toast";
import { LowStockBadge } from "@/features/back-office/components/LowStockBadge";
import { MoneyInput, formatMoney } from "@/features/back-office/components/MoneyInput";
import { usePart } from "@/features/back-office/hooks/useParts";
import { useStockIn, useStockMovements } from "@/features/back-office/hooks/useStock";
import { STOCK_MOVEMENT_LABELS, type StockMovementType } from "@/features/back-office/types";

function StockInDialog({ partId }: { partId: string }) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [reason, setReason] = useState("");
  const stockIn = useStockIn();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await stockIn.mutateAsync({ part_id: partId, quantity, unit_cost: unitCost, reason });
      toast({ title: "Entrée de stock enregistrée" });
      setOpen(false);
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PackagePlus className="h-4 w-4 mr-1" />
          Entrée stock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Entrée de stock</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Quantité</Label>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} />
          </div>
          <div>
            <Label>Coût unitaire</Label>
            <MoneyInput value={unitCost} onChange={setUnitCost} />
          </div>
          <div>
            <Label>Raison</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Achat fournisseur..." />
          </div>
          <Button type="submit" disabled={stockIn.isPending} className="w-full">
            Enregistrer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PartDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: part, isLoading } = usePart(id);
  const { data: movements } = useStockMovements({ part_id: id, limit: 50 });

  if (isLoading || !part) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-sm font-mono text-muted-foreground">{part.sku}</p>
          <h1 className="text-2xl font-bold">{part.name}</h1>
          <LowStockBadge part={part} />
        </div>
        <div className="flex gap-2">
          <StockInDialog partId={part.id} />
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/parts/${part.id}/edit`}>
              <Edit className="h-4 w-4 mr-1" />
              Modifier
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Stock actuel</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">
            {part.quantity_on_hand} {part.unit}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Seuil minimum</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{part.quantity_min}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Prix achat</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatMoney(part.purchase_price)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Prix vente</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatMoney(part.sale_price)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historique mouvements</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantité</TableHead>
                <TableHead>Coût unit.</TableHead>
                <TableHead>Raison</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(movements ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    Aucun mouvement
                  </TableCell>
                </TableRow>
              ) : (
                movements!.map((m: {
                  id: string;
                  created_at: string;
                  movement_type: StockMovementType;
                  quantity: number;
                  unit_cost: number | null;
                  reason: string | null;
                }) => (
                  <TableRow key={m.id}>
                    <TableCell>{new Date(m.created_at).toLocaleString("fr-FR")}</TableCell>
                    <TableCell>{STOCK_MOVEMENT_LABELS[m.movement_type]}</TableCell>
                    <TableCell className={m.quantity > 0 ? "text-green-600" : "text-red-600"}>
                      {m.quantity > 0 ? "+" : ""}
                      {m.quantity}
                    </TableCell>
                    <TableCell>{formatMoney(m.unit_cost)}</TableCell>
                    <TableCell>{m.reason ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
