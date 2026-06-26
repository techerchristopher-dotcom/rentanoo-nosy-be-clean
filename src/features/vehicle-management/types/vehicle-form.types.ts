// Types pour le formulaire de gestion de véhicule
import { Vehicle } from "@/types";

/**
 * Interface pour les données du formulaire de véhicule
 * Correspond aux champs du state formData dans ManageVehicle.tsx
 */
export interface VehicleFormData {
  // Informations de base du véhicule
  brand: string;
  model: string;
  color: string;
  year: string;
  mileage: string;
  fuel: string;
  transmission: string;
  seats: string;
  doors: string;
  pricePerDay: string;
  /** Tarif jour agence (réservations admin) — optionnel, voir `vehicles.price_per_day_agency` */
  pricePerDayAgency: string;
  description: string;
  descriptionEn: string;
  descriptionDe: string;
  descriptionIt: string;
  location: string;
  locationAreaId: string;
  status: "active" | "inactive" | "review";
  available: boolean;

  // Remises et tarification
  lowSeasonDiscount: string;
  highSeasonSurcharge: string;
  longDurationDiscount14: string;
  longDurationDiscount60: string;
  depositAmount: string;

  // Équipements
  hasAC: boolean;
  hasPool: boolean;
  nearBeach: boolean;
  hasWifi: boolean;
  hasGPS: boolean;
  hasCruiseControl: boolean;
  hasBluetooth: boolean;
  hasCarPlay: boolean;
  hasAudioInput: boolean;
  hasBackupCamera: boolean;
  hasUSBPort: boolean;
  hasLeatherSeats: boolean;
  hasSunroof: boolean;
  hasPremiumAudio: boolean;
  hasRoofRack: boolean;
  hasWirelessCharger: boolean;
  hasParkingSensors: boolean;
  hasABS: boolean;
  hasLargeTrunk: boolean;
  hasRoofBox: boolean;
  hasBikeRack: boolean;
  hasAndroidAuto: boolean;
  hasPrivateBathroom: boolean;
  hasSecurityGuard: boolean;
  nearShoppingCenter: boolean;
  nearNightlife: boolean;
  hasEquippedKitchen: boolean;
  hasSolarPanel: boolean;
  hasHousekeeper: boolean;
  hasLaundry: boolean;
  hasRemoteWork: boolean;
  hasCanalPlus: boolean;

  // Zones de pick-up
  pickupZones: string[];

  // Conditions de réservation
  minAdvanceHours: string;
  minRentalDays: string;
  maxRentalDays: string;

  // Services Aéroport
  airportPickupService: boolean;
  airportPickupRetrieval: boolean;
  airportPickupRetrievalFree: boolean;
  airportPickupRetrievalPrice: string;
  airportPickupReturn: boolean;
  airportPickupReturnFree: boolean;
  airportPickupReturnPrice: string;

  // Services Barge Petite Terre
  bargePetiteTerreService: boolean;
  bargePetiteTerreRetrieval: boolean;
  bargePetiteTerreRetrievalFree: boolean;
  bargePetiteTerreRetrievalPrice: string;
  bargePetiteTerreReturn: boolean;
  bargePetiteTerreReturnFree: boolean;
  bargePetiteTerreReturnPrice: string;

  // Services Barge Grande Terre
  bargeGrandeTerreService: boolean;
  bargeGrandeTerreRetrieval: boolean;
  bargeGrandeTerreRetrievalFree: boolean;
  bargeGrandeTerreRetrievalPrice: string;
  bargeGrandeTerreReturn: boolean;
  bargeGrandeTerreReturnFree: boolean;
  bargeGrandeTerreReturnPrice: string;

  // Services Livraison à domicile
  homeDeliveryService: boolean;
  homeDeliveryPickup: boolean;
  homeDeliveryPickupFree: boolean;
  homeDeliveryPickupPrice: string;
  homeDeliveryReturn: boolean;
  homeDeliveryReturnFree: boolean;
  homeDeliveryReturnPrice: string;

  // Services Siège bébé
  babySeatService: boolean;
  babySeatFree: boolean;
  babySeatPrice: string;

  // Services Conducteur additionnel
  additionalDriverService: boolean;
  additionalDriverFree: boolean;
  additionalDriverPrice: string;

  /** Propriétaire affiché publiquement (listing_owners) */
  listingOwnerId: string;
  listingOwnerDisplayName: string;
  listingOwnerAvatarUrl: string;
  listingOwnerType: "individual" | "agency" | "residence" | "platform_managed";
  /** Téléphone interne du propriétaire pour cette annonce (admin uniquement) */
  listingOwnerPhone: string;
}

/**
 * Interface pour les erreurs de validation du formulaire
 */
export interface VehicleValidationErrors {
  [key: string]: string;
}

/**
 * Interface pour le retour du hook useManageVehicle
 */
export interface UseManageVehicleReturn {
  // État
  vehicle: Vehicle | null;
  formData: VehicleFormData;
  loading: boolean;
  saving: boolean;
  hasChanges: boolean;
  validationErrors: VehicleValidationErrors;

  // Actions
  loadVehicle: () => Promise<void>; // 🆕 Étape 2B.1 - Fonction de chargement
  vehicleType: string | null;
  updateField: (field: keyof VehicleFormData, value: any) => void;
  setFormData: React.Dispatch<React.SetStateAction<VehicleFormData>>;
  setHasChanges: (value: boolean) => void;
  setValidationErrors: React.Dispatch<React.SetStateAction<VehicleValidationErrors>>;
}

/**
 * Valeurs initiales par défaut du formulaire
 */
export const initialFormData: VehicleFormData = {
  brand: "",
  model: "",
  color: "",
  year: "",
  mileage: "",
  fuel: "",
  transmission: "",
  seats: "",
  doors: "",
  pricePerDay: "",
  pricePerDayAgency: "",
  description: "",
  descriptionEn: "",
  descriptionDe: "",
  descriptionIt: "",
  location: "",
  locationAreaId: "",
  status: "active",
  available: true,
  lowSeasonDiscount: "",
  highSeasonSurcharge: "",
  longDurationDiscount14: "",
  longDurationDiscount60: "",
  depositAmount: "1000",
  hasAC: false,
  hasPool: false,
  nearBeach: false,
  hasWifi: false,
  hasGPS: false,
  hasCruiseControl: false,
  hasBluetooth: false,
  hasCarPlay: false,
  hasAudioInput: false,
  hasBackupCamera: false,
  hasUSBPort: false,
  hasLeatherSeats: false,
  hasSunroof: false,
  hasPremiumAudio: false,
  hasRoofRack: false,
  hasWirelessCharger: false,
  hasParkingSensors: false,
  hasABS: false,
  hasLargeTrunk: false,
  hasRoofBox: false,
  hasBikeRack: false,
  hasAndroidAuto: false,
  hasPrivateBathroom: false,
  hasSecurityGuard: false,
  nearShoppingCenter: false,
  nearNightlife: false,
  hasEquippedKitchen: false,
  hasSolarPanel: false,
  hasHousekeeper: false,
  hasLaundry: false,
  hasRemoteWork: false,
  hasCanalPlus: false,
  pickupZones: [],
  minAdvanceHours: "24",
  minRentalDays: "1",
  maxRentalDays: "",
  airportPickupService: false,
  airportPickupRetrieval: false,
  airportPickupRetrievalFree: true,
  airportPickupRetrievalPrice: "25",
  airportPickupReturn: false,
  airportPickupReturnFree: true,
  airportPickupReturnPrice: "25",
  bargePetiteTerreService: false,
  bargePetiteTerreRetrieval: false,
  bargePetiteTerreRetrievalFree: true,
  bargePetiteTerreRetrievalPrice: "15",
  bargePetiteTerreReturn: false,
  bargePetiteTerreReturnFree: true,
  bargePetiteTerreReturnPrice: "15",
  bargeGrandeTerreService: false,
  bargeGrandeTerreRetrieval: false,
  bargeGrandeTerreRetrievalFree: true,
  bargeGrandeTerreRetrievalPrice: "15",
  bargeGrandeTerreReturn: false,
  bargeGrandeTerreReturnFree: true,
  bargeGrandeTerreReturnPrice: "15",
  homeDeliveryService: false,
  homeDeliveryPickup: false,
  homeDeliveryPickupFree: true,
  homeDeliveryPickupPrice: "20",
  homeDeliveryReturn: false,
  homeDeliveryReturnFree: true,
  homeDeliveryReturnPrice: "20",
  babySeatService: false,
  babySeatFree: false,
  babySeatPrice: "1",
  additionalDriverService: false,
  additionalDriverFree: false,
  additionalDriverPrice: "15",
  listingOwnerId: "",
  listingOwnerDisplayName: "",
  listingOwnerAvatarUrl: "",
  listingOwnerType: "individual",
  listingOwnerPhone: "",
};

