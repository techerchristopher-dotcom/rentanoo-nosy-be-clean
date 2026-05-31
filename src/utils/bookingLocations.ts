import {
  AGENCY_LOCATION_LABEL,
  AIRPORT_LOCATION_LABEL,
  PLATFORM_AIRPORT_PICKUP_ID,
  PLATFORM_AIRPORT_RETURN_ID,
  PLATFORM_HOTEL_PICKUP_ID,
  PLATFORM_HOTEL_RETURN_ID,
  isPlatformTransportOption,
} from "@/constants/platformBookingOptions";

const MAX_HOTEL_NAME_LENGTH = 120;

export function sanitizeHotelName(raw: string | null | undefined): string {
  return (raw ?? "").trim().slice(0, MAX_HOTEL_NAME_LENGTH);
}

export function hasPlatformTransportOption(selectedIds: Iterable<string>): boolean {
  for (const id of selectedIds) {
    if (isPlatformTransportOption(id)) return true;
  }
  return false;
}

export function requiresHotelName(selectedIds: Iterable<string>): boolean {
  const ids = new Set(selectedIds);
  return ids.has(PLATFORM_HOTEL_PICKUP_ID) || ids.has(PLATFORM_HOTEL_RETURN_ID);
}

/**
 * Dérive pickup_location / return_location depuis les options plateforme transport.
 * Défaut agence pour les côtés non couverts par une option.
 */
export function deriveBookingLocations(params: {
  selectedOptionIds: string[];
  hotelName?: string | null;
  forceAgency?: boolean;
}): { pickupLocation: string; returnLocation: string } {
  if (params.forceAgency) {
    return {
      pickupLocation: AGENCY_LOCATION_LABEL,
      returnLocation: AGENCY_LOCATION_LABEL,
    };
  }

  const ids = new Set(params.selectedOptionIds);
  const hotel = sanitizeHotelName(params.hotelName);

  let pickupLocation = AGENCY_LOCATION_LABEL;
  let returnLocation = AGENCY_LOCATION_LABEL;

  if (ids.has(PLATFORM_AIRPORT_PICKUP_ID)) {
    pickupLocation = AIRPORT_LOCATION_LABEL;
  } else if (ids.has(PLATFORM_HOTEL_PICKUP_ID) && hotel) {
    pickupLocation = hotel;
  }

  if (ids.has(PLATFORM_AIRPORT_RETURN_ID)) {
    returnLocation = AIRPORT_LOCATION_LABEL;
  } else if (ids.has(PLATFORM_HOTEL_RETURN_ID) && hotel) {
    returnLocation = hotel;
  }

  return { pickupLocation, returnLocation };
}
