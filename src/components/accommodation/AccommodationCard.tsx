import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Home } from "lucide-react";
import { Vehicle, Photo, VehicleRentalInfo } from "@/types";
import { cn } from "@/lib/utils";
import { PhotoService } from "@/services/supabase/photos";
import { VehicleCardRentalPricing } from "@/components/vehicles/VehicleCardRentalPricing";
import {
  getOptimizedImageUrl,
  generateSrcSet,
  IMAGE_SIZES,
  IMAGE_WIDTHS,
} from "@/utils/imageOptimization";

interface AccommodationCardProps {
  vehicle: Vehicle;
  primaryPhoto?: Photo | null;
  onClick?: () => void;
  className?: string;
  rentalInfo?: VehicleRentalInfo;
  index?: number;
  deferImages?: boolean;
}

const PLACEHOLDER_URL =
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop";

export function AccommodationCard({
  vehicle,
  primaryPhoto,
  onClick,
  className,
  rentalInfo,
  index = 0,
  deferImages = false,
}: AccommodationCardProps) {
  const { t } = useTranslation("common");
  const [fallbackImageUrl, setFallbackImageUrl] = useState<string | null>(null);
  const isFetchingFallback = useRef(false);

  const handleImageError = async (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (img.dataset.fallbackApplied === "1") return;
    if (img.src === PLACEHOLDER_URL) return;

    if (fallbackImageUrl) {
      img.src = fallbackImageUrl;
      img.removeAttribute("srcset");
      img.removeAttribute("sizes");
      img.dataset.fallbackApplied = "1";
      return;
    }

    if (isFetchingFallback.current) {
      img.src = PLACEHOLDER_URL;
      img.dataset.fallbackApplied = "1";
      return;
    }

    isFetchingFallback.current = true;
    try {
      const { data: availablePhotos, error } = await PhotoService.getVehiclePhotos(vehicle.id);
      if (error || !availablePhotos?.length) {
        img.src = PLACEHOLDER_URL;
        img.dataset.fallbackApplied = "1";
        return;
      }
      const url = availablePhotos[0]?.url || PLACEHOLDER_URL;
      setFallbackImageUrl(url);
      img.src = url;
      img.dataset.fallbackApplied = "1";
    } catch {
      img.src = PLACEHOLDER_URL;
      img.dataset.fallbackApplied = "1";
    } finally {
      isFetchingFallback.current = false;
    }
  };

  const seats = vehicle.seats;
  const hasSeats = typeof seats === "number" && seats > 0;
  const displayName = vehicle.model || `${vehicle.brand} ${vehicle.model}`.trim();
  const typeLabel =
    vehicle.vehicleCategory?.trim() ||
    t("accommodationCard.typeFallback", "Hébergement");

  return (
    <Card
      className={cn(
        "overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lagoon hover:scale-[1.02] bg-gradient-to-br from-card to-card/50",
        className
      )}
      onClick={onClick}
    >
      <div className="aspect-[4/3] relative overflow-hidden">
        {(() => {
          const imageUrl = primaryPhoto?.url || PLACEHOLDER_URL;
          const isSupabaseUrl = imageUrl.includes("supabase.co/storage");
          const srcSet = isSupabaseUrl ? generateSrcSet(imageUrl, IMAGE_WIDTHS.CARD) : undefined;
          const optimizedSrc = isSupabaseUrl ? getOptimizedImageUrl(imageUrl, 400) : imageUrl;
          const loading = deferImages ? "lazy" : index < 3 ? "eager" : "lazy";
          const fetchPriority = deferImages ? undefined : index === 0 ? "high" : undefined;

          return (
            <img
              src={optimizedSrc}
              srcSet={srcSet}
              sizes={IMAGE_SIZES.CARD_GRID}
              alt={displayName}
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
        <div className="mb-3">
          <h3 className="font-semibold text-lg text-foreground">{displayName}</h3>
          <p className="text-sm text-muted-foreground">{typeLabel}</p>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {vehicle.location && (
            <div className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
              <MapPin className="h-3 w-3 mr-1" />
              <span className="truncate max-w-[140px]">{vehicle.location}</span>
            </div>
          )}
          <div className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
            <Users className="h-3 w-3 mr-1" />
            {hasSeats
              ? t("vehicle.places", { count: seats })
              : t("common.not_specified")}
          </div>
          <div className="flex items-center text-xs text-muted-foreground bg-muted/50 rounded-full px-2 py-1">
            <Home className="h-3 w-3 mr-1" />
            {typeLabel}
          </div>
        </div>

        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1" />
          <VehicleCardRentalPricing
            dailyPrice={vehicle.dailyPrice}
            rentalInfo={rentalInfo}
            priceUnitKey="pricing.perNightShort"
          />
        </div>
      </CardContent>
    </Card>
  );
}
