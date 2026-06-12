import { supabase } from "@/integrations/supabase/client";

export type ListingOwnerType =
  | "individual"
  | "agency"
  | "residence"
  | "platform_managed";

export interface ListingOwner {
  id: string;
  display_name: string;
  avatar_url: string | null;
  owner_type: ListingOwnerType;
  created_at: string;
  updated_at: string;
}

export interface ListingOwnerInput {
  display_name: string;
  avatar_url?: string | null;
  owner_type: ListingOwnerType;
}

export class ListingOwnersService {
  static async getById(
    id: string
  ): Promise<{ data: ListingOwner | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("listing_owners")
        .select("id, display_name, avatar_url, owner_type, created_at, updated_at")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        return { data: null, error: error.message };
      }
      return { data: data as ListingOwner | null, error: null };
    } catch {
      return { data: null, error: "Erreur lors du chargement du propriétaire affiché" };
    }
  }

  static async create(
    input: ListingOwnerInput
  ): Promise<{ data: ListingOwner | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("listing_owners")
        .insert({
          display_name: input.display_name.trim(),
          avatar_url: input.avatar_url?.trim() || null,
          owner_type: input.owner_type,
        })
        .select("id, display_name, avatar_url, owner_type, created_at, updated_at")
        .single();

      if (error) {
        return { data: null, error: error.message };
      }
      return { data: data as ListingOwner, error: null };
    } catch {
      return { data: null, error: "Erreur lors de la création du propriétaire affiché" };
    }
  }

  static async update(
    id: string,
    input: Partial<ListingOwnerInput>
  ): Promise<{ data: ListingOwner | null; error: string | null }> {
    try {
      const patch: Record<string, unknown> = {};
      if (input.display_name !== undefined) {
        patch.display_name = input.display_name.trim();
      }
      if (input.avatar_url !== undefined) {
        patch.avatar_url = input.avatar_url?.trim() || null;
      }
      if (input.owner_type !== undefined) {
        patch.owner_type = input.owner_type;
      }

      const { data, error } = await supabase
        .from("listing_owners")
        .update(patch)
        .eq("id", id)
        .select("id, display_name, avatar_url, owner_type, created_at, updated_at")
        .single();

      if (error) {
        return { data: null, error: error.message };
      }
      return { data: data as ListingOwner, error: null };
    } catch {
      return { data: null, error: "Erreur lors de la mise à jour du propriétaire affiché" };
    }
  }

  static async linkToVehicle(
    vehicleId: string,
    listingOwnerId: string
  ): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from("vehicles")
      .update({ listing_owner_id: listingOwnerId })
      .eq("id", vehicleId);

    return { error: error?.message ?? null };
  }

  static async unlinkFromVehicle(vehicleId: string): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from("vehicles")
      .update({ listing_owner_id: null })
      .eq("id", vehicleId);

    return { error: error?.message ?? null };
  }

  /**
   * Crée ou met à jour le listing_owner lié à une annonce.
   * Nom vide → listing_owner_id NULL (fallback profile).
   */
  static async syncForVehicle(
    vehicleId: string,
    payload: {
      displayName: string;
      avatarUrl: string;
      ownerType: ListingOwnerType;
      existingListingOwnerId: string | null;
    }
  ): Promise<{ listingOwnerId: string | null; error: string | null }> {
    const displayName = payload.displayName.trim();

    if (!displayName) {
      const { error } = await this.unlinkFromVehicle(vehicleId);
      return { listingOwnerId: null, error };
    }

    const avatar_url = payload.avatarUrl.trim() || null;

    if (payload.existingListingOwnerId) {
      const { error } = await this.update(payload.existingListingOwnerId, {
        display_name: displayName,
        avatar_url,
        owner_type: payload.ownerType,
      });
      if (error) {
        return { listingOwnerId: payload.existingListingOwnerId, error };
      }
      return { listingOwnerId: payload.existingListingOwnerId, error: null };
    }

    const { data, error: createError } = await this.create({
      display_name: displayName,
      avatar_url,
      owner_type: payload.ownerType,
    });

    if (createError || !data) {
      return { listingOwnerId: null, error: createError || "Création impossible" };
    }

    const { error: linkError } = await this.linkToVehicle(vehicleId, data.id);
    if (linkError) {
      return { listingOwnerId: null, error: linkError };
    }

    return { listingOwnerId: data.id, error: null };
  }
}
