import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BACK_OFFICE_QUERY_KEYS } from "../constants";
import * as maintenanceService from "../services/maintenanceService";
import type { MaintenanceRuleInsert } from "../types";

export function useMaintenanceRules() {
  return useQuery({
    queryKey: BACK_OFFICE_QUERY_KEYS.maintenanceRules,
    queryFn: maintenanceService.listMaintenanceRules,
  });
}

export function useMaintenanceAlerts() {
  return useQuery({
    queryKey: [...BACK_OFFICE_QUERY_KEYS.maintenanceRules, "alerts"],
    queryFn: maintenanceService.getMaintenanceAlerts,
  });
}

export function useCreateMaintenanceRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaintenanceRuleInsert) => maintenanceService.createMaintenanceRule(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.maintenanceRules }),
  });
}
