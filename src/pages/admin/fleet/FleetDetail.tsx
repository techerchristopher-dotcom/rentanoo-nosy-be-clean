import { Link, useParams } from "react-router-dom";
import { Edit, Plus, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/page-loader";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/features/back-office/components/StatusBadge";
import { formatMoney } from "@/features/back-office/components/MoneyInput";
import { useScooter, useScooterStats, useUpdateScooterStatus } from "@/features/back-office/hooks/useScooters";
import { useVehicleStates } from "@/features/back-office/hooks/useVehicleStates";
import { useRepairs } from "@/features/back-office/hooks/useRepairs";
import {
  INTERVENTION_TYPE_LABELS,
  OPERATIONAL_STATUS_LABELS,
  REPAIR_STATUS_LABELS,
  VEHICLE_STATE_LABELS,
  type OperationalStatus,
} from "@/features/back-office/types";

export default function FleetDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { data: scooter, isLoading } = useScooter(id);
  const { data: stats } = useScooterStats(id);
  const { data: states } = useVehicleStates(id);
  const { data: repairs } = useRepairs({ vehicle_id: id });
  const updateStatus = useUpdateScooterStatus();

  const handleStatusChange = async (status: OperationalStatus) => {
    if (!id) return;
    try {
      await updateStatus.mutateAsync({ id, status });
      toast({ title: "Statut mis à jour" });
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !scooter) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground font-mono">{scooter.internal_code ?? "—"}</p>
          <h1 className="text-2xl font-bold">
            {scooter.brand} {scooter.model}
          </h1>
          <div className="mt-2">
            <StatusBadge status={scooter.operational_status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/fleet/${id}/edit`}>
              <Edit className="h-4 w-4 mr-1" />
              Modifier
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/workshop/new?vehicle=${id}`}>
              <Wrench className="h-4 w-4 mr-1" />
              Réparation
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link to={`/admin/fleet/${id}/state/new`}>
              <Plus className="h-4 w-4 mr-1" />
              État
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Coût total</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatMoney(stats?.totalCost)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Réparations</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{stats?.repairCount ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Kilométrage</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold">{scooter.mileage?.toLocaleString("fr-FR")} km</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Changer statut</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={scooter.operational_status} onValueChange={(v) => handleStatusChange(v as OperationalStatus)}>
              <SelectTrigger className="h-9">
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
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="states">Historique états</TabsTrigger>
          <TabsTrigger value="repairs">Réparations</TabsTrigger>
          <TabsTrigger value="costs">Coûts</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="pt-6 grid gap-3 sm:grid-cols-2 text-sm">
              <div><span className="text-muted-foreground">Immatriculation:</span> {scooter.license_plate ?? "—"}</div>
              <div><span className="text-muted-foreground">VIN:</span> {scooter.vin ?? "—"}</div>
              <div><span className="text-muted-foreground">Couleur:</span> {scooter.color ?? "—"}</div>
              <div><span className="text-muted-foreground">Année:</span> {scooter.year}</div>
              <div><span className="text-muted-foreground">Prix d'achat:</span> {formatMoney(scooter.purchase_price)}</div>
              <div><span className="text-muted-foreground">Tarif/jour:</span> {formatMoney(scooter.price_per_day)}</div>
              {scooter.internal_notes && (
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Notes:</span> {scooter.internal_notes}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="states" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Km</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(states ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                        Aucun état enregistré
                      </TableCell>
                    </TableRow>
                  ) : (
                    states!.map((st) => (
                      <TableRow key={st.id}>
                        <TableCell>{new Date(st.state_date).toLocaleString("fr-FR")}</TableCell>
                        <TableCell>{VEHICLE_STATE_LABELS[st.state_type]}</TableCell>
                        <TableCell>{st.mileage ?? "—"}</TableCell>
                        <TableCell className="max-w-xs truncate">{st.general_condition ?? "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repairs" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Coût</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(repairs ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        Aucune réparation
                      </TableCell>
                    </TableRow>
                  ) : (
                    repairs!.map((r: { id: string; opened_at: string; intervention_type: string; title: string; status: string; total_cost: number }) => (
                      <TableRow key={r.id}>
                        <TableCell>{new Date(r.opened_at).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell>{INTERVENTION_TYPE_LABELS[r.intervention_type as keyof typeof INTERVENTION_TYPE_LABELS] ?? r.intervention_type}</TableCell>
                        <TableCell>
                          <Link to={`/admin/workshop/${r.id}`} className="text-primary hover:underline">
                            {r.title}
                          </Link>
                        </TableCell>
                        <TableCell>{REPAIR_STATUS_LABELS[r.status as keyof typeof REPAIR_STATUS_LABELS] ?? r.status}</TableCell>
                        <TableCell>{formatMoney(r.total_cost)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Coût total réparations</span>
                <span className="font-medium">{formatMoney(stats?.totalCost)}</span>
              </div>
              <div className="flex justify-between">
                <span>Prix d'achat</span>
                <span className="font-medium">{formatMoney(scooter.purchase_price)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Coût cumulé (achat + réparations)</span>
                <span>{formatMoney(Number(scooter.purchase_price ?? 0) + Number(stats?.totalCost ?? 0))}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
