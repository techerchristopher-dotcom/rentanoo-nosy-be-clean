import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BACK_OFFICE_QUERY_KEYS } from "../constants";
import * as partsService from "../services/partsService";
import type { PartInsert, PartUpdate } from "../types";

export function useParts(options?: { activeOnly?: boolean; lowStockOnly?: boolean }) {
  return useQuery({
    queryKey: [...BACK_OFFICE_QUERY_KEYS.parts, options],
    queryFn: () => partsService.listParts(options),
  });
}

export function usePart(id: string | undefined) {
  return useQuery({
    queryKey: BACK_OFFICE_QUERY_KEYS.part(id ?? ""),
    queryFn: () => partsService.getPart(id!),
    enabled: !!id,
  });
}

export function useCreatePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PartInsert) => partsService.createPart(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.parts }),
  });
}

export function useUpdatePart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PartUpdate }) =>
      partsService.updatePart(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.parts });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.part(id) });
    },
  });
}
