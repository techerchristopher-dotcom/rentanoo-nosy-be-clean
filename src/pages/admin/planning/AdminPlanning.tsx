import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  CalendarDays,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gauge,
  HelpCircle,
  ImageOff,
  Layers,
  LogIn,
  LogOut,
  PackageX,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageLoader } from "@/components/ui/page-loader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  adminGetPlanning,
  type PlanningBooking,
  type PlanningResponse,
  type PlanningVehicle,
} from "@/services/adminPlanningApi";
import { adminMoveBooking } from "@/services/adminApi";
import { PlanningBookingSheet } from "@/features/admin-bookings/components/PlanningBookingSheet";

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

/** Statuts de booking considérés comme "annulés / inactifs" — alignés sur le backend (server/routes/adminRoutes.ts). */
const CANCEL_LIKE = new Set(["cancelled", "declined", "rejected", "terminated"]);

function isBookingActive(b: PlanningBooking): boolean {
  return !CANCEL_LIKE.has((b.status ?? "").toLowerCase());
}

type TodayFilter = "all" | "departing" | "returning";

// Extrait la cylindrée (en cc) d'un véhicule.
// Source de vérité = vehicles.engine_capacity (renseigné via la fiche véhicule).
// Fallback tolérant sur brand/model si le champ est manquant (legacy).
// parseInt("125 A") === 125 → tolère les suffixes ("125 A", "200Cc"…).
function parseCylindree(v: PlanningVehicle): number | null {
  const raw = (v.engine_capacity ?? "").trim();
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 50 && n <= 2000) return n;
  }

  const haystack = `${v.brand ?? ""} ${v.model ?? ""}`;
  // Préfère un nombre suivi de "cc" (le plus fiable)
  const ccMatch = haystack.match(/(\d{2,4})\s*cc\b/i);
  if (ccMatch) {
    const n = parseInt(ccMatch[1], 10);
    if (n >= 50 && n <= 2000) return n;
  }
  // Sinon, premier nombre 2-4 chiffres isolé (entouré de séparateurs ou bord)
  const numMatch = haystack.match(/(?:^|[^\d])(\d{2,4})(?:[^\d]|$)/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    if (n >= 50 && n <= 2000) return n;
  }
  return null;
}

/**
 * Filtre cylindrée — basé sur des valeurs réelles présentes en BD.
 * "all"       → toutes
 * "unknown"   → cylindrée non renseignée
 * "<number>"  → égalité stricte (ex: "125" matche tous les véhicules à 125 cc)
 */
type CylindreeFilter = string;

function cylindreeMatchesFilter(cc: number | null, filter: CylindreeFilter): boolean {
  if (filter === "all") return true;
  if (filter === "unknown") return cc == null;
  if (cc == null) return false;
  const target = parseInt(filter, 10);
  if (!Number.isFinite(target)) return true;
  return cc === target;
}

/**
 * Chip de filtre moderne — rond, avec icône optionnelle et badge compteur.
 * Style cohérent type "Airbnb categories" : actif = rempli primary, inactif = subtil.
 */
function FilterChip({
  label,
  icon,
  count,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  count?: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium",
        "transition-all duration-150 ease-out select-none",
        "border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/90"
          : "bg-background text-foreground border-border hover:bg-muted hover:border-border/80",
        disabled && "opacity-50 cursor-not-allowed hover:bg-background"
      )}
    >
      {icon ? <span className="opacity-90">{icon}</span> : null}
      <span>{label}</span>
      {typeof count === "number" && (
        <span
          className={cn(
            "ml-0.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] sm:text-[11px] font-semibold tabular-nums",
            active
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/**
 * Petite vignette ronde du véhicule (photo principale).
 * Cliquable pour ouvrir un lightbox. Fallback initiales si pas de photo.
 */
function VehicleAvatar({
  src,
  brand,
  model,
  onOpen,
  size = 36,
}: {
  src: string | null;
  brand: string;
  model: string;
  onOpen?: () => void;
  size?: number;
}) {
  const [errored, setErrored] = useState(false);
  const initials = `${(brand ?? "")[0] ?? "?"}${(model ?? "")[0] ?? ""}`
    .toUpperCase()
    .slice(0, 2);
  const hasPhoto = !!src && !errored;

  const inner = hasPhoto ? (
    <img
      src={src!}
      alt={`${brand} ${model}`}
      loading="lazy"
      decoding="async"
      className="w-full h-full object-cover"
      onError={() => setErrored(true)}
    />
  ) : (
    <span
      className="flex items-center justify-center w-full h-full bg-muted text-muted-foreground font-semibold"
      style={{ fontSize: Math.max(10, Math.floor(size * 0.36)) }}
      aria-hidden
    >
      {initials || <ImageOff className="h-3.5 w-3.5" />}
    </span>
  );

  if (!hasPhoto || !onOpen) {
    return (
      <div
        className="shrink-0 rounded-md overflow-hidden border border-border bg-muted"
        style={{ width: size, height: size }}
        title={`${brand} ${model}`}
      >
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      aria-label={`Agrandir la photo de ${brand} ${model}`}
      title="Agrandir la photo"
      className={cn(
        "shrink-0 rounded-md overflow-hidden border border-border bg-muted",
        "transition-all hover:ring-2 hover:ring-primary/40 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      )}
      style={{ width: size, height: size }}
    >
      {inner}
    </button>
  );
}

/**
 * Lightbox plein écran pour afficher la photo d'un véhicule en grand.
 * Fermeture par clic en dehors, touche Échap, ou bouton X.
 */
function VehiclePhotoLightbox({
  src,
  brand,
  model,
  onClose,
}: {
  src: string;
  brand: string;
  model: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo de ${brand} ${model}`}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Fermer"
        className="absolute top-3 right-3 sm:top-4 sm:right-4 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="h-5 w-5" />
      </button>
      <figure
        className="flex flex-col items-center gap-3 max-w-[95vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={`${brand} ${model}`}
          className="max-h-[80vh] max-w-[95vw] object-contain rounded-lg shadow-2xl"
        />
        <figcaption className="text-white/90 text-sm sm:text-base font-medium text-center">
          {brand} {model}
        </figcaption>
      </figure>
    </div>
  );
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
  const isMobile = useIsMobile();

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
  const [cylindreeFilter, setCylindreeFilter] = useState<CylindreeFilter>("all");
  const [todayFilter, setTodayFilter] = useState<TodayFilter>("all");

  // Lightbox photo véhicule (ouvert au clic sur l'avatar)
  const [lightboxVehicle, setLightboxVehicle] = useState<PlanningVehicle | null>(null);

  // Sheet aperçu réservation
  const [sheetBooking, setSheetBooking] = useState<PlanningBooking | null>(null);
  const [sheetVehicle, setSheetVehicle] = useState<PlanningVehicle | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Drag & drop state — Pointer Events API (HTML5 drag unreliable on buttons/Safari)
  const [dragging, setDragging] = useState<{ bookingId: string; durationDays: number } | null>(null);
  const draggingRef = useRef<{ bookingId: string; durationDays: number } | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number; booking: PlanningBooking; pointerId: number } | null>(null);
  const didDragRef = useRef(false);
  const [dropTarget, setDropTarget] = useState<{ vehicleId: string; dayYmd: string } | null>(null);
  const [moveLoading, setMoveLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [data, setData] = useState<PlanningResponse | null>(null);

  const openBookingSheet = useCallback((booking: PlanningBooking) => {
    const vehicle = data?.vehicles.find((v) => v.id === booking.vehicle_id) ?? null;
    setSheetBooking(booking);
    setSheetVehicle(vehicle);
    setSheetOpen(true);
  }, [data?.vehicles]);

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

  /**
   * Sets des vehicle_id qui ont un départ / retour aujourd'hui.
   * On exclut les bookings au statut annulé/rejeté/terminé.
   * Note : les données viennent de la période actuellement chargée. Si l'admin
   * regarde un mois lointain, ces Sets peuvent être vides ; on force donc le
   * retour à "aujourd'hui" quand on active un filtre du jour (cf. setTodayFilterAndJump).
   */
  const todayOps = useMemo(() => {
    const departing = new Set<string>();
    const returning = new Set<string>();
    for (const b of bookings) {
      if (!b.vehicle_id) continue;
      if (!isBookingActive(b)) continue;
      if (b.start_date === todayYmd) departing.add(b.vehicle_id);
      if (b.end_date === todayYmd) returning.add(b.vehicle_id);
    }
    return { departing, returning };
  }, [bookings, todayYmd]);

  const periodLabel = useMemo(() => {
    if (viewMode === "week") {
      const a = format(periodStart, "d MMM", { locale: fr });
      const b = format(addDays(periodStart, 6), "d MMM yyyy", { locale: fr });
      return `${a} → ${b}`;
    }
    return format(anchor, "MMMM yyyy", { locale: fr });
  }, [anchor, periodStart, viewMode]);

  const runToday = () => setAnchor(new Date());

  /**
   * Active un filtre "Aujourd'hui" (départs/retours) ET saute sur aujourd'hui
   * en vue semaine, pour garantir que les bookings du jour sont chargées
   * (le backend ne renvoie que la période visible).
   */
  const handleTodayFilter = (next: TodayFilter) => {
    setTodayFilter(next);
    if (next !== "all") {
      setViewMode("week");
      setAnchor(new Date());
    }
  };
  const runPrev = () =>
    setAnchor((d) => (viewMode === "week" ? addDays(d, -7) : addMonths(d, -1)));
  const runNext = () =>
    setAnchor((d) => (viewMode === "week" ? addDays(d, 7) : addMonths(d, 1)));

  const applySearch = () => setQApplied(q.trim());
  const clearSearch = () => {
    setQ("");
    setQApplied("");
  };

  // Compteurs pour chaque option de filtre — calculés sur la liste post-recherche
  // (vehiclesRaw vient déjà de l'API filtrée par q + include_inactive).
  const vehicleAvailabilityCounts = useMemo(() => {
    let active = 0;
    let inactive = 0;
    for (const v of vehiclesRaw) {
      if (isVehicleInactive(v)) inactive++;
      else active++;
    }
    return { all: vehiclesRaw.length, active, inactive };
  }, [vehiclesRaw]);

  // Compteurs pour les chips "Aujourd'hui". On compte les véhicules concernés
  // dans la flotte chargée (vehiclesRaw), pas dans la liste filtrée — l'admin
  // doit toujours voir le compteur réel pour cliquer dessus.
  const todayCounts = useMemo(() => {
    let departing = 0;
    let returning = 0;
    for (const v of vehiclesRaw) {
      if (todayOps.departing.has(v.id)) departing++;
      if (todayOps.returning.has(v.id)) returning++;
    }
    return { departing, returning };
  }, [vehiclesRaw, todayOps]);

  /**
   * Groupes de cylindrée dynamiques — calculés à partir des valeurs RÉELLES présentes
   * dans la flotte (vehicles.engine_capacity) après filtre Disponibilité.
   * Retourne la liste triée croissante des valeurs cc + un compteur "unknown" + total.
   */
  const cylindreeGroups = useMemo(() => {
    const base = vehiclesRaw.filter((v) => {
      if (vehicleFilter === "active") return !isVehicleInactive(v);
      if (vehicleFilter === "inactive") return isVehicleInactive(v);
      return true;
    });
    const byCc = new Map<number, number>();
    let unknown = 0;
    for (const v of base) {
      const cc = parseCylindree(v);
      if (cc == null) {
        unknown++;
      } else {
        byCc.set(cc, (byCc.get(cc) ?? 0) + 1);
      }
    }
    const values = Array.from(byCc.entries())
      .map(([cc, count]) => ({ cc, count }))
      .sort((a, b) => a.cc - b.cc);
    return { total: base.length, values, unknown };
  }, [vehiclesRaw, vehicleFilter]);

  const vehicles = useMemo(() => {
    // 1) Filtre disponibilité (tous / actifs / hors flotte)
    let list = vehiclesRaw;
    if (vehicleFilter === "active") list = list.filter((v) => !isVehicleInactive(v));
    else if (vehicleFilter === "inactive") list = list.filter((v) => isVehicleInactive(v));

    // 2) Filtre cylindrée
    if (cylindreeFilter !== "all") {
      list = list.filter((v) => cylindreeMatchesFilter(parseCylindree(v), cylindreeFilter));
    }

    // 3) Filtre "Aujourd'hui" (cumulé) — départs / retours du jour
    if (todayFilter === "departing") {
      list = list.filter((v) => todayOps.departing.has(v.id));
    } else if (todayFilter === "returning") {
      list = list.filter((v) => todayOps.returning.has(v.id));
    }

    // 4) Tri par cylindrée croissante (inconnus en fin), puis par nom pour stabilité
    return [...list].sort((a, b) => {
      const ca = parseCylindree(a);
      const cb = parseCylindree(b);
      if (ca == null && cb == null) {
        // Tri secondaire: brand puis model alphabétique
        const an = `${a.brand} ${a.model}`.toLowerCase();
        const bn = `${b.brand} ${b.model}`.toLowerCase();
        return an < bn ? -1 : an > bn ? 1 : 0;
      }
      if (ca == null) return 1;
      if (cb == null) return -1;
      if (ca !== cb) return ca - cb;
      const an = `${a.brand} ${a.model}`.toLowerCase();
      const bn = `${b.brand} ${b.model}`.toLowerCase();
      return an < bn ? -1 : an > bn ? 1 : 0;
    });
  }, [vehicleFilter, cylindreeFilter, todayFilter, todayOps, vehiclesRaw]);

  const hasSearch = qApplied.trim().length > 0;

  const vehicleColPx = isMobile ? 140 : 280;
  const dayCellMinPx = isMobile ? 28 : 32;
  const dayCellTargetPx = isMobile ? 30 : 36;

  const gridColsStyle = useMemo(
    () =>
      ({
        gridTemplateColumns: `${vehicleColPx}px repeat(${dayCount}, minmax(${dayCellMinPx}px, 1fr))`,
      } as const),
    [dayCount, vehicleColPx, dayCellMinPx]
  );

  const gridMinWidth = Math.max(
    isMobile ? 540 : 1100,
    vehicleColPx + dayCount * dayCellTargetPx
  );

  const DRAGGABLE_STATUSES = new Set(["pending", "pending_payment"]);

  const cancelDrag = () => {
    draggingRef.current = null;
    pointerDownRef.current = null;
    didDragRef.current = false;
    setDragging(null);
    setDropTarget(null);
  };

  const handlePointerDown = (e: React.PointerEvent, booking: PlanningBooking) => {
    if (e.button !== 0) return;
    if (!DRAGGABLE_STATUSES.has(booking.status ?? "")) return;
    pointerDownRef.current = { x: e.clientX, y: e.clientY, booking, pointerId: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const findCellAt = (el: HTMLElement, clientX: number, clientY: number): { vehicleId: string; dayYmd: string } | null => {
    el.style.pointerEvents = "none";
    const target = document.elementFromPoint(clientX, clientY);
    el.style.pointerEvents = "";
    if (!target) return null;
    let node: Element | null = target;
    while (node) {
      const vid = node.getAttribute("data-vehicle-id");
      const day = node.getAttribute("data-day-ymd");
      if (vid && day) return { vehicleId: vid, dayYmd: day };
      node = node.parentElement;
    }
    return null;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerDownRef.current) return;
    const { x, y, booking } = pointerDownRef.current;
    const dx = e.clientX - x;
    const dy = e.clientY - y;

    if (!draggingRef.current) {
      if (Math.sqrt(dx * dx + dy * dy) < 5) return;
      const [ys, ms, ds] = booking.start_date.split("-").map(Number);
      const [ye, me, de] = booking.end_date.split("-").map(Number);
      const durationDays = differenceInCalendarDays(new Date(ye, me - 1, de), new Date(ys, ms - 1, ds)) + 1;
      const val = { bookingId: booking.id, durationDays };
      draggingRef.current = val;
      didDragRef.current = true;
      setDragging(val);
    }

    const cell = findCellAt(e.currentTarget as HTMLElement, e.clientX, e.clientY);
    setDropTarget(cell);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerDownRef.current) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    if (!draggingRef.current) {
      pointerDownRef.current = null;
      return;
    }

    const cell = findCellAt(e.currentTarget as HTMLElement, e.clientX, e.clientY);
    pointerDownRef.current = null;

    if (cell) {
      void handleDrop(cell.vehicleId, cell.dayYmd);
    } else {
      cancelDrag();
    }
  };

  const handleDrop = async (vehicleId: string, dayYmd: string) => {
    const cur = draggingRef.current;
    if (!cur || moveLoading) return;
    const { bookingId, durationDays } = cur;
    draggingRef.current = null;
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
      <div className="space-y-4 sm:space-y-6">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Planning agence</h1>
          <p className="mt-1 text-sm">
            <Link to="/admin" className="text-primary font-medium hover:underline">
              ← Tableau de bord
            </Link>
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-2 px-4 sm:px-6">
            <CardTitle className="text-lg sm:text-xl">Outils</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Recherche, filtres simples, et rafraîchissement.
            </CardDescription>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Rechercher un véhicule…"
                    className="pl-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") applySearch();
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={applySearch}
                    disabled={loading}
                    className="w-full sm:w-auto"
                  >
                    Rechercher
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={clearSearch}
                    disabled={loading || (!q && !qApplied)}
                    className="w-full sm:w-auto"
                  >
                    Effacer
                  </Button>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => void loadPlanning()}
                disabled={loading}
                className="w-full lg:w-auto shrink-0"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Actualiser
              </Button>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs sm:text-sm font-semibold text-foreground">
                    Disponibilité
                  </Label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <FilterChip
                    label="Tous"
                    icon={<Layers className="h-3.5 w-3.5" />}
                    count={vehicleAvailabilityCounts.all}
                    active={vehicleFilter === "all"}
                    disabled={loading}
                    onClick={() => setVehicleFilter("all")}
                  />
                  <FilterChip
                    label="Actifs"
                    icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                    count={vehicleAvailabilityCounts.active}
                    active={vehicleFilter === "active"}
                    disabled={loading}
                    onClick={() => setVehicleFilter("active")}
                  />
                  <FilterChip
                    label="Hors flotte"
                    icon={<PackageX className="h-3.5 w-3.5" />}
                    count={vehicleAvailabilityCounts.inactive}
                    active={vehicleFilter === "inactive"}
                    disabled={loading}
                    onClick={() => setVehicleFilter("inactive")}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs sm:text-sm font-semibold text-foreground">
                    Aujourd'hui
                  </Label>
                  <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">
                    {format(new Date(), "EEEE d MMM", { locale: fr })}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <FilterChip
                    label="Tout"
                    count={vehicleAvailabilityCounts.all}
                    active={todayFilter === "all"}
                    disabled={loading}
                    onClick={() => handleTodayFilter("all")}
                  />
                  <FilterChip
                    label="Départs"
                    icon={<LogOut className="h-3.5 w-3.5" />}
                    count={todayCounts.departing}
                    active={todayFilter === "departing"}
                    disabled={loading}
                    onClick={() => handleTodayFilter("departing")}
                  />
                  <FilterChip
                    label="Retours"
                    icon={<LogIn className="h-3.5 w-3.5" />}
                    count={todayCounts.returning}
                    active={todayFilter === "returning"}
                    disabled={loading}
                    onClick={() => handleTodayFilter("returning")}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs sm:text-sm font-semibold text-foreground">
                    Cylindrée
                  </Label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <FilterChip
                    label="Toutes"
                    count={cylindreeGroups.total}
                    active={cylindreeFilter === "all"}
                    disabled={loading}
                    onClick={() => setCylindreeFilter("all")}
                  />
                  {cylindreeGroups.values.map(({ cc, count }) => (
                    <FilterChip
                      key={cc}
                      label={`${cc} cc`}
                      count={count}
                      active={cylindreeFilter === String(cc)}
                      disabled={loading || count === 0}
                      onClick={() => setCylindreeFilter(String(cc))}
                    />
                  ))}
                  {cylindreeGroups.unknown > 0 && (
                    <FilterChip
                      label="Non renseignée"
                      icon={<HelpCircle className="h-3.5 w-3.5" />}
                      count={cylindreeGroups.unknown}
                      active={cylindreeFilter === "unknown"}
                      disabled={loading}
                      onClick={() => setCylindreeFilter("unknown")}
                    />
                  )}
                </div>
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

        <Card className="overflow-visible">
          {/* Sticky calé juste sous la navbar globale (top 41px + h-16 = 105px mobile, 45px+64 = 109px desktop). */}
          <CardHeader className="px-4 sm:px-6 space-y-3 sticky top-[105px] md:top-[109px] z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border rounded-t-xl">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-lg sm:text-xl">
                  {viewMode === "week" ? "Vue semaine" : "Vue mois"}
                  <span className="ml-2 text-sm font-medium text-muted-foreground">
                    {periodLabel}
                  </span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {loading ? "Chargement…" : `${vehicles.length} véhicule(s) · ${bookings.length} réservation(s) dans la fenêtre`}
                </CardDescription>
              </div>

              <div className="flex rounded-md border border-border overflow-hidden self-stretch sm:self-auto shrink-0">
                <button
                  type="button"
                  className={cn(
                    "flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-sm",
                    viewMode === "week" && "bg-muted"
                  )}
                  onClick={() => setViewMode("week")}
                  disabled={loading}
                >
                  Semaine
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-sm border-l border-border",
                    viewMode === "month" && "bg-muted"
                  )}
                  onClick={() => setViewMode("month")}
                  disabled={loading}
                >
                  Mois
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:flex sm:flex-wrap sm:items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={runPrev}
                disabled={loading}
                className="px-2 sm:px-3"
                aria-label={viewMode === "week" ? "Semaine précédente" : "Mois précédent"}
              >
                <ChevronLeft className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">
                  {viewMode === "week" ? "Semaine précédente" : "Mois précédent"}
                </span>
              </Button>
              <Button
                type="button"
                onClick={runToday}
                disabled={loading}
                className="px-2 sm:px-3"
              >
                <Calendar className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">
                  {viewMode === "week" ? "Cette semaine" : "Ce mois"}
                </span>
                <span className="sm:hidden text-sm">Aujourd'hui</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={runNext}
                disabled={loading}
                className="px-2 sm:px-3"
                aria-label={viewMode === "week" ? "Semaine suivante" : "Mois suivant"}
              >
                <span className="hidden sm:inline">
                  {viewMode === "week" ? "Semaine suivante" : "Mois suivant"}
                </span>
                <ChevronRight className="h-4 w-4 sm:ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {dragging && !isMobile && (
              <div className="mb-2 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                <span>Glissez vers un jour libre pour déplacer la réservation.</span>
                <button type="button" className="ml-auto text-xs underline opacity-70 hover:opacity-100" onClick={cancelDrag}>
                  Annuler
                </button>
              </div>
            )}
            {isMobile ? (
              <MobileVehicleList
                vehicles={vehicles}
                days={days}
                dayCount={dayCount}
                periodStart={periodStart}
                periodStartYmd={periodStartYmd}
                periodEndYmd={periodEndYmd}
                bookingsByVehicle={bookingsByVehicle}
                todayYmd={todayYmd}
                viewMode={viewMode}
                loading={loading}
                onCreate={(vehicleId, dayYmd) =>
                  navigate(
                    `/admin/bookings/new?vehicleId=${encodeURIComponent(vehicleId)}&start=${encodeURIComponent(dayYmd)}&end=${encodeURIComponent(dayYmd)}`
                  )
                }
                onOpenBooking={(bookingId) => {
                  const b = bookings.find((x) => x.id === bookingId);
                  if (b) openBookingSheet(b);
                  else navigate(`/admin/bookings/${bookingId}`);
                }}
                onOpenPhoto={(v) => setLightboxVehicle(v)}
              />
            ) : (
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
                            "sticky left-0 z-10 border-r border-border bg-background px-3 py-2 text-sm flex items-center gap-2.5",
                            inactive && "bg-muted/30"
                          )}
                        >
                          <VehicleAvatar
                            src={v.primary_photo_url}
                            brand={v.brand}
                            model={v.model}
                            size={40}
                            onOpen={v.primary_photo_url ? () => setLightboxVehicle(v) : undefined}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-foreground truncate">
                              {v.brand} {v.model}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <span className="font-mono">{v.id.slice(0, 8)}…</span>
                              {inactive ? <span className="text-amber-700 dark:text-amber-500">hors flotte</span> : null}
                            </div>
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
                                  data-vehicle-id={v.id}
                                  data-day-ymd={dayYmd}
                                  disabled={(loading || moveLoading) && !draggingRef.current}
                                  onClick={() => {
                                    if (occ || dragging) return;
                                    navigate(
                                      `/admin/bookings/new?vehicleId=${encodeURIComponent(v.id)}&start=${encodeURIComponent(dayYmd)}&end=${encodeURIComponent(dayYmd)}`
                                    );
                                  }}
                                  className={cn(
                                    "border-r last:border-r-0 border-border bg-background text-left transition-colors",
                                    !dragging && !occ && "hover:bg-muted/40",
                                    occ && !dragging && "cursor-not-allowed",
                                    dragging && "cursor-crosshair",
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
                              <div
                                key={b.booking.id}
                                className={cn(
                                  "absolute",
                                  isBeingDragged && "opacity-40 scale-95"
                                )}
                                style={{ left: `${leftPct}%`, width: `${widthPct}%`, top, height: 22 }}
                              >
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onPointerDown={isDraggable ? (e) => handlePointerDown(e, b.booking) : undefined}
                                      onPointerMove={isDraggable ? handlePointerMove : undefined}
                                      onPointerUp={isDraggable ? handlePointerUp : undefined}
                                      onPointerCancel={isDraggable ? cancelDrag : undefined}
                                      onClick={() => {
                                        if (didDragRef.current) { didDragRef.current = false; return; }
                                        openBookingSheet(b.booking);
                                      }}
                                      className={cn(
                                        "w-full h-full rounded-md border px-2 py-1 text-xs text-left shadow-sm hover:shadow transition-shadow",
                                        "focus:outline-none focus:ring-2 focus:ring-primary/40",
                                        isDraggable && "cursor-grab active:cursor-grabbing touch-none",
                                        st.className
                                      )}
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
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            )}

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

      {lightboxVehicle?.primary_photo_url ? (
        <VehiclePhotoLightbox
          src={lightboxVehicle.primary_photo_url}
          brand={lightboxVehicle.brand}
          model={lightboxVehicle.model}
          onClose={() => setLightboxVehicle(null)}
        />
      ) : null}

      <PlanningBookingSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        booking={sheetBooking}
        vehicle={sheetVehicle}
      />
    </TooltipProvider>
  );
}

// =====================================================================
// Vue mobile : liste de cartes véhicule avec frise temporelle pleine largeur
// (drag & drop désactivé sur mobile — pas pratique en tactile)
// =====================================================================

type MobileVehicleListProps = {
  vehicles: PlanningVehicle[];
  days: Date[];
  dayCount: number;
  periodStart: Date;
  periodStartYmd: string;
  periodEndYmd: string;
  bookingsByVehicle: Map<string, PlanningBooking[]>;
  todayYmd: string;
  viewMode: "week" | "month";
  loading: boolean;
  onCreate: (vehicleId: string, dayYmd: string) => void;
  onOpenBooking: (bookingId: string) => void;
  onOpenPhoto: (v: PlanningVehicle) => void;
};

function MobileVehicleList({
  vehicles,
  days,
  dayCount,
  periodStart,
  periodStartYmd,
  periodEndYmd,
  bookingsByVehicle,
  todayYmd,
  viewMode,
  loading,
  onCreate,
  onOpenBooking,
  onOpenPhoto,
}: MobileVehicleListProps) {
  // Vue semaine : 7 jours tiennent toujours dans la largeur disponible.
  // Vue mois : on impose un minWidth pour permettre le scroll horizontal local
  // dans chaque carte (sinon les colonnes seraient trop fines pour être tappables).
  const stripMinWidth = viewMode === "month" ? Math.max(560, dayCount * 22) : 0;

  return (
    <div className="space-y-2">
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
        const lanesHeight = Math.max(36, 6 + lanes * 22);

        const strip = (
          <div style={stripMinWidth ? { minWidth: stripMinWidth } : undefined}>
            <div
              className="grid border-b border-border"
              style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}
            >
              {days.map((d) => {
                const ymd = ymdLocal(d);
                const isToday = ymd === todayYmd;
                return (
                  <div
                    key={ymd}
                    className={cn(
                      "text-center py-1 border-r last:border-r-0 border-border leading-tight",
                      isToday && "bg-primary/15"
                    )}
                  >
                    <div className="text-[10px] font-semibold text-foreground">
                      {format(d, "EEEEE", { locale: fr })}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {format(d, viewMode === "month" ? "d" : "d/M", { locale: fr })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="relative" style={{ height: lanesHeight }}>
              <div
                className="absolute inset-0 grid"
                style={{ gridTemplateColumns: `repeat(${dayCount}, minmax(0, 1fr))` }}
              >
                {days.map((d) => {
                  const dayYmd = ymdLocal(d);
                  const occ = dayIsOccupied(rowBookings, dayYmd);
                  const isToday = dayYmd === todayYmd;
                  return (
                    <button
                      key={dayYmd}
                      type="button"
                      disabled={occ || loading}
                      onClick={() => {
                        if (occ) return;
                        onCreate(v.id, dayYmd);
                      }}
                      className={cn(
                        "border-r last:border-r-0 border-border bg-background text-left",
                        "hover:bg-muted/40 active:bg-muted/60 transition-colors",
                        occ && "cursor-not-allowed hover:bg-background",
                        "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-inset",
                        isToday && "bg-primary/5"
                      )}
                      aria-label={`Créer une réservation pour ${v.brand} ${v.model} le ${dayYmd}`}
                    />
                  );
                })}
              </div>

              {blocks.length === 0 ? (
                <div className="absolute inset-0 flex items-center px-3 text-[11px] text-muted-foreground pointer-events-none">
                  Aucune réservation
                </div>
              ) : null}

              {blocks.map((b) => {
                const leftPct = (b.startIndex / dayCount) * 100;
                const widthPct = (b.spanDays / dayCount) * 100;
                const top = 6 + b.lane * 22;
                const st = bookingStyle(b.booking.status);
                const renterInline = renterInlineLabel(b.booking);
                const refLabel =
                  b.booking.reference_number != null
                    ? `#${b.booking.reference_number}`
                    : b.booking.id.slice(0, 8) + "…";
                const barLabel = [refLabel, renterInline].filter(Boolean).join(" · ");
                return (
                  <button
                    key={b.booking.id}
                    type="button"
                    onClick={() => onOpenBooking(b.booking.id)}
                    className={cn(
                      "absolute rounded-md border px-1.5 text-[10px] text-left shadow-sm leading-tight",
                      "focus:outline-none focus:ring-2 focus:ring-primary/40",
                      st.className
                    )}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top,
                      height: 18,
                    }}
                    aria-label={`Ouvrir la réservation ${refLabel}`}
                  >
                    <div className="truncate font-medium">{barLabel || st.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );

        return (
          <div
            key={v.id}
            className={cn(
              "rounded-lg border border-border bg-background overflow-hidden",
              inactive && "bg-muted/30"
            )}
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
              <VehicleAvatar
                src={v.primary_photo_url}
                brand={v.brand}
                model={v.model}
                size={36}
                onOpen={v.primary_photo_url ? () => onOpenPhoto(v) : undefined}
              />
              <div className="font-medium text-sm text-foreground truncate min-w-0 flex-1">
                {v.brand} {v.model}
              </div>
              {inactive ? (
                <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  hors flotte
                </span>
              ) : null}
            </div>

            {stripMinWidth > 0 ? (
              <div className="overflow-x-auto">{strip}</div>
            ) : (
              strip
            )}
          </div>
        );
      })}
    </div>
  );
}
