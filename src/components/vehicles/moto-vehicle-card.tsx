import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Fuel,
  Settings,
  MapPin,
  Euro,
  Users,
  Gauge,
  Plane,
  Ship,
} from "lucide-react";
import { Vehicle, Photo, VehicleRentalInfo } from "@/types";
import { cn } from "@/lib/utils";
import { PhotoService } from "@/services/supabase/photos";
import { formatDuration } from "@/utils/formatDuration";
import { formatCurrency } from "@/utils/currency";

interface MotoVehicleCardProps {
  vehicle: Vehicle;
  primaryPhoto?: Photo | null;
  onClick?: () => void;
  className?: string;
  rentalInfo?: VehicleRentalInfo;
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
}: MotoVehicleCardProps) {
  const { t } = useTranslation();

  const [fallbackImageUrl, setFallbackImageUrl] = useState<string | null>(null);
  const isFetchingFallback = useRef(false);

  const handleImageError = async (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;

    if (img.src === PLACEHOLDER_URL) {
      return;
    }

    if (fallbackImageUrl) {
      img.src = fallbackImageUrl;
      return;
    }

    if (isFetchingFallback.current) {
      img.src = PLACEHOLDER_URL;
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
        return;
      }

      const firstValidPhoto = availablePhotos[0];
      if (firstValidPhoto && firstValidPhoto.url) {
        setFallbackImageUrl(firstValidPhoto.url);
        img.src = firstValidPhoto.url;
      } else {
        setFallbackImageUrl(PLACEHOLDER_URL);
        img.src = PLACEHOLDER_URL;
      }
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des photos de fallback (moto):",
        error
      );
      setFallbackImageUrl(PLACEHOLDER_URL);
      img.src = PLACEHOLDER_URL;
    } finally {
      isFetchingFallback.current = false;
    }
  };

  const seats = vehicle.seats;
  const hasSeats = typeof seats === "number" && seats > 0;
  const engineCapacity = vehicle.engineCapacity as string | undefined;
  const fuel = vehicle.fuel as string | undefined;
  const transmission = vehicle.transmission as string | undefined;
  const durationLabel =
    rentalInfo && typeof rentalInfo.days === "number" && typeof rentalInfo.hours === "number"
      ? formatDuration(t, rentalInfo.days, rentalInfo.hours)
      : null;

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
          src={primaryPhoto?.url || PLACEHOLDER_URL}
          alt={`${vehicle.brand} ${vehicle.model}`}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          onError={handleImageError}
        />
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
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="truncate">
                {vehicle.location && vehicle.location.length > 0
                  ? vehicle.location
                  : t("default_location")}
              </span>
            </div>
          </div>

          <div className="text-right ml-2">
            {rentalInfo ? (
              // Affichage avec calcul de location (aligné comme voiture)
              <div className="flex flex-col items-end">
                <div className="flex items-center text-2xl font-bold text-primary">
                  <Euro className="h-5 w-5" />
                  {vehicle.dailyPrice}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("par_jour")}
                </div>
                {durationLabel && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(rentalInfo.pricePerDay)}/{t("par_jour")} × {durationLabel || ""}
                  </div>
                )}
              </div>
            ) : (
              // Affichage par défaut sans calcul
              <>
                <div className="flex items-center text-2xl font-bold text-primary">
                  <Euro className="h-5 w-5" />
                  {vehicle.dailyPrice}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("par_jour")}
                </div>
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
            {t("voir_la_fiche")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}


