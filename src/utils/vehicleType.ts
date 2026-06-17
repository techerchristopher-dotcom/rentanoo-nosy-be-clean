export const isMoto = (v: { vehicle_type?: string | null } | null | undefined): boolean => {
  if (!v) return false;
  return v.vehicle_type === 'moto' || v.vehicle_type === 'scooter';
};

export const isQuad = (v: { vehicle_type?: string | null } | null | undefined): boolean => {
  if (!v) return false;
  return v.vehicle_type === 'quad';
};

export const isAccommodation = (
  v: { vehicle_type?: string | null; vehicleType?: string | null } | null | undefined
): boolean => {
  if (!v) return false;
  const type = v.vehicle_type ?? v.vehicleType;
  return type === 'accommodation';
};

type ListingPathInput = {
  id: string;
  license?: string;
  vehicle_type?: string | null;
  vehicleType?: string | null;
};

export function getListingLicense(vehicle: { id: string; license?: string }): string {
  return (vehicle.license ?? vehicle.id.substring(0, 8)).toUpperCase();
}

export function getPublicListingPath(vehicle: ListingPathInput): string {
  const license = getListingLicense(vehicle);
  if (isAccommodation(vehicle)) return `/hebergement/${license}`;
  if (isMoto(vehicle)) return `/moto/${license}`;
  return `/vehicle/${license}`;
}

export function getPublicDiscussionPath(
  vehicle: ListingPathInput,
  params?: Record<string, string>
): string {
  const base = `${getPublicListingPath(vehicle)}/booking/discussion`;
  if (!params || Object.keys(params).length === 0) return base;
  return `${base}?${new URLSearchParams(params).toString()}`;
}

export function getVehicleTypeForChecking(
  vehicleType: string | null | undefined
): 'car' | 'moto' {
  if (!vehicleType) return 'car';

  if (vehicleType === 'car') return 'car';
  if (vehicleType === 'moto') return 'moto';
  if (vehicleType === 'scooter') return 'moto';
  if (vehicleType === 'quad') return 'car'; // quad uses car checkin flow

  // Valeur inattendue → fallback car + warning avec valeur brute
  console.warn("[Checking] Valeur inattendue vehicle_type:", vehicleType);
  return 'car';
}
