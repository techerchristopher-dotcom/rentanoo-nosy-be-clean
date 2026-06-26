// Rentanoo Types - Type definitions for the scooter rental platform

import type { LocationAreaRef } from "@/types/locationArea";

export type { LocationAreaRef };

export type Role = "renter" | "owner" | "admin";

export type BookingStatus = 
  | "pending" 
  | "accepted" 
  | "declined" 
  | "cancelled" 
  | "active" 
  | "closed"
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "terminated";

export type PaymentType = "charge" | "refund" | "payout";

export type PaymentStatus = 
  | "requires_action" 
  | "processing" 
  | "succeeded" 
  | "failed" 
  | "refunded";

export type VehicleStatus = "draft" | "published" | "suspended";

/** Aligné sur `bookings.pricing_mode` (contrainte SQL `web` | `admin`) */
export type BookingPricingMode = "web" | "admin";

export type Transmission = "manual" | "automatic";

export type FuelType = "gasoline" | "diesel" | "electric" | "hybrid";

export type KycStatus = "pending" | "verified" | "rejected";

export type PhotoAngle = 
  | "driver_side"
  | "front" 
  | "passenger_side"
  | "rear"
  | "top"
  | "trunk"
  | "rear_passenger_seat"
  | "side_passenger"
  | "side_driver"
  | "spare_wheel";

export type ConversationStatus = "active" | "closed" | "archived";

export type MessageType = "text" | "image" | "file" | "system";

// Rental calculation types
export interface RentalCalculation {
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  rentalDays: number;
  isCalculated: boolean;
  calculatedAt: Date;
}

export interface VehicleRentalInfo {
  vehicleId: string;
  pricePerDay: number;
  totalCost: number;
  formattedPrice: string;
  days: number;
  hours: number;
}

// Core entities
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  bio?: string;
  roles: Role[]; // Toujours un tableau, jamais undefined
  kycStatus: KycStatus;
  avatarUrl?: string;
  birthDate?: string;
  placeOfBirth?: string;
  driverLicenseNumber?: string;
  driverLicenseIssueDate?: string;
  driverLicenseExpirationDate?: string;
  driverLicenseCategory?: string;
  driverLicenseCountry?: string;
  driverLicenseFilePath?: string;
  addressLine1?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  createdAt: string;
  updatedAt: string;
  /** Colonnes DB `is_admin` / `admin_role` (admin peut avoir `role` = renter ou owner) */
  isAdmin?: boolean;
  adminRole?: string | null;
}

export interface Vehicle {
  id: string;
  ownerId: string;
  license: string; // Plaque d'immatriculation
  brand: string;
  model: string;
  color: string;
  fuel: FuelType;
  year: number;
  hasAC: boolean;
  hasPool?: boolean;
  nearBeach?: boolean;
  hasWifi?: boolean;
  hasPrivateBathroom?: boolean;
  hasSecurityGuard?: boolean;
  nearShoppingCenter?: boolean;
  nearNightlife?: boolean;
  hasEquippedKitchen?: boolean;
  hasSolarPanel?: boolean;
  hasHousekeeper?: boolean;
  hasLaundry?: boolean;
  hasRemoteWork?: boolean;
  hasCanalPlus?: boolean;
  hasGPS?: boolean;
  hasCruiseControl?: boolean;
  hasBluetooth?: boolean;
  hasCarPlay?: boolean;
  hasAudioInput?: boolean;
  doors: number;
  transmission: Transmission;
  mileage: number;
  dailyPrice: number;
  /** Tarif jour agence (`vehicles.price_per_day_agency`), distinct du tarif web */
  pricePerDayAgency?: number | null;
  currency: "EUR";
  latitude: number;
  longitude: number;
  status: VehicleStatus;
  description?: string; // Description du véhicule (FR)
  descriptionEn?: string | null;
  descriptionDe?: string | null;
  descriptionIt?: string | null;
  location?: string; // Libellé affichable (quartier ou zones pickup)
  /** Quartier structuré (FK location_areas) */
  locationArea?: LocationAreaRef;
  seats?: number; // Nombre de places (utile pour moto)
  engineCapacity?: string; // Cylindrée (cc) pour moto
  /** Type véhicule Supabase : 'car' | 'moto' | 'scooter' | 'accommodation' — pour H1 SEO */
  vehicleType?: 'car' | 'moto' | 'scooter' | 'accommodation' | 'quad' | null;
  /** Catégorie affichée (ex. Villa, Bungalow) — colonne vehicle_category */
  vehicleCategory?: string | null;
  
  // 🆕 Services supplémentaires configurés par le propriétaire
  // 🛩️ Services Aéroport
  airport_pickup_service?: boolean;
  airport_pickup_retrieval?: boolean;
  airport_pickup_retrieval_free?: boolean;
  airport_pickup_retrieval_price?: number;
  airport_pickup_return?: boolean;
  airport_pickup_return_free?: boolean;
  airport_pickup_return_price?: number;
  
  // 🚢 Services Barge Petite Terre
  barge_petite_terre_service?: boolean;
  barge_petite_terre_retrieval?: boolean;
  barge_petite_terre_retrieval_free?: boolean;
  barge_petite_terre_retrieval_price?: number;
  barge_petite_terre_return?: boolean;
  barge_petite_terre_return_free?: boolean;
  barge_petite_terre_return_price?: number;
  
  // 🚢 Services Barge Grande Terre
  barge_grande_terre_service?: boolean;
  barge_grande_terre_retrieval?: boolean;
  barge_grande_terre_retrieval_free?: boolean;
  barge_grande_terre_retrieval_price?: number;
  barge_grande_terre_return?: boolean;
  barge_grande_terre_return_free?: boolean;
  barge_grande_terre_return_price?: number;
  
  // 🚚 Services Livraison à domicile
  home_delivery_service?: boolean;
  home_delivery_pickup?: boolean;
  home_delivery_pickup_free?: boolean;
  home_delivery_pickup_price?: number;
  home_delivery_return?: boolean;
  home_delivery_return_free?: boolean;
  home_delivery_return_price?: number;
  
  // 👶 Services Siège bébé
  baby_seat_service?: boolean;
  baby_seat_free?: boolean;
  baby_seat_price?: number;
  
  // 👨‍✈️ Services Conducteur additionnel
  additional_driver_service?: boolean;
  additional_driver_free?: boolean;
  additional_driver_price?: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  vehicleId: string;
  url: string; // URL de l'image
  angle: PhotoAngle;
  position: number; // Ordre d'affichage
  isPrimary: boolean;
  createdAt: string;
}

export interface Booking {
  id: string;
  vehicleId: string;
  renterId: string;
  
  // Dates et heures complètes
  startDate: string; // ISO string (ex: "2025-01-15T06:30:00Z")
  startTime: string; // Format HH:MM (ex: "06:30")
  endDate: string; // ISO string (ex: "2025-01-16T14:00:00Z")
  endTime: string; // Format HH:MM (ex: "14:00")
  
  // Lieu de prise en charge
  pickupLocation: string; // "Aéroport", "Hell-Ville", etc.
  hotelName?: string; // Nom de l'hôtel si option restitution/récupération hôtel choisie
  notes?: string; // Notes du locataire saisies au moment de la demande

  // Montant et statut
  totalAmount: number;
  currency: "EUR";
  status: BookingStatus;
  
  // Options sélectionnées (copier-coller depuis la modal)
  selectedOptions?: Array<{
    name: string;
    pricePerDay: number;
    totalPrice: number;
  }>;
  
  // Métadonnées
  createdAt: string;
  updatedAt: string;
  /** Mode de pricing (`bookings.pricing_mode`) */
  pricingMode?: BookingPricingMode;
  /** Admin ayant créé la réservation (`bookings.created_by_admin_id`) */
  createdByAdminId?: string | null;
  // État des lieux de départ associé (optionnel)
  checkinDepart?: CheckinDepartSummary;
}

export interface Payment {
  id: string;
  bookingId: string;
  type: PaymentType;
  amount: number;
  currency: "EUR";
  status: PaymentStatus;
  stripePaymentIntentId?: string; // Mock Stripe ID
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  vehicleId: string;
  renterId: string;
  ownerId: string;
  bookingId?: string;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  messageType: MessageType;
  isRead: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: "booking_request" | "booking_accepted" | "booking_declined" | "payment_succeeded" | "kyc_approved";
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// User Role Utilities
export const UserRoleUtils = {
  /**
   * Vérifie si l'utilisateur a un rôle spécifique
   */
  hasRole: (user: User | null, role: Role): boolean => {
    return user ? user.roles.includes(role) : false;
  },

  /**
   * Vérifie si l'utilisateur a au moins un des rôles spécifiés
   */
  hasAnyRole: (user: User | null, roles: Role[]): boolean => {
    return user ? roles.some(role => user.roles.includes(role)) : false;
  },

  /**
   * Vérifie si l'utilisateur a tous les rôles spécifiés
   */
  hasAllRoles: (user: User | null, roles: Role[]): boolean => {
    return user ? roles.every(role => user.roles.includes(role)) : false;
  },

  /**
   * Ajoute un rôle à l'utilisateur (sans dupliquer)
   */
  addRole: (user: User, role: Role): User => {
    if (!user.roles.includes(role)) {
      return { ...user, roles: [...user.roles, role] };
    }
    return user;
  },

  /**
   * Retire un rôle de l'utilisateur
   */
  removeRole: (user: User, role: Role): User => {
    return { ...user, roles: user.roles.filter(r => r !== role) };
  },

  /**
   * Obtient le rôle le plus élevé (admin > owner > renter)
   */
  getHighestRole: (user: User | null): Role | null => {
    if (!user || user.roles.length === 0) return null;
    
    if (user.roles.includes('admin')) return 'admin';
    if (user.roles.includes('owner')) return 'owner';
    if (user.roles.includes('renter')) return 'renter';
    
    return user.roles[0]; // Fallback
  },

  /**
   * Vérifie si l'utilisateur peut créer des véhicules
   */
  canCreateVehicles: (user: User | null): boolean => {
    return UserRoleUtils.hasAnyRole(user, ['owner', 'admin']);
  },

  /**
   * Vérifie si l'utilisateur peut accéder aux fonctions d'administration
   * (rôle legacy `role = admin`, ou flags DB `is_admin` / `admin_role = admin`)
   */
  isAdmin: (user: User | null): boolean => {
    if (!user) return false;
    if (user.roles.includes("admin")) return true;
    if (user.isAdmin === true) return true;
    if (user.adminRole === "admin") return true;
    return false;
  }
};

// Utility types
export interface DateRange {
  start: Date;
  end: Date;
}

export interface VehicleFilters {
  priceMin?: number;
  priceMax?: number;
  fuel?: FuelType[];
  transmission?: Transmission[];
  hasAC?: boolean;
  doors?: number[];
  vehicleTypes?: string[];
  vehicleCategories?: string[];
  searchText?: string;
  // Additional equipment filters
  hasBabySeat?: boolean;
  hasGPS?: boolean;
  hasBikeRack?: boolean;
  hasRoofBox?: boolean;
  hasCruiseControl?: boolean;
  hasAppleCarPlay?: boolean;
  hasAndroidAuto?: boolean;
}

// Interface pour les données de recherche de véhicules
export interface VehicleSearchData {
  startDate?: Date;
  startTime?: string; // Format HH:MM
  endDate?: Date;
  endTime?: string; // Format HH:MM
  pickupLocation?: string; // Ville de prise en charge
}

export interface BookingSummary {
  vehicle: Vehicle;
  startDate: string;
  endDate: string;
  days: number;
  totalAmount: number;
  platformCommission: number;
  ownerPayout: number;
}

// Résumé minimal d'un état des lieux de départ pour affichage
export interface CheckinDepartSummary {
  id: string;
  status: string;
  legalPdfUrl?: string | null;
}

// Résumé minimal d'un état des lieux de retour pour affichage
export interface CheckinReturnSummary {
  id: string;
  status: string;
  legalPdfUrl?: string | null;
  updatedAt?: string | null;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface VehicleForm {
  brand: string;
  model: string;
  color: string;
  fuel: FuelType;
  year: number;
  hasAC: boolean;
  doors: number;
  transmission: Transmission;
  mileage: number;
  dailyPrice: number;
  latitude: number;
  longitude: number;
}

export interface BookingForm {
  vehicleId: string;
  startDate: string;
  endDate: string;
  totalAmount?: number; // Prix total incluant les options
  selectedOptions?: Array<{
    name: string;
    pricePerDay: number;
    totalPrice: number;
  }>;
}

// Component prop types
export interface VehicleCardProps {
  vehicle: Vehicle;
  primaryPhoto?: Photo;
  onClick?: () => void;
}

export interface StatusBadgeProps {
  status: BookingStatus | PaymentStatus | VehicleStatus | KycStatus;
  size?: "sm" | "md" | "lg";
}

export interface BookingCardProps {
  booking: Booking;
  vehicle: Vehicle;
  primaryPhoto?: Photo;
}

// Interface pour les services sélectionnés par le client
export interface SelectedService {
  id: string;
  name: string;
  price: number; // Prix FIXE défini par le propriétaire
  pricePerDay: boolean; // Si true, prix multiplié par nb de jours
  isFree: boolean; // Si le propriétaire a défini comme gratuit
  isMainSection?: boolean; // Si c'est une section principale (ex: "Service Aéroport")
  subOptions?: SelectedService[]; // Sous-options de la section principale
  parentSection?: string; // ID de la section parente pour les sous-options
  hasSubSections?: boolean; // Si la section a des sous-sections (ex: Retrait/Restitution)
  isSubSectionHeader?: boolean; // Si c'est un sous-titre (ex: "Retrait", "Restitution")
  isSimpleService?: boolean; // Si c'est un service simple (Toggle direct sans sous-options)
}