import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { MotoVehicleCard } from "@/components/vehicles/moto-vehicle-card";
import { Vehicle, VehicleRentalInfo } from "@/types";
import { Vehicle as SupabaseVehicle } from "@/services/supabaseVehiclesService";
import { mapToCarVehicle, mapToMotoVehicle, mapToAccommodationVehicle } from "@/mappers/vehicleMappers";
import { isMoto, isAccommodation } from "@/utils/vehicleType";
import { AccommodationCard } from "@/components/accommodation/AccommodationCard";
import { getDistinctEngineCapacities } from "@/utils/engineCapacity";

export interface HomeResultsProps {
  filteredVehicles: SupabaseVehicle[];
  loading: boolean;
  vehicles: SupabaseVehicle[];
  selectedVehicleTypes: string[];
  setSelectedVehicleTypes: (v: string[]) => void;
  selectedEngineCapacities: string[];
  setSelectedEngineCapacities: (v: string[]) => void;
  rentalCalculation: { isCalculated: boolean } | null;
  getVehicleRentalInfo: (vehicleId: string, pricePerDay: number) => VehicleRentalInfo;
  onVehicleClick: (vehicle: SupabaseVehicle) => void;
  /** Quand true : loading="lazy" pour toutes les images, pas de fetchPriority (0 image au 1er écran) */
  deferImages?: boolean;
}

export function HomeResults({
  filteredVehicles,
  loading,
  vehicles,
  selectedVehicleTypes,
  setSelectedVehicleTypes,
  selectedEngineCapacities,
  setSelectedEngineCapacities,
  rentalCalculation,
  getVehicleRentalInfo,
  onVehicleClick,
  deferImages = false,
}: HomeResultsProps) {
  const { t } = useTranslation("common");

  const engineCapacityOptions = useMemo(
    () => getDistinctEngineCapacities(vehicles),
    [vehicles]
  );

  const hasActiveFilters =
    selectedVehicleTypes.length > 0 || selectedEngineCapacities.length > 0;

  const resetFilters = () => {
    setSelectedVehicleTypes([]);
    setSelectedEngineCapacities([]);
  };

  return (
    <section id="search-results" className="py-12 scroll-mt-4">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{t("common.filtres")}</span>
            </div>

            <Select
              value={selectedVehicleTypes[0] || ""}
              onValueChange={(value) =>
                setSelectedVehicleTypes(value ? [value] : [])
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scooter">Scooter</SelectItem>
                <SelectItem value="moto">Moto</SelectItem>
                <SelectItem value="accommodation">
                  {t("accommodationCard.filterLabel", "Hébergement")}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={selectedEngineCapacities[0] || ""}
              onValueChange={(value) =>
                setSelectedEngineCapacities(value ? [value] : [])
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Cylindrée" />
              </SelectTrigger>
              <SelectContent>
                {engineCapacityOptions.map((cc) => (
                  <SelectItem key={cc} value={String(cc)}>
                    {cc} cc
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                {t("common.rinitialiser")}
              </Button>
            )}
          </div>
        </div>

        {/* Results */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              {t("common.vhicules_disponibles")}
            </h2>
            <p className="text-muted-foreground">
              {filteredVehicles.length} véhicule{filteredVehicles.length > 1 ? "s" : ""}{" "}
              trouvé{filteredVehicles.length > 1 ? "s" : ""}
            </p>
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
          ) : !loading && filteredVehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVehicles.map((vehicle, index) => {
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
          ) : !loading ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                {filteredVehicles.length === 0 && vehicles.length > 0
                  ? "Aucun véhicule ne correspond à vos critères."
                  : t(
                      "common.aucun_vhicule_disponible_pour_le_moment",
                      "Aucun véhicule disponible pour le moment."
                    )}
              </p>
              {filteredVehicles.length === 0 && vehicles.length > 0 ? (
                <Button variant="outline" onClick={resetFilters}>
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
