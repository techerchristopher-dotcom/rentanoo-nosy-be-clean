import { supabase } from "@/integrations/supabase/client";
import type { VehicleState, VehicleStateInsert } from "../types";

export async function listVehicleStates(vehicleId: string): Promise<VehicleState[]> {
  const { data, error } = await supabase
    .from("vehicle_states")
    .select("*")
    .eq("vehicle_id", vehicleId)
    .order("state_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as VehicleState[];
}

export async function createVehicleState(payload: VehicleStateInsert): Promise<VehicleState> {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("vehicle_states")
    .insert({ ...payload, created_by: user?.id ?? null })
    .select("*")
    .single();

  if (error) throw error;

  if (payload.mileage != null) {
    await supabase.from("vehicles").update({ mileage: payload.mileage }).eq("id", payload.vehicle_id);
  }

  return data as VehicleState;
}

export async function getVehicleState(id: string): Promise<VehicleState> {
  const { data, error } = await supabase.from("vehicle_states").select("*").eq("id", id).single();
  if (error) throw error;
  return data as VehicleState;
}
