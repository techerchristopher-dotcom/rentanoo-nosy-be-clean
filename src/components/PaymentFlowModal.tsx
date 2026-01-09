import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Euro, Calendar, ShieldCheck, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export type ReservationPayment = {
  id: string | number;
  voiture: string;
  dateDebut: string;
  dateFin: string;
  duree: string;
  montantDeBase: number;
  fraisService: number;
  totalTTC: number;
  extras?: Array<{ label: string; price: number }>; // nouveaux services supplémentaires
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
  // Déterminer si l'étape 1 est complète selon le statut réel de la réservation et le paiement
  const isStep1ActuallyComplete = bookingPaid || bookingStatus === "accepted" || step1Complete;
  
  // Calculer si l'étape 2 doit être mise en surbrillance
  const shouldHighlightStep2 = highlightStep2 || isStep1ActuallyComplete;
  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-[min(95vw,960px)] sm:max-w-3xl sm:rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="space-y-6 overflow-y-auto flex-1 min-h-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Confirmer et payer</DialogTitle>
          </DialogHeader>
          {/* Étape 1 — Payer ma location */}
          <Collapsible defaultOpen={!shouldHighlightStep2}>
            <CollapsibleTrigger asChild>
              <div className={cn(
                "flex justify-between items-start md:items-center gap-2 flex-wrap p-4 rounded-xl border cursor-pointer transition-colors",
                shouldHighlightStep2 
                  ? "bg-muted/50 opacity-60" 
                  : "bg-card hover:bg-muted/30"
              )}>
                <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">1</div>
                  <div className="font-semibold">Étape 1 — Payer ma location</div>
                  {isStep1ActuallyComplete && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">✅ Terminé</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isStep1ActuallyComplete ? (
                    <button
                      type="button"
                      className="rounded-full px-3 py-1.5 text-sm font-semibold bg-gradient-lagoon text-white hover:opacity-90 shadow-soft"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onPayNow?.(reservation);
                      }}
                    >
                      <span className="mr-1">🔒</span> Payer {reservation.totalTTC.toFixed(2)} € via Stripe
                    </button>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-sm font-semibold">✅ Payé</span>
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="text-xs text-muted-foreground mb-2 mt-2">Résumé de votre réservation</div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Véhicule</div>
              <div className="font-semibold text-foreground">{reservation.voiture}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg border border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" /> Début
                </div>
                <div className="mt-1 font-medium">{reservation.dateDebut}</div>
              </div>
              <div className="p-3 rounded-lg border border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" /> Fin
                </div>
                <div className="mt-1 font-medium">{reservation.dateFin}</div>
              </div>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Durée: </span>
              <span className="font-medium">{reservation.duree}</span>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Montant de base</span>
                <span className="font-medium">{reservation.montantDeBase.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Frais de service (15%)</span>
                <span>+{reservation.fraisService.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">Total TTC à payer</span>
                <span className="text-xl font-bold text-primary flex items-center gap-1">
                  <Euro className="h-4 w-4" /> {reservation.totalTTC.toFixed(2)}€
                </span>
              </div>
            </div>
              {/* Services supplémentaires (toujours affiché) */}
              <div className="rounded-lg p-3 md:p-4 bg-gray-50 border border-gray-200 space-y-2 mt-4 mb-4">
                <div className="font-semibold text-foreground">Services supplémentaires</div>
                {reservation.extras && reservation.extras.length > 0 ? (
                  <>
                    <div className="space-y-1">
                      {reservation.extras.map((extra, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-foreground">{extra.label}</span>
                          <span className="font-medium text-foreground">+{extra.price.toFixed(2)}€</span>
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
            {/* Bloc réassurance Stripe */}
              <div className="rounded-xl p-4 bg-gray-50 border border-border/50 flex items-start gap-3 mt-4 mb-4">
              <div className="pt-0.5">
                <ShieldCheck className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
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

              {!isStep1ActuallyComplete ? (
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <Button
                    className={cn("w-full sm:flex-1 justify-center bg-gradient-lagoon hover:opacity-90 text-white font-bold py-3")}
                    onClick={() => onPayNow?.(reservation)}
                  >
                    <span className="mr-2">🔒</span> Payer {reservation.totalTTC.toFixed(2)} € via Stripe et confirmer ma location
                  </Button>
                  <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Annuler</Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <div className="w-full sm:flex-1 flex items-center justify-center rounded-lg border border-green-200 bg-green-50 text-green-700 font-semibold py-3">
                    Paiement effectué ✅
                  </div>
                  <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Fermer</Button>
                </div>
              )}
            <div className="text-xs text-[#6B7280] text-center">
              Vous serez redirigé vers une page Stripe sécurisée pour effectuer votre paiement, puis automatiquement renvoyé ici.
            </div>
            <div className="pt-2 text-center text-sm text-[#9CA3AF]">
              ✅ Transactions vérifiées — 🔐 Paiement crypté — 🕒 Confirmation instantanée
            </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Étape 2 — Payer ma caution */}
          <Collapsible defaultOpen={shouldHighlightStep2}>
            <CollapsibleTrigger asChild>
              <div className={cn(
                "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors",
                shouldHighlightStep2 
                  ? "bg-emerald-50 ring-2 ring-emerald-400 hover:bg-emerald-100" 
                  : isStep1ActuallyComplete 
                    ? "bg-card hover:bg-muted/30" 
                    : "bg-gray-50 text-gray-400 cursor-not-allowed"
              )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">2</div>
                  <div className="font-semibold">Étape 2 — Payer ma caution</div>
                </div>
                <div className="text-sm">
                  {isStep1ActuallyComplete ? "🔓 Disponible" : <span className="flex items-center gap-1 text-muted-foreground"><Lock className="h-4 w-4" /> Verrouillé</span>}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              {isStep1ActuallyComplete ? (
                <div className={cn("space-y-4", shouldHighlightStep2 && "p-2")}>
                  <div className="text-sm text-muted-foreground">
                    Pour finaliser ta réservation et accéder aux informations de retrait du véhicule, tu dois maintenant sécuriser ta caution. Le montant n'est pas débité tout de suite : il sert uniquement de garantie en cas de dommage.
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant={shouldHighlightStep2 ? "default" : "secondary"}
                      className={cn(
                        shouldHighlightStep2 && "bg-gradient-lagoon hover:opacity-90 text-white font-bold shadow-lagoon"
                      )}
                      onClick={() => console.log("TODO caution")}
                    >
                      🔐 Bloquer ma caution
                    </Button>
                    <Button variant="outline" onClick={onClose}>Fermer</Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-4 pointer-events-none">
                  Cette étape sera disponible une fois votre paiement de location confirmé. La caution sert uniquement de garantie et n'est pas débitée immédiatement.
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DialogContent>
    </Dialog>
  );
}


