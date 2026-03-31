import { supabase } from "@/integrations/supabase/client";

export type AdminBookingDraft = {
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
      "[adminDraftsApi] VITE_API_URL n’est pas défini : /api/admin/* part sur l’origine actuelle du site. Pour forcer Express, définissez VITE_API_URL au build."
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
      "Content-Type": "application/json",
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

export async function adminDraftsList(): Promise<AdminBookingDraft[]> {
  const data = await adminFetch<{ ok: boolean; drafts: AdminBookingDraft[] }>("/api/admin/drafts");
  return data.drafts ?? [];
}

export async function adminDraftGet(draftId: string): Promise<AdminBookingDraft> {
  const data = await adminFetch<{ ok: boolean; draft: AdminBookingDraft }>(`/api/admin/drafts/${encodeURIComponent(draftId)}`);
  return data.draft;
}

export async function adminDraftCreate(payload: {
  status?: string;
  progressStep?: string;
  renterUserId?: string | null;
  walkInPayload?: unknown | null;
  vehicleId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  pickupLocation?: string | null;
  notesAdmin?: string | null;
  pricingSnapshot?: unknown | null;
}): Promise<AdminBookingDraft> {
  const data = await adminFetch<{ ok: boolean; draft: AdminBookingDraft }>("/api/admin/drafts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.draft;
}

export async function adminDraftUpdate(
  draftId: string,
  patch: {
    status?: string;
    progressStep?: string;
    renterUserId?: string | null;
    walkInPayload?: unknown | null;
    vehicleId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    pickupLocation?: string | null;
    notesAdmin?: string | null;
    pricingSnapshot?: unknown | null;
  }
): Promise<AdminBookingDraft> {
  const data = await adminFetch<{ ok: boolean; draft: AdminBookingDraft }>(`/api/admin/drafts/${encodeURIComponent(draftId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return data.draft;
}

export async function adminDraftDelete(draftId: string): Promise<void> {
  await adminFetch<{ ok: boolean }>(`/api/admin/drafts/${encodeURIComponent(draftId)}`, { method: "DELETE" });
}

export async function adminDraftConvert(draftId: string): Promise<{
  bookingId: string;
  renterUserId: string;
  createdClientPassword: string | null;
  alreadyConverted?: boolean;
}> {
  const data = await adminFetch<{
    ok: boolean;
    bookingId: string;
    renterUserId?: string;
    createdClientPassword?: string | null;
    alreadyConverted?: boolean;
  }>(`/api/admin/drafts/${encodeURIComponent(draftId)}/convert`, { method: "POST" });
  return {
    bookingId: data.bookingId,
    renterUserId: data.renterUserId ?? "",
    createdClientPassword: data.createdClientPassword ?? null,
    alreadyConverted: data.alreadyConverted,
  };
}

