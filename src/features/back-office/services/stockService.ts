import { supabase } from "@/integrations/supabase/client";
import type { StockMovement, StockMovementFilters } from "../types";

export async function stockIn(params: {
  part_id: string;
  quantity: number;
  unit_cost: number;
  supplier_id?: string | null;
  reason?: string | null;
}) {
  const { data, error } = await supabase.rpc("rpc_stock_in", {
    p_part_id: params.part_id,
    p_quantity: params.quantity,
    p_unit_cost: params.unit_cost,
    p_supplier_id: params.supplier_id ?? null,
    p_reason: params.reason ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function adjustStock(params: {
  part_id: string;
  delta: number;
  reason?: string | null;
}) {
  const { data, error } = await supabase.rpc("rpc_stock_adjustment", {
    p_part_id: params.part_id,
    p_delta: params.delta,
    p_reason: params.reason ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function listMovements(filters: StockMovementFilters = {}): Promise<StockMovement[]> {
  let query = supabase
    .from("stock_movements")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.part_id) query = query.eq("part_id", filters.part_id);
  if (filters.movement_type && filters.movement_type !== "all") {
    query = query.eq("movement_type", filters.movement_type);
  }
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as StockMovement[];
}

export async function listMovementsWithParts(filters: StockMovementFilters = {}) {
  let query = supabase
    .from("stock_movements")
    .select("*, parts(id, sku, name)")
    .order("created_at", { ascending: false });

  if (filters.part_id) query = query.eq("part_id", filters.part_id);
  if (filters.movement_type && filters.movement_type !== "all") {
    query = query.eq("movement_type", filters.movement_type);
  }
  if (filters.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
