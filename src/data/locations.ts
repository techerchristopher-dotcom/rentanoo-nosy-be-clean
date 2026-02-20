import { MapPin, Plane, Ship } from "lucide-react";

// Points stratégiques en tête de liste (Nosy Be)
export const NOSYBE_STRATEGIC_POINTS = [
  "Aéroport Fascène",
  "Port de Hell-Ville",
  "Port d'Andoany"
];

// Zones et villages de Nosy Be (ordre alphabétique)
export const NOSYBE_LOCATIONS = [
  "Ambatoloaka",
  "Ambalavola",
  "Ampasipohy",
  "Andoany",
  "Dzamandzar",
  "Hell-Ville",
  "Lokobe",
  "Madirokely",
  "Nosy Be",
  "Nosy Komba",
  "Tanikely"
];

// Liste complète : Points stratégiques + Zones
export const NOSYBE_CITIES = [
  ...NOSYBE_STRATEGIC_POINTS,
  ...NOSYBE_LOCATIONS
];

// Fonction pour obtenir l'icône appropriée selon le lieu
export const getLocationIcon = (city: string) => {
  switch (city) {
    case "Aéroport":
      return Plane;
    case "Barge Petite Terre":
    case "Barge Grande Terre":
      return Ship;
    default:
      return MapPin;
  }
};

// Fonction pour vérifier si c'est un point stratégique
export const isStrategicPoint = (city: string): boolean => {
  return NOSYBE_STRATEGIC_POINTS.includes(city);
};

// Fonction pour vérifier si c'est une zone Nosy Be
export const isCommune = (city: string): boolean => {
  return NOSYBE_LOCATIONS.includes(city);
};
