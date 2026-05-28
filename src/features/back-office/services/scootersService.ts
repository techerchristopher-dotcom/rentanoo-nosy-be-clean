import { supabase } from "@/integrations/supabase/client";
import type { OperationalStatus } from "@/integrations/supabase/types";
import type { Scooter, ScooterFilters, ScooterInsert, ScooterUpdate } from "../types";

export type ScooterListItem = Scooter & { primaryPhotoUrl: string | null };

function isHeicUrl(url: string | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith(".heic") || lower.includes(".heic?");
}

function pickPrimaryPhotoUrl(
  photos: Array<{ photo_url?: string; is_primary?: boolean; display_order?: number }> | null
): string | null {
  if (!photos || photos.length === 0) return null;
  const valid = photos.filter((p) => p.photo_url && !isHeicUrl(p.photo_url));
  if (valid.length === 0) return null;
  const primary = valid.find((p) => p.is_primary);
  if (primary?.photo_url) return primary.photo_url;
  const sorted = [...valid].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
  return sorted[0]?.photo_url ?? null;
}

export async function listScooters(filters: ScooterFilters = {}): Promise<ScooterListItem[]> {
  let query = supabase
    .from("vehicles")
    .select("*, vehicle_photos(photo_url, is_primary, display_order)")
    .eq("vehicle_type", "scooter")
    .order("internal_code", { ascending: true, nullsFirst: false });

  if (filters.operational_status && filters.operational_status !== "all") {
    query = query.eq("operational_status", filters.operational_status);
  }

  if (filters.search?.trim()) {
    const s = `%${filters.search.trim()}%`;
    query = query.or(
      `internal_code.ilike.${s},brand.ilike.${s},model.ilike.${s},license_plate.ilike.${s}`
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => {
    const { vehicle_photos, ...vehicle } = row as Scooter & {
      vehicle_photos?: Array<{ photo_url?: string; is_primary?: boolean; display_order?: number }>;
    };
    return {
      ...vehicle,
      primaryPhotoUrl:
        pickPrimaryPhotoUrl(vehicle_photos ?? null) ?? vehicle.image_url ?? null,
    } as ScooterListItem;
  });
}

export async function getScooter(id: string): Promise<Scooter> {
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .eq("vehicle_type", "scooter")
    .single();

  if (error) throw error;
  return data as Scooter;
}

export async function createScooter(payload: ScooterInsert): Promise<Scooter> {
  const { data, error } = await supabase
    .from("vehicles")
    .insert({ ...payload, vehicle_type: "scooter" })
    .select("*")
    .single();

  if (error) throw error;
  return data as Scooter;
}

export async function updateScooter(id: string, payload: ScooterUpdate): Promise<Scooter> {
  const { data, error } = await supabase
    .from("vehicles")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as Scooter;
}

export async function updateScooterStatus(id: string, status: OperationalStatus): Promise<Scooter> {
  return updateScooter(id, { operational_status: status });
}

export async function getScooterStats(id: string) {
  const [repairsRes, statesRes] = await Promise.all([
    supabase.from("repairs").select("total_cost, status, closed_at").eq("vehicle_id", id),
    supabase
      .from("vehicle_states")
      .select("state_date, state_type")
      .eq("vehicle_id", id)
      .order("state_date", { ascending: false })
      .limit(1),
  ]);

  if (repairsRes.error) throw repairsRes.error;
  if (statesRes.error) throw statesRes.error;

  const repairs = repairsRes.data ?? [];
  const totalCost = repairs.reduce((sum, r) => sum + Number(r.total_cost ?? 0), 0);
  const repairCount = repairs.filter((r) => r.status !== "cancelled").length;
  const lastMaintenance = repairs
    .filter((r) => r.status === "done" && r.closed_at)
    .sort((a, b) => (b.closed_at ?? "").localeCompare(a.closed_at ?? ""))[0]?.closed_at ?? null;

  return {
    totalCost,
    repairCount,
    lastMaintenance,
    lastState: statesRes.data?.[0] ?? null,
  };
}
