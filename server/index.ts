import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import compression from "compression";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { getStripe, isStripeConfigured, getStripeKeyType } from "./lib/stripe";
import { getAuthUserFromRequest } from "./lib/depositAuth";
import { reconcileClaimChargeFromWebhookPaymentIntent } from "./lib/bookingClaimChargesSync";
import { registerAdminRoutes } from "./routes/adminRoutes";

// Charger .env.local en développement uniquement (si fichier existe)
// En production Railway, les variables sont dans process.env directement
if (process.env.NODE_ENV !== "production") {
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  try {
    dotenv.config({ path: envLocalPath });
    console.log(`📁 [Config] .env.local chargé depuis ${envLocalPath}`);
  } catch (err) {
    // Ignorer si .env.local n'existe pas (normal en production)
  }
}

// Log de configuration Stripe au boot (sans initialiser l'instance)
const stripeConfigured = isStripeConfigured();
const stripeKeyType = getStripeKeyType();
console.log(`🔑 [Stripe] Configuration: ${stripeConfigured ? `✅ Présente (mode ${stripeKeyType})` : "❌ Manquante"}`);
if (!stripeConfigured) {
  console.warn("⚠️ [Stripe] STRIPE_SECRET_KEY non configurée. Les routes Stripe ne fonctionneront pas.");
}

// Supabase env (fallback VITE_* pour compat .env.local)
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
console.log(`📦 [Supabase] URL: ${SUPABASE_URL ? "✅" : "❌"} | ANON_KEY: ${SUPABASE_ANON_KEY ? "✅" : "❌"} | SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? "✅" : "❌"}`);

const app = express();

// Trust proxy : Railway est derrière un proxy (nécessaire pour req.hostname correct en production)
app.set("trust proxy", true);

app.use(cors());
// Compression gzip pour text/css, application/javascript, application/json, image/svg+xml, etc.
app.use(compression());

// Redirection www → non-www (canonique: https://rentanoo.com)
// DOIT être déclaré AVANT toutes les routes pour capturer toutes les requêtes www
app.use((req, res, next) => {
  const host = req.hostname || req.get("host") || "";
  
  // Rediriger www.rentanoo.com vers rentanoo.com
  if (host === "www.rentanoo.com") {
    const protocol = req.protocol || "https"; // Railway termine TLS en amont
    const canonicalUrl = `${protocol}://rentanoo.com${req.originalUrl || req.url}`;
    
    console.log(`🔄 [Redirect] www → non-www: ${host}${req.originalUrl} → ${canonicalUrl}`);
    return res.redirect(301, canonicalUrl);
  }
  
  // Pas de redirection nécessaire, continuer
  next();
});

// Webhook Stripe nécessite le body RAW. On MONTE d'abord la route webhook (avec express.raw)
// puis ensuite seulement le parser JSON global.

// Supabase admin client (service role) pour mises à jour serveur
const supabaseAdmin = createClient(
  SUPABASE_URL as string,
  SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

// Route Webhook Stripe - DOIT être déclarée avant app.use(express.json())
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event: any;
    
    // Vérifier la signature si STRIPE_WEBHOOK_SECRET est configuré
    if (webhookSecret) {
      if (!sig) {
        console.error("❌ [webhook] Missing Stripe-Signature header");
        return res.status(400).send("Missing Stripe-Signature");
      }
      try {
        event = (await import("stripe")).default.webhooks.constructEvent(
          (req as any).body,
          sig,
          webhookSecret
        );
      } catch (err: any) {
        console.error("❌ [webhook] Signature verification failed:", err?.message);
        return res.status(400).send(`Webhook Error: ${err?.message}`);
      }
    } else {
      // TODO: sécuriser avec STRIPE_WEBHOOK_SECRET en prod
      console.warn("⚠️ [webhook] STRIPE_WEBHOOK_SECRET non configuré - mode dev non sécurisé");
      try {
        event = JSON.parse((req as any).body.toString());
      } catch (err: any) {
        console.error("❌ [webhook] Erreur parsing body:", err?.message);
        return res.status(400).send(`Invalid JSON: ${err?.message}`);
      }
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as any; // Stripe.Checkout.Session
        const bookingId: string | undefined = session?.metadata?.bookingId;
        if (!bookingId) {
          console.error("❌ bookingId absent dans metadata");
          return res.status(200).json({ received: true });
        }

        const paymentIntentId: string | undefined = session?.payment_intent || undefined;
        const checkoutSessionId: string = session?.id;
        const amountTotal: number = (session?.amount_total || 0) / 100; // EUR
        const currency: string = (session?.currency || "eur").toUpperCase();
        const paymentType: string | undefined = session?.metadata?.type;

        // Paiement supplément prolongation
        if (paymentType === "extension") {
          const { data: bookingRow, error: fetchErr } = await supabaseAdmin
            .from("bookings")
            .select("selected_options, amount_total_paid, admin_notes, status")
            .eq("id", bookingId)
            .single();
          if (fetchErr) {
            console.error("❌ Lecture booking extension:", fetchErr);
            return res.status(500).json({ ok: false, error: fetchErr.message });
          }

          const { clearExtensionPending, getExtensionPending } = await import(
            "../src/features/admin-bookings/utils/extensionMeta.js"
          );
          const pending = getExtensionPending(bookingRow?.selected_options);
          const prevPaid = Number(bookingRow?.amount_total_paid ?? 0) || 0;
          const newPaid = Math.round((prevPaid + amountTotal) * 100) / 100;
          const noteLine = `[Supplément prolongation Stripe ${new Date().toISOString().slice(0, 10)}] ${amountTotal.toFixed(2)} €`;

          const { error: updateErr } = await supabaseAdmin
            .from("bookings")
            .update({
              amount_total_paid: newPaid,
              selected_options: clearExtensionPending(bookingRow?.selected_options),
              admin_notes: [bookingRow?.admin_notes?.trim(), noteLine].filter(Boolean).join("\n"),
              updated_at: new Date().toISOString(),
            })
            .eq("id", bookingId);

          if (updateErr) {
            console.error("❌ Update booking extension payment:", updateErr);
            return res.status(500).json({ ok: false, error: updateErr.message });
          }
          return res.status(200).json({ received: true, extension: true });
        }

        // ============================================================
        // P2 (fees dynamic v2) — NEUTRALISATION CHECKOUT STANDARD
        // ============================================================
        // L'Edge Function `stripe-webhook` est désormais le SEUL handler
        // canonique pour `checkout.session.completed` (cf. audit Stripe).
        // Le webhook Express continue de recevoir l'event (endpoint legacy
        // toujours actif côté Stripe Dashboard tant qu'il n'est pas
        // explicitement désactivé), mais ne doit PLUS écrire les frais ni
        // changer le statut : cela serait une double écriture conflictuelle
        // avec l'Edge Function (qui passe le statut à 'confirmed' et écrit
        // les bons montants depuis amount_total_expected).
        //
        // On log explicitement la réception puis on rend 200 — Stripe
        // arrête de retenter, et la base reste alimentée par l'Edge Function.
        // ⚠️ NE PAS DÉSACTIVER les branches `extension` (ci-dessus) ni
        // `payment_intent.*` (ci-dessous) : elles ne sont PAS gérées par
        // l'Edge Function et restent canoniques côté Express.
        const isDevLog = process.env.NODE_ENV !== "production";
        if (isDevLog) {
          console.info("[express-webhook][checkout.session.completed][NEUTRALIZED-P2]", {
            webhook: "EXPRESS_WEBHOOK",
            bookingId,
            checkoutSessionId,
            paymentIntentId: paymentIntentId || null,
            stripeAmountTotal: amountTotal,
            stripeCurrency: currency,
            note: "Edge Function canonique gère cet event en P2. Express log-only.",
          });
        } else {
          console.log(
            `ℹ️ [webhook][NEUTRALIZED-P2] checkout.session.completed reçu bookingId=${bookingId} ; déféré à l'Edge Function canonique. Aucun écriture DB côté Express.`
          );
        }
      } else if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object as Parameters<typeof reconcileClaimChargeFromWebhookPaymentIntent>[2];
        try {
          const stripe = getStripe();
          await reconcileClaimChargeFromWebhookPaymentIntent(supabaseAdmin, stripe, pi);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[webhook] booking_claim payment_intent.succeeded:", msg);
        }
      } else if (event.type === "payment_intent.payment_failed") {
        const pi = event.data.object as Parameters<typeof reconcileClaimChargeFromWebhookPaymentIntent>[2];
        try {
          const stripe = getStripe();
          await reconcileClaimChargeFromWebhookPaymentIntent(supabaseAdmin, stripe, pi);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("[webhook] booking_claim payment_intent.payment_failed:", msg);
        }
      }

      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error("❌ Erreur traitement webhook:", err);
      return res.status(500).json({ ok: false, error: err?.message || "webhook failed" });
    }
  }
);

// Parser JSON / URL-encoded global après la route webhook
// Augmenter la limite pour supporter les pièces jointes encodées en base64 (contact form)
app.use(
  express.json({
    limit: "20mb",
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: "20mb",
  })
);

registerAdminRoutes(app, supabaseAdmin);
console.log(
  "✅ [AdminRoutes] Monté : POST /api/admin/bookings — build debug agency-v2-debug-20260328 (JSON debug_handler + en-têtes X-Rentanoo-*)."
);

// Configuration multer pour les fichiers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /pdf|jpg|jpeg|png|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Type de fichier non autorisé. Formats acceptés: PDF, JPG, PNG, DOC, DOCX"));
    }
  },
});

// === Routes deposit Phase 3.2.2 (SetupIntent + attach PM, NO HOLD) ===
app.post("/api/deposit/create-setup-intent", async (req, res) => {
  try {
    const authResult = await getAuthUserFromRequest(req);
    if (authResult.ok === false) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: authResult.message, reason: authResult.reason });
    }
    const { user } = authResult;

    const { bookingId } = req.body;
    if (!bookingId || typeof bookingId !== "string") {
      return res.status(400).json({ ok: false, error: "MISSING_BOOKING_ID", message: "bookingId requis" });
    }

    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, status, deposit_status, deposit_amount_snapshot, stripe_payment_method_id")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return res.status(404).json({ ok: false, error: "BOOKING_NOT_FOUND", message: "Réservation introuvable" });
    }

    if (booking.user_id !== user.id) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Cette réservation ne vous appartient pas" });
    }

    const depositSnapshot = Number(booking.deposit_amount_snapshot ?? 0);
    if (depositSnapshot <= 0) {
      return res.status(400).json({ ok: false, error: "INVALID_DEPOSIT", message: "Caution non requise pour cette réservation" });
    }

    const allowedStatuses = ["confirmed", "accepted"];
    if (!allowedStatuses.includes(booking.status)) {
      return res.status(400).json({ ok: false, error: "INVALID_BOOKING_STATUS", message: "Statut de réservation incompatible" });
    }

    if (booking.deposit_status !== "pending") {
      return res.status(400).json({ ok: false, error: "DEPOSIT_ALREADY_PROCESSED", message: "La caution a déjà été traitée" });
    }

    if (booking.stripe_payment_method_id) {
      return res.status(400).json({ ok: false, error: "CARD_ALREADY_REGISTERED", message: "Une carte est déjà enregistrée pour cette caution" });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return res.status(500).json({ ok: false, error: "PROFILE_NOT_FOUND", message: "Profil introuvable" });
    }

    let stripeCustomerId = profile.stripe_customer_id;
    if (!stripeCustomerId) {
      const stripe = getStripe();
      const customer = await stripe.customers.create({
        email: profile.email || user.email || undefined,
        metadata: { profileId: profile.id },
      });
      stripeCustomerId = customer.id;
      await supabaseAdmin.from("profiles").update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() }).eq("id", user.id);
    }

    const stripe = getStripe();
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: { bookingId },
    });

    return res.status(200).json({ clientSecret: setupIntent.client_secret });
  } catch (err: any) {
    console.error("[deposit/create-setup-intent] 500", err);
    const message = err?.message || "Impossible de créer le formulaire de caution. Veuillez réessayer.";
    return res.status(500).json({ ok: false, error: "INTERNAL_SERVER_ERROR", message });
  }
});

app.post("/api/deposit/attach-payment-method", async (req, res) => {
  try {
    const authResult = await getAuthUserFromRequest(req);
    if (authResult.ok === false) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: authResult.message, reason: authResult.reason });
    }
    const { user } = authResult;

    const { bookingId, paymentMethodId } = req.body;
    if (!bookingId || typeof bookingId !== "string" || !paymentMethodId || typeof paymentMethodId !== "string") {
      return res.status(400).json({ ok: false, error: "MISSING_PARAMS", message: "bookingId et paymentMethodId requis" });
    }

    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, status, deposit_status, deposit_amount_snapshot, stripe_payment_method_id")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return res.status(404).json({ ok: false, error: "BOOKING_NOT_FOUND", message: "Réservation introuvable" });
    }

    if (booking.user_id !== user.id) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Cette réservation ne vous appartient pas" });
    }

    const depositSnapshot = Number(booking.deposit_amount_snapshot ?? 0);
    if (depositSnapshot <= 0) {
      return res.status(400).json({ ok: false, error: "INVALID_DEPOSIT", message: "Caution non requise pour cette réservation" });
    }

    if (booking.deposit_status !== "pending") {
      return res.status(400).json({ ok: false, error: "DEPOSIT_ALREADY_PROCESSED", message: "La caution a déjà été traitée" });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return res.status(500).json({ ok: false, error: "PROFILE_NOT_FOUND", message: "Profil introuvable" });
    }

    if (!profile.stripe_customer_id) {
      return res.status(400).json({ ok: false, error: "STRIPE_CUSTOMER_MISSING", message: "Erreur configuration Stripe. Veuillez réessayer." });
    }

    const stripe = getStripe();
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== profile.stripe_customer_id) {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: profile.stripe_customer_id });
    }

    const { error: updateErr } = await supabaseAdmin
      .from("bookings")
      .update({
        stripe_payment_method_id: paymentMethodId,
        deposit_status: "card_registered",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateErr) {
      console.error("[deposit/attach-payment-method] Update error:", updateErr);
      return res.status(500).json({ ok: false, error: "UPDATE_FAILED", message: "Erreur lors de la mise à jour" });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("[deposit/attach-payment-method] 500", err);
    const message = err?.message || "Impossible d'enregistrer la carte. Veuillez réessayer.";
    return res.status(500).json({ ok: false, error: "INTERNAL_SERVER_ERROR", message });
  }
});

/**
 * Force la caution comme déposée (owner uniquement)
 * Utilisé pour : paiement offline, tests, état des lieux sans carte enregistrée.
 * Met deposit_status à 'card_registered' (valeur autorisée par la contrainte CHECK).
 * Note : 'paid' n'est PAS autorisé en DB — utiliser 'card_registered'.
 */
app.post("/api/bookings/:bookingId/force-deposit", async (req, res) => {
  try {
    const authResult = await getAuthUserFromRequest(req);
    if (authResult.ok === false) {
      return res.status(401).json({ ok: false, error: "UNAUTHORIZED", message: authResult.message });
    }
    const { user } = authResult;
    const bookingId = req.params.bookingId;

    if (!bookingId) {
      return res.status(400).json({ ok: false, error: "MISSING_BOOKING_ID", message: "bookingId requis" });
    }

    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select("id, vehicle_id, deposit_status, deposit_amount_snapshot")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return res.status(404).json({ ok: false, error: "BOOKING_NOT_FOUND", message: "Réservation introuvable" });
    }

    const { data: vehicle, error: vehicleErr } = await supabaseAdmin
      .from("vehicles")
      .select("owner_id")
      .eq("id", booking.vehicle_id)
      .single();

    if (vehicleErr || !vehicle || vehicle.owner_id !== user.id) {
      return res.status(403).json({ ok: false, error: "FORBIDDEN", message: "Vous devez être le propriétaire du véhicule pour cette réservation" });
    }

    const { error: updateErr } = await supabaseAdmin
      .from("bookings")
      .update({
        deposit_status: "card_registered",
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateErr) {
      console.error("[force-deposit] Update error:", updateErr);
      return res.status(500).json({ ok: false, error: "UPDATE_FAILED", message: updateErr.message });
    }

    console.log("[force-deposit] Caution forcée:", { bookingId, userId: user.id });
    return res.status(200).json({ ok: true, message: "Caution marquée comme déposée" });
  } catch (err: any) {
    console.error("[force-deposit] 500", err);
    return res.status(500).json({ ok: false, error: "INTERNAL_SERVER_ERROR", message: err?.message || "Erreur serveur" });
  }
});

// Route contact form (JSON only, no multer)
app.post("/api/contact", async (req, res) => {
  try {
    const { fullName, email, phone, subject, message, website, timestamp } = req.body;

    // Logs sur la taille de la requête et méta pièce jointe (sans contenu base64)
    const contentLength = req.headers["content-length"];
    const attachment = (req.body as any)?.attachment;
    console.log("[CONTACT] 📥 Incoming request body:", {
      contentLength,
      keys: Object.keys(req.body || {}),
      phone,
      hasAttachment: !!attachment,
      attachmentMeta: attachment
        ? {
            filename: attachment.filename,
            contentType: attachment.contentType,
            size: attachment.size,
            base64Length: typeof attachment.contentBase64 === "string" ? attachment.contentBase64.length : 0,
          }
        : null,
    });

    // Vérification honeypot
    if (website) {
      // Bot détecté, retourner un succès factice
      return res.status(200).json({ ok: true, success: true });
    }

    // Validation des champs requis
    if (!fullName || !email || !subject || !message) {
      return res.status(400).json({
        ok: false,
        error: "MISSING_FIELDS",
        message: "Les champs nom, email, objet et message sont obligatoires",
      });
    }

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_EMAIL",
        message: "Format d'email invalide",
      });
    }

    console.log("[CONTACT] 📧 Using email provider: n8n");

    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    const n8nWebhookSecret = process.env.N8N_WEBHOOK_SECRET;
    
    console.log("[CONTACT] 🔗 n8n webhook URL:", n8nWebhookUrl ? "✅ configuré" : "❌ manquant");

    if (!n8nWebhookUrl) {
      console.error("[CONTACT] N8N_WEBHOOK_URL not configured");
      return res.status(500).json({
        ok: false,
        error: "N8N_NOT_CONFIGURED",
        message: "Configuration n8n incomplète",
      });
    }

    // Préparer le payload pour n8n
    const incomingAttachment = (req.body as any)?.attachment;

    const n8nPayload: any = {
      fullName,
      email,
      subject,
      message,
      timestamp: timestamp || new Date().toISOString(),
      // Toujours inclure phone, même si vide (pour n8n)
      phone: phone ?? "",
      ...(incomingAttachment && { attachment: incomingAttachment }),
    };

    // Appel n8n
    const startTime = Date.now();
    try {
      console.log("[CONTACT] 📡 Calling n8n webhook", {
        url: n8nWebhookUrl,
        hasSecret: !!n8nWebhookSecret,
        timestamp: new Date().toISOString(),
        keys: Object.keys(n8nPayload || {}),
        phone: n8nPayload.phone,
      });

      // Créer un AbortController pour timeout explicite (10 secondes)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000); // 10 secondes timeout

      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(n8nWebhookSecret && { "X-Webhook-Secret": n8nWebhookSecret }),
        },
        body: JSON.stringify(n8nPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      console.log("[CONTACT] ✅ n8n webhook response", {
        status: n8nResponse.status,
        duration: `${duration}ms`,
      });

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error("[CONTACT] n8n webhook error", {
          status: n8nResponse.status,
          statusText: n8nResponse.statusText,
          body: errorText,
          duration: `${duration}ms`,
        });
        return res.status(502).json({
          ok: false,
          error: "N8N_WEBHOOK_ERROR",
          message: "Erreur lors de l'appel au webhook n8n",
        });
      }

      console.log("[CONTACT] Email sent via n8n");

      return res.status(200).json({
        ok: true,
        success: true,
        message: "Message envoyé avec succès",
      });
    } catch (n8nError: any) {
      const duration = Date.now() - startTime;
      const isTimeout = n8nError?.name === "AbortError" || 
                        n8nError?.code === "ETIMEDOUT" ||
                        n8nError?.message?.toLowerCase().includes("timeout");

      console.error("[CONTACT] n8n webhook failed", {
        message: n8nError?.message,
        code: n8nError?.code,
        name: n8nError?.name,
        errno: n8nError?.errno,
        syscall: n8nError?.syscall,
        hostname: n8nError?.hostname,
        port: n8nError?.port,
        duration: `${duration}ms`,
        isTimeout,
      });

      // Retourner 502 avec message explicite pour timeout
      if (isTimeout) {
        return res.status(502).json({
          ok: false,
          error: "N8N_WEBHOOK_TIMEOUT",
          message: "Le webhook n8n n'a pas répondu dans les délais (timeout 10s)",
          details: `Durée: ${duration}ms`,
        });
      }

      return res.status(502).json({
        ok: false,
        error: "N8N_WEBHOOK_ERROR",
        message: n8nError?.message || "Erreur lors de l'appel au webhook n8n",
        details: `Code: ${n8nError?.code || "unknown"}`,
      });
    }
  } catch (error: any) {
    // Log détaillé de l'erreur complète
    console.error("[CONTACT] ❌ ERROR - Erreur route contact complète:", {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname,
      port: error.port,
      address: error.address,
    });
    
    // Retourner une réponse JSON informative avec le code d'erreur
    return res.status(500).json({
      ok: false,
      error: "CONTACT_FAILED",
      code: error.code || null,
      message: error.message || "Erreur serveur",
      // En dev, inclure plus de détails (sans secrets)
      ...(process.env.NODE_ENV !== "production" && {
        name: error.name,
        details: error.stack?.split("\n")[0] || null,
      }),
    });
  }
});

// Route de test Email Provider (n8n)
app.get("/api/health/email", async (_req, res) => {
  try {
    console.log("[HEALTH/EMAIL] 🔍 Test configuration n8n...");

    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    const n8nWebhookSecret = process.env.N8N_WEBHOOK_SECRET;

    const config = {
      hasWebhookUrl: !!n8nWebhookUrl,
      hasWebhookSecret: !!n8nWebhookSecret,
    };

    if (!n8nWebhookUrl) {
      console.error("[HEALTH/EMAIL] ❌ n8n configuration missing", config);
      return res.status(500).json({
        ok: false,
        error: "N8N_NOT_CONFIGURED",
        config,
        message: "N8N_WEBHOOK_URL non configuré",
      });
    }

    console.log("[HEALTH/EMAIL] 🔌 Test n8n webhook availability...");
    
    // Test simple de connectivité (HEAD request)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const testResponse = await fetch(n8nWebhookUrl, {
        method: "HEAD",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      console.log("[HEALTH/EMAIL] ✅ n8n webhook accessible");

      return res.status(200).json({
        ok: true,
        provider: "n8n",
        webhookUrl: n8nWebhookUrl,
        hasSecret: !!n8nWebhookSecret,
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error: any) {
    console.error("[HEALTH/EMAIL] ❌ n8n webhook error", {
      message: error?.message,
      code: error?.code,
      name: error?.name,
    });

    return res.status(502).json({
      ok: false,
      error: "N8N_WEBHOOK_ERROR",
      message: error?.message || "Erreur lors de l'appel au webhook n8n",
    });
  }
});

app.get("/api/stripe-health", async (_req, res) => {
  try {
    const stripe = getStripe(); // Lazy initialization
    const account = await stripe.accounts.retrieve();
    res.status(200).json({
      ok: true,
      stripeReady: true,
      livemode: Boolean((account as any).livemode),
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Stripe health check failed" });
  }
});

/**
 * API pour récupérer les détails d'une Checkout Session (conversion Google Ads).
 * Utilisée par la page /success après paiement pour envoyer value + transaction_id.
 * Vérifie payment_status === 'paid' côté Stripe (backend-confirmed).
 */
app.get("/api/stripe/session-details", async (req, res) => {
  try {
    const sessionId = (req.query.session_id as string)?.trim();
    if (!sessionId || !sessionId.startsWith("cs_")) {
      return res.status(400).json({ ok: false, error: "session_id requis (format cs_xxx)" });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    }) as any;

    if (session.payment_status !== "paid") {
      return res.status(400).json({ ok: false, error: "PAYMENT_NOT_COMPLETED", paid: false });
    }

    const bookingId = session.metadata?.bookingId || null;
    const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
    const currency = (session.currency || "eur").toUpperCase();

    return res.status(200).json({
      ok: true,
      amount: amountTotal,
      currency,
      transaction_id: sessionId,
      booking_id: bookingId,
    });
  } catch (e: any) {
    if (e?.code === "resource_missing_the_id" || e?.type === "StripeInvalidRequestError") {
      return res.status(404).json({ ok: false, error: "SESSION_NOT_FOUND" });
    }
    console.error("[stripe/session-details]", e?.message);
    return res.status(500).json({ ok: false, error: e?.message || "Failed to retrieve session" });
  }
});

// Route panier multi-réservation : email récap groupé envoyé à Christopher
app.post("/api/cart/notify", async (req, res) => {
  try {
    const { cart_group_id, client_name, client_email, client_phone, notes, items } = req.body as {
      cart_group_id?: string;
      client_name?: string;
      client_email?: string;
      client_phone?: string;
      notes?: string;
      items?: Array<{ label: string; status: "success" | "failed" }>;
    };

    if (!cart_group_id || !Array.isArray(items)) {
      return res.status(400).json({ ok: false, error: "MISSING_FIELDS" });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const christopherEmail = process.env.CHRISTOPHER_EMAIL;

    if (!resendApiKey || !christopherEmail) {
      console.warn("[cart/notify] RESEND_API_KEY ou CHRISTOPHER_EMAIL manquant — email non envoyé");
      return res.status(200).json({ ok: true, sent: false });
    }

    const itemsHtml = items
      .map(
        (item) =>
          `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee;">${item.label}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;">${
            item.status === "success" ? "✅ Créée" : "❌ Indisponible"
          }</td></tr>`
      )
      .join("");

    const html = `
      <h2>Nouvelle demande groupée (panier)</h2>
      <p><strong>Client :</strong> ${client_name || "(non renseigné)"}<br/>
      <strong>Email :</strong> ${client_email || "(non renseigné)"}<br/>
      <strong>Téléphone :</strong> ${client_phone || "(non renseigné)"}</p>
      <table style="border-collapse:collapse;width:100%;max-width:480px;">
        <thead><tr><th style="text-align:left;padding:4px 8px;">Élément</th><th style="text-align:left;padding:4px 8px;">Statut</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      ${notes ? `<p><strong>Notes :</strong> ${notes}</p>` : ""}
      <p style="color:#888;font-size:12px;">cart_group_id: ${cart_group_id}</p>
    `;

    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "Rentanoo <notifications@rentanoo.com>",
      to: christopherEmail,
      subject: `Nouvelle demande groupée — ${items.length} élément(s)`,
      html,
    });

    return res.status(200).json({ ok: true, sent: true });
  } catch (err: any) {
    console.error("[cart/notify] erreur envoi email", err?.message);
    // Les bookings sont déjà créés côté DB — on ne fait pas échouer la soumission
    return res.status(200).json({ ok: false, sent: false, error: err?.message });
  }
});

// Route pour démarrer un état des lieux de départ
app.post("/api/checkin/start", async (req, res) => {
  try {
    const { bookingId } = req.body;

    // Validation de l'entrée
    if (!bookingId || typeof bookingId !== "string") {
      return res.status(400).json({
        success: false,
        error: "bookingId est requis et doit être une chaîne de caractères",
      });
    }

    // Vérifier que le booking existe et récupérer les informations nécessaires
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, vehicle_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("❌ [checkin/start] Erreur récupération booking:", bookingError);
      return res.status(404).json({
        success: false,
        error: "Réservation introuvable",
      });
    }

    const renterId = booking.user_id;
    const vehicleId = booking.vehicle_id;

    // Récupérer le owner_id depuis le véhicule
    const { data: vehicle, error: vehicleError } = await supabaseAdmin
      .from("vehicles")
      .select("owner_id")
      .eq("id", vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      console.error("❌ [checkin/start] Erreur récupération véhicule:", vehicleError);
      return res.status(404).json({
        success: false,
        error: "Véhicule introuvable",
      });
    }

    const ownerId = vehicle.owner_id;

    // Vérifier qu'un état des lieux n'existe pas déjà pour ce booking
    const { data: existingCheckin, error: checkinCheckError } = await supabaseAdmin
      .from("checkin_depart")
      .select("id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (checkinCheckError) {
      console.error("❌ [checkin/start] Erreur vérification checkin existant:", checkinCheckError);
      return res.status(500).json({
        success: false,
        error: "Erreur lors de la vérification d'un état des lieux existant",
      });
    }

    if (existingCheckin) {
      return res.status(400).json({
        success: false,
        error: "Un état des lieux existe déjà pour cette réservation",
        checkin_id: existingCheckin.id,
      });
    }

    // Créer un nouvel état des lieux de départ
    const { data: newCheckin, error: insertError } = await supabaseAdmin
      .from("checkin_depart")
      .insert({
        booking_id: bookingId,
        owner_id: ownerId,
        renter_id: renterId,
        status: "draft",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !newCheckin) {
      console.error("❌ [checkin/start] Erreur création checkin:", insertError);
      return res.status(500).json({
        success: false,
        error: insertError?.message || "Erreur lors de la création de l'état des lieux",
      });
    }

    console.log("✅ [checkin/start] État des lieux créé:", {
      checkin_id: newCheckin.id,
      booking_id: bookingId,
      owner_id: ownerId,
      renter_id: renterId,
    });

    // Retourner la réponse avec succès (route SPA : /checking/:bookingId — cf. App.tsx)
    return res.status(200).json({
      success: true,
      checkin_id: newCheckin.id,
      redirectUrl: `/checking/${bookingId}`,
    });
  } catch (error: any) {
    console.error("❌ [checkin/start] Erreur inattendue:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Erreur serveur lors de la création de l'état des lieux",
    });
  }
});

// Route pour sauvegarder un brouillon d'état des lieux de départ
app.post("/api/checkin/saveDraft", async (req, res) => {
  // ⚠️ TOUT DANS LE TRY/CATCH, même les logs avec JSON.stringify !
  try {
    // ⭐ LOG CRITIQUE : Handler appelé
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[CHECKIN SAVE DRAFT] 🚀 Handler appelé");
    
    // ⚠️ JSON.stringify peut throw si body contient des circulaires ou non-sérialisables
    try {
      console.log("[CHECKIN SAVE DRAFT] 📦 Raw body:", JSON.stringify(req.body, null, 2));
    } catch (stringifyError) {
      console.warn("[CHECKIN SAVE DRAFT] ⚠️ Body non-stringifiable, affichage basique");
      console.log("[CHECKIN SAVE DRAFT] 📦 Raw body (basic):", req.body);
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const body = req.body;
    const {
      checkin_id,   // optionnel -> si fourni: UPDATE
      booking_id,   // obligatoire à l'INSERT
      owner_id,     // obligatoire à l'INSERT
      renter_id,    // obligatoire à l'INSERT
      status,       // "draft"
      section,      // ex: "conducteur"
      data,         // ex: { conducteur: {...} }
    } = body || {};

    // Logs structurés pour debug détaillé
    console.log("[saveDraft] 📊 Requête parsée:", {
      booking_id,
      owner_id,
      renter_id,
      checkin_id,
      section,
      status,
      hasData: !!data,
      dataKeys: Object.keys(data || {}),
    });
    
    // ⚠️ LOG CRITIQUE : Inspecter la structure de data.step1 si présent
    if (data?.step1) {
      console.log("[saveDraft] 🔍 Structure data.step1:", {
        keys: Object.keys(data.step1),
        completedAt: data.step1.completedAt,
        hasIdentification: !!data.step1.identification,
        identificationKeys: data.step1.identification ? Object.keys(data.step1.identification) : null,
      });
    }

    // Helper pour fusionner l'ancien JSONB avec le nouveau bloc partiel
    function mergeDataSection(oldData: any, newPartial: any) {
      return {
        ...(oldData || {}),
        ...(newPartial || {}),
      };
    }

    //
    // CAS UPDATE (on a déjà un brouillon, donc on doit merger data)
    //
    if (checkin_id) {
      console.log("[saveDraft] Mode UPDATE pour checkin_id =", checkin_id);

      const { data: existingRow, error: selectError } = await supabaseAdmin
        .from("checkin_depart")
        .select("data")
        .eq("id", checkin_id)
        .single();

      if (selectError) {
        console.error("[saveDraft] Erreur SELECT brouillon existant:", selectError);
        return res.status(500).json({
          error: "SELECT_FAILED",
          details: selectError.message,
        });
      }

      const mergedData = mergeDataSection(existingRow?.data, data);

      const { data: updatedRow, error: updateError } = await supabaseAdmin
        .from("checkin_depart")
        .update({
          status: status || "draft",
          data: mergedData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkin_id)
        .select("id, booking_id, owner_id, renter_id, status, data, updated_at")
        .single();

      if (updateError) {
        console.error("[saveDraft] Erreur UPDATE checkin_depart:", updateError);
        return res.status(500).json({
          error: "UPDATE_FAILED",
          details: updateError.message,
        });
      }

      console.log("✅ [saveDraft] UPDATE réussi:", {
        checkin_id: updatedRow?.id,
        booking_id: updatedRow?.booking_id,
        status: updatedRow?.status,
        dataKeys: Object.keys(updatedRow?.data || {}),
      });
      return res.status(200).json({ checkin: updatedRow });
    }

    //
    // CAS INSERT (première sauvegarde brouillon)
    //
    console.log("[saveDraft] Mode INSERT (nouveau brouillon)");

    // ⚠️ Validation : seul booking_id est VRAIMENT obligatoire
    // owner_id et renter_id peuvent être null au début du flow
    if (!booking_id) {
      console.error("[saveDraft] booking_id manquant pour INSERT:", {
        booking_id,
        owner_id,
        renter_id,
      });
      return res.status(400).json({
        error: "MISSING_BOOKING_ID",
        details: "booking_id est obligatoire pour créer un brouillon",
      });
    }

    // ⭐ LOG CRITIQUE : Payload exact envoyé à Supabase
    const insertPayload = {
          booking_id,
          owner_id,
          renter_id,
          status: status || "draft",
          data: data || {},
          created_at: new Date().toISOString(),
    };
    
    // ⚠️ Sécuriser JSON.stringify pour éviter les crashes
    try {
      console.log("[saveDraft] 🗄️  Payload INSERT vers Supabase:", JSON.stringify(insertPayload, null, 2));
    } catch {
      console.log("[saveDraft] 🗄️  Payload INSERT vers Supabase (basic):", insertPayload);
    }

    const { data: insertedRow, error: insertError } = await supabaseAdmin
      .from("checkin_depart")
      .insert([insertPayload])
      .select("id, booking_id, owner_id, renter_id, status, data, created_at")
      .single();

    if (insertError) {
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("[saveDraft] ❌ Erreur INSERT checkin_depart:");
      console.error("[saveDraft] Error message:", insertError.message);
      console.error("[saveDraft] Error details:", insertError.details);
      console.error("[saveDraft] Error hint:", insertError.hint);
      console.error("[saveDraft] Error code:", insertError.code);
      
      // ⚠️ Sécuriser JSON.stringify
      try {
        console.error("[saveDraft] Full error object:", JSON.stringify(insertError, null, 2));
      } catch {
        console.error("[saveDraft] Full error object (basic):", insertError);
      }
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      return res.status(500).json({
        error: "INSERT_FAILED",
        details: insertError.message,
        code: insertError.code,
        hint: insertError.hint,
      });
    }

    console.log("✅ [saveDraft] INSERT réussi:", {
      checkin_id: insertedRow?.id,
      booking_id: insertedRow?.booking_id,
      status: insertedRow?.status,
      dataKeys: Object.keys(insertedRow?.data || {}),
    });
    return res.status(200).json({ checkin: insertedRow });
  } catch (e: any) {
    // si on a une exception au niveau du handler lui-même
    console.error("[saveDraft] Exception fatale côté API:", e);
    return res.status(500).json({
      error: "EXCEPTION",
      details: e?.message || String(e),
    });
  }
});

// Middleware global de gestion des erreurs (JSON)
// Permet notamment de renvoyer un JSON propre sur les erreurs de type "entity.too.large" (413)
app.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err?.type === "entity.too.large" || err?.status === 413) {
      console.error("[GLOBAL ERROR] 📦 Payload too large:", {
        type: err.type,
        status: err.status,
        message: err.message,
      });
      return res.status(413).json({
        ok: false,
        error: "PAYLOAD_TOO_LARGE",
        message: "Pièce jointe trop volumineuse",
      });
    }

    // Pour les autres erreurs non gérées, laisser Express/route spécifique gérer
    throw err;
  }
);

// ⚠️ ENDPOINT OBSOLÈTE - Migré vers Supabase Edge Function
// L'endpoint /api/create-checkout-session a été remplacé par la Supabase Edge Function
// déployée à: https://zykwfjxurwmputxwlkxs.functions.supabase.co/create-checkout-session
// Le frontend utilise maintenant payerLocation() dans src/lib/payerLocation.ts

// ── Translation endpoint ──────────────────────────────────────────────────────
// Uses MyMemory free API (no key required, 5000 chars/day/IP)
app.post("/api/translate", express.json(), async (req, res) => {
  const { text, targetLang } = req.body as { text?: string; targetLang?: string };
  if (!text || !targetLang) {
    return res.status(400).json({ error: "Missing text or targetLang" });
  }
  const LANG_MAP: Record<string, string> = { en: "fr|en", de: "fr|de", it: "fr|it" };
  const langPair = LANG_MAP[targetLang];
  if (!langPair) {
    return res.status(400).json({ error: `Unsupported targetLang: ${targetLang}` });
  }
  try {
    // MyMemory free tier: 500 chars/query max — truncate cleanly at last space
    const MAX_CHARS = 490;
    const safeText = text.length > MAX_CHARS
      ? text.substring(0, text.lastIndexOf(" ", MAX_CHARS)) + "…"
      : text;
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(safeText)}&langpair=${langPair}`;
    const response = await fetch(url);
    const data = await response.json() as { responseData?: { translatedText?: string }; responseStatus?: number };
    const translated = data?.responseData?.translatedText;
    if (!translated) return res.status(502).json({ error: "Translation service returned no result" });
    return res.json({ translatedText: translated });
  } catch (err) {
    console.error("[Translate] Error:", err);
    return res.status(500).json({ error: "Translation failed" });
  }
});

// ── Dynamic Sitemap ───────────────────────────────────────────────────────────
// Generates sitemap.xml with all active vehicle/accommodation listings from DB.
// Bots always get fresh URLs; static public/sitemap.xml is kept as fallback.
app.get("/sitemap.xml", async (_req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // Fetch active listings
    const { data: vehicles, error: vehiclesError } = await supabaseAdmin
      .from("vehicles")
      .select("id, vehicle_type, updated_at, internal_code")
      .eq("available", true)
      .order("updated_at", { ascending: false });

    if (vehiclesError) throw vehiclesError;

    const staticPages = [
      { loc: "https://rentanoo.com/", changefreq: "daily", priority: "1.0", lastmod: today },
      { loc: "https://rentanoo.com/location-scooter-nosy-be", changefreq: "weekly", priority: "0.95", lastmod: today },
      { loc: "https://rentanoo.com/location-moto-nosy-be", changefreq: "weekly", priority: "0.95", lastmod: today },
      { loc: "https://rentanoo.com/location-quad-nosy-be", changefreq: "weekly", priority: "0.9", lastmod: today },
      { loc: "https://rentanoo.com/location-voiture-nosy-be", changefreq: "weekly", priority: "0.9", lastmod: today },
      { loc: "https://rentanoo.com/location-4x4-nosy-be", changefreq: "weekly", priority: "0.9", lastmod: today },
      { loc: "https://rentanoo.com/location-minibus-nosy-be", changefreq: "weekly", priority: "0.85", lastmod: today },
      { loc: "https://rentanoo.com/location-vacances-nosy-be", changefreq: "weekly", priority: "0.95", lastmod: today },
      { loc: "https://rentanoo.com/location-appartement-nosy-be", changefreq: "weekly", priority: "0.9", lastmod: today },
      { loc: "https://rentanoo.com/location-villa-nosy-be", changefreq: "weekly", priority: "0.9", lastmod: today },
      { loc: "https://rentanoo.com/location-bungalow-nosy-be", changefreq: "weekly", priority: "0.9", lastmod: today },
      { loc: "https://rentanoo.com/meteo-nosy-be", changefreq: "daily", priority: "0.9", lastmod: today },
      { loc: "https://rentanoo.com/taux-change-euro-ariary-madagascar", changefreq: "daily", priority: "0.9", lastmod: today },
      { loc: "https://rentanoo.com/vols-aeroport-nosy-be", changefreq: "hourly", priority: "0.9", lastmod: today },
      { loc: "https://rentanoo.com/blog", changefreq: "weekly", priority: "0.85", lastmod: today },
      { loc: "https://rentanoo.com/blog/visiter-nosy-be-en-scooter", changefreq: "monthly", priority: "0.8", lastmod: "2026-06-01" },
      { loc: "https://rentanoo.com/blog/itineraire-nosy-be-4-jours", changefreq: "monthly", priority: "0.8", lastmod: "2026-05-15" },
      { loc: "https://rentanoo.com/blog/aeroport-fascene-guide-arrivee", changefreq: "monthly", priority: "0.8", lastmod: "2026-04-20" },
      { loc: "https://rentanoo.com/rent-my-car", changefreq: "weekly", priority: "0.8", lastmod: today },
      { loc: "https://rentanoo.com/contact", changefreq: "monthly", priority: "0.5", lastmod: today },
      { loc: "https://rentanoo.com/legal", changefreq: "monthly", priority: "0.4", lastmod: today },
      // sinistre-caution intentionally excluded — app-internal page, noindex
    ];

    // Build vehicle URLs
    const vehicleUrls: { loc: string; changefreq: string; priority: string; lastmod: string }[] = [];
    for (const v of vehicles ?? []) {
      const license = ((v.internal_code as string | null) ?? v.id.replace(/-/g, "").slice(0, 8)).toUpperCase();
      const lastmod = (v.updated_at as string | null)?.slice(0, 10) ?? today;
      let loc: string;
      if (v.vehicle_type === "accommodation") {
        loc = `https://rentanoo.com/hebergement/${license}`;
      } else if (v.vehicle_type === "moto" && license === "D395A595") {
        // Only the real moto (Wakaza 250cc) uses /moto/ — all others redirect to /vehicle/
        loc = `https://rentanoo.com/moto/${license}`;
      } else {
        loc = `https://rentanoo.com/vehicle/${license}`;
      }
      vehicleUrls.push({ loc, changefreq: "weekly", priority: "0.8", lastmod });
    }

    const allUrls = [...staticPages, ...vehicleUrls];
    const urlEntries = allUrls.map(u =>
      `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    ).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600"); // 1h cache
    return res.send(xml);
  } catch (err) {
    console.error("[sitemap] Error:", err);
    // Fallback: serve static sitemap
    return res.redirect("/sitemap-static.xml");
  }
});

// 301 redirects : scooters anciennement indexés sous /moto/ → /vehicle/
// La seule vraie moto est D395A595 (Wakaza 250cc) — tout le reste = scooter
app.get("/moto/:license", (req, res, next) => {
  if (req.params.license.toUpperCase() !== "D395A595") {
    return res.redirect(301, `/vehicle/${req.params.license}`);
  }
  next();
});
app.get("/moto/:license/booking/discussion", (req, res, next) => {
  if (req.params.license.toUpperCase() !== "D395A595") {
    return res.redirect(301, `/vehicle/${req.params.license}/booking/discussion`);
  }
  next();
});

// ── X-Robots-Tag: noindex for private/app routes ────────────────────────────
// Google crawls SPA routes and gets index.html (200). React meta noindex only
// works after JS execution. HTTP header is faster and more reliable.
const NOINDEX_ROUTE_PREFIXES = [
  "/auth/",
  "/onboarding/",
  "/profile",
  "/me/",
  "/admin",
  "/success",
  "/cancel",
  "/checking/",
  "/checkin-return/",
  "/booking/",
  "/rent-my-car/register",
  "/profile-test",
];

app.use((req, res, next) => {
  const p = req.path;
  if (NOINDEX_ROUTE_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix))) {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }
  next();
});

// ── OG Social Bot Middleware ─────────────────────────────────────────────────
// Facebook, Twitter, LinkedIn crawlers hit vehicle pages before JS loads.
// We detect bot UAs, query Supabase for the vehicle photo+title, and inject
// proper og:image / og:title into the HTML so the share preview shows the photo.
// Must be placed BEFORE express.static (bots don't cache assets).

const SOCIAL_BOT_UA = /facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|telegrambot|whatsapp|applebot|googlebot|bingbot/i;

/** Cached index.html content so we don't read the file on every bot request */
let cachedIndexHtml: string | null = null;

/** Fetch vehicle data + primary photo from Supabase given a license code (first 8 chars of UUID).
 *  Uses a DB function to avoid PostgREST % URL-encoding issues with ilike on UUID columns. */
async function fetchVehicleForOg(license: string) {
  try {
    const { data, error } = await supabaseAdmin
      .rpc("get_vehicle_by_license", { p_license: license.toLowerCase() });

    if (error) {
      console.error("[OG Bot] RPC error:", error);
      return null;
    }
    if (!data || (data as unknown[]).length === 0) {
      console.log(`[OG Bot] No vehicle found for license: ${license}`);
      return null;
    }

    const row = (data as Record<string, unknown>[])[0];
    console.log(`[OG Bot] Vehicle found: ${row.brand} ${row.model} (${row.vehicle_type}) | photo: ${row.photo_url ?? "none"}`);
    return {
      id: row.id as string,
      brand: row.brand as string,
      model: row.model as string,
      vehicle_type: row.vehicle_type as string,
      year: row.year as number,
      engine_capacity: row.engine_capacity as string | null,
      description: row.description as string | null,
      photoUrl: (row.photo_url as string | null) ?? null,
    };
  } catch (err) {
    console.error("[OG Bot] fetchVehicleForOg error:", err);
    return null;
  }
}

/** Replace OG meta tags in index.html with vehicle-specific values */
function injectOgTags(html: string, opts: {
  title: string;
  description: string;
  url: string;
  image?: string | null;
}): string {
  let out = html;
  const esc = (s: string) => s.replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // og:title
  out = out.replace(/<meta property="og:title"[^>]*>/gi,
    `<meta property="og:title" content="${esc(opts.title)}" />`);
  // og:description
  out = out.replace(/<meta property="og:description"[^>]*>/gi,
    `<meta property="og:description" content="${esc(opts.description)}" />`);
  // og:url
  out = out.replace(/<meta property="og:url"[^>]*>/gi,
    `<meta property="og:url" content="${esc(opts.url)}" />`);
  // og:image (only if we have a photo)
  if (opts.image) {
    out = out.replace(/<meta property="og:image"[^>]*>/gi,
      `<meta property="og:image" content="${esc(opts.image)}" />`);
  }
  // <title>
  out = out.replace(/<title>[^<]*<\/title>/i,
    `<title>${esc(opts.title)}</title>`);
  // canonical link — inject or replace
  const canonicalTag = `<link rel="canonical" href="${esc(opts.url)}" />`;
  if (/<link rel="canonical"[^>]*>/i.test(out)) {
    out = out.replace(/<link rel="canonical"[^>]*>/gi, canonicalTag);
  } else {
    out = out.replace("</head>", `  ${canonicalTag}\n</head>`);
  }

  return out;
}

// Routes handled by OG middleware
const VEHICLE_OG_ROUTES = [
  { pattern: /^\/vehicle\/([A-Z0-9]{8})$/i,      type: "scooter"       },
  { pattern: /^\/moto\/([A-Z0-9]{8})$/i,          type: "moto"          },
  { pattern: /^\/hebergement\/([A-Z0-9]{8})$/i,   type: "accommodation" },
];

app.use(async (req, res, next) => {
  // Only intercept social crawlers
  const ua = req.headers["user-agent"] || "";
  if (!SOCIAL_BOT_UA.test(ua)) return next();
  console.log(`[OG Bot] Bot detected: "${ua.substring(0, 80)}" → ${req.path}`);

  // Match vehicle detail route
  let license: string | null = null;
  for (const route of VEHICLE_OG_ROUTES) {
    const m = req.path.match(route.pattern);
    if (m) { license = m[1].toUpperCase(); break; }
  }
  if (!license) return next();

  try {
    const vehicle = await fetchVehicleForOg(license);
    if (!vehicle) return next();

    // Build readable title/description
    const typeLabel = vehicle.vehicle_type === "accommodation" ? "Hébergement" :
                      vehicle.vehicle_type === "moto" ? "Moto" :
                      vehicle.vehicle_type === "car" ? "Voiture" :
                      vehicle.vehicle_type === "quad" ? "Quad" : "Scooter";
    const cc = vehicle.engine_capacity ? ` ${vehicle.engine_capacity}cc` : "";
    const title = `${vehicle.brand} ${vehicle.model}${cc} — Location ${typeLabel} à Nosy Be | Rentanoo`;
    const description = vehicle.description
      ? vehicle.description.substring(0, 155)
      : `Louez ${vehicle.brand} ${vehicle.model} à Nosy Be avec Rentanoo. Réservation en ligne simple et rapide.`;
    const canonicalUrl = `https://rentanoo.com${req.path}`;

    // Read index.html (cached in memory — static fs import at top of file)
    if (!cachedIndexHtml) {
      const distPath = path.resolve(process.cwd(), "dist");
      const htmlPath = path.join(distPath, "index.html");
      console.log(`[OG Bot] Reading index.html from ${htmlPath}`);
      cachedIndexHtml = fs.readFileSync(htmlPath, "utf-8");
      console.log(`[OG Bot] index.html cached (${cachedIndexHtml.length} chars)`);
    }

    const html = injectOgTags(cachedIndexHtml, {
      title,
      description,
      url: canonicalUrl,
      image: vehicle.photoUrl,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300"); // 5 min cache for bots
    console.log(`🤖 [OG Bot] ${ua.substring(0, 50)} → ${req.path} | photo: ${vehicle.photoUrl ? "✅" : "❌"}`);
    return res.send(html);
  } catch (err) {
    console.error("[OG Bot] Error:", err);
    return next();
  }
});

// 🚀 PRODUCTION : Servir le frontend buildé depuis le dossier dist/
if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(process.cwd(), "dist");

  console.log(`📦 Serveur en mode PRODUCTION - Frontend servi depuis: ${distPath}`);
  
  // Servir les fichiers statiques (CSS, JS, images, etc.)
  // Cache-Control : assets hashés 1 an, manifest/robots/sitemap 1 jour, HTML no-cache
  const sep = path.sep;
  app.use(
    express.static(distPath, {
      setHeaders: (res, filePath) => {
        const basename = path.basename(filePath);
        if (filePath.includes(sep + "assets" + sep)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else if (basename === "robots.txt" || basename === "sitemap.xml") {
          res.setHeader("Cache-Control", "public, max-age=86400");
        } else if (
          basename === "site.webmanifest" ||
          basename === "favicon.ico" ||
          basename === "favicon-32x32.png" ||
          basename === "favicon-16x16.png" ||
          basename === "apple-touch-icon.png" ||
          basename === "android-chrome-192x192.png" ||
          basename === "android-chrome-512x512.png"
        ) {
          res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
        } else if (basename === "index.html") {
          res.setHeader("Cache-Control", "no-store");
        }
      },
    })
  );
  
  // SPA fallback : toutes les routes non-API redirigent vers index.html
  // Cette route DOIT être déclarée APRÈS express.static pour capturer les routes non trouvées
  // Express 5 + path-to-regexp exige un nom de paramètre pour les wildcards : "*splat" au lieu de "*"
  app.get("*splat", (req, res, next) => {
    // Ignorer les routes API (elles sont déjà gérées plus haut)
    if (req.path.startsWith("/api")) {
      return next();
    }
    
    // Vérifier si c'est une requête pour un fichier statique (extension présente)
    const hasExtension = /\.[^/]+$/.test(req.path);
    if (hasExtension) {
      // C'est une requête pour un fichier statique qui n'existe pas → 404
      return res.status(404).send("File not found");
    }
    
    // Sinon, c'est une route SPA → servir index.html (no-store : jamais en cache)
    res.setHeader("Cache-Control", "no-store");
    console.log(`🔄 [SPA Fallback] Route SPA détectée: ${req.path} → index.html`);
    res.sendFile(path.join(distPath, "index.html"), (err) => {
      if (err) {
        console.error("❌ [SPA Fallback] Erreur servage index.html:", err);
        res.status(500).send("Erreur serveur");
      }
    });
  });
} else {
  console.log(`🔧 Serveur en mode DÉVELOPPEMENT - Site sur http://localhost:3002 (Vite), API sur ce port`);
}

// Port 3000 par défaut en dev (proxy Vite /api → localhost:3000, frontend sur 3001)
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`🚀 API listening on http://localhost:${PORT}`);
  console.log(`📧 Email provider: n8n (webhook: ${process.env.N8N_WEBHOOK_URL ? "✅ configuré" : "❌ non configuré"})`);
  if (process.env.NODE_ENV === "production") {
    console.log(`✅ Frontend et API disponibles sur le même port: ${PORT}`);
  }
});


