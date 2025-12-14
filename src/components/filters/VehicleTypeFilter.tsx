import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { 
  Car, 
  Truck, 
  CarTaxiFront,
  Users,
  Bus,
  TreePine,
  Sun,
  Sparkles,
  Luggage,
  Mountain
} from "lucide-react";

interface VehicleTypeFilterProps {
  selectedTypes: string[];
  onApply: (types: string[]) => void;
  onReset: () => void;
}

const vehicleTypes = [
  { id: 'utilitaire', label: 'Utilitaire', icon: Truck },
  { id: 'citadine', label: 'Citadine', icon: Car },
  { id: 'berline', label: 'Berline', icon: CarTaxiFront },
  { id: 'familiale', label: 'Familiale', icon: Users },
  { id: 'minibus', label: 'Minibus', icon: Bus },
  { id: '4x4', label: '4x4', icon: TreePine },
  { id: 'cabriolet', label: 'Cabriolet', icon: Sun },
  { id: 'coupe', label: 'Coupé', icon: Sparkles },
  { id: 'collection', label: 'Collection', icon: Sparkles },
  { id: 'van', label: 'Van aménagé', icon: Luggage },
  { id: 'suv', label: 'SUV', icon: Mountain },
];

export const VehicleTypeFilter = ({ 
  selectedTypes, 
  onApply, 
  onReset 
}: VehicleTypeFilterProps) => {
  const [localSelected, setLocalSelected] = useState<string[]>(selectedTypes);

  useEffect(() => {
    setLocalSelected(selectedTypes);
  }, [selectedTypes]);

  const toggleType = (typeId: string) => {
    setLocalSelected(prev => 
      prev.includes(typeId) 
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleApply = () => {
    onApply(localSelected);
  };

  const handleReset = () => {
    setLocalSelected([]);
    onReset();
  };

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>TYPE DE VÉHICULE</DrawerTitle>
      </DrawerHeader>
      
      <div className="px-6 pb-6">
        <div className="grid grid-cols-2 gap-3 mb-6">
          {vehicleTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = localSelected.includes(type.id);
            
            return (
              <Button
                key={type.id}
                variant={isSelected ? "default" : "outline"}
                onClick={() => toggleType(type.id)}
                className={`h-auto p-4 justify-start gap-3 transition-all ${
                  isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                aria-pressed={isSelected}
                aria-label={`${isSelected ? 'Désélectionner' : 'Sélectionner'} ${type.label}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{type.label}</span>
              </Button>
            );
          })}
        </div>

        {localSelected.length > 0 && (
          <div>
            <div className="text-sm text-muted-foreground mb-3">
              {localSelected.length} type{localSelected.length > 1 ? 's' : ''} sélectionné{localSelected.length > 1 ? 's' : ''}
            </div>
            <div className="flex flex-wrap gap-2">
              {localSelected.map(typeId => {
                const type = vehicleTypes.find(t => t.id === typeId);
                return type ? (
                  <Badge key={typeId} variant="secondary" className="text-xs">
                    {type.label}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        )}
      </div>

      <DrawerFooter>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="flex-1"
            aria-label="Réinitialiser les types de véhicules"
          >
            Réinitialiser
          </Button>
          <Button 
            onClick={handleApply}
            className="flex-1"
            aria-label="Appliquer les types de véhicules sélectionnés"
          >
            Appliquer
          </Button>
        </div>
      </DrawerFooter>
    </>
  );
};