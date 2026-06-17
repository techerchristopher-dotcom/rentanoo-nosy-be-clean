import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type AdminClientRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string | null;
};

/** Véhicule réduit renvoyé avec le détail réservation admin (champs retournés par l’API) */
export type AdminBookingVehicleSnippet = {
  id: string;
  brand: string;
  model: string;
  price_per_day: number;
  /** Présent dès que l’API inclut la colonne dans le `select` */
  price_per_day_agency?: number | null;
};

export type AdminBookingRenterSnippet = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
};

/**
 * Base URL du backend Express pour **tout** l’espace admin (`/api/admin/*`).
 *
 * - **Production** : définir `VITE_API_URL` sur l’**origine** du service Express, sans `/api` à la fin
 *   (ex. `https://rentanoo-api.up.railway.app`). Si vous mettez par erreur `.../api`, elle est corrigée
 *   automatiquement. Rebuild obligatoire après changement.
 * - **Développement** : laisser vide pour utiliser `/api/...` + proxy Vite → `localhost:3000`.
 */
let warnedMissingViteApiUrl = false;

/**
 * Base sans slash final. Si l’URL se termine par `/api`, on l’enlève : les chemins passés ici
 * commencent déjà par `/api/...` — sinon on obtient `/api/api/admin/...` → 404 sur tout l’admin.
 */
function normalizeAdminApiBase(raw: string): string {
  let s = raw.trim().replace(/\/+$/, "");
  if (!s) return "";
  if (s.endsWith("/api")) {
    s = s.slice(0, -4).replace(/\/+$/, "");
  }
  return s;
}

function resolveAdminApiUrl(path: string): string {
  const base = normalizeAdminApiBase(import.meta.env.VITE_API_URL ?? "");
  const p = path.startsWith("/") ? path : `/${path}`;

  if (import.meta.env.PROD && !base && !warnedMissingViteApiUrl) {
    warnedMissingViteApiUrl = true;
    console.warn(
      "[adminApi] VITE_API_URL n’est pas défini : POST/GET /api/admin/* partent sur l’origine actuelle du site. Pour forcer le bon Express, définissez VITE_API_URL dans le build front et redéployez."
    );
  }

  return base ? `${base}${p}` : p;
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Session expirée : reconnectez-vous.");
  }

  const url = resolveAdminApiUrl(path);
  if (import.meta.env.DEV) {
    console.debug("[adminApi] fetch", init?.method ?? "GET", url);
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(init?.headers ?? {}),
    },
  });

  const json = (await res.json().catch(() => ({}))) as T & {
    ok?: boolean;
    error?: string;
    message?: string;
    diagnostic?: { code?: string; details?: string; hint?: string; runId?: string };
  };

  if (!res.ok) {
    const msg =
      typeof json?.message === "string"
        ? json.message
        : typeof json?.error === "string"
          ? json.error
          : `Erreur ${res.status}`;
    const diag = json?.diagnostic;
    const suffix =
      diag && import.meta.env.DEV ? ` | diagnostic: ${JSON.stringify(diag)}` : "";
    throw new Error(`${msg}${suffix}`);
  }

  const out = json as T & { debug_handler?: string };
  if (out && typeof out === "object" && "debug_handler" in out) {
    console.info("[adminApi] Preuve runtime handler admin booking:", {
      requestUrl: url,
      responseHeaderBuild: res.headers.get("X-Rentanoo-Admin-Booking-Build"),
      responseHeaderHandler: res.headers.get("X-Rentanoo-Admin-Booking-Handler"),
      debug_handler: (out as { debug_handler?: string }).debug_handler,
      debug_build: (out as { debug_build?: string }).debug_build,
    });
  }

  return out as T;
}

export async function adminSearchClients(q: string, limit = 20): Promise<AdminClientRow[]> {
  const data = await adminFetch<{ ok: boolean; clients: AdminClientRow[] }>("/api/admin/clients/search", {
    method: "POST",
    body: JSON.stringify({ q, limit }),
  });
  return data.clients ?? [];
}

export async function adminCreateWalkInClient(payload: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
}): Promise<AdminClientRow> {
  const data = await adminFetch<{ ok: boolean; client: AdminClientRow }>("/api/admin/clients/walk-in", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.client;
}

/** Met à jour le téléphone d’un locataire (service role côté serveur). POST comme les autres routes admin. */
export async function adminUpdateRenterPhone(userId: string, phone: string): Promise<AdminClientRow> {
  const data = await adminFetch<{ ok: boolean; client: AdminClientRow }>("/api/admin/clients/update-phone", {
    method: "POST",
    body: JSON.stringify({ userId, phone }),
  });
  return data.client;
}

export async function adminCreateBooking(payload: {
  renterUserId: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  pickupLocation?: string;
  hotelName?: string;
  adminNotes?: string;
  offlinePaymentMethod?: "cash" | "card_terminal" | null;
  selectedOptions?: Array<{
    id?: string;
    name: string;
    pricePerDay?: number;
    totalPrice?: number;
  }>;
}): Promise<{ id: string; status: string | null; createdAt: string | null }> {
  const data = await adminFetch<{
    ok: boolean;
    booking: { id: string; status: string | null; createdAt: string | null };
  }>("/api/admin/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.booking;
}

export async function adminGetBooking(bookingId: string): Promise<{
  booking: Tables<"bookings">;
  vehicle: AdminBookingVehicleSnippet | null;
  renter: AdminBookingRenterSnippet | null;
}> {
  const data = await adminFetch<{
    booking: Tables<"bookings">;
    vehicle: AdminBookingVehicleSnippet | null;
    renter: AdminBookingRenterSnippet | null;
  }>(`/api/admin/bookings/${encodeURIComponent(bookingId)}`);
  return { booking: data.booking, vehicle: data.vehicle, renter: data.renter };
}

/** Annulation logique V1 agence : `status` → `cancelled` (pas de DELETE). */
export async function adminCancelBooking(bookingId: string): Promise<{
  id: string;
  status: string | null;
  updatedAt: string | null;
}> {
  const data = await adminFetch<{
    ok: boolean;
    booking: { id: string; status: string | null; updatedAt: string | null };
  }>(`/api/admin/bookings/${encodeURIComponent(bookingId)}/cancel`, {
    method: "POST",
  });
  return data.booking;
}

export type AdminBookingListRenter = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

export type AdminBookingListVehicle = {
  id: string;
  brand: string;
  model: string;
};

export type AdminBookingListRow = {
  id: string;
  reference_number: number | null;
  status: string | null;
  pricing_mode: string | null;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  deposit_status: string | null;
  deposit_amount_snapshot: number | null;
  rental_contract_signed_at: string | null;
  rental_contract_pdf_url: string | null;
  user_id: string;
  vehicle_id: string;
  paid_at: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  created_at: string | null;
  renter: AdminBookingListRenter | null;
  vehicle: AdminBookingListVehicle | null;
  edl_depart_done: boolean;
  edl_return_done: boolean;
};

export type AdminBookingListResult = {
  bookings: AdminBookingListRow[];
  total: number;
  limit: number;
  offset: number;
};

export async function adminListBookings(params: {
  limit?: number;
  offset?: number;
  status?: string;
  pricing_mode?: "web" | "admin" | "";
  include_cancelled?: boolean;
  search?: string;
  date_from?: string;
  date_to?: string;
}): Promise<AdminBookingListResult> {
  const sp = new URLSearchParams();
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.offset != null) sp.set("offset", String(params.offset));
  if (params.status?.trim()) sp.set("status", params.status.trim());
  if (params.pricing_mode === "web" || params.pricing_mode === "admin") sp.set("pricing_mode", params.pricing_mode);
  if (params.include_cancelled) sp.set("include_cancelled", "1");
  if (params.search?.trim()) sp.set("search", params.search.trim());
  if (params.date_from?.trim()) sp.set("date_from", params.date_from.trim());
  if (params.date_to?.trim()) sp.set("date_to", params.date_to.trim());

  const data = await adminFetch<{
    ok?: boolean;
    bookings: AdminBookingListRow[];
    total: number;
    limit: number;
    offset: number;
  }>(`/api/admin/bookings?${sp.toString()}`);

  return {
    bookings: data.bookings ?? [],
    total: typeof data.total === "number" ? data.total : 0,
    limit: typeof data.limit === "number" ? data.limit : params.limit ?? 50,
    offset: typeof data.offset === "number" ? data.offset : params.offset ?? 0,
  };
}

export type AdminBookingClaimChargeStatus = "pending" | "succeeded" | "failed" | "canceled";

export type AdminBookingClaimCharge = {
  id: string;
  booking_id: string;
  amount_cents: number;
  currency: string;
  reason: string;
  status: AdminBookingClaimChargeStatus;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_by_profile_id: string;
  created_at: string;
  updated_at: string;
  receipt_url: string | null;
  metadata: Record<string, unknown> | null;
};

export type AdminBookingClaimChargesSummary = {
  totalSucceededCents: number;
};

export async function adminListBookingClaimCharges(bookingId: string): Promise<{
  charges: AdminBookingClaimCharge[];
  summary: AdminBookingClaimChargesSummary;
}> {
  const data = await adminFetch<{
    ok: boolean;
    charges: AdminBookingClaimCharge[];
    summary: { totalSucceededCents: number };
  }>(`/api/admin/bookings/${encodeURIComponent(bookingId)}/claim-charges`);
  return {
    charges: data.charges ?? [],
    summary: { totalSucceededCents: typeof data.summary?.totalSucceededCents === "number" ? data.summary.totalSucceededCents : 0 },
  };
}

export async function adminCreateClaimCharge(
  bookingId: string,
  payload: { amountEuros: number; reason: string }
): Promise<{
  charge?: AdminBookingClaimCharge;
  pending?: boolean;
  stripePaymentIntentId?: string;
  chargeId?: string;
  message?: string;
}> {
  const data = await adminFetch<{
    ok: boolean;
    charge?: AdminBookingClaimCharge;
    pending?: boolean;
    stripePaymentIntentId?: string;
    chargeId?: string;
    message?: string;
  }>(`/api/admin/bookings/${encodeURIComponent(bookingId)}/claim-charge`, {
    method: "POST",
    body: JSON.stringify({ amountEuros: payload.amountEuros, reason: payload.reason }),
  });
  return {
    charge: data.charge,
    pending: data.pending === true,
    stripePaymentIntentId: data.stripePaymentIntentId,
    chargeId: data.chargeId,
    message: data.message,
  };
}

export async function adminMoveBooking(
  bookingId: string,
  payload: { vehicleId: string; startDate: string; endDate: string }
): Promise<void> {
  await adminFetch<{ ok: boolean }>(`/api/admin/bookings/${encodeURIComponent(bookingId)}/move`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateOfflinePaymentMethod(
  bookingId: string,
  offlinePaymentMethod: "cash" | "card_terminal" | null
): Promise<void> {
  await adminFetch<{ ok: boolean }>(`/api/admin/bookings/${encodeURIComponent(bookingId)}/payment-method`, {
    method: "PATCH",
    body: JSON.stringify({ offlinePaymentMethod }),
  });
}

export async function adminCollectPayment(
  bookingId: string,
  payload: {
    paidAt: string;
    offlinePaymentMethod?: "cash" | "card_terminal";
    paidCurrency?: "EUR" | "MGA";
    paidAmountMga?: number;
  }
): Promise<{ paidAt: string; status: string }> {
  const data = await adminFetch<{ ok: boolean; paidAt: string; status: string }>(
    `/api/admin/bookings/${encodeURIComponent(bookingId)}/collect`,
    { method: "POST", body: JSON.stringify(payload) }
  );
  return { paidAt: data.paidAt, status: data.status };
}

export type AdminExtendDelta = {
  subtotal: number;
  serviceFee: number;
  totalTTC: number;
  rentalDaysAdded: number;
};

export type AdminExtendResult = {
  ok: boolean;
  preview?: boolean;
  previousEndDate: string;
  newEndDate?: string;
  newEndTime?: string;
  delta: AdminExtendDelta;
  newTotalTTC: number;
  booking?: Tables<"bookings">;
};

export async function adminPreviewExtendBooking(
  bookingId: string,
  payload: { newEndDate: string; newEndTime?: string; preview?: boolean }
): Promise<AdminExtendResult> {
  return adminFetch<AdminExtendResult>(`/api/admin/bookings/${encodeURIComponent(bookingId)}/extend`, {
    method: "PATCH",
    body: JSON.stringify({ ...payload, preview: true }),
  });
}

export async function adminExtendBooking(
  bookingId: string,
  payload: { newEndDate: string; newEndTime?: string }
): Promise<AdminExtendResult> {
  return adminFetch<AdminExtendResult>(`/api/admin/bookings/${encodeURIComponent(bookingId)}/extend`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function adminCollectExtensionPayment(
  bookingId: string,
  payload: {
    paidAt: string;
    offlinePaymentMethod?: "cash" | "card_terminal";
    paidCurrency?: "EUR" | "MGA";
    paidAmountMga?: number;
  }
): Promise<{ amountCollected: number; amountTotalPaid: number }> {
  const data = await adminFetch<{
    ok: boolean;
    amountCollected: number;
    amountTotalPaid: number;
  }>(`/api/admin/bookings/${encodeURIComponent(bookingId)}/collect-extension`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return { amountCollected: data.amountCollected, amountTotalPaid: data.amountTotalPaid };
}

export async function adminPayExtensionStripe(bookingId: string): Promise<{ url: string }> {
  const data = await adminFetch<{ ok: boolean; url: string }>(
    `/api/admin/bookings/${encodeURIComponent(bookingId)}/extend/pay`,
    {
      method: "POST",
      body: JSON.stringify({ returnOrigin: window.location.origin }),
    }
  );
  if (!data.url) throw new Error("URL Stripe manquante");
  return { url: data.url };
}

export type AdminRevenueBooking = {
  id: string;
  reference_number: number | null;
  status: string | null;
  total_price: number;
  paid_at: string;
  offline_payment_method: string | null;
  stripe_payment_intent_id: string | null;
  start_date: string;
  end_date: string;
  user_id: string;
};

export type AdminRevenueSummary = {
  total: number;
  totalCash: number;
  totalCardTerminal: number;
  totalStripe: number;
  totalOther: number;
};

export async function adminGetRevenue(params: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ bookings: AdminRevenueBooking[]; summary: AdminRevenueSummary }> {
  const sp = new URLSearchParams();
  if (params.dateFrom) sp.set("date_from", params.dateFrom);
  if (params.dateTo) sp.set("date_to", params.dateTo);
  const data = await adminFetch<{
    ok: boolean;
    bookings: AdminRevenueBooking[];
    summary: AdminRevenueSummary;
  }>(`/api/admin/revenue?${sp.toString()}`);
  return { bookings: data.bookings ?? [], summary: data.summary };
}

export type EurMgaExchangeRate = {
  mode: "manual" | "live";
  rate: number;
  effectiveFrom: string;
  liveProvider: "frankfurter" | null;
  lastLiveRate: number | null;
  lastFetchedAt: string | null;
};

function mapExchangeRateResponse(data: {
  mode?: string;
  rate: number;
  effectiveFrom: string;
  liveProvider?: string | null;
  lastLiveRate?: number | null;
  lastFetchedAt?: string | null;
}): EurMgaExchangeRate {
  return {
    mode: data.mode === "live" ? "live" : "manual",
    rate: data.rate,
    effectiveFrom: data.effectiveFrom,
    liveProvider: data.liveProvider === "frankfurter" ? "frankfurter" : null,
    lastLiveRate: data.lastLiveRate ?? null,
    lastFetchedAt: data.lastFetchedAt ?? null,
  };
}

export async function adminGetExchangeRate(): Promise<EurMgaExchangeRate> {
  const data = await adminFetch<{
    ok: boolean;
    mode?: string;
    rate: number;
    effectiveFrom: string;
    liveProvider?: string | null;
    lastLiveRate?: number | null;
    lastFetchedAt?: string | null;
  }>("/api/admin/settings/exchange-rate");
  return mapExchangeRateResponse(data);
}

export async function adminUpdateExchangeRate(payload: {
  mode: "manual" | "live";
  rate?: number;
  effectiveFrom?: string;
}): Promise<EurMgaExchangeRate> {
  const data = await adminFetch<{
    ok: boolean;
    mode?: string;
    rate: number;
    effectiveFrom: string;
    liveProvider?: string | null;
    lastLiveRate?: number | null;
    lastFetchedAt?: string | null;
  }>("/api/admin/settings/exchange-rate", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapExchangeRateResponse(data);
}

export async function adminRefreshExchangeRate(): Promise<EurMgaExchangeRate> {
  const data = await adminFetch<{
    ok: boolean;
    mode?: string;
    rate: number;
    effectiveFrom: string;
    liveProvider?: string | null;
    lastLiveRate?: number | null;
    lastFetchedAt?: string | null;
  }>("/api/admin/settings/exchange-rate/refresh", { method: "POST" });
  return mapExchangeRateResponse(data);
}

export type WhatsAppContactAdmin = {
  phoneE164: string;
  phoneDisplay: string;
  profilePhotoUrl: string | null;
};

function mapWhatsAppContactResponse(data: {
  phoneE164?: string;
  phoneDisplay?: string;
  profilePhotoUrl?: string | null;
}): WhatsAppContactAdmin {
  return {
    phoneE164: data.phoneE164 ?? "",
    phoneDisplay: data.phoneDisplay ?? "",
    profilePhotoUrl: data.profilePhotoUrl ?? null,
  };
}

export async function adminGetWhatsAppContact(): Promise<WhatsAppContactAdmin> {
  const data = await adminFetch<{
    ok: boolean;
    phoneE164: string;
    phoneDisplay: string;
    profilePhotoUrl: string | null;
  }>("/api/admin/settings/whatsapp-contact");
  return mapWhatsAppContactResponse(data);
}

export async function adminUpdateWhatsAppPhone(phone: string): Promise<WhatsAppContactAdmin> {
  const data = await adminFetch<{
    ok: boolean;
    phoneE164: string;
    phoneDisplay: string;
    profilePhotoUrl: string | null;
  }>("/api/admin/settings/whatsapp-contact", {
    method: "PATCH",
    body: JSON.stringify({ phone }),
  });
  return mapWhatsAppContactResponse(data);
}

export async function adminRemoveWhatsAppPhoto(): Promise<WhatsAppContactAdmin> {
  const data = await adminFetch<{
    ok: boolean;
    phoneE164: string;
    phoneDisplay: string;
    profilePhotoUrl: string | null;
  }>("/api/admin/settings/whatsapp-contact", {
    method: "PATCH",
    body: JSON.stringify({ removePhoto: true }),
  });
  return mapWhatsAppContactResponse(data);
}

export async function adminUploadWhatsAppPhoto(file: File): Promise<WhatsAppContactAdmin> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Session expirée : reconnectez-vous.");
  }

  const form = new FormData();
  form.append("photo", file);

  const url = resolveAdminApiUrl("/api/admin/settings/whatsapp-contact/photo");
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: form,
  });

  const json = (await res.json().catch(() => ({}))) as WhatsAppContactAdmin & {
    ok?: boolean;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(typeof json.message === "string" ? json.message : `Erreur ${res.status}`);
  }

  return mapWhatsAppContactResponse(json);
}

export type SiteAnalyticsSummary = {
  days: number;
  totals: {
    whatsapp_fab_click: number;
    whatsapp_bubble_shown: number;
    whatsapp_fab_drag: number;
    page_view: number;
  };
  conversionRate: number | null;
  bubbleTriggers: Array<{ trigger: string; count: number }>;
  topClickPages: Array<{ pagePath: string; count: number }>;
  daily: Array<{ date: string; clicks: number; bubbles: number }>;
  firstEventAt: string | null;
  lastEventAt: string | null;
};

export async function adminGetSiteAnalytics(days = 30): Promise<SiteAnalyticsSummary> {
  const data = await adminFetch<SiteAnalyticsSummary & { ok: boolean }>(
    `/api/admin/analytics/site?days=${days}`
  );
  return {
    days: data.days,
    totals: data.totals,
    conversionRate: data.conversionRate,
    bubbleTriggers: data.bubbleTriggers,
    topClickPages: data.topClickPages,
    daily: data.daily,
    firstEventAt: data.firstEventAt,
    lastEventAt: data.lastEventAt,
  };
}

export type Ga4Report = {
  configured: boolean;
  days: number;
  overview: {
    activeUsers: number;
    sessions: number;
    pageViews: number;
    avgSessionDurationSec: number;
  } | null;
  topPages: Array<{ pagePath: string; pageViews: number; activeUsers: number }>;
  trafficSources: Array<{ source: string; medium: string; sessions: number }>;
  countries: Array<{ country: string; activeUsers: number }>;
  devices: Array<{ device: string; activeUsers: number }>;
  daily: Array<{ date: string; activeUsers: number; sessions: number }>;
  setupHint?: string;
};

export async function adminGetGa4Analytics(days = 30): Promise<Ga4Report> {
  const data = await adminFetch<Ga4Report & { ok: boolean }>(`/api/admin/analytics/ga4?days=${days}`);
  return {
    configured: data.configured,
    days: data.days,
    overview: data.overview,
    topPages: data.topPages,
    trafficSources: data.trafficSources,
    countries: data.countries,
    devices: data.devices,
    daily: data.daily,
    setupHint: data.setupHint,
  };
}

// ============================================================================
// Pricing config admin (frais de service / options / caution par catégorie)
// ============================================================================

export type PricingVehicleType = "car" | "moto" | "scooter" | "quad" | "accommodation";
export type PricingPaymentMethod = "card_online" | "cash_on_site";

export interface ServiceFeeRule {
  vehicle_type: PricingVehicleType;
  payment_method: PricingPaymentMethod;
  fee_percent: number;
}

export interface BookingOptionRow {
  id: string;
  option_key: string;
  name: string;
  description: string | null;
  price_mga: number;
  pricing_mode: "flat" | "per_day";
  active: boolean;
  categories: PricingVehicleType[];
}

export interface DepositCategoryRule {
  vehicle_type: PricingVehicleType;
  deposit_enabled: boolean;
}

export interface PricingConfig {
  vehicleTypes: PricingVehicleType[];
  paymentMethods: PricingPaymentMethod[];
  feeRules: ServiceFeeRule[];
  options: BookingOptionRow[];
  depositRules: DepositCategoryRule[];
}

export async function adminGetPricingConfig(): Promise<PricingConfig> {
  return adminFetch<PricingConfig & { ok: boolean }>("/api/admin/settings/pricing");
}

export async function adminSaveFeeRules(
  rules: Array<{ vehicleType: PricingVehicleType; paymentMethod: PricingPaymentMethod; feePercent: number }>
): Promise<void> {
  await adminFetch("/api/admin/settings/pricing/fees", {
    method: "PUT",
    body: JSON.stringify({ rules }),
  });
}

export async function adminSaveDepositRules(
  rules: Array<{ vehicleType: PricingVehicleType; depositEnabled: boolean }>
): Promise<void> {
  await adminFetch("/api/admin/settings/pricing/deposit", {
    method: "PUT",
    body: JSON.stringify({ rules }),
  });
}

export async function adminCreateBookingOption(payload: {
  optionKey: string;
  name: string;
  description?: string;
  priceMga: number;
  pricingMode: "flat" | "per_day";
  active?: boolean;
  categories: PricingVehicleType[];
}): Promise<BookingOptionRow> {
  const data = await adminFetch<{ ok: boolean; option: BookingOptionRow }>(
    "/api/admin/settings/pricing/options",
    { method: "POST", body: JSON.stringify(payload) }
  );
  return data.option;
}

export async function adminUpdateBookingOption(
  id: string,
  payload: Partial<{
    name: string;
    description: string;
    priceMga: number;
    pricingMode: "flat" | "per_day";
    active: boolean;
    categories: PricingVehicleType[];
  }>
): Promise<void> {
  await adminFetch(`/api/admin/settings/pricing/options/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteBookingOption(id: string): Promise<void> {
  await adminFetch(`/api/admin/settings/pricing/options/${id}`, { method: "DELETE" });
}
