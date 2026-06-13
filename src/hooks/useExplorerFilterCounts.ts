import { useMemo } from "react";
import type { Vehicle as SupabaseVehicle } from "@/services/supabaseVehiclesService";
import type { ExplorerMainCategoryId } from "@/data/explorerFilterConfig";
import { computeExplorerFilterCounts } from "@/utils/explorerFilterUtils";

export function useExplorerFilterCounts(vehicles: SupabaseVehicle[]) {
  return useMemo(() => computeExplorerFilterCounts(vehicles), [vehicles]);
}

export function getSubFilterCountKey(
  mainId: ExplorerMainCategoryId,
  subId: string
): string {
  return `${mainId}:${subId}`;
}
