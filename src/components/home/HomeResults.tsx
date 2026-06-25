import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { MotoVehicleCard } from "@/components/vehicles/moto-vehicle-card";
import { Vehicle, VehicleRentalInfo } from "@/types";
import { Vehicle as SupabaseVehicle } from "@/services/supabaseVehiclesService";
import {
  mapToCarVehicle,
  mapToMotoVehicle,
  mapToAccommodationVehicle,
} from "@/mappers/vehicleMappers";
import { isMoto, isAccommodation } from "@/utils/vehicleType";
import { AccommodationCard } from "@/components/accommodation/AccommodationCard";
import { ExplorerVisualFilters } from "@/components/explorer/ExplorerVisualFilters";
import { EmptyCategoryState } from "@/components/explorer/EmptyCategoryState";
import type { ExplorerMainCategoryId } from "@/data/explorerFilterConfig";
import { isExplorerMainCategoryId } from "@/utils/explorerFilterUtils";

export interface HomeResultsProps {
  filteredVehicles: SupabaseVehicle[];
  loading: boolean;
  vehicles: SupabaseVehicle[];
  selectedMainCategory: ExplorerMainCategoryId | null;
  selectedSubFilter: string | null;
  onMainCategoryChange: (category: ExplorerMainCategoryId | null) => void;
  onSubFilterChange: (subFilterId: string | null) => void;
  rentalCalculation: { isCalculated: boolean } | null;
  getVehicleRentalInfo: (
    vehicleId: string,
    pricePerDay: number
  ) => VehicleRentalInfo;
  onVehicleClick: (vehicle: SupabaseVehicle) => void;
  onResetFilters: () => void;
  deferImages?: boolean;
}

export function HomeResults({
  filteredVehicles,
  loading,
  vehicles,
  selectedMainCategory,
  selectedSubFilter,
  onMainCategoryChange,
  onSubFilterChange,
  rentalCalculation,
  getVehicleRentalInfo,
  onVehicleClick,
  onResetFilters,
  deferImages = false,
}: HomeResultsProps) {
  const { t } = useTranslation("common");

  const PAGE_SIZE = 9;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Repart de PAGE_SIZE chaque fois que la liste filtrée change (nouvelle recherche/catégorie)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filteredVehicles]);

  const visibleVehicles = filteredVehicles.slice(0, visibleCount);
  const hasMore = visibleCount < filteredVehicles.length;

  const hasExplorerFilter =
    selectedMainCategory != null || selectedSubFilter != null;

  const showExplorerEmpty =
    !loading &&
    hasExplorerFilter &&
    filteredVehicles.length === 0 &&
    selectedMainCategory != null &&
    isExplorerMainCategoryId(selectedMainCategory);

  const resultsTitleKey = useMemo(() => {
    switch (selectedMainCategory) {
      case "accommodation":
        return "homeResults.titleAccommodation";
      case "moto":
        return "homeResults.titleMoto";
      case "quad":
        return "homeResults.titleQuad";
      case "scooter":
        return "homeResults.titleScooter";
      case "car":
        return "homeResults.titleCar";
      default:
        return "homeResults.titleAll";
    }
  }, [selectedMainCategory]);

  const resultsCountKey = useMemo(() => {
    switch (selectedMainCategory) {
      case "accommodation":
        return "homeResults.countAccommodation";
      case "moto":
        return "homeResults.countMoto";
      case "quad":
        return "homeResults.countQuad";
      case "scooter":
        return "homeResults.countScooter";
      case "car":
        return "homeResults.countCar";
      default:
        return "homeResults.countAll";
    }
  }, [selectedMainCategory]);

  const noMatchKey = useMemo(() => {
    if (showExplorerEmpty) return null;
    switch (selectedMainCategory) {
      case "accommodation":
        return "homeResults.noMatchAccommodation";
      case "moto":
        return "homeResults.noMatchMoto";
      case "quad":
        return "homeResults.noMatchQuad";
      case "scooter":
        return "homeResults.noMatchScooter";
      case "car":
        return "homeResults.noMatchCar";
      default:
        return "homeResults.noMatchAll";
    }
  }, [selectedMainCategory, showExplorerEmpty]);

  const emptyKey =
    selectedMainCategory === "accommodation"
      ? "homeResults.emptyAccommodation"
      : "homeResults.emptyAll";

  return (
    <section id="search-results" className="py-12 scroll-mt-4">
      {selectedMainCategory != null && (
        <div id={`section-${selectedMainCategory}`} aria-hidden="true" />
      )}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <ExplorerVisualFilters
            vehicles={vehicles}
            selectedMainCategory={selectedMainCategory}
            selectedSubFilter={selectedSubFilter}
            onMainCategoryChange={onMainCategoryChange}
            onSubFilterChange={onSubFilterChange}
            onResetFilters={onResetFilters}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {t(resultsTitleKey)}
            </h2>
            {!showExplorerEmpty ? (
              <p className="text-muted-foreground">
                {t(resultsCountKey, { count: filteredVehicles.length })}
              </p>
            ) : null}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-[4/3] bg-muted" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-3 bg-muted rounded mb-4 w-2/3" />
                    <div className="flex gap-2 mb-4">
                      <div className="h-6 bg-muted rounded-full w-16" />
                      <div className="h-6 bg-muted rounded-full w-16" />
                    </div>
                    <div className="h-8 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : showExplorerEmpty ? (
            <EmptyCategoryState
              categoryType={selectedMainCategory}
              subCategory={selectedSubFilter}
            />
          ) : !loading && filteredVehicles.length > 0 ? (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleVehicles.map((vehicle, index) => {
                const vehicleRentalInfo = rentalCalculation?.isCalculated
                  ? getVehicleRentalInfo(vehicle.id, vehicle.price_per_day)
                  : undefined;

                const isAccommodationVehicle = isAccommodation(vehicle);
                const isMotoVehicle = isMoto(vehicle);
                const mappedVehicle: Vehicle = isAccommodationVehicle
                  ? mapToAccommodationVehicle(vehicle)
                  : isMotoVehicle
                    ? mapToMotoVehicle(vehicle)
                    : mapToCarVehicle(vehicle);

                const primaryPhoto = vehicle.primaryPhotoUrl
                  ? {
                      id: vehicle.id,
                      vehicleId: vehicle.id,
                      url: vehicle.primaryPhotoUrl,
                      angle: "front" as const,
                      position: 1,
                      isPrimary: true,
                      createdAt: "",
                    }
                  : null;

                return isAccommodationVehicle ? (
                  <AccommodationCard
                    key={vehicle.id}
                    vehicle={mappedVehicle}
                    primaryPhoto={primaryPhoto}
                    rentalInfo={vehicleRentalInfo}
                    onClick={() => onVehicleClick(vehicle)}
                    index={index}
                    deferImages={deferImages}
                  />
                ) : isMotoVehicle ? (
                  <MotoVehicleCard
                    key={vehicle.id}
                    vehicle={mappedVehicle}
                    primaryPhoto={primaryPhoto}
                    rentalInfo={vehicleRentalInfo}
                    onClick={() => onVehicleClick(vehicle)}
                    index={index}
                    deferImages={deferImages}
                  />
                ) : (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={mappedVehicle}
                    primaryPhoto={primaryPhoto}
                    rentalInfo={vehicleRentalInfo}
                    onClick={() => onVehicleClick(vehicle)}
                    index={index}
                    deferImages={deferImages}
                  />
                );
              })}
            </div>
            {hasMore ? (
              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                >
                  {t("common.voir_plus", "Voir plus")}
                </Button>
              </div>
            ) : null}
            </>
          ) : !loading ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                {filteredVehicles.length === 0 && vehicles.length > 0 && noMatchKey
                  ? t(noMatchKey)
                  : t(emptyKey)}
              </p>
              {filteredVehicles.length === 0 && vehicles.length > 0 ? (
                <Button variant="outline" onClick={onResetFilters}>
                  {t("common.rinitialiser_les_filtres")}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  {t("common.actualiser_la_page")}
                </Button>
              )}
            </Card>
          ) : null}
        </div>
      </div>
    </section>
  );
}
