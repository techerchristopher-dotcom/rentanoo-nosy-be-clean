import type { Express, Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { requireAdmin } from "../lib/adminAuth";
import { getStripe } from "../lib/stripe";
import { computeBaseRentalPrice } from "@/utils/rentalPriceFromDates";

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

export function registerAdminRoutes(app: Express, supabaseAdmin: SupabaseClient) {
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

    type PlanningVehicleRow = {
      id: string;
      brand: string;
      model: string;
      available: boolean | null;
      vehicle_type: "car" | "moto" | "scooter" | null;
      vehicle_category: string | null;
    };

    let vq = supabaseAdmin
      .from("vehicles")
      .select("id, brand, model, available, vehicle_type, vehicle_category");

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
    const vRows = vRowsRaw.map((v) => ({ ...v, status: null as null }));
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
    };

    const cancelLike = '("cancelled","declined","rejected","terminated")';

    let bq = supabaseAdmin
      .from("bookings")
      .select("id, vehicle_id, user_id, start_date, end_date, start_time, end_time, status, pricing_mode, reference_number, pickup_location")
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
    const optionsTotal = 0;
    const subtotal = basePrice + optionsTotal;
    const serviceFee = 0;
    const totalPrice = subtotal;

    const insertPayload = {
      user_id: renterUserId,
      vehicle_id: vehicleId,
      start_date: startYmd,
      end_date: endYmd,
      total_price: totalPrice,
      status: "pending" as const,
      start_time: startTime.length >= 5 ? startTime : null,
      end_time: endTime.length >= 5 ? endTime : null,
      pickup_location: pickupLocation,
      selected_options: null as null,
      base_price: basePrice,
      options_total: optionsTotal,
      service_fee: serviceFee,
      subtotal,
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
    const optionsTotal = 0;
    const subtotal = basePrice + optionsTotal;
    const serviceFee = 0;
    const totalPrice = subtotal;

    const insertPayload = {
      user_id: renterUserId,
      vehicle_id: vehicleId,
      start_date: startYmd,
      end_date: endYmd,
      total_price: totalPrice,
      status: "pending" as const,
      start_time: startTime.length >= 5 ? startTime : null,
      end_time: endTime.length >= 5 ? endTime : null,
      pickup_location: pickupLocation,
      selected_options: null as null,
      base_price: basePrice,
      options_total: optionsTotal,
      service_fee: serviceFee,
      subtotal,
      price_per_day: agencyPricePerDay,
      rental_days: rentalDays,
      pricing_mode: "admin" as const,
      updated_at: new Date().toISOString(),
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
}
