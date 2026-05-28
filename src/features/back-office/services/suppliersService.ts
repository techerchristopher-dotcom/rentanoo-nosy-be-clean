import { supabase } from "@/integrations/supabase/client";
import type { Part, Supplier, SupplierInsert, SupplierUpdate } from "../types";

export async function listSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase.from("suppliers").select("*").order("name");
  if (error) throw error;
  return (data ?? []) as Supplier[];
}

export async function getSupplier(id: string): Promise<Supplier> {
  const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Supplier;
}

export async function createSupplier(payload: SupplierInsert): Promise<Supplier> {
  const { data, error } = await supabase.from("suppliers").insert(payload).select("*").single();
  if (error) throw error;
  return data as Supplier;
}

export async function updateSupplier(id: string, payload: SupplierUpdate): Promise<Supplier> {
  const { data, error } = await supabase.from("suppliers").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return data as Supplier;
}

export async function getSupplierStockHistory(supplierId: string) {
  const { data, error } = await supabase
    .from("stock_movements")
    .select("*, parts(id, sku, name)")
    .eq("supplier_id", supplierId)
    .eq("movement_type", "stock_in")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getSupplierParts(supplierId: string) {
  const { data, error } = await supabase
    .from("parts")
    .select("*")
    .eq("supplier_id", supplierId)
    .order("name");

  if (error) throw error;
  return (data ?? []) as Part[];
}
