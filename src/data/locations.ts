import { MapPin, Plane, Ship } from "lucide-react";

// Points stratégiques en tête de liste
export const STRATEGIC_POINTS = [
  "Aéroport",
  "Barge Grande Terre", 
  "Barge Petite Terre"
];

// Communes de Mayotte (ordre alphabétique)
export const MAYOTTE_COMMUNES = [
  "Acoua",
  "Bandraboua",
  "Bandrele", 
  "Bouéni",
  "Chiconi",
  "Chirongui",
  "Dembéni",
  "Dzaoudzi",
  "Kani-Kéli",
  "Koungou",
  "M'Tsangamouji",
  "Mamoudzou",
  "Mtsamboro",
  "Ouangani",
  "Pamandzi",
  "Sada",
  "Tsingoni"
];

// Liste complète : Points stratégiques + Communes
export const MAYOTTE_CITIES = [
  ...STRATEGIC_POINTS,
  ...MAYOTTE_COMMUNES
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
  return STRATEGIC_POINTS.includes(city);
};

// Fonction pour vérifier si c'est une commune
export const isCommune = (city: string): boolean => {
  return MAYOTTE_COMMUNES.includes(city);
};
