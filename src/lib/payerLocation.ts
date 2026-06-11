import type { ReservationPayment } from "@/components/PaymentFlowModal";
import { supabase } from "@/integrations/supabase/client";
import {
  ANALYTICS_BOOKING_CURRENCY,
  hasStripeRedirectBeenSent,
  markStripeRedirectSent,
  trackGa4Event,
} from "@/lib/analytics";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
if (!SUPABASE_URL) {
  throw new Error("❌ VITE_SUPABASE_URL manquante");
}

// DEV-only: log les headers (masque le token pour la sécurité)
const isDev = import.meta.env.DEV;

export async function payerLocation(reservation: ReservationPayment) {
  if (reservation.paymentMethod === "cash_on_site") {
    console.log("[payerLocation] cash_on_site — aucun paiement Stripe requis");
    return;
  }

  try {
    console.log('💳 [payerLocation] Création session Stripe pour:', reservation);
    
    // Vérifier que l'utilisateur est connecté
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("[payerLocation] Erreur récupération session:", sessionError);
      throw new Error("Erreur d'authentification. Veuillez vous reconnecter.");
    }
    
    if (!session) {
      throw new Error("Vous devez être connecté pour effectuer un paiement.");
    }

    // Préparer le body exact (DB devient source de vérité, pas de calcul frontend)
    const requestBody = {
      bookingId: reservation.id,
    };

    // Construire l'URL complète de l'Edge Function
    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/create-checkout-session`;

    // DEV-only: log les headers (masque le token)
    if (isDev) {
      const maskedToken = session.access_token 
        ? `${session.access_token.substring(0, 20)}...${session.access_token.substring(session.access_token.length - 10)}`
        : "N/A";
      console.log('🔍 [payerLocation DEV] Headers envoyés:', {
        'Authorization': `Bearer ${maskedToken}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY ? 'présent (masqué)' : 'absent',
        'Content-Type': 'application/json',
        'hasSession': !!session,
        'userId': session.user?.id || 'N/A'
      });
      console.log('🔍 [payerLocation DEV] Body exact envoyé:', requestBody);
      console.log('🔍 [payerLocation DEV] URL Edge Function:', edgeFunctionUrl);
    }

    // Utiliser supabase.functions.invoke qui gère automatiquement l'autorisation
    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: requestBody,
    });

    if (error) {
      // Log détaillé de l'erreur (DEV-only)
      if (isDev) {
        console.error("[payerLocation DEV] Erreur Edge Function détaillée:", {
          error,
          errorName: error.name,
          errorMessage: error.message,
          errorStatus: (error as any).status,
          errorContext: (error as any).context,
          data: data || null,
          timestamp: new Date().toISOString(),
        });
      }
      console.error("[payerLocation] Erreur Edge Function:", error);
      throw new Error(error.message || `Erreur lors de la création de la session: ${error.name || "Erreur inconnue"}`);
    }

    // DEV-only: log de la réponse complète
    if (isDev) {
      console.log('🔍 [payerLocation DEV] Réponse Edge Function:', {
        hasData: !!data,
        hasUrl: !!data?.url,
        dataKeys: data ? Object.keys(data) : [],
        urlPreview: data?.url ? data.url.substring(0, 50) + '...' : 'N/A',
        timestamp: new Date().toISOString(),
      });
    }

    if (data?.mode === "cash_on_site") {
      console.log("[payerLocation] Edge a retourné cash_on_site — pas de redirection");
      return;
    }

    if (!data || !data.url) {
      throw new Error("Réponse invalide: pas d'URL Stripe reçue");
    }

    console.log('✅ [payerLocation] Redirection vers:', data.url);

    const bookingId = String(reservation.id);
    if (!hasStripeRedirectBeenSent(bookingId)) {
      trackGa4Event("stripe_redirect", {
        booking_id: bookingId,
        amount_total_expected:
          reservation.amountTotalExpected ?? reservation.totalTTC ?? 0,
        currency: ANALYTICS_BOOKING_CURRENCY,
      });
      markStripeRedirectSent(bookingId);
    }

    // Redirection du navigateur vers Stripe Checkout
    window.location.href = data.url;
  } catch (err) {
    console.error("[payerLocation] Erreur paiement:", err);
    alert(
      err instanceof Error
        ? `Le paiement a échoué: ${err.message}`
        : "Le paiement a échoué pour une raison inconnue."
    );
    throw err;
  }
}

