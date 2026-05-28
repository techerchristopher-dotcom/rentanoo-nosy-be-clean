import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BACK_OFFICE_QUERY_KEYS } from "../constants";
import * as suppliersService from "../services/suppliersService";
import type { SupplierInsert, SupplierUpdate } from "../types";

export function useSuppliers() {
  return useQuery({
    queryKey: BACK_OFFICE_QUERY_KEYS.suppliers,
    queryFn: suppliersService.listSuppliers,
  });
}

export function useSupplier(id: string | undefined) {
  return useQuery({
    queryKey: [...BACK_OFFICE_QUERY_KEYS.suppliers, id],
    queryFn: () => suppliersService.getSupplier(id!),
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SupplierInsert) => suppliersService.createSupplier(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.suppliers }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SupplierUpdate }) =>
      suppliersService.updateSupplier(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.suppliers }),
  });
}
