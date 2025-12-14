import React, { useState, useEffect, useRef } from 'react';
import { Settings, X, Check, Star, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Snowflake, Navigation, Gauge, Bluetooth, Smartphone, Music, Camera, Usb, Armchair, Sun, Speaker, Bike, Zap, ScanLine, CircleSlash, Package, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface EquipmentModalProps {
  selectedEquipment: string[];
  onEquipmentChange: (equipment: string[]) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Définition des équipements avec leurs icônes et couleurs
const ESSENTIAL_EQUIPMENT = [
  { key: 'hasAC', label: 'Climatisation', icon: Snowflake, color: 'text-blue-500' },
  { key: 'hasGPS', label: 'GPS', icon: Navigation, color: 'text-green-500' },
  { key: 'hasBluetooth', label: 'Bluetooth', icon: Bluetooth, color: 'text-blue-600' },
  { key: 'hasCarPlay', label: 'Apple CarPlay', icon: Smartphone, color: 'text-gray-600' },
  { key: 'hasUSBPort', label: 'Port USB / Prise 12V', icon: Usb, color: 'text-yellow-600' },
  { key: 'hasLargeTrunk', label: 'Grand coffre', icon: Package, color: 'text-gray-500' },
];

const ADDITIONAL_EQUIPMENT = [
  { key: 'hasAndroidAuto', label: 'Android Auto', icon: Smartphone, color: 'text-green-600' },
  { key: 'hasWirelessCharger', label: 'Chargeur sans fil', icon: Zap, color: 'text-purple-600' },
  { key: 'hasAudioInput', label: 'Entrée audio', icon: Music, color: 'text-purple-500' },
  { key: 'hasPremiumAudio', label: 'Système audio premium', icon: Speaker, color: 'text-red-500' },
  { key: 'hasCruiseControl', label: 'Régulateur de vitesse', icon: Gauge, color: 'text-orange-500' },
  { key: 'hasBackupCamera', label: 'Caméra de recul', icon: Camera, color: 'text-indigo-500' },
  { key: 'hasParkingSensors', label: 'Aide au stationnement', icon: ScanLine, color: 'text-cyan-500' },
  { key: 'hasABS', label: 'ABS', icon: CircleSlash, color: 'text-red-600' },
  { key: 'hasLeatherSeats', label: 'Sièges en cuir', icon: Armchair, color: 'text-amber-700' },
  { key: 'hasSunroof', label: 'Toit ouvrant', icon: Sun, color: 'text-yellow-500' },
  { key: 'hasRoofRack', label: 'Barres de toit', icon: Box, color: 'text-slate-600' },
  { key: 'hasRoofBox', label: 'Coffre de toit', icon: Package, color: 'text-slate-700' },
  { key: 'hasBikeRack', label: 'Porte-vélos', icon: Bike, color: 'text-green-700' }
];

export const EquipmentModal: React.FC<EquipmentModalProps> = ({
  selectedEquipment,
  onEquipmentChange,
  trigger,
  open,
  onOpenChange
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  const [tempSelectedEquipment, setTempSelectedEquipment] = useState<string[]>(selectedEquipment);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const additionalOptionsRef = useRef<HTMLDivElement>(null);

  // Synchroniser tempSelectedEquipment avec selectedEquipment quand la modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setTempSelectedEquipment(selectedEquipment);
    }
  }, [isOpen, selectedEquipment]);

  // Scroll automatique vers les options supplémentaires quand elles s'affichent
  useEffect(() => {
    if (showMoreOptions && additionalOptionsRef.current) {
      setTimeout(() => {
        additionalOptionsRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }, 100); // Petit délai pour laisser le DOM se mettre à jour
    }
  }, [showMoreOptions]);

  const handleEquipmentToggle = (equipmentKey: string) => {
    setTempSelectedEquipment(prev => 
      prev.includes(equipmentKey) 
        ? prev.filter(e => e !== equipmentKey)
        : [...prev, equipmentKey]
    );
  };

  const handleSave = () => {
    onEquipmentChange(tempSelectedEquipment);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempSelectedEquipment(selectedEquipment);
    setIsOpen(false);
  };

  const handleSelectAll = () => {
    const allKeys = [...ESSENTIAL_EQUIPMENT, ...ADDITIONAL_EQUIPMENT].map(e => e.key);
    setTempSelectedEquipment(allKeys);
  };

  const handleClearAll = () => {
    setTempSelectedEquipment([]);
  };

  const getEquipmentIcon = (equipmentKey: string) => {
    const equipment = [...ESSENTIAL_EQUIPMENT, ...ADDITIONAL_EQUIPMENT].find(e => e.key === equipmentKey);
    return equipment ? equipment.icon : Settings;
  };

  const getEquipmentLabel = (equipmentKey: string) => {
    const equipment = [...ESSENTIAL_EQUIPMENT, ...ADDITIONAL_EQUIPMENT].find(e => e.key === equipmentKey);
    return equipment ? equipment.label : equipmentKey;
  };

  const getEquipmentColor = (equipmentKey: string) => {
    const equipment = [...ESSENTIAL_EQUIPMENT, ...ADDITIONAL_EQUIPMENT].find(e => e.key === equipmentKey);
    return equipment ? equipment.color : 'text-gray-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5 text-primary" />
            Équipements du véhicule
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Sélectionnez les équipements disponibles dans votre véhicule
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Actions rapides */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {tempSelectedEquipment.length} équipement{tempSelectedEquipment.length > 1 ? 's' : ''} sélectionné{tempSelectedEquipment.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
              >
                Tout sélectionner
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-xs"
              >
                Tout effacer
              </Button>
            </div>
          </div>

          {/* Équipements sélectionnés */}
          {tempSelectedEquipment.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Équipements sélectionnés</h4>
              <div className="flex flex-wrap gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                {tempSelectedEquipment.map((equipmentKey) => {
                  const IconComponent = getEquipmentIcon(equipmentKey);
                  const color = getEquipmentColor(equipmentKey);
                  return (
                    <Badge
                      key={equipmentKey}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1"
                    >
                      <IconComponent className={`h-3 w-3 ${color}`} />
                      {getEquipmentLabel(equipmentKey)}
                      <button
                        onClick={() => handleEquipmentToggle(equipmentKey)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Équipements essentiels */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-2">
              <Star className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-primary">Équipements essentiels</h4>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {ESSENTIAL_EQUIPMENT.map((equipment) => {
                const IconComponent = equipment.icon;
                const isSelected = tempSelectedEquipment.includes(equipment.key);
                return (
                  <div
                    key={equipment.key}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary/10 border-primary/30 shadow-sm'
                        : 'bg-background border-border hover:bg-muted/50'
                    }`}
                    onClick={() => handleEquipmentToggle(equipment.key)}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="pointer-events-none"
                    />
                    <IconComponent className={`h-5 w-5 ${
                      isSelected ? equipment.color : 'text-muted-foreground'
                    }`} />
                    <span className={`flex-1 text-sm font-medium ${
                      isSelected ? 'text-primary' : 'text-foreground'
                    }`}>
                      {equipment.label}
                    </span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bouton Voir plus d'options */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            className="w-full flex items-center justify-center gap-2 text-sm font-medium"
          >
            {showMoreOptions ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Voir moins d'options
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Voir plus d'options ({ADDITIONAL_EQUIPMENT.length})
              </>
            )}
          </Button>

          {/* Équipements supplémentaires */}
          {showMoreOptions && (
            <div ref={additionalOptionsRef} className="space-y-2">
              <div className="flex items-center gap-2 px-2">
                <Plus className="h-4 w-4 text-secondary-foreground" />
                <h4 className="text-sm font-semibold text-secondary-foreground">Options supplémentaires</h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {ADDITIONAL_EQUIPMENT.map((equipment) => {
                  const IconComponent = equipment.icon;
                  const isSelected = tempSelectedEquipment.includes(equipment.key);
                  return (
                    <div
                      key={equipment.key}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'bg-primary/10 border-primary/30 shadow-sm'
                          : 'bg-background border-border hover:bg-muted/50'
                      }`}
                      onClick={() => handleEquipmentToggle(equipment.key)}
                    >
                      <Checkbox
                        checked={isSelected}
                        className="pointer-events-none"
                      />
                      <IconComponent className={`h-4 w-4 ${
                        isSelected ? equipment.color : 'text-muted-foreground'
                      }`} />
                      <span className={`flex-1 text-xs font-medium ${
                        isSelected ? 'text-primary' : 'text-foreground'
                      }`}>
                        {equipment.label}
                      </span>
                      {isSelected && (
                        <Check className="h-3 w-3 text-primary" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="bg-primary hover:bg-primary/90"
          >
            Valider ({tempSelectedEquipment.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

