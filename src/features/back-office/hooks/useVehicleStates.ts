import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BACK_OFFICE_QUERY_KEYS } from "../constants";
import * as vehicleStatesService from "../services/vehicleStatesService";
import type { VehicleStateInsert } from "../types";

export function useVehicleStates(vehicleId: string | undefined) {
  return useQuery({
    queryKey: BACK_OFFICE_QUERY_KEYS.vehicleStates(vehicleId ?? ""),
    queryFn: () => vehicleStatesService.listVehicleStates(vehicleId!),
    enabled: !!vehicleId,
  });
}

export function useCreateVehicleState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: VehicleStateInsert) => vehicleStatesService.createVehicleState(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.vehicleStates(data.vehicle_id) });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.scooter(data.vehicle_id) });
      qc.invalidateQueries({ queryKey: BACK_OFFICE_QUERY_KEYS.scooters });
    },
  });
}
