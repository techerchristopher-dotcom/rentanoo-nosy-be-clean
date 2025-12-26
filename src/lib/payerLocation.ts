import type { ReservationPayment } from "@/components/PaymentFlowModal";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
if (!SUPABASE_URL) {
  throw new Error("❌ VITE_SUPABASE_URL manquante");
}

// DEV-only: log les headers (masque le token pour la sécurité)
const isDev = import.meta.env.DEV;

export async function payerLocation(reservation: ReservationPayment) {
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
    }

    // Utiliser supabase.functions.invoke qui gère automatiquement l'autorisation
    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: {
        amount: reservation.totalTTC,
        description: `Location de ${reservation.voiture}`,
        bookingId: reservation.id,
      },
    });

    if (error) {
      console.error("[payerLocation] Erreur Edge Function:", error);
      throw new Error(error.message || `Erreur lors de la création de la session: ${error.name || "Erreur inconnue"}`);
    }

    if (!data || !data.url) {
      throw new Error("Réponse invalide: pas d'URL Stripe reçue");
    }

    console.log('✅ [payerLocation] Redirection vers:', data.url);
    
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

