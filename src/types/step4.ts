/**
 * ⭐ Types pour l'Étape 4 - Intérieur
 * 
 * Pattern aligné sur Step3 :
 * - Upload systématique vers checkin-photos
 * - Stockage URLs + métadonnées
 * - Naming intelligent : resa_<N>/depart/interior/<sectionKey>_<N>_<timestamp>_<uuid>.jpg
 */

/**
 * ID de section intérieure
 */
export type InteriorSectionId =
  | "sieges"
  | "propreteGenerale"
  | "equipements";

/**
 * Type de photo intérieure
 */
export type InteriorPhotoKind =
  | "sieges"         // Photo des sièges
  | "proprete"       // Photo de propreté intérieure
  | "degat";         // Photo de dégât intérieur

/**
 * ⭐ Métadonnées d'une photo intérieure
 * (aligné sur ExteriorPhoto)
 */
export interface InteriorPhoto {
  storagePath: string;      // "resa_8/depart/interior/sieges_8_1730846300000_abc123.jpg"
  publicUrl: string;        // URL complète Supabase Storage
  uploadedAt: string;       // ISO timestamp
  section: InteriorSectionId;  // Section associée
  kind: InteriorPhotoKind;  // Type de photo
}

/**
 * ⭐ Payload complet de l'Étape 4
 * (stocké dans checkin_depart.data.step4)
 */
export interface Step4Payload {
  completedAt?: string;
  
  sieges?: {
    photos: InteriorPhoto[];
    hasDamage: boolean;
    damages?: string[];
    notes?: string;
    damagePhotos?: InteriorPhoto[];
  };
  
  propreteGenerale?: {
    photos: InteriorPhoto[];
    level: "Excellent" | "Bon" | "Moyen" | "Sale";
    notes?: string;
  };
  
  equipements?: {
    radioOk: boolean;
    acOk: boolean;
    centralLockOk: boolean;
    windowsOk: boolean;
  };
}

