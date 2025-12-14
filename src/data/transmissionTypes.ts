import { 
  Cog,            // Automatique (engrenages)
  Gear            // Alternative pour manuelle
} from 'lucide-react';
import { ManualTransmissionIcon } from '@/components/icons/ManualTransmissionIcon';
import { AutomaticTransmissionIcon } from '@/components/icons/AutomaticTransmissionIcon';

export interface TransmissionType {
  value: string;
  label: string;
  icon: React.ComponentType<any>;
  description?: string;
}

export const TRANSMISSION_TYPES: TransmissionType[] = [
  { 
    value: 'manual',
    label: 'Manuelle', 
    icon: ManualTransmissionIcon, 
    description: 'Transmission manuelle avec embrayage'
  },
  { 
    value: 'automatic',
    label: 'Automatique', 
    icon: AutomaticTransmissionIcon, 
    description: 'Transmission automatique sans embrayage'
  }
];
