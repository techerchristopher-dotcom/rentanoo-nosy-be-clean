import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { adminGetBooking } from "@/services/adminApi";
import { PageLoader } from "@/components/ui/page-loader";
import { payerLocation } from "@/lib/payerLocation";
import { DepositFlowModal } from "@/components/DepositFlowModal";
import { supabase } from "@/integrations/supabase/client";

export default function AdminBookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { toast } = useToast();
  const [payLoading, setPayLoading] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<{
    booking: Record<string, unknown>;
    vehicle: Record<string, unknown> | null;
    renter: Record<string, unknown> | null;
  } | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await adminGetBooking(bookingId);
        if (!cancelled) setPayload(data);
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
  }, [bookingId]);

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
  const pricingMode = typeof (b as any).pricing_mode === "string" ? String((b as any).pricing_mode) : null;
  const isAdminPricing = pricingMode === "admin";
  const depositStatus = typeof (b as any).deposit_status === "string" ? String((b as any).deposit_status) : null;
  const depositAmountSnapshot = Number((b as any).deposit_amount_snapshot ?? 0);
  const stripePaymentMethodId = (b as any).stripe_payment_method_id ?? null;
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
        </CardContent>
      </Card>

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
