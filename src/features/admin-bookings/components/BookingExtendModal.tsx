import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DualPrice } from "@/components/currency/DualPrice";
import { adminPreviewExtendBooking } from "@/services/adminApi";

type BookingExtendModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  currentEndDate: string;
  currentEndTime: string;
  onConfirm: (newEndDate: string, newEndTime: string) => Promise<void>;
  confirmLoading: boolean;
};

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  const ys = dt.getFullYear();
  const ms = String(dt.getMonth() + 1).padStart(2, "0");
  const ds = String(dt.getDate()).padStart(2, "0");
  return `${ys}-${ms}-${ds}`;
}

export function BookingExtendModal({
  open,
  onOpenChange,
  bookingId,
  currentEndDate,
  currentEndTime,
  onConfirm,
  confirmLoading,
}: BookingExtendModalProps) {
  const minEndDate = addDaysYmd(currentEndDate.split("T")[0], 1);
  const [newEndDate, setNewEndDate] = useState(minEndDate);
  const [newEndTime, setNewEndTime] = useState(currentEndTime || "09:00");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    deltaTotalTTC: number;
    deltaSubtotal: number;
    newTotalTTC: number;
    rentalDaysAdded: number;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setNewEndDate(minEndDate);
      setNewEndTime(currentEndTime || "09:00");
      setPreview(null);
      setPreviewError(null);
    }
  }, [open, minEndDate, currentEndTime]);

  useEffect(() => {
    if (!open || !bookingId || !newEndDate || newEndDate <= currentEndDate.split("T")[0]) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const data = await adminPreviewExtendBooking(bookingId, {
          newEndDate,
          newEndTime,
          preview: true,
        });
        if (!cancelled) {
          setPreview({
            deltaTotalTTC: data.delta.totalTTC,
            deltaSubtotal: data.delta.subtotal,
            newTotalTTC: data.newTotalTTC,
            rentalDaysAdded: data.delta.rentalDaysAdded,
          });
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setPreview(null);
          setPreviewError(e instanceof Error ? e.message : "Erreur de calcul");
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, bookingId, newEndDate, newEndTime, currentEndDate]);

  const durationLabel = useMemo(() => {
    if (!preview?.rentalDaysAdded) return null;
    const days = preview.rentalDaysAdded;
    if (days === 1) return "+1 jour";
    return `+${days.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} j`;
  }, [preview]);

  const handleConfirm = async () => {
    await onConfirm(newEndDate, newEndTime);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Prolonger la location</DialogTitle>
          <DialogDescription>
            Fin actuelle : {currentEndDate.split("T")[0]}
            {currentEndTime ? ` à ${currentEndTime.slice(0, 5)}` : ""}. Choisissez une nouvelle date de retour.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="extend-end-date">Nouvelle date de fin</Label>
            <Input
              id="extend-end-date"
              type="date"
              min={minEndDate}
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
              disabled={confirmLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="extend-end-time">Heure de retour</Label>
            <Input
              id="extend-end-time"
              type="time"
              value={newEndTime.slice(0, 5)}
              onChange={(e) => setNewEndTime(e.target.value)}
              disabled={confirmLoading}
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm space-y-2">
            {previewLoading ? (
              <p className="text-muted-foreground">Calcul en cours…</p>
            ) : previewError ? (
              <p className="text-destructive">{previewError}</p>
            ) : preview ? (
              <>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Jours ajoutés</span>
                  <span className="font-medium">{durationLabel}</span>
                </div>
                <div className="flex justify-between gap-2 items-start">
                  <span className="text-muted-foreground">Supplément</span>
                  <DualPrice amountMga={preview.deltaTotalTTC} variant="admin" primaryClassName="font-semibold text-primary" />
                </div>
                <div className="flex justify-between gap-2 items-start border-t border-border/60 pt-2">
                  <span className="text-muted-foreground">Nouveau total TTC</span>
                  <DualPrice amountMga={preview.newTotalTTC} variant="admin" primaryClassName="font-bold" />
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Sélectionnez une date postérieure à la fin actuelle.</p>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={confirmLoading}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={confirmLoading || previewLoading || !!previewError || !preview}
          >
            {confirmLoading ? "Prolongation…" : "Confirmer la prolongation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
