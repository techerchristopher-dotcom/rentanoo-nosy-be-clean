/** Prix fixe plateforme pour les options aéroport (€, forfait unique). */
export const PLATFORM_AIRPORT_OPTION_PRICE = 16;

export const PLATFORM_AIRPORT_PICKUP_ID = "platform-airport-pickup";
export const PLATFORM_AIRPORT_RETURN_ID = "platform-airport-return";

export interface PlatformBookingOptionDef {
  id: string;
  name: string;
  description: string;
  totalPrice: number;
}

export const PLATFORM_AIRPORT_PICKUP: PlatformBookingOptionDef = {
  id: PLATFORM_AIRPORT_PICKUP_ID,
  name: "Prise en charge à l'aéroport",
  description:
    "Le véhicule vous est remis à l'aéroport de Nosy Be (Fascène)",
  totalPrice: PLATFORM_AIRPORT_OPTION_PRICE,
};

export const PLATFORM_AIRPORT_RETURN: PlatformBookingOptionDef = {
  id: PLATFORM_AIRPORT_RETURN_ID,
  name: "Restitution à l'aéroport",
  description:
    "Vous restituez le véhicule directement à l'aéroport de Nosy Be (Fascène)",
  totalPrice: PLATFORM_AIRPORT_OPTION_PRICE,
};

export const PLATFORM_AIRPORT_OPTIONS: readonly PlatformBookingOptionDef[] = [
  PLATFORM_AIRPORT_PICKUP,
  PLATFORM_AIRPORT_RETURN,
];

/** Anciens IDs liés au véhicule → IDs plateforme (migration brouillon localStorage). */
export const LEGACY_AIRPORT_OPTION_ID_MAP: Record<string, string> = {
  "airport-pickup-retrieval": PLATFORM_AIRPORT_PICKUP_ID,
  "airport-pickup-return": PLATFORM_AIRPORT_RETURN_ID,
};
