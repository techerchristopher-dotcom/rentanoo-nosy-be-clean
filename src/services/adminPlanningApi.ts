import { supabase } from "@/integrations/supabase/client";

export type PlanningVehicle = {
  id: string;
  brand: string;
  model: string;
  available: boolean | null;
  status: "active" | "inactive" | "review" | null;
  vehicle_type: "car" | "moto" | "scooter" | null;
  vehicle_category: string | null;
  /** Cylindrée brute telle qu'enregistrée dans la fiche véhicule (ex: "125", "125 A", "200"). Source de vérité pour le filtre cylindrée. */
  engine_capacity: string | null;
  /** URL de la photo principale du véhicule (calculée côté serveur depuis vehicle_photos + fallback image_url). null si aucune photo affichable. */
  primary_photo_url: string | null;
};

export type PlanningRenter = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

export type PlanningBooking = {
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
  renter: PlanningRenter | null;
};

export type PlanningResponse = {
  ok: true;
  range: { start: string; end: string };
  vehicles: PlanningVehicle[];
  bookings: PlanningBooking[];
};

let warnedMissingViteApiUrl = false;

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
      "[adminPlanningApi] VITE_API_URL n’est pas défini : /api/admin/* part sur l’origine actuelle du site. Pour forcer Express, définissez VITE_API_URL au build."
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
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(init?.headers ?? {}),
    },
  });

  const json = (await res.json().catch(() => ({}))) as T & { ok?: boolean; error?: string; message?: string };
  if (!res.ok) {
    const msg =
      typeof json?.message === "string"
        ? json.message
        : typeof json?.error === "string"
          ? json.error
          : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return json as T;
}

export async function adminGetPlanning(params: {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  q?: string;
  vehicle_type?: string;
  include_inactive?: "0" | "1";
}): Promise<PlanningResponse> {
  const sp = new URLSearchParams();
  sp.set("start", params.start);
  sp.set("end", params.end);
  if (params.q) sp.set("q", params.q);
  if (params.vehicle_type) sp.set("vehicle_type", params.vehicle_type);
  if (params.include_inactive) sp.set("include_inactive", params.include_inactive);

  return await adminFetch<PlanningResponse>(`/api/admin/planning?${sp.toString()}`);
}

