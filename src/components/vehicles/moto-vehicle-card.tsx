import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Fuel,
  Settings,
  MapPin,
  Users,
  Gauge,
  Plane,
  Ship,
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

interface MotoVehicleCardProps {
  vehicle: Vehicle;
  primaryPhoto?: Photo | null;
  onClick?: () => void;
  className?: string;
  rentalInfo?: VehicleRentalInfo;
  /** Index dans la liste pour déterminer si lazy-load (0 = eager, autres = lazy) */
  index?: number;
  /** Si true : loading="lazy" pour toutes les images, pas de fetchPriority (0 image au 1er écran) */
  deferImages?: boolean;
}

const PLACEHOLDER_URL =
  "https://images.unsplash.com/photo-1549924231-f129b911e442?w=800&h=600&fit=crop";

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

export function MotoVehicleCard({
  vehicle,
  primaryPhoto,
  onClick,
  className,
  rentalInfo,
  index = 0,
  deferImages = false,
}: MotoVehicleCardProps) {
  const { t } = useTranslation();

  const [fallbackImageUrl, setFallbackImageUrl] = useState<string | null>(null);
  const isFetchingFallback = useRef(false);

  const handleImageError = async (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;

    // Guard: éviter les boucles - si fallback déjà appliqué, ne rien faire
    if (img.dataset.fallbackApplied === "1") {
      return;
    }

    if (img.src === PLACEHOLDER_URL) {
      return;
    }

    if (fallbackImageUrl) {
      img.src = fallbackImageUrl;
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      img.dataset.fallbackApplied = "1";
      return;
    }

    if (isFetchingFallback.current) {
      img.src = PLACEHOLDER_URL;
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      img.dataset.fallbackApplied = "1";
      return;
    }

    isFetchingFallback.current = true;

    try {
      const { data: availablePhotos, error } = await PhotoService.getVehiclePhotos(
        vehicle.id
      );

      if (error || !availablePhotos || availablePhotos.length === 0) {
        setFallbackImageUrl(PLACEHOLDER_URL);
        img.src = PLACEHOLDER_URL;
        img.removeAttribute("srcset");
        img.removeAttribute("sizes");
        img.dataset.fallbackApplied = "1";
        return;
      }

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
      console.error(
        "Erreur lors de la récupération des photos de fallback (moto):",
        error
      );
      setFallbackImageUrl(PLACEHOLDER_URL);
      img.src = PLACEHOLDER_URL;
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      img.dataset.fallbackApplied = "1";
    } finally {
      isFetchingFallback.current = false;
    }
  };

  const seats = vehicle.seats;
  const hasSeats = typeof seats === "number" && seats > 0;
  const engineCapacity = vehicle.engineCapacity as string | undefined;
  const fuel = vehicle.fuel as string | undefined;
  const transmission = vehicle.transmission as string | undefined;

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
          {/* Places */}
          <div className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
            <Users className="h-3 w-3 mr-1" />
            {hasSeats
              ? t("vehicle.places", { count: seats })
              : t("common.not_specified")}
          </div>

          {/* Cylindrée */}
          {engineCapacity && (
            <div className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
              <Gauge className="h-3 w-3 mr-1" />
              {engineCapacity} cc
            </div>
          )}

          {/* Carburant */}
          <div className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
            <Fuel className="h-3 w-3 mr-1" />
            {fuel
              ? t(`vehicle.fuel.${fuel}`)
              : t("common.not_specified")}
          </div>

          {/* Transmission */}
          <div className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
            <Settings className="h-3 w-3 mr-1" />
            {transmission
              ? t(`vehicle.transmission.${transmission}`)
              : t("common.not_specified")}
          </div>
        </div>

        {/* Location & Price */}
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mr-1 shrink-0" />
              <span className="truncate">
                {vehicle.location && vehicle.location.length > 0
                  ? vehicle.location
                  : t("default_location")}
              </span>
            </div>
          </div>

          <VehicleCardRentalPricing dailyPrice={vehicle.dailyPrice} rentalInfo={rentalInfo} />
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
            {t("voir_la_fiche")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}


