/**
 * Service métier pour l'état des lieux de retour.
 * Inspiré de checkinDepartService : orchestration des steps, création/lookup du draft,
 * protections sur le statut et appel aux services Supabase.
 */

import { SupabaseCheckinService } from "./supabaseCheckinService";
import {
  SupabaseCheckinReturnService,
  type CheckinReturn,
} from "./supabaseCheckinReturnService";

// Types simples pour les payloads. On reste volontairement souple (any) pour V1.
export interface SaveStep2Payload {
  releves: {
    kilometrageDepart?: number;
    kilometrageRetour?: number;
    niveauCarburantDepart?: number;
    niveauCarburantRetour?: number;
    dashboardPhotosDepart?: any[];
    dashboardPhotosRetour?: any[];
  };
}

export interface ReturnSectionPayload {
  isSameAsDepart: boolean;
  newDamages: any[]; // { description, type?, photos[] {storagePath, publicUrl, uploadedAt?} }
  photosDepart?: any[];
  photosRetour?: any[];
}

/**
 * Calcule les flags dommages à partir du JSONB data.
 * Source of truth : step3.sections et step4.interior.
 */
function computeDamageFlags(data: any): { has_new_damage: boolean; new_damage_count: number } {
  let count = 0;
  const step3 = data?.step3?.sections || {};
  for (const s of Object.values(step3) as any[]) {
    if (s?.isSameAsDepart === false && Array.isArray(s?.newDamages)) count += s.newDamages.length;
  }
  const step4 = data?.step4?.interior;
  if (step4?.isSameAsDepart === false && Array.isArray(step4?.newDamages)) count += step4.newDamages.length;
  return { has_new_damage: count > 0, new_damage_count: count };
}

export const checkinReturnService = {
  /**
   * Crée ou récupère un check-in retour draft pour un booking donné.
   * - Vérifie l'existence du checkin_depart (et idéalement son statut).
   * - Récupère un draft existant ; sinon en crée un nouveau.
   */
  async createOrGetCheckinReturn(params: {
    bookingId: string;
    ownerId: string | null;
    renterId: string | null;
    checkinDepartId: string;
  }): Promise<{ data: CheckinReturn | null; error: string | null }> {
    const { bookingId, ownerId, renterId, checkinDepartId } = params;

    // Vérifier que le checkin_depart existe
    const { data: checkinDepart, error: departError } = await SupabaseCheckinService.getCheckinById(checkinDepartId);
    if (departError || !checkinDepart) {
      return { data: null, error: departError || "checkin_depart introuvable pour ce retour" };
    }

    // Optionnel : vérifier que le départ est au moins existant ou completed
    if (checkinDepart.status === "cancelled") {
      return { data: null, error: "Le checkin_depart lié est annulé, impossible de créer un retour." };
    }

    // Garde-fou strict : ownerId et renterId doivent être définis avant de créer un retour.
    // On évite ainsi de laisser passer un INSERT avec owner_id/renter_id = NULL qui violerait la contrainte NOT NULL.
    if (!ownerId || !renterId) {
      return {
        data: null,
        error:
          "Impossible de créer un état des lieux de retour : owner_id ou renter_id manquant sur le checkin_depart.",
      };
    }

    // Chercher un draft existant
    const { data: existingDraft, error: existingError } = await SupabaseCheckinReturnService.getReturnByBookingId(bookingId);
    if (existingError) return { data: null, error: existingError };

    if (existingDraft && existingDraft.status === "draft") {
      return { data: existingDraft, error: null };
    }

    // Créer un nouveau draft
    const { data: created, error: createError } = await SupabaseCheckinReturnService.saveCheckinReturnDraft({
      booking_id: bookingId,
      checkin_depart_id: checkinDepartId,
      owner_id: ownerId,
      renter_id: renterId,
      status: "draft",
      data: {},
    });

    return { data: created, error: createError };
  },

  /**
   * Sauvegarde Step 2 : relevés retour (km/carburant/photos dashboard).
   */
  async saveReturnStep2Releves(params: {
    bookingId: string;
    ownerId: string | null;
    renterId: string | null;
    checkinDepartId: string;
    checkinReturnId?: string | null;
    step2Payload: SaveStep2Payload;
  }): Promise<{ data: CheckinReturn | null; error: string | null }> {
    const {
      bookingId,
      ownerId,
      renterId,
      checkinDepartId,
      checkinReturnId,
      step2Payload,
    } = params;

    // Obtenir ou créer le draft
    let targetId = checkinReturnId || null;
    if (!targetId) {
      const draftResult = await this.createOrGetCheckinReturn({
        bookingId,
        ownerId,
        renterId,
        checkinDepartId,
      });
      if (draftResult.error) return { data: null, error: draftResult.error };
      targetId = draftResult.data?.id || null;
    }

    if (!targetId) return { data: null, error: "Impossible de déterminer l'ID du check-in retour." };

    const patch = {
      step2: {
        releves: step2Payload.releves,
      },
    };

    return SupabaseCheckinReturnService.saveCheckinReturnDraft({
      checkin_return_id: targetId,
      booking_id: bookingId,
      checkin_depart_id: checkinDepartId,
      owner_id: ownerId,
      renter_id: renterId,
      data: patch,
    });
  },

  /**
   * Sauvegarde Step 3 : section extérieure (merge par zone).
   */
  async saveReturnStep3Section(params: {
    bookingId: string;
    checkinDepartId: string;
    checkinReturnId?: string | null;
    ownerId: string | null;
    renterId: string | null;
    sectionKey: string;
    sectionPayload: ReturnSectionPayload;
  }): Promise<{ data: CheckinReturn | null; error: string | null }> {
    const {
      bookingId,
      checkinDepartId,
      checkinReturnId,
      ownerId,
      renterId,
      sectionKey,
      sectionPayload,
    } = params;

    // Obtenir ou créer le draft
    let targetId = checkinReturnId || null;
    let existing: CheckinReturn | null = null;

    if (!targetId) {
      const draftResult = await this.createOrGetCheckinReturn({
        bookingId,
        ownerId,
        renterId,
        checkinDepartId,
      });
      if (draftResult.error) return { data: null, error: draftResult.error };
      targetId = draftResult.data?.id || null;
      existing = draftResult.data || null;
    }

    if (!targetId) return { data: null, error: "Impossible de déterminer l'ID du check-in retour." };

    if (!existing) {
      const { data, error } = await SupabaseCheckinReturnService.getReturnById(targetId);
      if (error) return { data: null, error };
      existing = data;
    }

    const existingSections = existing?.data?.step3?.sections || {};
    const mergedSections = {
      ...existingSections,
      [sectionKey]: {
        ...(existingSections[sectionKey] || {}),
        ...sectionPayload,
      },
    };

    const mergedStep3 = {
      ...(existing?.data?.step3 || {}),
      sections: mergedSections,
    };

    const patch = {
      step3: mergedStep3,
    };

    const mergedData = { ...(existing?.data || {}), ...patch };
    const flags = computeDamageFlags(mergedData);

    return SupabaseCheckinReturnService.saveCheckinReturnDraft({
      checkin_return_id: targetId,
      booking_id: bookingId,
      checkin_depart_id: checkinDepartId,
      owner_id: ownerId,
      renter_id: renterId,
      data: patch,
      has_new_damage: flags.has_new_damage,
      new_damage_count: flags.new_damage_count,
    });
  },

  /**
   * Sauvegarde Step 4 : intérieur (merge global).
   */
  async saveReturnStep4Interior(params: {
    bookingId: string;
    checkinDepartId: string;
    checkinReturnId?: string | null;
    ownerId: string | null;
    renterId: string | null;
    interiorPayload: any;
  }): Promise<{ data: CheckinReturn | null; error: string | null }> {
    const {
      bookingId,
      checkinDepartId,
      checkinReturnId,
      ownerId,
      renterId,
      interiorPayload,
    } = params;

    let targetId = checkinReturnId || null;
    let existing: CheckinReturn | null = null;

    if (!targetId) {
      const draftResult = await this.createOrGetCheckinReturn({
        bookingId,
        ownerId,
        renterId,
        checkinDepartId,
      });
      if (draftResult.error) return { data: null, error: draftResult.error };
      targetId = draftResult.data?.id || null;
      existing = draftResult.data || null;
    }

    if (!targetId) return { data: null, error: "Impossible de déterminer l'ID du check-in retour." };

    if (!existing) {
      const { data, error } = await SupabaseCheckinReturnService.getReturnById(targetId);
      if (error) return { data: null, error };
      existing = data;
    }

    const mergedStep4 = {
      ...(existing?.data?.step4 || {}),
      interior: {
        ...(existing?.data?.step4?.interior || {}),
        ...interiorPayload,
      },
    };

    const patch = { step4: mergedStep4 };

    const mergedData = { ...(existing?.data || {}), ...patch };
    const flags = computeDamageFlags(mergedData);

    return SupabaseCheckinReturnService.saveCheckinReturnDraft({
      checkin_return_id: targetId,
      booking_id: bookingId,
      checkin_depart_id: checkinDepartId,
      owner_id: ownerId,
      renter_id: renterId,
      data: patch,
      has_new_damage: flags.has_new_damage,
      new_damage_count: flags.new_damage_count,
    });
  },

  /**
   * Optionnel : Step 5 accessoires retour.
   */
  async saveReturnStep5Accessoires(params: {
    bookingId: string;
    checkinDepartId: string;
    checkinReturnId?: string | null;
    ownerId: string | null;
    renterId: string | null;
    accessoiresPayload: any;
  }): Promise<{ data: CheckinReturn | null; error: string | null }> {
    const {
      bookingId,
      checkinDepartId,
      checkinReturnId,
      ownerId,
      renterId,
      accessoiresPayload,
    } = params;

    let targetId = checkinReturnId || null;
    if (!targetId) {
      const draftResult = await this.createOrGetCheckinReturn({
        bookingId,
        ownerId,
        renterId,
        checkinDepartId,
      });
      if (draftResult.error) return { data: null, error: draftResult.error };
      targetId = draftResult.data?.id || null;
    }

    if (!targetId) return { data: null, error: "Impossible de déterminer l'ID du check-in retour." };

    const patch = {
      step5: {
        accessoiresRetour: accessoiresPayload,
      },
    };

    return SupabaseCheckinReturnService.saveCheckinReturnDraft({
      checkin_return_id: targetId,
      booking_id: bookingId,
      checkin_depart_id: checkinDepartId,
      owner_id: ownerId,
      renter_id: renterId,
      data: patch,
    });
  },

  /**
   * Optionnel : Step 6 remarques retour.
   */
  async saveReturnStep6Remarques(params: {
    bookingId: string;
    checkinDepartId: string;
    checkinReturnId?: string | null;
    ownerId: string | null;
    renterId: string | null;
    remarquesPayload: any;
  }): Promise<{ data: CheckinReturn | null; error: string | null }> {
    const {
      bookingId,
      checkinDepartId,
      checkinReturnId,
      ownerId,
      renterId,
      remarquesPayload,
    } = params;

    let targetId = checkinReturnId || null;
    if (!targetId) {
      const draftResult = await this.createOrGetCheckinReturn({
        bookingId,
        ownerId,
        renterId,
        checkinDepartId,
      });
      if (draftResult.error) return { data: null, error: draftResult.error };
      targetId = draftResult.data?.id || null;
    }

    if (!targetId) return { data: null, error: "Impossible de déterminer l'ID du check-in retour." };

    const patch = {
      step6: {
        remarquesRetour: remarquesPayload,
      },
    };

    return SupabaseCheckinReturnService.saveCheckinReturnDraft({
      checkin_return_id: targetId,
      booking_id: bookingId,
      checkin_depart_id: checkinDepartId,
      owner_id: ownerId,
      renter_id: renterId,
      data: patch,
    });
  },

  /**
   * Sauvegarde Step 5 : accessoires retour.
   */
  async saveReturnStep5Accessoires(params: {
    bookingId: string;
    checkinDepartId: string;
    checkinReturnId?: string | null;
    ownerId: string | null;
    renterId: string | null;
    accessoiresPayload: {
      isSameAsDepart: boolean;
      accessoires: Record<string, boolean>;
      commentaire?: string;
    };
  }): Promise<{ data: CheckinReturn | null; error: string | null }> {
    const {
      bookingId,
      checkinDepartId,
      checkinReturnId,
      ownerId,
      renterId,
      accessoiresPayload,
    } = params;

    let targetId = checkinReturnId || null;
    if (!targetId) {
      const draftResult = await this.createOrGetCheckinReturn({
        bookingId,
        ownerId,
        renterId,
        checkinDepartId,
      });
      if (draftResult.error) return { data: null, error: draftResult.error };
      targetId = draftResult.data?.id || null;
    }

    if (!targetId) return { data: null, error: "Impossible de déterminer l'ID du check-in retour." };

    const patch = {
      step5: {
        accessoiresRetour: {
          isSameAsDepart: accessoiresPayload.isSameAsDepart,
          accessoires: accessoiresPayload.accessoires || {},
          commentaire: accessoiresPayload.commentaire || "",
        },
      },
    };

    return SupabaseCheckinReturnService.saveCheckinReturnDraft({
      checkin_return_id: targetId,
      booking_id: bookingId,
      checkin_depart_id: checkinDepartId,
      owner_id: ownerId,
      renter_id: renterId,
      data: patch,
    });
  },

  /**
   * Finalisation du check-in retour : snapshot + statut completed + PDF.
   */
  async finalizeCheckinReturn(params: {
    checkinReturnId: string;
    bookingId: string;
    ownerId: string | null;
    renterId: string | null;
    step7Payload?: any;
  }): Promise<{ data: CheckinReturn | null; error: string | null; snapshotError?: string | null; pdfError?: string | null }> {
    const { checkinReturnId, bookingId, ownerId, renterId, step7Payload } = params;

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[CheckinReturnService] 🎯 FINALISATION État des lieux retour");
    console.log("[CheckinReturnService] 📦 Checkin Return ID:", checkinReturnId);
    console.log("[CheckinReturnService] 📋 Booking ID:", bookingId);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    try {
      // ============================================================================
      // ÉTAPE 1 : Vérifier que le check-in est encore en "draft"
      // ============================================================================
      const { data: current, error } = await SupabaseCheckinReturnService.getReturnById(checkinReturnId);
      if (error || !current) {
        return { data: null, error: error || "Check-in retour introuvable" };
      }

      if (current.status !== "draft") {
        return { data: null, error: `Impossible de finaliser un check-in retour en statut ${current.status}` };
      }

      // ============================================================================
      // ÉTAPE 2 : Sauvegarder les données de validation (step7) si fournies
      // ============================================================================
      if (step7Payload) {
        const mergeResult = await SupabaseCheckinReturnService.saveCheckinReturnDraft({
          checkin_return_id: checkinReturnId,
          booking_id: bookingId,
          checkin_depart_id: current.checkin_depart_id,
          owner_id: ownerId,
          renter_id: renterId,
          data: { step7: step7Payload },
        });
        if (mergeResult.error) {
          return { data: null, error: `Erreur lors de la sauvegarde de step7: ${mergeResult.error}` };
        }

        // Filet de sécurité : recalculer les flags dommages (non-bloquant)
        try {
          const mergedData = mergeResult.data?.data || { ...(current.data || {}), step7: step7Payload };
          const flags = computeDamageFlags(mergedData);
          const flagsResult = await SupabaseCheckinReturnService.saveCheckinReturnDraft({
            checkin_return_id: checkinReturnId,
            booking_id: bookingId,
            checkin_depart_id: current.checkin_depart_id,
            owner_id: ownerId,
            renter_id: renterId,
            data: {},
            has_new_damage: flags.has_new_damage,
            new_damage_count: flags.new_damage_count,
          });
          if (flagsResult.error) {
            console.warn("[CheckinReturnService] ⚠️ Filet de sécurité flags dommages (non-bloquant):", flagsResult.error);
          }
        } catch (flagsErr: any) {
          console.warn("[CheckinReturnService] ⚠️ Filet de sécurité flags dommages (non-bloquant):", flagsErr?.message);
        }
      } else {
        // Filet de sécurité même sans step7 : recalculer les flags sur current.data (non-bloquant)
        try {
          const mergedData = current.data || {};
          const flags = computeDamageFlags(mergedData);
          const flagsResult = await SupabaseCheckinReturnService.saveCheckinReturnDraft({
            checkin_return_id: checkinReturnId,
            booking_id: bookingId,
            checkin_depart_id: current.checkin_depart_id,
            owner_id: ownerId,
            renter_id: renterId,
            data: {},
            has_new_damage: flags.has_new_damage,
            new_damage_count: flags.new_damage_count,
          });
          if (flagsResult.error) {
            console.warn("[CheckinReturnService] ⚠️ Filet de sécurité flags dommages (non-bloquant):", flagsResult.error);
          }
        } catch (flagsErr: any) {
          console.warn("[CheckinReturnService] ⚠️ Filet de sécurité flags dommages (non-bloquant):", flagsErr?.message);
        }
      }

      // ============================================================================
      // ÉTAPE 3 : Créer le snapshot légal complet
      // ============================================================================
      console.log("[CheckinReturnService] 📸 Étape 3 : Création du snapshot légal...");

      const snapshotResult = await SupabaseCheckinReturnService.createReturnSnapshot(checkinReturnId, {
        version: "return-1.0",
        force: false,
      });

      if (snapshotResult.error || !snapshotResult.data) {
        console.error("[CheckinReturnService] ❌ Erreur création snapshot:", snapshotResult.error);
        return { 
          data: null, 
          error: `Erreur lors de la création du snapshot légal : ${snapshotResult.error || "Erreur inconnue"}`,
          snapshotError: snapshotResult.error,
        };
      }

      if (!snapshotResult.snapshotCreated) {
        console.warn("[CheckinReturnService] ⚠️ Snapshot déjà existant (force=false)");
      } else {
        console.log("[CheckinReturnService] ✅ Snapshot légal créé avec succès");
      }

      // ============================================================================
      // ÉTAPE 4 : Changer le statut vers "completed"
      // ============================================================================
      console.log("[CheckinReturnService] 🔒 Étape 4 : Changement de statut vers 'completed'...");

      const statusResult = await SupabaseCheckinReturnService.updateReturnStatus(checkinReturnId, "completed");
      if (statusResult.error || !statusResult.data) {
        console.error("[CheckinReturnService] ❌ Erreur changement de statut:", statusResult.error);
        return { 
          data: null, 
          error: `Erreur lors du changement de statut : ${statusResult.error || "Erreur inconnue"}`,
        };
      }

      console.log("[CheckinReturnService] ✅ Statut mis à jour:", {
        checkinReturnId,
        status: statusResult.data.status,
      });

      // ============================================================================
      // ÉTAPE 4.6 : Appel webhook n8n pour envoi email EDL RETOUR (non-bloquant)
      // Structure alignée sur EDL DÉPART (checkinDepartService.ts)
      // ============================================================================
      if (statusResult.data.status === "completed") {
        const n8nWebhookUrl =
          (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_N8N_WEBHOOK_CHECKIN_RETURN_URL) ||
          "https://n8n.srv1285649.hstgr.cloud/webhook/7da2e622-bc36-44b3-b716-68e088522a54";

        // Payload strictement identique au départ (event, checkinId, bookingId, timestamp)
        const n8nPayload = {
          event: "checkin_return_completed",
          checkinId: checkinReturnId,
          bookingId,
          timestamp: new Date().toISOString(),
        };

        const bodyStr = JSON.stringify(n8nPayload);
        console.log("[CheckinReturnService] 📧 Appel webhook n8n pour envoi email EDL retour...");
        // DEBUG : preuve que le body part bien (si n8n reçoit body: {}, vérifier côté n8n)
        console.log("[CheckinReturnService] DEBUG webhook:", {
          url: n8nWebhookUrl,
          method: "POST",
          body: bodyStr,
          payloadKeys: Object.keys(n8nPayload),
        });

        try {
          // Timeout de 8 secondes pour éviter de bloquer le front (identique départ)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort();
          }, 8000);

          const n8nResponse = await fetch(n8nWebhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: bodyStr,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!n8nResponse.ok) {
            console.warn("[CheckinReturnService] ⚠️ Webhook n8n (EDL retour) erreur:", {
              status: n8nResponse.status,
              statusText: n8nResponse.statusText,
            });
          } else {
            console.log("[CheckinReturnService] ✅ Webhook n8n (EDL retour) appelé avec succès");
          }
        } catch (n8nError: any) {
          // Ne pas bloquer la finalisation si le webhook échoue
          const isTimeout =
            n8nError?.name === "AbortError" ||
            n8nError?.code === "ETIMEDOUT" ||
            (typeof n8nError?.message === "string" && n8nError.message.toLowerCase().includes("timeout"));

          console.warn("[CheckinReturnService] ⚠️ Erreur appel webhook n8n (EDL retour, non-bloquant):", {
            message: n8nError?.message,
            isTimeout,
          });
        }
      }

      // ============================================================================
      // ÉTAPE 4.5 : Mettre à jour le statut de la réservation de "confirmed" à "terminated"
      // ============================================================================
      console.log("[CheckinReturnService] 🔄 Étape 4.5 : Vérification et mise à jour du statut de la réservation...");
      
      try {
        // Récupérer le statut actuel de la réservation directement depuis Supabase
        const { supabase } = await import("@/integrations/supabase/client");
        const { data: currentBooking, error: fetchError } = await supabase
          .from('bookings')
          .select('status')
          .eq('id', bookingId)
          .single();
        
        if (fetchError) {
          console.error("[CheckinReturnService] ⚠️ Erreur lors de la récupération du statut de la réservation:", fetchError);
        } else if (currentBooking && currentBooking.status === 'confirmed') {
          console.log("[CheckinReturnService] 🔄 Statut de la réservation actuel: 'confirmed', mise à jour vers 'terminated'...");
          
          const { SupabaseBookingsService } = await import("./supabase/bookings");
          const bookingStatusResult = await SupabaseBookingsService.updateBookingStatus(bookingId, 'terminated');
          
          if (bookingStatusResult.error) {
            console.error("[CheckinReturnService] ⚠️ Erreur lors de la mise à jour du statut de la réservation:", bookingStatusResult.error);
            // Ne pas bloquer la finalisation du check-in retour si la mise à jour du statut échoue
          } else {
            console.log("[CheckinReturnService] ✅ Statut de la réservation mis à jour vers 'terminated'");
          }
        } else {
          console.log("[CheckinReturnService] ℹ️ Statut de la réservation:", currentBooking?.status, "- pas de mise à jour nécessaire");
        }
      } catch (bookingStatusError: any) {
        console.error("[CheckinReturnService] ⚠️ Exception lors de la mise à jour du statut de la réservation:", bookingStatusError);
        // Ne pas bloquer la finalisation du check-in retour
      }

      // ============================================================================
      // ÉTAPE 5 : Générer le PDF d'état des lieux retour (non-bloquant)
      // ============================================================================
      console.log("[CheckinReturnService] 📄 Étape 5 : Génération du PDF...");

      // ⚠️ IMPORTANT : La génération PDF est NON-BLOQUANTE
      // Si le PDF échoue, la finalisation reste réussie (status = "completed")
      let pdfError: string | null = null;

      try {
        // ⚠️ Import dynamique pour éviter de charger le module (et html2canvas/jsPDF) au chargement
        console.log("[CheckinReturnService] 📄 Import dynamique du service PDF...");
        const { generateCheckinReturnPdf } = await import("./checkinReturnPdfService");
        console.log("[CheckinReturnService] 📄 Import dynamique OK, fonction disponible:", typeof generateCheckinReturnPdf);
        
        console.log("[CheckinReturnService] 📄 Appel à generateCheckinReturnPdf avec skipStatusCheck: true");
        const pdfResult = await generateCheckinReturnPdf(checkinReturnId, {
          skipStatusCheck: true, // Bypasser la vérification de status car on vient de le changer
        });
        
        console.log("[CheckinReturnService] 📄 Résultat génération PDF:", {
          checkinReturnId,
          hasError: !!pdfResult.error,
          hasPublicUrl: !!pdfResult.publicUrl,
          pdfStoragePath: pdfResult.pdfStoragePath,
          error: pdfResult.error,
        });

        if (pdfResult.error) {
          pdfError = pdfResult.error;
          console.error("[CheckinReturnService] ❌ Erreur génération PDF:", {
            checkinReturnId,
            error: pdfResult.error,
          });
          console.error("[CheckinReturnService] ❌ PDF non généré, mais finalisation réussie");
          console.error("[CheckinReturnService] ❌ legal_pdf_url restera NULL (peut être régénéré plus tard)");
        } else if (pdfResult.publicUrl) {
          // ✅ PDF généré avec succès
          // Note : generateCheckinReturnPdf met déjà à jour legal_pdf_url en interne
          console.log("[CheckinReturnService] ✅ PDF généré avec succès:", {
            checkinReturnId,
            publicUrl: pdfResult.publicUrl,
            pdfStoragePath: pdfResult.pdfStoragePath,
          });
          
          // Recharger le checkin pour obtenir la version avec legal_pdf_url mis à jour
          const { data: refreshedCheckinReturn } = await SupabaseCheckinReturnService.getReturnById(checkinReturnId);
          if (refreshedCheckinReturn) {
            Object.assign(statusResult.data, refreshedCheckinReturn);
            console.log("[CheckinReturnService] ✅ Checkin retour rechargé avec legal_pdf_url:", refreshedCheckinReturn.legal_pdf_url);
          }
        } else {
          pdfError = "PDF généré mais URL publique absente";
          console.error("[CheckinReturnService] ❌ PDF généré mais URL publique absente", {
            checkinReturnId,
            pdfResult,
          });
        }
      } catch (pdfException: any) {
        pdfError = pdfException?.message || String(pdfException);
        console.error("[CheckinReturnService] ❌ Exception génération PDF:", {
          checkinReturnId,
          error: pdfException,
          errorMessage: pdfException?.message || String(pdfException),
          errorStack: pdfException?.stack,
        });
        // Ne pas bloquer la finalisation
        console.error("[CheckinReturnService] ❌ Exception PDF, mais finalisation réussie");
        console.error("[CheckinReturnService] ❌ legal_pdf_url restera NULL (peut être régénéré plus tard)");
      }

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("[CheckinReturnService] ✅ État des lieux retour finalisé avec succès !");
      console.log("[CheckinReturnService] 📦 Checkin Return ID:", statusResult.data.id);
      console.log("[CheckinReturnService] 📊 Status:", statusResult.data.status);
      console.log("[CheckinReturnService] 📄 PDF URL:", statusResult.data.legal_pdf_url || "NULL (non généré)");
      if (pdfError) {
        console.error("[CheckinReturnService] ⚠️ PDF non généré - Erreur:", pdfError);
      } else {
        console.log("[CheckinReturnService] ✅ PDF généré avec succès");
      }
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      return {
        data: statusResult.data,
        error: null,
        snapshotError: snapshotResult.snapshotCreated ? null : snapshotResult.error,
        pdfError: pdfError || null,
      };
    } catch (error: any) {
      console.error("[CheckinReturnService] ❌ Exception non gérée:", error);
      return {
        data: null,
        error: `Erreur inattendue : ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

