import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { VehicleFilters } from "@/types";
import { 
  Fuel, 
  Settings, 
  Snowflake, 
  Baby, 
  Navigation, 
  Bike, 
  Package, 
  Gauge, 
  Smartphone 
} from "lucide-react";

interface AdditionalFiltersProps {
  filters: VehicleFilters;
  onApply: (filters: Partial<VehicleFilters>) => void;
  onReset: () => void;
}

export const AdditionalFilters = ({ 
  filters, 
  onApply, 
  onReset 
}: AdditionalFiltersProps) => {
  const [localFilters, setLocalFilters] = useState<Partial<VehicleFilters>>({
    fuel: filters.fuel,
    transmission: filters.transmission,
    hasAC: filters.hasAC,
    hasBabySeat: filters.hasBabySeat,
    hasGPS: filters.hasGPS,
    hasBikeRack: filters.hasBikeRack,
    hasRoofBox: filters.hasRoofBox,
    hasCruiseControl: filters.hasCruiseControl,
    hasAppleCarPlay: filters.hasAppleCarPlay,
    hasAndroidAuto: filters.hasAndroidAuto,
  });

  useEffect(() => {
    setLocalFilters({
      fuel: filters.fuel,
      transmission: filters.transmission,
      hasAC: filters.hasAC,
      hasBabySeat: filters.hasBabySeat,
      hasGPS: filters.hasGPS,
      hasBikeRack: filters.hasBikeRack,
      hasRoofBox: filters.hasRoofBox,
      hasCruiseControl: filters.hasCruiseControl,
      hasAppleCarPlay: filters.hasAppleCarPlay,
      hasAndroidAuto: filters.hasAndroidAuto,
    });
  }, [filters]);

  const handleFuelChange = (value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      fuel: value === "all" ? undefined : [value as any]
    }));
  };

  const handleTransmissionChange = (value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      transmission: value === "all" ? undefined : [value as any]
    }));
  };

  const handleCheckboxChange = (key: keyof VehicleFilters, checked: boolean) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: checked || undefined
    }));
  };

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleReset = () => {
    const resetFilters = {
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
    };
    setLocalFilters(resetFilters);
    onReset();
  };

  const getActiveCount = () => {
    let count = 0;
    if (localFilters.fuel?.length) count++;
    if (localFilters.transmission?.length) count++;
    if (localFilters.hasAC !== undefined) count++;
    if (localFilters.hasBabySeat !== undefined) count++;
    if (localFilters.hasGPS !== undefined) count++;
    if (localFilters.hasBikeRack !== undefined) count++;
    if (localFilters.hasRoofBox !== undefined) count++;
    if (localFilters.hasCruiseControl !== undefined) count++;
    if (localFilters.hasAppleCarPlay !== undefined) count++;
    if (localFilters.hasAndroidAuto !== undefined) count++;
    return count;
  };

  const equipmentItems = [
    { key: 'hasAC', label: 'Climatisation', icon: Snowflake },
    { key: 'hasBabySeat', label: 'Siège bébé', icon: Baby },
    { key: 'hasGPS', label: 'GPS', icon: Navigation },
    { key: 'hasBikeRack', label: 'Porte-vélos', icon: Bike },
    { key: 'hasRoofBox', label: 'Coffre de toit', icon: Package },
    { key: 'hasCruiseControl', label: 'Régulateur de vitesse', icon: Gauge },
    { key: 'hasAppleCarPlay', label: 'Apple CarPlay', icon: Smartphone },
    { key: 'hasAndroidAuto', label: 'Android Auto', icon: Smartphone },
  ];

  return (
    <>
      <DrawerHeader>
        <DrawerTitle className="flex items-center gap-2">
          FILTRES SUPPLÉMENTAIRES
          {getActiveCount() > 0 && (
            <Badge variant="secondary" className="text-xs">
              {getActiveCount()}
            </Badge>
          )}
        </DrawerTitle>
      </DrawerHeader>
      
      <div className="px-6 pb-6 space-y-6">
        {/* Fuel Type */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Fuel className="w-4 h-4" />
            <label className="text-sm font-medium">Carburant</label>
          </div>
          <Select 
            value={localFilters.fuel?.[0] || "all"} 
            onValueChange={handleFuelChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="gasoline">Essence</SelectItem>
              <SelectItem value="diesel">Diesel</SelectItem>
              <SelectItem value="electric">Électrique</SelectItem>
              <SelectItem value="hybrid">Hybride</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Transmission */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <label className="text-sm font-medium">Transmission</label>
          </div>
          <Select 
            value={localFilters.transmission?.[0] || "all"} 
            onValueChange={handleTransmissionChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="manual">Manuelle</SelectItem>
              <SelectItem value="automatic">Automatique</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Equipment */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Équipements</h4>
          <div className="grid grid-cols-1 gap-4">
            {equipmentItems.map((item) => {
              const Icon = item.icon;
              const isChecked = localFilters[item.key as keyof VehicleFilters] === true;
              
              return (
                <div key={item.key} className="flex items-center space-x-3">
                  <Checkbox
                    id={item.key}
                    checked={isChecked}
                    onCheckedChange={(checked) => 
                      handleCheckboxChange(item.key as keyof VehicleFilters, checked as boolean)
                    }
                    aria-describedby={`${item.key}-label`}
                  />
                  <label 
                    htmlFor={item.key}
                    id={`${item.key}-label`}
                    className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <DrawerFooter>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="flex-1"
            aria-label="Réinitialiser tous les filtres supplémentaires"
          >
            Réinitialiser
          </Button>
          <Button 
            onClick={handleApply}
            className="flex-1"
            aria-label="Appliquer les filtres supplémentaires"
          >
            Appliquer
          </Button>
        </div>
      </DrawerFooter>
    </>
  );
};