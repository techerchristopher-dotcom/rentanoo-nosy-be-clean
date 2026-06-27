import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  sendPurchaseConversion,
  hasPurchaseConversionBeenSent,
  markPurchaseConversionSent,
  ANALYTICS_BOOKING_CURRENCY,
  hasPaymentCompletedBeenSent,
  markPaymentCompletedSent,
  trackGa4Event,
} from "@/lib/analytics";
import { trackMetaPurchase } from "@/lib/metaPixel";
import { supabase } from "@/integrations/supabase/client";
import { adminGetBooking } from "@/services/adminApi";

const API_BASE = import.meta.env.VITE_API_URL || "";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Log détaillé pour debug
    const fullUrl = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get("session_id");
    
    console.log("🔍 [PaymentSuccess] Page chargée:", {
      fullUrl,
      pathname: window.location.pathname,
      search: window.location.search,
      sessionId: sessionIdFromUrl ? sessionIdFromUrl.substring(0, 15) + "..." : "MANQUANT",
      timestamp: new Date().toISOString(),
    });
    
    if (sessionIdFromUrl) {
      console.log("✅ [PaymentSuccess] Session ID reçu:", sessionIdFromUrl.substring(0, 15) + "...");
    } else {
      console.warn("⚠️ [PaymentSuccess] session_id manquant dans l'URL");
    }

    // Vérifier le paiement (backend Stripe) + conversion Google Ads + redirection
    const verifyPayment = async () => {
      try {
        let bookingIdFromStripe: string | null = null;
        let sessionPaidConfirmed = false;

        // 1) Récupérer les détails de la session (backend-confirmed : Stripe vérifie payment_status)
        if (sessionIdFromUrl) {
          const res = await fetch(
            `${API_BASE}/api/stripe/session-details?session_id=${encodeURIComponent(sessionIdFromUrl)}`
          );
          const data = await res.json();

          if (data.ok && data.amount !== undefined) {
            sessionPaidConfirmed = true;
            // Paiement confirmé côté Stripe → envoyer conversion Google Ads (avec anti-double)
            if (!hasPurchaseConversionBeenSent(sessionIdFromUrl)) {
              sendPurchaseConversion({
                value: data.amount,
                currency: data.currency || "EUR",
                transaction_id: sessionIdFromUrl,
              });
              markPurchaseConversionSent(sessionIdFromUrl);
            }
            trackMetaPurchase({
              value: data.amount,
              currency: data.currency || "EUR",
              dedupId: sessionIdFromUrl,
            });
            trackGa4Event("purchase", {
              value: data.amount,
              currency: data.currency || "EUR",
              transaction_id: sessionIdFromUrl,
            });
          }

          bookingIdFromStripe = typeof data?.booking_id === "string" ? data.booking_id : null;
        }

        // 2) Attendre pour laisser le webhook mettre à jour la DB
        console.log("⏳ [PaymentSuccess] Attente webhook (2s)...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (
          sessionPaidConfirmed &&
          bookingIdFromStripe &&
          !hasPaymentCompletedBeenSent(bookingIdFromStripe)
        ) {
          try {
            const { data: bookingRow } = await supabase
              .from("bookings")
              .select("payment_method, amount_total_paid")
              .eq("id", bookingIdFromStripe)
              .single();
            if (bookingRow) {
              trackGa4Event("payment_completed", {
                booking_id: bookingIdFromStripe,
                payment_method: bookingRow.payment_method ?? "card_online",
                amount_total_paid: Number(bookingRow.amount_total_paid ?? 0),
                currency: ANALYTICS_BOOKING_CURRENCY,
              });
              markPaymentCompletedSent(bookingIdFromStripe);
            }
          } catch {
            // best effort analytics
          }
        }

        // 3) Retour spécifique admin/agence (fallback obligatoire vers web)
        if (bookingIdFromStripe) {
          try {
            const adminPayload = await adminGetBooking(bookingIdFromStripe);
            const pricingMode =
              typeof (adminPayload?.booking as any)?.pricing_mode === "string"
                ? String((adminPayload.booking as any).pricing_mode)
                : null;

            if (pricingMode === "admin") {
              console.log("✅ [PaymentSuccess] Retour admin détecté, redirection vers fiche admin", {
                bookingId: bookingIdFromStripe,
              });
              setIsVerifying(false);
              navigate(`/admin/bookings/${encodeURIComponent(bookingIdFromStripe)}?afterPayment=1`);
              return;
            }
          } catch (e) {
            // Silent fallback vers le comportement web existant
            console.warn("⚠️ [PaymentSuccess] Détection admin impossible, fallback web", {
              bookingId: bookingIdFromStripe,
              message: e instanceof Error ? e.message : String(e),
            });
          }
        }

        console.log("✅ [PaymentSuccess] Redirection vers bookings (web)...");
        setIsVerifying(false);
        navigate("/me/renter/bookings?afterPayment=1");
      } catch (err) {
        console.error("❌ [PaymentSuccess] Erreur vérification paiement:", err);
        setError("Erreur lors de la vérification du paiement. Veuillez rafraîchir la page.");
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [sessionId, navigate]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full bg-card rounded-xl shadow-card p-6 text-center space-y-4">
          <h1 className="text-2xl font-semibold text-destructive flex items-center justify-center gap-2">
            <span>❌</span>
            <span>Erreur</span>
          </h1>
          <p className="text-foreground">{error}</p>
          <button
            onClick={() => navigate("/me/renter/bookings")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retour aux réservations
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full bg-card rounded-xl shadow-card p-6 text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground flex items-center justify-center gap-2">
          <span>✅</span>
          <span>Paiement confirmé</span>
        </h1>
        <p className="text-foreground">
          Merci ! Ton paiement a bien été reçu.
        </p>
        {isVerifying && (
          <p className="text-muted-foreground text-sm">
            Vérification en cours...
          </p>
        )}
        {!isVerifying && (
          <>
            <p className="text-muted-foreground text-sm">
              Tu peux maintenant finaliser ta réservation en bloquant ta caution.
            </p>
            <p className="text-muted-foreground text-xs">
              Redirection en cours...
            </p>
          </>
        )}
      </div>
    </main>
  );
}


