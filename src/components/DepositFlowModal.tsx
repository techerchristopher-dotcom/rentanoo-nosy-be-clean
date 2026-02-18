import React, { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/stripePublicKey";
import { createSetupIntentClientSecret, attachPaymentMethod } from "@/lib/depositCaution";
import {
  sendDepositConversion,
  hasDepositConversionBeenSent,
  markDepositConversionSent,
} from "@/lib/gtag";
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
}

function DepositPaymentForm({
  bookingId,
  onSuccess,
  onClose,
  onError,
  isSubmitting,
  setIsSubmitting,
}: {
  bookingId: string;
  onSuccess: () => void;
  onClose: () => void;
  onError: (msg: string) => void;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
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
          return_url: `${window.location.origin}/me/renter/bookings`,
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

      await attachPaymentMethod(bookingId, pmId);
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />
      <div className="flex flex-col sm:flex-row gap-2 pt-2">
        <Button
          type="submit"
          disabled={!stripe || isSubmitting}
          className="w-full sm:flex-1 bg-gradient-lagoon hover:opacity-90 text-white"
        >
          {isSubmitting ? t("depositModal.submitting", "Enregistrement...") : t("depositModal.submit", "Enregistrer ma carte")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {t("depositModal.cancel", "Annuler")}
        </Button>
      </div>
    </form>
  );
}

export function DepositFlowModal({ isOpen, onClose, bookingId, depositAmount, onSuccess }: DepositFlowModalProps) {
  const { t } = useTranslation("common");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !bookingId) return;

    setError(null);
    setClientSecret(null);
    setLoading(true);

    createSetupIntentClientSecret(bookingId)
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
          "w-full max-w-lg mx-4",
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "max-h-[90vh] overflow-y-auto flex flex-col gap-4",
          "rounded-2xl shadow-xl bg-white dark:bg-background",
          "p-4 sm:p-6 md:p-8"
        )}
      >
        {/* HEADER */}
        <DialogHeader>
          <DialogTitle id="deposit-modal-title" className="text-xl font-bold">
            {t("depositModal.title", "Activer la caution")}
          </DialogTitle>
        </DialogHeader>

        {/* BODY — Texte rassurant */}
        <div className="flex flex-col gap-4 overflow-y-auto min-h-0 flex-1">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {t("depositModal.description", "Aucun débit immédiat.\n\nVous enregistrez simplement votre carte pour sécuriser la caution de {{amount}}.\nUne empreinte pourra être réalisée automatiquement 48h avant le départ, puis libérée 48h après le retour si tout est conforme.\n\nSimple, sécurisé et sans surprise.", {
              amount: formattedAmount,
            })}
          </p>

          {/* BLOC INFO — Montant caution */}
          <div className="bg-muted/60 rounded-lg p-3 text-sm">
            <span className="font-medium text-foreground">
              {t("depositModal.amountLabel", "Montant de la caution : {{amount}}", { amount: formattedAmount })}
            </span>
          </div>

          {/* LIEN */}
          <a
            href="/sinistre-caution"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
          >
            {t("depositModal.learnMore", "En savoir plus sur la caution et les sinistres")}
            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
          </a>

          {error && (
            <div className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20">
              {error}
            </div>
          )}

          {loading && !clientSecret && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <span className="text-sm">{t("depositModal.loading", "Chargement du formulaire...")}</span>
            </div>
          )}

          {clientSecret && stripePromise && (
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
              />
            </Elements>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
