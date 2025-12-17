import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type Vehicle = Database['public']['Tables']['vehicles']['Row'];
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update'];

export interface VehicleWithPhotos extends Vehicle {
  vehicle_photos?: {
    id: string;
    photo_url: string;
    is_primary: boolean;
    display_order: number;
  }[];
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  };
}

export class SupabaseVehiclesService {
  /**
   * Récupérer tous les véhicules avec leurs photos
   */
  static async getAllVehicles(): Promise<VehicleWithPhotos[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        profiles (
          id,
          full_name,
          avatar_url,
          email
        )
      `)
      .eq('available', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Récupérer un véhicule par son ID
   */
  static async getVehicleById(id: string): Promise<VehicleWithPhotos | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        profiles (
          id,
          full_name,
          avatar_url,
          email,
          phone
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching vehicle:', error);
      return null;
    }

    return data;
  }

  /**
   * Récupérer un véhicule par license (plaque d'immatriculation)
   * Note: La colonne 'license' n'existe pas encore dans la table.
   * Pour l'instant, on utilise l'ID.
   */
  static async getVehicleByLicense(license: string): Promise<VehicleWithPhotos | null> {
    // TODO: Ajouter une colonne 'license' à la table vehicles
    // Pour l'instant, on cherche par ID
    return this.getVehicleById(license);
  }

  /**
   * Récupérer les véhicules d'un propriétaire
   */
  static async getVehiclesByOwner(ownerId: string): Promise<VehicleWithPhotos[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        profiles (
          id,
          full_name,
          avatar_url,
          email
        )
      `)
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching owner vehicles:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Rechercher des véhicules selon des critères
   */
  static async searchVehicles(params: {
    location?: string;
    minPrice?: number;
    maxPrice?: number;
    transmission?: string;
    fuelType?: string;
    minSeats?: number;
  }): Promise<VehicleWithPhotos[]> {
    let query = supabase
      .from('vehicles')
      .select(`
        *,
        profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('available', true);

    if (params.location) {
      query = query.ilike('location', `%${params.location}%`);
    }

    if (params.minPrice !== undefined) {
      query = query.gte('price_per_day', params.minPrice);
    }

    if (params.maxPrice !== undefined) {
      query = query.lte('price_per_day', params.maxPrice);
    }

    if (params.transmission) {
      query = query.eq('transmission', params.transmission);
    }

    if (params.fuelType) {
      query = query.eq('fuel_type', params.fuelType);
    }

    if (params.minSeats) {
      query = query.gte('seats', params.minSeats);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching vehicles:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Créer un nouveau véhicule
   */
  static async createVehicle(vehicle: VehicleInsert): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .insert(vehicle)
      .select()
      .single();

    if (error) {
      console.error('Error creating vehicle:', error);
      throw error;
    }

    return data;
  }

  /**
   * Mettre à jour un véhicule
   */
  static async updateVehicle(id: string, updates: VehicleUpdate): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating vehicle:', error);
      throw error;
    }

    return data;
  }

  /**
   * Supprimer un véhicule
   */
  static async deleteVehicle(id: string): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting vehicle:', error);
      throw error;
    }
  }

  /**
   * Incrémenter le compteur de locations
   */
  static async incrementRentalCount(id: string): Promise<void> {
    const { error } = await supabase.rpc('increment_rental_count', {
      vehicle_id: id
    });

    if (error) {
      // Si la fonction n'existe pas, on fait un update manuel
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('rental_count')
        .eq('id', id)
        .single();

      if (vehicle) {
        await supabase
          .from('vehicles')
          .update({ rental_count: (vehicle.rental_count || 0) + 1 })
          .eq('id', id);
      }
    }
  }
}
