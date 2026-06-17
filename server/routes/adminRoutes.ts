import type { Express, Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import multer from "multer";
import Stripe from "stripe";
import { requireAdmin } from "../lib/adminAuth";
import { getStripe } from "../lib/stripe";
import { updateClaimChargeRowFromPaymentIntent } from "../lib/bookingClaimChargesSync";
import { computeBaseRentalPrice } from "@/utils/rentalPriceFromDates";
import {
  calcOwnerPayout,
  calcPlatformTotalFee,
  calcRenterTotal,
  calcServiceFeeOwner,
  calcServiceFeeRenter,
} from "@/utils/serviceFees";
import {
  clearExtensionPending,
  getExtensionPending,
  wrapSelectedOptionsWithExtension,
  type ExtensionPending,
} from "@/features/admin-bookings/utils/extensionMeta";
import {
  toPublicExchangeConfig,
  type EurMgaExchangeSettings,
  type ExchangeRateMode,
} from "@/utils/dualCurrency";
import {
  ensureLiveExchangeFresh,
  loadExchangeSettings,
  refreshLiveExchangeRate,
  saveExchangeSettings,
  startExchangeRateScheduler,
} from "../lib/exchangeRateService";
import {
  loadWhatsAppContact,
  removeWhatsAppProfilePhoto,
  updateWhatsAppPhone,
  uploadWhatsAppProfilePhoto,
  whatsAppContactToPublicJson,
} from "../lib/whatsappContactService";
import {
  getSiteAnalyticsSummary,
  insertSiteAnalyticsEvent,
  isAllowedSiteAnalyticsEvent,
} from "../lib/siteAnalyticsService";
import { fetchGa4Report } from "../lib/ga4DataService";
import { formatWhatsAppPhoneDisplay } from "@/utils/whatsappContact";
import {
  sanitizeAndRecalculateBookingOptions,
  type RawBookingOptionInput,
} from "@/utils/bookingOptionSecurity";
import {
  deriveBookingLocations,
  requiresHotelName,
  sanitizeHotelName,
} from "@/utils/bookingLocations";
import { isPlatformTransportOption } from "@/constants/platformBookingOptions";

/** Build id — doit correspondre aux en-têtes HTTP et au champ debug de la réponse 201. */
const ADMIN_BOOKING_CREATE_BUILD_ID = "agency-v2-debug-20260328";

/** Identifiant fixe du handler (preuve runtime dans le JSON). */
const DEBUG_HANDLER_ID = "admin-bookings-agency-v2";

const CANCEL_LIKE = new Set(["cancelled", "declined", "rejected", "terminated"]);

function sanitizeIlikePattern(q: string): string {
  return q.replace(/%/g, "").replace(/_/g, "").trim();
}

function combineLocalDateTime(dateYmd: string, timeHm: string): Date {
  const day = dateYmd.split("T")[0];
  const [ys, ms, ds] = day.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const t = (timeHm || "12:00").trim();
  const [hs, mins] = t.split(":");
  const hh = Number(hs) || 0;
  const mm = Number(mins) || 0;
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

function datesOverlapYmd(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseSelectedOptionsFromBody(raw: unknown): RawBookingOptionInput[] {
  if (!Array.isArray(raw)) return [];
  const out: RawBookingOptionInput[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (!name && typeof o.id !== "string") continue;
    out.push({
      id: typeof o.id === "string" ? o.id : undefined,
      name: name || String(o.id),
      pricePerDay: typeof o.pricePerDay === "number" ? o.pricePerDay : undefined,
      totalPrice: typeof o.totalPrice === "number" ? o.totalPrice : undefined,
    });
  }
  return out;
}

/** Tarification agence : base + options plateforme, sans frais service 15 %. */
function computeAdminBookingPricing(basePrice: number, rawOptions: RawBookingOptionInput[] | undefined) {
  const sanitized = sanitizeAndRecalculateBookingOptions(rawOptions, basePrice);
  return {
    selected_options: sanitized.selectedOptions.length > 0 ? sanitized.selectedOptions : null,
    options_total: sanitized.optionsTotal,
    subtotal: sanitized.subtotal,
    service_fee: 0,
    total_price: sanitized.subtotal,
    sanitizedOptions: sanitized.selectedOptions,
  };
}

function deriveAdminBookingLocations(
  sanitizedOptions: Array<{ id: string }>,
  hotelName: string | null | undefined,
  manualPickupLocation: string
): { pickup_location: string; return_location: string } {
  const transportIds = sanitizedOptions
    .map((o) => o.id)
    .filter((id) => isPlatformTransportOption(id));

  if (transportIds.length > 0) {
    const derived = deriveBookingLocations({
      selectedOptionIds: transportIds,
      hotelName,
    });
    return {
      pickup_location: derived.pickupLocation,
      return_location: derived.returnLocation,
    };
  }

  const pickup = manualPickupLocation.trim() || "Agence";
  return { pickup_location: pickup, return_location: pickup };
}

function selectedOptionsFromDraftSnapshot(draft: { pricing_snapshot?: unknown }): RawBookingOptionInput[] {
  const snap = draft.pricing_snapshot;
  if (!snap || typeof snap !== "object") return [];
  const raw = (snap as Record<string, unknown>).selectedOptions;
  return parseSelectedOptionsFromBody(raw);
}

const DIAG = "[DIAG][admin/clients]";

function logSupabaseError(ctx: string, err: { message?: string; code?: string; details?: string; hint?: string } | null) {
  if (!err) return;
  console.error(`${DIAG} ${ctx} Supabase error:`, {
    message: err.message,
    code: err.code,
    details: err.details,
    hint: err.hint,
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeEmail(email: unknown): string {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function generateStrongPassword(): string {
  // No storage: generated at conversion time only, returned once.
  // 18 chars base64url => ~24 chars, URL-safe.
  return crypto.randomBytes(18).toString("base64url");
}

function isValidYmd(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [ys, ms, ds] = s.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function parseAmountEuros(raw: unknown): { ok: true; euros: number } | { ok: false; message: string } {
  if (raw === null || raw === undefined) {
    return { ok: false, message: "Montant requis." };
  }
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw <= 0) {
      return { ok: false, message: "Montant invalide (doit être un nombre strictement positif)." };
    }
    return { ok: true, euros: raw };
  }
  if (typeof raw === "string") {
    const s = raw.trim().replace(",", ".");
    const n = parseFloat(s);
    if (!Number.isFinite(n) || n <= 0) {
      return { ok: false, message: "Montant invalide (doit être un nombre strictement positif)." };
    }
    return { ok: true, euros: n };
  }
  return { ok: false, message: "Montant invalide." };
}

function depositCapFromSnapshot(snapshot: unknown): { ok: true; capCents: number } | { ok: false; message: string } {
  const n = Number(snapshot ?? 0);
  if (!Number.isFinite(n) || n <= 0) {
    return {
      ok: false,
      message: "Caution contractuelle absente ou nulle (deposit_amount_snapshot) : prélèvement impossible.",
    };
  }
  return { ok: true, capCents: Math.round(n * 100) };
}

function formatStripeErrorForAdmin(code: string | undefined, message: string): string {
  const c = code ?? "";
  if (c === "authentication_required" || c === "requires_action") {
    return "Authentification bancaire requise : ce prélèvement hors session est refusé. Le locataire doit valider le paiement avec sa banque ou enregistrer une autre carte.";
  }
  if (c === "card_declined") {
    return "Carte refusée par la banque. Vérifiez le moyen de paiement enregistré ou demandez au locataire d’en ajouter un autre.";
  }
  if (c === "expired_card") {
    return "Carte expirée. Le locataire doit enregistrer un nouveau moyen de paiement.";
  }
  if (c === "insufficient_funds") {
    return "Fonds insuffisants sur la carte.";
  }
  return message || "Le prélèvement a échoué (Stripe).";
}

export function registerAdminRoutes(app: Express, supabaseAdmin: SupabaseClient) {
  function settingsToAdminJson(settings: EurMgaExchangeSettings) {
    return {
      ok: true,
      mode: settings.mode,
      rate: settings.rate,
      effectiveFrom: settings.effectiveFrom,
      liveProvider: settings.liveProvider ?? null,
      lastLiveRate: settings.lastLiveRate ?? null,
      lastFetchedAt: settings.lastFetchedAt ?? null,
    };
  }

  // GET /api/public/exchange-rate — lecture taux EUR/MGA (client + admin)
  app.get("/api/public/exchange-rate", async (_req: Request, res: Response) => {
    const settings = await ensureLiveExchangeFresh(supabaseAdmin);
    const config = toPublicExchangeConfig(settings);
    const { getExchangeRateTrend } = await import("../lib/exchangeRateService");
    const trend = await getExchangeRateTrend(settings);
    return res.json({
      ok: true,
      rate: config.rate,
      effectiveFrom: config.effectiveFrom,
      mode: settings.mode,
      trend,
    });
  });

  // GET /api/public/booking-transport-options — forfaits aéroport/hôtel (MGA)
  app.get("/api/public/booking-transport-options", async (_req: Request, res: Response) => {
    const { data, error } = await supabaseAdmin
      .from("platform_settings")
      .select("value")
      .eq("key", "booking_transport_options")
      .maybeSingle();

    if (error) {
      return res.status(500).json({ ok: false, message: error.message });
    }

    const raw = (data?.value ?? {}) as Record<string, unknown>;
    const airportFlatMga = Number(raw.airport_flat_mga);
    const hotelFlatMga = Number(raw.hotel_flat_mga);

    if (!Number.isFinite(airportFlatMga) || !Number.isFinite(hotelFlatMga)) {
      return res.status(404).json({ ok: false, message: "Options transport non configurées" });
    }

    return res.json({
      ok: true,
      airportFlatMga: Math.round(airportFlatMga),
      hotelFlatMga: Math.round(hotelFlatMga),
    });
  });

  // GET /api/public/whatsapp-contact — numéro + photo profil (bouton flottant)
  app.get("/api/public/whatsapp-contact", async (_req: Request, res: Response) => {
    try {
      const contact = await loadWhatsAppContact(supabaseAdmin);
      return res.json(whatsAppContactToPublicJson(contact));
    } catch (e: unknown) {
      return res.status(500).json({
        ok: false,
        message: e instanceof Error ? e.message : "Contact WhatsApp indisponible",
      });
    }
  });

  // POST /api/public/analytics/event — collecte best-effort (widget WhatsApp, page views)
  app.post("/api/public/analytics/event", async (req: Request, res: Response) => {
    const eventName = typeof req.body?.eventName === "string" ? req.body.eventName.trim() : "";
    if (!isAllowedSiteAnalyticsEvent(eventName)) {
      return res.status(400).json({ ok: false, message: "Événement non autorisé." });
    }

    const pagePath = typeof req.body?.pagePath === "string" ? req.body.pagePath.trim() : null;
    const metadata =
      req.body?.metadata && typeof req.body.metadata === "object" && !Array.isArray(req.body.metadata)
        ? (req.body.metadata as Record<string, string | number | boolean>)
        : {};

    try {
      await insertSiteAnalyticsEvent(supabaseAdmin, { eventName, pagePath, metadata });
      return res.json({ ok: true });
    } catch (e: unknown) {
      return res.status(500).json({
        ok: false,
        message: e instanceof Error ? e.message : "Erreur enregistrement",
      });
    }
  });

  // GET /api/public/weather-nosy-be — météo actuelle Nosy Be (Open-Meteo)
  app.get("/api/public/weather-nosy-be", async (req: Request, res: Response) => {
    try {
      const extended = req.query.extended === "1" || req.query.extended === "true";
      if (extended) {
        const { getNosyBeWeatherExtended } = await import("../lib/nosyBeWeather");
        const weather = await getNosyBeWeatherExtended();
        return res.json({ ok: true, ...weather });
      }
      const { getNosyBeWeather } = await import("../lib/nosyBeWeather");
      const weather = await getNosyBeWeather();
      return res.json({ ok: true, ...weather });
    } catch (e: unknown) {
      return res.status(502).json({
        ok: false,
        message: e instanceof Error ? e.message : "Météo indisponible",
      });
    }
  });

  // GET /api/public/flights-nosy-be — horaires vols Fascène (AeroDataBox)
  // ?date=YYYY-MM-DD pour le programme d'un jour (max 7 jours)
  app.get("/api/public/flights-nosy-be", async (req: Request, res: Response) => {
    try {
      const { getNosyBeFlights, isNosyBeFlightsConfigured } = await import("../lib/nosyBeFlights");
      if (!isNosyBeFlightsConfigured()) {
        return res.json({ ok: false, configured: false });
      }
      const date = typeof req.query.date === "string" ? req.query.date : undefined;
      const flights = await getNosyBeFlights(date);
      return res.json({ ok: true, configured: true, ...flights });
    } catch (e: unknown) {
      return res.status(502).json({
        ok: false,
        configured: true,
        message: e instanceof Error ? e.message : "Vols indisponibles",
      });
    }
  });

  // GET /api/public/exchange-rate/history — historique EUR/MGA (SEO)
  app.get("/api/public/exchange-rate/history", async (_req: Request, res: Response) => {
    try {
      const { getExchangeRateHistory } = await import("../lib/exchangeRateService");
      const history = await getExchangeRateHistory(14);
      return res.json({ ok: true, history });
    } catch (e: unknown) {
      return res.status(502).json({
        ok: false,
        message: e instanceof Error ? e.message : "Historique indisponible",
      });
    }
  });

  // GET /api/admin/settings/exchange-rate
  app.get("/api/admin/settings/exchange-rate", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);
    const settings = await ensureLiveExchangeFresh(supabaseAdmin);
    return res.json(settingsToAdminJson(settings));
  });

  // PATCH /api/admin/settings/exchange-rate
  app.patch("/api/admin/settings/exchange-rate", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const modeRaw = req.body?.mode;
    const mode: ExchangeRateMode = modeRaw === "live" ? "live" : "manual";
    const current = await loadExchangeSettings(supabaseAdmin);

    if (mode === "live") {
      try {
        const refreshed = await refreshLiveExchangeRate(supabaseAdmin);
        return res.json(settingsToAdminJson(refreshed));
      } catch (e: unknown) {
        return res.status(502).json({
          ok: false,
          message: e instanceof Error ? e.message : "Impossible de récupérer le taux Frankfurter",
        });
      }
    }

    const rateRaw = req.body?.rate;
    const rate = typeof rateRaw === "number" ? rateRaw : parseFloat(String(rateRaw ?? ""));
    if (!Number.isFinite(rate) || rate <= 0) {
      return res.status(400).json({ ok: false, message: "Taux invalide (nombre strictement positif requis)." });
    }

    let effectiveFrom =
      typeof req.body?.effectiveFrom === "string" ? req.body.effectiveFrom.trim() : "";
    if (!effectiveFrom || !isValidYmd(effectiveFrom)) {
      effectiveFrom = new Date().toISOString().slice(0, 10);
    }

    const value: EurMgaExchangeSettings = {
      mode: "manual",
      rate: Math.round(rate),
      effectiveFrom,
      liveProvider: undefined,
      lastLiveRate: current.lastLiveRate,
      lastFetchedAt: current.lastFetchedAt,
    };
    try {
      await saveExchangeSettings(supabaseAdmin, value);
    } catch (e: unknown) {
      return res.status(500).json({ ok: false, message: e instanceof Error ? e.message : "Erreur" });
    }
    return res.json(settingsToAdminJson(value));
  });

  // POST /api/admin/settings/exchange-rate/refresh — force Frankfurter (mode live)
  app.post("/api/admin/settings/exchange-rate/refresh", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    try {
      const refreshed = await refreshLiveExchangeRate(supabaseAdmin);
      return res.json(settingsToAdminJson(refreshed));
    } catch (e: unknown) {
      return res.status(502).json({
        ok: false,
        message: e instanceof Error ? e.message : "Impossible de récupérer le taux Frankfurter",
      });
    }
  });

  const whatsappPhotoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ok = /^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype);
      cb(null, ok);
    },
  });

  function whatsAppContactAdminJson(contact: Awaited<ReturnType<typeof loadWhatsAppContact>>) {
    return {
      ok: true,
      phoneE164: contact.phoneE164,
      phoneDisplay: formatWhatsAppPhoneDisplay(contact.phoneE164),
      profilePhotoUrl: contact.profilePhotoUrl,
    };
  }

  // GET /api/admin/settings/whatsapp-contact
  app.get("/api/admin/settings/whatsapp-contact", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);
    try {
      const contact = await loadWhatsAppContact(supabaseAdmin);
      return res.json(whatsAppContactAdminJson(contact));
    } catch (e: unknown) {
      return res.status(500).json({ ok: false, message: e instanceof Error ? e.message : "Erreur" });
    }
  });

  // PATCH /api/admin/settings/whatsapp-contact — numéro et/ou suppression photo
  app.patch("/api/admin/settings/whatsapp-contact", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    try {
      if (req.body?.removePhoto === true) {
        const contact = await removeWhatsAppProfilePhoto(supabaseAdmin);
        return res.json(whatsAppContactAdminJson(contact));
      }

      const phoneRaw = req.body?.phone;
      if (typeof phoneRaw !== "string" || !phoneRaw.trim()) {
        return res.status(400).json({ ok: false, message: "Numéro WhatsApp requis." });
      }

      const contact = await updateWhatsAppPhone(supabaseAdmin, phoneRaw.trim());
      return res.json(whatsAppContactAdminJson(contact));
    } catch (e: unknown) {
      return res.status(400).json({ ok: false, message: e instanceof Error ? e.message : "Erreur" });
    }
  });

  // POST /api/admin/settings/whatsapp-contact/photo
  app.post(
    "/api/admin/settings/whatsapp-contact/photo",
    whatsappPhotoUpload.single("photo"),
    async (req: Request, res: Response) => {
      const gate = await requireAdmin(req, supabaseAdmin);
      if (gate.ok === false) return res.status(gate.status).json(gate.body);

      const file = req.file;
      if (!file?.buffer?.length) {
        return res.status(400).json({ ok: false, message: "Photo requise (JPG, PNG ou WebP, max 2 Mo)." });
      }

      try {
        const contact = await uploadWhatsAppProfilePhoto(
          supabaseAdmin,
          file.buffer,
          file.mimetype
        );
        return res.json(whatsAppContactAdminJson(contact));
      } catch (e: unknown) {
        return res.status(400).json({ ok: false, message: e instanceof Error ? e.message : "Erreur" });
      }
    }
  );

  startExchangeRateScheduler(supabaseAdmin);

  // GET /api/admin/analytics/site — stats widget WhatsApp + pages
  app.get("/api/admin/analytics/site", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const daysRaw = typeof req.query?.days === "string" ? parseInt(req.query.days, 10) : 30;
    const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(daysRaw, 90) : 30;

    try {
      const summary = await getSiteAnalyticsSummary(supabaseAdmin, days);
      return res.json({ ok: true, ...summary });
    } catch (e: unknown) {
      return res.status(500).json({
        ok: false,
        message: e instanceof Error ? e.message : "Statistiques indisponibles",
      });
    }
  });

  // GET /api/admin/analytics/ga4 — rapports Google Analytics (Data API)
  app.get("/api/admin/analytics/ga4", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const daysRaw = typeof req.query?.days === "string" ? parseInt(req.query.days, 10) : 30;
    const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(daysRaw, 90) : 30;

    try {
      const report = await fetchGa4Report(days);
      return res.json({ ok: true, ...report });
    } catch (e: unknown) {
      return res.status(502).json({
        ok: false,
        message: e instanceof Error ? e.message : "Google Analytics indisponible",
      });
    }
  });

  // ============================================================================
  // Admin planning (Phase 1 backend) — source de vérité pour futur Gantt admin
  // ============================================================================
  app.get("/api/admin/planning", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const start = typeof req.query?.start === "string" ? req.query.start.trim() : "";
    const end = typeof req.query?.end === "string" ? req.query.end.trim() : "";
    if (!start) return res.status(400).json({ ok: false, error: "MISSING_START", message: "Paramètre 'start' requis (YYYY-MM-DD)" });
    if (!end) return res.status(400).json({ ok: false, error: "MISSING_END", message: "Paramètre 'end' requis (YYYY-MM-DD)" });
    if (!isValidYmd(start)) return res.status(400).json({ ok: false, error: "INVALID_START", message: "Paramètre 'start' invalide (YYYY-MM-DD)" });
    if (!isValidYmd(end)) return res.status(400).json({ ok: false, error: "INVALID_END", message: "Paramètre 'end' invalide (YYYY-MM-DD)" });
    if (end < start) return res.status(400).json({ ok: false, error: "INVALID_RANGE", message: "La fin doit être >= au début" });

    const qRaw = typeof req.query?.q === "string" ? req.query.q : "";
    const q = sanitizeIlikePattern(qRaw);
    const vehicleType = typeof req.query?.vehicle_type === "string" ? req.query.vehicle_type.trim() : "";
    const includeInactiveRaw = typeof req.query?.include_inactive === "string" ? req.query.include_inactive.trim() : "";
    const includeInactive = includeInactiveRaw === "0" ? false : true; // défaut "1"

    type PlanningVehiclePhoto = {
      photo_url: string | null;
      is_primary: boolean | null;
      display_order: number | null;
    };
    type PlanningVehicleRow = {
      id: string;
      brand: string;
      model: string;
      available: boolean | null;
      vehicle_type: "car" | "moto" | "scooter" | null;
      vehicle_category: string | null;
      engine_capacity: string | null;
      vehicle_photos: PlanningVehiclePhoto[] | null;
    };

    let vq = supabaseAdmin
      .from("vehicles")
      .select(
        "id, brand, model, available, vehicle_type, vehicle_category, engine_capacity, vehicle_photos(photo_url, is_primary, display_order)"
      );

    // Par défaut : toute la flotte.
    // include_inactive=0 => masquer véhicules non exploitables.
    if (!includeInactive) {
      // Compat schéma DB : la colonne vehicles.status n'existe pas (cf. erreur runtime).
      // Source de vérité hors flotte = vehicles.available (déjà utilisé dans le repo).
      vq = vq.eq("available", true);
    }

    if (vehicleType) {
      vq = vq.eq("vehicle_type", vehicleType);
    }

    if (q) {
      const pattern = `%${q}%`;
      vq = vq.or(`brand.ilike.${pattern},model.ilike.${pattern}`);
    }

    const { data: vehicles, error: vehErr } = await vq.order("created_at", { ascending: false });
    if (vehErr) {
      console.error("[admin/planning] vehicles", vehErr);
      return res.status(500).json({ ok: false, error: "VEHICLES_FETCH_FAILED", message: vehErr.message });
    }

    const vRowsRaw = (vehicles ?? []) as PlanningVehicleRow[];

    // Calcule la photo principale (alignée sur pickPrimaryPhotoUrl côté front) :
    // priorité is_primary, puis plus petit display_order, en ignorant les .heic.
    function isHeicUrl(url: string | null | undefined): boolean {
      if (!url) return false;
      const lower = url.toLowerCase();
      return lower.endsWith(".heic") || lower.includes(".heic?");
    }
    function pickPrimary(photos: PlanningVehiclePhoto[] | null): string | null {
      const valid = (photos ?? []).filter((p) => p.photo_url && !isHeicUrl(p.photo_url));
      if (valid.length === 0) return null;
      const primary = valid.find((p) => p.is_primary);
      if (primary?.photo_url) return primary.photo_url;
      const sorted = [...valid].sort(
        (a, b) => (a.display_order ?? 999) - (b.display_order ?? 999)
      );
      return sorted[0]?.photo_url ?? null;
    }

    const vRows = vRowsRaw.map(({ vehicle_photos, ...rest }) => ({
      ...rest,
      status: null as null,
      primary_photo_url: pickPrimary(vehicle_photos ?? null),
    }));
    const vehicleIds = vRows.map((v) => v.id).filter(Boolean);

    type PlanningBookingRow = {
      id: string;
      vehicle_id: string;
      user_id: string;
      start_date: string;
      end_date: string;
      start_time: string | null;
      end_time: string | null;
      status: string | null;
      pricing_mode: string | null;
      reference_number: number | null;
      pickup_location: string | null;
      total_price: number | null;
    };

    const cancelLike = '("cancelled","declined","rejected","terminated")';

    let bq = supabaseAdmin
      .from("bookings")
      .select("id, vehicle_id, user_id, start_date, end_date, start_time, end_time, status, pricing_mode, reference_number, pickup_location, total_price")
      .lte("start_date", end)
      .gte("end_date", start)
      .not("status", "in", cancelLike);

    if (vehicleIds.length > 0) {
      bq = bq.in("vehicle_id", vehicleIds);
    } else {
      // Aucune ligne véhicules => retourner vide (évite query bookings large).
      return res.status(200).json({
        ok: true,
        range: { start, end },
        vehicles: [],
        bookings: [],
      });
    }

    const { data: bookings, error: bookErr } = await bq.order("start_date", { ascending: true });
    if (bookErr) {
      console.error("[admin/planning] bookings", bookErr);
      return res.status(500).json({ ok: false, error: "BOOKINGS_FETCH_FAILED", message: bookErr.message });
    }

    const bRows = (bookings ?? []) as PlanningBookingRow[];
    const renterIds = Array.from(new Set(bRows.map((b) => b.user_id).filter(Boolean)));

    type RenterRow = {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
    };

    const renterById = new Map<string, RenterRow>();
    if (renterIds.length > 0) {
      const { data: renters, error: renterErr } = await supabaseAdmin
        .from("profiles")
        .select("id, first_name, last_name, email, phone")
        .in("id", renterIds);

      if (renterErr) {
        // Ne pas faire échouer toute la route : renter peut être null.
        console.warn("[admin/planning] renters lookup failed (non-bloquant):", renterErr.message);
      } else {
        for (const r of (renters ?? []) as RenterRow[]) {
          if (r?.id) renterById.set(r.id, r);
        }
      }
    }

    const enrichedBookings = bRows.map((b) => ({
      ...b,
      renter: renterById.get(b.user_id) ?? null,
    }));

    return res.status(200).json({
      ok: true,
      range: { start, end },
      vehicles: vRows,
      bookings: enrichedBookings,
    });
  });

  // ============================================================================
  // Admin — liste réservations (hub opérationnel)
  // ============================================================================
  app.get("/api/admin/bookings", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const limitRaw = Number(typeof req.query?.limit === "string" ? req.query.limit : "");
    const offsetRaw = Number(typeof req.query?.offset === "string" ? req.query.offset : "");
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 50, 1), 200);
    const offset = Math.max(Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0, 0);

    const statusParam = typeof req.query?.status === "string" ? req.query.status.trim() : "";
    const pricingParam = typeof req.query?.pricing_mode === "string" ? req.query.pricing_mode.trim() : "";
    const includeCancelled =
      req.query?.include_cancelled === "1" || String(req.query?.include_cancelled ?? "").toLowerCase() === "true";
    const searchRaw = typeof req.query?.search === "string" ? sanitizeIlikePattern(req.query.search) : "";
    const dateFrom = typeof req.query?.date_from === "string" ? req.query.date_from.trim() : "";
    const dateTo = typeof req.query?.date_to === "string" ? req.query.date_to.trim() : "";

    const selectCols =
      "id, reference_number, status, pricing_mode, start_date, end_date, start_time, end_time, deposit_status, deposit_amount_snapshot, rental_contract_signed_at, rental_contract_pdf_url, user_id, vehicle_id, paid_at, stripe_payment_intent_id, stripe_checkout_session_id, created_at, offline_payment_method";

    type BookingListRow = {
      id: string;
      reference_number: number | null;
      status: string | null;
      pricing_mode: string | null;
      start_date: string;
      end_date: string;
      start_time: string | null;
      end_time: string | null;
      deposit_status: string | null;
      deposit_amount_snapshot: number | string | null;
      rental_contract_signed_at: string | null;
      rental_contract_pdf_url: string | null;
      user_id: string;
      vehicle_id: string;
      paid_at: string | null;
      stripe_payment_intent_id: string | null;
      stripe_checkout_session_id: string | null;
      created_at: string | null;
      offline_payment_method: string | null;
    };

    const applyFilters = (q: ReturnType<SupabaseClient["from"]>) => {
      let query = q;
      if (!includeCancelled) {
        query = query.not("status", "in", '("cancelled","declined","rejected","terminated")');
      }
      if (statusParam) {
        query = query.eq("status", statusParam);
      }
      if (pricingParam === "web" || pricingParam === "admin") {
        query = query.eq("pricing_mode", pricingParam);
      }
      if (dateFrom && isValidYmd(dateFrom) && dateTo && isValidYmd(dateTo)) {
        query = query.lte("start_date", dateTo).gte("end_date", dateFrom);
      } else if (dateFrom && isValidYmd(dateFrom)) {
        query = query.gte("end_date", dateFrom);
      } else if (dateTo && isValidYmd(dateTo)) {
        query = query.lte("start_date", dateTo);
      }
      return query;
    };

    let bookingQuery = supabaseAdmin.from("bookings").select(selectCols, { count: "exact" });
    bookingQuery = applyFilters(bookingQuery) as typeof bookingQuery;

    if (searchRaw) {
      const refNum = /^\d{1,12}$/.test(searchRaw) ? parseInt(searchRaw, 10) : NaN;
      if (Number.isFinite(refNum)) {
        bookingQuery = bookingQuery.eq("reference_number", refNum) as typeof bookingQuery;
      } else {
        const pattern = `%${searchRaw}%`;
        const [{ data: profs }, { data: vehs }] = await Promise.all([
          supabaseAdmin
            .from("profiles")
            .select("id")
            .or(`email.ilike.${pattern},first_name.ilike.${pattern},last_name.ilike.${pattern}`)
            .limit(300),
          supabaseAdmin.from("vehicles").select("id").or(`brand.ilike.${pattern},model.ilike.${pattern}`).limit(300),
        ]);
        const pids = (profs ?? []).map((p: { id: string }) => p.id).filter(Boolean);
        const vids = (vehs ?? []).map((v: { id: string }) => v.id).filter(Boolean);
        if (pids.length === 0 && vids.length === 0) {
          return res.status(200).json({ ok: true, bookings: [], total: 0, limit, offset });
        }
        const orParts: string[] = [];
        if (pids.length) orParts.push(`user_id.in.(${pids.join(",")})`);
        if (vids.length) orParts.push(`vehicle_id.in.(${vids.join(",")})`);
        bookingQuery = bookingQuery.or(orParts.join(",")) as typeof bookingQuery;
      }
    }

    bookingQuery = bookingQuery.order("start_date", { ascending: false }).range(offset, offset + limit - 1) as typeof bookingQuery;

    const { data: bookingRows, error: bErr, count } = await bookingQuery;

    if (bErr) {
      console.error("[admin/bookings/list]", bErr);
      return res.status(500).json({ ok: false, error: "BOOKINGS_FETCH_FAILED", message: bErr.message });
    }

    const rows = (bookingRows ?? []) as BookingListRow[];
    const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean)));
    const vehicleIds = Array.from(new Set(rows.map((r) => r.vehicle_id).filter(Boolean)));
    const bookingIds = rows.map((r) => r.id);

    type RenterSnippet = {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
    };
    type VehicleSnippet = { id: string; brand: string; model: string };

    const renterById = new Map<string, RenterSnippet>();
    const vehicleById = new Map<string, VehicleSnippet>();

    if (userIds.length > 0) {
      const { data: renters, error: renterErr } = await supabaseAdmin
        .from("profiles")
        .select("id, first_name, last_name, email, phone")
        .in("id", userIds);
      if (renterErr) {
        console.warn("[admin/bookings/list] renters:", renterErr.message);
      } else {
        for (const r of (renters ?? []) as RenterSnippet[]) {
          if (r?.id) renterById.set(r.id, r);
        }
      }
    }

    if (vehicleIds.length > 0) {
      const { data: vehRows, error: vehErr } = await supabaseAdmin
        .from("vehicles")
        .select("id, brand, model")
        .in("id", vehicleIds);
      if (vehErr) {
        console.warn("[admin/bookings/list] vehicles:", vehErr.message);
      } else {
        for (const v of (vehRows ?? []) as VehicleSnippet[]) {
          if (v?.id) vehicleById.set(v.id, v);
        }
      }
    }

    const edlDepartDone = new Map<string, boolean>();
    const edlReturnDone = new Map<string, boolean>();

    if (bookingIds.length > 0) {
      const [{ data: depRows }, { data: retRows }] = await Promise.all([
        supabaseAdmin.from("checkin_depart").select("booking_id, status, validated_at").in("booking_id", bookingIds),
        supabaseAdmin.from("checkin_return").select("booking_id, status").in("booking_id", bookingIds),
      ]);
      for (const d of depRows ?? []) {
        const bid = (d as { booking_id?: string | null }).booking_id;
        if (!bid) continue;
        const st = (d as { status?: string | null }).status;
        const va = (d as { validated_at?: string | null }).validated_at;
        if (st === "completed" || va) edlDepartDone.set(bid, true);
      }
      for (const r of retRows ?? []) {
        const bid = (r as { booking_id?: string }).booking_id;
        if (!bid) continue;
        if ((r as { status?: string | null }).status === "completed") edlReturnDone.set(bid, true);
      }
    }

    const bookings = rows.map((b) => ({
      ...b,
      deposit_amount_snapshot:
        b.deposit_amount_snapshot != null ? Number(b.deposit_amount_snapshot) : null,
      renter: renterById.get(b.user_id) ?? null,
      vehicle: vehicleById.get(b.vehicle_id) ?? null,
      edl_depart_done: edlDepartDone.get(b.id) === true,
      edl_return_done: edlReturnDone.get(b.id) === true,
    }));

    return res.status(200).json({
      ok: true,
      bookings,
      total: count ?? rows.length,
      limit,
      offset,
    });
  });

  // ============================================================================
  // Admin booking drafts (V1)
  // ============================================================================
  type DraftRow = {
    id: string;
    created_by_admin_id: string;
    status: string;
    progress_step: string;
    renter_user_id: string | null;
    walk_in_payload: unknown | null;
    vehicle_id: string | null;
    start_date: string | null;
    end_date: string | null;
    start_time: string | null;
    end_time: string | null;
    pickup_location: string | null;
    notes_admin: string | null;
    pricing_snapshot: unknown | null;
    converted_booking_id: string | null;
    created_at: string;
    updated_at: string;
  };

  function draftSelect() {
    return [
      "id",
      "created_by_admin_id",
      "status",
      "progress_step",
      "renter_user_id",
      "walk_in_payload",
      "vehicle_id",
      "start_date",
      "end_date",
      "start_time",
      "end_time",
      "pickup_location",
      "notes_admin",
      "pricing_snapshot",
      "converted_booking_id",
      "created_at",
      "updated_at",
    ].join(", ");
  }

  app.post("/api/admin/drafts", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);
    const adminId = gate.userId;

    const payload = req.body ?? {};
    const status = typeof payload?.status === "string" && payload.status.trim() ? payload.status.trim() : "draft";
    const progressStep =
      typeof payload?.progressStep === "string" && payload.progressStep.trim() ? payload.progressStep.trim() : "client";

    const renterUserId = typeof payload?.renterUserId === "string" ? payload.renterUserId.trim() : "";
    const walkInPayload = payload?.walkInPayload ?? null;

    const vehicleId = typeof payload?.vehicleId === "string" ? payload.vehicleId.trim() : "";
    const startDate = typeof payload?.startDate === "string" ? payload.startDate.trim() : "";
    const endDate = typeof payload?.endDate === "string" ? payload.endDate.trim() : "";
    const startTime = typeof payload?.startTime === "string" ? payload.startTime.trim() : "";
    const endTime = typeof payload?.endTime === "string" ? payload.endTime.trim() : "";
    const pickupLocation = typeof payload?.pickupLocation === "string" ? payload.pickupLocation.trim() : "";
    const notesAdmin = typeof payload?.notesAdmin === "string" ? payload.notesAdmin.trim() : "";
    const pricingSnapshot = payload?.pricingSnapshot ?? null;

    const row = {
      created_by_admin_id: adminId,
      status,
      progress_step: progressStep,
      renter_user_id: renterUserId || null,
      walk_in_payload: walkInPayload,
      vehicle_id: vehicleId || null,
      start_date: startDate || null,
      end_date: endDate || null,
      start_time: startTime || null,
      end_time: endTime || null,
      pickup_location: pickupLocation || null,
      notes_admin: notesAdmin || null,
      pricing_snapshot: pricingSnapshot,
      updated_at: nowIso(),
    };

    const { data, error } = await supabaseAdmin.from("admin_booking_drafts").insert(row).select(draftSelect()).single();
    if (error || !data) {
      console.error("[admin/drafts] create", error);
      return res.status(500).json({ ok: false, error: "DRAFT_CREATE_FAILED", message: error?.message ?? "Création impossible" });
    }
    return res.status(201).json({ ok: true, draft: data as DraftRow });
  });

  app.get("/api/admin/drafts", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);
    const adminId = gate.userId;

    const { data, error } = await supabaseAdmin
      .from("admin_booking_drafts")
      .select(draftSelect())
      .eq("created_by_admin_id", adminId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[admin/drafts] list", error);
      return res.status(500).json({ ok: false, error: "DRAFT_LIST_FAILED", message: error.message });
    }

    return res.status(200).json({ ok: true, drafts: (data ?? []) as DraftRow[] });
  });

  app.get("/api/admin/drafts/:draftId", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);
    const adminId = gate.userId;

    const draftId = typeof req.params?.draftId === "string" ? req.params.draftId.trim() : "";
    if (!draftId) return res.status(400).json({ ok: false, error: "INVALID_DRAFT_ID", message: "draftId invalide" });

    const { data, error } = await supabaseAdmin
      .from("admin_booking_drafts")
      .select(draftSelect())
      .eq("id", draftId)
      .eq("created_by_admin_id", adminId)
      .maybeSingle();

    if (error) {
      console.error("[admin/drafts] get", error);
      return res.status(500).json({ ok: false, error: "DRAFT_GET_FAILED", message: error.message });
    }
    if (!data) return res.status(404).json({ ok: false, error: "DRAFT_NOT_FOUND", message: "Brouillon introuvable" });

    return res.status(200).json({ ok: true, draft: data as DraftRow });
  });

  app.patch("/api/admin/drafts/:draftId", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);
    const adminId = gate.userId;

    const draftId = typeof req.params?.draftId === "string" ? req.params.draftId.trim() : "";
    if (!draftId) return res.status(400).json({ ok: false, error: "INVALID_DRAFT_ID", message: "draftId invalide" });

    const payload = req.body ?? {};
    const patch: Record<string, unknown> = { updated_at: nowIso() };

    if (typeof payload?.status === "string") patch.status = payload.status.trim() || "draft";
    if (typeof payload?.progressStep === "string") patch.progress_step = payload.progressStep.trim() || "client";

    if (typeof payload?.renterUserId === "string") patch.renter_user_id = payload.renterUserId.trim() || null;
    if ("walkInPayload" in payload) patch.walk_in_payload = payload.walkInPayload ?? null;

    if (typeof payload?.vehicleId === "string") patch.vehicle_id = payload.vehicleId.trim() || null;
    if (typeof payload?.startDate === "string") patch.start_date = payload.startDate.trim() || null;
    if (typeof payload?.endDate === "string") patch.end_date = payload.endDate.trim() || null;
    if (typeof payload?.startTime === "string") patch.start_time = payload.startTime.trim() || null;
    if (typeof payload?.endTime === "string") patch.end_time = payload.endTime.trim() || null;
    if (typeof payload?.pickupLocation === "string") patch.pickup_location = payload.pickupLocation.trim() || null;
    if (typeof payload?.notesAdmin === "string") patch.notes_admin = payload.notesAdmin.trim() || null;
    if ("pricingSnapshot" in payload) patch.pricing_snapshot = payload.pricingSnapshot ?? null;

    const { data, error } = await supabaseAdmin
      .from("admin_booking_drafts")
      .update(patch)
      .eq("id", draftId)
      .eq("created_by_admin_id", adminId)
      .select(draftSelect())
      .maybeSingle();

    if (error) {
      console.error("[admin/drafts] update", error);
      return res.status(500).json({ ok: false, error: "DRAFT_UPDATE_FAILED", message: error.message });
    }
    if (!data) return res.status(404).json({ ok: false, error: "DRAFT_NOT_FOUND", message: "Brouillon introuvable" });

    return res.status(200).json({ ok: true, draft: data as DraftRow });
  });

  app.delete("/api/admin/drafts/:draftId", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);
    const adminId = gate.userId;

    const draftId = typeof req.params?.draftId === "string" ? req.params.draftId.trim() : "";
    if (!draftId) return res.status(400).json({ ok: false, error: "INVALID_DRAFT_ID", message: "draftId invalide" });

    const { data, error } = await supabaseAdmin
      .from("admin_booking_drafts")
      .delete()
      .eq("id", draftId)
      .eq("created_by_admin_id", adminId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[admin/drafts] delete", error);
      return res.status(500).json({ ok: false, error: "DRAFT_DELETE_FAILED", message: error.message });
    }
    if (!data) return res.status(404).json({ ok: false, error: "DRAFT_NOT_FOUND", message: "Brouillon introuvable" });

    return res.status(200).json({ ok: true });
  });

  app.post("/api/admin/drafts/:draftId/convert", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);
    const adminId = gate.userId;

    const draftId = typeof req.params?.draftId === "string" ? req.params.draftId.trim() : "";
    if (!draftId) return res.status(400).json({ ok: false, error: "INVALID_DRAFT_ID", message: "draftId invalide" });

    const { data: draft, error: dErr } = await supabaseAdmin
      .from("admin_booking_drafts")
      .select(draftSelect())
      .eq("id", draftId)
      .eq("created_by_admin_id", adminId)
      .maybeSingle();

    if (dErr) {
      console.error("[admin/drafts] convert:get", dErr);
      return res.status(500).json({ ok: false, error: "DRAFT_GET_FAILED", message: dErr.message });
    }
    if (!draft) return res.status(404).json({ ok: false, error: "DRAFT_NOT_FOUND", message: "Brouillon introuvable" });

    const existingBookingId = (draft as DraftRow).converted_booking_id;
    if (existingBookingId) {
      return res.status(200).json({ ok: true, bookingId: existingBookingId, alreadyConverted: true });
    }

    const vehicleId = (draft as DraftRow).vehicle_id ?? "";
    const startDateRaw = (draft as DraftRow).start_date ?? "";
    const endDateRaw = (draft as DraftRow).end_date ?? "";
    const startTime = (draft as DraftRow).start_time ?? "10:00";
    const endTime = (draft as DraftRow).end_time ?? "10:00";
    const pickupLocation = (draft as DraftRow).pickup_location ?? "Agence";

    if (!vehicleId || !startDateRaw || !endDateRaw) {
      return res.status(400).json({
        ok: false,
        error: "DRAFT_INCOMPLETE",
        message: "Le brouillon doit contenir vehicleId, startDate et endDate pour être converti",
      });
    }

    let renterUserId = (draft as DraftRow).renter_user_id ?? "";
    let createdClientPassword: string | null = null;

    if (!renterUserId) {
      const wRaw = (draft as DraftRow).walk_in_payload;
      const w = wRaw && typeof wRaw === "object" ? (wRaw as Record<string, unknown>) : {};
      const email = normalizeEmail(w.email);
      const firstName = typeof w.firstName === "string" ? w.firstName.trim() : "";
      const lastName = typeof w.lastName === "string" ? w.lastName.trim() : "";
      const phone = typeof w.phone === "string" ? w.phone.trim() : "";

      if (!email || !email.includes("@")) {
        return res.status(400).json({ ok: false, error: "INVALID_CLIENT", message: "Email client invalide (walk_in_payload)" });
      }
      if (!firstName || !lastName) {
        return res.status(400).json({ ok: false, error: "INVALID_CLIENT", message: "Prénom/nom requis (walk_in_payload)" });
      }
      if (!phone) {
        return res.status(400).json({ ok: false, error: "INVALID_CLIENT", message: "Téléphone requis (walk_in_payload)" });
      }

      // If profile already exists with this email, reuse it (role renter only)
      const { data: existing, error: existingErr } = await supabaseAdmin
        .from("profiles")
        .select("id, role, phone")
        .ilike("email", email)
        .maybeSingle();
      if (existingErr) {
        return res.status(500).json({ ok: false, error: "PROFILE_LOOKUP_FAILED", message: existingErr.message });
      }
      if (existing?.id) {
        if (existing.role !== "renter") {
          return res.status(400).json({ ok: false, error: "INVALID_ROLE", message: "Le compte existant doit être un locataire" });
        }
        if (!existing.phone || !String(existing.phone).trim()) {
          return res.status(400).json({ ok: false, error: "RENTER_PHONE_REQUIRED", message: "Téléphone manquant sur le profil locataire" });
        }
        renterUserId = existing.id;
      } else {
        createdClientPassword = generateStrongPassword();
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: createdClientPassword,
          email_confirm: true,
          user_metadata: { firstName, lastName },
        });
        if (createErr || !created?.user) {
          logSupabaseError("[admin/drafts] createUser", createErr);
          return res.status(400).json({ ok: false, error: "AUTH_CREATE_FAILED", message: createErr?.message ?? "Création du compte impossible" });
        }

        renterUserId = created.user.id;

        const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert(
          {
            id: renterUserId,
            email,
            first_name: firstName,
            last_name: lastName,
            phone,
            role: "renter",
            kyc_status: "pending",
            updated_at: nowIso(),
          },
          { onConflict: "id" }
        );
        if (upsertErr) {
          logSupabaseError("[admin/drafts] profile upsert", upsertErr);
          return res.status(500).json({ ok: false, error: "PROFILE_UPSERT_FAILED", message: upsertErr.message });
        }
      }
    }

    // Reuse the existing admin booking creation logic (same checks, recalculated price).
    const { data: renter, error: renterErr } = await supabaseAdmin
      .from("profiles")
      .select("id, phone, role")
      .eq("id", renterUserId)
      .maybeSingle();
    if (renterErr || !renter) return res.status(404).json({ ok: false, error: "RENTER_NOT_FOUND", message: "Locataire introuvable" });
    if (renter.role !== "renter") return res.status(400).json({ ok: false, error: "INVALID_RENTER_ROLE", message: "Le compte cible doit être un locataire" });
    if (!renter.phone || !String(renter.phone).trim()) {
      return res.status(400).json({ ok: false, error: "RENTER_PHONE_REQUIRED", message: "Téléphone manquant sur le profil locataire" });
    }

    const { data: vehicle, error: vehErr } = await supabaseAdmin
      .from("vehicles")
      .select("id, price_per_day, price_per_day_agency, available, brand, model, deposit_amount")
      .eq("id", vehicleId)
      .maybeSingle();
    if (vehErr || !vehicle) return res.status(404).json({ ok: false, error: "VEHICLE_NOT_FOUND", message: "Véhicule introuvable" });
    if (vehicle.available === false) return res.status(400).json({ ok: false, error: "VEHICLE_UNAVAILABLE", message: "Véhicule indisponible (available=false)" });

    const rawAgency = vehicle.price_per_day_agency;
    if (rawAgency === null || rawAgency === undefined || rawAgency === "") {
      return res.status(400).json({
        ok: false,
        error: "AGENCY_PRICE_REQUIRED",
        message: "Tarif journalier agence manquant sur ce véhicule : complétez-le dans Gérer le véhicule (Tarifs & conditions).",
      });
    }
    const agencyPricePerDay = typeof rawAgency === "string" ? parseFloat(rawAgency) : Number(rawAgency);
    if (!Number.isFinite(agencyPricePerDay) || agencyPricePerDay <= 0) {
      return res.status(400).json({ ok: false, error: "INVALID_AGENCY_PRICE", message: "Tarif journalier agence invalide (doit être un montant > 0)." });
    }

    const startDt = combineLocalDateTime(startDateRaw, startTime);
    const endDt = combineLocalDateTime(endDateRaw, endTime);
    if (!(startDt instanceof Date) || Number.isNaN(startDt.getTime()) || !(endDt instanceof Date) || Number.isNaN(endDt.getTime())) {
      return res.status(400).json({ ok: false, error: "INVALID_DATES", message: "Dates ou heures invalides" });
    }
    if (endDt.getTime() <= startDt.getTime()) {
      return res.status(400).json({ ok: false, error: "INVALID_RANGE", message: "La fin doit être après le début" });
    }

    const startYmd = localYmd(startDt);
    const endYmd = localYmd(endDt);

    type BookingDateRow = { start_date: string; end_date: string; status: string | null };
    const { data: existingBookings, error: bookListErr } = await supabaseAdmin
      .from("bookings")
      .select("start_date, end_date, status")
      .eq("vehicle_id", vehicleId);
    if (bookListErr) {
      return res.status(500).json({ ok: false, error: "AVAILABILITY_CHECK_FAILED", message: bookListErr.message });
    }
    for (const row of (existingBookings ?? []) as BookingDateRow[]) {
      const st = row.status ?? "";
      if (CANCEL_LIKE.has(st)) continue;
      if (datesOverlapYmd(startYmd, endYmd, row.start_date, row.end_date)) {
        return res.status(409).json({ ok: false, error: "VEHICLE_DATE_CONFLICT", message: "Le véhicule a déjà une réservation sur cette période" });
      }
    }

    const { basePrice, rentalDays } = computeBaseRentalPrice(agencyPricePerDay, startDt, endDt);
    const draftSelectedOptions = selectedOptionsFromDraftSnapshot(draft as { pricing_snapshot?: unknown });
    const pricing = computeAdminBookingPricing(basePrice, draftSelectedOptions);

    const snap =
      (draft as { pricing_snapshot?: unknown }).pricing_snapshot &&
      typeof (draft as { pricing_snapshot?: unknown }).pricing_snapshot === "object"
        ? ((draft as { pricing_snapshot?: unknown }).pricing_snapshot as Record<string, unknown>)
        : null;
    const draftHotelName =
      typeof snap?.hotelName === "string" ? sanitizeHotelName(snap.hotelName) : "";

    const transportOptionIds = (pricing.sanitizedOptions ?? []).map((o) => o.id);
    if (requiresHotelName(transportOptionIds) && !draftHotelName) {
      return res.status(400).json({
        ok: false,
        error: "HOTEL_NAME_REQUIRED",
        message: "Nom d'hôtel requis pour les options hôtel (brouillon)",
      });
    }

    const locations = deriveAdminBookingLocations(
      pricing.sanitizedOptions ?? [],
      draftHotelName,
      pickupLocation
    );

    const insertPayload = {
      user_id: renterUserId,
      vehicle_id: vehicleId,
      start_date: startYmd,
      end_date: endYmd,
      total_price: pricing.total_price,
      status: "pending" as const,
      start_time: startTime.length >= 5 ? startTime : null,
      end_time: endTime.length >= 5 ? endTime : null,
      pickup_location: locations.pickup_location,
      return_location: locations.return_location,
      selected_options: pricing.selected_options,
      base_price: basePrice,
      options_total: pricing.options_total,
      service_fee: pricing.service_fee,
      subtotal: pricing.subtotal,
      price_per_day: agencyPricePerDay,
      rental_days: rentalDays,
      pricing_mode: "admin" as const,
      updated_at: nowIso(),
    };

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("bookings")
      .insert(insertPayload)
      .select("id")
      .single();
    if (insErr || !inserted) {
      console.error("[admin/drafts] convert: insert booking", insErr);
      return res.status(500).json({ ok: false, error: "INSERT_FAILED", message: insErr?.message ?? "Insertion impossible" });
    }

    const depositAmountRaw = (vehicle as { deposit_amount?: number | null })?.deposit_amount;
    const depositAmountSnapshot = typeof depositAmountRaw === "number" && Number.isFinite(depositAmountRaw) ? depositAmountRaw : 1000;
    const depositStatus = depositAmountSnapshot > 0 ? "pending" : "not_required";

    const { data: afterTransition, error: transitionErr } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "pending_payment",
        deposit_amount_snapshot: depositAmountSnapshot,
        deposit_status: depositStatus,
        updated_at: nowIso(),
      })
      .eq("id", inserted.id)
      .select("id, status, pricing_mode")
      .single();

    if (transitionErr || !afterTransition) {
      return res.status(500).json({ ok: false, error: "AUTO_TRANSITION_FAILED", message: transitionErr?.message ?? "Transition automatique vers pending_payment impossible" });
    }

    const { error: updDraftErr } = await supabaseAdmin
      .from("admin_booking_drafts")
      .update({ status: "converted", converted_booking_id: inserted.id, updated_at: nowIso() })
      .eq("id", draftId)
      .eq("created_by_admin_id", adminId);

    if (updDraftErr) {
      console.error("[admin/drafts] convert: update draft", updDraftErr);
      // Booking created: fail loudly but keep booking id in response for recovery.
      return res.status(500).json({
        ok: false,
        error: "DRAFT_UPDATE_FAILED_AFTER_CONVERT",
        message: updDraftErr.message,
        bookingId: inserted.id,
      });
    }

    return res.status(200).json({
      ok: true,
      bookingId: inserted.id,
      renterUserId,
      createdClientPassword,
    });
  });

  app.post("/api/admin/clients/search", async (req: Request, res: Response) => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      console.log(`${DIAG} [search:${runId}] === POST /api/admin/clients/search ===`);
      console.log(`${DIAG} [search:${runId}] body:`, JSON.stringify(req.body ?? {}));
      console.log(
        `${DIAG} [search:${runId}] Authorization présent:`,
        typeof req.headers.authorization === "string" && req.headers.authorization.startsWith("Bearer ")
      );

      const gate = await requireAdmin(req, supabaseAdmin);
      console.log(`${DIAG} [search:${runId}] requireAdmin:`, gate.ok === true ? `ok userId=${gate.userId}` : `fail status=${gate.status} body=${JSON.stringify(gate.body)}`);
      if (gate.ok === false) return res.status(gate.status).json(gate.body);

      const rawQ = typeof req.body?.q === "string" ? req.body.q : "";
      const inner = sanitizeIlikePattern(rawQ);
      if (inner.length < 1) {
        return res.status(400).json({ ok: false, error: "QUERY_TOO_SHORT", message: "Saisir au moins 1 caractère" });
      }

      const limit = Math.min(50, Math.max(1, Number(req.body?.limit) || 20));
      const pattern = `%${inner}%`;

      type PRow = {
        id: string;
        email: string | null;
        first_name: string | null;
        last_name: string | null;
        phone: string | null;
        role: string | null;
        created_at?: string;
      };
      // Inclure created_at : requis pour order() fiable côté PostgREST / certains projets Supabase
      const sel = "id, email, first_name, last_name, phone, role, created_at";
      const base = () =>
        supabaseAdmin.from("profiles").select(sel).eq("role", "renter").order("created_at", { ascending: false }).limit(limit);

      console.log(`${DIAG} [search:${runId}] requêtes Parallèles: select(${sel}) eq(role,renter) ilike pattern=${JSON.stringify(pattern)} limit=${limit}`);

      const [eRes, pRes, fnRes, lnRes] = await Promise.all([
        base().ilike("email", pattern),
        base().ilike("phone", pattern),
        base().ilike("first_name", pattern),
        base().ilike("last_name", pattern),
      ]);

      const branches = [
        { name: "email", res: eRes },
        { name: "phone", res: pRes },
        { name: "first_name", res: fnRes },
        { name: "last_name", res: lnRes },
      ] as const;
      for (const b of branches) {
        if (b.res.error) logSupabaseError(`[search:${runId}] branche ${b.name}`, b.res.error);
        else console.log(`${DIAG} [search:${runId}] branche ${b.name}: ok, ${b.res.data?.length ?? 0} ligne(s)`);
      }

      const err = eRes.error || pRes.error || fnRes.error || lnRes.error;
      if (err) {
        logSupabaseError(`[search:${runId}] agrégée`, err);
        return res.status(500).json({
          ok: false,
          error: "SEARCH_FAILED",
          message: err.message ?? "Erreur recherche",
          diagnostic: { code: err.code, details: err.details, hint: err.hint, runId },
        });
      }

      const map = new Map<string, PRow>();
      for (const row of [...(eRes.data ?? []), ...(pRes.data ?? []), ...(fnRes.data ?? []), ...(lnRes.data ?? [])]) {
        if (row?.id) map.set(row.id, row);
      }
      const clients = Array.from(map.values()).slice(0, limit);

      console.log(`${DIAG} [search:${runId}] résultat: ${clients.length} client(s) unique(s)`);
      return res.status(200).json({ ok: true, clients });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const stack = e instanceof Error ? e.stack : undefined;
      console.error(`${DIAG} [search:${runId}] EXCEPTION non gérée:`, msg, stack);
      return res.status(500).json({
        ok: false,
        error: "SEARCH_UNHANDLED",
        message: msg,
        diagnostic: { runId, stack: process.env.NODE_ENV === "development" ? stack : undefined },
      });
    }
  });

  app.post("/api/admin/clients/walk-in", async (req: Request, res: Response) => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const srPresent = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
      console.log(`${DIAG} [walk-in:${runId}] === POST /api/admin/clients/walk-in ===`);
      console.log(`${DIAG} [walk-in:${runId}] SUPABASE_SERVICE_ROLE_KEY (env):`, srPresent);
      console.log(`${DIAG} [walk-in:${runId}] body (sans password):`, JSON.stringify({ ...req.body, password: req.body?.password ? "[redacted]" : undefined }));

      const gate = await requireAdmin(req, supabaseAdmin);
      console.log(`${DIAG} [walk-in:${runId}] requireAdmin:`, gate.ok === true ? `ok userId=${gate.userId}` : `fail status=${gate.status}`);
      if (gate.ok === false) return res.status(gate.status).json(gate.body);

      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const firstName = typeof req.body?.firstName === "string" ? req.body.firstName.trim() : "";
      const lastName = typeof req.body?.lastName === "string" ? req.body.lastName.trim() : "";
      const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";

      if (!email || !email.includes("@")) {
        return res.status(400).json({ ok: false, error: "INVALID_EMAIL", message: "Email invalide" });
      }
      if (!firstName || !lastName) {
        return res.status(400).json({ ok: false, error: "INVALID_NAME", message: "Prénom et nom requis" });
      }
      if (!phone) {
        return res.status(400).json({ ok: false, error: "PHONE_REQUIRED", message: "Téléphone requis (réservation / caution)" });
      }
      if (password.length < 8) {
        return res.status(400).json({
          ok: false,
          error: "WEAK_PASSWORD",
          message: "Mot de passe d’au moins 8 caractères (compte locataire)",
        });
      }

      const {
        data: existing,
        error: existingErr,
      } = await supabaseAdmin.from("profiles").select("id").ilike("email", email).maybeSingle();
      console.log(`${DIAG} [walk-in:${runId}] pré-vérif email profil: existing=`, existing?.id ?? null, "error=", existingErr ? JSON.stringify(existingErr) : null);
      if (existingErr) {
        logSupabaseError(`[walk-in:${runId}] pré-vérif profil`, existingErr);
        return res.status(500).json({
          ok: false,
          error: "PROFILE_LOOKUP_FAILED",
          message: existingErr.message,
          diagnostic: { code: existingErr.code, details: existingErr.details, runId },
        });
      }
      if (existing?.id) {
        return res.status(409).json({ ok: false, error: "EMAIL_EXISTS", message: "Un compte existe déjà avec cet email" });
      }

      console.log(`${DIAG} [walk-in:${runId}] auth.admin.createUser… email=`, email);
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { firstName, lastName },
      });
      console.log(
        `${DIAG} [walk-in:${runId}] createUser résultat:`,
        createErr
          ? JSON.stringify({ message: createErr.message, status: createErr.status, name: createErr.name })
          : `user.id=${created?.user?.id ?? "null"}`
      );

      if (createErr || !created?.user) {
        logSupabaseError(`[walk-in:${runId}] createUser`, createErr);
        const msg = createErr?.message ?? "Création du compte impossible";
        const status = msg.toLowerCase().includes("already") ? 409 : 400;
        return res.status(status).json({ ok: false, error: "AUTH_CREATE_FAILED", message: msg });
      }

      const userId = created.user.id;
      const now = new Date().toISOString();

      const upsertPayload = {
        id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        role: "renter",
        kyc_status: "pending",
        updated_at: now,
      };
      console.log(`${DIAG} [walk-in:${runId}] profiles.upsert onConflict=id payload keys:`, Object.keys(upsertPayload));

      const { error: upsertErr } = await supabaseAdmin.from("profiles").upsert(upsertPayload, { onConflict: "id" });

      if (upsertErr) {
        logSupabaseError(`[walk-in:${runId}] profile upsert`, upsertErr);
        return res.status(500).json({
          ok: false,
          error: "PROFILE_UPSERT_FAILED",
          message: upsertErr.message,
          diagnostic: { code: upsertErr.code, details: upsertErr.details, hint: upsertErr.hint, runId },
        });
      }

      console.log(`${DIAG} [walk-in:${runId}] succès userId=`, userId);
      return res.status(201).json({
        ok: true,
        client: {
          id: userId,
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          role: "renter" as const,
        },
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const stack = e instanceof Error ? e.stack : undefined;
      console.error(`${DIAG} [walk-in:${runId}] EXCEPTION non gérée:`, msg, stack);
      return res.status(500).json({
        ok: false,
        error: "WALKIN_UNHANDLED",
        message: msg,
        diagnostic: { runId, stack: process.env.NODE_ENV === "development" ? stack : undefined },
      });
    }
  });

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /** POST (pas PATCH) : même style que search/walk-in/bookings — évite 404 sur certains proxys / hébergeurs statiques. */
  app.post("/api/admin/clients/update-phone", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const userId = typeof req.body?.userId === "string" ? req.body.userId.trim() : "";
    if (!userId || !uuidRe.test(userId)) {
      return res.status(400).json({ ok: false, error: "INVALID_USER_ID", message: "Identifiant client invalide" });
    }

    const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
    if (!phone) {
      return res.status(400).json({ ok: false, error: "PHONE_REQUIRED", message: "Téléphone requis" });
    }

    const { data: renter, error: renterErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, last_name, phone, role")
      .eq("id", userId)
      .maybeSingle();

    if (renterErr || !renter) {
      return res.status(404).json({ ok: false, error: "CLIENT_NOT_FOUND", message: "Locataire introuvable" });
    }
    if (renter.role !== "renter") {
      return res.status(400).json({ ok: false, error: "INVALID_ROLE", message: "Le compte cible doit être un locataire" });
    }

    const now = new Date().toISOString();
    const { data: updated, error: updErr } = await supabaseAdmin
      .from("profiles")
      .update({ phone, updated_at: now })
      .eq("id", userId)
      .select("id, email, first_name, last_name, phone, role")
      .single();

    if (updErr || !updated) {
      console.error("[admin/clients] update-phone", updErr);
      return res.status(500).json({
        ok: false,
        error: "UPDATE_FAILED",
        message: updErr?.message ?? "Mise à jour impossible",
      });
    }

    return res.status(200).json({ ok: true, client: updated });
  });

  app.post("/api/admin/bookings", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    console.log(`[ADMIN_BOOKINGS][${ADMIN_BOOKING_CREATE_BUILD_ID}] POST /api/admin/bookings — entrée handler (logique agence)`);

    const renterUserId = typeof req.body?.renterUserId === "string" ? req.body.renterUserId.trim() : "";
    const vehicleId = typeof req.body?.vehicleId === "string" ? req.body.vehicleId.trim() : "";
    const startDateRaw = typeof req.body?.startDate === "string" ? req.body.startDate.trim() : "";
    const endDateRaw = typeof req.body?.endDate === "string" ? req.body.endDate.trim() : "";
    const startTime = typeof req.body?.startTime === "string" ? req.body.startTime.trim() : "10:00";
    const endTime = typeof req.body?.endTime === "string" ? req.body.endTime.trim() : "10:00";
    const pickupLocation =
      typeof req.body?.pickupLocation === "string" && req.body.pickupLocation.trim()
        ? req.body.pickupLocation.trim()
        : "Agence";
    const adminNotes = typeof req.body?.adminNotes === "string" ? req.body.adminNotes.trim() : null;
    const rawOpm = req.body?.offlinePaymentMethod;
    const offlinePaymentMethod = rawOpm === "cash" || rawOpm === "card_terminal" ? rawOpm : null;
    const selectedOptionsRaw = parseSelectedOptionsFromBody(req.body?.selectedOptions);
    const hotelName =
      typeof req.body?.hotelName === "string" ? sanitizeHotelName(req.body.hotelName) : "";
    const adminId = gate.userId;

    if (!renterUserId || !vehicleId || !startDateRaw || !endDateRaw) {
      return res.status(400).json({
        ok: false,
        error: "MISSING_FIELDS",
        message: "renterUserId, vehicleId, startDate et endDate requis",
      });
    }

    const { data: renter, error: renterErr } = await supabaseAdmin
      .from("profiles")
      .select("id, phone, role")
      .eq("id", renterUserId)
      .maybeSingle();

    if (renterErr || !renter) {
      return res.status(404).json({ ok: false, error: "RENTER_NOT_FOUND", message: "Locataire introuvable" });
    }

    if (renter.role !== "renter") {
      return res.status(400).json({ ok: false, error: "INVALID_RENTER_ROLE", message: "Le compte cible doit être un locataire" });
    }

    if (!renter.phone || !String(renter.phone).trim()) {
      return res.status(400).json({
        ok: false,
        error: "RENTER_PHONE_REQUIRED",
        message: "Téléphone manquant sur le profil locataire",
      });
    }

    const { data: vehicle, error: vehErr } = await supabaseAdmin
      .from("vehicles")
      .select("id, price_per_day, price_per_day_agency, available, brand, model, deposit_amount")
      .eq("id", vehicleId)
      .maybeSingle();

    if (vehErr || !vehicle) {
      return res.status(404).json({ ok: false, error: "VEHICLE_NOT_FOUND", message: "Véhicule introuvable" });
    }

    console.log(`[ADMIN_BOOKINGS][INSERT_DIAG] vehicle_id=${vehicleId}`, {
      price_per_day: vehicle.price_per_day,
      price_per_day_agency: vehicle.price_per_day_agency,
      brand: vehicle.brand,
      model: vehicle.model,
    });

    if (vehicle.available === false) {
      return res.status(400).json({ ok: false, error: "VEHICLE_UNAVAILABLE", message: "Véhicule indisponible (available=false)" });
    }

    const rawAgency = vehicle.price_per_day_agency;
    if (rawAgency === null || rawAgency === undefined || rawAgency === "") {
      return res.status(400).json({
        ok: false,
        error: "AGENCY_PRICE_REQUIRED",
        message:
          "Tarif journalier agence manquant sur ce véhicule : complétez-le dans Gérer le véhicule (Tarifs & conditions).",
      });
    }
    const agencyPricePerDay =
      typeof rawAgency === "string" ? parseFloat(rawAgency) : Number(rawAgency);
    if (!Number.isFinite(agencyPricePerDay) || agencyPricePerDay <= 0) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_AGENCY_PRICE",
        message: "Tarif journalier agence invalide (doit être un montant > 0).",
      });
    }

    const startDt = combineLocalDateTime(startDateRaw, startTime);
    const endDt = combineLocalDateTime(endDateRaw, endTime);
    if (!(startDt instanceof Date) || Number.isNaN(startDt.getTime()) || !(endDt instanceof Date) || Number.isNaN(endDt.getTime())) {
      return res.status(400).json({ ok: false, error: "INVALID_DATES", message: "Dates ou heures invalides" });
    }
    if (endDt.getTime() <= startDt.getTime()) {
      return res.status(400).json({ ok: false, error: "INVALID_RANGE", message: "La fin doit être après le début" });
    }

    const startYmd = localYmd(startDt);
    const endYmd = localYmd(endDt);

    const { data: existingBookings, error: bookListErr } = await supabaseAdmin
      .from("bookings")
      .select("start_date, end_date, status")
      .eq("vehicle_id", vehicleId);

    if (bookListErr) {
      console.error("[admin/bookings] list existing", bookListErr);
      return res.status(500).json({ ok: false, error: "AVAILABILITY_CHECK_FAILED", message: bookListErr.message });
    }

    for (const row of existingBookings || []) {
      const st = row.status ?? "";
      if (CANCEL_LIKE.has(st)) continue;
      if (datesOverlapYmd(startYmd, endYmd, row.start_date, row.end_date)) {
        return res.status(409).json({
          ok: false,
          error: "VEHICLE_DATE_CONFLICT",
          message: "Le véhicule a déjà une réservation sur cette période",
        });
      }
    }

    const { basePrice, rentalDays } = computeBaseRentalPrice(agencyPricePerDay, startDt, endDt);
    const pricing = computeAdminBookingPricing(basePrice, selectedOptionsRaw);

    const transportOptionIds = (pricing.sanitizedOptions ?? []).map((o) => o.id);
    if (requiresHotelName(transportOptionIds) && !hotelName) {
      return res.status(400).json({
        ok: false,
        error: "HOTEL_NAME_REQUIRED",
        message: "Nom d'hôtel requis pour les options hôtel",
      });
    }

    const locations = deriveAdminBookingLocations(
      pricing.sanitizedOptions ?? [],
      hotelName,
      pickupLocation
    );

    const insertPayload = {
      user_id: renterUserId,
      vehicle_id: vehicleId,
      start_date: startYmd,
      end_date: endYmd,
      total_price: pricing.total_price,
      status: "pending" as const,
      start_time: startTime.length >= 5 ? startTime : null,
      end_time: endTime.length >= 5 ? endTime : null,
      pickup_location: locations.pickup_location,
      return_location: locations.return_location,
      selected_options: pricing.selected_options,
      base_price: basePrice,
      options_total: pricing.options_total,
      service_fee: pricing.service_fee,
      subtotal: pricing.subtotal,
      price_per_day: agencyPricePerDay,
      rental_days: rentalDays,
      pricing_mode: "admin" as const,
      updated_at: new Date().toISOString(),
      admin_notes: adminNotes || null,
      created_by_admin_id: adminId,
      offline_payment_method: offlinePaymentMethod,
    };

    console.log(`[ADMIN_BOOKINGS][INSERT_DIAG] pricing_mode avant insert =`, insertPayload.pricing_mode);
    console.log(`[ADMIN_BOOKINGS][INSERT_DIAG] objet insertPayload (exact):`, JSON.stringify(insertPayload));

    const webPpdForLog =
      typeof vehicle.price_per_day === "string"
        ? parseFloat(vehicle.price_per_day)
        : Number(vehicle.price_per_day);
    console.log("[ADMIN_BOOKINGS][PRE_INSERT_RUNTIME]", JSON.stringify({
      build: ADMIN_BOOKING_CREATE_BUILD_ID,
      handler: DEBUG_HANDLER_ID,
      vehicle_id: vehicleId,
      price_per_day_web: vehicle.price_per_day,
      price_per_day_web_parsed: webPpdForLog,
      price_per_day_agency_raw: vehicle.price_per_day_agency,
      agencyPricePerDay_used_for_compute: agencyPricePerDay,
      pricing_mode: insertPayload.pricing_mode,
      service_fee: insertPayload.service_fee,
      total_price: insertPayload.total_price,
      base_price: insertPayload.base_price,
      subtotal: insertPayload.subtotal,
      insertPayload_exact: insertPayload,
    }));

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("bookings")
      .insert(insertPayload)
      .select("id, status, created_at, price_per_day, base_price, subtotal, service_fee, total_price, pricing_mode")
      .single();

    if (insErr || !inserted) {
      console.error("[admin/bookings] insert", insErr);
      return res.status(500).json({ ok: false, error: "INSERT_FAILED", message: insErr?.message ?? "Insertion impossible" });
    }

    console.log(`[ADMIN_BOOKINGS][INSERT_DIAG] ligne retournée par Supabase après insert:`, JSON.stringify(inserted));

    // ============================================================================
    // AUTO-TRANSITION AGENCE : pending -> pending_payment + snapshot caution
    // (équivalent à l'acceptation owner côté web)
    // ============================================================================
    const depositAmountRaw = (vehicle as { deposit_amount?: number | null })?.deposit_amount;
    const depositAmountSnapshot =
      typeof depositAmountRaw === "number" && Number.isFinite(depositAmountRaw)
        ? depositAmountRaw
        : 1000;
    const depositStatus = depositAmountSnapshot > 0 ? "pending" : "not_required";
    const nowIso = new Date().toISOString();

    const { data: afterTransition, error: transitionErr } = await supabaseAdmin
      .from("bookings")
      .update({
        status: "pending_payment",
        deposit_amount_snapshot: depositAmountSnapshot,
        deposit_status: depositStatus,
        updated_at: nowIso,
      })
      .eq("id", inserted.id)
      .select("id, status, created_at, pricing_mode, deposit_amount_snapshot, deposit_status")
      .single();

    if (transitionErr || !afterTransition) {
      console.error("[admin/bookings] auto-transition pending -> pending_payment failed", transitionErr);
      return res.status(500).json({
        ok: false,
        error: "AUTO_TRANSITION_FAILED",
        message: transitionErr?.message ?? "Transition automatique vers pending_payment impossible",
      });
    }

    const debugInsertPayload = JSON.parse(JSON.stringify(insertPayload)) as Record<string, unknown>;
    const webPpdNum =
      typeof vehicle.price_per_day === "string"
        ? parseFloat(vehicle.price_per_day)
        : Number(vehicle.price_per_day);

    res.setHeader("X-Rentanoo-Admin-Booking-Build", ADMIN_BOOKING_CREATE_BUILD_ID);
    res.setHeader("X-Rentanoo-Admin-Booking-Handler", "registerAdminRoutes.ts POST /api/admin/bookings");
    return res.status(201).json({
      ok: true,
      booking: {
        id: afterTransition.id,
        status: afterTransition.status,
        createdAt: afterTransition.created_at,
      },
      debug_handler: DEBUG_HANDLER_ID,
      debug_build: ADMIN_BOOKING_CREATE_BUILD_ID,
      debug_price_per_day_agency: agencyPricePerDay,
      debug_price_per_day_web: Number.isFinite(webPpdNum) ? webPpdNum : vehicle.price_per_day,
      debug_pricing_mode_before_insert: insertPayload.pricing_mode,
      debug_insert_payload: debugInsertPayload,
      debug_row_after_insert: inserted,
      debug_row_after_transition: afterTransition,
    });
  });

  app.get("/api/admin/bookings/:bookingId", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const bookingId = req.params.bookingId;
    if (!bookingId) {
      return res.status(400).json({ ok: false, error: "MISSING_ID", message: "bookingId requis" });
    }

    const { data: booking, error: bErr } = await supabaseAdmin.from("bookings").select("*").eq("id", bookingId).maybeSingle();

    if (bErr || !booking) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Réservation introuvable" });
    }

    const [{ data: vehicle }, { data: renter }] = await Promise.all([
      supabaseAdmin
        .from("vehicles")
        .select("id, brand, model, price_per_day, price_per_day_agency")
        .eq("id", booking.vehicle_id)
        .maybeSingle(),
      supabaseAdmin.from("profiles").select("id, email, first_name, last_name, phone").eq("id", booking.user_id).maybeSingle(),
    ]);

    return res.status(200).json({
      ok: true,
      booking,
      vehicle: vehicle ?? null,
      renter: renter ?? null,
    });
  });

  // ============================================================================
  // Prélèvements admin sur la caution (Stripe off_session + traçabilité)
  // ============================================================================
  app.get("/api/admin/bookings/:bookingId/claim-charges", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const bookingId = typeof req.params.bookingId === "string" ? req.params.bookingId.trim() : "";
    if (!bookingId) {
      return res.status(400).json({ ok: false, error: "MISSING_ID", message: "bookingId requis" });
    }

    const { data: rows, error } = await supabaseAdmin
      .from("booking_claim_charges")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/bookings/claim-charges] list", error);
      return res.status(500).json({ ok: false, error: "LIST_FAILED", message: error.message });
    }

    const succeededCents = (rows ?? []).filter((r) => r.status === "succeeded").reduce((acc, r) => acc + Number(r.amount_cents ?? 0), 0);

    return res.status(200).json({
      ok: true,
      charges: rows ?? [],
      summary: { totalSucceededCents: succeededCents },
    });
  });

  app.post("/api/admin/bookings/:bookingId/claim-charge", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);
    const adminId = gate.userId;

    const bookingId = typeof req.params.bookingId === "string" ? req.params.bookingId.trim() : "";
    if (!bookingId) {
      return res.status(400).json({ ok: false, error: "MISSING_ID", message: "bookingId requis" });
    }

    const reasonRaw = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!reasonRaw) {
      return res.status(400).json({ ok: false, error: "MISSING_REASON", message: "Le motif du prélèvement est obligatoire." });
    }
    if (reasonRaw.length > 4000) {
      return res.status(400).json({ ok: false, error: "REASON_TOO_LONG", message: "Motif trop long (max 4000 caractères)." });
    }

    const amountParsed = parseAmountEuros(req.body?.amountEuros ?? req.body?.amount);
    if (amountParsed.ok === false) {
      return res.status(400).json({ ok: false, error: "INVALID_AMOUNT", message: amountParsed.message });
    }

    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, deposit_amount_snapshot, deposit_status, stripe_payment_method_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingErr || !booking) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Réservation introuvable." });
    }

    const cap = depositCapFromSnapshot(booking.deposit_amount_snapshot);
    if (cap.ok === false) {
      return res.status(400).json({ ok: false, error: "DEPOSIT_CAP_ZERO", message: cap.message });
    }

    const pmId = typeof booking.stripe_payment_method_id === "string" ? booking.stripe_payment_method_id.trim() : "";
    if (!pmId) {
      const st = typeof booking.deposit_status === "string" ? booking.deposit_status : "";
      if (st === "card_registered") {
        return res.status(409).json({
          ok: false,
          error: "MISSING_PAYMENT_METHOD",
          message:
            "Statut « carte enregistrée » sans moyen de paiement Stripe sur la réservation (ex. caution forcée sans carte). Prélèvement impossible : faites enregistrer une carte via le flux caution.",
        });
      }
      return res.status(409).json({
        ok: false,
        error: "MISSING_PAYMENT_METHOD",
        message: "Aucun moyen de paiement enregistré sur cette réservation. Le locataire doit d’abord enregistrer sa carte (SetupIntent / caution).",
      });
    }

    const renterId = typeof booking.user_id === "string" ? booking.user_id : "";
    if (!renterId) {
      return res.status(400).json({ ok: false, error: "MISSING_RENTER", message: "Locataire manquant sur la réservation." });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, stripe_customer_id")
      .eq("id", renterId)
      .maybeSingle();

    if (profileErr || !profile) {
      return res.status(500).json({ ok: false, error: "PROFILE_NOT_FOUND", message: "Profil locataire introuvable." });
    }

    const customerId = typeof profile.stripe_customer_id === "string" ? profile.stripe_customer_id.trim() : "";
    if (!customerId) {
      return res.status(409).json({
        ok: false,
        error: "STRIPE_CUSTOMER_MISSING",
        message: "Client Stripe absent pour ce locataire. Impossible de prélever tant que le profil n’a pas de stripe_customer_id.",
      });
    }

    const amountCents = Math.round(amountParsed.euros * 100);
    if (amountCents <= 0) {
      return res.status(400).json({ ok: false, error: "INVALID_AMOUNT", message: "Montant trop faible après conversion en centimes." });
    }

    const { data: priorRows, error: priorErr } = await supabaseAdmin
      .from("booking_claim_charges")
      .select("amount_cents, status")
      .eq("booking_id", bookingId);

    if (priorErr) {
      console.error("[admin/bookings/claim-charge] sum prior", priorErr);
      return res.status(500).json({ ok: false, error: "SUM_FAILED", message: priorErr.message });
    }

    const totalSucceededCents = (priorRows ?? [])
      .filter((r) => r.status === "succeeded")
      .reduce((acc, r) => acc + Number(r.amount_cents ?? 0), 0);

    const remainingCents = cap.capCents - totalSucceededCents;
    if (remainingCents <= 0) {
      return res.status(409).json({
        ok: false,
        error: "CAP_REACHED",
        message: "Le plafond de caution contractuelle est déjà entièrement utilisé par des prélèvements réussis.",
      });
    }
    if (amountCents > remainingCents) {
      return res.status(409).json({
        ok: false,
        error: "EXCEEDS_REMAINING",
        message: `Montant supérieur au reste disponible sous plafond (${(remainingCents / 100).toFixed(2)} €).`,
      });
    }

    const ts = nowIso();
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("booking_claim_charges")
      .insert({
        booking_id: bookingId,
        amount_cents: amountCents,
        currency: "eur",
        reason: reasonRaw,
        status: "pending",
        created_by_profile_id: adminId,
        created_at: ts,
        updated_at: ts,
        metadata: { source: "admin_api" },
      })
      .select("id")
      .single();

    if (insErr || !inserted?.id) {
      console.error("[admin/bookings/claim-charge] insert", insErr);
      return res.status(500).json({ ok: false, error: "INSERT_FAILED", message: insErr?.message ?? "Insertion impossible." });
    }

    const claimRowId = inserted.id as string;
    const idempotencyKey = `booking_claim_${claimRowId}`;

    const reasonMeta = reasonRaw.length > 450 ? `${reasonRaw.slice(0, 447)}...` : reasonRaw;

    let stripe: Stripe;
    try {
      stripe = getStripe();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Stripe non configuré.";
      await supabaseAdmin
        .from("booking_claim_charges")
        .update({
          status: "failed",
          failure_code: "stripe_not_configured",
          failure_message: msg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", claimRowId);
      return res.status(503).json({ ok: false, error: "STRIPE_NOT_CONFIGURED", message: msg });
    }

    try {
      const pi = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: "eur",
          customer: customerId,
          payment_method: pmId,
          off_session: true,
          confirm: true,
          description: `Prélèvement caution réservation ${bookingId}`,
          metadata: {
            rentanoo_charge_type: "booking_claim",
            booking_id: bookingId,
            claim_charge_id: claimRowId,
            created_by_admin_id: adminId,
            reason: reasonMeta,
          },
        },
        { idempotencyKey }
      );

      if (pi.status === "succeeded") {
        await updateClaimChargeRowFromPaymentIntent(supabaseAdmin, stripe, claimRowId, pi);
        const { data: row } = await supabaseAdmin.from("booking_claim_charges").select("*").eq("id", claimRowId).single();
        return res.status(200).json({
          ok: true,
          charge: row,
          stripeStatus: pi.status,
        });
      }

      if (pi.status === "processing") {
        await supabaseAdmin
          .from("booking_claim_charges")
          .update({
            stripe_payment_intent_id: pi.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", claimRowId);
        return res.status(200).json({
          ok: true,
          pending: true,
          message: "Paiement en cours de traitement. L’état sera mis à jour via Stripe (webhook).",
          stripePaymentIntentId: pi.id,
          chargeId: claimRowId,
        });
      }

      await updateClaimChargeRowFromPaymentIntent(supabaseAdmin, stripe, claimRowId, pi);
      const { data: failedRow } = await supabaseAdmin.from("booking_claim_charges").select("*").eq("id", claimRowId).single();
      const lp = pi.last_payment_error;
      const code = pi.status === "requires_action" ? "authentication_required" : (lp?.code ?? "payment_failed");
      const friendly = formatStripeErrorForAdmin(code, failedRow?.failure_message ?? lp?.message ?? "Échec du prélèvement.");
      return res.status(402).json({
        ok: false,
        error: code,
        message: friendly,
        charge: failedRow,
        stripeStatus: pi.status,
      });
    } catch (err: unknown) {
      let code = "stripe_error";
      let msg = "Erreur Stripe inattendue.";
      if (err instanceof Stripe.errors.StripeError) {
        code = err.code ?? err.type ?? code;
        msg = err.message ?? msg;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      await supabaseAdmin
        .from("booking_claim_charges")
        .update({
          status: "failed",
          failure_code: code,
          failure_message: msg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", claimRowId);
      return res.status(402).json({
        ok: false,
        error: code,
        message: formatStripeErrorForAdmin(code, msg),
      });
    }
  });

  /** Annulation logique V1 (agence) : status → cancelled, pas de DELETE. */
  const ADMIN_BOOKING_CANCELABLE_V1 = new Set(["pending", "pending_payment", "confirmed"]);

  app.post("/api/admin/bookings/:bookingId/cancel", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const bookingId = typeof req.params.bookingId === "string" ? req.params.bookingId.trim() : "";
    if (!bookingId) {
      return res.status(400).json({ ok: false, error: "MISSING_ID", message: "bookingId requis" });
    }

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("bookings")
      .select("id, status")
      .eq("id", bookingId)
      .maybeSingle();

    if (fetchErr) {
      console.error("[admin/bookings/cancel] fetch", fetchErr);
      return res.status(500).json({ ok: false, error: "FETCH_FAILED", message: fetchErr.message });
    }
    if (!row) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Réservation introuvable" });
    }

    const st = typeof row.status === "string" ? row.status.trim() : "";
    if (!ADMIN_BOOKING_CANCELABLE_V1.has(st)) {
      return res.status(409).json({
        ok: false,
        error: "NOT_CANCELLABLE",
        message: `Annulation impossible pour le statut « ${st || "—"} ». Seuls pending, pending_payment et confirmed sont annulables (V1).`,
      });
    }

    const nowIsoCancel = new Date().toISOString();
    const { data: updated, error: updErr } = await supabaseAdmin
      .from("bookings")
      .update({ status: "cancelled", updated_at: nowIsoCancel })
      .eq("id", bookingId)
      .select("id, status, updated_at")
      .maybeSingle();

    if (updErr || !updated) {
      console.error("[admin/bookings/cancel] update", updErr);
      return res.status(500).json({
        ok: false,
        error: "UPDATE_FAILED",
        message: updErr?.message ?? "Mise à jour impossible",
      });
    }

    return res.status(200).json({
      ok: true,
      booking: { id: updated.id, status: updated.status, updatedAt: updated.updated_at },
    });
  });

  // ============================================================================
  // Admin-only deposit actions (agence) — opérées par un admin pour le locataire
  // ============================================================================
  app.post("/api/admin/deposit/create-setup-intent", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const bookingId = typeof req.body?.bookingId === "string" ? req.body.bookingId.trim() : "";
    if (!bookingId) {
      return res.status(400).json({ ok: false, error: "MISSING_BOOKING_ID", message: "bookingId requis" });
    }

    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, status, deposit_status, deposit_amount_snapshot, stripe_payment_method_id, pricing_mode")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return res.status(404).json({ ok: false, error: "BOOKING_NOT_FOUND", message: "Réservation introuvable" });
    }

    if (booking.pricing_mode !== "admin") {
      return res.status(400).json({ ok: false, error: "NOT_ADMIN_PRICING", message: "Action caution admin uniquement (pricing_mode=admin)" });
    }

    const depositSnapshot = Number(booking.deposit_amount_snapshot ?? 0);
    if (depositSnapshot <= 0) {
      return res.status(400).json({ ok: false, error: "INVALID_DEPOSIT", message: "Caution non requise pour cette réservation" });
    }

    // Caution après paiement location : booking doit être confirmé
    if (booking.status !== "confirmed") {
      return res.status(400).json({ ok: false, error: "PAYMENT_REQUIRED", message: "Le paiement de la location doit être confirmé avant la caution" });
    }

    if (booking.deposit_status !== "pending") {
      return res.status(400).json({ ok: false, error: "DEPOSIT_ALREADY_PROCESSED", message: "La caution a déjà été traitée" });
    }

    if (booking.stripe_payment_method_id) {
      return res.status(400).json({ ok: false, error: "CARD_ALREADY_REGISTERED", message: "Une carte est déjà enregistrée pour cette caution" });
    }

    const renterId = booking.user_id;
    if (!renterId) {
      return res.status(400).json({ ok: false, error: "MISSING_RENTER", message: "Locataire manquant sur la réservation" });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, stripe_customer_id")
      .eq("id", renterId)
      .single();

    if (profileErr || !profile) {
      return res.status(500).json({ ok: false, error: "PROFILE_NOT_FOUND", message: "Profil locataire introuvable" });
    }

    let stripeCustomerId = profile.stripe_customer_id;
    if (!stripeCustomerId) {
      const stripe = getStripe();
      const customer = await stripe.customers.create({
        email: profile.email || undefined,
        metadata: { profileId: profile.id },
      });
      stripeCustomerId = customer.id;
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() })
        .eq("id", renterId);
    }

    const stripe = getStripe();
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: { bookingId },
    });

    return res.status(200).json({ clientSecret: setupIntent.client_secret });
  });

  app.post("/api/admin/deposit/attach-payment-method", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const bookingId = typeof req.body?.bookingId === "string" ? req.body.bookingId.trim() : "";
    const paymentMethodId = typeof req.body?.paymentMethodId === "string" ? req.body.paymentMethodId.trim() : "";
    if (!bookingId || !paymentMethodId) {
      return res.status(400).json({ ok: false, error: "MISSING_PARAMS", message: "bookingId et paymentMethodId requis" });
    }

    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select("id, user_id, status, deposit_status, deposit_amount_snapshot, stripe_payment_method_id, pricing_mode")
      .eq("id", bookingId)
      .single();

    if (bookingErr || !booking) {
      return res.status(404).json({ ok: false, error: "BOOKING_NOT_FOUND", message: "Réservation introuvable" });
    }

    if (booking.pricing_mode !== "admin") {
      return res.status(400).json({ ok: false, error: "NOT_ADMIN_PRICING", message: "Action caution admin uniquement (pricing_mode=admin)" });
    }

    const depositSnapshot = Number(booking.deposit_amount_snapshot ?? 0);
    if (depositSnapshot <= 0) {
      return res.status(400).json({ ok: false, error: "INVALID_DEPOSIT", message: "Caution non requise pour cette réservation" });
    }

    if (booking.status !== "confirmed") {
      return res.status(400).json({ ok: false, error: "PAYMENT_REQUIRED", message: "Le paiement de la location doit être confirmé avant la caution" });
    }

    if (booking.deposit_status !== "pending") {
      return res.status(400).json({ ok: false, error: "DEPOSIT_ALREADY_PROCESSED", message: "La caution a déjà été traitée" });
    }

    const renterId = booking.user_id;
    if (!renterId) {
      return res.status(400).json({ ok: false, error: "MISSING_RENTER", message: "Locataire manquant sur la réservation" });
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, stripe_customer_id")
      .eq("id", renterId)
      .single();

    if (profileErr || !profile) {
      return res.status(500).json({ ok: false, error: "PROFILE_NOT_FOUND", message: "Profil locataire introuvable" });
    }

    if (!profile.stripe_customer_id) {
      return res.status(400).json({ ok: false, error: "STRIPE_CUSTOMER_MISSING", message: "Le client Stripe n'est pas initialisé pour ce locataire" });
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
      console.error("[admin/deposit/attach-payment-method] Update error:", updateErr);
      return res.status(500).json({ ok: false, error: "UPDATE_FAILED", message: "Erreur lors de la mise à jour" });
    }

    return res.status(200).json({ ok: true });
  });

  // ============================================================================
  // MOVE BOOKING — changer véhicule et/ou dates depuis le planning (drag & drop)
  // ============================================================================
  const DRAGGABLE_STATUSES = new Set(["pending", "pending_payment"]);

  app.patch("/api/admin/bookings/:bookingId/move", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const bookingId = typeof req.params.bookingId === "string" ? req.params.bookingId.trim() : "";
    const newVehicleId = typeof req.body?.vehicleId === "string" ? req.body.vehicleId.trim() : "";
    const newStartDate = typeof req.body?.startDate === "string" ? req.body.startDate.trim() : "";
    const newEndDate = typeof req.body?.endDate === "string" ? req.body.endDate.trim() : "";

    if (!bookingId || !newVehicleId || !newStartDate || !newEndDate) {
      return res.status(400).json({ ok: false, error: "MISSING_FIELDS", message: "bookingId, vehicleId, startDate, endDate requis" });
    }
    if (newEndDate < newStartDate) {
      return res.status(400).json({ ok: false, error: "INVALID_RANGE", message: "endDate doit être >= startDate" });
    }

    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select("id, status, vehicle_id, start_date, end_date")
      .eq("id", bookingId)
      .maybeSingle();

    if (bErr || !booking) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Réservation introuvable" });
    }

    if (!DRAGGABLE_STATUSES.has(booking.status ?? "")) {
      return res.status(400).json({
        ok: false,
        error: "NOT_MOVABLE",
        message: `Impossible de déplacer une réservation au statut « ${booking.status} »`,
      });
    }

    // Vérifier conflits sur le véhicule cible (en excluant cette réservation)
    const { data: conflicts } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("vehicle_id", newVehicleId)
      .not("id", "eq", bookingId)
      .not("status", "in", `(cancelled,rejected,expired,completed,closed)`)
      .lte("start_date", newEndDate)
      .gte("end_date", newStartDate);

    if (conflicts && conflicts.length > 0) {
      return res.status(409).json({ ok: false, error: "VEHICLE_DATE_CONFLICT", message: "Le véhicule cible est déjà réservé sur cette période" });
    }

    const { error: updateErr } = await supabaseAdmin
      .from("bookings")
      .update({
        vehicle_id: newVehicleId,
        start_date: newStartDate,
        end_date: newEndDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateErr) {
      return res.status(500).json({ ok: false, error: "UPDATE_FAILED", message: updateErr.message });
    }

    return res.status(200).json({ ok: true, bookingId, vehicleId: newVehicleId, startDate: newStartDate, endDate: newEndDate });
  });

  // ============================================================================
  // EXTEND BOOKING — prolonger une location confirmée / en cours
  // ============================================================================
  const EXTENDABLE_STATUSES = new Set(["confirmed", "active"]);

  function computeBookingExtensionPricing(
    booking: {
      price_per_day: number;
      start_date: string;
      end_date: string;
      start_time: string | null;
      end_time: string | null;
      options_total: number;
      pricing_mode: string | null;
      base_price: number;
      subtotal: number;
    },
    newEndDate: string,
    newEndTime: string
  ) {
    const pricePerDay = Number(booking.price_per_day) || 0;
    const startTime = booking.start_time ?? "09:00";
    const oldEndTime = booking.end_time ?? "09:00";
    const startDt = combineLocalDateTime(booking.start_date, startTime);
    const oldEndDt = combineLocalDateTime(booking.end_date, oldEndTime);
    const newEndDt = combineLocalDateTime(newEndDate, newEndTime);

    const oldBase = computeBaseRentalPrice(pricePerDay, startDt, oldEndDt, startTime, oldEndTime);
    const newBase = computeBaseRentalPrice(pricePerDay, startDt, newEndDt, startTime, newEndTime);

    const optionsTotal = Number(booking.options_total) || 0;
    const oldSubtotal = oldBase.basePrice + optionsTotal;
    const newSubtotal = newBase.basePrice + optionsTotal;
    const deltaSubtotal = Math.round((newSubtotal - oldSubtotal) * 100) / 100;

    const isAdmin = booking.pricing_mode === "admin";
    const oldServiceFee = isAdmin ? 0 : calcServiceFeeRenter(oldSubtotal);
    const newServiceFee = isAdmin ? 0 : calcServiceFeeRenter(newSubtotal);
    const deltaServiceFee = Math.round((newServiceFee - oldServiceFee) * 100) / 100;

    const oldTTC = isAdmin ? oldSubtotal : calcRenterTotal(oldSubtotal);
    const newTTC = isAdmin ? newSubtotal : calcRenterTotal(newSubtotal);
    const deltaTTC = Math.round((newTTC - oldTTC) * 100) / 100;

    return {
      newBasePrice: newBase.basePrice,
      newRentalDays: newBase.rentalDays,
      newSubtotal,
      newServiceFee,
      newTotalTTC: newTTC,
      deltaSubtotal,
      deltaServiceFee,
      deltaTTC,
      rentalDaysAdded: Math.round((newBase.rentalDays - oldBase.rentalDays) * 100) / 100,
      isAdmin,
      newServiceFeeOwner: isAdmin ? 0 : calcServiceFeeOwner(newSubtotal),
      newPlatformFee: isAdmin ? 0 : calcPlatformTotalFee(newSubtotal),
      newOwnerPayout: isAdmin ? newSubtotal : calcOwnerPayout(newSubtotal),
    };
  }

  app.patch("/api/admin/bookings/:bookingId/extend", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const bookingId = typeof req.params.bookingId === "string" ? req.params.bookingId.trim() : "";
    const newEndDate = typeof req.body?.newEndDate === "string" ? req.body.newEndDate.trim() : "";
    const newEndTimeRaw = typeof req.body?.newEndTime === "string" ? req.body.newEndTime.trim() : "09:00";
    const newEndTime = newEndTimeRaw.length >= 5 ? newEndTimeRaw.slice(0, 5) : "09:00";
    const previewOnly = req.body?.preview === true;

    if (!bookingId || !newEndDate) {
      return res.status(400).json({ ok: false, error: "MISSING_FIELDS", message: "bookingId et newEndDate requis" });
    }
    if (!isValidYmd(newEndDate)) {
      return res.status(400).json({ ok: false, error: "INVALID_DATE", message: "newEndDate invalide (YYYY-MM-DD)" });
    }

    const { data: booking, error: bErr } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, status, vehicle_id, start_date, end_date, start_time, end_time, price_per_day, options_total, base_price, subtotal, total_price, pricing_mode, selected_options, reference_number, admin_notes, amount_total_paid"
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (bErr || !booking) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND", message: "Réservation introuvable" });
    }

    if (!EXTENDABLE_STATUSES.has(booking.status ?? "")) {
      return res.status(400).json({
        ok: false,
        error: "NOT_EXTENDABLE",
        message: `Prolongation impossible pour le statut « ${booking.status} » (confirmée ou en cours uniquement).`,
      });
    }

    const currentEndYmd = String(booking.end_date).split("T")[0];
    if (newEndDate <= currentEndYmd) {
      return res.status(400).json({
        ok: false,
        error: "INVALID_RANGE",
        message: "La nouvelle date de fin doit être postérieure à la fin actuelle.",
      });
    }

    const startYmd = String(booking.start_date).split("T")[0];
    const { data: conflicts } = await supabaseAdmin
      .from("bookings")
      .select("id, reference_number, start_date, end_date")
      .eq("vehicle_id", booking.vehicle_id)
      .not("id", "eq", bookingId)
      .not("status", "in", `(cancelled,rejected,expired,completed,closed,declined,terminated)`)
      .lte("start_date", newEndDate)
      .gte("end_date", startYmd);

    if (conflicts && conflicts.length > 0) {
      const ref = conflicts[0].reference_number;
      const refLabel = ref != null ? `AG #${ref}` : conflicts[0].id.slice(0, 8);
      return res.status(409).json({
        ok: false,
        error: "VEHICLE_DATE_CONFLICT",
        message: `Conflit avec une autre réservation (${refLabel}) sur cette période.`,
      });
    }

    const pricing = computeBookingExtensionPricing(booking, newEndDate, newEndTime);

    if (pricing.deltaTTC <= 0) {
      return res.status(400).json({
        ok: false,
        error: "NO_EXTENSION",
        message: "Aucun jour supplémentaire facturable pour ces dates.",
      });
    }

    if (previewOnly) {
      return res.status(200).json({
        ok: true,
        preview: true,
        previousEndDate: currentEndYmd,
        newEndDate,
        newEndTime,
        delta: {
          subtotal: pricing.deltaSubtotal,
          serviceFee: pricing.deltaServiceFee,
          totalTTC: pricing.deltaTTC,
          rentalDaysAdded: pricing.rentalDaysAdded,
        },
        newTotalTTC: pricing.newTotalTTC,
      });
    }

    const extensionPending: ExtensionPending = {
      deltaSubtotal: pricing.deltaSubtotal,
      deltaServiceFee: pricing.deltaServiceFee,
      deltaTotalTTC: pricing.deltaTTC,
      previousEndDate: currentEndYmd,
      extendedAt: nowIso(),
    };

    const updatePayload: Record<string, unknown> = {
      end_date: newEndDate,
      end_time: newEndTime,
      rental_days: pricing.newRentalDays,
      base_price: pricing.newBasePrice,
      subtotal: pricing.newSubtotal,
      total_price: pricing.newSubtotal,
      service_fee: pricing.newServiceFee,
      service_fee_renter: pricing.isAdmin ? 0 : pricing.newServiceFee,
      service_fee_owner: pricing.newServiceFeeOwner,
      platform_total_fee: pricing.newPlatformFee,
      owner_payout_amount: pricing.newOwnerPayout,
      selected_options: wrapSelectedOptionsWithExtension(booking.selected_options, extensionPending),
      admin_notes: [
        booking.admin_notes?.trim(),
        `[Prolongation ${nowIso().slice(0, 10)}] fin ${currentEndYmd} → ${newEndDate}, supplément ${pricing.deltaTTC.toFixed(2)} €`,
      ]
        .filter(Boolean)
        .join("\n"),
      updated_at: nowIso(),
    };

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("bookings")
      .update(updatePayload)
      .eq("id", bookingId)
      .select("*")
      .single();

    if (updateErr) {
      return res.status(500).json({ ok: false, error: "UPDATE_FAILED", message: updateErr.message });
    }

    return res.status(200).json({
      ok: true,
      booking: updated,
      previousEndDate: currentEndYmd,
      delta: {
        subtotal: pricing.deltaSubtotal,
        serviceFee: pricing.deltaServiceFee,
        totalTTC: pricing.deltaTTC,
        rentalDaysAdded: pricing.rentalDaysAdded,
      },
      newTotalTTC: pricing.newTotalTTC,
    });
  });

  // POST /api/admin/bookings/:bookingId/collect-extension
  app.post("/api/admin/bookings/:bookingId/collect-extension", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const bookingId = typeof req.params.bookingId === "string" ? req.params.bookingId.trim() : "";
    const paidAtRaw = req.body?.paidAt;
    const rawOpm = req.body?.offlinePaymentMethod;
    const offlinePaymentMethod = rawOpm === "cash" || rawOpm === "card_terminal" ? rawOpm : undefined;
    const paidCurrency = req.body?.paidCurrency === "MGA" ? "MGA" : "EUR";
    const paidAmountMga =
      paidCurrency === "MGA" && req.body?.paidAmountMga != null
        ? Number(req.body.paidAmountMga)
        : null;

    let paidAt: string;
    if (typeof paidAtRaw === "string" && paidAtRaw.trim()) {
      const d = new Date(paidAtRaw.trim());
      paidAt = Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } else {
      paidAt = new Date().toISOString();
    }

    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from("bookings")
      .select("id, pricing_mode, selected_options, amount_total_paid, admin_notes, subtotal")
      .eq("id", bookingId)
      .maybeSingle();

    if (fetchErr || !booking) return res.status(404).json({ ok: false, message: "Réservation introuvable" });
    if (booking.pricing_mode !== "admin") {
      return res.status(400).json({ ok: false, message: "Encaissement agence réservé aux réservations admin." });
    }

    const pending = getExtensionPending(booking.selected_options);
    if (!pending) {
      return res.status(400).json({ ok: false, message: "Aucun supplément de prolongation en attente." });
    }

    const prevPaid = Number(booking.amount_total_paid ?? 0) || 0;
    const newPaid = Math.round((prevPaid + pending.deltaTotalTTC) * 100) / 100;
    const mgaNote =
      paidCurrency === "MGA" && paidAmountMga != null && Number.isFinite(paidAmountMga) && paidAmountMga > 0
        ? ` — ${Math.round(paidAmountMga).toLocaleString("fr-FR")} Ar encaissés`
        : "";
    const noteLine = `[Supplément prolongation encaissé ${paidAt.slice(0, 10)}] ${pending.deltaTotalTTC.toFixed(2)} €${mgaNote}`;

    const updateFields: Record<string, unknown> = {
      amount_total_paid: newPaid,
      selected_options: clearExtensionPending(booking.selected_options),
      admin_notes: [booking.admin_notes?.trim(), noteLine].filter(Boolean).join("\n"),
      updated_at: nowIso(),
    };
    if (offlinePaymentMethod !== undefined) {
      updateFields.offline_payment_method = offlinePaymentMethod;
    }

    const { error: updErr } = await supabaseAdmin
      .from("bookings")
      .update(updateFields)
      .eq("id", bookingId);

    if (updErr) return res.status(500).json({ ok: false, message: updErr.message });
    return res.json({ ok: true, paidAt, amountCollected: pending.deltaTotalTTC, amountTotalPaid: newPaid });
  });

  // POST /api/admin/bookings/:bookingId/extend/pay — Stripe Checkout pour supplément web
  app.post("/api/admin/bookings/:bookingId/extend/pay", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const bookingId = typeof req.params.bookingId === "string" ? req.params.bookingId.trim() : "";
    const origin = typeof req.body?.returnOrigin === "string" ? req.body.returnOrigin.trim() : "";

    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from("bookings")
      .select("id, reference_number, pricing_mode, selected_options, user_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (fetchErr || !booking) return res.status(404).json({ ok: false, message: "Réservation introuvable" });
    if (booking.pricing_mode === "admin") {
      return res.status(400).json({ ok: false, message: "Paiement Stripe réservé aux réservations web." });
    }

    const pending = getExtensionPending(booking.selected_options);
    if (!pending) {
      return res.status(400).json({ ok: false, message: "Aucun supplément de prolongation en attente." });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, stripe_customer_id")
      .eq("id", booking.user_id)
      .maybeSingle();

    let stripe: Stripe;
    try {
      stripe = getStripe();
    } catch {
      return res.status(503).json({ ok: false, message: "Stripe non configuré." });
    }

    const refLabel = booking.reference_number != null ? `AG #${booking.reference_number}` : bookingId.slice(0, 8);
    const baseUrl = origin || process.env.FRONTEND_URL || "http://localhost:5173";
    const returnPath = `/admin/bookings/${encodeURIComponent(bookingId)}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: profile?.stripe_customer_id ?? undefined,
      customer_email: profile?.stripe_customer_id ? undefined : profile?.email ?? undefined,
      line_items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: Math.round(pending.deltaTotalTTC * 100),
            product_data: {
              name: `Prolongation location ${refLabel}`,
              description: `Supplément prolongation (${pending.deltaTotalTTC.toFixed(2)} € TTC)`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId,
        type: "extension",
      },
      success_url: `${baseUrl}${returnPath}?extension_paid=1`,
      cancel_url: `${baseUrl}${returnPath}?extension_canceled=1`,
    });

    return res.json({ ok: true, url: session.url });
  });

  // PATCH /api/admin/bookings/:bookingId/payment-method
  app.patch("/api/admin/bookings/:bookingId/payment-method", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const { bookingId } = req.params as { bookingId: string };
    const raw = req.body?.offlinePaymentMethod;
    const offlinePaymentMethod = raw === "cash" || raw === "card_terminal" ? raw : null;

    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ offline_payment_method: offlinePaymentMethod, updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    if (error) return res.status(500).json({ ok: false, message: error.message });
    return res.json({ ok: true });
  });

  // POST /api/admin/bookings/:bookingId/collect
  app.post("/api/admin/bookings/:bookingId/collect", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const { bookingId } = req.params as { bookingId: string };
    const paidAtRaw = req.body?.paidAt;
    const rawOpm = req.body?.offlinePaymentMethod;
    const offlinePaymentMethod = rawOpm === "cash" || rawOpm === "card_terminal" ? rawOpm : undefined;
    const paidCurrency = req.body?.paidCurrency === "MGA" ? "MGA" : "EUR";
    const paidAmountMga =
      paidCurrency === "MGA" && req.body?.paidAmountMga != null
        ? Number(req.body.paidAmountMga)
        : null;

    let paidAt: string;
    if (typeof paidAtRaw === "string" && paidAtRaw.trim()) {
      const d = new Date(paidAtRaw.trim());
      paidAt = Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
    } else {
      paidAt = new Date().toISOString();
    }

    const { data: booking, error: fetchErr } = await supabaseAdmin
      .from("bookings")
      .select("id, status, pricing_mode, admin_notes")
      .eq("id", bookingId)
      .maybeSingle();

    if (fetchErr || !booking) return res.status(404).json({ ok: false, message: "Réservation introuvable" });

    const COLLECTABLE = new Set(["pending", "pending_payment", "accepted"]);
    if (!COLLECTABLE.has(booking.status ?? "")) {
      return res.status(400).json({ ok: false, message: `Statut "${booking.status}" : encaissement impossible` });
    }

    const updatePayload: Record<string, unknown> = {
      status: "confirmed",
      paid_at: paidAt,
      updated_at: new Date().toISOString(),
    };
    if (offlinePaymentMethod !== undefined) updatePayload.offline_payment_method = offlinePaymentMethod;

    if (paidCurrency === "MGA" && paidAmountMga != null && Number.isFinite(paidAmountMga) && paidAmountMga > 0) {
      const noteLine = `[Encaissement ${paidAt.slice(0, 10)}] ${Math.round(paidAmountMga).toLocaleString("fr-FR")} Ar (espèces)`;
      updatePayload.admin_notes = [booking.admin_notes?.trim(), noteLine].filter(Boolean).join("\n");
    }

    const { error: updErr } = await supabaseAdmin
      .from("bookings")
      .update(updatePayload)
      .eq("id", bookingId);

    if (updErr) return res.status(500).json({ ok: false, message: updErr.message });
    return res.json({ ok: true, paidAt, status: "confirmed" });
  });

  // GET /api/admin/revenue
  app.get("/api/admin/revenue", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const dateFrom = typeof req.query?.date_from === "string" ? req.query.date_from.trim() : "";
    const dateTo = typeof req.query?.date_to === "string" ? req.query.date_to.trim() : "";

    let query = supabaseAdmin
      .from("bookings")
      .select(`
        id, reference_number, status, total_price, paid_at, offline_payment_method,
        stripe_payment_intent_id, start_date, end_date,
        user_id
      `)
      .not("paid_at", "is", null)
      .order("paid_at", { ascending: false });

    if (dateFrom) query = query.gte("paid_at", `${dateFrom}T00:00:00.000Z`);
    if (dateTo) query = query.lte("paid_at", `${dateTo}T23:59:59.999Z`);

    const { data: rows, error } = await query;
    if (error) return res.status(500).json({ ok: false, message: error.message });

    const bookings = rows ?? [];
    let totalCash = 0;
    let totalCardTerminal = 0;
    let totalStripe = 0;
    let totalOther = 0;

    for (const b of bookings) {
      const amount = typeof b.total_price === "number" ? b.total_price : parseFloat(String(b.total_price)) || 0;
      if (b.offline_payment_method === "cash") totalCash += amount;
      else if (b.offline_payment_method === "card_terminal") totalCardTerminal += amount;
      else if (b.stripe_payment_intent_id) totalStripe += amount;
      else totalOther += amount;
    }

    const total = totalCash + totalCardTerminal + totalStripe + totalOther;
    return res.json({ ok: true, bookings, summary: { total, totalCash, totalCardTerminal, totalStripe, totalOther } });
  });

  // ===========================================================================
  // Pricing config admin (frais de service / options / caution par catégorie)
  // ===========================================================================
  const PRICING_VEHICLE_TYPES = ["car", "moto", "scooter", "quad", "accommodation"] as const;
  const PRICING_PAYMENT_METHODS = ["card_online", "cash_on_site"] as const;

  // GET /api/admin/settings/pricing — état complet (frais, options, caution)
  app.get("/api/admin/settings/pricing", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const [feesRes, optionsRes, categoriesRes, depositRes] = await Promise.all([
      supabaseAdmin.from("service_fee_rules").select("*"),
      supabaseAdmin.from("booking_options").select("*").order("name"),
      supabaseAdmin.from("booking_option_categories").select("*"),
      supabaseAdmin.from("deposit_category_rules").select("*"),
    ]);

    if (feesRes.error) return res.status(500).json({ ok: false, message: feesRes.error.message });
    if (optionsRes.error) return res.status(500).json({ ok: false, message: optionsRes.error.message });
    if (categoriesRes.error) return res.status(500).json({ ok: false, message: categoriesRes.error.message });
    if (depositRes.error) return res.status(500).json({ ok: false, message: depositRes.error.message });

    const optionsWithCategories = (optionsRes.data ?? []).map((opt) => ({
      ...opt,
      categories: (categoriesRes.data ?? [])
        .filter((c) => c.option_id === opt.id)
        .map((c) => c.vehicle_type),
    }));

    return res.json({
      ok: true,
      vehicleTypes: PRICING_VEHICLE_TYPES,
      paymentMethods: PRICING_PAYMENT_METHODS,
      feeRules: feesRes.data ?? [],
      options: optionsWithCategories,
      depositRules: depositRes.data ?? [],
    });
  });

  // PUT /api/admin/settings/pricing/fees — body: { rules: [{vehicleType, paymentMethod, feePercent}] }
  app.put("/api/admin/settings/pricing/fees", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const rules = Array.isArray(req.body?.rules) ? req.body.rules : [];
    for (const r of rules) {
      if (!PRICING_VEHICLE_TYPES.includes(r?.vehicleType)) {
        return res.status(400).json({ ok: false, message: `Catégorie invalide: ${r?.vehicleType}` });
      }
      if (!PRICING_PAYMENT_METHODS.includes(r?.paymentMethod)) {
        return res.status(400).json({ ok: false, message: `Mode de paiement invalide: ${r?.paymentMethod}` });
      }
      const pct = Number(r?.feePercent);
      if (!Number.isFinite(pct) || pct < 0 || pct > 1) {
        return res.status(400).json({ ok: false, message: `Pourcentage invalide pour ${r.vehicleType}/${r.paymentMethod} (0 à 1 attendu)` });
      }
    }

    const upserts = rules.map((r: any) => ({
      vehicle_type: r.vehicleType,
      payment_method: r.paymentMethod,
      fee_percent: Number(r.feePercent),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin
      .from("service_fee_rules")
      .upsert(upserts, { onConflict: "vehicle_type,payment_method" });

    if (error) return res.status(500).json({ ok: false, message: error.message });
    return res.json({ ok: true });
  });

  // PUT /api/admin/settings/pricing/deposit — body: { rules: [{vehicleType, depositEnabled}] }
  app.put("/api/admin/settings/pricing/deposit", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const rules = Array.isArray(req.body?.rules) ? req.body.rules : [];
    for (const r of rules) {
      if (!PRICING_VEHICLE_TYPES.includes(r?.vehicleType)) {
        return res.status(400).json({ ok: false, message: `Catégorie invalide: ${r?.vehicleType}` });
      }
      if (typeof r?.depositEnabled !== "boolean") {
        return res.status(400).json({ ok: false, message: `depositEnabled doit être un booléen pour ${r?.vehicleType}` });
      }
    }

    const upserts = rules.map((r: any) => ({
      vehicle_type: r.vehicleType,
      deposit_enabled: r.depositEnabled,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin
      .from("deposit_category_rules")
      .upsert(upserts, { onConflict: "vehicle_type" });

    if (error) return res.status(500).json({ ok: false, message: error.message });
    return res.json({ ok: true });
  });

  // POST /api/admin/settings/pricing/options — créer une option
  app.post("/api/admin/settings/pricing/options", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const optionKey = typeof req.body?.optionKey === "string" ? req.body.optionKey.trim() : "";
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const description = typeof req.body?.description === "string" ? req.body.description.trim() : null;
    const priceMga = Number(req.body?.priceMga);
    const pricingMode = req.body?.pricingMode === "per_day" ? "per_day" : "flat";
    const active = req.body?.active !== false;
    const categories: string[] = Array.isArray(req.body?.categories) ? req.body.categories : [];

    if (!optionKey || !/^[a-z0-9-]+$/.test(optionKey)) {
      return res.status(400).json({ ok: false, message: "optionKey requis (lettres minuscules, chiffres, tirets uniquement)" });
    }
    if (!name) {
      return res.status(400).json({ ok: false, message: "name requis" });
    }
    if (!Number.isFinite(priceMga) || priceMga < 0) {
      return res.status(400).json({ ok: false, message: "priceMga invalide" });
    }
    for (const c of categories) {
      if (!PRICING_VEHICLE_TYPES.includes(c as any)) {
        return res.status(400).json({ ok: false, message: `Catégorie invalide: ${c}` });
      }
    }

    const { data: option, error } = await supabaseAdmin
      .from("booking_options")
      .insert({
        option_key: optionKey,
        name,
        description,
        price_mga: priceMga,
        pricing_mode: pricingMode,
        active,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ ok: false, message: error.message });

    if (categories.length > 0) {
      const { error: catError } = await supabaseAdmin
        .from("booking_option_categories")
        .insert(categories.map((vehicleType) => ({ option_id: option.id, vehicle_type: vehicleType })));
      if (catError) return res.status(500).json({ ok: false, message: catError.message });
    }

    return res.json({ ok: true, option: { ...option, categories } });
  });

  // PUT /api/admin/settings/pricing/options/:id — modifier une option (prix, statut, catégories)
  app.put("/api/admin/settings/pricing/options/:id", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const { id } = req.params;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (typeof req.body?.name === "string") updates.name = req.body.name.trim();
    if (typeof req.body?.description === "string") updates.description = req.body.description.trim();
    if (req.body?.priceMga !== undefined) {
      const priceMga = Number(req.body.priceMga);
      if (!Number.isFinite(priceMga) || priceMga < 0) {
        return res.status(400).json({ ok: false, message: "priceMga invalide" });
      }
      updates.price_mga = priceMga;
    }
    if (req.body?.pricingMode === "flat" || req.body?.pricingMode === "per_day") {
      updates.pricing_mode = req.body.pricingMode;
    }
    if (typeof req.body?.active === "boolean") updates.active = req.body.active;

    const { error } = await supabaseAdmin.from("booking_options").update(updates).eq("id", id);
    if (error) return res.status(500).json({ ok: false, message: error.message });

    if (Array.isArray(req.body?.categories)) {
      const categories: string[] = req.body.categories;
      for (const c of categories) {
        if (!PRICING_VEHICLE_TYPES.includes(c as any)) {
          return res.status(400).json({ ok: false, message: `Catégorie invalide: ${c}` });
        }
      }
      const { error: delError } = await supabaseAdmin.from("booking_option_categories").delete().eq("option_id", id);
      if (delError) return res.status(500).json({ ok: false, message: delError.message });
      if (categories.length > 0) {
        const { error: insError } = await supabaseAdmin
          .from("booking_option_categories")
          .insert(categories.map((vehicleType) => ({ option_id: id, vehicle_type: vehicleType })));
        if (insError) return res.status(500).json({ ok: false, message: insError.message });
      }
    }

    return res.json({ ok: true });
  });

  // DELETE /api/admin/settings/pricing/options/:id
  app.delete("/api/admin/settings/pricing/options/:id", async (req: Request, res: Response) => {
    const gate = await requireAdmin(req, supabaseAdmin);
    if (gate.ok === false) return res.status(gate.status).json(gate.body);

    const { id } = req.params;
    const { error } = await supabaseAdmin.from("booking_options").delete().eq("id", id);
    if (error) return res.status(500).json({ ok: false, message: error.message });
    return res.json({ ok: true });
  });

  // GET /api/public/booking-options?vehicleType=quad — options actives pour une catégorie (client)
  app.get("/api/public/booking-options", async (req: Request, res: Response) => {
    const vehicleType = typeof req.query.vehicleType === "string" ? req.query.vehicleType : null;

    let query = supabaseAdmin.from("booking_options").select("*, booking_option_categories(vehicle_type)").eq("active", true);
    const { data, error } = await query;
    if (error) return res.status(500).json({ ok: false, message: error.message });

    const options = (data ?? [])
      .filter((opt: any) => {
        if (!vehicleType) return true;
        const cats = (opt.booking_option_categories ?? []).map((c: any) => c.vehicle_type);
        return cats.includes(vehicleType);
      })
      .map((opt: any) => ({
        id: opt.option_key,
        name: opt.name,
        description: opt.description,
        priceMga: Number(opt.price_mga),
        pricingMode: opt.pricing_mode,
      }));

    return res.json({ ok: true, options });
  });
}
