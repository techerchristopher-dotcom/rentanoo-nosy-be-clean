/**
 * Configuration centralisée des zones d'inspection extérieure
 * 
 * Cette constante unique évite les incohérences de clés entre :
 * - La création de dégâts (étape 3)
 * - Le regroupement des dégâts (étape 6)
 * - L'affichage du récapitulatif (étape 6)
 */

export type ExteriorZoneKey = 
  | "avant" 
  | "droit" 
  | "arriere" 
  | "gauche" 
  | "coffre"
  | "janteAvDroit"
  | "janteArDroit"
  | "janteAvGauche"
  | "janteArGauche";

export type ExteriorZoneConfig = {
  key: ExteriorZoneKey;           // Clé unique normalisée (SANS accent)
  label: string;                  // Label affiché à l'utilisateur
  stepTitle?: string;             // Titre dans l'étape 3 (si différent du label)
};

/**
 * ⭐ CONFIGURATION UNIQUE DES ZONES EXTÉRIEURES ⭐
 * À utiliser dans TOUT le code pour éviter les incohérences
 */
export const EXTERIOR_ZONES: ExteriorZoneConfig[] = [
  { 
    key: "avant", 
    label: "1. Avant du véhicule",
    stepTitle: "Avant du véhicule"
  },
  { 
    key: "droit", 
    label: "2. Côté droit",
    stepTitle: "Côté droit"
  },
  { 
    key: "arriere",  // ⚠️ SANS ACCENT pour éviter les bugs
    label: "3. Arrière du véhicule",
    stepTitle: "Arrière du véhicule"
  },
  { 
    key: "coffre", 
    label: "4. Coffre et équipement",
    stepTitle: "Coffre & équipements"
  },
  { 
    key: "gauche", 
    label: "5. Côté gauche",
    stepTitle: "Côté gauche"
  },
];

/**
 * Configuration des jantes
 */
export const WHEEL_ZONES: ExteriorZoneConfig[] = [
  { key: "janteAvDroit", label: "Jante avant droite" },
  { key: "janteArDroit", label: "Jante arrière droite" },
  { key: "janteAvGauche", label: "Jante avant gauche" },
  { key: "janteArGauche", label: "Jante arrière gauche" },
];

/**
 * Toutes les zones (extérieur + jantes)
 */
export const ALL_ZONES = [...EXTERIOR_ZONES, ...WHEEL_ZONES];

/**
 * Helper : récupérer une zone par son titre (étape 3)
 */
export function getZoneByTitle(title: string): ExteriorZoneConfig | undefined {
  return ALL_ZONES.find(z => z.stepTitle === title || z.label.includes(title));
}

/**
 * Helper : récupérer la clé d'une zone par son titre
 */
export function getZoneKeyByTitle(title: string): ExteriorZoneKey | null {
  const zone = getZoneByTitle(title);
  return zone ? zone.key : null;
}

/**
 * Helper : obtenir le label d'affichage par clé
 */
export function getZoneLabelByKey(key: ExteriorZoneKey): string {
  const zone = ALL_ZONES.find(z => z.key === key);
  return zone ? zone.label : key;
}

