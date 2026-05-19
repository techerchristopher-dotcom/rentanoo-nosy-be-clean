import { supabase } from "@/integrations/supabase/client";
import { ProfileService } from "./profile";

export interface VehicleOwnerInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  // Statistiques
  totalVehicles: number;
  totalRentals: number;
  memberSince: string;
  // Informations de contact
  phone?: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
}

export interface VehicleWithOwner {
  vehicle: {
    id: string;
    brand: string;
    model: string;
    year: number;
    mileage?: number;
    description?: string;
    rental_count: number;
    owner_id: string;
  };
  owner: VehicleOwnerInfo;
}

export class VehicleOwnerService {
  /**
   * Récupère les informations complètes du propriétaire d'un véhicule
   */
  static async getVehicleOwnerInfo(vehicleId: string): Promise<{ data: VehicleWithOwner | null; error: string | null }> {
    try {
      // Récupérer les informations du véhicule
      const { data: vehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, brand, model, year, mileage, description, rental_count, owner_id')
        .eq('id', vehicleId)
        .single();

      if (vehicleError || !vehicle) {
        console.error('Erreur lors de la récupération du véhicule:', vehicleError);
        return { data: null, error: vehicleError?.message || 'Véhicule non trouvé' };
      }

      // Récupérer les informations du propriétaire
      const { data: ownerProfile, error: ownerError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url, bio, created_at, phone, kyc_status')
        .eq('id', vehicle.owner_id)
        .single();

      if (ownerError || !ownerProfile) {
        console.error('Erreur lors de la récupération du propriétaire:', ownerError);
        return { data: null, error: ownerError?.message || 'Propriétaire non trouvé' };
      }

      // Récupérer les statistiques du propriétaire
      const { data: ownerStats, error: statsError } = await supabase
        .from('vehicles')
        .select('rental_count')
        .eq('owner_id', vehicle.owner_id);

      if (statsError) {
        console.error('Erreur lors de la récupération des statistiques:', statsError);
      }

      // Calculer les statistiques
      const totalVehicles = ownerStats?.length || 0;
      const totalRentals = ownerStats?.reduce((sum, v) => sum + (v.rental_count || 0), 0) || 0;

      // Formater les données
      const ownerInfo: VehicleOwnerInfo = {
        id: ownerProfile.id,
        firstName: ownerProfile.first_name || '',
        lastName: ownerProfile.last_name || '',
        email: ownerProfile.email || '',
        avatarUrl: ownerProfile.avatar_url || undefined,
        bio: ownerProfile.bio || undefined,
        createdAt: ownerProfile.created_at,
        totalVehicles,
        totalRentals,
        memberSince: new Date(ownerProfile.created_at).toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long'
        }),
        phone: ownerProfile.phone || undefined,
        kycStatus: ownerProfile.kyc_status || 'pending'
      };

      const vehicleWithOwner: VehicleWithOwner = {
        vehicle: {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          mileage: vehicle.mileage || undefined,
          description: vehicle.description || undefined,
          rental_count: vehicle.rental_count || 0,
          owner_id: vehicle.owner_id
        },
        owner: ownerInfo
      };

      return { data: vehicleWithOwner, error: null };
    } catch (error) {
      console.error('Erreur dans getVehicleOwnerInfo:', error);
      return { data: null, error: 'Erreur lors de la récupération des informations' };
    }
  }

  /**
   * Incrémente le compteur de location d'un véhicule
   */
  static async incrementRentalCount(vehicleId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.rpc('increment_rental_count', {
        vehicle_id: vehicleId
      });

      if (error) {
        console.error('Erreur lors de l\'incrémentation:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Erreur dans incrementRentalCount:', error);
      return { success: false, error: 'Erreur lors de l\'incrémentation du compteur' };
    }
  }

  /**
   * Récupère les statistiques globales d'un propriétaire.
   * Si `options.isAdmin === true`, agrège sur tous les véhicules de la plateforme.
   */
  static async getOwnerStats(
    ownerId: string,
    options?: { isAdmin?: boolean }
  ): Promise<{ data: { totalVehicles: number; totalRentals: number; averageRating?: number } | null; error: string | null }> {
    try {
      let query = supabase
        .from('vehicles')
        .select('rental_count');

      if (!options?.isAdmin) {
        query = query.eq('owner_id', ownerId);
      }

      const { data: vehicles, error } = await query;

      if (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        return { data: null, error: error.message };
      }

      const totalVehicles = vehicles?.length || 0;
      const totalRentals = vehicles?.reduce((sum, v) => sum + (v.rental_count || 0), 0) || 0;

      return {
        data: {
          totalVehicles,
          totalRentals
        },
        error: null
      };
    } catch (error) {
      console.error('Erreur dans getOwnerStats:', error);
      return { data: null, error: 'Erreur lors de la récupération des statistiques' };
    }
  }
}
