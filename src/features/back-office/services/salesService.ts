import { supabase } from "@/integrations/supabase/client";
import type { CreateSalePayload, Sale, SaleLine } from "../types";

export async function listSales(): Promise<Sale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("*")
    .is("cancelled_at", null)
    .order("sale_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Sale[];
}

export async function getSale(id: string) {
  const { data, error } = await supabase
    .from("sales")
    .select("*, sale_lines(*, parts(id, sku, name))")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createSale(payload: CreateSalePayload): Promise<string> {
  const { data, error } = await supabase.rpc("rpc_create_part_sale", {
    p_payload: payload,
  });
  if (error) throw error;
  return data as string;
}

export async function cancelSale(saleId: string): Promise<void> {
  const { error } = await supabase.rpc("rpc_cancel_part_sale", { p_sale_id: saleId });
  if (error) throw error;
}

export async function listSaleLines(saleId: string): Promise<SaleLine[]> {
  const { data, error } = await supabase
    .from("sale_lines")
    .select("*, parts(id, sku, name)")
    .eq("sale_id", saleId);

  if (error) throw error;
  return (data ?? []) as SaleLine[];
}
