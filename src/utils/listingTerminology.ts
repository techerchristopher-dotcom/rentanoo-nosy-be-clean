import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { isAccommodation, isMoto } from "@/utils/vehicleType";

export type ListingKind = "accommodation" | "moto" | "car";

export function getListingKind(
  v: { vehicle_type?: string | null; vehicleType?: string | null } | null | undefined
): ListingKind {
  if (isAccommodation(v)) return "accommodation";
  if (isMoto(v)) return "moto";
  return "car";
}

export function getListingKindFromFilter(filter: string | undefined): ListingKind | null {
  if (filter === "accommodation") return "accommodation";
  if (filter === "moto" || filter === "scooter") return "moto";
  return null;
}

function termsKey(kind: ListingKind, suffix: string): string {
  return `listingTerms.${kind}.${suffix}`;
}

export function formatListingTitle(
  kind: ListingKind,
  brand: string,
  model: string
): string {
  if (kind === "accommodation") return model.trim();
  return `${brand} ${model}`.trim();
}

export function getHomeToastKeys(filter: string | undefined): {
  resultsFound: string;
  noResultsDescription: string;
} {
  switch (filter) {
    case "accommodation":
      return {
        resultsFound: "home.toasts.resultsFoundAccommodation",
        noResultsDescription: "home.toasts.noResults.descriptionAccommodation",
      };
    case "moto":
      return {
        resultsFound: "home.toasts.resultsFoundMoto",
        noResultsDescription: "home.toasts.noResults.descriptionMoto",
      };
    case "scooter":
      return {
        resultsFound: "home.toasts.resultsFoundScooter",
        noResultsDescription: "home.toasts.noResults.descriptionScooter",
      };
    case "car":
      return {
        resultsFound: "home.toasts.resultsFound",
        noResultsDescription: "home.toasts.noResults.description",
      };
    default:
      return {
        resultsFound: "home.toasts.resultsFound",
        noResultsDescription: "home.toasts.noResults.description",
      };
  }
}

export function useListingTerms(kind: ListingKind = "car") {
  const { t } = useTranslation("common");

  return useMemo(
    () => ({
      kind,
      statsVehicles: t(termsKey(kind, "statsVehicles")),
      statsThis: t(termsKey(kind, "statsThis")),
      rentalLabel: t(termsKey(kind, "rentalLabel")),
      startDateLabel: t(termsKey(kind, "startDateLabel")),
      endDateLabel: t(termsKey(kind, "endDateLabel")),
      perNightSuffix: t(termsKey(kind, "perNight")),
      pickupLocationLabel: t(termsKey(kind, "pickupLocation")),
      returnLocationLabel: t(termsKey(kind, "returnLocation")),
      formatListingTitle: (brand: string, model: string) =>
        formatListingTitle(kind, brand, model),
      reviewSample1Meta: t(termsKey(kind, "reviews.sample1.meta")),
      reviewSample1Text: t(termsKey(kind, "reviews.sample1.text")),
      reviewSample2Meta: t(termsKey(kind, "reviews.sample2.meta")),
      reviewSample2Text: t(termsKey(kind, "reviews.sample2.text")),
    }),
    [kind, t]
  );
}
