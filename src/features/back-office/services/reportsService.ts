import { supabase } from "@/integrations/supabase/client";
import { isLowStock, listParts } from "./partsService";
import type { ReportsSummary } from "../types";

export async function getReportsSummary(): Promise<ReportsSummary> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [scootersRes, parts, repairsRes, salesRes, repairPartsRes, saleLinesRes] = await Promise.all([
    supabase.from("vehicles").select("id, internal_code, brand, model, operational_status").eq("vehicle_type", "scooter"),
    listParts(),
    supabase
      .from("repairs")
      .select("total_cost, vehicle_id, closed_at, status")
      .gte("opened_at", thirtyDaysAgo.toISOString())
      .neq("status", "cancelled"),
    supabase
      .from("sales")
      .select("total_amount, margin_total, sale_date")
      .is("cancelled_at", null)
      .gte("sale_date", monthStart.toISOString()),
    supabase
      .from("repair_parts")
      .select("part_id, quantity, parts(name)")
      .gte("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("sale_lines")
      .select("part_id, quantity, parts(name)")
      .gte("created_at", monthStart.toISOString()),
  ]);

  if (scootersRes.error) throw scootersRes.error;
  if (repairsRes.error) throw repairsRes.error;
  if (salesRes.error) throw salesRes.error;
  if (repairPartsRes.error) throw repairPartsRes.error;
  if (saleLinesRes.error) throw saleLinesRes.error;

  const scooters = scootersRes.data ?? [];
  const repairs = repairsRes.data ?? [];
  const sales = salesRes.data ?? [];

  const costByVehicle = new Map<string, number>();
  for (const r of repairs) {
    costByVehicle.set(r.vehicle_id, (costByVehicle.get(r.vehicle_id) ?? 0) + Number(r.total_cost ?? 0));
  }

  const scooterMap = new Map(scooters.map((s) => [s.id, s]));
  const topCostlyScooters = [...costByVehicle.entries()]
    .map(([vehicle_id, total_cost]) => {
      const s = scooterMap.get(vehicle_id);
      return {
        vehicle_id,
        label: (s?.internal_code ?? `${s?.brand ?? ""} ${s?.model ?? ""}`.trim()) || vehicle_id.slice(0, 8),
        total_cost,
      };
    })
    .sort((a, b) => b.total_cost - a.total_cost)
    .slice(0, 10);

  const usedPartsMap = new Map<string, { name: string; total_qty: number }>();
  for (const rp of repairPartsRes.data ?? []) {
    const part = rp.parts as { name?: string } | null;
    const existing = usedPartsMap.get(rp.part_id) ?? { name: part?.name ?? "?", total_qty: 0 };
    existing.total_qty += rp.quantity;
    usedPartsMap.set(rp.part_id, existing);
  }

  const soldPartsMap = new Map<string, { name: string; total_qty: number }>();
  for (const sl of saleLinesRes.data ?? []) {
    const part = sl.parts as { name?: string } | null;
    const existing = soldPartsMap.get(sl.part_id) ?? { name: part?.name ?? "?", total_qty: 0 };
    existing.total_qty += sl.quantity;
    soldPartsMap.set(sl.part_id, existing);
  }

  const lastMaintenance = repairs
    .filter((r) => r.status === "done" && r.closed_at)
    .sort((a, b) => (b.closed_at ?? "").localeCompare(a.closed_at ?? ""))[0]?.closed_at ?? null;

  return {
    scootersAvailable: scooters.filter((s) => s.operational_status === "available").length,
    scootersTotal: scooters.length,
    scootersInMaintenance: scooters.filter((s) =>
      ["maintenance", "broken", "accident"].includes(s.operational_status ?? "")
    ).length,
    lowStockCount: parts.filter(isLowStock).length,
    repairsCostLast30Days: repairs.reduce((sum, r) => sum + Number(r.total_cost ?? 0), 0),
    lastMaintenanceDate: lastMaintenance,
    stockValue: parts.reduce(
      (sum, p) => sum + p.quantity_on_hand * Number(p.purchase_price ?? 0),
      0
    ),
    salesThisMonth: sales.reduce((sum, s) => sum + Number(s.total_amount ?? 0), 0),
    salesMarginThisMonth: sales.reduce((sum, s) => sum + Number(s.margin_total ?? 0), 0),
    topCostlyScooters,
    topUsedParts: [...usedPartsMap.entries()]
      .map(([part_id, v]) => ({ part_id, ...v }))
      .sort((a, b) => b.total_qty - a.total_qty)
      .slice(0, 10),
    topSoldParts: [...soldPartsMap.entries()]
      .map(([part_id, v]) => ({ part_id, ...v }))
      .sort((a, b) => b.total_qty - a.total_qty)
      .slice(0, 10),
  };
}
