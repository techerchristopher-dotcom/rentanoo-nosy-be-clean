import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, ShieldCheck, Hourglass, Banknote, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ClientPriceRow } from "@/components/currency/PriceRows";
import { DualPrice } from "@/components/currency/DualPrice";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { isCashOnSitePayment } from "@/utils/renterPaymentFromBooking";

export type ReservationPayment = {
  id: string | number;
  voiture: string;
  dateDebut: string;
  dateFin: string;
  duree: string;
  montantDeBase: number;
  fraisService: number;
  totalTTC: number;
  extras?: Array<{ label: string; price: number }>;
  paymentMethod?: string;
  serviceFeePercentApplied?: number;
  amountTotalExpected?: number;
  serviceFeeRenter?: number;
};

export function PaymentFlowModal({
  isOpen,
  onClose,
  reservation,
  onPayNow,
  step1Complete = false,
  setStep1Complete,
  highlightStep2 = false,
  bookingStatus,
  bookingPaid = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  reservation: ReservationPayment;
  onPayNow?: (reservation: ReservationPayment) => void;
  step1Complete?: boolean;
  setStep1Complete?: (value: boolean) => void;
  highlightStep2?: boolean;
  bookingStatus?: string; // Statut de la réservation ("accepted", "pending_payment", etc.)
  bookingPaid?: boolean; // Indique explicitement si la réservation est déjà payée
}) {
  const [isPaying, setIsPaying] = useState(false);
  const { t } = useTranslation("common");
  const { formatClient, footnote } = useExchangeRate();
  const isCash = isCashOnSitePayment(reservation.paymentMethod ?? "card_online");
  const payLabel = formatClient(reservation.totalTTC).primary;
  const feePercent = reservation.serviceFeePercentApplied ?? 0;
  const serviceFeeLabel =
    feePercent > 0
      ? t("booking.serviceFee", { percent: feePercent })
      : t("booking.paymentMethod.serviceFeeGeneric", "Frais de service");

  const handlePayNow = async () => {
    if (!onPayNow || isPaying) return;
    setIsPaying(true);
    try {
      await onPayNow(reservation);
    } finally {
      setIsPaying(false);
    }
  };

  // Déterminer si l'étape 1 est complète selon le statut réel de la réservation et le paiement
  const isStep1ActuallyComplete = bookingPaid || bookingStatus === "accepted" || step1Complete;
  
  // Calculer si l'étape 2 doit être mise en surbrillance
  const shouldHighlightStep2 = highlightStep2 || isStep1ActuallyComplete;
  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[95vw] max-w-[calc(100vw-2rem)] sm:max-w-xl md:max-w-2xl sm:rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
        <div className="space-y-6 overflow-y-auto flex-1 min-h-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Confirmer et payer</DialogTitle>
            <DialogDescription>
              Étapes de confirmation et paiement sécurisé de votre location.
            </DialogDescription>
          </DialogHeader>
          {/* Étape 1 — Payer ma location */}
          <Collapsible defaultOpen={!shouldHighlightStep2}>
            <CollapsibleTrigger asChild>
              <div className={cn(
                "flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors min-w-0",
                shouldHighlightStep2 
                  ? "bg-muted/50 opacity-60" 
                  : "bg-card hover:bg-muted/30"
              )}>
                <div className="flex items-center gap-2 md:gap-3 flex-wrap min-w-0">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
                  <div className="font-semibold min-w-0 truncate">Étape 1 — Payer ma location</div>
                  {isStep1ActuallyComplete && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold shrink-0">✅ Terminé</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  {isCash && !isStep1ActuallyComplete ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold">
                      {t("booking.paymentMethod.cashOnSite.badge", "Paiement à l'agence")}
                    </span>
                  ) : !isStep1ActuallyComplete ? (
                    <button
                      type="button"
                      disabled={isPaying}
                      className="rounded-full px-3 py-1.5 text-sm font-semibold bg-gradient-lagoon text-white hover:opacity-90 shadow-soft disabled:opacity-70 disabled:cursor-wait inline-flex items-center gap-1.5 whitespace-normal break-words"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePayNow();
                      }}
                    >
                      {isPaying ? (
                        <>
                          <Hourglass className="h-4 w-4 shrink-0 animate-spin" />
                          Chargement...
                        </>
                      ) : (
                        <>
                          <span className="shrink-0">🔒</span>
                          <span>Payer {payLabel} via Stripe</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-sm font-semibold">✅ Payé</span>
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="text-xs text-muted-foreground mb-2 mt-2">Résumé de votre réservation</div>
            <div className="space-y-2 min-w-0">
              <div className="text-sm text-muted-foreground">Véhicule</div>
              <div className="font-semibold text-foreground break-words">{reservation.voiture}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg border border-border min-w-0">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" /> Début
                </div>
                <div className="mt-1 font-medium break-words">{reservation.dateDebut}</div>
              </div>
              <div className="p-3 rounded-lg border border-border min-w-0">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" /> Fin
                </div>
                <div className="mt-1 font-medium break-words">{reservation.dateFin}</div>
              </div>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Durée: </span>
              <span className="font-medium">{reservation.duree}</span>
            </div>
            <Separator />
            {isCash && !isStep1ActuallyComplete && (
              <div className="rounded-xl p-4 bg-amber-50 border border-amber-200 flex items-start gap-3 mt-2 mb-4 min-w-0">
                <Banknote className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-semibold text-amber-900">
                    {t("booking.paymentMethod.noOnlinePaymentRequired", "Aucun paiement en ligne n'est nécessaire")}
                  </div>
                  <div className="text-sm text-amber-800 mt-1">
                    {t("booking.paymentMethod.cashOnSite.modalHint", "Règlement lors de la remise des clés à l'agence.")}
                  </div>
                  {reservation.totalTTC > 0 && (
                    <div className="mt-2">
                      <DualPrice
                        amountMga={reservation.totalTTC}
                        variant="client"
                        className="items-start"
                        primaryClassName="text-lg font-bold text-amber-900 tabular-nums"
                        secondaryClassName="text-xs text-amber-700"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2 min-w-0">
              <ClientPriceRow label="Sous-total" amountMga={reservation.montantDeBase} />
              <ClientPriceRow label={serviceFeeLabel} amountMga={reservation.fraisService} />
              <div className="flex justify-between items-start gap-3 pt-2 border-t">
                <span className="font-semibold min-w-0 truncate inline-flex items-center gap-1.5">
                  Total TTC à payer
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">
                        Annulation gratuite jusqu'à 48h avant. Entre 24h et 48h : 50% remboursé. Moins de 24h : aucun remboursement.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </span>
                <DualPrice
                  amountMga={reservation.totalTTC}
                  variant="client"
                  className="items-end text-right shrink-0"
                  primaryClassName="text-xl font-bold text-primary tabular-nums"
                  secondaryClassName="text-xs"
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-right">{footnote}</p>
            </div>
              {/* Services supplémentaires (toujours affiché) */}
              <div className="rounded-lg p-3 md:p-4 bg-gray-50 border border-gray-200 space-y-2 mt-4 mb-4 min-w-0">
                <div className="font-semibold text-foreground">Services supplémentaires</div>
                {reservation.extras && reservation.extras.length > 0 ? (
                  <>
                    <div className="space-y-1 min-w-0">
                      {reservation.extras.map((extra, idx) => (
                        <div key={idx} className="flex justify-between gap-3 text-sm">
                          <span className="text-foreground min-w-0 truncate">{extra.label}</span>
                          <DualPrice
                            amountMga={extra.price}
                            variant="client"
                            className="items-end text-right shrink-0"
                            primaryClassName="font-medium tabular-nums text-sm"
                            secondaryClassName="text-xs"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="text-sm text-gray-500 italic mt-2">Ces services ont bien été ajoutés à votre réservation.</div>
                  </>
                ) : (
                  <>
                    <div className="text-gray-500 text-sm">Aucun service supplémentaire sélectionné.</div>
                    <div className="text-xs text-gray-400 italic mt-1">Certains véhicules proposent des options comme la prise en charge à l’aéroport, un siège bébé, etc.</div>
                  </>
                )}
              </div>
            {!isCash && (
              <div className="rounded-xl p-4 bg-gray-50 border border-border/50 flex items-start gap-3 mt-4 mb-4 min-w-0">
              <div className="pt-0.5">
                <ShieldCheck className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground">Paiement 100% sécurisé par Stripe</div>
                <div className="text-sm text-[#6B7280] mt-1">
                  Vos informations bancaires sont protégées par chiffrement SSL et ne sont jamais stockées sur notre site.
                </div>
                <div className="mt-2 flex items-center flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: "#635BFF" }}>
                    {/* Logo Stripe minimal */}
                    <svg width="44" height="14" viewBox="0 0 512 128" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path fill="#635BFF" d="M72.36 32.33c-12.16 0-20.41 5.94-24.64 10.9V34.24H20.9V128h26.82V96.21c4.27 4.95 12.48 10.86 24.64 10.86 20.26 0 34.7-15.63 34.7-37.37-.01-21.74-14.44-37.37-34.7-37.37zm-5.94 54.89c-9.09 0-15.85-7.25-15.85-17.52 0-10.27 6.76-17.52 15.85-17.52 9.09 0 15.85 7.25 15.85 17.52 0 10.27-6.76 17.52-15.85 17.52zM197.6 34.24h-26.82v58.85c0 21.33 16.77 29.61 36.9 29.61 8.66 0 15.85-1.46 19.31-3.13V92.6c-3.17 1.3-7.13 2.03-11.74 2.03-7.57 0-17.65-2.84-17.65-13.91V34.24h0zM381.46 32.33c-12.12 0-19.63 5.71-23.69 10.58V34.24h-26.82V128h26.82V96.21c4.1 4.95 11.61 10.86 23.69 10.86 19.9 0 35.39-15.63 35.39-37.37 0-21.74-15.49-37.37-35.39-37.37zm-5.94 54.89c-9.09 0-15.85-7.25-15.85-17.52 0-10.27 6.76-17.52 15.85-17.52s15.85 7.25 15.85 17.52c0 10.27-6.76 17.52-15.85 17.52zM282.39 64.73c0-18.48 11.79-32.63 31.85-32.63 9.38 0 16.16 2.19 20.33 4.31v22.22c-4.18-2.19-9.43-3.96-15.51-3.96-9.56 0-14.66 4.88-14.66 12.92V128h-22.01V64.73h0zM317.23 0l-22.01 6.4v19.72l22.01-6.4V0zM490.77 36.89c-6.59-5.11-16.01-7.38-28.4-7.38-10.97 0-18.92 1.14-24.99 2.84v20.42c5.53-1.9 12.89-3.44 21.46-3.44 8.02 0 12.33 1.95 12.33 5.93 0 2.96-2.43 4.64-13.66 6.99-16.85 3.46-28.75 8.83-28.75 25.93 0 16.56 11.68 25.06 28.75 25.06 13.07 0 22.44-3.61 27.74-6.73V82.68c-5.69 2.64-13.01 4.7-22.12 4.7-8.27 0-12.02-2.53-12.02-6.61 0-3.06 2.43-5.06 13.98-7.47 17.75-3.65 28.43-9.77 28.43-25.88.03-11.32-5.41-19.92-14.75-25.53z"/>
                    </svg>
                    Stripe
                  </span>
                </div>
              </div>
            </div>
            )}

            {!isCash && (
              <>
                <div className="text-xs text-[#6B7280] text-center">
                  Vous serez redirigé vers une page Stripe sécurisée pour effectuer votre paiement, puis automatiquement renvoyé ici.
                </div>
                <div className="pt-2 text-center text-sm text-[#9CA3AF]">
                  ✅ Transactions vérifiées — 🔐 Paiement crypté — 🕒 Confirmation instantanée
                </div>
              </>
            )}
            </CollapsibleContent>
          </Collapsible>
        </div>
        {/* Footer CTA sticky — toujours visible, accessible sans scroll excessif */}
        <div className="flex-shrink-0 border-t bg-background pt-4 mt-4 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 pb-0">
          {isCash && !isStep1ActuallyComplete ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="w-full sm:flex-1 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 font-medium py-3 px-4 text-sm text-center">
                {t("booking.paymentMethod.noOnlinePaymentRequired", "Aucun paiement en ligne n'est nécessaire")}
              </div>
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Fermer</Button>
            </div>
          ) : !isStep1ActuallyComplete ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                disabled={isPaying}
                className={cn("w-full min-w-0 sm:flex-1 justify-center bg-gradient-lagoon hover:opacity-90 text-white font-bold py-3 disabled:opacity-70 disabled:cursor-wait whitespace-normal break-words")}
                onClick={handlePayNow}
              >
                {isPaying ? (
                  <>
                    <Hourglass className="h-5 w-5 shrink-0 mr-2 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <span className="shrink-0 mr-2">🔒</span>
                    Payer {payLabel} via Stripe et confirmer ma location
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Annuler</Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="w-full sm:flex-1 flex items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-700 font-semibold py-3">
                Paiement effectué ✅
              </div>
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Fermer</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


