import React, { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/stripePublicKey";
import { createSetupIntentClientSecret, attachPaymentMethod } from "@/lib/depositCaution";
import {
  sendDepositConversion,
  hasDepositConversionBeenSent,
  markDepositConversionSent,
} from "@/lib/analytics";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;
console.log("[DepositFlowModal] pk present?", !!STRIPE_PUBLISHABLE_KEY, "pk prefix:", (STRIPE_PUBLISHABLE_KEY || "").slice(0, 3));
console.log("[DepositFlowModal] stripePromise null?", stripePromise === null);

interface DepositFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  depositAmount: number;
  onSuccess: () => void;
  /**
   * Optionnel : override des appels API (ex: mode admin/agence).
   * Par défaut, utilise `/api/deposit/*` (mode locataire).
   */
  createClientSecretFn?: (bookingId: string) => Promise<{ clientSecret: string }>;
  attachPaymentMethodFn?: (bookingId: string, paymentMethodId: string) => Promise<{ ok: boolean }>;
  /** Optionnel : URL de retour Stripe (confirmSetup) */
  returnUrl?: string;
}

function DepositPaymentForm({
  bookingId,
  onSuccess,
  onClose,
  onError,
  isSubmitting,
  setIsSubmitting,
  children,
  attachPaymentMethodFn,
  returnUrl,
}: {
  bookingId: string;
  onSuccess: () => void;
  onClose: () => void;
  onError: (msg: string) => void;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
  children: React.ReactNode;
  attachPaymentMethodFn: (bookingId: string, paymentMethodId: string) => Promise<{ ok: boolean }>;
  returnUrl: string;
}) {
  const { t } = useTranslation("common");
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
        redirect: "if_required",
      });

      if (error) {
        const msg = error.message || "Erreur lors de la vérification de la carte";
        onError(msg);
        setIsSubmitting(false);
        return;
      }

      const pmId = typeof setupIntent?.payment_method === "string"
        ? setupIntent.payment_method
        : (setupIntent?.payment_method as { id?: string })?.id;

      if (!pmId) {
        onError("Impossible de récupérer les informations de la carte");
        setIsSubmitting(false);
        return;
      }

      await attachPaymentMethodFn(bookingId, pmId);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      onError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 min-w-0">
      {/* Body scrollable — seul le contenu scrolle, pas le footer */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden min-w-0 pb-4">
        <div className="flex flex-col gap-4">
          {children}
          <div className="min-w-0 overflow-hidden">
            <PaymentElement
              options={{
                layout: "tabs",
              }}
            />
          </div>
        </div>
      </div>
      {/* Footer sticky — toujours visible en bas, safe-area iOS */}
      <footer
        className={cn(
          "sticky bottom-0 shrink-0 bg-background/95 backdrop-blur border-t p-4",
          "pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
        )}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="submit"
            disabled={!stripe || isSubmitting}
            className="w-full sm:flex-1 bg-gradient-lagoon hover:opacity-90 text-white order-2 sm:order-1"
          >
            {isSubmitting ? t("depositModal.submitting", "Enregistrement...") : t("depositModal.submit", "Enregistrer ma carte")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto order-1 sm:order-2"
          >
            {t("depositModal.cancel", "Annuler")}
          </Button>
        </div>
      </footer>
    </form>
  );
}

export function DepositFlowModal({
  isOpen,
  onClose,
  bookingId,
  depositAmount,
  onSuccess,
  createClientSecretFn,
  attachPaymentMethodFn,
  returnUrl,
}: DepositFlowModalProps) {
  const { t } = useTranslation("common");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createSecret = createClientSecretFn ?? createSetupIntentClientSecret;
  const attachPm = attachPaymentMethodFn ?? attachPaymentMethod;
  const resolvedReturnUrl = returnUrl ?? `${window.location.origin}/me/renter/bookings`;

  useEffect(() => {
    if (!isOpen || !bookingId) return;

    setError(null);
    setClientSecret(null);
    setLoading(true);

    createSecret(bookingId)
      .then(({ clientSecret: secret }) => {
        setClientSecret(secret);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, bookingId]);

  const handleSuccess = () => {
    // Conversion Google Ads "deposit" (caution activée)
    const txId = `deposit_${bookingId}`;
    if (!hasDepositConversionBeenSent(txId)) {
      sendDepositConversion({
        value: depositAmount,
        currency: "EUR",
        transaction_id: txId,
      });
      markDepositConversionSent(txId);
    }
    onSuccess();
  };

  const handleError = (msg: string) => {
    setError(msg);
  };

  const formattedAmount = depositAmount != null ? `${depositAmount.toFixed(2)} €` : "0 €";

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        role="dialog"
        aria-modal="true"
        aria-labelledby="deposit-modal-title"
        className={cn(
          "w-[95vw] max-w-[calc(100vw-2rem)] sm:max-w-xl md:max-w-2xl",
          "fixed left-1/2 top-[2rem] sm:top-1/2 -translate-x-1/2 sm:-translate-y-1/2",
          "max-h-[calc(100dvh-4rem)] flex flex-col gap-0 overflow-hidden",
          "rounded-2xl shadow-xl bg-white dark:bg-background",
          "p-4 sm:p-6 md:p-8"
        )}
      >
        {/* HEADER — shrink-0 */}
        <DialogHeader className="shrink-0">
          <DialogTitle id="deposit-modal-title" className="text-xl font-bold">
            {t("depositModal.title", "Activer la caution")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t(
              "depositModal.a11ySummary",
              "Enregistrement de carte pour la caution, sans débit immédiat."
            )}
          </DialogDescription>
        </DialogHeader>

        {/* BODY + FOOTER — flex container : body scrollable + footer sticky */}
        <div className="flex-1 flex flex-col min-h-0 mt-4">
          {loading && !clientSecret ? (
            <div className="flex-1 flex items-center justify-center py-8 text-muted-foreground">
              <span className="text-sm">{t("depositModal.loading", "Chargement du formulaire...")}</span>
            </div>
          ) : clientSecret && stripePromise ? (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: { theme: "stripe" },
              }}
            >
              <DepositPaymentForm
                bookingId={bookingId}
                onSuccess={handleSuccess}
                onClose={onClose}
                onError={handleError}
                isSubmitting={isSubmitting}
                setIsSubmitting={setIsSubmitting}
                attachPaymentMethodFn={attachPm}
                returnUrl={resolvedReturnUrl}
              >
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {t("depositModal.description", "Aucun débit immédiat.\n\nVous enregistrez simplement votre carte pour sécuriser la caution de {{amount}}.\nUne empreinte pourra être réalisée automatiquement 48h avant le départ, puis libérée 48h après le retour si tout est conforme.\n\nSimple, sécurisé et sans surprise.", {
                    amount: formattedAmount,
                  })}
                </p>
                <div className="bg-muted/60 rounded-lg p-3 text-sm min-w-0">
                  <span className="font-medium text-foreground break-words">
                    {t("depositModal.amountLabel", "Montant de la caution : {{amount}}", { amount: formattedAmount })}
                  </span>
                </div>
                <a
                  href="/sinistre-caution"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium min-w-0 break-words"
                >
                  {t("depositModal.learnMore", "En savoir plus sur la caution et les sinistres")}
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                </a>
                {error && (
                  <div className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                    {error}
                  </div>
                )}
              </DepositPaymentForm>
            </Elements>
          ) : (
            <div className="flex-1 flex flex-col gap-4">
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {t("depositModal.description", "Aucun débit immédiat.\n\nVous enregistrez simplement votre carte pour sécuriser la caution de {{amount}}.\nUne empreinte pourra être réalisée automatiquement 48h avant le départ, puis libérée 48h après le retour si tout est conforme.\n\nSimple, sécurisé et sans surprise.", {
                  amount: formattedAmount,
                })}
              </p>
              {error && (
                <div className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
