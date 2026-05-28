import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/page-loader";
import { VehicleAvatar, VehiclePhotoLightbox } from "@/components/vehicles/VehicleAvatar";
import { StatusBadge } from "@/features/back-office/components/StatusBadge";
import { useScooters } from "@/features/back-office/hooks/useScooters";
import type { ScooterListItem } from "@/features/back-office/services/scootersService";
import { OPERATIONAL_STATUS_LABELS, type OperationalStatus } from "@/features/back-office/types";

export default function FleetList() {
  const [status, setStatus] = useState<OperationalStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [lightboxScooter, setLightboxScooter] = useState<ScooterListItem | null>(null);
  const { data: scooters, isLoading } = useScooters({ operational_status: status, search });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Parc scooters</h1>
          <p className="text-sm text-muted-foreground">{scooters?.length ?? 0} scooter(s)</p>
        </div>
        <Button asChild>
          <Link to="/admin/fleet/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau scooter
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Code, marque, modèle, immat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as OperationalStatus | "all")}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {(Object.keys(OPERATIONAL_STATUS_LABELS) as OperationalStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {OPERATIONAL_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Scooter</TableHead>
                <TableHead>Immat.</TableHead>
                <TableHead>Km</TableHead>
                <TableHead>Statut parc</TableHead>
                <TableHead>Site</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(scooters ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Aucun scooter trouvé
                  </TableCell>
                </TableRow>
              ) : (
                scooters!.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-medium">{s.internal_code ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5 min-w-[180px]">
                        <VehicleAvatar
                          src={s.primaryPhotoUrl}
                          brand={s.brand}
                          model={s.model}
                          size={40}
                          onOpen={
                            s.primaryPhotoUrl ? () => setLightboxScooter(s) : undefined
                          }
                        />
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {s.brand} {s.model}
                          </div>
                          <div className="text-xs text-muted-foreground">{s.year}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{s.license_plate ?? "—"}</TableCell>
                    <TableCell>{s.mileage?.toLocaleString("fr-FR") ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={s.operational_status} />
                    </TableCell>
                    <TableCell>
                      {s.available ? (
                        <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          Publié
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          Hors ligne
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/admin/fleet/${s.id}`}>Voir</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {lightboxScooter?.primaryPhotoUrl ? (
        <VehiclePhotoLightbox
          src={lightboxScooter.primaryPhotoUrl}
          brand={lightboxScooter.brand}
          model={lightboxScooter.model}
          onClose={() => setLightboxScooter(null)}
        />
      ) : null}
    </div>
  );
}
