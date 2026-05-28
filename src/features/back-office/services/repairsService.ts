import { supabase } from "@/integrations/supabase/client";
import type {
  Repair,
  RepairFilters,
  RepairInsert,
  RepairPart,
  RepairPartLineInput,
  RepairUpdate,
} from "../types";

export async function listRepairs(filters: RepairFilters = {}): Promise<Repair[]> {
  let query = supabase
    .from("repairs")
    .select("*")
    .order("opened_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.vehicle_id) {
    query = query.eq("vehicle_id", filters.vehicle_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Repair[];
}

export async function listRepairsWithVehicle(filters: RepairFilters = {}) {
  let query = supabase
    .from("repairs")
    .select("*, vehicles(id, internal_code, brand, model, license_plate)")
    .order("opened_at", { ascending: false });

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.vehicle_id) {
    query = query.eq("vehicle_id", filters.vehicle_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getRepair(id: string): Promise<Repair> {
  const { data, error } = await supabase.from("repairs").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Repair;
}

export async function getRepairWithParts(id: string) {
  const { data, error } = await supabase
    .from("repairs")
    .select("*, repair_parts(*, parts(id, sku, name)), vehicles(id, internal_code, brand, model)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createRepair(payload: RepairInsert): Promise<Repair> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("repairs")
    .insert({ ...payload, created_by: user?.id ?? null })
    .select("*")
    .single();

  if (error) throw error;
  return data as Repair;
}

export async function updateRepair(id: string, payload: RepairUpdate): Promise<Repair> {
  const { data, error } = await supabase.from("repairs").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Repair;
}

export async function closeRepair(id: string): Promise<Repair> {
  return updateRepair(id, { status: "done" });
}

export async function cancelRepair(id: string): Promise<void> {
  const { error } = await supabase.rpc("rpc_cancel_repair", { p_repair_id: id });
  if (error) throw error;
}

export async function consumePartsForRepair(repairId: string, lines: RepairPartLineInput[]) {
  const payload = lines.map((l) => ({
    part_id: l.part_id,
    quantity: l.quantity,
    client_request_id: l.client_request_id ?? crypto.randomUUID(),
  }));

  const { data, error } = await supabase.rpc("rpc_consume_parts_for_repair", {
    p_repair_id: repairId,
    p_lines: payload,
  });
  if (error) throw error;
  return data;
}

export async function listRepairParts(repairId: string): Promise<RepairPart[]> {
  const { data, error } = await supabase
    .from("repair_parts")
    .select("*, parts(id, sku, name)")
    .eq("repair_id", repairId);

  if (error) throw error;
  return (data ?? []) as RepairPart[];
}
