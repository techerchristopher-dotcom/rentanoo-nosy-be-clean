import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Plus, X } from 'lucide-react';
import { Snowflake, Navigation, Gauge, Bluetooth, Smartphone, Music, Camera, Usb, Armchair, Sun, Speaker, Bike, Zap, ScanLine, CircleSlash, Package, Box } from 'lucide-react';
import { EquipmentModal } from '@/components/ui/equipment-modal';

interface EquipmentSelectorProps {
  equipment: {
    hasAC: boolean;
    hasGPS: boolean;
    hasCruiseControl: boolean;
    hasBluetooth: boolean;
    hasCarPlay: boolean;
    hasAudioInput: boolean;
    hasBackupCamera: boolean;
    hasUSBPort: boolean;
    hasLeatherSeats: boolean;
    hasSunroof: boolean;
    hasPremiumAudio: boolean;
    hasRoofRack: boolean;
    hasWirelessCharger: boolean;
    hasParkingSensors: boolean;
    hasABS: boolean;
    hasLargeTrunk: boolean;
    hasRoofBox: boolean;
    hasBikeRack: boolean;
    hasAndroidAuto: boolean;
  };
  onEquipmentChange: (equipment: {
    hasAC: boolean;
    hasGPS: boolean;
    hasCruiseControl: boolean;
    hasBluetooth: boolean;
    hasCarPlay: boolean;
    hasAudioInput: boolean;
    hasBackupCamera: boolean;
    hasUSBPort: boolean;
    hasLeatherSeats: boolean;
    hasSunroof: boolean;
    hasPremiumAudio: boolean;
    hasRoofRack: boolean;
    hasWirelessCharger: boolean;
    hasParkingSensors: boolean;
    hasABS: boolean;
    hasLargeTrunk: boolean;
    hasRoofBox: boolean;
    hasBikeRack: boolean;
    hasAndroidAuto: boolean;
  }) => void;
}

// Mapping des équipements
const EQUIPMENT_MAP: Record<string, { label: string; icon: any; color: string }> = {
  hasAC: { label: 'Climatisation', icon: Snowflake, color: 'text-blue-500' },
  hasGPS: { label: 'GPS', icon: Navigation, color: 'text-green-500' },
  hasBluetooth: { label: 'Bluetooth', icon: Bluetooth, color: 'text-blue-600' },
  hasCarPlay: { label: 'Apple CarPlay', icon: Smartphone, color: 'text-gray-600' },
  hasUSBPort: { label: 'Port USB / Prise 12V', icon: Usb, color: 'text-yellow-600' },
  hasLargeTrunk: { label: 'Grand coffre', icon: Package, color: 'text-gray-500' },
  hasAndroidAuto: { label: 'Android Auto', icon: Smartphone, color: 'text-green-600' },
  hasWirelessCharger: { label: 'Chargeur sans fil', icon: Zap, color: 'text-purple-600' },
  hasAudioInput: { label: 'Entrée audio', icon: Music, color: 'text-purple-500' },
  hasPremiumAudio: { label: 'Système audio premium', icon: Speaker, color: 'text-red-500' },
  hasCruiseControl: { label: 'Régulateur de vitesse', icon: Gauge, color: 'text-orange-500' },
  hasBackupCamera: { label: 'Caméra de recul', icon: Camera, color: 'text-indigo-500' },
  hasParkingSensors: { label: 'Aide au stationnement', icon: ScanLine, color: 'text-cyan-500' },
  hasABS: { label: 'ABS', icon: CircleSlash, color: 'text-red-600' },
  hasLeatherSeats: { label: 'Sièges en cuir', icon: Armchair, color: 'text-amber-700' },
  hasSunroof: { label: 'Toit ouvrant', icon: Sun, color: 'text-yellow-500' },
  hasRoofRack: { label: 'Barres de toit', icon: Box, color: 'text-slate-600' },
  hasRoofBox: { label: 'Coffre de toit', icon: Package, color: 'text-slate-700' },
  hasBikeRack: { label: 'Porte-vélos', icon: Bike, color: 'text-green-700' }
};

const EquipmentSelector: React.FC<EquipmentSelectorProps> = ({ equipment, onEquipmentChange }) => {
  // Convertir l'objet equipment en tableau de clés sélectionnées
  const selectedEquipmentKeys = Object.keys(equipment).filter(
    key => equipment[key as keyof typeof equipment] === true
  );

  // Gérer le changement d'équipements depuis la modal
  const handleEquipmentChange = (equipmentKeys: string[]) => {
    const newEquipment = { ...equipment };
    // Réinitialiser tous les équipements à false
    Object.keys(newEquipment).forEach(key => {
      newEquipment[key as keyof typeof newEquipment] = false as any;
    });
    // Activer les équipements sélectionnés
    equipmentKeys.forEach(key => {
      if (key in newEquipment) {
        newEquipment[key as keyof typeof newEquipment] = true as any;
      }
    });
    onEquipmentChange(newEquipment);
  };

  // Supprimer un équipement
  const handleRemoveEquipment = (equipmentKey: string) => {
    onEquipmentChange({
      ...equipment,
      [equipmentKey]: false
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          Équipements
        </h3>
        {selectedEquipmentKeys.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {selectedEquipmentKeys.length} sélectionné{selectedEquipmentKeys.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Affichage des équipements sélectionnés */}
      {selectedEquipmentKeys.length > 0 ? (
        <div className="flex flex-wrap gap-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
          {selectedEquipmentKeys.map((equipmentKey) => {
            const equipmentInfo = EQUIPMENT_MAP[equipmentKey];
            if (!equipmentInfo) return null;
            const IconComponent = equipmentInfo.icon;
            return (
              <Badge
                key={equipmentKey}
                variant="secondary"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm"
              >
                <IconComponent className={`h-3.5 w-3.5 ${equipmentInfo.color}`} />
                {equipmentInfo.label}
                <button
                  onClick={() => handleRemoveEquipment(equipmentKey)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      ) : (
        <div className="p-4 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/30 text-center">
          <p className="text-sm text-muted-foreground">
            Aucun équipement sélectionné
          </p>
        </div>
      )}

      {/* Bouton pour ouvrir la modal */}
      <EquipmentModal
        selectedEquipment={selectedEquipmentKeys}
        onEquipmentChange={handleEquipmentChange}
        trigger={
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2 text-sm font-medium border-dashed hover:border-solid"
          >
            <Plus className="h-4 w-4" />
            {selectedEquipmentKeys.length > 0 ? 'Modifier les équipements' : 'Ajouter des équipements'}
          </Button>
        }
      />
    </div>
  );
};

export default EquipmentSelector;
