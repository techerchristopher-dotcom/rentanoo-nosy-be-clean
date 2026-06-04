import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { ariaryToEur, formatAriary, formatEur, roundAriaryToThousand } from "@/utils/dualCurrency";

type BookingCollectCashDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Montant de référence en ariary (MGA). */
  amountMga: number;
  loading: boolean;
  onConfirmEur: () => void;
  onConfirmAriary: (amountMga: number) => void;
  title?: string;
};

export function BookingCollectCashDialog({
  open,
  onOpenChange,
  amountMga,
  loading,
  onConfirmEur,
  onConfirmAriary,
  title = "Encaisser en espèces",
}: BookingCollectCashDialogProps) {
  const { config, footnote } = useExchangeRate();
  const mgaRounded = roundAriaryToThousand(amountMga);
  const eurEquivalent = ariaryToEur(mgaRounded, config.rate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Choisissez la devise encaissée à l&apos;agence.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-muted-foreground">{footnote}</p>
          <Button
            type="button"
            variant="outline"
            className="w-full h-auto py-4 flex flex-col items-start gap-1"
            disabled={loading}
            onClick={onConfirmEur}
          >
            <span className="font-semibold text-base">{formatEur(eurEquivalent)}</span>
            <span className="text-xs text-muted-foreground font-normal">
              Encaissement en euros (≈ {formatAriary(mgaRounded)})
            </span>
          </Button>
          <Button
            type="button"
            className="w-full h-auto py-4 flex flex-col items-start gap-1"
            disabled={loading}
            onClick={() => onConfirmAriary(mgaRounded)}
          >
            <span className="font-semibold text-base">{formatAriary(mgaRounded)}</span>
            <span className="text-xs opacity-90 font-normal">Encaissement en ariary (référence)</span>
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
