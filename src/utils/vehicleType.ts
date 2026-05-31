export const isMoto = (v: { vehicle_type?: string | null } | null | undefined): boolean => {
  if (!v) return false;
  return v.vehicle_type === 'moto' || v.vehicle_type === 'scooter';
};

export function getVehicleTypeForChecking(
  vehicleType: string | null | undefined
): 'car' | 'moto' {
  if (!vehicleType) return 'car';

  if (vehicleType === 'car') return 'car';
  if (vehicleType === 'moto') return 'moto';
  if (vehicleType === 'scooter') return 'moto';

  // Valeur inattendue → fallback car + warning avec valeur brute
  console.warn("[Checking] Valeur inattendue vehicle_type:", vehicleType);
  return 'car';
}
