import { useState } from "react";
import { Link } from "react-router-dom";
import { Banknote, CalendarPlus, ClipboardCheck, CreditCard, Shield, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DualPrice } from "@/components/currency/DualPrice";
import { cn } from "@/lib/utils";
import type { ExtensionPending } from "../utils/extensionMeta";

type PaymentMethodChoice = "cash" | "card";

type BookingActionsBarProps = {
  bookingId: string;
  status: string;
  isAdminPricing: boolean;
  needsPayment: boolean;
  paymentSummary: string | null;
  totalEur: number;
  payLoading: boolean;
  collectLoading: boolean;
  canTakeDeposit: boolean;
  canCancelBooking: boolean;
  cancelLoading: boolean;
  canExtend: boolean;
  extensionPending: ExtensionPending | null;
  isWebPricing: boolean;
  extensionPayLoading: boolean;
  extensionCollectLoading: boolean;
  onCollectCash: () => void;
  onPayCard: () => void;
  onTakeDeposit: () => void;
  onExtend: () => void;
  onCollectExtensionCash: () => void;
  onPayExtensionStripe: () => void;
  onCancel: () => void;
};

function PaymentMethodPicker({
  value,
  onChange,
  disabled,
}: {
  value: PaymentMethodChoice;
  onChange: (v: PaymentMethodChoice) => void;
  disabled?: boolean;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as PaymentMethodChoice)}
      className="grid grid-cols-2 gap-2"
      disabled={disabled}
    >
      <Label
        htmlFor="pay-cash"
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
          value === "cash" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <RadioGroupItem value="cash" id="pay-cash" />
        <Banknote className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">Espèces</span>
      </Label>
      <Label
        htmlFor="pay-card"
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
          value === "card" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <RadioGroupItem value="card" id="pay-card" />
        <CreditCard className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">Carte bancaire</span>
      </Label>
    </RadioGroup>
  );
}

export function BookingActionsBar({
  bookingId,
  status,
  isAdminPricing,
  needsPayment,
  paymentSummary,
  totalEur,
  payLoading,
  collectLoading,
  canTakeDeposit,
  canCancelBooking,
  cancelLoading,
  canExtend,
  extensionPending,
  isWebPricing,
  extensionPayLoading,
  extensionCollectLoading,
  onCollectCash,
  onPayCard,
  onTakeDeposit,
  onExtend,
  onCollectExtensionCash,
  onPayExtensionStripe,
  onCancel,
}: BookingActionsBarProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodChoice>("cash");
  const [extensionMethod, setExtensionMethod] = useState<PaymentMethodChoice>("cash");

  const showAdminPaymentChoice = isAdminPricing && needsPayment;
  const showWebStripeOnly = !isAdminPricing && needsPayment;

  return (
    <div className="space-y-4">
      {extensionPending ? (
        <Card className="border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/20">
          <CardContent className="pt-4 space-y-4">
            <div>
              <div className="font-medium text-violet-900 dark:text-violet-100">Supplément prolongation</div>
              <div className="text-sm text-violet-800/80 dark:text-violet-200/80">
                <DualPrice amountMga={extensionPending.deltaTotalTTC} variant="admin" inline />
                {" "}à encaisser
              </div>
            </div>
            {isWebPricing ? (
              <Button type="button" onClick={onPayExtensionStripe} disabled={extensionPayLoading}>
                {extensionPayLoading ? "Ouverture Stripe…" : "Payer le supplément par CB"}
              </Button>
            ) : (
              <>
                <PaymentMethodPicker
                  value={extensionMethod}
                  onChange={setExtensionMethod}
                  disabled={extensionCollectLoading || extensionPayLoading}
                />
                {extensionMethod === "cash" ? (
                  <Button type="button" onClick={onCollectExtensionCash} disabled={extensionCollectLoading}>
                    {extensionCollectLoading ? "Encaissement…" : "Encaisser le supplément en espèces"}
                  </Button>
                ) : (
                  <Button type="button" onClick={onPayExtensionStripe} disabled={extensionPayLoading}>
                    {extensionPayLoading ? "Ouverture Stripe…" : "Payer le supplément par CB"}
                  </Button>
                )}
              </>
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
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5" />
              Paiement
              {needsPayment ? (
                <span className="normal-case font-bold text-foreground ml-1">
                  — <DualPrice amountMga={totalEur} variant="admin" inline />
                </span>
              ) : null}
            </div>

            {paymentSummary ? (
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{paymentSummary}</p>
            ) : null}

            {showAdminPaymentChoice ? (
              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">Comment le client règle ?</p>
                <PaymentMethodPicker
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  disabled={collectLoading || payLoading}
                />
                {paymentMethod === "cash" ? (
                  <Button type="button" onClick={onCollectCash} disabled={collectLoading} className="w-full sm:w-auto">
                    {collectLoading ? "Encaissement…" : "Encaisser en espèces"}
                  </Button>
                ) : (
                  <Button type="button" onClick={onPayCard} disabled={payLoading} className="w-full sm:w-auto">
                    {payLoading ? "Ouverture Stripe…" : "Payer par CB"}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  {paymentMethod === "cash"
                    ? "Encaisse le montant et confirme la réservation automatiquement."
                    : "Ouvre la page Stripe pour le paiement en ligne."}
                </p>
              </div>
            ) : null}

            {showWebStripeOnly ? (
              <div className="space-y-2">
                <Button type="button" onClick={onPayCard} disabled={payLoading}>
                  {payLoading ? "Ouverture Stripe…" : "Payer par CB"}
                </Button>
                <p className="text-xs text-muted-foreground">Paiement en ligne via Stripe.</p>
              </div>
            ) : null}

            {!needsPayment && !paymentSummary && status !== "confirmed" ? (
              <p className="text-xs text-muted-foreground">Aucune action de paiement disponible pour ce statut.</p>
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
