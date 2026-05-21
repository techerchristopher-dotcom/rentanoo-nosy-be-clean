import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  adminCancelBooking,
  adminCreateClaimCharge,
  adminGetBooking,
  adminListBookingClaimCharges,
  type AdminBookingClaimCharge,
  type AdminBookingClaimChargesSummary,
} from "@/services/adminApi";
import { PageLoader } from "@/components/ui/page-loader";
import { payerLocation } from "@/lib/payerLocation";
import { DepositFlowModal } from "@/components/DepositFlowModal";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink } from "lucide-react";

export default function AdminBookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { toast } = useToast();
  const [payLoading, setPayLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<{
    booking: Record<string, unknown>;
    vehicle: Record<string, unknown> | null;
    renter: Record<string, unknown> | null;
  } | null>(null);
  const [claimCharges, setClaimCharges] = useState<AdminBookingClaimCharge[]>([]);
  const [claimSummary, setClaimSummary] = useState<AdminBookingClaimChargesSummary>({ totalSucceededCents: 0 });
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimAmountStr, setClaimAmountStr] = useState("");
  const [claimReason, setClaimReason] = useState("");
  const [claimConfirmChecked, setClaimConfirmChecked] = useState(false);
  const [claimSubmitLoading, setClaimSubmitLoading] = useState(false);

  const refreshClaimCharges = useCallback(async () => {
    if (!bookingId) return;
    try {
      const d = await adminListBookingClaimCharges(bookingId);
      setClaimCharges(d.charges);
      setClaimSummary(d.summary);
    } catch (e: unknown) {
      toast({
        title: "Historique des prélèvements indisponible",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    }
  }, [bookingId, toast]);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await adminGetBooking(bookingId);
        if (cancelled) return;
        setPayload(data);
        try {
          const claims = await adminListBookingClaimCharges(bookingId);
          if (!cancelled) {
            setClaimCharges(claims.charges);
            setClaimSummary(claims.summary);
          }
        } catch {
          if (!cancelled) {
            setClaimCharges([]);
            setClaimSummary({ totalSucceededCents: 0 });
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          toast({
            title: "Chargement impossible",
            description: e instanceof Error ? e.message : "Erreur",
            variant: "destructive",
          });
          setPayload(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, toast]);

  // IMPORTANT: Tous les hooks ci-dessous doivent être appelés à chaque render
  // (ne pas les placer après un return anticipé).
  const b = payload?.booking ?? ({} as Record<string, unknown>);
  const v = payload?.vehicle ?? null;
  const r = payload?.renter ?? null;

  const status = typeof b.status === "string" ? b.status : "—";
  const total =
    typeof b.total_price === "number"
      ? `${b.total_price.toFixed(2)} €`
      : b.total_price != null
        ? String(b.total_price)
        : "—";

  const canPayNow = status === "pending_payment";
  const canCancelBooking =
    status === "pending" || status === "pending_payment" || status === "confirmed";
  const pricingMode = typeof (b as any).pricing_mode === "string" ? String((b as any).pricing_mode) : null;
  const isAdminPricing = pricingMode === "admin";
  const depositStatus = typeof (b as any).deposit_status === "string" ? String((b as any).deposit_status) : null;
  const depositAmountSnapshot = Number((b as any).deposit_amount_snapshot ?? 0);
  const stripePaymentMethodId = (b as any).stripe_payment_method_id ?? null;
  const hasPaymentMethodOnFile =
    typeof stripePaymentMethodId === "string" && stripePaymentMethodId.trim().length > 0;
  const depositCapCents =
    Number.isFinite(depositAmountSnapshot) && depositAmountSnapshot > 0
      ? Math.round(depositAmountSnapshot * 100)
      : 0;
  const remainingClaimCents = Math.max(0, depositCapCents - (claimSummary.totalSucceededCents ?? 0));
  const cardRegisteredWithoutPm =
    depositStatus === "card_registered" && !hasPaymentMethodOnFile;
  const canPreleverCaution =
    hasPaymentMethodOnFile && depositCapCents > 0 && remainingClaimCents > 0;
  const canTakeDeposit =
    isAdminPricing &&
    status === "confirmed" &&
    depositStatus === "pending" &&
    depositAmountSnapshot > 0 &&
    !stripePaymentMethodId;
  const paymentLabel = useMemo(() => {
    if (status === "pending_payment") return "En attente de paiement";
    if (status === "confirmed") return "Payée (confirmée)";
    return status;
  }, [status]);

  const reservationForPayment = useMemo(() => {
    if (!bookingId) return null;
    if (!v) return null;

    const brand = typeof (v as any).brand === "string" ? (v as any).brand : "";
    const model = typeof (v as any).model === "string" ? (v as any).model : "";
    const voiture = `${brand} ${model}`.trim() || "Véhicule";

    const startDate = String((b as any).start_date ?? "");
    const endDate = String((b as any).end_date ?? "");
    const dateDebut = startDate || "—";
    const dateFin = endDate || "—";

    // Affichage simple (le paiement n'utilise que reservation.id)
    const montantDeBase = Number((b as any).subtotal ?? (b as any).total_price ?? 0) || 0;
    const totalTTC = Number((b as any).total_price ?? (b as any).subtotal ?? 0) || 0;

    return {
      id: bookingId,
      voiture,
      dateDebut,
      dateFin,
      duree: "—",
      montantDeBase,
      fraisService: 0,
      totalTTC,
      extras: [],
    };
  }, [bookingId, b, v]);

  const runCancelBooking = async () => {
    if (!bookingId || !canCancelBooking) return;
    const ok = window.confirm(
      "Confirmer l’annulation de cette réservation ? Elle passera au statut « annulée » et ne sera plus affichée dans le planning."
    );
    if (!ok) return;

    setCancelLoading(true);
    try {
      await adminCancelBooking(bookingId);
      const data = await adminGetBooking(bookingId);
      setPayload(data);
      toast({ title: "Réservation annulée", description: "Le statut est maintenant « cancelled »." });
    } catch (e: unknown) {
      toast({
        title: "Annulation impossible",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const runPayNow = async () => {
    if (!reservationForPayment) return;
    if (!canPayNow) {
      toast({
        title: "Paiement indisponible",
        description: `Statut actuel: ${status}. Le paiement est disponible uniquement en pending_payment.`,
        variant: "destructive",
      });
      return;
    }

    setPayLoading(true);
    try {
      await payerLocation(reservationForPayment);
    } catch (e: unknown) {
      toast({
        title: "Paiement impossible",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setPayLoading(false);
    }
  };

  const adminCreateSetupIntentClientSecret = async (bookingId: string): Promise<{ clientSecret: string }> => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      throw new Error("Session expirée : reconnectez-vous.");
    }

    const res = await fetch("/api/admin/deposit/create-setup-intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ bookingId }),
    });
    const raw = await res.text();
    const json = raw ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : null;
    if (!res.ok) {
      const msg = (json?.message as string) || (json?.error as string) || `Erreur ${res.status}`;
      throw new Error(msg);
    }
    if (!json?.clientSecret) {
      throw new Error("Réponse serveur invalide (clientSecret manquant)");
    }
    return { clientSecret: String(json.clientSecret) };
  };

  const adminAttachPaymentMethod = async (bookingId: string, paymentMethodId: string): Promise<{ ok: boolean }> => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      throw new Error("Session expirée : reconnectez-vous.");
    }

    const res = await fetch("/api/admin/deposit/attach-payment-method", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ bookingId, paymentMethodId }),
    });
    const raw = await res.text();
    const json = raw ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : null;
    if (!res.ok) {
      const msg = (json?.message as string) || (json?.error as string) || `Erreur ${res.status}`;
      throw new Error(msg);
    }
    return { ok: json?.ok === true };
  };

  const openClaimModal = () => {
    setClaimAmountStr("");
    setClaimReason("");
    setClaimConfirmChecked(false);
    setClaimModalOpen(true);
  };

  const runClaimCharge = async () => {
    if (!bookingId || !canPreleverCaution) return;
    const reason = claimReason.trim();
    if (!reason) {
      toast({ title: "Motif requis", description: "Indiquez un motif pour ce prélèvement.", variant: "destructive" });
      return;
    }
    if (!claimConfirmChecked) {
      toast({
        title: "Confirmation requise",
        description: "Cochez la case de confirmation pour continuer.",
        variant: "destructive",
      });
      return;
    }
    const amountEuros = parseFloat(claimAmountStr.trim().replace(",", "."));
    if (!Number.isFinite(amountEuros) || amountEuros <= 0) {
      toast({ title: "Montant invalide", description: "Saisissez un montant strictement positif.", variant: "destructive" });
      return;
    }

    setClaimSubmitLoading(true);
    try {
      const out = await adminCreateClaimCharge(bookingId, { amountEuros, reason });
      if (out.pending) {
        toast({
          title: "Paiement en cours",
          description: out.message ?? "Stripe traite le prélèvement ; l’historique se mettra à jour automatiquement.",
        });
      } else {
        toast({
          title: "Prélèvement enregistré",
          description: "Le prélèvement sur la caution a été traité avec succès.",
        });
      }
      setClaimModalOpen(false);
      await refreshClaimCharges();
      const data = await adminGetBooking(bookingId);
      setPayload(data);
    } catch (e: unknown) {
      toast({
        title: "Prélèvement impossible",
        description: e instanceof Error ? e.message : "Erreur",
        variant: "destructive",
      });
    } finally {
      setClaimSubmitLoading(false);
    }
  };

  if (!bookingId) {
    return <p className="text-muted-foreground">ID manquant.</p>;
  }

  if (loading) {
    return <PageLoader />;
  }

  if (!payload?.booking) {
    return (
      <div className="max-w-xl space-y-4">
        <p className="text-muted-foreground">Réservation introuvable ou accès refusé.</p>
        <Button asChild variant="outline">
          <Link to="/admin/bookings/new">Nouvelle réservation</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-1">Réservation (admin)</h1>
        <p className="font-mono text-sm text-muted-foreground break-all">{bookingId}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <Link to="/admin/bookings/new" className="text-primary font-medium hover:underline">
            Nouvelle réservation
          </Link>
          <span className="text-border">·</span>
          <Link to="/admin" className="text-primary font-medium hover:underline">
            Tableau de bord
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Synthèse</CardTitle>
          <CardDescription>Données issues de l’API admin (service role). Paiement / caution au bloc 3.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className="text-muted-foreground">Statut</div>
              <div className="font-medium">{paymentLabel}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total (locataire)</div>
              <div className="font-medium">{total}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Début</div>
              <div className="font-medium">
                {String(b.start_date ?? "—")}
                {b.start_time ? ` ${String(b.start_time)}` : ""}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Fin</div>
              <div className="font-medium">
                {String(b.end_date ?? "—")}
                {b.end_time ? ` ${String(b.end_time)}` : ""}
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-muted-foreground">Prise en charge</div>
              <div className="font-medium">{String(b.pickup_location ?? "—")}</div>
            </div>
          </div>

          {r ? (
            <div className="border-t border-border pt-4">
              <div className="text-muted-foreground mb-1">Locataire</div>
              <div className="font-medium">
                {String(r.first_name ?? "")} {String(r.last_name ?? "")}
              </div>
              <div>{String(r.email ?? "—")}</div>
              <div>{String(r.phone ?? "—")}</div>
            </div>
          ) : null}

          {v ? (
            <div className="border-t border-border pt-4">
              <div className="text-muted-foreground mb-1">Véhicule</div>
              <div className="font-medium">
                {String(v.brand ?? "")} {String(v.model ?? "")}
              </div>
              {v.price_per_day != null ? <div>{String(v.price_per_day)} € / jour</div> : null}
            </div>
          ) : null}

          {(b as any).created_by_admin_id ? (
            <div className="border-t border-border pt-4">
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Créée par l'admin
              </span>
            </div>
          ) : null}

          {(b as any).offline_payment_method ? (
            <div className="border-t border-border pt-4">
              <div className="text-muted-foreground mb-1">Mode de paiement</div>
              <div className="font-medium">
                {(b as any).offline_payment_method === "cash"
                  ? "Espèces"
                  : (b as any).offline_payment_method === "card_terminal"
                    ? "CB (terminal)"
                    : String((b as any).offline_payment_method)}
              </div>
            </div>
          ) : null}

          {(b as any).admin_notes ? (
            <div className="border-t border-border pt-4">
              <div className="text-muted-foreground mb-1">Remarque admin</div>
              <div className="whitespace-pre-wrap text-sm">{String((b as any).admin_notes)}</div>
            </div>
          ) : null}

          <div className="border-t border-border pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              {canPayNow
                ? "La réservation est prête à payer (pending_payment)."
                : status === "confirmed"
                  ? "Paiement confirmé (confirmed)."
                  : "Paiement disponible uniquement quand le statut est pending_payment."}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                onClick={runPayNow}
                disabled={!canPayNow || payLoading || !reservationForPayment}
              >
                {payLoading ? "Ouverture Stripe…" : "Passer au paiement"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDepositOpen(true)}
                disabled={!canTakeDeposit}
                title={
                  canTakeDeposit
                    ? "Activer la caution (enregistrement carte)"
                    : "La caution est disponible après paiement confirmé, si une caution est requise et non déjà enregistrée."
                }
              >
                Prendre la caution
              </Button>
            </div>
          </div>

          <div className="border-t border-border pt-4 flex flex-wrap gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to={`/checking/${bookingId}`}>État des lieux départ</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to={`/checkin-return/${bookingId}`}>État des lieux retour</Link>
            </Button>
          </div>

          {canCancelBooking ? (
            <div className="border-t border-border pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={() => void runCancelBooking()}
                disabled={cancelLoading}
              >
                {cancelLoading ? "Annulation…" : "Annuler la réservation"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prélèvements / caution</CardTitle>
          <CardDescription>
            Prélèvements initiés par l’admin sur la carte enregistrée (Stripe hors session), plafonnés par la caution
            contractuelle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className="text-muted-foreground">Caution max (contractuelle)</div>
              <div className="font-medium">
                {depositCapCents > 0 ? `${(depositCapCents / 100).toFixed(2)} €` : "— (non applicable)"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Moyen de paiement enregistré</div>
              <div className="font-medium">
                {hasPaymentMethodOnFile ? "Oui" : cardRegisteredWithoutPm ? "Non (incohérent)" : "Non"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Total déjà prélevé (réussi)</div>
              <div className="font-medium">{(claimSummary.totalSucceededCents / 100).toFixed(2)} €</div>
            </div>
            <div>
              <div className="text-muted-foreground">Reste disponible sous plafond</div>
              <div className="font-medium">{(remainingClaimCents / 100).toFixed(2)} €</div>
            </div>
          </div>

          {cardRegisteredWithoutPm ? (
            <p className="text-amber-700 dark:text-amber-500 text-sm">
              Le statut indique une carte enregistrée, mais aucun identifiant de moyen de paiement Stripe n’est stocké
              (ex. caution forcée). Impossible de prélever tant qu’une carte n’a pas été enregistrée via le flux caution.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={openClaimModal} disabled={!canPreleverCaution || claimSubmitLoading}>
              Prélever sur la caution
            </Button>
            {!canPreleverCaution && !cardRegisteredWithoutPm ? (
              <span className="text-muted-foreground self-center text-xs">
                {!hasPaymentMethodOnFile
                  ? "Enregistrez d’abord une carte (flux caution)."
                  : depositCapCents <= 0
                    ? "Pas de caution contractuelle sur cette réservation."
                    : "Plafond de caution entièrement utilisé."}
              </span>
            ) : null}
          </div>

          {claimCharges.length > 0 ? (
            <div className="border-t border-border pt-4 overflow-x-auto">
              <div className="text-muted-foreground mb-2">Historique</div>
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

      <Dialog open={claimModalOpen} onOpenChange={setClaimModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Créer un prélèvement sur la caution</DialogTitle>
            <DialogDescription>
              Le montant sera débité sur la carte déjà enregistrée pour cette réservation (hors session). Action
              réservée aux administrateurs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Caution max</span>
                <span className="font-medium">{(depositCapCents / 100).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Déjà prélevé</span>
                <span className="font-medium">{(claimSummary.totalSucceededCents / 100).toFixed(2)} €</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Reste disponible</span>
                <span className="font-medium">{(remainingClaimCents / 100).toFixed(2)} €</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="claim-amount">Montant (€)</Label>
              <Input
                id="claim-amount"
                inputMode="decimal"
                placeholder="ex. 50,00"
                value={claimAmountStr}
                onChange={(e) => setClaimAmountStr(e.target.value)}
                disabled={claimSubmitLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="claim-reason">Motif (obligatoire)</Label>
              <Textarea
                id="claim-reason"
                placeholder="Décrivez la raison du prélèvement…"
                value={claimReason}
                onChange={(e) => setClaimReason(e.target.value)}
                disabled={claimSubmitLoading}
                rows={4}
              />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="claim-confirm"
                checked={claimConfirmChecked}
                onCheckedChange={(v) => setClaimConfirmChecked(v === true)}
                disabled={claimSubmitLoading}
              />
              <Label htmlFor="claim-confirm" className="text-sm font-normal leading-snug cursor-pointer">
                Je confirme vouloir prélever ce montant sur la caution du client, dans la limite du plafond affiché.
              </Label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setClaimModalOpen(false)} disabled={claimSubmitLoading}>
              Annuler
            </Button>
            <Button type="button" onClick={() => void runClaimCharge()} disabled={claimSubmitLoading}>
              {claimSubmitLoading ? "Traitement…" : "Confirmer le prélèvement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {bookingId ? (
        <DepositFlowModal
          isOpen={depositOpen}
          onClose={() => setDepositOpen(false)}
          bookingId={bookingId}
          depositAmount={Number.isFinite(depositAmountSnapshot) ? depositAmountSnapshot : 0}
          onSuccess={async () => {
            try {
              const data = await adminGetBooking(bookingId);
              setPayload(data);
              toast({ title: "Caution activée", description: "Carte enregistrée (deposit_status=card_registered)." });
            } catch {
              // Non-bloquant
            }
          }}
          createClientSecretFn={adminCreateSetupIntentClientSecret}
          attachPaymentMethodFn={adminAttachPaymentMethod}
          returnUrl={`${window.location.origin}/admin/bookings/${encodeURIComponent(bookingId)}`}
        />
      ) : null}
    </div>
  );
}
