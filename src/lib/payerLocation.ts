import type { ReservationPayment } from "@/components/PaymentFlowModal";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
if (!SUPABASE_URL) {
  throw new Error("❌ VITE_SUPABASE_URL manquante");
}

const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/create-checkout-session`;

export async function payerLocation(reservation: ReservationPayment) {
  try {
    console.log('💳 [payerLocation] Création session Stripe pour:', reservation);
    
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: reservation.totalTTC,
        description: `Location de ${reservation.voiture}`,
        bookingId: reservation.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(
        "[payerLocation] Erreur HTTP:",
        response.status,
        errorData
      );
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.url) {
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

