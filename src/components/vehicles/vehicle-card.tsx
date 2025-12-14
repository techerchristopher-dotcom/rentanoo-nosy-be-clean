import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Car, 
  Fuel, 
  Settings, 
  Wind, 
  MapPin, 
  Euro,
  Users,
  Plane,
  Ship
} from "lucide-react";
import { Vehicle, Photo, VehicleRentalInfo } from "@/types";
import { cn } from "@/lib/utils";

interface VehicleCardProps {
  vehicle: Vehicle;
  primaryPhoto?: Photo | null;
  onClick?: () => void;
  className?: string;
  rentalInfo?: VehicleRentalInfo; // Informations de location (optionnel)
}

const fuelIcons = {
  gasoline: Fuel,
  diesel: Fuel,
  electric: Car,
  hybrid: Car
};

const fuelLabels = {
  gasoline: "Essence",
  diesel: "Diesel", 
  electric: "Électrique",
  hybrid: "Hybride"
};

const transmissionLabels = {
  manual: "Manuelle",
  automatic: "Automatique"
};

// Fonction pour obtenir l'icône appropriée selon la zone
const getLocationIcon = (zone: string) => {
  switch (zone) {
    case "Aéroport":
      return Plane;
    case "Barge Petite Terre":
    case "Barge Grande Terre":
      return Ship;
    default:
      return MapPin;
  }
};

export function VehicleCard({ vehicle, primaryPhoto, onClick, className, rentalInfo }: VehicleCardProps) {
  const FuelIcon = fuelIcons[vehicle.fuel] || Fuel;
  
  // Formater l'affichage du prix (avec ou sans calcul de location)
  const displayPrice = rentalInfo?.formattedPrice || `${vehicle.dailyPrice}€ par jour`;

  return (
    <Card 
      className={cn(
        "overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lagoon hover:scale-[1.02] bg-gradient-to-br from-card to-card/50",
        className
      )}
      onClick={onClick}
    >
      {/* Image */}
      <div className="aspect-[4/3] relative overflow-hidden">
        <img
          src={primaryPhoto?.url || "https://images.unsplash.com/photo-1549924231-f129b911e442?w=800&h=600&fit=crop"}
          alt={`${vehicle.brand} ${vehicle.model}`}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        />
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm">
            {vehicle.license}
          </Badge>
        </div>
        <div className="absolute top-3 right-3">
          {vehicle.hasAC && (
            <Badge variant="secondary" className="bg-primary-soft/20 backdrop-blur-sm text-primary">
              <Wind className="h-3 w-3 mr-1" />
              Clim
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="p-4">
        {/* Title & Year */}
        <div className="mb-3">
          <h3 className="font-semibold text-lg text-foreground">
            {vehicle.brand} {vehicle.model}
          </h3>
          <p className="text-sm text-muted-foreground">
            {vehicle.year} • {vehicle.color}
          </p>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
            <FuelIcon className="h-3 w-3 mr-1" />
            {fuelLabels[vehicle.fuel] || "Non spécifié"}
          </div>
          <div className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
            <Settings className="h-3 w-3 mr-1" />
            {transmissionLabels[vehicle.transmission] || "Non spécifié"}
          </div>
          <div className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
            <Users className="h-3 w-3 mr-1" />
            {vehicle.doors} portes
          </div>
        </div>

        {/* Zones de prise en charge & Price */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {vehicle.location && vehicle.location !== "Mamoudzou, Mayotte" ? (
              <div className="flex flex-wrap gap-1">
                {vehicle.location.split(', ').slice(0, 2).map((zone, index) => {
                  const IconComponent = getLocationIcon(zone.trim());
                  return (
                    <div key={index} className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
                      <IconComponent className="h-3 w-3 mr-1" />
                      <span className="truncate">{zone.trim()}</span>
                    </div>
                  );
                })}
                {vehicle.location.split(', ').length > 2 && (
                  <div className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
                    <span>+{vehicle.location.split(', ').length - 2}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mr-1" />
                <span>Mayotte</span>
              </div>
            )}
          </div>
          
          <div className="text-right ml-2">
            {rentalInfo ? (
              // Affichage avec calcul de location
              <div className="flex flex-col items-end">
                <div className="flex items-center text-2xl font-bold text-primary">
                  <Euro className="h-5 w-5" />
                  {vehicle.dailyPrice}
                </div>
                <div className="text-xs text-muted-foreground">par jour</div>
                <div className="text-sm text-muted-foreground mt-1">
                  soit {rentalInfo.totalCost}€ ({rentalInfo.formattedPrice.match(/\((.*?)\)/)?.[1] || 'Total'})
                </div>
              </div>
            ) : (
              // Affichage par défaut sans calcul
              <>
                <div className="flex items-center text-2xl font-bold text-primary">
                  <Euro className="h-5 w-5" />
                  {vehicle.dailyPrice}
                </div>
                <div className="text-xs text-muted-foreground">par jour</div>
              </>
            )}
          </div>
        </div>

        {/* CTA Button */}
        {onClick && (
          <Button 
            className="w-full mt-4 bg-gradient-lagoon hover:opacity-90 shadow-soft"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            Voir la fiche
          </Button>
        )}
      </CardContent>
    </Card>
  );
}