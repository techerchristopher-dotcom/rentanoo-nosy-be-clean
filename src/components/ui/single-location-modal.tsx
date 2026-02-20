import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Plane, Ship, X, Check, Star, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { NOSYBE_STRATEGIC_POINTS, NOSYBE_LOCATIONS, getLocationIcon } from '@/data/locations';

interface SingleLocationModalProps {
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  trigger: React.ReactNode;
  placeholder?: string;
}

export const SingleLocationModal: React.FC<SingleLocationModalProps> = ({
  selectedLocation,
  onLocationChange,
  trigger,
  placeholder = "Sélectionner un lieu de prise en charge"
}) => {
  const {
    t: t,
  } = useTranslation('common');

  const [isOpen, setIsOpen] = useState(false);
  const [tempSelectedLocation, setTempSelectedLocation] = useState<string>(selectedLocation);

  const handleLocationSelect = (location: string) => {
    setTempSelectedLocation(location);
  };

  const handleSave = () => {
    onLocationChange(tempSelectedLocation);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempSelectedLocation(selectedLocation);
    setIsOpen(false);
  };

  const handleClear = () => {
    setTempSelectedLocation('');
    onLocationChange('');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MapPin className="h-5 w-5 text-primary" />
            Lieu de prise en charge
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">{t('common.slectionnez_le_lieu_o_vous_souhaitez_rcuprer_votre')}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Action de suppression */}
          {tempSelectedLocation && (
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  Lieu sélectionné : <strong>{tempSelectedLocation}</strong>
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="text-xs text-destructive hover:text-destructive"
              >
                <X className="h-3 w-3 mr-1" />
                Effacer
              </Button>
            </div>
          )}

          {/* Points stratégiques */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-2">
              <Star className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-primary">{t('common.points_stratgiques')}</h4>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {NOSYBE_STRATEGIC_POINTS.map((location) => {
                const IconComponent = getLocationIcon(location);
                const isSelected = tempSelectedLocation === location;
                return (
                  <div
                    key={location}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary/10 border-primary/30 shadow-sm'
                        : 'bg-background border-border hover:bg-muted/50'
                    }`}
                    onClick={() => handleLocationSelect(location)}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="pointer-events-none"
                    />
                    <IconComponent className={`h-5 w-5 ${
                      isSelected ? 'text-primary' : 'text-foreground/70'
                    }`} />
                    <span className={`flex-1 text-sm font-medium ${
                      isSelected ? 'text-primary font-semibold' : 'text-foreground'
                    }`}>
                      {location}
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
              <h4 className="text-sm font-semibold text-secondary-foreground">{t('common.communes')}</h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {NOSYBE_LOCATIONS.map((location) => {
                const IconComponent = getLocationIcon(location);
                const isSelected = tempSelectedLocation === location;
                return (
                  <div
                    key={location}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary/10 border-primary/30 shadow-sm'
                        : 'bg-background border-border hover:bg-muted/50'
                    }`}
                    onClick={() => handleLocationSelect(location)}
                  >
                    <Checkbox
                      checked={isSelected}
                      className="pointer-events-none"
                    />
                    <IconComponent className={`h-4 w-4 ${
                      isSelected ? 'text-primary' : 'text-foreground/70'
                    }`} />
                    <span className={`flex-1 text-xs font-medium ${
                      isSelected ? 'text-primary font-semibold' : 'text-foreground'
                    }`}>
                      {location}
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
          >{t('common.annuler')}</Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!tempSelectedLocation}
            className="bg-primary hover:bg-primary/90"
          >{t('common.valider')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
