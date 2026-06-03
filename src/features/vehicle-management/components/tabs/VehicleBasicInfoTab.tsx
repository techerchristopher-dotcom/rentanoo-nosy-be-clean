import { Settings, Gauge, Wind, Navigation, Bluetooth, Smartphone, Volume2, Phone, Camera, Users, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { VehicleFormData } from "../../types/vehicle-form.types";

interface VehicleBasicInfoTabProps {
  formData: VehicleFormData;
}

/**
 * Composant d'affichage des informations de base du véhicule (lecture seule)
 * Extrait de ManageVehicle.tsx pour améliorer la modularité
 */
export function VehicleBasicInfoTab({ formData }: VehicleBasicInfoTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Informations véhicule
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ces informations sont liées à votre véhicule et ne peuvent pas être modifiées.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informations générales */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-4 flex flex-wrap items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Informations générales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Marque</Label>
              <div className="p-3 bg-muted/50 rounded-lg border">
                <span className="font-medium">{formData.brand}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Modèle</Label>
              <div className="p-3 bg-muted/50 rounded-lg border">
                <span className="font-medium">{formData.model}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Année</Label>
              <div className="p-3 bg-muted/50 rounded-lg border">
                <span className="font-medium">{formData.year}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Couleur</Label>
              <div className="p-3 bg-muted/50 rounded-lg border">
                <span className="font-medium">{formData.color}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Caractéristiques techniques */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-4 flex flex-wrap items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Caractéristiques techniques
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Kilométrage</Label>
              <div className="p-3 bg-muted/50 rounded-lg border">
                <span className="font-medium">{parseInt(formData.mileage || '0').toLocaleString()} km</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Carburant</Label>
              <div className="p-3 bg-muted/50 rounded-lg border">
                <span className="font-medium">
                  {formData.fuel === 'gasoline' ? 'Essence' : 
                   formData.fuel === 'diesel' ? 'Diesel' : 
                   formData.fuel === 'electric' ? 'Électrique' : 
                   formData.fuel === 'hybrid' ? 'Hybride' : 'Non spécifié'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Transmission</Label>
              <div className="p-3 bg-muted/50 rounded-lg border">
                <span className="font-medium">
                  {formData.transmission === 'manual' ? 'Manuelle' : 
                   formData.transmission === 'automatic' ? 'Automatique' : 'Non spécifiée'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Nombre de places</Label>
              <div className="p-3 bg-muted/50 rounded-lg border">
                <span className="font-medium">{formData.seats}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Nombre de portes</Label>
              <div className="p-3 bg-muted/50 rounded-lg border">
                <span className="font-medium">{formData.doors}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Équipements & Options */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-4 flex flex-wrap items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Équipements & Options
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {formData.hasAC && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <Wind className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Climatisation</span>
              </div>
            )}
            {formData.hasGPS && (
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                <Navigation className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">GPS</span>
              </div>
            )}
            {formData.hasCruiseControl && (
              <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                <Gauge className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Régulateur</span>
              </div>
            )}
            {formData.hasBluetooth && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <Bluetooth className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Bluetooth</span>
              </div>
            )}
            {formData.hasCarPlay && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <Smartphone className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">CarPlay</span>
              </div>
            )}
            {formData.hasAndroidAuto && (
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                <Smartphone className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Android Auto</span>
              </div>
            )}
            {formData.hasAudioInput && (
              <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                <Volume2 className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Entrée audio</span>
              </div>
            )}
            {formData.hasBackupCamera && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <Camera className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Caméra de recul</span>
              </div>
            )}
            {formData.hasUSBPort && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <Phone className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Port USB</span>
              </div>
            )}
            {formData.hasLeatherSeats && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                <Users className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium">Sièges cuir</span>
              </div>
            )}
            {formData.hasSunroof && (
              <div className="flex items-center gap-2 p-2 bg-sky-50 rounded-lg border border-sky-200">
                <Settings className="h-4 w-4 text-sky-600" />
                <span className="text-sm font-medium">Toit ouvrant</span>
              </div>
            )}
            {formData.hasPremiumAudio && (
              <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                <Volume2 className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Audio premium</span>
              </div>
            )}
            {formData.hasWirelessCharger && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <Phone className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Chargeur sans fil</span>
              </div>
            )}
            {formData.hasParkingSensors && (
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Capteurs parking</span>
              </div>
            )}
            {formData.hasABS && (
              <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
                <Shield className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">ABS</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

