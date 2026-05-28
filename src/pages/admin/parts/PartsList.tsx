import { Link } from "react-router-dom";
import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/page-loader";
import { LowStockBadge } from "@/features/back-office/components/LowStockBadge";
import { formatMoney } from "@/features/back-office/components/MoneyInput";
import { useParts } from "@/features/back-office/hooks/useParts";

export default function PartsList() {
  const { data: parts, isLoading } = useParts();
  const lowStock = parts?.filter((p) => p.quantity_on_hand <= p.quantity_min) ?? [];

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pièces détachées</h1>
          <p className="text-sm text-muted-foreground">{parts?.length ?? 0} référence(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/admin/parts/movements">Mouvements</Link>
          </Button>
          <Button asChild>
            <Link to="/admin/parts/new">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle pièce
            </Link>
          </Button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 flex items-start gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <span>
              <strong>{lowStock.length}</strong> pièce(s) en stock bas
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Prix achat</TableHead>
                <TableHead>Prix vente</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(parts ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Aucune pièce
                  </TableCell>
                </TableRow>
              ) : (
                parts!.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.sku}</TableCell>
                    <TableCell>
                      <div>{p.name}</div>
                      <LowStockBadge part={p} />
                    </TableCell>
                    <TableCell>{p.category ?? "—"}</TableCell>
                    <TableCell>
                      {p.quantity_on_hand} {p.unit}
                    </TableCell>
                    <TableCell>{formatMoney(p.purchase_price)}</TableCell>
                    <TableCell>{formatMoney(p.sale_price)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/admin/parts/${p.id}`}>Voir</Link>
                      </Button>
                    </TableCell>
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
