import { Link } from "react-router-dom";
import { ArrowLeft, CalendarRange } from "lucide-react";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { DualPrice } from "@/components/currency/DualPrice";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { formatBookingRef, formatDateFr, formatRentalDuration } from "../utils/bookingDisplay";

type BookingDetailHeaderProps = {
  bookingId: string;
  referenceNumber: number | null | undefined;
  status: string;
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  pickupLocation?: string | null;
  returnLocation?: string | null;
  totalEur: number;
};

export function BookingDetailHeader({
  bookingId,
  referenceNumber,
  status,
  startDate,
  endDate,
  startTime,
  endTime,
  pickupLocation,
  returnLocation,
  totalEur,
}: BookingDetailHeaderProps) {
  const duration = formatRentalDuration(startDate, endDate, startTime, endTime);
  const { footnote } = useExchangeRate();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          to="/admin/planning"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Planning
        </Link>
        <span className="text-border">·</span>
        <Link to="/admin/bookings" className="text-primary font-medium hover:underline">
          Toutes les réservations
        </Link>
        <span className="text-border">·</span>
        <Link to="/admin/bookings/new" className="text-primary font-medium hover:underline">
          Nouvelle réservation
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                {formatBookingRef(referenceNumber)}
              </h1>
              <BookingStatusBadge status={status} />
            </div>
            <p className="font-mono text-xs text-muted-foreground truncate" title={bookingId}>
              {bookingId}
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">Total locataire</div>
            <DualPrice
              amountMga={totalEur}
              variant="admin"
              className="items-start sm:items-end"
              primaryClassName="text-2xl sm:text-3xl font-bold tabular-nums text-foreground"
              secondaryClassName="text-sm"
            />
            <p className="text-[10px] text-muted-foreground mt-1 max-w-[220px] sm:ml-auto">{footnote}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg bg-muted/40 px-4 py-3">
          <div className="flex items-start gap-3 min-w-0">
            <CalendarRange className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="font-medium text-foreground">
                {formatDateFr(startDate, startTime)} → {formatDateFr(endDate, endTime)}
              </div>
              <div className="text-sm text-muted-foreground">{duration}</div>
            </div>
          </div>
          {(pickupLocation || returnLocation) && (
            <div className="text-sm text-muted-foreground sm:text-right">
              <div>Prise : {pickupLocation ?? "—"}</div>
              <div>Retour : {returnLocation ?? pickupLocation ?? "—"}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
