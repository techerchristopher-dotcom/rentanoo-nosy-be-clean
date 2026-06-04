import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BookingStatusBadge } from "@/features/admin-bookings/components/BookingStatusBadge";
import { DualPrice } from "@/components/currency/DualPrice";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { formatBookingRef, formatDateFr } from "@/features/admin-bookings/utils/bookingDisplay";
import type { PlanningBooking, PlanningVehicle } from "@/services/adminPlanningApi";

type PlanningBookingSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: PlanningBooking | null;
  vehicle: PlanningVehicle | null;
};

function renterName(renter: PlanningBooking["renter"]): string {
  if (!renter) return "—";
  const name = `${renter.first_name ?? ""} ${renter.last_name ?? ""}`.trim();
  return name || renter.email || "—";
}

export function PlanningBookingSheet({ open, onOpenChange, booking, vehicle }: PlanningBookingSheetProps) {
  const { footnote } = useExchangeRate();
  if (!booking) return null;

  const totalEur = Number(booking.total_price ?? 0) || 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 flex-wrap">
            {formatBookingRef(booking.reference_number)}
            <BookingStatusBadge status={booking.status ?? "—"} />
          </SheetTitle>
          <SheetDescription>Aperçu rapide — actions complètes sur la fiche réservation.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5 text-sm">
          <div className="rounded-lg bg-muted/40 p-4 space-y-2">
            <div className="font-medium">
              {formatDateFr(booking.start_date, booking.start_time)} →{" "}
              {formatDateFr(booking.end_date, booking.end_time)}
            </div>
            {booking.pickup_location ? (
              <div className="text-muted-foreground">Prise : {booking.pickup_location}</div>
            ) : null}
          </div>

          {totalEur > 0 ? (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Total locataire</div>
              <DualPrice amountMga={totalEur} variant="admin" primaryClassName="text-lg font-bold" />
              <p className="text-[10px] text-muted-foreground mt-1">{footnote}</p>
            </div>
          ) : null}

          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Locataire</div>
            <div className="font-medium">{renterName(booking.renter)}</div>
            {booking.renter?.email ? (
              <div className="text-muted-foreground">{booking.renter.email}</div>
            ) : null}
          </div>

          {vehicle ? (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Véhicule</div>
              <div className="font-medium">
                {vehicle.brand} {vehicle.model}
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 pt-2">
            <Button asChild>
              <Link to={`/admin/bookings/${booking.id}`}>
                Voir la fiche complète
                <ExternalLink className="h-4 w-4 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
