/**
 * Service Supabase pour la gestion des états des lieux de retour (check-in retour)
 * Inspiré de SupabaseCheckinService (départ) – mêmes patterns de merge JSONB,
 * protections sur le statut et accès direct à Supabase depuis le front.
 */

import { supabase } from "@/integrations/supabase/client";

export interface CheckinReturn {
  id: string;
  booking_id: string;
  checkin_depart_id: string;
  owner_id: string;
  renter_id: string;
  status: "draft" | "completed" | "cancelled" | string;
  data: any;
  snapshot_legal?: any;
  legal_pdf_url?: string | null;
  has_new_damage?: boolean;
  new_damage_count?: number;
  created_at: string;
  updated_at: string;
}

export const SupabaseCheckinReturnService = {
  /**
   * Récupère un check-in retour par ID.
   */
  async getReturnById(
    checkinReturnId: string
  ): Promise<{ data: CheckinReturn | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("checkin_return" as any)
        .select("*")
        .eq("id", checkinReturnId)
        .single();

      if (error) {
        console.error("[SupabaseCheckinReturnService] Erreur getReturnById:", error);
        return { data: null, error: error.message };
      }

      return { data: data as unknown as CheckinReturn, error: null };
    } catch (err: any) {
      console.error("[SupabaseCheckinReturnService] Exception getReturnById:", err);
      return { data: null, error: err.message || "Erreur de récupération" };
    }
  },

  /**
   * Récupère un check-in retour par booking_id.
   * Stratégie : on tente d'abord de récupérer un draft ; sinon on renvoie le plus récent.
   */
  async getReturnByBookingId(
    bookingId: string
  ): Promise<{ data: CheckinReturn | null; error: string | null }> {
    try {
      // 1) Chercher un draft
      const { data: draft, error: draftError } = await supabase
        .from("checkin_return" as any)
        .select("*")
        .eq("booking_id", bookingId)
        .eq("status", "draft")
        .maybeSingle();

      if (draftError && draftError.code !== "PGRST116") {
        console.error("[SupabaseCheckinReturnService] Erreur getReturnByBookingId(draft):", draftError);
        return { data: null, error: draftError.message };
      }

      if (draft) {
        return { data: draft as unknown as CheckinReturn, error: null };
      }

      // 2) Sinon, renvoyer le plus récent (completed/cancelled)
      const { data, error } = await supabase
        .from("checkin_return" as any)
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("[SupabaseCheckinReturnService] Erreur getReturnByBookingId(last):", error);
        return { data: null, error: error.message };
      }

      return { data: (data as unknown as CheckinReturn) || null, error: null };
    } catch (err: any) {
      console.error("[SupabaseCheckinReturnService] Exception getReturnByBookingId:", err);
      return { data: null, error: err.message || "Erreur de récupération" };
    }
  },

  /**
   * Sauvegarde ou met à jour un brouillon de check-in retour.
   * - Merge JSONB data
   * - Empêche la modification si status = completed/cancelled
   * - Utilise l'unique draft par booking si aucun ID fourni
   */
  async saveCheckinReturnDraft(payload: {
    checkin_return_id?: string | null;
    booking_id: string;
    checkin_depart_id: string;
    owner_id: string | null;
    renter_id: string | null;
    status?: string;
    data: any;
    has_new_damage?: boolean;
    new_damage_count?: number;
  }): Promise<{ data: CheckinReturn | null; error: string | null }> {
    try {
      const { checkin_return_id, ...dataToSave } = payload;

      // Garde-fou ultime : la table checkin_return impose owner_id et renter_id NOT NULL.
      // Si ces valeurs sont nulles ici, on renvoie une erreur claire sans tenter d'INSERT/UPDATE.
      if (!dataToSave.owner_id || !dataToSave.renter_id) {
        return {
          data: null,
          error:
            "Impossible de sauvegarder le check-in retour : owner_id ou renter_id manquant (contrainte NOT NULL).",
        };
      }

      // ---------------------------------------------------------------------------
      // MODE UPDATE si ID fourni ou si un draft existe déjà pour ce booking
      // ---------------------------------------------------------------------------
      let targetId: string | null = checkin_return_id || null;
      let existing: CheckinReturn | null = null;

      if (!targetId) {
        // Chercher un draft pour ce booking
        const draftResult = await this.getReturnByBookingId(dataToSave.booking_id);
        if (draftResult.data && draftResult.data.status === "draft") {
          targetId = draftResult.data.id;
          existing = draftResult.data;
        }
      }

      // Si update : vérifier status et merge JSON
      if (targetId) {
        if (!existing) {
          const { data, error } = await this.getReturnById(targetId);
          if (error) return { data: null, error };
          existing = data;
        }

        if (!existing) {
          return { data: null, error: "Checkin retour introuvable pour update" };
        }

        if (existing.status === "completed" || existing.status === "cancelled") {
          return { data: null, error: "Impossible de modifier un check-in retour finalisé ou annulé." };
        }

        const existingData = existing.data || {};
        const mergedData = {
          ...existingData,
          ...(dataToSave.data || {}),
        };

        const nextStatus = dataToSave.status || existing.status || "draft";

        const updatePayload: Record<string, unknown> = {
          status: nextStatus,
          data: mergedData,
          checkin_depart_id: dataToSave.checkin_depart_id,
          owner_id: dataToSave.owner_id,
          renter_id: dataToSave.renter_id,
          updated_at: new Date().toISOString(),
        };
        if (typeof dataToSave.has_new_damage === "boolean") {
          updatePayload.has_new_damage = dataToSave.has_new_damage;
        }
        if (typeof dataToSave.new_damage_count === "number") {
          updatePayload.new_damage_count = dataToSave.new_damage_count;
        }

        const { data, error } = await supabase
          .from("checkin_return" as any)
          .update(updatePayload)
          .eq("id", targetId)
          .select()
          .single();

        if (error) {
          console.error("[SupabaseCheckinReturnService] Erreur UPDATE:", error);
          return { data: null, error: error.message || "Erreur de mise à jour du check-in retour" };
        }

        return { data: data as unknown as CheckinReturn, error: null };
      }

      // ---------------------------------------------------------------------------
      // MODE INSERT : pas d'ID et pas de draft existant
      // ---------------------------------------------------------------------------
      const { data, error } = await supabase
        .from("checkin_return" as any)
        .insert([
          {
            booking_id: dataToSave.booking_id,
            checkin_depart_id: dataToSave.checkin_depart_id,
            owner_id: dataToSave.owner_id,
            renter_id: dataToSave.renter_id,
            status: dataToSave.status || "draft",
            data: dataToSave.data || {},
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("[SupabaseCheckinReturnService] Erreur INSERT:", error);
        return { data: null, error: error.message || "Erreur de création du check-in retour" };
      }

      return { data: data as unknown as CheckinReturn, error: null };
    } catch (err: any) {
      console.error("[SupabaseCheckinReturnService] Exception saveCheckinReturnDraft:", err);
      return { data: null, error: err.message || "Erreur inattendue lors de la sauvegarde du check-in retour" };
    }
  },

  /**
   * Met à jour le statut d'un check-in retour.
   */
  async updateReturnStatus(
    checkinReturnId: string,
    newStatus: string
  ): Promise<{ data: CheckinReturn | null; error: string | null }> {
    try {
      // Option : vérifier le statut actuel pour empêcher un retour en arrière
      const current = await this.getReturnById(checkinReturnId);
      if (current.error) return { data: null, error: current.error };

      if (current.data?.status === "completed" && newStatus === "draft") {
        return { data: null, error: "Impossible de repasser en draft un check-in retour finalisé." };
      }

      const { data, error } = await supabase
        .from("checkin_return" as any)
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkinReturnId)
        .select()
        .single();

      if (error) {
        console.error("[SupabaseCheckinReturnService] Erreur updateReturnStatus:", error);
        return { data: null, error: error.message || "Erreur lors du changement de statut" };
      }

      return { data: data as unknown as CheckinReturn, error: null };
    } catch (err: any) {
      console.error("[SupabaseCheckinReturnService] Exception updateReturnStatus:", err);
      return { data: null, error: err.message || "Erreur inattendue lors du changement de statut" };
    }
  },

  /**
   * Met à jour l'URL du PDF d'état des lieux retour.
   */
  async updateReturnPDFUrl(
    checkinReturnId: string,
    pdfUrl: string
  ): Promise<{ data: CheckinReturn | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("checkin_return" as any)
        .update({
          legal_pdf_url: pdfUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkinReturnId)
        .select()
        .single();

      if (error) {
        console.error("[SupabaseCheckinReturnService] Erreur updateReturnPDFUrl:", error);
        return { data: null, error: error.message || "Erreur lors de la mise à jour de legal_pdf_url" };
      }

      return { data: data as unknown as CheckinReturn, error: null };
    } catch (err: any) {
      console.error("[SupabaseCheckinReturnService] Exception updateReturnPDFUrl:", err);
      return { data: null, error: err.message || "Erreur inattendue lors de la mise à jour de legal_pdf_url" };
    }
  },

  /**
   * Crée un snapshot légal complet pour le check-in retour.
   * Délègue à checkinReturnSnapshotService pour la création complète.
   */
  async createReturnSnapshot(
    checkinReturnId: string,
    options?: { version?: string; force?: boolean }
  ): Promise<{ data: CheckinReturn | null; error: string | null; snapshotCreated: boolean }> {
    // Import dynamique pour éviter les dépendances circulaires
    const { checkinReturnSnapshotService } = await import("./checkinReturnSnapshotService");
    return checkinReturnSnapshotService.createReturnSnapshot(checkinReturnId, options);
  },
};

