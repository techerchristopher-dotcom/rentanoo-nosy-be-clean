import { supabase } from "@/integrations/supabase/client";
import type { MaintenanceAlert, MaintenanceRule, MaintenanceRuleInsert } from "../types";

export async function listMaintenanceRules(): Promise<MaintenanceRule[]> {
  const { data, error } = await supabase
    .from("maintenance_rules")
    .select("*")
    .eq("is_active", true)
    .order("maintenance_type");

  if (error) throw error;
  return (data ?? []) as MaintenanceRule[];
}

export async function createMaintenanceRule(payload: MaintenanceRuleInsert): Promise<MaintenanceRule> {
  const { data, error } = await supabase
    .from("maintenance_rules")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data as MaintenanceRule;
}

export async function updateMaintenanceRule(
  id: string,
  payload: Partial<MaintenanceRuleInsert>
): Promise<MaintenanceRule> {
  const { data, error } = await supabase
    .from("maintenance_rules")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as MaintenanceRule;
}

export async function getMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
  const [rulesRes, scootersRes, repairsRes] = await Promise.all([
    listMaintenanceRules(),
    supabase.from("vehicles").select("id, internal_code, brand, model, mileage").eq("vehicle_type", "scooter"),
    supabase
      .from("repairs")
      .select("vehicle_id, intervention_type, closed_at, mileage_at_repair, status")
      .eq("status", "done")
      .order("closed_at", { ascending: false }),
  ]);

  if (scootersRes.error) throw scootersRes.error;
  if (repairsRes.error) throw repairsRes.error;

  const scooters = scootersRes.data ?? [];
  const repairs = repairsRes.data ?? [];
  const alerts: MaintenanceAlert[] = [];

  for (const rule of rulesRes) {
    const targets = scooters.filter((s) => {
      if (rule.vehicle_id) return s.id === rule.vehicle_id;
      if (rule.model_filter) {
        const label = `${s.brand} ${s.model}`.toLowerCase();
        return label.includes(rule.model_filter.toLowerCase());
      }
      return true;
    });

    for (const scooter of targets) {
      const lastRepair = repairs.find(
        (r) =>
          r.vehicle_id === scooter.id &&
          r.intervention_type === rule.maintenance_type
      );

      const lastMileage = lastRepair?.mileage_at_repair ?? 0;
      const currentMileage = scooter.mileage ?? 0;
      const kmSince = currentMileage - lastMileage;

      let status: MaintenanceAlert["status"] = "ok";
      let nextDueMileage: number | null = null;

      if (rule.interval_km) {
        nextDueMileage = lastMileage + rule.interval_km;
        const remaining = nextDueMileage - currentMileage;
        if (remaining <= 0) status = "overdue";
        else if (remaining <= rule.interval_km * 0.1) status = "soon";
      }

      if (rule.interval_days && lastRepair?.closed_at) {
        const lastDate = new Date(lastRepair.closed_at);
        const dueDate = new Date(lastDate);
        dueDate.setDate(dueDate.getDate() + rule.interval_days);
        const now = new Date();
        if (now >= dueDate) status = "overdue";
        else if (dueDate.getTime() - now.getTime() < 7 * 86400000) status = "soon";
      }

      if (status !== "ok" || rule.interval_km) {
        alerts.push({
          rule_id: rule.id,
          vehicle_id: scooter.id,
          vehicle_label: scooter.internal_code ?? `${scooter.brand} ${scooter.model}`,
          maintenance_type: rule.maintenance_type,
          status,
          next_due_mileage: nextDueMileage,
          next_due_date: lastRepair?.closed_at && rule.interval_days
            ? new Date(new Date(lastRepair.closed_at).getTime() + rule.interval_days * 86400000).toISOString()
            : null,
          last_done_at: lastRepair?.closed_at ?? null,
          last_done_mileage: lastRepair?.mileage_at_repair ?? null,
        });
      }
    }
  }

  return alerts.sort((a, b) => {
    const order = { overdue: 0, soon: 1, ok: 2 };
    return order[a.status] - order[b.status];
  });
}
