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
