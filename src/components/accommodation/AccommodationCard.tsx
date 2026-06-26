import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Home, Wind, Waves, Umbrella, Wifi, Bath, Shield, ShoppingBag, Music, UtensilsCrossed, Sun, Sparkles, Shirt, Laptop, Tv } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

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
  const [fetchedPhotoUrl, setFetchedPhotoUrl] = useState<string | null>(null);
  const isFetchingFallback = useRef(false);

  useEffect(() => {
    if (primaryPhoto?.url) return;
    let cancelled = false;
    (supabase as any)
      .from("vehicle_photos")
      .select("photo_url, is_primary, display_order")
      .eq("vehicle_id", vehicle.id)
      .not("photo_url", "ilike", "%.heic")
      .order("is_primary", { ascending: false })
      .order("display_order", { ascending: true })
      .limit(1)
      .then(({ data }: any) => {
        if (!cancelled && data?.[0]?.photo_url) {
          setFetchedPhotoUrl(data[0].photo_url);
        }
      });
    return () => { cancelled = true; };
  }, [vehicle.id, primaryPhoto?.url]);

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
          const imageUrl = primaryPhoto?.url || fetchedPhotoUrl || PLACEHOLDER_URL;
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
          {vehicle.hasAC && (
            <div className="flex items-center text-xs text-blue-600 bg-blue-50 rounded-full px-2 py-1">
              <Wind className="h-3 w-3 mr-1" />
              {t("accommodationCard.hasAC", "Climatisation")}
            </div>
          )}
          {vehicle.hasPool && (
            <div className="flex items-center text-xs text-cyan-600 bg-cyan-50 rounded-full px-2 py-1">
              <Waves className="h-3 w-3 mr-1" />
              {t("accommodationCard.hasPool", "Piscine")}
            </div>
          )}
          {vehicle.nearBeach && (
            <div className="flex items-center text-xs text-orange-600 bg-orange-50 rounded-full px-2 py-1">
              <Umbrella className="h-3 w-3 mr-1" />
              {t("accommodationCard.nearBeach", "Proche de la mer")}
            </div>
          )}
          {vehicle.hasWifi && (
            <div className="flex items-center text-xs text-violet-600 bg-violet-50 rounded-full px-2 py-1">
              <Wifi className="h-3 w-3 mr-1" />
              {t("accommodationCard.hasWifi", "WiFi")}
            </div>
          )}
          {vehicle.hasPrivateBathroom && (
            <div className="flex items-center text-xs text-teal-600 bg-teal-50 rounded-full px-2 py-1">
              <Bath className="h-3 w-3 mr-1" />
              {t("accommodationCard.hasPrivateBathroom", "Salle de bain privative")}
            </div>
          )}
          {vehicle.hasSecurityGuard && (
            <div className="flex items-center text-xs text-emerald-600 bg-emerald-50 rounded-full px-2 py-1">
              <Shield className="h-3 w-3 mr-1" />
              {t("accommodationCard.hasSecurityGuard", "Gardien sur place")}
            </div>
          )}
          {vehicle.nearShoppingCenter && (
            <div className="flex items-center text-xs text-purple-600 bg-purple-50 rounded-full px-2 py-1">
              <ShoppingBag className="h-3 w-3 mr-1" />
              {t("accommodationCard.nearShoppingCenter", "Proche centre commercial")}
            </div>
          )}
          {vehicle.nearNightlife && (
            <div className="flex items-center text-xs text-rose-600 bg-rose-50 rounded-full px-2 py-1">
              <Music className="h-3 w-3 mr-1" />
              {t("accommodationCard.nearNightlife", "Proche activités nocturnes")}
            </div>
          )}
          {vehicle.hasEquippedKitchen && (
            <div className="flex items-center text-xs text-amber-600 bg-amber-50 rounded-full px-2 py-1">
              <UtensilsCrossed className="h-3 w-3 mr-1" />
              {t("accommodationCard.hasEquippedKitchen", "Cuisine équipée")}
            </div>
          )}
          {vehicle.hasSolarPanel && (
            <div className="flex items-center text-xs text-yellow-600 bg-yellow-50 rounded-full px-2 py-1">
              <Sun className="h-3 w-3 mr-1" />
              {t("accommodationCard.hasSolarPanel", "Panneau solaire")}
            </div>
          )}
          {vehicle.hasHousekeeper && (
            <div className="flex items-center text-xs text-fuchsia-600 bg-fuchsia-50 rounded-full px-2 py-1">
              <Sparkles className="h-3 w-3 mr-1" />
              {t("accommodationCard.hasHousekeeper", "Femme de ménage")}
            </div>
          )}
          {vehicle.hasLaundry && (
            <div className="flex items-center text-xs text-sky-600 bg-sky-50 rounded-full px-2 py-1">
              <Shirt className="h-3 w-3 mr-1" />
              {t("accommodationCard.hasLaundry", "Blanchisserie")}
            </div>
          )}
          {vehicle.hasRemoteWork && (
            <div className="flex items-center text-xs text-slate-600 bg-slate-50 rounded-full px-2 py-1">
              <Laptop className="h-3 w-3 mr-1" />
              {t("accommodationCard.hasRemoteWork", "Télétravail possible")}
            </div>
          )}
          {vehicle.hasCanalPlus && (
            <div className="flex items-center text-xs text-red-600 bg-red-50 rounded-full px-2 py-1">
              <Tv className="h-3 w-3 mr-1" />
              {t("accommodationCard.hasCanalPlus", "Canal+")}
            </div>
          )}
        </div>

        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1" />
          <VehicleCardRentalPricing
            dailyPrice={vehicle.dailyPrice}
            rentalInfo={rentalInfo}
            priceUnitKey="pricing.perNightShort"
          />
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
            {t("common.voir_la_fiche")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
