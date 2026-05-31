import React, { useState, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Car, 
  Fuel, 
  Settings, 
  Wind, 
  MapPin, 
  Users,
  Plane,
  Ship
} from "lucide-react";
import { Vehicle, Photo, VehicleRentalInfo } from "@/types";
import { cn } from "@/lib/utils";
import { PhotoService } from "@/services/supabase/photos";
import { VehicleCardRentalPricing } from "@/components/vehicles/VehicleCardRentalPricing";
import { 
  getOptimizedImageUrl, 
  generateSrcSet, 
  IMAGE_SIZES, 
  IMAGE_WIDTHS 
} from "@/utils/imageOptimization";

interface VehicleCardProps {
  vehicle: Vehicle;
  primaryPhoto?: Photo | null;
  onClick?: () => void;
  className?: string;
  rentalInfo?: VehicleRentalInfo; // Informations de location (optionnel)
  /** Index dans la liste pour déterminer si lazy-load (0 = eager, autres = lazy) */
  index?: number;
  /** Si true : loading="lazy" pour toutes les images, pas de fetchPriority (0 image au 1er écran) */
  deferImages?: boolean;
}

const fuelIcons = {
  gasoline: Fuel,
  diesel: Fuel,
  electric: Car,
  hybrid: Car
};

const PLACEHOLDER_URL =
  "https://images.unsplash.com/photo-1549924231-f129b911e442?w=800&h=600&fit=crop";

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

export function VehicleCard({ vehicle, primaryPhoto, onClick, className, rentalInfo, index = 0, deferImages = false }: VehicleCardProps) {
  const { t } = useTranslation('common');

  const fuelLabels = {
    gasoline: t("vehicle.fuel.gasoline"),
    diesel: t("vehicle.fuel.diesel"),
    electric: t("vehicle.fuel.electric"),
    hybrid: t("vehicle.fuel.hybrid"),
  };

  const transmissionLabels = {
    manual: t("vehicle.transmission.manual"),
    automatic: t("vehicle.transmission.automatic"),
  };

  const FuelIcon = fuelIcons[vehicle.fuel] || Fuel;

  // State pour stocker l'URL de fallback (photo suivante ou placeholder)
  const [fallbackImageUrl, setFallbackImageUrl] = useState<string | null>(null);
  const isFetchingFallback = useRef(false);

  const handleImageError = async (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    
    // Guard: éviter les boucles - si fallback déjà appliqué, ne rien faire
    if (img.dataset.fallbackApplied === "1") {
      return;
    }

    // Si on est déjà sur le placeholder, ne rien faire
    if (img.src === PLACEHOLDER_URL) {
      return;
    }

    // Si on a déjà un fallback en mémoire, l'utiliser
    if (fallbackImageUrl) {
      img.src = fallbackImageUrl;
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      img.dataset.fallbackApplied = "1";
      return;
    }

    // Éviter les appels multiples simultanés
    if (isFetchingFallback.current) {
      img.src = PLACEHOLDER_URL;
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      img.dataset.fallbackApplied = "1";
      return;
    }

    isFetchingFallback.current = true;

    try {
      // Plan B : Récupérer toutes les photos disponibles dans le Storage
      const { data: availablePhotos, error } = await PhotoService.getVehiclePhotos(vehicle.id);

      if (error || !availablePhotos || availablePhotos.length === 0) {
        // Aucune photo disponible → placeholder
        setFallbackImageUrl(PLACEHOLDER_URL);
        img.src = PLACEHOLDER_URL;
        img.removeAttribute("srcset");
        img.removeAttribute("sizes");
        img.dataset.fallbackApplied = "1";
        return;
      }

      // Prendre la première photo disponible (qui existe vraiment dans le Storage)
      const firstValidPhoto = availablePhotos[0];
      if (firstValidPhoto && firstValidPhoto.url) {
        setFallbackImageUrl(firstValidPhoto.url);
        img.src = firstValidPhoto.url;
        img.removeAttribute("srcset");
        img.removeAttribute("sizes");
        img.dataset.fallbackApplied = "1";
      } else {
        setFallbackImageUrl(PLACEHOLDER_URL);
        img.src = PLACEHOLDER_URL;
        img.removeAttribute("srcset");
        img.removeAttribute("sizes");
        img.dataset.fallbackApplied = "1";
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des photos de fallback:', error);
      setFallbackImageUrl(PLACEHOLDER_URL);
      img.src = PLACEHOLDER_URL;
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      img.dataset.fallbackApplied = "1";
    } finally {
      isFetchingFallback.current = false;
    }
  };

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
        {(() => {
          const imageUrl = primaryPhoto?.url || PLACEHOLDER_URL;
          const isSupabaseUrl = imageUrl.includes('supabase.co/storage');
          const srcSet = isSupabaseUrl ? generateSrcSet(imageUrl, IMAGE_WIDTHS.CARD) : undefined;
          const sizes = IMAGE_SIZES.CARD_GRID;
          const optimizedSrc = isSupabaseUrl ? getOptimizedImageUrl(imageUrl, 400) : imageUrl;
          // deferImages: tout en lazy, pas de fetchPriority (0 image au 1er écran)
          const loading = deferImages ? 'lazy' : (index < 3 ? 'eager' : 'lazy');
          const fetchPriority = deferImages ? undefined : (index === 0 ? 'high' : undefined);

          return (
            <img
              src={optimizedSrc}
              srcSet={srcSet}
              sizes={sizes}
              alt={`${vehicle.brand} ${vehicle.model}`}
              width={400}
              height={300}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              loading={loading}
              {...(fetchPriority ? { fetchPriority } : {})}
              decoding="async"
              onError={handleImageError}
            />
          );
        })()}
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
            {vehicle.location && vehicle.location !== "Nosy Be, Madagascar" ? (
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
                <span>{t('common.nosy_be', 'Nosy Be, Madagascar')}</span>
              </div>
            )}
          </div>
          
          <div className="text-right ml-2">
            <VehicleCardRentalPricing dailyPrice={vehicle.dailyPrice} rentalInfo={rentalInfo} />
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
          >{t('common.voir_la_fiche')}</Button>
        )}
      </CardContent>
    </Card>
  );
}