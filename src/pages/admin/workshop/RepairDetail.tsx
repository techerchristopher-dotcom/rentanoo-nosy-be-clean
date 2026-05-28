import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/page-loader";
import { useToast } from "@/hooks/use-toast";
import { RepairPartsLineEditor } from "@/features/back-office/components/RepairPartsLineEditor";
import { MoneyInput, formatMoney } from "@/features/back-office/components/MoneyInput";
import {
  useCancelRepair,
  useCloseRepair,
  useConsumePartsForRepair,
  useRepair,
  useUpdateRepair,
} from "@/features/back-office/hooks/useRepairs";
import { INTERVENTION_TYPE_LABELS, REPAIR_STATUS_LABELS } from "@/features/back-office/types";
import type { RepairPartLineInput } from "@/features/back-office/types";

export default function RepairDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: repair, isLoading, refetch } = useRepair(id);
  const updateRepair = useUpdateRepair();
  const closeRepair = useCloseRepair();
  const cancelRepair = useCancelRepair();
  const consumeParts = useConsumePartsForRepair();

  const [partLines, setPartLines] = useState<(RepairPartLineInput & { label?: string })[]>([]);
  const [laborCost, setLaborCost] = useState(0);

  if (isLoading || !repair) return <PageLoader />;

  const isClosed = repair.status === "done" || repair.status === "cancelled";
  const vehicle = repair.vehicles as { internal_code: string | null; brand: string; model: string } | null;
  const repairParts = (repair.repair_parts ?? []) as Array<{
    id: string;
    quantity: number;
    unit_cost: number;
    line_total: number;
    parts: { sku: string; name: string } | null;
  }>;

  const handleConsumeParts = async () => {
    if (!id || partLines.length === 0) return;
    try {
      await consumeParts.mutateAsync({ repairId: id, lines: partLines });
      toast({ title: "Pièces consommées" });
      setPartLines([]);
      refetch();
    } catch (err) {
      toast({
        title: "Erreur stock",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    }
  };

  const handleClose = async () => {
    if (!id) return;
    try {
      if (laborCost !== repair.labor_cost) {
        await updateRepair.mutateAsync({ id, payload: { labor_cost: laborCost } });
      }
      await closeRepair.mutateAsync(id);
      toast({ title: "Intervention clôturée" });
      refetch();
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    }
  };

  const handleCancel = async () => {
    if (!id || !confirm("Annuler cette réparation et restaurer le stock ?")) return;
    try {
      await cancelRepair.mutateAsync(id);
      toast({ title: "Réparation annulée" });
      refetch();
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {vehicle?.internal_code ?? `${vehicle?.brand} ${vehicle?.model}`}
          </p>
          <h1 className="text-2xl font-bold">{repair.title}</h1>
          <p className="text-sm">
            {INTERVENTION_TYPE_LABELS[repair.intervention_type]} —{" "}
            {REPAIR_STATUS_LABELS[repair.status]}
          </p>
        </div>
        {!isClosed && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleClose} disabled={closeRepair.isPending}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Clôturer
            </Button>
            <Button size="sm" variant="destructive" onClick={handleCancel} disabled={cancelRepair.isPending}>
              <XCircle className="h-4 w-4 mr-1" />
              Annuler
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pièces</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatMoney(repair.parts_cost)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Main-d'œuvre</CardTitle>
          </CardHeader>
          <CardContent>
            {isClosed ? (
              <span className="text-xl font-bold">{formatMoney(repair.labor_cost)}</span>
            ) : (
              <MoneyInput value={laborCost || repair.labor_cost} onChange={setLaborCost} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatMoney(repair.total_cost)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pièces utilisées</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pièce</TableHead>
                <TableHead>Qté</TableHead>
                <TableHead>Coût unit.</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repairParts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                    Aucune pièce consommée
                  </TableCell>
                </TableRow>
              ) : (
                repairParts.map((rp) => (
                  <TableRow key={rp.id}>
                    <TableCell>{rp.parts ? `${rp.parts.sku} — ${rp.parts.name}` : "—"}</TableCell>
                    <TableCell>{rp.quantity}</TableCell>
                    <TableCell>{formatMoney(rp.unit_cost)}</TableCell>
                    <TableCell>{formatMoney(rp.line_total)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!isClosed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ajouter des pièces</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RepairPartsLineEditor lines={partLines} onChange={setPartLines} disabled={consumeParts.isPending} />
            <Button onClick={handleConsumeParts} disabled={partLines.length === 0 || consumeParts.isPending}>
              Consommer les pièces
            </Button>
          </CardContent>
        </Card>
      )}

      {repair.description && (
        <Card>
          <CardContent className="pt-6 text-sm">
            <Label className="text-muted-foreground">Description</Label>
            <p className="mt-1">{repair.description}</p>
          </CardContent>
        </Card>
      )}

      {vehicle && (
        <Button variant="link" asChild className="px-0">
          <Link to={`/admin/fleet/${repair.vehicle_id}`}>Voir le scooter</Link>
        </Button>
      )}
    </div>
  );
}
