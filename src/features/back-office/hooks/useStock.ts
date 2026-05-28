import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BACK_OFFICE_QUERY_KEYS } from "../constants";
import * as stockService from "../services/stockService";
import type { StockMovementFilters } from "../types";

export function useStockMovements(filters: StockMovementFilters = {}) {
  return useQuery({
    queryKey: [...BACK_OFFICE_QUERY_KEYS.stockMovements, filters],
    queryFn: () => stockService.listMovementsWithParts(filters),
  });
}

export function useStockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: stockService.stockIn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.parts });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.stockMovements });
    },
  });
}

export function useStockAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: stockService.adjustStock,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.parts });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.stockMovements });
    },
  });
}
