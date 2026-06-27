import { supabase } from "@/integrations/supabase/client";
import { debug } from "@/utils/logger";
import type { LocationAreaRef } from "@/types/locationArea";

const VEHICLE_SELECT_WITH_AREA =
  "*, location_areas(id, name, slug, active), vehicle_photos(photo_url, is_primary, display_order)";

const VEHICLE_SELECT_WITH_AREA_SIMPLE = "*, location_areas(id, name, slug, active)";

export interface Vehicle {
  id: string;
  owner_id: string | null;
  brand: string;
  model: string;
  color: string | null;
  year: number;
  mileage: number | null;
  price_per_day: number;
  /** Colonne DB `price_per_day_agency` (nullable) */
  price_per_day_agency?: number | null;
  description: string | null;
  image_url: string | null;
  location_area_id?: string | null;
  location_areas?: LocationAreaRef | null;
  pickup_zones: string[] | null;
  seats: number | null;
  doors: number | null;
  transmission: string | null;
  fuel_type: string | null;
  engine_capacity: string | null;
  rental_count: number | null;
  available: boolean | null;
  status: 'active' | 'inactive' | 'review' | null;
  has_ac: boolean | null;
  has_pool?: boolean | null;
  near_beach?: boolean | null;
  has_wifi?: boolean | null;
  has_private_bathroom?: boolean | null;
  has_security_guard?: boolean | null;
  near_shopping_center?: boolean | null;
  near_nightlife?: boolean | null;
  has_equipped_kitchen?: boolean | null;
  has_solar_panel?: boolean | null;
  has_housekeeper?: boolean | null;
  has_laundry?: boolean | null;
  has_remote_work?: boolean | null;
  has_canal_plus?: boolean | null;
  has_gps: boolean | null;
  has_cruise_control: boolean | null;
  has_bluetooth: boolean | null;
  has_carplay: boolean | null;
  has_audio_input: boolean | null;
  vehicle_category: string | null;
  // Type explicite de véhicule (car, moto, scooter, accommodation)
  vehicle_type?: 'car' | 'moto' | 'scooter' | 'accommodation' | null;
  listing_owner_id?: string | null;
  // Nouveaux champs de remises
  low_season_discount: number | null;
  high_season_surcharge: number | null;
  long_duration_discount_14: number | null;
  long_duration_discount_60: number | null;

  /** Montant caution (empreinte) en euros. 0 = pas de caution. */
  deposit_amount: number | null;

  // 🆕 Services supplémentaires configurés par le propriétaire
  // 🛩️ Services Aéroport
  airport_pickup_service?: boolean | null;
  airport_pickup_retrieval?: boolean | null;
  airport_pickup_retrieval_free?: boolean | null;
  airport_pickup_retrieval_price?: number | null;
  airport_pickup_return?: boolean | null;
  airport_pickup_return_free?: boolean | null;
  airport_pickup_return_price?: number | null;
  
  // 🚢 Services Barge Petite Terre
  barge_petite_terre_service?: boolean | null;
  barge_petite_terre_retrieval?: boolean | null;
  barge_petite_terre_retrieval_free?: boolean | null;
  barge_petite_terre_retrieval_price?: number | null;
  barge_petite_terre_return?: boolean | null;
  barge_petite_terre_return_free?: boolean | null;
  barge_petite_terre_return_price?: number | null;
  
  // 🚢 Services Barge Grande Terre
  barge_grande_terre_service?: boolean | null;
  barge_grande_terre_retrieval?: boolean | null;
  barge_grande_terre_retrieval_free?: boolean | null;
  barge_grande_terre_retrieval_price?: number | null;
  barge_grande_terre_return?: boolean | null;
  barge_grande_terre_return_free?: boolean | null;
  barge_grande_terre_return_price?: number | null;
  
  // 🚚 Services Livraison à domicile
  home_delivery_service?: boolean | null;
  home_delivery_pickup?: boolean | null;
  home_delivery_pickup_free?: boolean | null;
  home_delivery_pickup_price?: number | null;
  home_delivery_return?: boolean | null;
  home_delivery_return_free?: boolean | null;
  home_delivery_return_price?: number | null;
  
  // 👶 Services Siège bébé
  baby_seat_service?: boolean | null;
  baby_seat_free?: boolean | null;
  baby_seat_price?: number | null;
  
  // 👨‍✈️ Services Conducteur additionnel
  additional_driver_service?: boolean | null;
  additional_driver_free?: boolean | null;
  additional_driver_price?: number | null;
  
  created_at: string | null;
  updated_at: string | null;

  /** URL de la photo principale (dénormalisée depuis vehicle_photos, pour éviter 2e requête) */
  primaryPhotoUrl?: string | null;
}

/** HEIC non supporté par le navigateur → ignorer pour éviter erreurs d'affichage / dégradation LCP */
function isHeicUrl(url: string | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.endsWith(".heic") || lower.includes(".heic?");
}

/** Règles de sélection photo principale (alignées avec PhotoService.getPrimaryPhotosForVehicles).
 * Ignore les .heic (non affichables) et privilégie jpg/png/webp. */
function pickPrimaryPhotoUrl(photos: Array<{ photo_url?: string; is_primary?: boolean; display_order?: number }> | null): string | null {
  if (!photos || photos.length === 0) return null;
  const valid = photos.filter((p) => p.photo_url && !isHeicUrl(p.photo_url));
  if (valid.length === 0) return null;
  const primary = valid.find((p) => p.is_primary);
  if (primary?.photo_url) return primary.photo_url;
  const sorted = [...valid].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
  return sorted[0]?.photo_url ?? null;
}

export const SupabaseVehiclesService = {
  /**
   * Récupère tous les véhicules disponibles depuis Supabase
   */
  async getAvailableVehicles(filters?: {
    vehicleCategories?: string[];
    vehicleType?: 'car' | 'moto' | 'scooter' | 'accommodation';
    nearBeach?: boolean;
    hasPool?: boolean;
    fuel_type?: string[];
    transmission?: string[];
    /** Limite le nombre de lignes récupérées (utile pour les pages qui n'ont besoin que d'un aperçu). */
    limit?: number;
  }): Promise<Vehicle[]> {
    try {
      let query = supabase
        .from('vehicles')
        .select(VEHICLE_SELECT_WITH_AREA)
        .eq('available', true);

      // Filtre par type de véhicule (server-side)
      if (filters?.vehicleType) {
        query = query.eq('vehicle_type', filters.vehicleType);
      }

      // Filtre bord de mer
      if (filters?.nearBeach) {
        query = query.eq('near_beach', true);
      }

      // Filtre piscine
      if (filters?.hasPool) {
        query = query.eq('has_pool', true);
      }

      // Appliquer les filtres si fournis
      if (filters?.vehicleCategories?.length) {
        query = query.in('vehicle_category', filters.vehicleCategories);
      }

      if (filters?.fuel_type?.length) {
        query = query.in('fuel_type', filters.fuel_type);
      }

      if (filters?.transmission?.length) {
        query = query.in('transmission', filters.transmission);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur Supabase:', error);
        throw error;
      }

      // Enrichir chaque véhicule avec primaryPhotoUrl (évite getPrimaryPhotosForVehicles)
      const rows = (data || []) as Array<Vehicle & { vehicle_photos?: Array<{ photo_url?: string; is_primary?: boolean; display_order?: number }> }>;
      return rows.map(({ vehicle_photos, ...v }) => ({
        ...v,
        primaryPhotoUrl: pickPrimaryPhotoUrl(vehicle_photos) ?? null,
      })) as Vehicle[];
    } catch (error) {
      console.error('Erreur lors de la récupération des véhicules:', error);
      return [];
    }
  },

  /**
   * Filtre les véhicules selon les critères
   */
  async filterVehicles(filters: {
    fuel_type?: string[];
    transmission?: string[];
  }): Promise<Vehicle[]> {
    try {
      let query = supabase
        .from('vehicles')
        .select('*')
        .eq('available', true);

      if (filters.fuel_type && filters.fuel_type.length > 0) {
        query = query.in('fuel_type', filters.fuel_type);
      }

      if (filters.transmission && filters.transmission.length > 0) {
        query = query.in('transmission', filters.transmission);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur Supabase:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Erreur lors du filtrage des véhicules:', error);
      return [];
    }
  },

  async createVehicle(vehicleData: {
    owner_id: string;
    brand: string;
    model: string;
    color?: string;
    year: number;
    mileage?: number;
    price_per_day: number;
    description?: string;
    image_url?: string;
    location_area_id?: string | null;
    pickup_zones?: string[] | null;
    seats?: number;
    doors?: number;
    transmission?: string;
    fuel_type?: string;
    engine_capacity?: string;
    vehicle_category?: string;
    vehicle_type?: 'car' | 'moto' | 'scooter' | 'accommodation';
    has_ac?: boolean;
    has_gps?: boolean;
    has_cruise_control?: boolean;
    has_bluetooth?: boolean;
    has_carplay?: boolean;
    has_audio_input?: boolean;
    low_season_discount?: number;
    high_season_surcharge?: number;
    long_duration_discount_14?: number;
    long_duration_discount_60?: number;
    airport_pickup_service?: boolean | null;
    airport_pickup_retrieval?: boolean | null;
    airport_pickup_retrieval_free?: boolean | null;
    airport_pickup_retrieval_price?: number | null;
    airport_pickup_return?: boolean | null;
    airport_pickup_return_free?: boolean | null;
    airport_pickup_return_price?: number | null;
    barge_petite_terre_service?: boolean | null;
    barge_petite_terre_retrieval?: boolean | null;
    barge_petite_terre_retrieval_free?: boolean | null;
    barge_petite_terre_retrieval_price?: number | null;
    barge_petite_terre_return?: boolean | null;
    barge_petite_terre_return_free?: boolean | null;
    barge_petite_terre_return_price?: number | null;
    barge_grande_terre_service?: boolean | null;
    barge_grande_terre_retrieval?: boolean | null;
    barge_grande_terre_retrieval_free?: boolean | null;
    barge_grande_terre_retrieval_price?: number | null;
    barge_grande_terre_return?: boolean | null;
    barge_grande_terre_return_free?: boolean | null;
    barge_grande_terre_return_price?: number | null;
    home_delivery_service?: boolean | null;
    home_delivery_pickup?: boolean | null;
    home_delivery_pickup_free?: boolean | null;
    home_delivery_pickup_price?: number | null;
    home_delivery_return?: boolean | null;
    home_delivery_return_free?: boolean | null;
    home_delivery_return_price?: number | null;
    baby_seat_service?: boolean | null;
    baby_seat_free?: boolean | null;
    baby_seat_price?: number | null;
    additional_driver_service?: boolean | null;
    additional_driver_free?: boolean | null;
    additional_driver_price?: number | null;
    available?: boolean;
    status?: 'active' | 'inactive' | 'review';
  }): Promise<{ data: Vehicle | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          owner_id: vehicleData.owner_id,
          brand: vehicleData.brand,
          model: vehicleData.model,
          year: vehicleData.year,
          mileage: vehicleData.mileage,
          fuel_type: vehicleData.fuel_type,
          transmission: vehicleData.transmission,
          seats: vehicleData.seats,
          price_per_day: vehicleData.price_per_day,
          // Champs optionnels existants dans la table réelle
          color: vehicleData.color ?? null,
          license_plate: vehicleData.license_plate ?? null,
          vehicle_category: vehicleData.vehicle_category ?? null,
          vehicle_type: vehicleData.vehicle_type ?? null,
          pickup_zones: vehicleData.pickup_zones ?? null,
          description: vehicleData.description ?? null,
          engine_capacity: vehicleData.engine_capacity ?? null,
          location_area_id: vehicleData.location_area_id ?? null,
          available: vehicleData.available ?? true,
        })
        .select()
        .single();

      if (error) {
        console.error('Erreur Supabase lors de la création:', error);
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Erreur lors de la création du véhicule:', error);
      return { data: null, error: 'Erreur lors de la création du véhicule' };
    }
  },

  async updateVehicleImage(vehicleId: string, imageUrl: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ image_url: imageUrl })
        .eq('id', vehicleId);

      if (error) {
        console.error('Erreur lors de la mise à jour de l\'image:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'image:', error);
      return { success: false, error: 'Erreur lors de la mise à jour de l\'image' };
    }
  },

  async getOwnerVehicles(
    ownerId: string,
    options?: { isAdmin?: boolean }
  ): Promise<{ data: Vehicle[]; error: string | null }> {
    try {
      // Admin : bypass du filtre owner_id pour voir tous les véhicules de la plateforme.
      // Les RLS Supabase autorisent déjà l'accès complet aux profils `is_admin = true`.
      let query = supabase
        .from('vehicles')
        .select('*');

      if (!options?.isAdmin) {
        query = query.eq('owner_id', ownerId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur Supabase lors de la récupération des véhicules du propriétaire:', error);
        return { data: [], error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Erreur lors de la récupération des véhicules du propriétaire:', error);
      return { data: [], error: 'Erreur lors de la récupération des véhicules du propriétaire' };
    }
  },

  /**
   * Récupère un véhicule disponible à partir des 8 premiers caractères de son ID
   * (format utilisé dans les URLs /vehicle/:license et /hebergement/:license).
   * Requête ciblée par plage d'ID, évite de charger tout le catalogue pour
   * afficher une seule fiche produit.
   */
  async getVehicleByShortId(shortId: string): Promise<{ data: Vehicle | null; error: string | null }> {
    const prefix = shortId.toLowerCase();
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(VEHICLE_SELECT_WITH_AREA_SIMPLE)
        .gte('id', `${prefix}-0000-0000-0000-000000000000`)
        .lte('id', `${prefix}-ffff-ffff-ffff-ffffffffffff`)
        .eq('available', true)
        .maybeSingle();

      if (error) {
        console.error('[SupabaseVehiclesService] ❌ getVehicleByShortId error:', error);
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      console.error('[SupabaseVehiclesService] ❌ getVehicleByShortId exception:', error);
      return { data: null, error: 'Erreur lors de la récupération du véhicule' };
    }
  },

  /**
   * Récupère un véhicule par son ID
   */
  async getVehicleById(vehicleId: string): Promise<{ data: Vehicle | null; error: string | null }> {
    debug("[SupabaseVehiclesService] getVehicleById called with vehicleId =", vehicleId);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(VEHICLE_SELECT_WITH_AREA_SIMPLE)
        .eq('id', vehicleId)
        .single();

      debug("[SupabaseVehiclesService] Supabase raw response - data:", data, ", error:", error);

      if (error) {
        console.error('[SupabaseVehiclesService] ❌ Supabase error:', error);
        return { data: null, error: error.message };
      }

      debug("[SupabaseVehiclesService] ✅ Vehicle found, returning data");
      return { data, error: null };
    } catch (error) {
      console.error('[SupabaseVehiclesService] ❌ Exception caught:', error);
      return { data: null, error: 'Erreur lors de la récupération du véhicule' };
    }
  },

  /**
   * Met à jour un véhicule
   */
  async updateVehicle(vehicleId: string, updateData: {
    brand?: string;
    model?: string;
    color?: string;
    year?: number;
    mileage?: number;
    fuel_type?: string;
    transmission?: string;
    seats?: number;
    doors?: number;
    engine_capacity?: string;
    price_per_day?: number;
    price_per_day_agency?: number | null;
    description?: string;
    location_area_id?: string | null;
    available?: boolean;
    status?: 'active' | 'inactive' | 'review';
    pickup_zones?: string[] | null;
    listing_owner_id?: string | null;
    listing_owner_phone?: string | null;
    description_en?: string | null;
    description_de?: string | null;
    description_it?: string | null;
    has_ac?: boolean;
    has_pool?: boolean;
    near_beach?: boolean;
    has_wifi?: boolean;
    has_private_bathroom?: boolean;
    has_security_guard?: boolean;
    near_shopping_center?: boolean;
    near_nightlife?: boolean;
    has_equipped_kitchen?: boolean;
    has_solar_panel?: boolean;
    has_housekeeper?: boolean;
    has_laundry?: boolean;
    has_remote_work?: boolean;
    has_canal_plus?: boolean;
    has_gps?: boolean;
    has_cruise_control?: boolean;
    has_bluetooth?: boolean;
    has_carplay?: boolean;
    has_audio_input?: boolean;
    // Nouveaux champs de remises
    low_season_discount?: number;
    high_season_surcharge?: number;
    long_duration_discount_14?: number;
    long_duration_discount_60?: number;
    deposit_amount?: number;
  }): Promise<{ data: Vehicle | null; error: string | null }> {
    try {
      debug('SupabaseVehiclesService.updateVehicle - ID:', vehicleId);
      debug('SupabaseVehiclesService.updateVehicle - Données:', updateData);

      const finalUpdateData = {
        ...updateData,
        updated_at: new Date().toISOString()
      };

      debug('SupabaseVehiclesService.updateVehicle - Données finales:', finalUpdateData);

      // Colonne legacy inexistante — ignorée si présente dans le payload
      const { location, ...safeUpdateData } = finalUpdateData as Record<string, unknown> & {
        location?: unknown;
      };
      void location;

      const { data, error } = await supabase
        .from('vehicles')
        .update(safeUpdateData)
        .eq('id', vehicleId)
        .select()
        .single();

      debug('SupabaseVehiclesService.updateVehicle - Réponse Supabase:', { data, error });

      if (error) {
        console.error('Erreur Supabase lors de la mise à jour du véhicule:', error);
        console.error('Code d\'erreur:', error.code);
        console.error('Message d\'erreur:', error.message);
        console.error('Détails:', error.details);
        console.error('Hint:', error.hint);
        return { data: null, error: error.message };
      }

      debug('SupabaseVehiclesService.updateVehicle - Succès:', data);
      return { data, error: null };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du véhicule:', error);
      return { data: null, error: `Erreur lors de la mise à jour du véhicule: ${error instanceof Error ? error.message : String(error)}` };
    }
  },

  /**
   * Recherche les véhicules disponibles avec filtres de dates et localisation
   */
  async searchAvailableVehicles(filters: {
    location?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Vehicle[]> {
    try {
      // 1. Récupérer les véhicules disponibles (avec photo principale en un seul appel)
      let query = supabase
        .from('vehicles')
        .select(VEHICLE_SELECT_WITH_AREA)
        .eq('available', true);

      const { data: vehiclesData, error: vehiclesError } = await query
        .order('created_at', { ascending: false });

      if (vehiclesError) {
        console.error('Erreur recherche véhicules:', vehiclesError);
        throw vehiclesError;
      }

      const rows = (vehiclesData || []) as Array<Vehicle & { vehicle_photos?: Array<{ photo_url?: string; is_primary?: boolean; display_order?: number }> }>;
      let availableVehicles = rows.map(({ vehicle_photos, ...v }) => ({
        ...v,
        primaryPhotoUrl: pickPrimaryPhotoUrl(vehicle_photos) ?? null,
      })) as Vehicle[];

      // 2. Filtre par localisation dans pickup_zones (côté client)
      if (filters.location && filters.location.trim()) {
        const searchTerm = filters.location.trim().toLowerCase();
        availableVehicles = availableVehicles.filter(v => 
          v.pickup_zones && v.pickup_zones.some(zone => 
            zone.toLowerCase().includes(searchTerm)
          )
        );
      }

      // 3. Filtre par disponibilité de dates
      if (filters.startDate && filters.endDate) {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('vehicle_id')
          .in('status', ['pending', 'accepted', 'active'])
          .lte('start_date', filters.endDate)
          .gte('end_date', filters.startDate);

        if (bookingsError) {
          console.error('Erreur vérification réservations:', bookingsError);
          throw bookingsError;
        }

        const unavailableIds = new Set(
          bookingsData?.map(b => b.vehicle_id) || []
        );

        availableVehicles = availableVehicles.filter(
          v => !unavailableIds.has(v.id)
        );
      }

      debug('🔍 Recherche véhicules - Filtres:', filters);
      debug('✅ Véhicules disponibles trouvés:', availableVehicles.length);

      return availableVehicles;
    } catch (error) {
      console.error('Erreur recherche:', error);
      return [];
    }
  }
};


