import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  adminCancelBooking,
  adminCollectExtensionPayment,
  adminCollectPayment,
  adminCreateClaimCharge,
  adminExtendBooking,
  adminGetBooking,
  adminListBookingClaimCharges,
  adminPayExtensionStripe,
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
import { formatMoney } from "@/features/back-office/components/MoneyInput";
import { BookingDetailHeader } from "@/features/admin-bookings/components/BookingDetailHeader";
import { BookingClientVehicleCards } from "@/features/admin-bookings/components/BookingClientVehicleCards";
import { BookingActionsBar } from "@/features/admin-bookings/components/BookingActionsBar";
import { BookingFinancialCard } from "@/features/admin-bookings/components/BookingFinancialCard";
import { BookingDepositCard } from "@/features/admin-bookings/components/BookingDepositCard";
import { BookingExtendModal } from "@/features/admin-bookings/components/BookingExtendModal";
import { BookingCollectCashDialog } from "@/features/admin-bookings/components/BookingCollectCashDialog";
import { computeBookingFinancials } from "@/features/admin-bookings/utils/bookingFinancials";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { formatAriary } from "@/utils/dualCurrency";
import { getExtensionPending } from "@/features/admin-bookings/utils/extensionMeta";
import { formatPaymentSummary, todayCollectIso } from "@/features/admin-bookings/utils/paymentFlow";

export default function AdminBookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
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

  const [collectLoading, setCollectLoading] = useState(false);
  const [extensionCollectLoading, setExtensionCollectLoading] = useState(false);

  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [extendLoading, setExtendLoading] = useState(false);
  const [extensionPayLoading, setExtensionPayLoading] = useState(false);

  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [cashDialogMode, setCashDialogMode] = useState<"booking" | "extension">("booking");

  const { formatAdminInline } = useExchangeRate();

  const refreshPayload = useCallback(async () => {
    if (!bookingId) return;
    const data = await adminGetBooking(bookingId);
    setPayload(data);
  }, [bookingId]);

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
    if (searchParams.get("extension_paid") === "1") {
      toast({ title: "Supplément encaissé", description: "Le paiement Stripe de prolongation a été reçu." });
      searchParams.delete("extension_paid");
      setSearchParams(searchParams, { replace: true });
      void refreshPayload();
    }
    if (searchParams.get("extension_canceled") === "1") {
      searchParams.delete("extension_canceled");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast, refreshPayload]);

  const b = payload?.booking ?? ({} as Record<string, unknown>);
  const v = payload?.vehicle ?? null;
  const r = payload?.renter ?? null;

  const status = typeof b.status === "string" ? b.status : "—";
  const pricingMode = typeof b.pricing_mode === "string" ? String(b.pricing_mode) : null;
  const isAdminPricing = pricingMode === "admin";
  const isWebPricing = pricingMode === "web";

  const bookingFinancials = useMemo(
    () => computeBookingFinancials(b, isAdminPricing),
    [b, isAdminPricing]
  );

  const extensionPending = useMemo(
    () => getExtensionPending(b.selected_options),
    [b.selected_options]
  );

  const totalEur = bookingFinancials.totalTTC;

  const needsPayment = isAdminPricing
    ? status === "pending" || status === "pending_payment" || status === "accepted"
    : status === "pending_payment";

  const paymentSummary = useMemo(() => formatPaymentSummary(b, status), [b, status]);

  const canCancelBooking =
    status === "pending" || status === "pending_payment" || status === "confirmed";
  const canExtend = status === "confirmed" || status === "active";

  const depositStatus = typeof b.deposit_status === "string" ? String(b.deposit_status) : null;
  const depositAmountSnapshot = Number(b.deposit_amount_snapshot ?? 0);
  const stripePaymentMethodId = b.stripe_payment_method_id ?? null;
  const hasPaymentMethodOnFile =
    typeof stripePaymentMethodId === "string" && stripePaymentMethodId.trim().length > 0;
  const depositCapCents =
    Number.isFinite(depositAmountSnapshot) && depositAmountSnapshot > 0
      ? Math.round(depositAmountSnapshot * 100)
      : 0;
  const remainingClaimCents = Math.max(0, depositCapCents - (claimSummary.totalSucceededCents ?? 0));
  const cardRegisteredWithoutPm = depositStatus === "card_registered" && !hasPaymentMethodOnFile;
  const canPreleverCaution =
    hasPaymentMethodOnFile && depositCapCents > 0 && remainingClaimCents > 0;
  const canTakeDeposit =
    isAdminPricing &&
    status === "confirmed" &&
    depositStatus === "pending" &&
    depositAmountSnapshot > 0 &&
    !stripePaymentMethodId;

  const reservationForPayment = useMemo(() => {
    if (!bookingId || !v) return null;
    const brand = typeof v.brand === "string" ? v.brand : "";
    const model = typeof v.model === "string" ? v.model : "";
    return {
      id: bookingId,
      voiture: `${brand} ${model}`.trim() || "Véhicule",
      dateDebut: String(b.start_date ?? "—"),
      dateFin: String(b.end_date ?? "—"),
      duree: "—",
      montantDeBase: Number(b.subtotal ?? b.total_price ?? 0) || 0,
      fraisService: 0,
      totalTTC: Number(b.total_price ?? b.subtotal ?? 0) || 0,
      extras: [],
    };
  }, [bookingId, b, v]);

  const runCollectCashEur = async () => {
    if (!bookingId) return;
    setCollectLoading(true);
    try {
      await adminCollectPayment(bookingId, {
        paidAt: todayCollectIso(),
        offlinePaymentMethod: "cash",
        paidCurrency: "EUR",
      });
      await refreshPayload();
      setCashDialogOpen(false);
      toast({ title: "Encaissement enregistré", description: "Réservation confirmée en espèces (€)." });
    } catch (e: unknown) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setCollectLoading(false);
    }
  };

  const runCollectCashAriary = async (amountMga: number) => {
    if (!bookingId) return;
    setCollectLoading(true);
    try {
      await adminCollectPayment(bookingId, {
        paidAt: todayCollectIso(),
        offlinePaymentMethod: "cash",
        paidCurrency: "MGA",
        paidAmountMga: amountMga,
      });
      await refreshPayload();
      setCashDialogOpen(false);
      toast({
        title: "Encaissement enregistré",
        description: `Réservation confirmée — ${formatAriary(amountMga)} encaissés.`,
      });
    } catch (e: unknown) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setCollectLoading(false);
    }
  };

  const runCollectExtensionEur = async () => {
    if (!bookingId || !extensionPending) return;
    setExtensionCollectLoading(true);
    try {
      await adminCollectExtensionPayment(bookingId, {
        paidAt: todayCollectIso(),
        offlinePaymentMethod: "cash",
        paidCurrency: "EUR",
      });
      await refreshPayload();
      setCashDialogOpen(false);
      toast({ title: "Supplément encaissé", description: `${formatAdminInline(extensionPending.deltaTotalTTC)} enregistré.` });
    } catch (e: unknown) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setExtensionCollectLoading(false);
    }
  };

  const runCollectExtensionAriary = async (amountMga: number) => {
    if (!bookingId || !extensionPending) return;
    setExtensionCollectLoading(true);
    try {
      await adminCollectExtensionPayment(bookingId, {
        paidAt: todayCollectIso(),
        offlinePaymentMethod: "cash",
        paidCurrency: "MGA",
        paidAmountMga: amountMga,
      });
      await refreshPayload();
      setCashDialogOpen(false);
      toast({ title: "Supplément encaissé", description: `${formatAriary(amountMga)} enregistrés.` });
    } catch (e: unknown) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setExtensionCollectLoading(false);
    }
  };

  const openCashDialog = (mode: "booking" | "extension") => {
    setCashDialogMode(mode);
    setCashDialogOpen(true);
  };

  const runPayExtensionStripe = async () => {
    if (!bookingId) return;
    setExtensionPayLoading(true);
    try {
      const { url } = await adminPayExtensionStripe(bookingId);
      window.location.href = url;
    } catch (e: unknown) {
      toast({ title: "Paiement impossible", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
      setExtensionPayLoading(false);
    }
  };

  const runExtend = async (newEndDate: string, newEndTime: string) => {
    if (!bookingId) return;
    setExtendLoading(true);
    try {
      const result = await adminExtendBooking(bookingId, { newEndDate, newEndTime });
      if (result.booking) {
        setPayload((prev) =>
          prev ? { ...prev, booking: result.booking as unknown as Record<string, unknown> } : prev
        );
      } else {
        await refreshPayload();
      }
      setExtendModalOpen(false);
      toast({
        title: "Location prolongée",
        description: `Supplément : ${formatAdminInline(result.delta.totalTTC)}`,
      });
    } catch (e: unknown) {
      toast({ title: "Prolongation impossible", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setExtendLoading(false);
    }
  };

  const runCancelBooking = async () => {
    if (!bookingId || !canCancelBooking) return;
    if (!window.confirm("Confirmer l'annulation de cette réservation ?")) return;
    setCancelLoading(true);
    try {
      await adminCancelBooking(bookingId);
      await refreshPayload();
      toast({ title: "Réservation annulée" });
    } catch (e: unknown) {
      toast({ title: "Annulation impossible", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setCancelLoading(false);
    }
  };

  const runPayCard = async () => {
    if (!reservationForPayment) return;
    setPayLoading(true);
    try {
      await payerLocation(reservationForPayment);
    } catch (e: unknown) {
      toast({ title: "Paiement impossible", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setPayLoading(false);
    }
  };

  const adminCreateSetupIntentClientSecret = async (id: string): Promise<{ clientSecret: string }> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) throw new Error("Session expirée : reconnectez-vous.");
    const res = await fetch("/api/admin/deposit/create-setup-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ bookingId: id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || json?.error || `Erreur ${res.status}`);
    if (!json?.clientSecret) throw new Error("Réponse serveur invalide");
    return { clientSecret: String(json.clientSecret) };
  };

  const adminAttachPaymentMethod = async (id: string, paymentMethodId: string): Promise<{ ok: boolean }> => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) throw new Error("Session expirée : reconnectez-vous.");
    const res = await fetch("/api/admin/deposit/attach-payment-method", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ bookingId: id, paymentMethodId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || json?.error || `Erreur ${res.status}`);
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
    if (!reason || !claimConfirmChecked) {
      toast({ title: "Motif et confirmation requis", variant: "destructive" });
      return;
    }
    const amountEuros = parseFloat(claimAmountStr.trim().replace(",", "."));
    if (!Number.isFinite(amountEuros) || amountEuros <= 0) {
      toast({ title: "Montant invalide", variant: "destructive" });
      return;
    }
    setClaimSubmitLoading(true);
    try {
      const out = await adminCreateClaimCharge(bookingId, { amountEuros, reason });
      toast({
        title: out.pending ? "Paiement en cours" : "Prélèvement enregistré",
        description: out.message ?? undefined,
      });
      setClaimModalOpen(false);
      await refreshClaimCharges();
      await refreshPayload();
    } catch (e: unknown) {
      toast({ title: "Prélèvement impossible", description: e instanceof Error ? e.message : "Erreur", variant: "destructive" });
    } finally {
      setClaimSubmitLoading(false);
    }
  };

  if (!bookingId) return <p className="text-muted-foreground">ID manquant.</p>;
  if (loading) return <PageLoader />;
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
    <div className="max-w-4xl space-y-6">
      <BookingDetailHeader
        bookingId={bookingId}
        referenceNumber={b.reference_number as number | null | undefined}
        status={status}
        startDate={String(b.start_date ?? "")}
        endDate={String(b.end_date ?? "")}
        startTime={b.start_time as string | null}
        endTime={b.end_time as string | null}
        pickupLocation={b.pickup_location as string | null}
        returnLocation={b.return_location as string | null}
        totalEur={totalEur}
      />

      <BookingCollectCashDialog
        open={cashDialogOpen}
        onOpenChange={setCashDialogOpen}
        amountMga={cashDialogMode === "extension" && extensionPending ? extensionPending.deltaTotalTTC : totalEur}
        loading={cashDialogMode === "extension" ? extensionCollectLoading : collectLoading}
        title={cashDialogMode === "extension" ? "Encaisser le supplément en espèces" : "Encaisser en espèces"}
        onConfirmEur={() => void (cashDialogMode === "extension" ? runCollectExtensionEur() : runCollectCashEur())}
        onConfirmAriary={(amountMga) =>
          void (cashDialogMode === "extension" ? runCollectExtensionAriary(amountMga) : runCollectCashAriary(amountMga))
        }
      />

      <BookingClientVehicleCards
        renter={r}
        vehicle={v}
        createdByAdmin={Boolean(b.created_by_admin_id)}
        adminNotes={b.admin_notes as string | null}
      />

      <BookingActionsBar
        bookingId={bookingId}
        status={status}
        isAdminPricing={isAdminPricing}
        needsPayment={needsPayment}
        paymentSummary={paymentSummary}
        totalEur={totalEur}
        payLoading={payLoading}
        collectLoading={collectLoading}
        canTakeDeposit={canTakeDeposit}
        canCancelBooking={canCancelBooking}
        cancelLoading={cancelLoading}
        canExtend={canExtend}
        extensionPending={extensionPending}
        isWebPricing={isWebPricing}
        extensionPayLoading={extensionPayLoading}
        extensionCollectLoading={extensionCollectLoading}
        onCollectCash={() => openCashDialog("booking")}
        onPayCard={() => void runPayCard()}
        onTakeDeposit={() => setDepositOpen(true)}
        onExtend={() => setExtendModalOpen(true)}
        onCollectExtensionCash={() => openCashDialog("extension")}
        onPayExtensionStripe={() => void runPayExtensionStripe()}
        onCancel={() => void runCancelBooking()}
      />

      <BookingFinancialCard financials={bookingFinancials} isAdminPricing={isAdminPricing} />

      <BookingDepositCard
        depositCapCents={depositCapCents}
        hasPaymentMethodOnFile={hasPaymentMethodOnFile}
        cardRegisteredWithoutPm={cardRegisteredWithoutPm}
        canPreleverCaution={canPreleverCaution}
        claimSubmitLoading={claimSubmitLoading}
        remainingClaimCents={remainingClaimCents}
        claimSummary={claimSummary}
        claimCharges={claimCharges}
        onOpenClaimModal={openClaimModal}
      />

      <BookingExtendModal
        open={extendModalOpen}
        onOpenChange={setExtendModalOpen}
        bookingId={bookingId}
        currentEndDate={String(b.end_date ?? "")}
        currentEndTime={String(b.end_time ?? "09:00")}
        onConfirm={runExtend}
        confirmLoading={extendLoading}
      />

      <Dialog open={claimModalOpen} onOpenChange={setClaimModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Prélèvement sur la caution</DialogTitle>
            <DialogDescription>Débit sur la carte enregistrée pour cette réservation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Reste disponible</span><span>{(remainingClaimCents / 100).toFixed(2)} €</span></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="claim-amount">Montant (€)</Label>
              <Input id="claim-amount" inputMode="decimal" value={claimAmountStr} onChange={(e) => setClaimAmountStr(e.target.value)} disabled={claimSubmitLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="claim-reason">Motif</Label>
              <Textarea id="claim-reason" value={claimReason} onChange={(e) => setClaimReason(e.target.value)} disabled={claimSubmitLoading} rows={3} />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="claim-confirm" checked={claimConfirmChecked} onCheckedChange={(v) => setClaimConfirmChecked(v === true)} disabled={claimSubmitLoading} />
              <Label htmlFor="claim-confirm" className="text-sm font-normal cursor-pointer">Je confirme ce prélèvement.</Label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setClaimModalOpen(false)} disabled={claimSubmitLoading}>Annuler</Button>
            <Button type="button" onClick={() => void runClaimCharge()} disabled={claimSubmitLoading}>
              {claimSubmitLoading ? "Traitement…" : "Confirmer"}
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
              await refreshPayload();
              toast({ title: "Caution activée" });
            } catch { /* non-bloquant */ }
          }}
          createClientSecretFn={adminCreateSetupIntentClientSecret}
          attachPaymentMethodFn={adminAttachPaymentMethod}
          returnUrl={`${window.location.origin}/admin/bookings/${encodeURIComponent(bookingId)}`}
        />
      ) : null}
    </div>
  );
}
