import type { Express, Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "../lib/adminAuth";
import { computeBaseRentalPrice } from "@/utils/rentalPriceFromDates";

/** Identifiant de build côté admin booking — doit apparaître dans les logs et l’en-tête HTTP si ce code est exécuté. */
const ADMIN_BOOKING_CREATE_BUILD_ID = "agency-v2-20260327";

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

export function registerAdminRoutes(app: Express, supabaseAdmin: SupabaseClient) {
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
      if (inner.length < 2) {
        return res.status(400).json({ ok: false, error: "QUERY_TOO_SHORT", message: "Saisir au moins 2 caractères" });
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
      };
      const sel = "id, email, first_name, last_name, phone, role";
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
      .select("id, price_per_day, price_per_day_agency, available, brand, model")
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

    res.setHeader("X-Rentanoo-Admin-Booking-Build", ADMIN_BOOKING_CREATE_BUILD_ID);
    return res.status(201).json({
      ok: true,
      booking: {
        id: inserted.id,
        status: inserted.status,
        createdAt: inserted.created_at,
      },
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
}
