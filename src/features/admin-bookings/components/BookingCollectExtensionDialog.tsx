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
import { formatMoney } from "@/features/back-office/components/MoneyInput";

type BookingCollectExtensionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountEuros: number;
  collectDate: string;
  collectOpm: "cash" | "card_terminal" | "";
  loading: boolean;
  onDateChange: (v: string) => void;
  onOpmChange: (v: "cash" | "card_terminal" | "") => void;
  onConfirm: () => void;
};

export function BookingCollectExtensionDialog({
  open,
  onOpenChange,
  amountEuros,
  collectDate,
  collectOpm,
  loading,
  onDateChange,
  onOpmChange,
  onConfirm,
}: BookingCollectExtensionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Encaisser le supplément</DialogTitle>
          <DialogDescription>
            Montant de la prolongation : <strong>{formatMoney(amountEuros)}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ext-collect-date">Date d'encaissement</Label>
            <Input
              id="ext-collect-date"
              type="date"
              value={collectDate}
              onChange={(e) => onDateChange(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ext-collect-opm">Mode de paiement</Label>
            <select
              id="ext-collect-opm"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={collectOpm}
              onChange={(e) => onOpmChange(e.target.value as "cash" | "card_terminal" | "")}
              disabled={loading}
            >
              <option value="">— Non précisé —</option>
              <option value="cash">Espèces</option>
              <option value="card_terminal">CB (terminal)</option>
            </select>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button type="button" onClick={onConfirm} disabled={loading}>
            {loading ? "Enregistrement…" : "Confirmer l'encaissement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
