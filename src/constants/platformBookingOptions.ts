/** Prix fixe plateforme pour les options aéroport (MGA, forfait unique — équivalent historique ~16 €). */
export const PLATFORM_AIRPORT_OPTION_PRICE = 80_000;

/** Prix fixe plateforme pour les options hôtel (MGA, forfait unique — équivalent historique ~10 €). */
export const PLATFORM_HOTEL_OPTION_PRICE = 50_000;

export const PLATFORM_AIRPORT_PICKUP_ID = "platform-airport-pickup";
export const PLATFORM_AIRPORT_RETURN_ID = "platform-airport-return";
export const PLATFORM_HOTEL_PICKUP_ID = "platform-hotel-pickup";
export const PLATFORM_HOTEL_RETURN_ID = "platform-hotel-return";

export const AIRPORT_LOCATION_LABEL = "Aéroport de Nosy Be (Fascène)";
export const AGENCY_LOCATION_LABEL = "Agence Rentanoo";

export interface PlatformBookingOptionDef {
  id: string;
  name: string;
  description: string;
  totalPrice: number;
}

export const PLATFORM_AIRPORT_PICKUP: PlatformBookingOptionDef = {
  id: PLATFORM_AIRPORT_PICKUP_ID,
  name: "Prise en charge à l'aéroport",
  description: "Le véhicule vous est remis à l'aéroport de Nosy Be (Fascène)",
  totalPrice: PLATFORM_AIRPORT_OPTION_PRICE,
};

export const PLATFORM_AIRPORT_RETURN: PlatformBookingOptionDef = {
  id: PLATFORM_AIRPORT_RETURN_ID,
  name: "Restitution à l'aéroport",
  description: "Vous restituez le véhicule directement à l'aéroport de Nosy Be (Fascène)",
  totalPrice: PLATFORM_AIRPORT_OPTION_PRICE,
};

export const PLATFORM_HOTEL_PICKUP: PlatformBookingOptionDef = {
  id: PLATFORM_HOTEL_PICKUP_ID,
  name: "Prise en charge à l'hôtel",
  description: "Le véhicule vous est livré directement à votre hôtel",
  totalPrice: PLATFORM_HOTEL_OPTION_PRICE,
};

export const PLATFORM_HOTEL_RETURN: PlatformBookingOptionDef = {
  id: PLATFORM_HOTEL_RETURN_ID,
  name: "Restitution à l'hôtel",
  description: "Vous restituez le véhicule directement à votre hôtel",
  totalPrice: PLATFORM_HOTEL_OPTION_PRICE,
};

export const PLATFORM_AIRPORT_OPTIONS: readonly PlatformBookingOptionDef[] = [
  PLATFORM_AIRPORT_PICKUP,
  PLATFORM_AIRPORT_RETURN,
];

export const PLATFORM_HOTEL_OPTIONS: readonly PlatformBookingOptionDef[] = [
  PLATFORM_HOTEL_PICKUP,
  PLATFORM_HOTEL_RETURN,
];

/** Toutes les options plateforme transport (aéroport + hôtel). */
export const PLATFORM_TRANSPORT_OPTIONS: readonly PlatformBookingOptionDef[] = [
  ...PLATFORM_AIRPORT_OPTIONS,
  ...PLATFORM_HOTEL_OPTIONS,
];

export const PLATFORM_TRANSPORT_PICKUP_IDS = [
  PLATFORM_AIRPORT_PICKUP_ID,
  PLATFORM_HOTEL_PICKUP_ID,
] as const;

export const PLATFORM_TRANSPORT_RETURN_IDS = [
  PLATFORM_AIRPORT_RETURN_ID,
  PLATFORM_HOTEL_RETURN_ID,
] as const;

/** Anciens IDs liés au véhicule → IDs plateforme (migration brouillon localStorage). */
export const LEGACY_AIRPORT_OPTION_ID_MAP: Record<string, string> = {
  "airport-pickup-retrieval": PLATFORM_AIRPORT_PICKUP_ID,
  "airport-pickup-return": PLATFORM_AIRPORT_RETURN_ID,
};

export interface PlatformBookingOptionPayload {
  id: string;
  name: string;
  pricePerDay: number;
  totalPrice: number;
}

export function isPlatformTransportOption(id: string): boolean {
  return PLATFORM_TRANSPORT_OPTIONS.some((opt) => opt.id === id);
}

export function isPlatformPickupOption(id: string): boolean {
  return (PLATFORM_TRANSPORT_PICKUP_IDS as readonly string[]).includes(id);
}

export function isPlatformReturnOption(id: string): boolean {
  return (PLATFORM_TRANSPORT_RETURN_IDS as readonly string[]).includes(id);
}

/** Construit le payload `selected_options` à partir des IDs cochés (prix plateforme). */
export function buildPlatformOptionPayload(
  selectedIds: Iterable<string>
): PlatformBookingOptionPayload[] {
  const idSet = new Set(selectedIds);
  return PLATFORM_TRANSPORT_OPTIONS.filter((opt) => idSet.has(opt.id)).map((opt) => ({
    id: opt.id,
    name: opt.name,
    pricePerDay: 0,
    totalPrice: opt.totalPrice,
  }));
}

export function platformOptionsTotal(selectedIds: Iterable<string>): number {
  return buildPlatformOptionPayload(selectedIds).reduce((sum, opt) => sum + opt.totalPrice, 0);
}

/** Exclusivité pickup : aéroport vs hôtel. */
export function resolvePickupExclusion(toggledId: string, current: string[]): string[] {
  if (!isPlatformPickupOption(toggledId)) return current;
  return current.filter(
    (id) => !isPlatformPickupOption(id) || id === toggledId
  );
}

/** Exclusivité return : aéroport vs hôtel. */
export function resolveReturnExclusion(toggledId: string, current: string[]): string[] {
  if (!isPlatformReturnOption(toggledId)) return current;
  return current.filter(
    (id) => !isPlatformReturnOption(id) || id === toggledId
  );
}
