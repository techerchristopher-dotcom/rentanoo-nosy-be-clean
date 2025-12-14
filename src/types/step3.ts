/**
 * ⭐ Types pour l'Étape 3 - Extérieur & Coffre
 * 
 * Pattern aligné sur Step1/Step2 :
 * - Upload systématique vers checkin-photos
 * - Stockage URLs + métadonnées
 * - Naming intelligent : resa_<N>/depart/<bddColumnName>_<zone>_<N>_<timestamp>_<uuid>.jpg
 */

/**
 * ID de zone extérieure
 */
export type ExteriorZoneId =
  | "avant"
  | "droit"
  | "arriere"
  | "coffre"
  | "gauche"
  | "propreteExterieure";

/**
 * Type de photo extérieure
 */
export type ExteriorPhotoKind =
  | "overview"         // Photo d'ensemble de la zone
  | "jante"           // Photo de jante
  | "coffre"          // Photo coffre ouvert
  | "degat"           // Photo de dégât
  | "proprete";       // Photo de propreté extérieure

/**
 * ⭐ Métadonnées d'une photo extérieure
 * (aligné sur UploadedCheckinPhoto)
 */
export interface ExteriorPhoto {
  storagePath: string;      // "resa_8/depart/photos_exterieur_avant_8_1730846300000_abc123.jpg"
  publicUrl: string;        // URL complète Supabase Storage
  uploadedAt: string;       // ISO timestamp
  zone: ExteriorZoneId;     // Zone associée
  kind: ExteriorPhotoKind;  // Type de photo
  damageIndex?: number;     // Index du dégât (si kind = "degat")
}

/**
 * ⭐ Dégât extérieur avec photos
 */
export interface ExteriorDamage {
  side: "avant" | "droit" | "arriere" | "gauche" | "coffre";  // Aligné avec l'existant
  typeDegats: string[];     // ["Rayure", "Bosse", ...]
  commentaire: string;
  photos: ExteriorPhoto[];  // Photos du dégât (avec URLs)
}

/**
 * ⭐ Équipements du coffre
 */
export interface TrunkEquipment {
  triangle: boolean;
  gilet: boolean;
  roueSecours: boolean;
  kitAntiCrevaison: boolean;
}

/**
 * ⭐ Propreté extérieure
 */
export interface ExteriorCleanliness {
  level: "Excellent" | "Bon" | "Moyen" | "Sale";
  notes: string;
  photos: ExteriorPhoto[];
}

/**
 * ⭐ Payload complet de l'Étape 3
 * (stocké dans checkin_depart.data.step3)
 */
export interface Step3Payload {
  completedAt: string;
  
  zonesPhotos: {
    avant: ExteriorPhoto[];
    droit: ExteriorPhoto[];
    arriere: ExteriorPhoto[];
    gauche: ExteriorPhoto[];
    coffre: ExteriorPhoto[];
    janteAvDroit: ExteriorPhoto[];
    janteArDroit: ExteriorPhoto[];
    janteAvGauche: ExteriorPhoto[];
    janteArGauche: ExteriorPhoto[];
  };
  
  zonesHasDamage: {
    avant: boolean;
    droit: boolean;
    arriere: boolean;
    coffre: boolean;
    gauche: boolean;
  };
  
  damageReports: ExteriorDamage[];
  
  coffreEquipements: TrunkEquipment;
  
  propreteExterieure: ExteriorCleanliness;
}

