/**
 * Types TypeScript pour le snapshot légal de l'état des lieux de départ
 * 
 * Ces types définissent la structure complète du snapshot figé au moment de la validation (Step 7).
 * 
 * @see DESIGN-SNAPSHOT-LEGAL.md pour la documentation complète
 */

// ============================================================================
// 1. Types pour les sous-structures du snapshot
// ============================================================================

/**
 * Snapshot du conducteur (driver)
 */
export interface CheckinLegalSnapshotDriver {
  lastName: string;
  firstName: string;
  email: string | null;
  phone: string | null;
  licenseNumber: string;
  licenseCountry: string;
  licenseCategory: string;
  licenseIssueDate: string; // ISO date string (YYYY-MM-DD)
  licenseExpirationDate: string; // ISO date string (YYYY-MM-DD)
  licensePhotos: {
    recto: string | null; // URL ou data URL
    verso: string | null; // URL ou data URL
  };
}

/**
 * Snapshot du propriétaire (owner)
 */
export interface CheckinLegalSnapshotOwner {
  lastName: string;
  firstName: string;
  email: string | null;
  phone: string | null;
}

/**
 * Snapshot de la réservation (booking)
 */
export interface CheckinLegalSnapshotBooking {
  referenceNumber: number | null;
  departureDatetime: string | null; // ISO datetime string
  returnDatetime: string | null; // ISO datetime string
  departureLocation: string | null; // ⭐ Lieu de départ (source: bookings.pickup_location)
  returnLocation: string | null; // ⭐ Lieu de retour prévu (pour l'instant = departureLocation)
}

/**
 * Snapshot du véhicule
 */
export interface CheckinLegalSnapshotVehicle {
  brand: string;
  model: string;
  licensePlate: string;
  mileageDeparture: number | null;
  fuelLevel: number | null;
  dashboardPhotos: Array<{
    publicUrl: string;
    uploadedAt: string; // ISO datetime string
    storagePath: string;
  }>;
  // ⭐ Phase 2 : Type de véhicule (raw + normalized)
  type_raw: string | null; // Valeur brute depuis vehicles.vehicle_type (ex: "scooter", "moto", "car")
  type_normalized: string | null; // Valeur normalisée via getVehicleTypeForChecking (ex: "moto", "car")
}

/**
 * Snapshot de l'état extérieur
 */
export interface CheckinLegalSnapshotExterior {
  cleanliness: {
    level: "Excellent" | "Bon" | "Moyen" | "Sale" | null;
    notes: string | null;
    photos: Array<{
      publicUrl: string;
      uploadedAt: string;
      storagePath: string;
    }>;
  };
  trunkEquipments: {
    triangle: boolean;
    gilet: boolean;
    roueSecours: boolean;
    kitAntiCrevaison: boolean;
  };
  photos: {
    avant: Array<{
      publicUrl: string;
      uploadedAt: string;
      storagePath: string;
    }>;
    droit: Array<{
      publicUrl: string;
      uploadedAt: string;
      storagePath: string;
    }>;
    arriere: Array<{
      publicUrl: string;
      uploadedAt: string;
      storagePath: string;
    }>;
    gauche: Array<{
      publicUrl: string;
      uploadedAt: string;
      storagePath: string;
    }>;
    coffre: Array<{
      publicUrl: string;
      uploadedAt: string;
      storagePath: string;
    }>;
    janteAvDroit: Array<{
      publicUrl: string;
      uploadedAt: string;
      storagePath: string;
    }>;
    janteArDroit: Array<{
      publicUrl: string;
      uploadedAt: string;
      storagePath: string;
    }>;
    janteAvGauche: Array<{
      publicUrl: string;
      uploadedAt: string;
      storagePath: string;
    }>;
    janteArGauche: Array<{
      publicUrl: string;
      uploadedAt: string;
      storagePath: string;
    }>;
  };
  damages: Array<{
    zone: string;
    typeDegats: string[];
    commentaire: string | null;
    photos: Array<{
      publicUrl: string;
      uploadedAt: string;
      storagePath: string;
    }>;
  }>;
}

/**
 * Snapshot de l'état intérieur
 */
export interface CheckinLegalSnapshotInterior {
  cleanliness: {
    level: "Excellent" | "Bon" | "Moyen" | "Sale" | null;
    notes: string | null;
    photos: Array<{
      publicUrl: string;
      uploadedAt: string;
      storagePath: string;
    }>;
  };
  seats: {
    hasDamage: boolean;
    damages: string[];
    notes: string | null;
    photos: Array<{
      publicUrl: string;
      uploadedAt: string;
      storagePath: string;
    }>;
  };
  equipments: {
    radioOk: boolean;
    acOk: boolean;
    centralLockOk: boolean;
    windowsOk: boolean;
  };
}

/**
 * Snapshot des accessoires
 */
export interface CheckinLegalSnapshotAccessories {
  comment: string | null;
}

/**
 * Snapshot des remarques
 */
export interface CheckinLegalSnapshotRemarks {
  general: string | null;
}

/**
 * Snapshot de la validation
 */
export interface CheckinLegalSnapshotValidation {
  validatedAt: string | null; // ISO datetime string
  location: string | null;
  ownerSignature: string | null; // data URL (base64)
  renterSignature: string | null; // data URL (base64)
}

/**
 * Métadonnées du snapshot
 */
export interface CheckinLegalSnapshotMetadata {
  version: string; // ex: "1.0"
  createdAt: string; // ISO datetime string
}

// ============================================================================
// 2. Structure complète du snapshot légal
// ============================================================================

/**
 * Snapshot légal complet de l'état des lieux de départ
 * 
 * Cette structure est stockée dans la colonne JSONB `snapshot_legal` de `checkin_depart`.
 * Elle représente une photo figée de toutes les données au moment de la validation (Step 7).
 */
export interface CheckinLegalSnapshot {
  metadata: CheckinLegalSnapshotMetadata;
  driver: CheckinLegalSnapshotDriver;
  owner: CheckinLegalSnapshotOwner;
  booking: CheckinLegalSnapshotBooking;
  vehicle: CheckinLegalSnapshotVehicle;
  exterior: CheckinLegalSnapshotExterior;
  interior: CheckinLegalSnapshotInterior | null; // ⭐ Phase 2 : null pour moto (non pertinent)
  accessories: CheckinLegalSnapshotAccessories;
  remarks: CheckinLegalSnapshotRemarks;
  validation: CheckinLegalSnapshotValidation;
}

// ============================================================================
// 3. Extension de l'interface CheckinDepart existante
// ============================================================================

/**
 * Extension de l'interface CheckinDepart pour inclure les nouvelles colonnes
 * et le snapshot légal.
 * 
 * @see src/services/supabaseCheckinService.ts pour l'interface de base
 */
export interface CheckinDepartExtended {
  // Colonnes existantes (conservées)
  id: string;
  booking_id: string;
  owner_id: string | null;
  renter_id: string | null;
  status: string;
  data: any; // JSONB column (steps 1-7)
  kilometrage_depart: number | null;
  niveau_carburant: number | null;
  photos_dashboard: any[] | null;
  photos_exterieur: any[] | null;
  photos_jantes: any[] | null;
  photos_coffre: any[] | null;
  photos_accessoires: any[] | null;
  degats: any[] | null;
  remarques_owner: string | null;
  remarques_renter: string | null;
  signature_owner: string | null;
  signature_renter: string | null;
  validated_at: string | null;
  photo_permis_recto: string | null;
  photo_permis_verso: string | null;
  created_at: string;
  updated_at: string;

  // Nouvelles colonnes SQL (snapshot)
  driver_email?: string | null;
  driver_phone?: string | null;
  owner_last_name?: string | null;
  owner_first_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  booking_reference_number?: number | null;
  booking_departure_datetime?: string | null; // ISO datetime string
  booking_return_datetime?: string | null; // ISO datetime string
  booking_departure_location?: string | null; // ⭐ Lieu de départ (source: bookings.pickup_location)
  booking_return_location?: string | null; // ⭐ Lieu de retour prévu (pour l'instant = departureLocation)
  snapshot_version?: string | null;

  // Nouvelle colonne JSONB (snapshot complet)
  snapshot_legal?: CheckinLegalSnapshot | null;

  // URL publique du PDF d'état des lieux départ généré
  legal_pdf_url?: string | null;
}

// ============================================================================
// 4. Types utilitaires pour la création du snapshot
// ============================================================================

/**
 * Données sources pour construire le snapshot
 * (utilisées par createLegalSnapshot)
 */
export interface CheckinLegalSnapshotSourceData {
  checkin: CheckinDepartExtended;
  booking: {
    id: string;
    reference_number: number | null;
    start_date: string | null;
    end_date: string | null;
    user_id: string | null;
    vehicle_id: string | null;
  } | null;
  driverProfile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  ownerProfile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

/**
 * Options pour la création du snapshot
 */
export interface CreateLegalSnapshotOptions {
  /**
   * Version du snapshot à créer (défaut: "1.0")
   */
  version?: string;

  /**
   * Location de l'état des lieux (optionnel)
   */
  location?: string | null;

  /**
   * Forcer la création même si snapshot_legal existe déjà (défaut: false)
   */
  force?: boolean;
}

/**
 * Résultat de la création du snapshot
 */
export interface CreateLegalSnapshotResult {
  data: CheckinDepartExtended | null;
  error: string | null;
  snapshotCreated: boolean;
}

// ============================================================================
// 5. Constantes
// ============================================================================

/**
 * Version actuelle du format snapshot
 */
export const SNAPSHOT_VERSION = "1.0";

/**
 * Nom de la colonne JSONB du snapshot
 */
export const SNAPSHOT_LEGAL_COLUMN = "snapshot_legal";

