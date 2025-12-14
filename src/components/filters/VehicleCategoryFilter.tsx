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
  Mountain,
  Package,
  Car as CarIcon
} from "lucide-react";

interface VehicleCategoryFilterProps {
  selectedCategories: string[];
  onApply: (categories: string[]) => void;
  onReset: () => void;
}

const vehicleCategories = [
  { id: 'Citadine', label: 'Citadine', icon: Car, description: 'Petites voitures urbaines' },
  { id: 'Berline', label: 'Berline', icon: CarTaxiFront, description: 'Voitures de taille moyenne' },
  { id: 'SUV', label: 'SUV', icon: Mountain, description: 'Véhicules tout-terrain' },
  { id: 'Break', label: 'Break', icon: Users, description: 'Voitures familiales' },
  { id: 'Coupé', label: 'Coupé', icon: Sparkles, description: 'Voitures sportives' },
  { id: 'Cabriolet', label: 'Cabriolet', icon: Sun, description: 'Voitures décapotables' },
  { id: 'Utilitaire', label: 'Utilitaire', icon: Truck, description: 'Véhicules commerciaux légers' },
  { id: 'Camionnette', label: 'Camionnette', icon: Package, description: 'Véhicules commerciaux moyens' },
  { id: 'Minibus', label: 'Minibus', icon: Bus, description: 'Transport de personnes' },
  { id: 'Pick-up', label: 'Pick-up', icon: TreePine, description: 'Véhicules avec benne' },
  { id: 'Non spécifié', label: 'Autres', icon: CarIcon, description: 'Autres catégories' },
];

export const VehicleCategoryFilter = ({ 
  selectedCategories, 
  onApply, 
  onReset 
}: VehicleCategoryFilterProps) => {
  const [localSelected, setLocalSelected] = useState<string[]>(selectedCategories);

  useEffect(() => {
    setLocalSelected(selectedCategories);
  }, [selectedCategories]);

  const toggleCategory = (categoryId: string) => {
    setLocalSelected(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
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
        <DrawerTitle className="flex items-center gap-2">
          CATÉGORIE DE VÉHICULE
          {localSelected.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {localSelected.length}
            </Badge>
          )}
        </DrawerTitle>
      </DrawerHeader>
      
      <div className="px-6 pb-6 space-y-4">
        <div className="grid grid-cols-1 gap-3">
          {vehicleCategories.map((category) => {
            const IconComponent = category.icon;
            const isSelected = localSelected.includes(category.id);
            
            return (
              <Button
                key={category.id}
                variant={isSelected ? "default" : "outline"}
                className={`w-full justify-start h-auto p-4 ${
                  isSelected 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "hover:bg-muted"
                }`}
                onClick={() => toggleCategory(category.id)}
              >
                <div className="flex items-center gap-3 w-full">
                  <IconComponent className={`w-5 h-5 ${isSelected ? "text-primary-foreground" : "text-primary"}`} />
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{category.label}</span>
                    <span className={`text-xs ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {category.description}
                    </span>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </div>

      <DrawerFooter className="px-6">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="flex-1"
          >
            Réinitialiser
          </Button>
          <Button 
            onClick={handleApply}
            className="flex-1"
          >
            Appliquer ({localSelected.length})
          </Button>
        </div>
      </DrawerFooter>
    </>
  );
};
