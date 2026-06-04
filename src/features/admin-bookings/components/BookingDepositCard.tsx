import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink } from "lucide-react";
import type { AdminBookingClaimCharge, AdminBookingClaimChargesSummary } from "@/services/adminApi";

type BookingDepositCardProps = {
  depositCapCents: number;
  hasPaymentMethodOnFile: boolean;
  cardRegisteredWithoutPm: boolean;
  canPreleverCaution: boolean;
  claimSubmitLoading: boolean;
  remainingClaimCents: number;
  claimSummary: AdminBookingClaimChargesSummary;
  claimCharges: AdminBookingClaimCharge[];
  onOpenClaimModal: () => void;
};

export function BookingDepositCard({
  depositCapCents,
  hasPaymentMethodOnFile,
  cardRegisteredWithoutPm,
  canPreleverCaution,
  claimSubmitLoading,
  remainingClaimCents,
  claimSummary,
  claimCharges,
  onOpenClaimModal,
}: BookingDepositCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Prélèvements / caution</CardTitle>
        <CardDescription>
          Prélèvements sur la carte enregistrée, plafonnés par la caution contractuelle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="text-muted-foreground text-xs mb-1">Caution max</div>
            <div className="font-semibold">
              {depositCapCents > 0 ? `${(depositCapCents / 100).toFixed(2)} €` : "—"}
            </div>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="text-muted-foreground text-xs mb-1">Carte enregistrée</div>
            <div className="font-semibold">
              {hasPaymentMethodOnFile ? "Oui" : cardRegisteredWithoutPm ? "Non (incohérent)" : "Non"}
            </div>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="text-muted-foreground text-xs mb-1">Déjà prélevé</div>
            <div className="font-semibold">{(claimSummary.totalSucceededCents / 100).toFixed(2)} €</div>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="text-muted-foreground text-xs mb-1">Reste disponible</div>
            <div className="font-semibold">{(remainingClaimCents / 100).toFixed(2)} €</div>
          </div>
        </div>

        {cardRegisteredWithoutPm ? (
          <p className="text-amber-700 dark:text-amber-500 text-sm">
            Carte marquée enregistrée sans identifiant Stripe — enregistrez une carte via le flux caution.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onOpenClaimModal} disabled={!canPreleverCaution || claimSubmitLoading}>
            Prélever sur la caution
          </Button>
          {!canPreleverCaution && !cardRegisteredWithoutPm ? (
            <span className="text-muted-foreground self-center text-xs">
              {!hasPaymentMethodOnFile
                ? "Enregistrez d'abord une carte (flux caution)."
                : depositCapCents <= 0
                  ? "Pas de caution sur cette réservation."
                  : "Plafond entièrement utilisé."}
            </span>
          ) : null}
        </div>

        {claimCharges.length > 0 ? (
          <div className="border-t border-border pt-4 overflow-x-auto">
            <div className="text-muted-foreground mb-2 font-medium">Historique</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Stripe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claimCharges.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">
                      {row.created_at ? new Date(row.created_at).toLocaleString("fr-FR") : "—"}
                    </TableCell>
                    <TableCell>{(row.amount_cents / 100).toFixed(2)} €</TableCell>
                    <TableCell>
                      {row.status === "succeeded"
                        ? "Réussi"
                        : row.status === "pending"
                          ? "En cours"
                          : row.status === "failed"
                            ? "Échoué"
                            : row.status === "canceled"
                              ? "Annulé"
                              : row.status}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={row.reason}>
                      {row.reason}
                    </TableCell>
                    <TableCell className="space-y-1">
                      {row.stripe_payment_intent_id ? (
                        <span className="font-mono text-xs block">{row.stripe_payment_intent_id}</span>
                      ) : (
                        "—"
                      )}
                      {row.receipt_url ? (
                        <a
                          href={row.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
                        >
                          Reçu <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                      {row.status === "failed" && row.failure_message ? (
                        <span className="text-xs text-destructive block">{row.failure_message}</span>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm border-t border-border pt-4">Aucun prélèvement enregistré.</p>
        )}
      </CardContent>
    </Card>
  );
}
