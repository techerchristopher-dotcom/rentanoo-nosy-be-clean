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

// Détecter l'environnement (DEV vs PROD)
const isDev = !Deno.env.get("DENO_ENV") || Deno.env.get("DENO_ENV") !== "production";

// ============================================
// DIAGNOSTIC DEV-ONLY : Variables d'environnement Stripe
// ============================================
// Log au chargement du module (une seule fois au démarrage de la fonction)
if (isDev) {
  // Lister toutes les variables d'environnement liées à Stripe (sans afficher leurs valeurs)
  const stripeEnvVars: Record<string, { exists: boolean; length?: number }> = {};
  const stripeVarNames = [
    "STRIPE_SECRET_KEY",
    "STRIPE_SUCCESS_URL",
    "STRIPE_CANCEL_URL",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PUBLISHABLE_KEY",
  ];
  
  stripeVarNames.forEach((varName) => {
    const value = Deno.env.get(varName);
    stripeEnvVars[varName] = {
      exists: !!value,
      length: value ? value.length : undefined,
    };
  });
  
  // Lister aussi toutes les variables d'environnement qui commencent par STRIPE_
  const allStripeVars: string[] = [];
  for (const [key] of Object.entries(Deno.env.toObject())) {
    if (key.startsWith("STRIPE_")) {
      allStripeVars.push(key);
    }
  }
  
  console.info("🔍 [stripe-env-check] Variables d'environnement Stripe au démarrage:", {
    stripeEnvVars,
    allStripeVarNames: allStripeVars,
    runtime: "edge",
    isDev: true,
    denoEnv: Deno.env.get("DENO_ENV") || "undefined",
  });
}

// Whitelist des origines PROD autorisées
// Peut être surchargée via env var CORS_ALLOWED_ORIGINS (séparées par des virgules)
const PROD_ALLOWED_ORIGINS = Deno.env.get("CORS_ALLOWED_ORIGINS")
  ? Deno.env.get("CORS_ALLOWED_ORIGINS")!.split(",").map(o => o.trim())
  : [
      "https://rentanoo.yt",
      "https://www.rentanoo.yt",
      "https://rentanoo.com",
      "https://www.rentanoo.com",
      // Ajouter d'autres domaines de production si nécessaire
    ];

// Headers CORS pour toutes les réponses
// En DEV: autoriser localhost:3013 (owner) et localhost:3012 (tenant)
// En PROD: whitelist stricte des origines autorisées
function getCorsHeaders(origin?: string | null) {
  if (isDev) {
    // DEV: autoriser localhost
    const devOrigins = ["http://localhost:3013", "http://localhost:3012"];
    const allowOrigin = origin && devOrigins.includes(origin)
      ? origin
      : "http://localhost:3013"; // Default en DEV
    
    return {
      "Access-Control-Allow-Origin": allowOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Max-Age": "86400", // Cache preflight 24h
    };
  }

  // PROD: whitelist stricte
  const allowOrigin = origin && PROD_ALLOWED_ORIGINS.includes(origin)
    ? origin
    : null; // Rejeter les origines non autorisées

  return {
    "Access-Control-Allow-Origin": allowOrigin || PROD_ALLOWED_ORIGINS[0], // Fallback sur première origine
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400", // Cache preflight 24h
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Gérer les requêtes OPTIONS (preflight CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
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
          ...corsHeaders
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
            ...corsHeaders
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
            ...corsHeaders
          }
        }
      );
    }

    // Vérifier les variables d'environnement
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    
    // DIAGNOSTIC DEV-ONLY : Log avant vérification
    if (isDev) {
      console.info("🔍 [stripe-env-check] Vérification STRIPE_SECRET_KEY:", {
        hasStripeSecretKey: !!stripeSecret,
        keyLength: stripeSecret ? stripeSecret.length : 0,
        keyPrefix: stripeSecret ? stripeSecret.substring(0, 7) + "..." : "N/A",
        keySuffix: stripeSecret ? "..." + stripeSecret.substring(stripeSecret.length - 4) : "N/A",
        runtime: "edge",
        timestamp: new Date().toISOString(),
      });
    }
    
    if (!stripeSecret) {
      // DIAGNOSTIC DEV-ONLY : Log détaillé si la clé est absente
      if (isDev) {
        console.error("❌ [stripe-env-check] STRIPE_SECRET_KEY ABSENTE - Diagnostic:", {
          hasStripeSecretKey: false,
          allEnvKeys: Object.keys(Deno.env.toObject()).filter(k => k.includes("STRIPE") || k.includes("stripe")),
          denoEnvKeys: Object.keys(Deno.env.toObject()).length,
          runtime: "edge",
          timestamp: new Date().toISOString(),
        });
      }
      
      console.error("❌ [create-checkout-session] STRIPE_SECRET_KEY manquante");
      return new Response(
        JSON.stringify({ ok: false, error: "Configuration serveur manquante: STRIPE_SECRET_KEY" }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
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
            ...corsHeaders
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
          ...corsHeaders
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
          ...corsHeaders
        }
      }
    );
  }
});

