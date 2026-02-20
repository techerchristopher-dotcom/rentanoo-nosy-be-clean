import { Vehicle } from "@/types";
import { Vehicle as SupabaseVehicle } from "@/services/supabaseVehiclesService";

// Mapping voiture : copie conforme du mapping inline actuel dans Index.tsx
export const mapToCarVehicle = (vehicle: SupabaseVehicle): Vehicle => ({
  id: vehicle.id,
  ownerId: vehicle.owner_id || "",
  license: vehicle.id.substring(0, 8).toUpperCase(), // Temporaire
  brand: vehicle.brand,
  model: vehicle.model,
  color: "Non spécifié", // À ajouter dans la DB plus tard
  fuel: (vehicle.fuel_type as any) || "gasoline",
  year: vehicle.year,
  hasAC: true, // À ajouter dans la DB plus tard
  doors: vehicle.seats || 5,
  transmission: (vehicle.transmission as any) || "manual",
  mileage: 0, // À ajouter dans la DB plus tard
  dailyPrice: vehicle.price_per_day,
  currency: "EUR",
  latitude: 0, // À ajouter dans la DB plus tard
  longitude: 0, // À ajouter dans la DB plus tard
  status: "available" as any,
  location:
    vehicle.pickup_zones && vehicle.pickup_zones.length > 0
      ? vehicle.pickup_zones.join(", ")
      : "Nosy Be, Madagascar", // Utiliser les zones de prise en charge
  createdAt: vehicle.created_at || new Date().toISOString(),
  updatedAt: vehicle.updated_at || new Date().toISOString(),
});

// Normalisation de la transmission moto à partir de la valeur DB
// Exemples :
//  - "manual"  -> "manual"
//  - "automatic" -> "automatic"
//  - "auto"   -> "automatic"
//  - "manuel" -> "manual"
//  - tout autre / vide -> undefined
function normalizeTransmission(
  value?: string | null
): "manual" | "automatic" | undefined {
  if (!value) return undefined;

  if (value === "manual" || value === "automatic") return value;
  if (value === "auto") return "automatic";
  if (value === "manuel") return "manual";

  return undefined;
}

// Mapping moto : valeurs adaptées pour affichage moto
export const mapToMotoVehicle = (vehicle: SupabaseVehicle): Vehicle => ({
  id: vehicle.id,
  ownerId: vehicle.owner_id || "",
  license: vehicle.id.substring(0, 8).toUpperCase(),
  brand: vehicle.brand,
  model: vehicle.model,
  // On ne force plus de fallback FR ici : la couleur est gérée en DB ou en UI
  color: (vehicle.color ?? undefined) as any,
  fuel: (vehicle.fuel_type as any) || "gasoline",
  year: vehicle.year,
  hasAC: false,
  doors: 0,
  transmission: normalizeTransmission(vehicle.transmission) as any,
  mileage: vehicle.mileage ?? 0,
  dailyPrice: vehicle.price_per_day,
  currency: "EUR",
  latitude: 0,
  longitude: 0,
  status: "available" as any,
  description: vehicle.description || undefined, // Description du véhicule
  // Pas de fallback texte ici : si pas de pickup_zones, l'UI gère l'affichage
  location:
    vehicle.pickup_zones && vehicle.pickup_zones.length > 0
      ? vehicle.pickup_zones.join(", ")
      : (undefined as any),
  createdAt: vehicle.created_at || new Date().toISOString(),
  updatedAt: vehicle.updated_at || new Date().toISOString(),
  // On ne force plus 2 places par défaut : l'UI affichera "Non spécifié" si nécessaire
  seats: (vehicle.seats ?? undefined) as any,
  engineCapacity: vehicle.engine_capacity || undefined,
  // 🆕 Services supplémentaires - MAPPING COMPLET (identique à voiture)
  // 🛩️ Services Aéroport
  airport_pickup_service: vehicle.airport_pickup_service || false,
  airport_pickup_retrieval: vehicle.airport_pickup_retrieval || false,
  airport_pickup_retrieval_free: vehicle.airport_pickup_retrieval_free || false,
  airport_pickup_retrieval_price: vehicle.airport_pickup_retrieval_price || 0,
  airport_pickup_return: vehicle.airport_pickup_return || false,
  airport_pickup_return_free: vehicle.airport_pickup_return_free || false,
  airport_pickup_return_price: vehicle.airport_pickup_return_price || 0,
  // 🚢 Services Barge Petite Terre
  barge_petite_terre_service: vehicle.barge_petite_terre_service || false,
  barge_petite_terre_retrieval: vehicle.barge_petite_terre_retrieval || false,
  barge_petite_terre_retrieval_free: vehicle.barge_petite_terre_retrieval_free || false,
  barge_petite_terre_retrieval_price: vehicle.barge_petite_terre_retrieval_price || 0,
  barge_petite_terre_return: vehicle.barge_petite_terre_return || false,
  barge_petite_terre_return_free: vehicle.barge_petite_terre_return_free || false,
  barge_petite_terre_return_price: vehicle.barge_petite_terre_return_price || 0,
  // 🚢 Services Barge Grande Terre
  barge_grande_terre_service: vehicle.barge_grande_terre_service || false,
  barge_grande_terre_retrieval: vehicle.barge_grande_terre_retrieval || false,
  barge_grande_terre_retrieval_free: vehicle.barge_grande_terre_retrieval_free || false,
  barge_grande_terre_retrieval_price: vehicle.barge_grande_terre_retrieval_price || 0,
  barge_grande_terre_return: vehicle.barge_grande_terre_return || false,
  barge_grande_terre_return_free: vehicle.barge_grande_terre_return_free || false,
  barge_grande_terre_return_price: vehicle.barge_grande_terre_return_price || 0,
  // 🚚 Services Livraison à domicile
  home_delivery_service: vehicle.home_delivery_service || false,
  home_delivery_pickup: vehicle.home_delivery_pickup || false,
  home_delivery_pickup_free: vehicle.home_delivery_pickup_free || false,
  home_delivery_pickup_price: vehicle.home_delivery_pickup_price || 0,
  home_delivery_return: vehicle.home_delivery_return || false,
  home_delivery_return_free: vehicle.home_delivery_return_free || false,
  home_delivery_return_price: vehicle.home_delivery_return_price || 0,
  // 👶 Services Siège bébé
  baby_seat_service: vehicle.baby_seat_service || false,
  baby_seat_free: vehicle.baby_seat_free || false,
  baby_seat_price: vehicle.baby_seat_price || 0,
  // 👨‍✈️ Services Conducteur additionnel
  additional_driver_service: vehicle.additional_driver_service || false,
  additional_driver_free: vehicle.additional_driver_free || false,
  additional_driver_price: vehicle.additional_driver_price || 0,
});


