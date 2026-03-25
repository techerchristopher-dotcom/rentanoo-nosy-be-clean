import { supabase } from "@/integrations/supabase/client";

export type AdminClientRow = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string | null;
};

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Session expirée : reconnectez-vous.");
  }

  const res = await fetch(path, {
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

  return json as T;
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
  booking: Record<string, unknown>;
  vehicle: Record<string, unknown> | null;
  renter: Record<string, unknown> | null;
}> {
  const data = await adminFetch<{
    booking: Record<string, unknown>;
    vehicle: Record<string, unknown> | null;
    renter: Record<string, unknown> | null;
  }>(`/api/admin/bookings/${encodeURIComponent(bookingId)}`);
  return { booking: data.booking, vehicle: data.vehicle, renter: data.renter };
}
