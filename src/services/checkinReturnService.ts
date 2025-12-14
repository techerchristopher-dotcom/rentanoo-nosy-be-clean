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

