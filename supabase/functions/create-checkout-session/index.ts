/**
 * Edge Function Supabase : Création d'une session Stripe Checkout
 * 
 * Variables d'environnement requises :
 * - STRIPE_SECRET_KEY : Clé secrète Stripe (ex: sk_test_xxx)
 * - STRIPE_SUCCESS_URL : URL de redirection après paiement réussi
 *   ⚠️ EN DEV LOCAL : Utiliser http://localhost:3012/success (tenant) ou http://localhost:3013/success (owner)
 *   ⚠️ Configurer selon l'instance utilisée (tenant sur 3012, owner sur 3013)
 * - STRIPE_CANCEL_URL : URL de redirection après annulation
 *   ⚠️ EN DEV LOCAL : Utiliser http://localhost:3012/cancel (tenant) ou http://localhost:3013/cancel (owner)
 * 
 * Payload attendu (POST JSON) :
 * {
 *   "amount": number,        // Montant en euros (ex: 150.50)
 *   "description": string,    // Description du produit/service
 *   "bookingId": string      // (optionnel) ID de la réservation
 * }
 * 
 * Réponse :
 * - 200 : { "url": "https://checkout.stripe.com/..." }
 * - 400 : { "ok": false, "error": "..." }
 * - 500 : { "ok": false, "error": "..." }
 */

import Stripe from "https://esm.sh/stripe@latest";

// Headers CORS pour toutes les réponses
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Deno.serve(async (req) => {
  // Gérer les requêtes OPTIONS (preflight CORS)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  // Vérifier que la méthode est POST
  if (req.method !== "POST") {
    console.log("❌ [create-checkout-session] Méthode non autorisée:", req.method);
    return new Response(
      JSON.stringify({ ok: false, error: "Méthode non autorisée. Utilisez POST." }),
      { 
        status: 405,
        headers: { 
          "Content-Type": "application/json",
          ...CORS_HEADERS
        }
      }
    );
  }

  try {
    // Lire et parser le body JSON
    const body = await req.json();
    console.log("💳 [create-checkout-session] Requête reçue:", {
      amount: body.amount,
      description: body.description?.substring(0, 50),
      bookingId: body.bookingId ? "présent" : "absent"
    });

    // Valider les paramètres requis
    const { amount, description, bookingId } = body || {};

    if (typeof amount !== "number" || amount <= 0) {
      console.error("❌ [create-checkout-session] Montant invalide:", amount);
      return new Response(
        JSON.stringify({ ok: false, error: "amount (number > 0) requis" }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...CORS_HEADERS
          }
        }
      );
    }

    if (!description || typeof description !== "string") {
      console.error("❌ [create-checkout-session] Description manquante ou invalide");
      return new Response(
        JSON.stringify({ ok: false, error: "description (string) requis" }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...CORS_HEADERS
          }
        }
      );
    }

    // Vérifier les variables d'environnement
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) {
      console.error("❌ [create-checkout-session] STRIPE_SECRET_KEY manquante");
      return new Response(
        JSON.stringify({ ok: false, error: "Configuration serveur manquante: STRIPE_SECRET_KEY" }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            ...CORS_HEADERS
          }
        }
      );
    }

    const successUrl = Deno.env.get("STRIPE_SUCCESS_URL");
    const cancelUrl = Deno.env.get("STRIPE_CANCEL_URL");

    if (!successUrl || !cancelUrl) {
      console.error("❌ [create-checkout-session] URLs de redirection manquantes:", {
        hasSuccessUrl: !!successUrl,
        hasCancelUrl: !!cancelUrl
      });
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Configuration serveur manquante: STRIPE_SUCCESS_URL et/ou STRIPE_CANCEL_URL" 
        }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            ...CORS_HEADERS
          }
        }
      );
    }

    // Initialiser Stripe
    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2024-06-20",
    });

    console.log("✅ [create-checkout-session] Stripe initialisé, création de la session...");

    // Créer la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: description,
            },
            unit_amount: Math.round(amount * 100), // Convertir en centimes
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ...(bookingId ? { bookingId: String(bookingId) } : {}),
      },
    });

    console.log("✅ [create-checkout-session] Session créée avec succès:", {
      sessionId: session.id,
      url: session.url?.substring(0, 50) + "...",
      amount: amount
    });

    // Retourner l'URL de la session
    return new Response(
      JSON.stringify({ url: session.url }),
      { 
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          ...CORS_HEADERS
        }
      }
    );

  } catch (error) {
    console.error("❌ [create-checkout-session] Erreur lors de la création de la session:", error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : "Erreur inconnue lors de la création de la session de paiement";

    return new Response(
      JSON.stringify({ ok: false, error: errorMessage }),
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...CORS_HEADERS
        }
      }
    );
  }
});

