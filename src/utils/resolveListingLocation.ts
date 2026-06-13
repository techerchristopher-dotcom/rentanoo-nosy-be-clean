import type { LocationAreaRef } from "@/types/locationArea";
import { extractAccommodationLocality } from "./accommodationSeo";

export interface ResolveListingLocationInput {
  locationArea?: LocationAreaRef | null;
  pickupZones?: string[] | null;
  model?: string | null;
  description?: string | null;
}

/** Nom affichable du quartier (priorité entité structurée). */
export function resolveListingLocationName(
  input: ResolveListingLocationInput
): string | null {
  if (input.locationArea?.name?.trim()) {
    return input.locationArea.name.trim();
  }

  const fromPickup = input.pickupZones?.find((zone) => {
    const z = zone.trim();
    return z.length > 0 && !["Aéroport", "Barge Petite Terre", "Barge Grande Terre"].includes(z);
  });
  if (fromPickup?.trim()) {
    return fromPickup.trim();
  }

  return extractAccommodationLocality(input.model, input.description);
}
