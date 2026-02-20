import React, { useState, useEffect } from 'react';
import { MapPin, Plane, Ship, X, Check, Star, Building } from 'lucide-react';
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
import { NOSYBE_STRATEGIC_POINTS, NOSYBE_LOCATIONS, getLocationIcon } from '@/data/locations';

interface PickupZonesModalProps {
  selectedZones: string[];
  onZonesChange: (zones: string[]) => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const PickupZonesModal: React.FC<PickupZonesModalProps> = ({
  selectedZones,
  onZonesChange,
  trigger,
  open,
  onOpenChange
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;
  const [tempSelectedZones, setTempSelectedZones] = useState<string[]>(selectedZones);

  // Synchroniser tempSelectedZones avec selectedZones quand la modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setTempSelectedZones(selectedZones);
    }
  }, [isOpen, selectedZones]);

  const handleZoneToggle = (zone: string) => {
    setTempSelectedZones(prev => 
      prev.includes(zone) 
        ? prev.filter(z => z !== zone)
        : [...prev, zone]
    );
  };

  const handleSave = () => {
    onZonesChange(tempSelectedZones);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempSelectedZones(selectedZones);
    setIsOpen(false);
  };

  const handleSelectAll = () => {
    setTempSelectedZones([...NOSYBE_STRATEGIC_POINTS, ...NOSYBE_LOCATIONS]);
  };

  const handleClearAll = () => {
    setTempSelectedZones([]);
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
            <MapPin className="h-5 w-5 text-primary" />
            Zones de prise en charge
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Sélectionnez les zones où vous acceptez de prendre en charge vos clients
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Actions rapides */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {tempSelectedZones.length} zone{tempSelectedZones.length > 1 ? 's' : ''} sélectionnée{tempSelectedZones.length > 1 ? 's' : ''}
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

          {/* Zones sélectionnées */}
          {tempSelectedZones.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Zones sélectionnées</h4>
              <div className="flex flex-wrap gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                {tempSelectedZones.map((zone) => {
                  const IconComponent = getLocationIcon(zone);
                  return (
                    <Badge
                      key={zone}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1"
                    >
                      <IconComponent className="h-3 w-3" />
                      {zone}
                      <button
                        onClick={() => handleZoneToggle(zone)}
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

          {/* Points stratégiques */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-2">
              <Star className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-primary">Points stratégiques</h4>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {NOSYBE_STRATEGIC_POINTS.map((zone) => {
                const IconComponent = getLocationIcon(zone);
                const isSelected = tempSelectedZones.includes(zone);
                return (
                  <div
                    key={zone}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary/10 border-primary/30 shadow-sm'
                        : 'bg-background border-border hover:bg-muted/50'
                    }`}
                    onClick={() => handleZoneToggle(zone)}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="pointer-events-none"
                    />
                    <IconComponent className={`h-5 w-5 ${
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <span className={`flex-1 text-sm font-medium ${
                      isSelected ? 'text-primary' : 'text-foreground'
                    }`}>
                      {zone}
                    </span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Communes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-2">
              <Building className="h-4 w-4 text-secondary-foreground" />
              <h4 className="text-sm font-semibold text-secondary-foreground">Communes</h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NOSYBE_LOCATIONS.map((zone) => {
                const IconComponent = getLocationIcon(zone);
                const isSelected = tempSelectedZones.includes(zone);
                return (
                  <div
                    key={zone}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary/10 border-primary/30 shadow-sm'
                        : 'bg-background border-border hover:bg-muted/50'
                    }`}
                    onClick={() => handleZoneToggle(zone)}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="pointer-events-none"
                    />
                    <IconComponent className={`h-4 w-4 ${
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                    <span className={`flex-1 text-xs font-medium ${
                      isSelected ? 'text-primary' : 'text-foreground'
                    }`}>
                      {zone}
                    </span>
                    {isSelected && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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
            Valider ({tempSelectedZones.length})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
