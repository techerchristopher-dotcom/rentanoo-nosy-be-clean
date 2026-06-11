/**
 * Edge Function Supabase : Création d'une session Stripe Checkout
 *
 * P2 (fees dynamic v2) :
 *   - Ne calcule PLUS les frais (10% / 15%) localement.
 *   - Lit `amount_total_expected` (source de vérité écrite par create_web_booking
 *     via compute_renter_total côté DB) pour les bookings pricing_mode='web'.
 *   - Pour pricing_mode='admin' : continue d'utiliser `total_price`.
 *   - Pour `payment_method='cash_on_site'` : ne crée PAS de session Stripe et
 *     retourne une réponse métier explicite (200 + `{ok:true, mode:"cash_on_site", ...}`).
 *
 * Variables d'environnement requises :
 * - STRIPE_SECRET_KEY : Clé secrète Stripe (ex: sk_test_xxx)
 * - STRIPE_SUCCESS_URL / STRIPE_CANCEL_URL : URLs de redirection
 * - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 *
 * Payload attendu (POST JSON) :
 * {
 *   "bookingId": string      // ID de la réservation (REQUIS)
 * }
 *
 * Réponse :
 * - 200 (CB)   : { "url": "https://checkout.stripe.com/..." }
 * - 200 (cash) : { "ok": true, "mode": "cash_on_site", "message": "...", "amount_total_expected": <mga> }
 * - 400        : { "ok": false, "error": "..." }
 * - 404        : { "ok": false, "error": "Booking not found" }
 * - 500        : { "ok": false, "error": "..." }
 */

import Stripe from "https://esm.sh/stripe@latest";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Détecter l'environnement (DEV vs PROD)
// En production Supabase, DENO_ENV est généralement défini à "production"
// En local, il n'est généralement pas défini ou vaut "development"
const denoEnv = Deno.env.get("DENO_ENV");
const isDev = !denoEnv || denoEnv === "development" || denoEnv === "dev";

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

// Whitelist des origines CORS (dev + prod)
const allowedOrigins = new Set([
  "https://rentanoo.com",
  "http://localhost:3002",
  "http://localhost:5173",
]);

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const method = req.method;

  const corsHeaders = {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin)
      ? origin
      : "https://rentanoo.com",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

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
    denoEnv: Deno.env.get("DENO_ENV") || "undefined",
    corsAllowOrigin: corsHeaders["Access-Control-Allow-Origin"],
  });

  // Gérer les requêtes OPTIONS (preflight CORS)
  if (req.method === "OPTIONS") {
    console.log("✅ [create-checkout-session][OPTIONS] Preflight CORS autorisé", {
      origin: origin || "N/A",
      allowOrigin: corsHeaders["Access-Control-Allow-Origin"],
      isDev,
    });
    return new Response("ok", { headers: corsHeaders });
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

  // Auth guard : accepter Authorization OU apikey (anon key)
  const authHeader = req.headers.get("authorization");
  const apiKeyHeader = req.headers.get("apikey");
  if (!authHeader && !apiKeyHeader) {
    return new Response(
      JSON.stringify({ code: 401, message: "En-tête d'autorisation manquant" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
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
      .select(
        "subtotal, base_price, options_total, vehicle_id, start_date, end_date, user_id, pricing_mode, total_price, payment_method, amount_total_expected, service_fee_renter, service_fee_percent_applied",
      )
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

    const pricingModeRaw = booking.pricing_mode;
    const isAdminPricing = pricingModeRaw === "admin";
    const paymentMethodRaw = booking.payment_method ?? null;

    // ============================================
    // GUARD MÉTIER : cash_on_site → pas de checkout Stripe
    // ============================================
    // P2 : un booking marqué 'cash_on_site' doit être encaissé à l'agence.
    // On ne crée donc pas de session Stripe et on retourne une réponse 200
    // métier explicite (logguée) plutôt qu'une erreur 400 technique.
    if (paymentMethodRaw === "cash_on_site") {
      const expectedMga = Number(booking.amount_total_expected ?? 0) || 0;
      console.info("ℹ️ [create-checkout-session][CASH_ON_SITE] Paiement à l'agence — aucun checkout Stripe requis.", {
        bookingId,
        pricing_mode: pricingModeRaw,
        payment_method: paymentMethodRaw,
        amount_total_expected_mga: expectedMga,
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({
          ok: true,
          mode: "cash_on_site",
          message:
            "Paiement à l'agence — aucun checkout Stripe nécessaire. Le client réglera lors de la remise des clés.",
          bookingId,
          amount_total_expected: expectedMga,
          currency_db: "MGA",
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

    const userId = booking?.user_id ?? null;
    let profile: { stripe_customer_id: string | null; email: string | null } | null = null;

    if (userId) {
      const { data: profileData, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("stripe_customer_id, email")
        .eq("id", userId)
        .single();

      if (!profileErr && profileData) {
        profile = profileData;
      }
    }

    // ============================================
    // P2 : LECTURE DU MONTANT TTC DEPUIS LA DB (source de vérité unique)
    // ============================================
    // Pour pricing_mode='web' (card_online) : amount_total_expected est écrit
    // par create_web_booking via compute_renter_total(subtotal, payment_method)
    // dans Postgres. AUCUN recalcul côté Edge Function.
    // Pour pricing_mode='admin' : on continue d'utiliser total_price (logique
    // de l'admin backend, hors scope P2).
    async function fetchEurMgaRate(): Promise<number> {
      const { data, error } = await supabaseAdmin
        .from("platform_settings")
        .select("value")
        .eq("key", "eur_mga_exchange")
        .maybeSingle();
      if (error || !data?.value) return 5000;
      const raw = data.value as Record<string, unknown>;
      const rate = Number(raw.rate);
      return Number.isFinite(rate) && rate > 0 ? Math.round(rate) : 5000;
    }

    function mgaToEurForStripe(mga: number, rate: number): number {
      if (!Number.isFinite(mga) || mga <= 0 || rate <= 0) return 0;
      return Math.round((mga / rate) * 100) / 100;
    }

    const subtotal = Number(booking.subtotal || 0);
    let amountTTCMga: number;

    if (isAdminPricing) {
      const totalFromDb = Number(booking.total_price ?? 0);
      if (!totalFromDb || totalFromDb <= 0) {
        console.error("❌ [create-checkout-session][FAIL][INVALID_ADMIN_TOTAL] total_price invalide (admin):", {
          bookingId,
          pricing_mode: pricingModeRaw,
          total_price: booking.total_price,
          timestamp: new Date().toISOString(),
        });
        return new Response(
          JSON.stringify({ ok: false, error: "Booking total_price is invalid or missing for admin pricing" }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          },
        );
      }
      amountTTCMga = Math.round(totalFromDb);
      console.log("💰 [create-checkout-session] Montant admin (total_price MGA, sans frais checkout):", {
        bookingId,
        pricing_mode: pricingModeRaw,
        total_price_DB: totalFromDb,
        amountTTCMga,
      });
    } else {
      const expectedFromDb = Number(booking.amount_total_expected ?? 0);
      if (!expectedFromDb || expectedFromDb <= 0) {
        console.error("❌ [create-checkout-session][FAIL][INVALID_AMOUNT_TOTAL_EXPECTED] amount_total_expected invalide:", {
          bookingId,
          pricing_mode: pricingModeRaw,
          amount_total_expected: booking.amount_total_expected,
          subtotal,
          payment_method: paymentMethodRaw,
          service_fee_renter: booking.service_fee_renter,
          service_fee_percent_applied: booking.service_fee_percent_applied,
          timestamp: new Date().toISOString(),
        });
        return new Response(
          JSON.stringify({
            ok: false,
            error:
              "Booking amount_total_expected is invalid or missing. Le booking doit avoir été créé via create_web_booking (P2).",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          },
        );
      }
      amountTTCMga = Math.round(expectedFromDb);
      console.log("💰 [create-checkout-session] Montant web (amount_total_expected DB, P2 source de vérité):", {
        bookingId,
        pricing_mode: pricingModeRaw ?? "web (default)",
        payment_method: paymentMethodRaw,
        subtotal_DB: subtotal,
        service_fee_renter_DB: booking.service_fee_renter,
        service_fee_percent_applied_DB: booking.service_fee_percent_applied,
        amount_total_expected_DB: expectedFromDb,
        amountTTCMga,
      });
    }

    // Générer la description depuis les données du booking
    const startDate = booking.start_date ? new Date(booking.start_date).toLocaleDateString("fr-FR") : "";
    const endDate = booking.end_date ? new Date(booking.end_date).toLocaleDateString("fr-FR") : "";
    const description = `Location véhicule${isAdminPricing ? " (agence)" : ""}${
      startDate && endDate ? ` du ${startDate} au ${endDate}` : ""
    }`;

    // Vérifier les variables d'environnement
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    
    // Identifier le type de clé Stripe (TEST vs LIVE) pour debug dashboard
    const stripeKeyType = stripeSecret?.startsWith("sk_test_") ? "TEST" 
      : stripeSecret?.startsWith("sk_live_") ? "LIVE" 
      : "UNKNOWN";
    const stripeKeyPrefix = stripeSecret ? stripeSecret.substring(0, 7) + "..." : "N/A";
    
    // Log du type de clé (toujours, pas seulement en DEV)
    console.log("🔑 [create-checkout-session] Configuration Stripe:", {
      keyType: stripeKeyType,
      keyPrefix: stripeKeyPrefix,
      keyLength: stripeSecret?.length || 0,
      dashboardMode: stripeKeyType === "TEST" 
        ? "TEST MODE (toggle en haut à droite du dashboard)" 
        : stripeKeyType === "LIVE" 
        ? "LIVE MODE" 
        : "UNKNOWN - Vérifier la clé",
      dashboardUrl: stripeKeyType === "TEST" 
        ? "https://dashboard.stripe.com/test/payments" 
        : stripeKeyType === "LIVE"
        ? "https://dashboard.stripe.com/payments"
        : "N/A",
    });
    
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

    // Log des URLs utilisées pour vérification (sans révéler de secrets)
    console.log("🔗 [create-checkout-session] URLs de redirection configurées:", {
      successUrl: successUrl ? `${successUrl.substring(0, Math.min(30, successUrl.length))}...` : "MANQUANT",
      cancelUrl: cancelUrl ? `${cancelUrl.substring(0, Math.min(30, cancelUrl.length))}...` : "MANQUANT",
      successUrlDomain: successUrl ? (() => {
        try {
          return new URL(successUrl).hostname;
        } catch {
          return "INVALID_URL";
        }
      })() : "N/A",
      cancelUrlDomain: cancelUrl ? (() => {
        try {
          return new URL(cancelUrl).hostname;
        } catch {
          return "INVALID_URL";
        }
      })() : "N/A",
      timestamp: new Date().toISOString(),
    });

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
    // Montants DB en MGA → conversion EUR pour Stripe (centimes)
    const exchangeRate = await fetchEurMgaRate();
    const amountTTCEur = mgaToEurForStripe(amountTTCMga, exchangeRate);
    const unitAmountCents = Math.round(amountTTCEur * 100);

    console.log("💱 [create-checkout-session] Conversion MGA → EUR pour Stripe:", {
      bookingId,
      amountTTCMga,
      exchangeRate,
      amountTTCEur,
      unitAmountCents,
    });
    
    const sessionOptions: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: description,
            },
            unit_amount: unitAmountCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        bookingId: String(bookingId),
      },
      payment_intent_data: { setup_future_usage: "off_session" },
    };

    // ✅ Garantir un Customer si possible
    if (profile?.stripe_customer_id) {
      sessionOptions.customer = profile.stripe_customer_id;
    } else if (profile?.email) {
      sessionOptions.customer_email = profile.email;
      sessionOptions.customer_creation = "always";
    }

    let session: Stripe.Checkout.Session;

    try {
      session = await stripe.checkout.sessions.create(sessionOptions);
    } catch (err: any) {
      const msg = String(err?.message ?? "");
      const isNoSuchCustomer = msg.includes("No such customer");

      if (isNoSuchCustomer) {
        const fallbackOptions: Stripe.Checkout.SessionCreateParams = { ...sessionOptions };

        // On retire customer (invalide)
        delete (fallbackOptions as any).customer;

        // On force la création d'un customer via email si dispo
        if (profile?.email) {
          fallbackOptions.customer_email = profile.email;
          fallbackOptions.customer_creation = "always";
        }

        session = await stripe.checkout.sessions.create(fallbackOptions);
      } else {
        throw err;
      }
    }

    console.log("✅ [create-checkout-session] Session créée avec succès:", {
      sessionId: session.id,
      sessionIdPrefix: session.id.substring(0, Math.min(15, session.id.length)) + "...", // Ex: "cs_test_51..." ou "cs_live_51..."
      paymentIntentId: session.payment_intent || "N/A",
      url: session.url?.substring(0, 50) + "...",
      bookingId,
      amountTTCMga,
      amountTTCEur,
      amountTTC_cents: unitAmountCents,
      subtotal_MGA: subtotal,
      // Info pour trouver dans le dashboard Stripe
      stripeKeyType: stripeKeyType, // TEST ou LIVE
      dashboardUrl: stripeKeyType === "TEST" 
        ? "https://dashboard.stripe.com/test/payments" 
        : stripeKeyType === "LIVE"
        ? "https://dashboard.stripe.com/payments"
        : "N/A",
      searchHint: `Chercher dans le dashboard Stripe (mode ${stripeKeyType}) avec session_id: ${session.id}`,
      // URLs utilisées pour redirection (vérification domaine)
      successUrlUsed: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrlUsed: cancelUrl,
      successUrlDomain: successUrl ? (() => {
        try {
          return new URL(successUrl).hostname;
        } catch {
          return "INVALID_URL";
        }
      })() : "N/A",
      cancelUrlDomain: cancelUrl ? (() => {
        try {
          return new URL(cancelUrl).hostname;
        } catch {
          return "INVALID_URL";
        }
      })() : "N/A",
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

