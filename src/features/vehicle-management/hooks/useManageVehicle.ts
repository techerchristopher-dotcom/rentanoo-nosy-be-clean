import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Vehicle } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { SupabaseVehiclesService } from "@/services/supabaseVehiclesService";
import { ListingOwnersService } from "@/services/supabase/listingOwners";
import {
  VehicleFormData,
  VehicleValidationErrors,
  UseManageVehicleReturn,
  initialFormData,
} from "../types/vehicle-form.types";

/**
 * Hook pour gérer le state et le chargement du formulaire de véhicule
 * 
 * Étape 2B.1 : Maintenant gère aussi le chargement du véhicule depuis Supabase
 * 
 * @param vehicleId - ID du véhicule à charger (optionnel)
 * @returns État et actions pour gérer le formulaire
 */
export function useManageVehicle(
  vehicleId?: string
): UseManageVehicleReturn {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // États principaux
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<VehicleFormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<VehicleValidationErrors>({});
  const [vehicleType, setVehicleType] = useState<string | null>(null);

  /**
   * Charge le véhicule depuis Supabase et initialise le formulaire
   * Copie exacte de la logique de ManageVehicle.tsx (Étape 2B.1)
   */
  const loadVehicle = useCallback(async () => {
    console.log("[useManageVehicle] loadVehicle called with vehicleId =", vehicleId);
    if (!vehicleId) {
      console.log("[useManageVehicle] No vehicleId, aborting");
      return;
    }

    setLoading(true);
    try {
      // Charger le véhicule par son ID
      console.log("[useManageVehicle] Calling SupabaseVehiclesService.getVehicleById...");
      const { data: vehicleData, error } = await SupabaseVehiclesService.getVehicleById(vehicleId);
      console.log("[useManageVehicle] Supabase response - data:", vehicleData ? "✅ Found" : "❌ null", ", error:", error);

      if (error || !vehicleData) {
        console.log("[useManageVehicle] ❌ Véhicule non trouvé, showing toast and navigating");
        toast({
          title: "Erreur",
          description: error || "Véhicule non trouvé",
          variant: "destructive",
        });
        navigate("/me/owner/vehicles");
        return;
      }

      console.log("[useManageVehicle] ✅ Vehicle found, mapping to Vehicle type...");
      setVehicleType(vehicleData.vehicle_type ?? null);
      setVehicle({
        id: vehicleData.id,
        ownerId: vehicleData.owner_id || "",
        license: vehicleId.substring(0, 8).toUpperCase(),
        brand: vehicleData.brand,
        model: vehicleData.model,
        color: vehicleData.color || "",
        fuel: (vehicleData.fuel_type as any) || "gasoline",
        year: vehicleData.year,
        hasAC: vehicleData.has_ac || false,
        doors: vehicleData.doors || vehicleData.seats || 5,
        transmission: (vehicleData.transmission as any) || "manual",
        mileage: vehicleData.mileage || 0,
        dailyPrice: vehicleData.price_per_day,
        pricePerDayAgency: vehicleData.price_per_day_agency ?? null,
        currency: "EUR",
        latitude: 0,
        longitude: 0,
        status: "available" as any,
        description: vehicleData.description || "",
        location: vehicleData.location || "",
        createdAt: vehicleData.created_at || new Date().toISOString(),
        updatedAt: vehicleData.updated_at || new Date().toISOString(),
      });
      console.log("[useManageVehicle] ✅ setVehicle done");

      // Remplir le formulaire avec toutes les données
      console.log("[useManageVehicle] Mapping vehicleData to formData...");
      setFormData({
        brand: vehicleData.brand,
        model: vehicleData.model,
        color: vehicleData.color || "",
        year: vehicleData.year.toString(),
        mileage: (vehicleData.mileage || 0).toString(),
        fuel: vehicleData.fuel_type || "",
        transmission: vehicleData.transmission || "",
        seats: (vehicleData.seats || 5).toString(),
        doors: (vehicleData.doors || vehicleData.seats || 5).toString(),
        pricePerDay: vehicleData.price_per_day.toString(),
        pricePerDayAgency:
          vehicleData.price_per_day_agency != null
            ? String(vehicleData.price_per_day_agency)
            : "",
        description: vehicleData.description || "",
        descriptionEn: (vehicleData as unknown as { description_en?: string | null }).description_en || "",
        descriptionDe: (vehicleData as unknown as { description_de?: string | null }).description_de || "",
        descriptionIt: (vehicleData as unknown as { description_it?: string | null }).description_it || "",
        location: vehicleData.location || "",
        locationAreaId: vehicleData.location_area_id || "",
        status: (vehicleData.status as "active" | "inactive" | "review") || "active",
        available: vehicleData.available || false,
        // Charger les remises depuis Supabase ou utiliser les valeurs par défaut
        lowSeasonDiscount: (vehicleData.low_season_discount || 10).toString(),
        highSeasonSurcharge: (vehicleData.high_season_surcharge || 20).toString(),
        longDurationDiscount14: (vehicleData.long_duration_discount_14 || 15).toString(),
        longDurationDiscount60: (vehicleData.long_duration_discount_60 || 25).toString(),
        depositAmount: ((vehicleData as { deposit_amount?: number | null }).deposit_amount ?? 1000).toString(),
        // 🆕 CHARGER TOUS LES ÉQUIPEMENTS DEPUIS LA BASE DE DONNÉES
        hasAC: vehicleData.has_ac || false,
        hasPool: vehicleData.has_pool || false,
        nearBeach: vehicleData.near_beach || false,
        hasWifi: vehicleData.has_wifi || false,
        hasGPS: vehicleData.has_gps || false,
        hasCruiseControl: vehicleData.has_cruise_control || false,
        hasBluetooth: vehicleData.has_bluetooth || false,
        hasCarPlay: vehicleData.has_carplay || false,
        hasAudioInput: vehicleData.has_audio_input || false,
        hasBackupCamera: vehicleData.has_backup_camera || false,
        hasUSBPort: vehicleData.has_usb_port || false,
        hasLeatherSeats: vehicleData.has_leather_seats || false,
        hasSunroof: vehicleData.has_sunroof || false,
        hasPremiumAudio: vehicleData.has_premium_audio || false,
        hasRoofRack: vehicleData.has_roof_rack || false,
        hasWirelessCharger: vehicleData.has_wireless_charger || false,
        hasParkingSensors: vehicleData.has_parking_sensors || false,
        hasABS: vehicleData.has_abs || false,
        hasLargeTrunk: vehicleData.has_large_trunk || false,
        hasRoofBox: vehicleData.has_roof_box || false,
        hasBikeRack: vehicleData.has_bike_rack || false,
        hasAndroidAuto: vehicleData.has_android_auto || false,
        hasPrivateBathroom: (vehicleData as any).has_private_bathroom || false,
        hasSecurityGuard: (vehicleData as any).has_security_guard || false,
        nearShoppingCenter: (vehicleData as any).near_shopping_center || false,
        nearNightlife: (vehicleData as any).near_nightlife || false,
        hasEquippedKitchen: (vehicleData as any).has_equipped_kitchen || false,
        hasSolarPanel: (vehicleData as any).has_solar_panel || false,
        hasHousekeeper: (vehicleData as any).has_housekeeper || false,
        hasLaundry: (vehicleData as any).has_laundry || false,
        hasRemoteWork: (vehicleData as any).has_remote_work || false,
        hasCanalPlus: (vehicleData as any).has_canal_plus || false,
        // 🆕 CHARGER LES ZONES DE PICK-UP
        pickupZones: vehicleData.pickup_zones || [],
        // 🆕 CHARGER LES CONDITIONS DE RÉSERVATION
        minAdvanceHours: (vehicleData.min_advance_hours || 24).toString(),
        minRentalDays: (vehicleData.min_rental_days || 1).toString(),
        maxRentalDays: vehicleData.max_rental_days ? vehicleData.max_rental_days.toString() : "",
        // 🆕 CHARGER LES SERVICES AÉROPORT
        airportPickupService: vehicleData.airport_pickup_service || false,
        airportPickupRetrieval: vehicleData.airport_pickup_retrieval || false,
        airportPickupRetrievalFree: vehicleData.airport_pickup_retrieval_free ?? true,
        airportPickupRetrievalPrice: (vehicleData.airport_pickup_retrieval_price || 25).toString(),
        airportPickupReturn: vehicleData.airport_pickup_return || false,
        airportPickupReturnFree: vehicleData.airport_pickup_return_free ?? true,
        airportPickupReturnPrice: (vehicleData.airport_pickup_return_price || 25).toString(),
        // 🆕 CHARGER LES SERVICES BARGE PETITE TERRE
        bargePetiteTerreService: vehicleData.barge_petite_terre_service || false,
        bargePetiteTerreRetrieval: vehicleData.barge_petite_terre_retrieval || false,
        bargePetiteTerreRetrievalFree: vehicleData.barge_petite_terre_retrieval_free ?? true,
        bargePetiteTerreRetrievalPrice: (vehicleData.barge_petite_terre_retrieval_price || 15).toString(),
        bargePetiteTerreReturn: vehicleData.barge_petite_terre_return || false,
        bargePetiteTerreReturnFree: vehicleData.barge_petite_terre_return_free ?? true,
        bargePetiteTerreReturnPrice: (vehicleData.barge_petite_terre_return_price || 15).toString(),
        // 🆕 CHARGER LES SERVICES BARGE GRANDE TERRE
        bargeGrandeTerreService: vehicleData.barge_grande_terre_service || false,
        bargeGrandeTerreRetrieval: vehicleData.barge_grande_terre_retrieval || false,
        bargeGrandeTerreRetrievalFree: vehicleData.barge_grande_terre_retrieval_free ?? true,
        bargeGrandeTerreRetrievalPrice: (vehicleData.barge_grande_terre_retrieval_price || 15).toString(),
        bargeGrandeTerreReturn: vehicleData.barge_grande_terre_return || false,
        bargeGrandeTerreReturnFree: vehicleData.barge_grande_terre_return_free ?? true,
        bargeGrandeTerreReturnPrice: (vehicleData.barge_grande_terre_return_price || 15).toString(),
        // 🆕 CHARGER LES SERVICES LIVRAISON À DOMICILE
        homeDeliveryService: vehicleData.home_delivery_service || false,
        homeDeliveryPickup: vehicleData.home_delivery_pickup || false,
        homeDeliveryPickupFree: vehicleData.home_delivery_pickup_free ?? true,
        homeDeliveryPickupPrice: (vehicleData.home_delivery_pickup_price || 20).toString(),
        homeDeliveryReturn: vehicleData.home_delivery_return || false,
        homeDeliveryReturnFree: vehicleData.home_delivery_return_free ?? true,
        homeDeliveryReturnPrice: (vehicleData.home_delivery_return_price || 20).toString(),
        // 🆕 CHARGER LES SERVICES SIÈGE BÉBÉ
        babySeatService: vehicleData.baby_seat_service || false,
        babySeatFree: vehicleData.baby_seat_free ?? false,
        babySeatPrice: (vehicleData.baby_seat_price || 1).toString(),
        // 🆕 CHARGER LES SERVICES CONDUCTEUR ADDITIONNEL
        additionalDriverService: vehicleData.additional_driver_service || false,
        additionalDriverFree: vehicleData.additional_driver_free ?? false,
        additionalDriverPrice: (vehicleData.additional_driver_price || 15).toString(),
        listingOwnerId: vehicleData.listing_owner_id || "",
        listingOwnerDisplayName: "",
        listingOwnerAvatarUrl: "",
        listingOwnerType: "individual",
        listingOwnerPhone: (vehicleData as unknown as { listing_owner_phone?: string | null }).listing_owner_phone || "",
      });

      if (vehicleData.listing_owner_id) {
        const { data: listingOwner } = await ListingOwnersService.getById(
          vehicleData.listing_owner_id
        );
        if (listingOwner) {
          setFormData((prev) => ({
            ...prev,
            listingOwnerId: listingOwner.id,
            listingOwnerDisplayName: listingOwner.display_name,
            listingOwnerAvatarUrl: listingOwner.avatar_url || "",
            listingOwnerType: listingOwner.owner_type,
          }));
        }
      }
      console.log("[useManageVehicle] ✅ setFormData done, formData.brand =", vehicleData.brand);
      
      // 🆕 Activer automatiquement les services correspondants aux zones de pickup
      const pickupZones = vehicleData.pickup_zones || [];
      const serviceUpdates: any = {};
      
      if (pickupZones.includes('Aéroport') && !vehicleData.airport_pickup_service) {
        serviceUpdates.airportPickupService = true;
      }
      if (pickupZones.includes('Barge Petite Terre') && !vehicleData.barge_petite_terre_service) {
        serviceUpdates.bargePetiteTerreService = true;
      }
      if (pickupZones.includes('Barge Grande Terre') && !vehicleData.barge_grande_terre_service) {
        serviceUpdates.bargeGrandeTerreService = true;
      }
      
      // Appliquer les activations automatiques si nécessaire
      if (Object.keys(serviceUpdates).length > 0) {
        setFormData(prev => ({
          ...prev,
          ...serviceUpdates
        }));
      }
      
      // NOTE: La logique pendingConfigurations reste dans le composant pour l'instant
      // car elle est liée aux modals (UI). Elle sera gérée après loadVehicle().

    } catch (error) {
      console.error("[useManageVehicle] ❌ Exception caught:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations du véhicule",
        variant: "destructive",
      });
      // On laisse aussi le throw pour que le composant puisse gérer
      throw error;
    } finally {
      console.log("[useManageVehicle] setLoading(false)");
      setLoading(false);
    }
  }, [vehicleId, toast, navigate]);

  /**
   * Met à jour un champ du formulaire et marque le formulaire comme modifié
   */
  const updateField = useCallback(
    (field: keyof VehicleFormData, value: any) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
      setHasChanges(true);

      // Effacer l'erreur de validation pour ce champ s'il y en a une
      if (validationErrors[field]) {
        setValidationErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [validationErrors]
  );

  return {
    // État
    vehicle,
    formData,
    loading,
    saving,
    hasChanges,
    validationErrors,

    // Actions
    loadVehicle, // 🆕 Étape 2B.1 - Fonction de chargement
    vehicleType,
    updateField,
    setFormData,
    setHasChanges,
    setValidationErrors,
  };
}

