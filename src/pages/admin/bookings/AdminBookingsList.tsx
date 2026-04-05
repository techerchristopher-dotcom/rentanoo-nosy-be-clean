import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminListBookings, type AdminBookingListRow } from "@/services/adminApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PageLoader } from "@/components/ui/page-loader";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

const STATUS_OPTIONS = [
  { value: "__all__", label: "Tous les statuts" },
  { value: "pending", label: "pending" },
  { value: "pending_payment", label: "pending_payment" },
  { value: "confirmed", label: "confirmed" },
  { value: "accepted", label: "accepted" },
  { value: "active", label: "active" },
  { value: "completed", label: "completed" },
  { value: "cancelled", label: "cancelled" },
  { value: "declined", label: "declined" },
  { value: "rejected", label: "rejected" },
  { value: "terminated", label: "terminated" },
];

function clientLabel(r: AdminBookingListRow["renter"]): string {
  if (!r) return "—";
  const name = `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();
  if (name) return name;
  if (r.email) return r.email;
  return r.id.slice(0, 8) + "…";
}

function vehicleLabel(v: AdminBookingListRow["vehicle"]): string {
  if (!v) return "—";
  const s = `${v.brand ?? ""} ${v.model ?? ""}`.trim();
  return s || "—";
}

function sourceLabel(pricing_mode: string | null): string {
  if (pricing_mode === "admin") return "AG";
  if (pricing_mode === "web") return "WEB";
  return "—";
}

function paymentLabel(status: string | null): string {
  switch (status) {
    case "pending_payment":
      return "En attente paiement";
    case "confirmed":
      return "Payée (confirmée)";
    case "accepted":
      return "Payée (acceptée)";
    case "active":
      return "En location";
    case "completed":
      return "Terminée";
    case "pending":
      return "En attente propriétaire";
    case "cancelled":
      return "Annulée";
    case "declined":
    case "rejected":
      return "Refusée";
    case "terminated":
      return "Terminée (forcée)";
    default:
      return status || "—";
  }
}

function depositLabel(row: AdminBookingListRow): string {
  const st = row.deposit_status;
  if (st === "not_required") return "Sans caution";
  if (st === "card_registered" || st === "paid") return "Carte / caution OK";
  if (st === "pending") return "À activer";
  if (st === "refunded") return "Remboursée";
  if (st) return st;
  return "—";
}

function contractLabel(row: AdminBookingListRow): string {
  if (row.rental_contract_signed_at) return "Signé";
  if (row.rental_contract_pdf_url) return "PDF (non horodaté)";
  return "Non signé";
}

function edlCell(done: boolean): string {
  return done ? "Fait" : "—";
}

export default function AdminBookingsList() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AdminBookingListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [searchApplied, setSearchApplied] = useState("");
  const [statusFilter, setStatusFilter] = useState("__all__");
  const [pricingFilter, setPricingFilter] = useState<"all" | "web" | "admin">("all");
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminListBookings({
        limit: PAGE_SIZE,
        offset,
        search: searchApplied.trim() || undefined,
        status: statusFilter !== "__all__" ? statusFilter : undefined,
        pricing_mode: pricingFilter === "all" ? "" : pricingFilter,
        include_cancelled: includeCancelled,
        date_from: dateFrom.trim() || undefined,
        date_to: dateTo.trim() || undefined,
      });
      setRows(res.bookings);
      setTotal(res.total);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast({ title: "Liste indisponible", description: msg, variant: "destructive" });
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    offset,
    searchApplied,
    statusFilter,
    pricingFilter,
    includeCancelled,
    dateFrom,
    dateTo,
    toast,
  ]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const pageIndex = useMemo(() => Math.floor(offset / PAGE_SIZE) + 1, [offset]);

  const applySearch = () => {
    setOffset(0);
    setSearchApplied(searchInput.trim());
  };

  const onStatusChange = (v: string) => {
    setStatusFilter(v);
    setOffset(0);
  };

  const onPricingChange = (v: "all" | "web" | "admin") => {
    setPricingFilter(v);
    setOffset(0);
  };

  const onIncludeCancelledChange = (checked: boolean) => {
    setIncludeCancelled(checked);
    setOffset(0);
  };

  const onDateChange = (which: "from" | "to", value: string) => {
    if (which === "from") setDateFrom(value);
    else setDateTo(value);
    setOffset(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Toutes les réservations</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Vue opérationnelle — web et agence. Complémentaire du{" "}
          <Link to="/admin/planning" className="text-primary font-medium hover:underline">
            planning
          </Link>
          .
        </p>
        <p className="mt-2 text-sm">
          <Link to="/admin" className="text-primary font-medium hover:underline">
            ← Tableau de bord
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>Recherche par n° de réservation, nom, email, marque ou modèle.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="admin-bookings-search">Recherche</Label>
              <div className="flex gap-2">
                <Input
                  id="admin-bookings-search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Référence, client, véhicule…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applySearch();
                  }}
                />
                <Button type="button" variant="secondary" onClick={applySearch}>
                  Chercher
                </Button>
              </div>
            </div>
            <div className="w-full sm:w-48 space-y-2">
              <Label>Source</Label>
              <Select value={pricingFilter} onValueChange={(v) => onPricingChange(v as "all" | "web" | "admin")}>
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="admin">Agence</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-52 space-y-2">
              <Label>Statut réservation</Label>
              <Select value={statusFilter} onValueChange={onStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pb-2">
              <input
                id="include-cancelled"
                type="checkbox"
                className="h-4 w-4 rounded border-border"
                checked={includeCancelled}
                onChange={(e) => onIncludeCancelledChange(e.target.checked)}
              />
              <Label htmlFor="include-cancelled" className="font-normal cursor-pointer">
                Inclure annulées / refusées
              </Label>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="date-from">Date début (fenêtre)</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => onDateChange("from", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">Date fin (fenêtre)</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => onDateChange("to", e.target.value)}
              />
            </div>
            <Button type="button" variant="outline" onClick={() => void fetchList()} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Réservations</CardTitle>
          <CardDescription>
            {loading ? "Chargement…" : `${total} réservation(s) — page ${pageIndex} / ${pageCount}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && rows.length === 0 ? (
            <PageLoader />
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Réf.</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Véhicule</TableHead>
                      <TableHead className="whitespace-nowrap">Début</TableHead>
                      <TableHead className="whitespace-nowrap">Fin</TableHead>
                      <TableHead className="whitespace-nowrap">Source</TableHead>
                      <TableHead className="whitespace-nowrap">Statut</TableHead>
                      <TableHead>Paiement</TableHead>
                      <TableHead>Caution</TableHead>
                      <TableHead>Contrat</TableHead>
                      <TableHead className="whitespace-nowrap">EDL départ</TableHead>
                      <TableHead className="whitespace-nowrap">EDL retour</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center text-muted-foreground py-10">
                          Aucune réservation pour ces critères.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-xs whitespace-nowrap">
                            {row.reference_number != null ? `#${row.reference_number}` : row.id.slice(0, 8) + "…"}
                          </TableCell>
                          <TableCell className="max-w-[140px] truncate text-sm">{clientLabel(row.renter)}</TableCell>
                          <TableCell className="max-w-[140px] truncate text-sm">{vehicleLabel(row.vehicle)}</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {row.start_date}
                            {row.start_time ? ` ${row.start_time}` : ""}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {row.end_date}
                            {row.end_time ? ` ${row.end_time}` : ""}
                          </TableCell>
                          <TableCell>
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-slate-900/10 text-slate-900 dark:text-slate-100 dark:bg-slate-100/10">
                              {sourceLabel(row.pricing_mode)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs max-w-[100px] truncate">{row.status ?? "—"}</TableCell>
                          <TableCell className="text-xs max-w-[120px]">{paymentLabel(row.status)}</TableCell>
                          <TableCell className="text-xs max-w-[120px]">{depositLabel(row)}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{contractLabel(row)}</TableCell>
                          <TableCell className="text-xs">{edlCell(row.edl_depart_done)}</TableCell>
                          <TableCell className="text-xs">{edlCell(row.edl_return_done)}</TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end">
                              <Button asChild variant="default" size="sm">
                                <Link to={`/admin/bookings/${row.id}`}>Fiche</Link>
                              </Button>
                              <Button asChild variant="ghost" size="sm" className="h-8 px-2" title="EDL départ">
                                <Link to={`/checking/${row.id}`} target="_blank" rel="noopener noreferrer">
                                  <span className="sr-only">EDL départ</span>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                              <Button asChild variant="ghost" size="sm" className="h-8 px-2" title="EDL retour">
                                <Link to={`/checkin-return/${row.id}`} target="_blank" rel="noopener noreferrer">
                                  <span className="sr-only">EDL retour</span>
                                  <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {total > PAGE_SIZE ? (
                <div className="flex items-center justify-between mt-4 text-sm">
                  <span className="text-muted-foreground">
                    {offset + 1}–{Math.min(offset + rows.length, total)} sur {total}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading || offset <= 0}
                      onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                    >
                      Précédent
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading || offset + PAGE_SIZE >= total}
                      onClick={() => setOffset((o) => o + PAGE_SIZE)}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
