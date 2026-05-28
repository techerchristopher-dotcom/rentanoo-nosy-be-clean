import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BACK_OFFICE_QUERY_KEYS } from "../constants";
import * as salesService from "../services/salesService";
import type { CreateSalePayload } from "../types";

export function useSales() {
  return useQuery({
    queryKey: BACK_OFFICE_QUERY_KEYS.sales,
    queryFn: salesService.listSales,
  });
}

export function useSale(id: string | undefined) {
  return useQuery({
    queryKey: BACK_OFFICE_QUERY_KEYS.sale(id ?? ""),
    queryFn: () => salesService.getSale(id!),
    enabled: !!id,
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSalePayload) => salesService.createSale(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.sales });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.parts });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.stockMovements });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.reports });
    },
  });
}

export function useCancelSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesService.cancelSale,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.sales });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.parts });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.stockMovements });
    },
  });
}
