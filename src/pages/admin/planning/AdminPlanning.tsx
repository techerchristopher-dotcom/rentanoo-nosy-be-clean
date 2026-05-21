import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader } from "@/components/ui/page-loader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  adminGetPlanning,
  type PlanningBooking,
  type PlanningResponse,
  type PlanningVehicle,
} from "@/services/adminPlanningApi";
import { adminMoveBooking } from "@/services/adminApi";

function ymdLocal(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function startOfAgencyWeek(anchor: Date): Date {
  // Align with FR: week starts Monday.
  return startOfWeek(anchor, { weekStartsOn: 1 });
}

type BookingStyle = {
  className: string;
  label: string;
};

function bookingStyle(status: string | null): BookingStyle {
  switch (status) {
    case "pending":
      return { className: "bg-amber-500/20 border-amber-600 text-amber-900 dark:text-amber-100", label: "pending" };
    case "pending_payment":
      return { className: "bg-violet-500/20 border-violet-600 text-violet-900 dark:text-violet-100", label: "pending_payment" };
    case "confirmed":
      return { className: "bg-emerald-500/20 border-emerald-600 text-emerald-900 dark:text-emerald-100", label: "confirmed" };
    case "active":
      return { className: "bg-sky-500/20 border-sky-600 text-sky-900 dark:text-sky-100", label: "active" };
    case "accepted":
      return { className: "bg-teal-500/20 border-teal-600 text-teal-900 dark:text-teal-100", label: "accepted" };
    case "completed":
    case "closed":
      return { className: "bg-muted/60 border-border text-muted-foreground opacity-70", label: status ?? "—" };
    default:
      return { className: "bg-muted/60 border-border text-muted-foreground", label: status ?? "—" };
  }
}

function renterLabel(b: PlanningBooking): string {
  const r = b.renter;
  if (!r) return "Client: —";
  const name = `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();
  if (name) return `Client: ${name}`;
  if (r.email) return `Client: ${r.email}`;
  return `Client: ${r.id.slice(0, 8)}…`;
}

function renterInlineLabel(b: PlanningBooking): string {
  const r = b.renter;
  if (!r) return "";
  const name = `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim();
  if (name) return name;
  if (r.email) return r.email;
  return r.id.slice(0, 8) + "…";
}

function pricingModeBadge(pm: string | null): { text: string; className: string } | null {
  if (pm === "admin") return { text: "AG", className: "bg-slate-900/10 text-slate-900 dark:text-slate-100 dark:bg-slate-100/10" };
  if (pm === "web") return { text: "WEB", className: "bg-slate-900/10 text-slate-900 dark:text-slate-100 dark:bg-slate-100/10" };
  return null;
}

function clampToRangeInclusive(booking: PlanningBooking, rangeStartYmd: string, rangeEndYmd: string) {
  const start = booking.start_date;
  const end = booking.end_date;
  const clampedStart = start < rangeStartYmd ? rangeStartYmd : start;
  const clampedEnd = end > rangeEndYmd ? rangeEndYmd : end;
  if (clampedEnd < clampedStart) return null;
  return { clampedStart, clampedEnd };
}

function dayIndexFromPeriodStart(ymd: string, periodStart: Date): number {
  // Use "calendar day" difference to avoid DST / timezone ms drift.
  const [ys, ms, ds] = ymd.split("-").map((x) => Number(x));
  const target = new Date(ys, ms - 1, ds, 12, 0, 0, 0);
  const base = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate(), 12, 0, 0, 0);
  return differenceInCalendarDays(target, base);
}

type PositionedBlock = {
  booking: PlanningBooking;
  startIndex: number;
  spanDays: number;
  lane: number;
};

function layoutBlocksForVehicle(args: {
  bookings: PlanningBooking[];
  periodStart: Date;
  periodStartYmd: string;
  periodEndYmd: string;
  dayCount: number;
}): PositionedBlock[] {
  const { bookings, periodStart, periodStartYmd, periodEndYmd, dayCount } = args;
  const maxIdx = dayCount - 1;

  const clamped = bookings
    .map((b) => {
      const c = clampToRangeInclusive(b, periodStartYmd, periodEndYmd);
      if (!c) return null;
      const startIndex = Math.max(0, Math.min(maxIdx, dayIndexFromPeriodStart(c.clampedStart, periodStart)));
      const endIndex = Math.max(0, Math.min(maxIdx, dayIndexFromPeriodStart(c.clampedEnd, periodStart)));
      const spanDays = Math.max(1, endIndex - startIndex + 1);
      return { booking: b, startIndex, endIndex, spanDays };
    })
    .filter(Boolean) as Array<{ booking: PlanningBooking; startIndex: number; endIndex: number; spanDays: number }>;

  clamped.sort((a, b) => a.startIndex - b.startIndex || b.endIndex - b.startIndex - (a.endIndex - a.startIndex));

  const laneEnd: number[] = [];
  const out: PositionedBlock[] = [];

  for (const b of clamped) {
    let lane = 0;
    while (lane < laneEnd.length) {
      if (b.startIndex > laneEnd[lane]) break;
      lane++;
    }
    if (lane === laneEnd.length) laneEnd.push(b.endIndex);
    else laneEnd[lane] = b.endIndex;

    out.push({ booking: b.booking, startIndex: b.startIndex, spanDays: b.spanDays, lane });
  }

  return out;
}

function isVehicleInactive(v: PlanningVehicle): boolean {
  const available = v.available !== false;
  const statusOk = v.status == null || v.status === "active";
  return !(available && statusOk);
}

function dayIsOccupied(bookings: PlanningBooking[], dayYmd: string): boolean {
  for (const b of bookings) {
    if (!b.start_date || !b.end_date) continue;
    if (b.start_date <= dayYmd && b.end_date >= dayYmd) return true;
  }
  return false;
}

export default function AdminPlanning() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  const { periodStart, days, dayCount, periodStartYmd, periodEndYmd } = useMemo(() => {
    if (viewMode === "week") {
      const ps = startOfAgencyWeek(anchor);
      const dayArr = Array.from({ length: 7 }, (_, i) => addDays(ps, i));
      const pe = addDays(ps, 6);
      return {
        periodStart: ps,
        days: dayArr,
        dayCount: 7,
        periodStartYmd: ymdLocal(ps),
        periodEndYmd: ymdLocal(pe),
      };
    }
    const ps = startOfMonth(anchor);
    const pe = endOfMonth(anchor);
    const dayArr = eachDayOfInterval({ start: ps, end: pe });
    return {
      periodStart: ps,
      days: dayArr,
      dayCount: dayArr.length,
      periodStartYmd: ymdLocal(ps),
      periodEndYmd: ymdLocal(pe),
    };
  }, [viewMode, anchor]);

  const [q, setQ] = useState("");
  const [qApplied, setQApplied] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState<"all" | "active" | "inactive">("all");

  // Drag & drop state
  const [dragging, setDragging] = useState<{ bookingId: string; durationDays: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ vehicleId: string; dayYmd: string } | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<PlanningResponse | null>(null);

  const includeInactive = vehicleFilter !== "active";

  const loadPlanning = useCallback(
    async (opts?: { silent?: boolean; signal?: AbortSignal }) => {
      const silent = opts?.silent === true;
      const signal = opts?.signal;
      if (!silent) setLoading(true);
      setErrorMsg(null);
      try {
        const res = await adminGetPlanning({
          start: periodStartYmd,
          end: periodEndYmd,
          q: qApplied.trim() || undefined,
          include_inactive: includeInactive ? "1" : "0",
        });
        if (signal?.aborted) return;
        setData(res);
      } catch (e: unknown) {
        if (signal?.aborted) return;
        const msg = e instanceof Error ? e.message : "Erreur réseau ou API.";
        setErrorMsg(msg);
        setData(null);
        toast({ title: "Planning indisponible", description: msg, variant: "destructive" });
      } finally {
        if (signal?.aborted) return;
        if (!silent) setLoading(false);
      }
    },
    [includeInactive, periodEndYmd, periodStartYmd, qApplied, toast]
  );

  useEffect(() => {
    const ac = new AbortController();
    void loadPlanning({ signal: ac.signal });
    return () => ac.abort();
  }, [loadPlanning]);

  const vehiclesRaw = data?.vehicles ?? [];
  const bookings = data?.bookings ?? [];

  const bookingsByVehicle = useMemo(() => {
    const m = new Map<string, PlanningBooking[]>();
    for (const b of bookings) {
      if (!b.vehicle_id) continue;
      const arr = m.get(b.vehicle_id) ?? [];
      arr.push(b);
      m.set(b.vehicle_id, arr);
    }
    return m;
  }, [bookings]);

  const todayYmd = ymdLocal(new Date());

  const periodLabel = useMemo(() => {
    if (viewMode === "week") {
      const a = format(periodStart, "d MMM", { locale: fr });
      const b = format(addDays(periodStart, 6), "d MMM yyyy", { locale: fr });
      return `${a} → ${b}`;
    }
    return format(anchor, "MMMM yyyy", { locale: fr });
  }, [anchor, periodStart, viewMode]);

  const runToday = () => setAnchor(new Date());
  const runPrev = () =>
    setAnchor((d) => (viewMode === "week" ? addDays(d, -7) : addMonths(d, -1)));
  const runNext = () =>
    setAnchor((d) => (viewMode === "week" ? addDays(d, 7) : addMonths(d, 1)));

  const applySearch = () => setQApplied(q.trim());
  const clearSearch = () => {
    setQ("");
    setQApplied("");
  };

  const vehicles = useMemo(() => {
    if (vehicleFilter === "all") return vehiclesRaw;
    if (vehicleFilter === "active") return vehiclesRaw.filter((v) => !isVehicleInactive(v));
    return vehiclesRaw.filter((v) => isVehicleInactive(v));
  }, [vehicleFilter, vehiclesRaw]);

  const hasSearch = qApplied.trim().length > 0;

  const gridColsStyle = useMemo(
    () => ({ gridTemplateColumns: `280px repeat(${dayCount}, minmax(32px, 1fr))` } as const),
    [dayCount]
  );

  const gridMinWidth = Math.max(1100, 280 + dayCount * 36);

  const DRAGGABLE_STATUSES = new Set(["pending", "pending_payment"]);

  const handleDragStart = (e: React.DragEvent, booking: PlanningBooking) => {
    if (!DRAGGABLE_STATUSES.has(booking.status ?? "")) return;
    const [ys, ms, ds] = booking.start_date.split("-").map(Number);
    const [ye, me, de] = booking.end_date.split("-").map(Number);
    const start = new Date(ys, ms - 1, ds);
    const end = new Date(ye, me - 1, de);
    const durationDays = differenceInCalendarDays(end, start) + 1;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", booking.id);
    setDragging({ bookingId: booking.id, durationDays });
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDropTarget(null);
  };

  const handleDrop = async (vehicleId: string, dayYmd: string) => {
    if (!dragging || moveLoading) return;
    const { bookingId, durationDays } = dragging;
    setDragging(null);
    setDropTarget(null);

    const [ys, ms, ds] = dayYmd.split("-").map(Number);
    const startDt = new Date(ys, ms - 1, ds);
    const endDt = addDays(startDt, durationDays - 1);
    const newStart = ymdLocal(startDt);
    const newEnd = ymdLocal(endDt);

    setMoveLoading(true);
    try {
      await adminMoveBooking(bookingId, { vehicleId, startDate: newStart, endDate: newEnd });
      toast({ title: "Réservation déplacée" });
      await loadPlanning({ silent: true });
    } catch (e: unknown) {
      toast({
        title: "Déplacement impossible",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setMoveLoading(false);
    }
  };

  if (loading && !data) return <PageLoader />;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Planning agence</h1>
            <p className="text-muted-foreground text-sm">
              {viewMode === "week" ? "Vue semaine" : "Vue mois"} —{" "}
              <span className="font-medium text-foreground">{periodLabel}</span>
            </p>
            <p className="mt-2 text-sm">
              <Link to="/admin" className="text-primary font-medium hover:underline">
                ← Tableau de bord
              </Link>
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex rounded-md border border-border overflow-hidden self-start sm:self-end">
              <button
                type="button"
                className={cn("px-3 py-1.5 text-sm", viewMode === "week" && "bg-muted")}
                onClick={() => setViewMode("week")}
                disabled={loading}
              >
                Semaine
              </button>
              <button
                type="button"
                className={cn("px-3 py-1.5 text-sm border-l border-border", viewMode === "month" && "bg-muted")}
                onClick={() => setViewMode("month")}
                disabled={loading}
              >
                Mois
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={runPrev} disabled={loading}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                {viewMode === "week" ? "Semaine précédente" : "Mois précédent"}
              </Button>
              <Button type="button" variant="outline" onClick={runNext} disabled={loading}>
                {viewMode === "week" ? "Semaine suivante" : "Mois suivant"}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button type="button" onClick={runToday} disabled={loading}>
                <Calendar className="h-4 w-4 mr-2" />
                {viewMode === "week" ? "Cette semaine" : "Ce mois"}
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>Outils</CardTitle>
            <CardDescription>Recherche, filtres simples, et rafraîchissement.</CardDescription>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
              <div className="flex items-center gap-2 w-full sm:max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Rechercher un véhicule (marque / modèle)…"
                    className="pl-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") applySearch();
                    }}
                  />
                </div>
                <Button type="button" variant="secondary" onClick={applySearch} disabled={loading}>
                  Rechercher
                </Button>
                <Button type="button" variant="ghost" onClick={clearSearch} disabled={loading || (!q && !qApplied)}>
                  Effacer
                </Button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-muted-foreground">Véhicules</Label>
                  <div className="flex rounded-md border border-border overflow-hidden">
                    <button
                      type="button"
                      className={cn("px-3 py-1.5 text-sm", vehicleFilter === "all" && "bg-muted")}
                      onClick={() => setVehicleFilter("all")}
                      disabled={loading}
                    >
                      Tous
                    </button>
                    <button
                      type="button"
                      className={cn("px-3 py-1.5 text-sm border-l border-border", vehicleFilter === "active" && "bg-muted")}
                      onClick={() => setVehicleFilter("active")}
                      disabled={loading}
                    >
                      Actifs
                    </button>
                    <button
                      type="button"
                      className={cn("px-3 py-1.5 text-sm border-l border-border", vehicleFilter === "inactive" && "bg-muted")}
                      onClick={() => setVehicleFilter("inactive")}
                      disabled={loading}
                    >
                      Hors flotte
                    </button>
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={() => void loadPlanning()} disabled={loading}>
                  <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                  Actualiser
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {errorMsg ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">
                <div className="font-medium text-destructive">Erreur</div>
                <div className="text-muted-foreground mt-1">{errorMsg}</div>
              </div>
            ) : null}

            {!loading && vehiclesRaw.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucun véhicule à afficher.</div>
            ) : null}
            {!loading && vehiclesRaw.length > 0 && vehicles.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {hasSearch ? "Aucun résultat pour cette recherche/filtre." : "Aucun véhicule ne correspond au filtre sélectionné."}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{viewMode === "week" ? "Vue semaine" : "Vue mois"}</CardTitle>
            <CardDescription>
              {loading ? "Chargement…" : `${vehicles.length} véhicule(s) · ${bookings.length} réservation(s) dans la fenêtre`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dragging && (
              <div className="mb-2 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                <span>Glissez vers un jour libre pour déplacer la réservation.</span>
                <button type="button" className="ml-auto text-xs underline opacity-70 hover:opacity-100" onClick={handleDragEnd}>
                  Annuler
                </button>
              </div>
            )}
            <div className={cn("overflow-auto border border-border rounded-lg", dragging && "select-none")}>
              <div style={{ minWidth: gridMinWidth }}>
                <div
                  className="sticky top-0 z-20 grid bg-background/95 backdrop-blur border-b border-border"
                  style={gridColsStyle}
                >
                  <div className="sticky left-0 z-30 bg-background/95 backdrop-blur border-r border-border px-3 py-2 text-sm font-medium">
                    Véhicules
                  </div>
                  {days.map((d) => {
                    const ymd = ymdLocal(d);
                    const isToday = ymd === todayYmd;
                    return (
                      <div
                        key={ymd}
                        className={cn(
                          "px-2 py-2 text-sm font-medium text-center border-r last:border-r-0 border-border",
                          isToday && "bg-primary/15"
                        )}
                      >
                        <div className="text-foreground">{format(d, "EEE", { locale: fr })}</div>
                        <div className="text-xs text-muted-foreground">{format(d, "d MMM", { locale: fr })}</div>
                      </div>
                    );
                  })}
                </div>

                <div>
                  {vehicles.map((v) => {
                    const inactive = isVehicleInactive(v);
                    const rowBookings = bookingsByVehicle.get(v.id) ?? [];
                    const blocks = layoutBlocksForVehicle({
                      bookings: rowBookings,
                      periodStart,
                      periodStartYmd,
                      periodEndYmd,
                      dayCount,
                    });
                    const lanes = blocks.reduce((max, b) => Math.max(max, b.lane + 1), 1);
                    const rowHeight = Math.max(52, 12 + lanes * 26);

                    return (
                      <div
                        key={v.id}
                        className="grid border-b border-border last:border-b-0"
                        style={{ ...gridColsStyle, height: rowHeight }}
                      >
                        <div
                          className={cn(
                            "sticky left-0 z-10 border-r border-border bg-background px-3 py-3 text-sm flex flex-col justify-center",
                            inactive && "bg-muted/30"
                          )}
                        >
                          <div className="font-medium text-foreground truncate">
                            {v.brand} {v.model}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="font-mono">{v.id.slice(0, 8)}…</span>
                            {inactive ? <span className="text-amber-700 dark:text-amber-500">hors flotte</span> : null}
                          </div>
                        </div>

                        <div className="relative" style={{ gridColumn: `2 / span ${dayCount}` }}>
                          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}>
                            {days.map((d) => {
                              const dayYmd = ymdLocal(d);
                              const occ = dayIsOccupied(rowBookings, dayYmd);
                              const isToday = dayYmd === todayYmd;
                              const isDropTarget = dropTarget?.vehicleId === v.id && dropTarget?.dayYmd === dayYmd;
                              return (
                                <button
                                  key={dayYmd}
                                  type="button"
                                  disabled={loading || moveLoading}
                                  onClick={() => {
                                    if (occ || dragging) return;
                                    navigate(
                                      `/admin/bookings/new?vehicleId=${encodeURIComponent(v.id)}&start=${encodeURIComponent(dayYmd)}&end=${encodeURIComponent(dayYmd)}`
                                    );
                                  }}
                                  onDragOver={(e) => {
                                    if (!dragging) return;
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = "move";
                                    setDropTarget({ vehicleId: v.id, dayYmd });
                                  }}
                                  onDragLeave={() => {
                                    setDropTarget((prev) =>
                                      prev?.vehicleId === v.id && prev?.dayYmd === dayYmd ? null : prev
                                    );
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    void handleDrop(v.id, dayYmd);
                                  }}
                                  className={cn(
                                    "border-r last:border-r-0 border-border bg-background text-left transition-colors",
                                    !dragging && !occ && "hover:bg-muted/40",
                                    occ && !dragging && "cursor-not-allowed",
                                    dragging && "cursor-copy",
                                    isDropTarget && "bg-primary/20 ring-2 ring-inset ring-primary/50",
                                    "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-inset",
                                    isToday && !isDropTarget && "bg-primary/5"
                                  )}
                                  aria-label={`Créer une réservation pour ${v.brand} ${v.model} le ${dayYmd}`}
                                />
                              );
                            })}
                          </div>

                          {blocks.length === 0 ? (
                            <div className="absolute inset-0 flex items-center px-3 text-xs text-muted-foreground pointer-events-none">
                              —
                            </div>
                          ) : null}

                          {blocks.map((b) => {
                            const leftPct = (b.startIndex / dayCount) * 100;
                            const widthPct = (b.spanDays / dayCount) * 100;
                            const top = 12 + b.lane * 26;
                            const st = bookingStyle(b.booking.status);
                            const client = renterLabel(b.booking);
                            const status = b.booking.status ?? "—";
                            const pricing = b.booking.pricing_mode ?? "—";
                            const dates = `${b.booking.start_date} → ${b.booking.end_date}`;
                            const renterInline = renterInlineLabel(b.booking);
                            const pmBadge = pricingModeBadge(b.booking.pricing_mode);
                            const refLabel =
                              b.booking.reference_number != null
                                ? `#${b.booking.reference_number}`
                                : b.booking.id.slice(0, 8) + "…";
                            const barLabel = [refLabel, renterInline].filter(Boolean).join(" · ");

                            const isDraggable = DRAGGABLE_STATUSES.has(b.booking.status ?? "");
                            const isBeingDragged = dragging?.bookingId === b.booking.id;

                            return (
                              <Tooltip key={b.booking.id}>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    draggable={isDraggable}
                                    onDragStart={(e) => handleDragStart(e, b.booking)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => {
                                      if (dragging) return;
                                      navigate(`/admin/bookings/${b.booking.id}`);
                                    }}
                                    className={cn(
                                      "absolute rounded-md border px-2 py-1 text-xs text-left shadow-sm hover:shadow transition-all",
                                      "focus:outline-none focus:ring-2 focus:ring-primary/40",
                                      isDraggable && "cursor-grab active:cursor-grabbing",
                                      isBeingDragged && "opacity-40 scale-95",
                                      st.className
                                    )}
                                    style={{
                                      left: `${leftPct}%`,
                                      width: `${widthPct}%`,
                                      top,
                                      height: 22,
                                    }}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {pmBadge ? (
                                        <span className={cn("shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold", pmBadge.className)}>
                                          {pmBadge.text}
                                        </span>
                                      ) : null}
                                      <div className="truncate font-medium">{barLabel || st.label}</div>
                                      <span className="shrink-0 text-[10px] opacity-80">{st.label}</span>
                                    </div>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-1 text-sm">
                                    <div className="font-medium">Réservation</div>
                                    <div className="text-xs text-muted-foreground">Réf: {refLabel}</div>
                                    <div className="text-xs text-muted-foreground">{client}</div>
                                    <div className="text-xs text-muted-foreground">Statut: {status}</div>
                                    <div className="text-xs text-muted-foreground">Dates: {dates}</div>
                                    <div className="text-xs text-muted-foreground">Pricing: {pricing}</div>
                                    {isDraggable && (
                                      <div className="text-xs text-muted-foreground italic">Glisser pour changer de véhicule</div>
                                    )}
                                    <div className="pt-1 text-xs">
                                      <Link to={`/admin/bookings/${b.booking.id}`} className="text-primary hover:underline">
                                        Ouvrir la fiche →
                                      </Link>
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {!loading && vehicles.length > 0 && bookings.length === 0 ? (
              <div className="mt-4 text-sm text-muted-foreground">
                {viewMode === "week"
                  ? "Aucune réservation sur cette semaine."
                  : "Aucune réservation sur ce mois."}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
