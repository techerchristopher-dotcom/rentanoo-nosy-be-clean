import { 
  Fuel,           // Essence, Diesel
  Zap,            // Électrique
  Leaf,           // Hybride
  Battery         // Hybride rechargeable
} from 'lucide-react';

export interface FuelType {
  value: string;
  label: string;
  icon: React.ComponentType<any>;
  description?: string;
}

export const FUEL_TYPES: FuelType[] = [
  { 
    value: 'gasoline',
    label: 'Essence', 
    icon: Fuel, 
    description: 'Moteur à essence classique'
  },
  { 
    value: 'diesel',
    label: 'Diesel', 
    icon: Fuel, 
    description: 'Moteur diesel'
  },
  { 
    value: 'electric',
    label: 'Électrique', 
    icon: Zap, 
    description: 'Véhicule 100% électrique'
  },
  { 
    value: 'hybrid',
    label: 'Hybride', 
    icon: Leaf, 
    description: 'Moteur hybride essence/électrique'
  }
];
