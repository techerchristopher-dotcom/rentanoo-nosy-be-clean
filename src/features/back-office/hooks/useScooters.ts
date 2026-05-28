import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BACK_OFFICE_QUERY_KEYS } from "../constants";
import * as scootersService from "../services/scootersService";
import type { OperationalStatus, ScooterFilters, ScooterInsert, ScooterUpdate } from "../types";

export function useScooters(filters: ScooterFilters = {}) {
  return useQuery({
    queryKey: [...BACK_OFFICE_QUERY_KEYS.scooters, filters],
    queryFn: () => scootersService.listScooters(filters),
  });
}

export function useScooter(id: string | undefined) {
  return useQuery({
    queryKey: BACK_OFFICE_QUERY_KEYS.scooter(id ?? ""),
    queryFn: () => scootersService.getScooter(id!),
    enabled: !!id,
  });
}

export function useScooterStats(id: string | undefined) {
  return useQuery({
    queryKey: [...BACK_OFFICE_QUERY_KEYS.scooter(id ?? ""), "stats"],
    queryFn: () => scootersService.getScooterStats(id!),
    enabled: !!id,
  });
}

export function useCreateScooter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ScooterInsert) => scootersService.createScooter(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.scooters }),
  });
}

export function useUpdateScooter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ScooterUpdate }) =>
      scootersService.updateScooter(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.scooters });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.scooter(id) });
    },
  });
}

export function useUpdateScooterStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OperationalStatus }) =>
      scootersService.updateScooterStatus(id, status),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.scooters });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.scooter(id) });
    },
  });
}
