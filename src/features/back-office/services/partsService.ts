import { supabase } from "@/integrations/supabase/client";
import type { Part, PartInsert, PartUpdate } from "../types";

export async function listParts(options?: { activeOnly?: boolean; lowStockOnly?: boolean }) {
  let query = supabase.from("parts").select("*").order("name");

  if (options?.activeOnly !== false) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;

  let parts = (data ?? []) as Part[];
  if (options?.lowStockOnly) {
    parts = parts.filter((p) => p.quantity_on_hand <= p.quantity_min);
  }
  return parts;
}

export async function getPart(id: string): Promise<Part> {
  const { data, error } = await supabase.from("parts").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Part;
}

export async function createPart(payload: PartInsert): Promise<Part> {
  const { data, error } = await supabase.from("parts").insert(payload).select("*").single();
  if (error) throw error;
  return data as Part;
}

export async function updatePart(id: string, payload: PartUpdate): Promise<Part> {
  const { data, error } = await supabase.from("parts").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Part;
}

export async function searchParts(query: string, limit = 20): Promise<Part[]> {
  const s = `%${query.trim()}%`;
  const { data, error } = await supabase
    .from("parts")
    .select("*")
    .eq("is_active", true)
    .or(`sku.ilike.${s},name.ilike.${s}`)
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as Part[];
}

export function isLowStock(part: Part): boolean {
  return part.quantity_on_hand <= part.quantity_min;
}
