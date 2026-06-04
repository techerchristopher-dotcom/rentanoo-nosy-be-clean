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
import { formatEur, formatAriary, eurToAriary } from "@/utils/dualCurrency";

type BookingCollectCashDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountEur: number;
  loading: boolean;
  onConfirmEur: () => void;
  onConfirmAriary: (amountMga: number) => void;
  title?: string;
};

export function BookingCollectCashDialog({
  open,
  onOpenChange,
  amountEur,
  loading,
  onConfirmEur,
  onConfirmAriary,
  title = "Encaisser en espèces",
}: BookingCollectCashDialogProps) {
  const { config, footnote } = useExchangeRate();
  const amountMga = eurToAriary(amountEur, config.rate);

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
            <span className="font-semibold text-base">{formatEur(amountEur)}</span>
            <span className="text-xs text-muted-foreground font-normal">Encaissement en euros</span>
          </Button>
          <Button
            type="button"
            className="w-full h-auto py-4 flex flex-col items-start gap-1"
            disabled={loading}
            onClick={() => onConfirmAriary(amountMga)}
          >
            <span className="font-semibold text-base">{formatAriary(amountMga)}</span>
            <span className="text-xs opacity-90 font-normal">
              Encaissement en ariary (≈ {formatEur(amountEur)})
            </span>
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
