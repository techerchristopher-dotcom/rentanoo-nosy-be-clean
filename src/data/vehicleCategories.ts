import { Car, Truck } from 'lucide-react';

export interface VehicleCategory {
  name: string;
  icon: React.ComponentType<any>;
  examples: string[];
}

export const VEHICLE_CATEGORIES: VehicleCategory[] = [
  { 
    name: 'Berline', 
    icon: Car, 
    examples: ['308', 'Mégane', 'Corolla'] 
  },
  { 
    name: 'Break (SW)', 
    icon: Car, 
    examples: ['308 SW', 'Mégane Estate'] 
  },
  { 
    name: 'Cabriolet', 
    icon: Car, 
    examples: ['208 CC', 'TT Roadster'] 
  },
  { 
    name: 'Citadine', 
    icon: Car, 
    examples: ['208', 'Clio', 'Yaris', 'Polo'] 
  },
  { 
    name: 'Coupé', 
    icon: Car, 
    examples: ['RCZ', 'TT', 'GT86'] 
  },
  { 
    name: 'Coupé 4 portes / GT', 
    icon: Car, 
    examples: ['A5 Sportback', 'Série 4 GC'] 
  },
  { 
    name: 'Crossover', 
    icon: Car, 
    examples: ['3008', 'Qashqai', 'C-HR'] 
  },
  { 
    name: 'Minibus', 
    icon: Truck, 
    examples: ['Sprinter', 'Transit', 'Trafic'] 
  },
  { 
    name: 'Monospace', 
    icon: Truck, 
    examples: ['Espace', 'Scenic', 'Zafira'] 
  },
  { 
    name: 'Pick-up', 
    icon: Truck, 
    examples: ['Hilux', 'Ranger', 'Navara'] 
  },
  { 
    name: 'Roadster', 
    icon: Car, 
    examples: ['MX-5', 'Z4', 'Boxster'] 
  },
  { 
    name: 'SUV', 
    icon: Car, 
    examples: ['5008', 'X3', 'Tucson', 'RAV4'] 
  },
  { 
    name: 'Supercar / Hypercar', 
    icon: Car, 
    examples: ['911', 'R8', 'Ferrari', 'Lamborghini'] 
  },
  { 
    name: 'Utilitaire', 
    icon: Truck, 
    examples: ['Partner', 'Kangoo'] 
  }
];