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
 * - SUPABASE_URL : URL du projet Supabase
 * - SUPABASE_SERVICE_ROLE_KEY : Clé service role pour bypass RLS
 * 
 * Payload attendu (POST JSON) :
 * {
 *   "bookingId": string      // ID de la réservation (REQUIS)
 * }
 * 
 * La fonction lit la réservation depuis la DB et calcule le montant TTC :
 * - Montant TTC = subtotal + (subtotal × 0.15) [service fee renter 15%]
 * - Tous les montants sont en EUROS dans la DB
 * - Conversion en centimes pour Stripe : Math.round(amount * 100)
 * 
 * Réponse :
 * - 200 : { "url": "https://checkout.stripe.com/..." }
 * - 400 : { "ok": false, "error": "..." }
 * - 404 : { "ok": false, "error": "Booking not found" }
 * - 500 : { "ok": false, "error": "..." }
 */

import Stripe from "https://esm.sh/stripe@latest";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  const method = req.method;
  const corsHeaders = getCorsHeaders(origin);

  // ============================================
  // LOG DIAGNOSTIC: Début du handler
  // ============================================
  const hasAuthHeader = req.headers.has("authorization");
  const hasApikeyHeader = req.headers.has("apikey");
  const hasContentType = req.headers.has("content-type");
  const authHeaderValue = req.headers.get("authorization");
  const maskedAuth = authHeaderValue 
    ? `${authHeaderValue.substring(0, 20)}...${authHeaderValue.substring(authHeaderValue.length - 10)}`
    : "N/A";

  console.log("🔍 [create-checkout-session][INIT] Requête reçue:", {
    method,
    origin: origin || "N/A",
    hasAuthHeader,
    hasApikeyHeader,
    hasContentType,
    authHeaderMasked: maskedAuth,
    timestamp: new Date().toISOString(),
    isDev,
  });

  // Gérer les requêtes OPTIONS (preflight CORS)
  if (req.method === "OPTIONS") {
    console.log("✅ [create-checkout-session][OPTIONS] Preflight CORS autorisé");
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  // ============================================
  // MODE SELF-CHECK (DEV-ONLY): Vérifier les secrets
  // ============================================
  const diagnosticHeader = req.headers.get("X-Diagnostic");
  const isDiagnosticMode = isDev && diagnosticHeader === "1";
  
  if (isDiagnosticMode) {
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    const successUrl = Deno.env.get("STRIPE_SUCCESS_URL");
    const cancelUrl = Deno.env.get("STRIPE_CANCEL_URL");
    
    console.log("🔍 [create-checkout-session][SELF-CHECK] Mode diagnostic activé");
    
    return new Response(
      JSON.stringify({
        hasStripeSecretKey: !!stripeSecret,
        hasSuccessUrl: !!successUrl,
        hasCancelUrl: !!cancelUrl,
        isDev,
        timestamp: new Date().toISOString(),
        // Longueurs (sans valeurs) pour debug
        stripeSecretKeyLength: stripeSecret?.length || 0,
        successUrlLength: successUrl?.length || 0,
        cancelUrlLength: cancelUrl?.length || 0,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }

  // Vérifier que la méthode est POST
  if (req.method !== "POST") {
    console.log("❌ [create-checkout-session][FAIL][METHOD_NOT_ALLOWED] Méthode non autorisée:", req.method);
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
    
    // Extraire les clés du body (sans les valeurs sensibles)
    const bodyKeys = Object.keys(body || {});
    
    console.log("💳 [create-checkout-session] Requête reçue:", {
      bookingId: body.bookingId ? "présent" : "absent"
    });
    
    // Log diagnostic du body (DEV-only)
    if (isDev) {
      console.log("🔍 [create-checkout-session][BODY] Body reçu:", {
        bodyKeys,
        hasBookingId: !!body.bookingId,
        bookingIdValue: body?.bookingId ?? null,
      });
    }

    // Valider les paramètres requis
    const { bookingId } = body || {};

    if (!bookingId || typeof bookingId !== "string") {
      console.error("❌ [create-checkout-session][FAIL][INVALID_BOOKING_ID] bookingId manquant ou invalide:", {
        hasBookingId: !!bookingId,
        type: typeof bookingId,
        isString: typeof bookingId === "string",
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({ ok: false, error: "bookingId (string) requis" }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    // ============================================
    // LECTURE DEPUIS LA DB (SOURCE DE VÉRITÉ)
    // ============================================
    
    // Vérifier les variables d'environnement Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("❌ [create-checkout-session][FAIL][MISSING_SUPABASE_CONFIG] Variables Supabase manquantes:", {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceRoleKey: !!supabaseServiceRoleKey,
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({ ok: false, error: "Configuration serveur manquante: SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY" }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    // Créer client Supabase admin (bypass RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    // Charger la réservation depuis la DB
    console.log("📖 [create-checkout-session] Lecture booking depuis DB:", { bookingId });
    
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("subtotal, base_price, options_total, vehicle_id, start_date, end_date")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("❌ [create-checkout-session][FAIL][BOOKING_NOT_FOUND] Booking introuvable:", {
        bookingId,
        error: bookingError?.message || "Booking not found",
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({ ok: false, error: "Booking not found" }),
        { 
          status: 404,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    // Valider les données de prix
    const subtotal = Number(booking.subtotal || 0);
    
    if (!subtotal || subtotal <= 0) {
      console.error("❌ [create-checkout-session][FAIL][INVALID_SUBTOTAL] Subtotal invalide:", {
        bookingId,
        subtotal,
        base_price: booking.base_price,
        options_total: booking.options_total,
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({ ok: false, error: "Booking subtotal is invalid or missing" }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    // ============================================
    // CALCUL DU MONTANT TTC (MÊME LOGIQUE QUE WEBHOOK)
    // ============================================
    
    // Fonctions de calcul des fees (identique au webhook)
    const SERVICE_FEE_PERCENT_RENTER = 0.15;
    
    function calcServiceFeeRenter(subtotal: number): number {
      return Math.round(subtotal * SERVICE_FEE_PERCENT_RENTER * 100) / 100;
    }
    
    function calcRenterTotal(subtotal: number): number {
      const serviceFee = calcServiceFeeRenter(subtotal);
      return Math.round((subtotal + serviceFee) * 100) / 100;
    }

    // Calculer le montant TTC à facturer
    // UNITÉ : Tous les montants sont en EUROS dans la DB
    const amountTTC = calcRenterTotal(subtotal); // euros
    
    console.log("💰 [create-checkout-session] Calcul montant depuis DB:", {
      bookingId,
      subtotal_DB: subtotal, // euros
      service_fee_renter: calcServiceFeeRenter(subtotal), // euros
      amountTTC: amountTTC, // euros
      amountTTC_cents: Math.round(amountTTC * 100), // centimes (pour Stripe)
    });

    // Générer la description depuis les données du booking
    const startDate = booking.start_date ? new Date(booking.start_date).toLocaleDateString("fr-FR") : "";
    const endDate = booking.end_date ? new Date(booking.end_date).toLocaleDateString("fr-FR") : "";
    const description = `Location véhicule${startDate && endDate ? ` du ${startDate} au ${endDate}` : ""}`;

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
      
      console.error("❌ [create-checkout-session][FAIL][MISSING_STRIPE_SECRET] STRIPE_SECRET_KEY manquante");
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
      console.error("❌ [create-checkout-session][FAIL][MISSING_REDIRECT_URLS] URLs de redirection manquantes:", {
        hasSuccessUrl: !!successUrl,
        hasCancelUrl: !!cancelUrl,
        successUrlLength: successUrl?.length || 0,
        cancelUrlLength: cancelUrl?.length || 0,
        timestamp: new Date().toISOString(),
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
    // UNITÉ : Stripe attend les montants en CENTIMES
    const unitAmountCents = Math.round(amountTTC * 100);
    
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
            unit_amount: unitAmountCents, // Convertir euros → centimes
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookingId: String(bookingId),
      },
    });

    console.log("✅ [create-checkout-session] Session créée avec succès:", {
      sessionId: session.id,
      url: session.url?.substring(0, 50) + "...",
      bookingId,
      amountTTC_DB: amountTTC, // euros
      amountTTC_cents: unitAmountCents, // centimes
      subtotal_DB: subtotal, // euros
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
    console.error("❌ [create-checkout-session][FAIL][EXCEPTION] Erreur lors de la création de la session:", {
      error,
      errorName: error instanceof Error ? error.name : "Unknown",
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    
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

