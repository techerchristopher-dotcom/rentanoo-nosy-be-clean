import type { Vehicle as SupabaseVehicle } from "@/services/supabaseVehiclesService";
import {
  EXPLORER_MAIN_CATEGORIES,
  getMainCategoryConfig,
  getSubFilterConfig,
  type ExplorerMainCategoryId,
  type ExplorerSubFilterConfig,
} from "@/data/explorerFilterConfig";
import { parseEngineCapacity } from "@/utils/engineCapacity";

export function isCarVehicle(
  v: Pick<SupabaseVehicle, "vehicle_type"> | null | undefined
): boolean {
  if (!v) return false;
  const t = v.vehicle_type;
  if (t === "car") return true;
  if (t === "scooter" || t === "moto" || t === "accommodation" || t === "quad") return false;
  return true;
}

export function matchesMainCategory(
  v: SupabaseVehicle,
  categoryId: ExplorerMainCategoryId
): boolean {
  switch (categoryId) {
    case "accommodation":
      return v.vehicle_type === "accommodation";
    case "scooter":
      return v.vehicle_type === "scooter";
    case "moto":
      return v.vehicle_type === "moto";
    case "quad":
      return v.vehicle_type === "quad";
    case "car":
      return isCarVehicle(v);
    default:
      return false;
  }
}

export function matchesSubFilter(
  v: SupabaseVehicle,
  mainId: ExplorerMainCategoryId,
  sub: ExplorerSubFilterConfig
): boolean {
  if (!matchesMainCategory(v, mainId)) return false;

  switch (sub.kind) {
    case "vehicle_category": {
      const values = sub.dbValues ?? [];
      if (values.length === 0) return false;
      return (
        v.vehicle_category != null && values.includes(v.vehicle_category)
      );
    }
    case "engine_exact": {
      const cc = parseEngineCapacity(v.engine_capacity);
      return cc != null && sub.engineCc != null && cc === sub.engineCc;
    }
    case "engine_min": {
      const cc = parseEngineCapacity(v.engine_capacity);
      return cc != null && sub.engineMin != null && cc >= sub.engineMin;
    }
    case "model_keyword": {
      const keywords = sub.modelKeywords ?? [];
      if (keywords.length === 0) return false;
      const modelLower = (v.model || "").toLowerCase();
      return keywords.some((kw) => modelLower.includes(kw.toLowerCase()));
    }
    default:
      return false;
  }
}

export function countForMainCategory(
  vehicles: SupabaseVehicle[],
  categoryId: ExplorerMainCategoryId
): number {
  return vehicles.filter((v) => matchesMainCategory(v, categoryId)).length;
}

export function countForSubFilter(
  vehicles: SupabaseVehicle[],
  mainId: ExplorerMainCategoryId,
  sub: ExplorerSubFilterConfig
): number {
  return vehicles.filter((v) => matchesSubFilter(v, mainId, sub)).length;
}

export function applyExplorerFilters(
  vehicles: SupabaseVehicle[],
  mainCategory: ExplorerMainCategoryId | null | undefined,
  subFilterId: string | null | undefined
): SupabaseVehicle[] {
  let filtered = [...vehicles];

  if (mainCategory) {
    filtered = filtered.filter((v) => matchesMainCategory(v, mainCategory));
  }

  if (mainCategory && subFilterId) {
    const sub = getSubFilterConfig(mainCategory, subFilterId);
    if (sub) {
      filtered = filtered.filter((v) => matchesSubFilter(v, mainCategory, sub));
    }
  }

  return filtered;
}

export function computeExplorerFilterCounts(vehicles: SupabaseVehicle[]): {
  main: Record<ExplorerMainCategoryId, number>;
  sub: Record<string, number>;
} {
  const main = {} as Record<ExplorerMainCategoryId, number>;
  const sub: Record<string, number> = {};

  for (const category of EXPLORER_MAIN_CATEGORIES) {
    main[category.id] = countForMainCategory(vehicles, category.id);
    for (const sf of category.subFilters) {
      sub[`${category.id}:${sf.id}`] = countForSubFilter(
        vehicles,
        category.id,
        sf
      );
    }
  }

  return { main, sub };
}

export function isExplorerMainCategoryId(
  value: string | undefined | null
): value is ExplorerMainCategoryId {
  return (
    value === "accommodation" ||
    value === "scooter" ||
    value === "moto" ||
    value === "quad" ||
    value === "car"
  );
}
