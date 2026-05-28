import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/page-loader";
import { formatMoney } from "@/features/back-office/components/MoneyInput";
import { useStockMovements } from "@/features/back-office/hooks/useStock";
import { STOCK_MOVEMENT_LABELS, type StockMovementType } from "@/features/back-office/types";
import { useState } from "react";

export default function StockMovementsList() {
  const [type, setType] = useState<StockMovementType | "all">("all");
  const { data: movements, isLoading } = useStockMovements({
    movement_type: type,
    limit: 100,
  });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mouvements de stock</h1>
          <p className="text-sm text-muted-foreground">Historique global (lecture seule)</p>
        </div>
        <Select value={type} onValueChange={(v) => setType(v as StockMovementType | "all")}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {(Object.keys(STOCK_MOVEMENT_LABELS) as StockMovementType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {STOCK_MOVEMENT_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Pièce</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Qté</TableHead>
                <TableHead>Coût</TableHead>
                <TableHead>Raison</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(movements ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
                  parts: { sku: string; name: string } | null;
                }) => (
                  <TableRow key={m.id}>
                    <TableCell>{new Date(m.created_at).toLocaleString("fr-FR")}</TableCell>
                    <TableCell>
                      {m.parts ? (
                        <Link to={`/admin/parts/${(m as { part_id: string }).part_id}`} className="text-primary hover:underline">
                          {m.parts.sku} — {m.parts.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{STOCK_MOVEMENT_LABELS[m.movement_type]}</TableCell>
                    <TableCell className={m.quantity > 0 ? "text-green-600" : "text-red-600"}>
                      {m.quantity > 0 ? "+" : ""}
                      {m.quantity}
                    </TableCell>
                    <TableCell>{formatMoney(m.unit_cost)}</TableCell>
                    <TableCell className="max-w-xs truncate">{m.reason ?? "—"}</TableCell>
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
