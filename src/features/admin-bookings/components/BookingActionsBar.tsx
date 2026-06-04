import { Link } from "react-router-dom";
import { CalendarPlus, ClipboardCheck, CreditCard, Shield, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/features/back-office/components/MoneyInput";
import type { ExtensionPending } from "../utils/extensionMeta";

type BookingActionsBarProps = {
  bookingId: string;
  status: string;
  isAdminPricing: boolean;
  canPayNow: boolean;
  payLoading: boolean;
  canTakeDeposit: boolean;
  canCollectInitial: boolean;
  collectLoading: boolean;
  canCancelBooking: boolean;
  cancelLoading: boolean;
  canExtend: boolean;
  extensionPending: ExtensionPending | null;
  isWebPricing: boolean;
  extensionPayLoading: boolean;
  opmDraft: "cash" | "card_terminal" | "";
  opmSaveLoading: boolean;
  currentOpm: string;
  onOpmChange: (v: "cash" | "card_terminal" | "") => void;
  onSaveOpm: () => void;
  onPayNow: () => void;
  onTakeDeposit: () => void;
  onCollectInitial: () => void;
  onExtend: () => void;
  onCollectExtension: () => void;
  onPayExtensionStripe: () => void;
  onCancel: () => void;
  paidAtLabel?: string | null;
};

export function BookingActionsBar({
  bookingId,
  status,
  isAdminPricing,
  canPayNow,
  payLoading,
  canTakeDeposit,
  canCollectInitial,
  collectLoading,
  canCancelBooking,
  cancelLoading,
  canExtend,
  extensionPending,
  isWebPricing,
  extensionPayLoading,
  opmDraft,
  opmSaveLoading,
  currentOpm,
  onOpmChange,
  onSaveOpm,
  onPayNow,
  onTakeDeposit,
  onCollectInitial,
  onExtend,
  onCollectExtension,
  onPayExtensionStripe,
  onCancel,
  paidAtLabel,
}: BookingActionsBarProps) {
  return (
    <div className="space-y-4">
      {extensionPending ? (
        <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/20">
          <CardContent className="pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium text-violet-900 dark:text-violet-100">Supplément prolongation</div>
              <div className="text-sm text-violet-800/80 dark:text-violet-200/80">
                {formatMoney(extensionPending.deltaTotalTTC)} à encaisser
              </div>
            </div>
            {isWebPricing ? (
              <Button type="button" onClick={onPayExtensionStripe} disabled={extensionPayLoading}>
                {extensionPayLoading ? "Ouverture Stripe…" : "Payer le supplément"}
              </Button>
            ) : (
              <Button type="button" onClick={onCollectExtension}>
                Encaisser le supplément
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Paiement */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              Paiement
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={onPayNow} disabled={!canPayNow || payLoading}>
                {payLoading ? "Ouverture Stripe…" : "Passer au paiement"}
              </Button>
              {canCollectInitial ? (
                <Button type="button" variant="secondary" onClick={onCollectInitial} disabled={collectLoading}>
                  Enregistrer l'encaissement
                </Button>
              ) : null}
              {paidAtLabel ? (
                <span className="self-center text-sm text-muted-foreground">Encaissé le {paidAtLabel}</span>
              ) : null}
            </div>
            {!canPayNow && status !== "confirmed" && !canCollectInitial ? (
              <p className="text-xs text-muted-foreground">
                Paiement Stripe disponible en statut « en attente de paiement ».
              </p>
            ) : null}
          </div>

          {/* Caution */}
          <div className="space-y-2 border-t border-border pt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              Caution
            </div>
            <Button type="button" variant="outline" onClick={onTakeDeposit} disabled={!canTakeDeposit}>
              Prendre la caution
            </Button>
          </div>

          {/* Opérations */}
          <div className="space-y-2 border-t border-border pt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Opérations
            </div>
            <div className="flex flex-wrap gap-2">
              {canExtend ? (
                <Button type="button" variant="outline" onClick={onExtend}>
                  <CalendarPlus className="h-4 w-4 mr-1.5" />
                  Prolonger
                </Button>
              ) : null}
              <Button asChild variant="outline" size="default">
                <Link to={`/checking/${bookingId}`}>État des lieux départ</Link>
              </Button>
              <Button asChild variant="outline" size="default">
                <Link to={`/checkin-return/${bookingId}`}>État des lieux retour</Link>
              </Button>
            </div>
          </div>

          {/* Mode paiement agence */}
          {isAdminPricing ? (
            <div className="space-y-2 border-t border-border pt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                Mode de paiement agence
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs"
                  value={opmDraft}
                  onChange={(e) => onOpmChange(e.target.value as "cash" | "card_terminal" | "")}
                  disabled={opmSaveLoading}
                >
                  <option value="">— Non précisé —</option>
                  <option value="cash">Espèces</option>
                  <option value="card_terminal">CB (terminal)</option>
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={onSaveOpm}
                  disabled={opmSaveLoading || opmDraft === currentOpm}
                >
                  {opmSaveLoading ? "…" : "Sauvegarder"}
                </Button>
              </div>
            </div>
          ) : null}

          {/* Danger */}
          {canCancelBooking ? (
            <div className="border-t border-border pt-4">
              <Button type="button" variant="destructive" onClick={onCancel} disabled={cancelLoading}>
                {cancelLoading ? "Annulation…" : "Annuler la réservation"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
