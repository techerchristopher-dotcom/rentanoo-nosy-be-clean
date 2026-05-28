import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BACK_OFFICE_QUERY_KEYS } from "../constants";
import * as repairsService from "../services/repairsService";
import type { RepairFilters, RepairInsert, RepairPartLineInput, RepairUpdate } from "../types";

export function useRepairs(filters: RepairFilters = {}) {
  return useQuery({
    queryKey: [...BACK_OFFICE_QUERY_KEYS.repairs, filters],
    queryFn: () => repairsService.listRepairsWithVehicle(filters),
  });
}

export function useRepair(id: string | undefined) {
  return useQuery({
    queryKey: BACK_OFFICE_QUERY_KEYS.repair(id ?? ""),
    queryFn: () => repairsService.getRepairWithParts(id!),
    enabled: !!id,
  });
}

export function useCreateRepair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: RepairInsert) => repairsService.createRepair(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.repairs });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.scooters });
    },
  });
}

export function useUpdateRepair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RepairUpdate }) =>
      repairsService.updateRepair(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.repairs });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.repair(id) });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.scooters });
    },
  });
}

export function useCloseRepair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: repairsService.closeRepair,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.repairs });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.repair(data.id) });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.scooters });
    },
  });
}

export function useCancelRepair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: repairsService.cancelRepair,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.repairs });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.parts });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.stockMovements });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.scooters });
    },
  });
}

export function useConsumePartsForRepair() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ repairId, lines }: { repairId: string; lines: RepairPartLineInput[] }) =>
      repairsService.consumePartsForRepair(repairId, lines),
    onSuccess: (_, { repairId }) => {
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.repair(repairId) });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.repairs });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.parts });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.stockMovements });
    },
  });
}
