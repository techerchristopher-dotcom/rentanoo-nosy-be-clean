import { supabase } from "@/integrations/supabase/client";
import type { ListingOwnerType } from "./listingOwners";

export type OwnerDisplaySource = "listing_owner" | "profile";

export interface VehicleOwnerInfo {
  id: string;
  source: OwnerDisplaySource;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  ownerType?: ListingOwnerType;
  totalVehicles: number;
  totalRentals: number;
  memberSince: string;
  phone?: string;
  kycStatus: "pending" | "verified" | "rejected";
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

function formatMemberSince(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
  });
}

function firstNameFromDisplayName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || displayName;
}

export class VehicleOwnerService {
  static async getVehicleOwnerInfo(
    vehicleId: string
  ): Promise<{ data: VehicleWithOwner | null; error: string | null }> {
    try {
      const { data: vehicle, error: vehicleError } = await supabase
        .from("vehicles")
        .select(
          "id, brand, model, year, mileage, description, rental_count, owner_id, listing_owner_id"
        )
        .eq("id", vehicleId)
        .single();

      if (vehicleError || !vehicle) {
        console.error("Erreur lors de la récupération du véhicule:", vehicleError);
        return { data: null, error: vehicleError?.message || "Véhicule non trouvé" };
      }

      if (vehicle.listing_owner_id) {
        const { data: listingOwner, error: listingError } = await supabase
          .from("listing_owners")
          .select("id, display_name, avatar_url, owner_type, created_at")
          .eq("id", vehicle.listing_owner_id)
          .maybeSingle();

        if (listingError) {
          console.warn("listing_owner introuvable, fallback profile:", listingError);
        } else if (listingOwner) {
          const { data: listingStats, error: statsError } = await supabase
            .from("vehicles")
            .select("rental_count")
            .eq("listing_owner_id", vehicle.listing_owner_id);

          if (statsError) {
            console.error("Erreur stats listing_owner:", statsError);
          }

          const totalVehicles = listingStats?.length || 0;
          const totalRentals =
            listingStats?.reduce((sum, v) => sum + (v.rental_count || 0), 0) || 0;
          const displayName = listingOwner.display_name || "";

          const ownerInfo: VehicleOwnerInfo = {
            id: listingOwner.id,
            source: "listing_owner",
            displayName,
            firstName: displayName,
            lastName: "",
            email: "",
            avatarUrl: listingOwner.avatar_url || undefined,
            bio: undefined,
            createdAt: listingOwner.created_at,
            ownerType: listingOwner.owner_type as ListingOwnerType,
            totalVehicles,
            totalRentals,
            memberSince: formatMemberSince(listingOwner.created_at),
            kycStatus: "pending",
          };

          return {
            data: {
              vehicle: {
                id: vehicle.id,
                brand: vehicle.brand,
                model: vehicle.model,
                year: vehicle.year,
                mileage: vehicle.mileage || undefined,
                description: vehicle.description || undefined,
                rental_count: vehicle.rental_count || 0,
                owner_id: vehicle.owner_id,
              },
              owner: ownerInfo,
            },
            error: null,
          };
        }
      }

      const { data: ownerProfile, error: ownerError } = await supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, email, avatar_url, bio, created_at, phone, kyc_status"
        )
        .eq("id", vehicle.owner_id)
        .single();

      if (ownerError || !ownerProfile) {
        console.error("Erreur lors de la récupération du propriétaire:", ownerError);
        return { data: null, error: ownerError?.message || "Propriétaire non trouvé" };
      }

      const { data: ownerStats, error: statsError } = await supabase
        .from("vehicles")
        .select("rental_count")
        .eq("owner_id", vehicle.owner_id);

      if (statsError) {
        console.error("Erreur lors de la récupération des statistiques:", statsError);
      }

      const totalVehicles = ownerStats?.length || 0;
      const totalRentals =
        ownerStats?.reduce((sum, v) => sum + (v.rental_count || 0), 0) || 0;
      const displayName =
        [ownerProfile.first_name, ownerProfile.last_name].filter(Boolean).join(" ").trim() ||
        ownerProfile.email ||
        "";

      const ownerInfo: VehicleOwnerInfo = {
        id: ownerProfile.id,
        source: "profile",
        displayName,
        firstName: ownerProfile.first_name || "",
        lastName: ownerProfile.last_name || "",
        email: ownerProfile.email || "",
        avatarUrl: ownerProfile.avatar_url || undefined,
        bio: ownerProfile.bio || undefined,
        createdAt: ownerProfile.created_at,
        totalVehicles,
        totalRentals,
        memberSince: formatMemberSince(ownerProfile.created_at),
        phone: ownerProfile.phone || undefined,
        kycStatus: ownerProfile.kyc_status || "pending",
      };

      return {
        data: {
          vehicle: {
            id: vehicle.id,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            mileage: vehicle.mileage || undefined,
            description: vehicle.description || undefined,
            rental_count: vehicle.rental_count || 0,
            owner_id: vehicle.owner_id,
          },
          owner: ownerInfo,
        },
        error: null,
      };
    } catch (error) {
      console.error("Erreur dans getVehicleOwnerInfo:", error);
      return { data: null, error: "Erreur lors de la récupération des informations" };
    }
  }

  static async incrementRentalCount(
    vehicleId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { error } = await supabase.rpc("increment_rental_count", {
        vehicle_id: vehicleId,
      });

      if (error) {
        console.error("Erreur lors de l'incrémentation:", error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error("Erreur dans incrementRentalCount:", error);
      return { success: false, error: "Erreur lors de l'incrémentation du compteur" };
    }
  }

  static async getOwnerStats(
    ownerId: string,
    options?: { isAdmin?: boolean }
  ): Promise<{
    data: { totalVehicles: number; totalRentals: number; averageRating?: number } | null;
    error: string | null;
  }> {
    try {
      let query = supabase.from("vehicles").select("rental_count");

      if (!options?.isAdmin) {
        query = query.eq("owner_id", ownerId);
      }

      const { data: vehicles, error } = await query;

      if (error) {
        console.error("Erreur lors de la récupération des statistiques:", error);
        return { data: null, error: error.message };
      }

      const totalVehicles = vehicles?.length || 0;
      const totalRentals =
        vehicles?.reduce((sum, v) => sum + (v.rental_count || 0), 0) || 0;

      return {
        data: {
          totalVehicles,
          totalRentals,
        },
        error: null,
      };
    } catch (error) {
      console.error("Erreur dans getOwnerStats:", error);
      return { data: null, error: "Erreur lors de la récupération des statistiques" };
    }
  }
}
