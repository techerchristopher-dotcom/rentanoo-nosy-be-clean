import { useTranslation } from "react-i18next";
import { MapPin, Users, Home } from "lucide-react";

import type { LocationAreaRef } from "@/types/locationArea";
import { resolveListingLocationName } from "@/utils/resolveListingLocation";

interface AccommodationHighlightsProps {
  location?: string | null;
  locationArea?: LocationAreaRef | null;
  seats?: number | null;
  category?: string | null;
}

export function AccommodationHighlights({
  location,
  locationArea,
  seats,
  category,
}: AccommodationHighlightsProps) {
  const { t } = useTranslation("common");

  const hasSeats = typeof seats === "number" && seats > 0;
  const locationLabel =
    resolveListingLocationName({ locationArea }) ||
    (location?.trim() ? location.trim() : null) ||
    t("common.not_specified", "Non spécifié");
  const capacityLabel = hasSeats
    ? t("vehicle.places", { count: seats })
    : t("common.not_specified", "Non spécifié");
  const typeLabel =
    category && category.trim().length > 0
      ? category
      : t("common.not_specified", "Non spécifié");

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5">
        <MapPin className="h-4 w-4 shrink-0" />
        <span>{locationLabel}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5">
        <Users className="h-4 w-4 shrink-0" />
        <span>{capacityLabel}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-full px-3 py-1.5">
        <Home className="h-4 w-4 shrink-0" />
        <span>{typeLabel}</span>
      </div>
    </div>
  );
}
