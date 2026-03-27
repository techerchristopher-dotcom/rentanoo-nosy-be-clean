import path from "path";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import compression from "compression";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { getStripe, isStripeConfigured, getStripeKeyType } from "./lib/stripe";
import { getAuthUserFromRequest } from "./lib/depositAuth";
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

        // Lire commission base depuis Supabase: subtotal
        const { data: bookingRow, error: fetchErr } = await supabaseAdmin
          .from("bookings")
          .select("subtotal")
          .eq("id", bookingId)
          .single();
        if (fetchErr) {
          console.error("❌ Lecture bookings.subtotal:", fetchErr);
          return res.status(500).json({ ok: false, error: fetchErr.message });
        }

        const commissionBase = Number(bookingRow?.subtotal || 0);
        // Calculs business (15% locataire + 15% propriétaire) sur subtotal
        const { 
          calcServiceFeeRenter, 
          calcServiceFeeOwner, 
          calcRenterTotal, 
          calcOwnerPayout, 
          calcPlatformTotalFee,
          validateFeeCalculations
        } = await import("../src/utils/serviceFees.js");
        const round2 = (n: number) => Math.round(n * 100) / 100;
        const serviceFeeRenter = calcServiceFeeRenter(commissionBase);
        const serviceFeeOwner = calcServiceFeeOwner(commissionBase);
        const amountTotalPaid = calcRenterTotal(commissionBase);
        const ownerPayoutAmount = calcOwnerPayout(commissionBase);
        const platformTotalFee = calcPlatformTotalFee(commissionBase);
        
        // Self-check DEV-only
        validateFeeCalculations(commissionBase, serviceFeeRenter, serviceFeeOwner, platformTotalFee);

        // Alerte si désalignement montant Stripe vs calcul (tolérance arrondis)
        if (amountTotal && Math.abs(amountTotal - amountTotalPaid) > 0.02) {
          console.warn("⚠️ Stripe amount_total différent du calcul business", {
            amountTotalFromStripe: amountTotal,
            amountTotalPaid,
          });
        }

        // Préparer le payload pour l'update
        const updatePayload = {
          status: "accepted",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: paymentIntentId || null,
          stripe_checkout_session_id: checkoutSessionId,
          amount_total_paid: amountTotal || amountTotalPaid,
          service_fee_renter: serviceFeeRenter,
          service_fee_owner: serviceFeeOwner,
          owner_payout_amount: ownerPayoutAmount,
          platform_total_fee: platformTotalFee,
          currency,
          updated_at: new Date().toISOString(),
        };

        // Log DEV-only avant update
        if (process.env.NODE_ENV !== "production") {
          console.info("[fees-webhook-write:before]", {
            webhook: "EXPRESS_WEBHOOK",
            bookingId,
            status: updatePayload.status,
            currency: updatePayload.currency,
            paid_at: updatePayload.paid_at,
            stripe_checkout_session_id: updatePayload.stripe_checkout_session_id,
            stripe_payment_intent_id: updatePayload.stripe_payment_intent_id,
            amount_total_paid: updatePayload.amount_total_paid,
            service_fee_renter: updatePayload.service_fee_renter,
            service_fee_owner: updatePayload.service_fee_owner,
            owner_payout_amount: updatePayload.owner_payout_amount,
            platform_total_fee: updatePayload.platform_total_fee,
          });
        }

        const { data: updateData, error: updateErr } = await supabaseAdmin
          .from("bookings")
          .update(updatePayload)
          .eq("id", bookingId)
          .select();

        // Log DEV-only après update
        if (process.env.NODE_ENV !== "production") {
          console.info("[fees-webhook-write:after]", {
            webhook: "EXPRESS_WEBHOOK",
            bookingId,
            ok: !updateErr,
            error: updateErr?.message || null,
            data: updateData ? "updated" : null,
          });
        }

        if (updateErr) {
          console.error("❌ Update bookings après paiement:", updateErr);
          return res.status(500).json({ ok: false, error: updateErr.message });
        }

        console.log("✅ [webhook] Booking mis à jour après paiement:", {
          bookingId,
          status: "accepted",
          paymentStatus: "paid",
          amountTotalPaid,
          ownerPayoutAmount,
          platformTotalFee,
        });
        
        console.log(`✅ [webhook] bookingId=${bookingId}, payment confirmed -> statutReservation=accepted, statutPaiement=paid`);
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
  "✅ [AdminRoutes] Monté : POST /api/admin/bookings utilise la logique agence (tarif price_per_day_agency, pricing_mode=admin, service_fee=0)."
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

    // Retourner la réponse avec succès
    return res.status(200).json({
      success: true,
      checkin_id: newCheckin.id,
      redirectUrl: `/etat-des-lieux/depart/${newCheckin.id}`,
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
          res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
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
    
    // Sinon, c'est une route SPA → servir index.html (no-cache pour éviter stale HTML)
    res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
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


