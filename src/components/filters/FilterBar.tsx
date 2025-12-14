import { useState } from "react";
import { ChevronDown, DollarSign, Car, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { PriceFilter } from "./PriceFilter";
import { VehicleTypeFilter } from "./VehicleTypeFilter";
import { VehicleCategoryFilter } from "./VehicleCategoryFilter";
import { AdditionalFilters } from "./AdditionalFilters";
import { VehicleFilters } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";

interface FilterBarProps {
  filters: VehicleFilters;
  onFiltersChange: (filters: VehicleFilters) => void;
  vehiclePrices: number[];
}

// Filter bar component with responsive drawers
export const FilterBar = ({ filters, onFiltersChange, vehiclePrices }: FilterBarProps) => {
  const [openDrawer, setOpenDrawer] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) count++;
    if (filters.vehicleTypes?.length) count++;
    if (filters.vehicleCategories?.length) count++;
    if (filters.fuel?.length) count++;
    if (filters.transmission?.length) count++;
    if (filters.hasAC !== undefined) count++;
    if (filters.hasBabySeat !== undefined) count++;
    if (filters.hasGPS !== undefined) count++;
    if (filters.hasBikeRack !== undefined) count++;
    if (filters.hasRoofBox !== undefined) count++;
    if (filters.hasCruiseControl !== undefined) count++;
    if (filters.hasAppleCarPlay !== undefined) count++;
    if (filters.hasAndroidAuto !== undefined) count++;
    return count;
  };

  const handlePriceApply = (priceMin?: number, priceMax?: number) => {
    onFiltersChange({
      ...filters,
      priceMin,
      priceMax
    });
    setOpenDrawer(null);
  };

  const handleVehicleTypeApply = (vehicleTypes: string[]) => {
    onFiltersChange({
      ...filters,
      vehicleTypes: vehicleTypes.length > 0 ? vehicleTypes : undefined
    });
    setOpenDrawer(null);
  };

  const handleVehicleCategoryApply = (categories: string[]) => {
    onFiltersChange({
      ...filters,
      vehicleCategories: categories.length > 0 ? categories : undefined
    });
    setOpenDrawer(null);
  };

  const handleAdditionalFiltersApply = (additionalFilters: Partial<VehicleFilters>) => {
    onFiltersChange({
      ...filters,
      ...additionalFilters
    });
    setOpenDrawer(null);
  };

  const activeFilterCount = getActiveFilterCount();
  const additionalFiltersCount = activeFilterCount - 
    (filters.priceMin !== undefined || filters.priceMax !== undefined ? 1 : 0) -
    (filters.vehicleTypes?.length ? 1 : 0);

  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b mb-6">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="w-4 h-4" />
            Filtres :
          </div>

          {/* Price Filter */}
          <Drawer open={openDrawer === 'price'} onOpenChange={(open) => setOpenDrawer(open ? 'price' : null)}>
            <DrawerTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-10 text-sm"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Prix total
                <ChevronDown className="w-4 h-4 ml-1" />
                {(filters.priceMin !== undefined || filters.priceMax !== undefined) && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    1
                  </Badge>
                )}
              </Button>
            </DrawerTrigger>
            <DrawerContent className={isMobile ? "max-h-[80vh]" : "max-w-md mx-auto"}>
              <PriceFilter
                vehiclePrices={vehiclePrices}
                priceMin={filters.priceMin}
                priceMax={filters.priceMax}
                onApply={handlePriceApply}
                onReset={() => handlePriceApply(undefined, undefined)}
              />
            </DrawerContent>
          </Drawer>

          {/* Vehicle Type Filter */}
          <Drawer open={openDrawer === 'vehicle-type'} onOpenChange={(open) => setOpenDrawer(open ? 'vehicle-type' : null)}>
            <DrawerTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-10 text-sm"
              >
                <Car className="w-4 h-4 mr-2" />
                Type de véhicule
                <ChevronDown className="w-4 h-4 ml-1" />
                {filters.vehicleTypes?.length ? (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {filters.vehicleTypes.length}
                  </Badge>
                ) : null}
              </Button>
            </DrawerTrigger>
            <DrawerContent className={isMobile ? "max-h-[80vh]" : "max-w-md mx-auto"}>
              <VehicleTypeFilter
                selectedTypes={filters.vehicleTypes || []}
                onApply={handleVehicleTypeApply}
                onReset={() => handleVehicleTypeApply([])}
              />
            </DrawerContent>
          </Drawer>

          {/* Vehicle Category Filter */}
          <Drawer open={openDrawer === 'vehicle-category'} onOpenChange={(open) => setOpenDrawer(open ? 'vehicle-category' : null)}>
            <DrawerTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-10 text-sm"
              >
                <Car className="w-4 h-4 mr-2" />
                Catégorie
                <ChevronDown className="w-4 h-4 ml-1" />
                {filters.vehicleCategories?.length ? (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {filters.vehicleCategories.length}
                  </Badge>
                ) : null}
              </Button>
            </DrawerTrigger>
            <DrawerContent className={isMobile ? "max-h-[80vh]" : "max-w-md mx-auto"}>
              <VehicleCategoryFilter
                selectedCategories={filters.vehicleCategories || []}
                onApply={handleVehicleCategoryApply}
                onReset={() => handleVehicleCategoryApply([])}
              />
            </DrawerContent>
          </Drawer>

          {/* Additional Filters */}
          <Drawer open={openDrawer === 'additional'} onOpenChange={(open) => setOpenDrawer(open ? 'additional' : null)}>
            <DrawerTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-10 text-sm"
              >
                <Filter className="w-4 h-4 mr-2" />
                + de filtres
                <ChevronDown className="w-4 h-4 ml-1" />
                {additionalFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {additionalFiltersCount}
                  </Badge>
                )}
              </Button>
            </DrawerTrigger>
            <DrawerContent className={isMobile ? "max-h-[80vh]" : "max-w-md mx-auto"}>
              <AdditionalFilters
                filters={filters}
                onApply={handleAdditionalFiltersApply}
                onReset={() => handleAdditionalFiltersApply({
                  fuel: undefined,
                  transmission: undefined,
                  hasAC: undefined,
                  hasBabySeat: undefined,
                  hasGPS: undefined,
                  hasBikeRack: undefined,
                  hasRoofBox: undefined,
                  hasCruiseControl: undefined,
                  hasAppleCarPlay: undefined,
                  hasAndroidAuto: undefined,
                })}
              />
            </DrawerContent>
          </Drawer>

        </div>
      </div>
    </div>
  );
};