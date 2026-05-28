import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/page-loader";
import { useToast } from "@/hooks/use-toast";
import { useCreateMaintenanceRule, useMaintenanceAlerts, useMaintenanceRules } from "@/features/back-office/hooks/useMaintenance";
import { useScooters } from "@/features/back-office/hooks/useScooters";
import { INTERVENTION_TYPE_LABELS, type InterventionType } from "@/features/back-office/types";

const STATUS_COLORS = {
  ok: "bg-green-100 text-green-800",
  soon: "bg-amber-100 text-amber-800",
  overdue: "bg-red-100 text-red-800",
};

export default function MaintenancePage() {
  const { toast } = useToast();
  const { data: rules, isLoading: rulesLoading } = useMaintenanceRules();
  const { data: alerts, isLoading: alertsLoading } = useMaintenanceAlerts();
  const { data: scooters } = useScooters();
  const createRule = useCreateMaintenanceRule();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    vehicle_id: "",
    model_filter: "",
    maintenance_type: "vidange" as InterventionType,
    interval_km: 1000,
    interval_days: "",
  });

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRule.mutateAsync({
        vehicle_id: form.vehicle_id || null,
        model_filter: form.model_filter || null,
        maintenance_type: form.maintenance_type,
        interval_km: form.interval_km || null,
        interval_days: form.interval_days ? parseInt(form.interval_days) : null,
      });
      toast({ title: "Règle créée" });
      setShowForm(false);
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    }
  };

  if (rulesLoading || alertsLoading) return <PageLoader />;

  const overdue = alerts?.filter((a) => a.status === "overdue") ?? [];
  const soon = alerts?.filter((a) => a.status === "soon") ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Maintenance préventive</h1>
          <p className="text-sm text-muted-foreground">Alertes et règles d'entretien</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle règle
        </Button>
      </div>

      {(overdue.length > 0 || soon.length > 0) && (
        <Card className="border-amber-200">
          <CardContent className="pt-4 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="text-sm">
              <strong>{overdue.length}</strong> en retard, <strong>{soon.length}</strong> bientôt nécessaire(s)
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nouvelle règle</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateRule} className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Scooter spécifique (optionnel)</Label>
                <Select value={form.vehicle_id || "__all__"} onValueChange={(v) => setForm((f) => ({ ...f, vehicle_id: v === "__all__" ? "" : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous / par modèle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tous (filtre modèle)</SelectItem>
                    {(scooters ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.internal_code ?? s.brand} — {s.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Filtre modèle (si pas de scooter)</Label>
                <Input value={form.model_filter} onChange={(e) => setForm((f) => ({ ...f, model_filter: e.target.value }))} placeholder="PCX 125" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.maintenance_type} onValueChange={(v) => setForm((f) => ({ ...f, maintenance_type: v as InterventionType }))}>
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
                <Label>Intervalle km</Label>
                <Input type="number" value={form.interval_km} onChange={(e) => setForm((f) => ({ ...f, interval_km: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label>Intervalle jours</Label>
                <Input type="number" value={form.interval_days} onChange={(e) => setForm((f) => ({ ...f, interval_days: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={createRule.isPending}>Créer</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alertes</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scooter</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Prochain km</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(alerts ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    Aucune alerte
                  </TableCell>
                </TableRow>
              ) : (
                alerts!.map((a) => (
                  <TableRow key={`${a.rule_id}-${a.vehicle_id}`}>
                    <TableCell>{a.vehicle_label}</TableCell>
                    <TableCell>{INTERVENTION_TYPE_LABELS[a.maintenance_type as InterventionType] ?? a.maintenance_type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_COLORS[a.status]}>
                        {a.status === "overdue" ? "En retard" : a.status === "soon" ? "Bientôt" : "OK"}
                      </Badge>
                    </TableCell>
                    <TableCell>{a.next_due_mileage?.toLocaleString("fr-FR") ?? "—"} km</TableCell>
                    <TableCell>
                      {a.vehicle_id && (
                        <Button variant="link" size="sm" asChild className="px-0">
                          <Link to={`/admin/workshop/new?vehicle=${a.vehicle_id}`}>Créer intervention</Link>
                        </Button>
                      )}
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
          <CardTitle className="text-base">Règles actives</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Intervalle km</TableHead>
                <TableHead>Intervalle jours</TableHead>
                <TableHead>Cible</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rules ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{INTERVENTION_TYPE_LABELS[r.maintenance_type as InterventionType] ?? r.maintenance_type}</TableCell>
                  <TableCell>{r.interval_km ?? "—"}</TableCell>
                  <TableCell>{r.interval_days ?? "—"}</TableCell>
                  <TableCell>{r.vehicle_id ? "Scooter" : r.model_filter ?? "Tous"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
