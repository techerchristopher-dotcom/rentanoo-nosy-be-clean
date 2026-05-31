import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  adminCancelBooking,
  adminCollectPayment,
  adminCreateClaimCharge,
  adminGetBooking,
  adminListBookingClaimCharges,
  adminUpdateOfflinePaymentMethod,
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
import { normalizeBookingOptions } from "@/utils/bookingOptions";
import { calcRenterTotal, calcServiceFeeRenter } from "@/utils/serviceFees";
import { formatMoney } from "@/features/back-office/components/MoneyInput";

function parseBookingSelectedOptions(raw: unknown): unknown {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

function extractPayableOptions(raw: unknown) {
  const parsed = parseBookingSelectedOptions(raw);
  return normalizeBookingOptions(parsed).filter((opt) => Boolean(opt.name?.trim()));
}

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

  // Mode de paiement éditable
  const [opmDraft, setOpmDraft] = useState<"cash" | "card_terminal" | "">("");
  const [opmSaveLoading, setOpmSaveLoading] = useState(false);

  // Encaissement
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [collectDate, setCollectDate] = useState("");
  const [collectOpm, setCollectOpm] = useState<"cash" | "card_terminal" | "">("");
  const [collectLoading, setCollectLoading] = useState(false);

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

  useEffect(() => {
    const opm = (payload?.booking as any)?.offline_payment_method ?? "";
    setOpmDraft(opm === "cash" || opm === "card_terminal" ? opm : "");
    const paidAtRaw = (payload?.booking as any)?.paid_at;
    if (paidAtRaw) {
      const d = new Date(paidAtRaw);
      if (!Number.isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        setCollectDate(`${y}-${m}-${day}`);
      }
    } else {
      const today = new Date();
      setCollectDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`);
    }
  }, [payload]);

  // IMPORTANT: Tous les hooks ci-dessous doivent être appelés à chaque render
  // (ne pas les placer après un return anticipé).
  const b = payload?.booking ?? ({} as Record<string, unknown>);
  const v = payload?.vehicle ?? null;
  const r = payload?.renter ?? null;

  const status = typeof b.status === "string" ? b.status : "—";
  const pricingMode = typeof (b as any).pricing_mode === "string" ? String((b as any).pricing_mode) : null;
  const isAdminPricing = pricingMode === "admin";

  const bookingFinancials = useMemo(() => {
    const basePrice = Number((b as any).base_price ?? 0) || 0;
    const options = extractPayableOptions((b as any).selected_options);
    const optionsSumFromList = options.reduce((sum, opt) => sum + opt.totalPrice, 0);
    const optionsTotalDB = Number((b as any).options_total ?? 0) || 0;
    const optionsTotal =
      optionsTotalDB > 0 ? optionsTotalDB : optionsSumFromList;

    const subtotalDB = Number((b as any).subtotal ?? 0) || 0;
    const totalPriceDB = Number((b as any).total_price ?? 0) || 0;
    const subtotal =
      subtotalDB > 0
        ? subtotalDB
        : totalPriceDB > 0
          ? totalPriceDB
          : basePrice + optionsTotal;

    const serviceFeeDB =
      Number((b as any).service_fee_renter ?? (b as any).service_fee ?? 0) || 0;
    const serviceFee =
      isAdminPricing
        ? 0
        : serviceFeeDB > 0
          ? serviceFeeDB
          : calcServiceFeeRenter(subtotal);

    const amountTotalPaid = Number((b as any).amount_total_paid ?? 0) || 0;
    const totalTTC =
      amountTotalPaid > 0
        ? amountTotalPaid
        : isAdminPricing
          ? subtotal
          : calcRenterTotal(subtotal);

    return {
      basePrice,
      options,
      optionsTotal,
      subtotal,
      serviceFee,
      totalTTC,
      amountTotalPaid,
      /** En base, total_price = sous-total (base + options), pas le TTC. */
      totalPriceStoredAsSubtotal: totalPriceDB,
    };
  }, [b, isAdminPricing]);

  const total = formatMoney(bookingFinancials.totalTTC);

  const canPayNow = status === "pending_payment";
  const canCancelBooking =
    status === "pending" || status === "pending_payment" || status === "confirmed";
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

  const runSaveOpm = async () => {
    if (!bookingId) return;
    setOpmSaveLoading(true);
    try {
      await adminUpdateOfflinePaymentMethod(bookingId, opmDraft || null);
      const data = await adminGetBooking(bookingId);
      setPayload(data);
      toast({ title: "Mode de paiement enregistré" });
    } catch (e: unknown) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setOpmSaveLoading(false);
    }
  };

  const runCollect = async () => {
    if (!bookingId) return;
    if (!collectDate) {
      toast({ title: "Date requise", description: "Saisissez la date d'encaissement.", variant: "destructive" });
      return;
    }
    setCollectLoading(true);
    try {
      await adminCollectPayment(bookingId, {
        paidAt: `${collectDate}T12:00:00.000Z`,
        offlinePaymentMethod: collectOpm || undefined,
      });
      const data = await adminGetBooking(bookingId);
      setPayload(data);
      setCollectModalOpen(false);
      toast({ title: "Encaissement enregistré", description: "Réservation confirmée." });
    } catch (e: unknown) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setCollectLoading(false);
    }
  };

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
              <div className="text-muted-foreground">Total TTC (locataire)</div>
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

          {isAdminPricing ? (
            <div className="border-t border-border pt-4 space-y-2">
              <div className="text-muted-foreground mb-1">Mode de paiement (hors Stripe)</div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:max-w-xs"
                  value={opmDraft}
                  onChange={(e) => setOpmDraft(e.target.value as "cash" | "card_terminal" | "")}
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
                  onClick={() => void runSaveOpm()}
                  disabled={opmSaveLoading || opmDraft === ((b as any).offline_payment_method ?? "")}
                >
                  {opmSaveLoading ? "…" : "Sauvegarder"}
                </Button>
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

          {isAdminPricing && (status === "pending" || status === "pending_payment" || status === "accepted") ? (
            <div className="border-t border-border pt-4">
              <Button
                type="button"
                variant="default"
                onClick={() => setCollectModalOpen(true)}
                disabled={collectLoading}
              >
                Enregistrer l'encaissement
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">Marque la réservation comme payée (statut → confirmée).</p>
            </div>
          ) : null}

          {(b as any).paid_at && !((b as any).stripe_payment_intent_id) ? (
            <div className="border-t border-border pt-4">
              <div className="text-muted-foreground mb-1 text-sm">Encaissé le</div>
              <div className="font-medium text-sm">{new Date(String((b as any).paid_at)).toLocaleDateString("fr-FR")}</div>
            </div>
          ) : null}

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
          <CardTitle>Détail financier</CardTitle>
          <CardDescription>
            Décomposition du montant locataire. Le champ{" "}
            <span className="font-mono text-xs">total_price</span> en base correspond au sous-total
            (location + options), pas au TTC.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Prix de location</span>
              <span className="font-medium tabular-nums">{formatMoney(bookingFinancials.basePrice)}</span>
            </div>

            {bookingFinancials.options.length > 0 ? (
              <div className="space-y-2 border-t border-border/60 pt-3">
                <div className="text-muted-foreground">Options sélectionnées</div>
                <ul className="space-y-1.5">
                  {bookingFinancials.options.map((option, index) => (
                    <li
                      key={
                        option.raw?.id ??
                        `${option.name}-${index}`
                      }
                      className="flex justify-between gap-4 pl-2"
                    >
                      <span className="text-foreground">{option.name}</span>
                      <span className="font-medium tabular-nums shrink-0">
                        {formatMoney(option.totalPrice)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between gap-4 border-t border-border/40 pt-2">
                  <span className="text-muted-foreground">Total options</span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(bookingFinancials.optionsTotal)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex justify-between gap-4 border-t border-border/60 pt-3">
                <span className="text-muted-foreground">Options sélectionnées</span>
                <span className="text-muted-foreground">Aucune</span>
              </div>
            )}

            <div className="flex justify-between gap-4 border-t border-border/60 pt-3">
              <span className="text-muted-foreground">Sous-total</span>
              <span className="font-medium tabular-nums">{formatMoney(bookingFinancials.subtotal)}</span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                {isAdminPricing
                  ? "Frais de service plateforme"
                  : "Frais de service (15 % locataire)"}
              </span>
              <span className="font-medium tabular-nums">
                {isAdminPricing ? "—" : formatMoney(bookingFinancials.serviceFee)}
              </span>
            </div>

            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <span className="font-semibold text-foreground">Total TTC locataire</span>
              <span className="font-bold tabular-nums text-base">
                {formatMoney(bookingFinancials.totalTTC)}
              </span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Calcul TTC :</strong>{" "}
              {bookingFinancials.amountTotalPaid > 0
                ? "montant réellement encaissé (amount_total_paid en base)."
                : isAdminPricing
                  ? "réservation agence — pas de frais checkout Stripe ; TTC = sous-total."
                  : "sous-total + 15 % frais locataire (calcRenterTotal), aligné sur le checkout Stripe web."}
            </p>
            {bookingFinancials.totalPriceStoredAsSubtotal > 0 &&
            Math.abs(
              bookingFinancials.totalPriceStoredAsSubtotal - bookingFinancials.subtotal
            ) > 0.01 ? (
              <p>
                Note : total_price en base ({formatMoney(bookingFinancials.totalPriceStoredAsSubtotal)})
                diffère du sous-total recalculé ({formatMoney(bookingFinancials.subtotal)}).
              </p>
            ) : null}
          </div>
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

      <Dialog open={collectModalOpen} onOpenChange={setCollectModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enregistrer l'encaissement</DialogTitle>
            <DialogDescription>
              La réservation passera au statut « confirmée » et la date d'encaissement sera enregistrée.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="collect-date">Date d'encaissement</Label>
              <Input
                id="collect-date"
                type="date"
                value={collectDate}
                onChange={(e) => setCollectDate(e.target.value)}
                disabled={collectLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collect-opm">Mode de paiement</Label>
              <select
                id="collect-opm"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={collectOpm}
                onChange={(e) => setCollectOpm(e.target.value as "cash" | "card_terminal" | "")}
                disabled={collectLoading}
              >
                <option value="">— Non précisé —</option>
                <option value="cash">Espèces</option>
                <option value="card_terminal">CB (terminal)</option>
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setCollectModalOpen(false)} disabled={collectLoading}>
              Annuler
            </Button>
            <Button type="button" onClick={() => void runCollect()} disabled={collectLoading}>
              {collectLoading ? "Enregistrement…" : "Confirmer l'encaissement"}
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
