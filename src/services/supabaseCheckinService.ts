/**
 * Service Supabase pour la gestion des états des lieux de départ (check-in)
 * 
 * ✅ Appel DIRECT à Supabase depuis le front (pas de route Express intermédiaire)
 * ✅ Pattern identique à supabaseVehiclesService.ts (qui fonctionne)
 */

import { supabase } from "@/integrations/supabase/client";
import {
  type CheckinLegalSnapshot,
  type CheckinLegalSnapshotDriver,
  type CheckinLegalSnapshotOwner,
  type CheckinLegalSnapshotBooking,
  type CheckinLegalSnapshotVehicle,
  type CheckinLegalSnapshotExterior,
  type CheckinLegalSnapshotInterior,
  type CheckinLegalSnapshotAccessories,
  type CheckinLegalSnapshotRemarks,
  type CheckinLegalSnapshotValidation,
  type CreateLegalSnapshotOptions,
  type CreateLegalSnapshotResult,
  SNAPSHOT_VERSION,
} from "@/types/snapshot-legal";

export interface CheckinDepart {
  id: string;
  booking_id: string;
  owner_id: string | null;
  renter_id: string | null;
  status: string;
  data: any; // JSONB column
  kilometrage_depart: number | null;
  niveau_carburant: number | null;
  photos_dashboard: any[] | null;
  photos_exterieur: any[] | null;
  photos_jantes: any[] | null;
  photos_coffre: any[] | null;
  photos_accessoires: any[] | null;
  degats: any[] | null;
  remarques_owner: string | null;
  remarques_renter: string | null;
  signature_owner: string | null;
  signature_renter: string | null;
  validated_at: string | null;
  photo_permis_recto: string | null;
  photo_permis_verso: string | null;
  created_at: string;
  updated_at: string;
  // Nouvelles colonnes SQL (snapshot légal)
  driver_email?: string | null;
  driver_phone?: string | null;
  owner_last_name?: string | null;
  owner_first_name?: string | null;
  owner_email?: string | null;
  owner_phone?: string | null;
  booking_reference_number?: number | null;
  booking_departure_datetime?: string | null;
  booking_return_datetime?: string | null;
  booking_departure_location?: string | null;
  booking_return_location?: string | null;
  snapshot_version?: string | null;
  // Nouvelle colonne JSONB (snapshot complet)
  snapshot_legal?: CheckinLegalSnapshot | null;
  // URL publique du PDF d'état des lieux départ généré
  legal_pdf_url?: string | null;
}

export const SupabaseCheckinService = {
  /**
   * ⭐ Sauvegarde ou mise à jour d'un brouillon de check-in
   * 
   * Pattern identique à updateVehicle() qui fonctionne parfaitement
   * 
   * @param checkin_id - ID du check-in existant (pour UPDATE) ou undefined (pour INSERT)
   * @param payload - Données du check-in
   * @returns { data, error } - Format cohérent, jamais de throw non géré
   */
  async saveCheckinDraft(payload: {
    checkin_id?: string | null;
    booking_id: string;
    owner_id?: string | null;
    renter_id?: string | null;
    status?: string;
    data: any;
  }): Promise<{ data: CheckinDepart | null; error: string | null }> {
    try {
      console.log("[SupabaseCheckinService] 🚀 Sauvegarde check-in", {
        hasCheckinId: !!payload.checkin_id,
        booking_id: payload.booking_id,
        action: payload.checkin_id ? "UPDATE" : "INSERT",
      });

      const { checkin_id, ...dataToSave } = payload;

      // ============================================================================
      // CAS UPDATE : check-in existant
      // ============================================================================
      if (checkin_id) {
        console.log("[SupabaseCheckinService] Mode UPDATE, checkin_id:", checkin_id);

        // ⚠️ VERROUILLAGE BACKEND : Vérifier que le check-in n'est pas finalisé
        const { data: existingCheckinStatus, error: statusError } = await supabase
          .from("checkin_depart" as any)
          .select("status, data")
          .eq("id", checkin_id)
          .single();

        if (statusError) {
          console.error("[SupabaseCheckinService] ❌ Erreur SELECT status:", statusError);
          return { data: null, error: statusError.message || "Erreur de lecture du check-in existant" };
        }

        // Protection : empêcher toute modification d'un check-in finalisé
        const currentStatus = (existingCheckinStatus as any)?.status;
        if (currentStatus === "completed" || currentStatus === "cancelled") {
          console.warn(
            "[SupabaseCheckinService] ⚠️ Tentative de modification d'un check-in finalisé:",
            { checkin_id, currentStatus }
          );
          return {
            data: null,
            error: `Impossible de modifier un état des lieux finalisé (status = ${currentStatus}).`,
          };
        }

        // Lire les données existantes pour merge
        const existingCheckin = existingCheckinStatus;

        // Merge des données JSONB
        const existingData = (existingCheckin as any)?.data || {};
        const mergedData = {
          ...existingData,
          ...(dataToSave.data || {}),
        };

        // ⭐ Extraire Step1 : Photos de permis
        const identification = mergedData?.step1?.identification || {};
        const photoPermisRecto = identification.photoPermisRecto || null;
        const photoPermisVerso = identification.photoPermisVerso || null;

        // ⭐ Extraire Step2 : Relevés du véhicule
        const step2 = mergedData?.step2;
        const kilometrageDepart = step2?.releves?.kilometrage ?? null;
        const niveauCarburant = step2?.releves?.niveauCarburant ?? null;
        const dashboardPhotos = step2?.releves?.dashboardPhotos ?? [];

        // ⭐ Extraire Step3 : Extérieur & Coffre
        const step3 = mergedData?.step3;
        const photosExterieur = step3?.zonesPhotos ? [
          ...(step3.zonesPhotos.avant || []),
          ...(step3.zonesPhotos.droit || []),
          ...(step3.zonesPhotos.arriere || []),
          ...(step3.zonesPhotos.gauche || []),
          ...(step3.zonesPhotos.coffre || []),
        ] : [];
        const photosJantes = step3?.zonesPhotos ? [
          ...(step3.zonesPhotos.janteAvDroit || []),
          ...(step3.zonesPhotos.janteArDroit || []),
          ...(step3.zonesPhotos.janteAvGauche || []),
          ...(step3.zonesPhotos.janteArGauche || []),
        ] : [];
        const photosCoffre = step3?.zonesPhotos?.coffre || [];
        const degats = step3?.damageReports || [];

        // ⭐ Extraire Step6 : Remarques (si présent)
        const step6 = mergedData?.step6;
        const remarques = step6?.remarques || {};
        // Pour l'instant, remarques.observations est une remarque générale unique
        // On l'alimente dans les deux colonnes (owner et renter) pour l'instant
        // Si l'UI évolue pour avoir deux champs séparés, on adaptera le mapping
        const remarquesOwner = remarques.ownerRemarks || remarques.observations || null;
        const remarquesRenter = remarques.renterRemarks || remarques.observations || null;

        // ⭐ Extraire Step7 : Validation & Signatures (si présent)
        const step7 = mergedData?.step7;
        const validation = step7?.validation || {};
        const signatureOwner = validation.ownerSignature || null;
        const signatureRenter = validation.renterSignature || null;
        const validatedAt = validation.validatedAt || null;

        // UPDATE avec merge + colonnes SQL
        const updatePayload: any = {
          status: dataToSave.status || "draft",
          data: mergedData,
          // Step1 : Photos de permis
          photo_permis_recto: photoPermisRecto,
          photo_permis_verso: photoPermisVerso,
          // Step2 : Relevés du véhicule
          kilometrage_depart: kilometrageDepart,
          niveau_carburant: niveauCarburant,
          photos_dashboard: dashboardPhotos,
          // ⭐ Step3 : Extérieur & Coffre
          photos_exterieur: photosExterieur,
          photos_jantes: photosJantes,
          photos_coffre: photosCoffre,
          degats: degats,
          // ⭐ Step6 : Remarques (extraction vers colonnes SQL)
          remarques_owner: remarquesOwner,
          remarques_renter: remarquesRenter,
          // ⭐ Step7 : Validation & Signatures (extraction vers colonnes SQL)
          signature_owner: signatureOwner,
          signature_renter: signatureRenter,
          validated_at: validatedAt,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from("checkin_depart" as any)
          .update(updatePayload)
          .eq("id", checkin_id)
          .select()
          .single();

        if (error) {
          console.error("[SupabaseCheckinService] ❌ Erreur UPDATE:", error);
          return { data: null, error: error.message || "Erreur de mise à jour du check-in" };
        }

        console.log("[SupabaseCheckinService] ✅ UPDATE réussi:", (data as any)?.id);
        return { data: data as unknown as CheckinDepart, error: null };
      }

      // ============================================================================
      // CAS INSERT : nouveau check-in
      // ============================================================================
      console.log("[SupabaseCheckinService] Mode INSERT (nouveau check-in)");

      // Validation : booking_id obligatoire
      if (!dataToSave.booking_id) {
        console.error("[SupabaseCheckinService] ❌ booking_id manquant");
        return { data: null, error: "booking_id est obligatoire pour créer un check-in" };
      }

      // ⭐ Extraire Step1 : Photos de permis
      const identification = dataToSave.data?.step1?.identification || {};
      const photoPermisRecto = identification.photoPermisRecto || null;
      const photoPermisVerso = identification.photoPermisVerso || null;

      // ⭐ Extraire Step2 : Relevés du véhicule
      const step2 = dataToSave.data?.step2;
      const kilometrageDepart = step2?.releves?.kilometrage ?? null;
      const niveauCarburant = step2?.releves?.niveauCarburant ?? null;
      const dashboardPhotos = step2?.releves?.dashboardPhotos ?? [];

      // ⭐ Extraire Step3 : Extérieur & Coffre
      const step3 = dataToSave.data?.step3;
      const photosExterieur = step3?.zonesPhotos ? [
        ...(step3.zonesPhotos.avant || []),
        ...(step3.zonesPhotos.droit || []),
        ...(step3.zonesPhotos.arriere || []),
        ...(step3.zonesPhotos.gauche || []),
        ...(step3.zonesPhotos.coffre || []),
      ] : [];
      const photosJantes = step3?.zonesPhotos ? [
        ...(step3.zonesPhotos.janteAvDroit || []),
        ...(step3.zonesPhotos.janteArDroit || []),
        ...(step3.zonesPhotos.janteAvGauche || []),
        ...(step3.zonesPhotos.janteArGauche || []),
      ] : [];
      const photosCoffre = step3?.zonesPhotos?.coffre || [];
      const degats = step3?.damageReports || [];

      // ⭐ Extraire Step7 : Validation & Signatures (si présent)
      const step7 = dataToSave.data?.step7;
      const validation = step7?.validation || {};
      const signatureOwner = validation.ownerSignature || null;
      const signatureRenter = validation.renterSignature || null;
      const validatedAt = validation.validatedAt || null;

      const { data, error } = await supabase
        .from("checkin_depart" as any)
        .insert([
          {
            booking_id: dataToSave.booking_id,
            owner_id: dataToSave.owner_id || null,
            renter_id: dataToSave.renter_id || null,
            status: dataToSave.status || "draft",
            data: dataToSave.data || {},
            // Step1 : Photos de permis
            photo_permis_recto: photoPermisRecto,
            photo_permis_verso: photoPermisVerso,
            // Step2 : Relevés du véhicule
            kilometrage_depart: kilometrageDepart,
            niveau_carburant: niveauCarburant,
            photos_dashboard: dashboardPhotos,
            // ⭐ Step3 : Extérieur & Coffre
            photos_exterieur: photosExterieur,
            photos_jantes: photosJantes,
            photos_coffre: photosCoffre,
            degats: degats,
            // ⭐ Step7 : Validation & Signatures (extraction vers colonnes SQL)
            signature_owner: signatureOwner,
            signature_renter: signatureRenter,
            validated_at: validatedAt,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("[SupabaseCheckinService] ❌ Erreur INSERT:", error);
        console.error("[SupabaseCheckinService] Error code:", error.code);
        console.error("[SupabaseCheckinService] Error details:", error.details);
        console.error("[SupabaseCheckinService] Error hint:", error.hint);
        return { data: null, error: error.message || "Erreur de création du check-in" };
      }

      console.log("[SupabaseCheckinService] ✅ INSERT réussi:", (data as any)?.id);
      return { data: data as unknown as CheckinDepart, error: null };
    } catch (error: any) {
      // ✅ Catch global pour toutes les exceptions non prévues
      console.error("[SupabaseCheckinService] ❌ Exception non gérée:", error);
      return {
        data: null,
        error: `Erreur inattendue : ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  /**
   * Récupère un check-in par son ID
   */
  async getCheckinById(checkinId: string): Promise<{ data: CheckinDepart | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("checkin_depart" as any)
        .select("*")
        .eq("id", checkinId)
        .single();

      if (error) {
        console.error("[SupabaseCheckinService] Erreur récupération check-in:", error);
        return { data: null, error: error.message };
      }

      return { data: data as unknown as CheckinDepart, error: null };
    } catch (error: any) {
      console.error("[SupabaseCheckinService] Exception récupération check-in:", error);
      return { data: null, error: error.message || "Erreur de récupération" };
    }
  },

  /**
   * Récupère un check-in par booking_id
   */
  async getCheckinByBookingId(bookingId: string): Promise<{ data: CheckinDepart | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from("checkin_depart" as any)
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle(); // Peut ne pas exister

      if (error) {
        console.error("[SupabaseCheckinService] Erreur récupération check-in par booking:", error);
        return { data: null, error: error.message };
      }

      return { data: data as unknown as CheckinDepart, error: null };
    } catch (error: any) {
      console.error("[SupabaseCheckinService] Exception récupération check-in par booking:", error);
      return { data: null, error: error.message || "Erreur de récupération" };
    }
  },

  /**
   * ⭐ Crée un snapshot légal de l'état des lieux au moment de la validation (Step 7).
   * 
   * NOTE: createLegalSnapshot centralise toute la logique de snapshot légal pour checkin_depart.
   * Cette fonction :
   * - Charge toutes les données nécessaires (checkin, booking, profiles, vehicle)
   * - Construit l'objet CheckinLegalSnapshot complet
   * - Remplit les colonnes SQL critiques (driver_email, owner_email, etc.)
   * - Sauvegarde snapshot_legal dans checkin_depart
   * 
   * ⚠️ IMPORTANT : Cette fonction ne change PAS le status de "draft" à "completed".
   * Le changement de status sera géré en Phase 4.
   * 
   * @param checkinId - ID du checkin_depart à snapshoter
   * @param options - Options de création (version, location, force)
   * @returns Résultat avec data (checkin mis à jour) ou error
   */
  async createLegalSnapshot(
    checkinId: string,
    options?: CreateLegalSnapshotOptions
  ): Promise<CreateLegalSnapshotResult> {
    try {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("[SupabaseCheckinService] 🚀 Création snapshot légal");
      console.log("[SupabaseCheckinService] 📦 Checkin ID:", checkinId);
      console.log("[SupabaseCheckinService] ⚙️ Options:", options);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // ============================================================================
      // ÉTAPE 1 : Vérifications préalables
      // ============================================================================

      // 1.1. Charger le check-in
      const { data: checkin, error: checkinError } = await supabase
        .from("checkin_depart" as any)
        .select("*")
        .eq("id", checkinId)
        .single();

      if (checkinError || !checkin) {
        console.error("[SupabaseCheckinService] ❌ Check-in introuvable:", checkinError);
        return {
          data: null,
          error: "Check-in introuvable",
          snapshotCreated: false,
        };
      }

      // 1.2. Vérifier le statut (doit être "draft")
      const checkinTyped = checkin as unknown as CheckinDepart;
      if (checkinTyped.status !== "draft") {
        console.warn(
          "[SupabaseCheckinService] ⚠️ Le check-in doit être en statut 'draft' pour créer un snapshot. Statut actuel:",
          checkinTyped.status
        );
        return {
          data: null,
          error: `Le check-in doit être en statut 'draft' pour créer un snapshot. Statut actuel: ${checkinTyped.status}`,
          snapshotCreated: false,
        };
      }

      // 1.3. Vérifier si snapshot existe déjà
      if (checkinTyped.snapshot_legal && !options?.force) {
        console.log("[SupabaseCheckinService] ℹ️ Snapshot déjà existant (force=false, on ne l'écrase pas)");
        return {
          data: checkinTyped,
          error: null,
          snapshotCreated: false,
        };
      }

      // ============================================================================
      // ÉTAPE 2 : Chargement des données sources
      // ============================================================================

      console.log("[SupabaseCheckinService] 📥 Chargement des données sources...");

      // 2.1. Charger la réservation
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, reference_number, start_date, end_date, user_id, vehicle_id, pickup_location")
        .eq("id", checkinTyped.booking_id)
        .single();

      if (bookingError || !booking) {
        console.warn("[SupabaseCheckinService] ⚠️ Réservation introuvable:", bookingError);
        // On continue avec des valeurs null pour booking
      }

      // 2.2. Charger le véhicule (pour obtenir owner_id)
      let vehicleOwnerId: string | null = null;
      if (booking?.vehicle_id) {
        const { data: vehicle, error: vehicleError } = await supabase
          .from("vehicles" as any)
          .select("id, owner_id")
          .eq("id", booking.vehicle_id)
          .single();

        if (!vehicleError && vehicle) {
          vehicleOwnerId = (vehicle as any).owner_id;
        }
      }

      // 2.3. Charger le profil conducteur (via booking.user_id)
      let driverProfile: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        phone: string | null;
      } | null = null;

      if (booking?.user_id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, phone")
          .eq("id", booking.user_id)
          .single();

        if (!profileError && profile) {
          driverProfile = profile;
        } else {
          console.warn("[SupabaseCheckinService] ⚠️ Profil conducteur introuvable:", profileError);
        }
      }

      // 2.4. Charger le profil propriétaire (via vehicle.owner_id)
      let ownerProfile: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        phone: string | null;
      } | null = null;

      if (vehicleOwnerId) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, phone")
          .eq("id", vehicleOwnerId)
          .single();

        if (!profileError && profile) {
          ownerProfile = profile;
        } else {
          console.warn("[SupabaseCheckinService] ⚠️ Profil propriétaire introuvable:", profileError);
        }
      }

      // ============================================================================
      // ÉTAPE 3 : Construction de l'objet CheckinLegalSnapshot
      // ============================================================================

      console.log("[SupabaseCheckinService] 🔨 Construction du snapshot...");

      const checkinData = checkinTyped.data || {};
      const step1 = checkinData.step1;
      const step2 = checkinData.step2;
      const step3 = checkinData.step3;
      const step4 = checkinData.step4;
      const step5 = checkinData.step5;
      const step6 = checkinData.step6;
      const step7 = checkinData.step7;

      const identification = step1?.identification || {};
      const releves = step2?.releves || {};
      const vehicule = step2?.vehicule || {};
      const propreteExterieure = step3?.propreteExterieure || {};
      const coffreEquipements = step3?.coffreEquipements || {};
      const zonesPhotos = step3?.zonesPhotos || {};
      const damageReports = step3?.damageReports || [];
      const propreteGenerale = step4?.propreteGenerale || {};
      const sieges = step4?.sieges || {};
      const equipements = step4?.equipements || {};
      const accessoires = step5?.accessoires || {};
      const remarques = step6?.remarques || {};
      const validation = step7?.validation || {};

      // 3.1. Métadonnées
      const metadata = {
        version: options?.version || SNAPSHOT_VERSION,
        createdAt: new Date().toISOString(),
      };

      // 3.2. Driver (conducteur)
      const driver: CheckinLegalSnapshotDriver = {
        lastName: identification.nom || driverProfile?.last_name || "",
        firstName: identification.prenom || driverProfile?.first_name || "",
        email: driverProfile?.email || null,
        phone: driverProfile?.phone || null,
        licenseNumber: identification.numeroPermis || "",
        licenseCountry: identification.paysEmission || "",
        licenseCategory: identification.categoriePermis || "",
        licenseIssueDate: identification.dateDelivrance || "",
        licenseExpirationDate: identification.dateExpiration || "",
        licensePhotos: {
          recto: identification.photoPermisRecto || null,
          verso: identification.photoPermisVerso || null,
        },
      };

      // 3.3. Owner (propriétaire)
      const owner: CheckinLegalSnapshotOwner = {
        lastName: ownerProfile?.last_name || "",
        firstName: ownerProfile?.first_name || "",
        email: ownerProfile?.email || null,
        phone: ownerProfile?.phone || null,
      };

      // 3.4. Booking (réservation)
      const bookingSnapshot: CheckinLegalSnapshotBooking = {
        referenceNumber: booking?.reference_number ?? null,
        departureDatetime: booking?.start_date ?? null,
        returnDatetime: booking?.end_date ?? null,
        departureLocation: booking?.pickup_location ?? null,
        returnLocation: booking?.pickup_location ?? null, // Pour l'instant = departureLocation
      };

      // 3.5. Vehicle (véhicule)
      const vehicleSnapshot: CheckinLegalSnapshotVehicle = {
        brand: vehicule.marque || "",
        model: vehicule.modele || "",
        licensePlate: vehicule.immatriculation || "",
        mileageDeparture: releves.kilometrage ?? null,
        fuelLevel: releves.niveauCarburant ?? null,
        dashboardPhotos: releves.dashboardPhotos || [],
      };

      // 3.6. Exterior (extérieur)
      const exterior: CheckinLegalSnapshotExterior = {
        cleanliness: {
          level: propreteExterieure.level || null,
          notes: propreteExterieure.notes || null,
          photos: propreteExterieure.photos || [],
        },
        trunkEquipments: {
          triangle: coffreEquipements.triangle || false,
          gilet: coffreEquipements.gilet || false,
          roueSecours: coffreEquipements.roueSecours || false,
          kitAntiCrevaison: coffreEquipements.kitAntiCrevaison || false,
        },
        photos: {
          avant: zonesPhotos.avant || [],
          droit: zonesPhotos.droit || [],
          arriere: zonesPhotos.arriere || [],
          gauche: zonesPhotos.gauche || [],
          coffre: zonesPhotos.coffre || [],
          janteAvDroit: zonesPhotos.janteAvDroit || [],
          janteArDroit: zonesPhotos.janteArDroit || [],
          janteAvGauche: zonesPhotos.janteAvGauche || [],
          janteArGauche: zonesPhotos.janteArGauche || [],
        },
        // ⭐ Phase 4.B.3 : Transformation side → zone pour les dégâts extérieurs
        // Les damageReports de step3 utilisent 'side', mais le snapshot attend 'zone'
        damages: (damageReports || []).map((damage: any) => ({
          zone: damage.side || damage.zone || null, // Priorité à side, sinon zone (rétrocompatibilité), sinon null
          typeDegats: damage.typeDegats || [],
          commentaire: damage.commentaire ?? null,
          photos: (damage.photos || []).map((photo: any) => ({
            publicUrl: photo.publicUrl || '',
            uploadedAt: photo.uploadedAt || '',
            storagePath: photo.storagePath || '',
          })),
        })),
      };

      // 3.7. Interior (intérieur)
      const interior: CheckinLegalSnapshotInterior = {
        cleanliness: {
          level: propreteGenerale.level || null,
          notes: propreteGenerale.notes || null,
          photos: propreteGenerale.photos || [],
        },
        seats: {
          hasDamage: sieges.hasDamage || false,
          damages: sieges.damages || [],
          notes: sieges.notes || null,
          photos: sieges.photos || [],
        },
        equipments: {
          radioOk: equipements.radioOk ?? true,
          acOk: equipements.acOk ?? true,
          centralLockOk: equipements.centralLockOk ?? true,
          windowsOk: equipements.windowsOk ?? true,
        },
      };

      // 3.8. Accessories (accessoires)
      const accessories: CheckinLegalSnapshotAccessories = {
        comment: accessoires.commentaire || null,
      };

      // 3.9. Remarks (remarques)
      const remarks: CheckinLegalSnapshotRemarks = {
        general: remarques.observations || null,
      };

      // 3.10. Validation
      const validationSnapshot: CheckinLegalSnapshotValidation = {
        validatedAt: validation.validatedAt || new Date().toISOString(),
        location: options?.location || null,
        ownerSignature: validation.ownerSignature || checkinTyped.signature_owner || null,
        renterSignature: validation.renterSignature || checkinTyped.signature_renter || null,
      };

      // Assemblage du snapshot complet
      const snapshot: CheckinLegalSnapshot = {
        metadata,
        driver,
        owner,
        booking: bookingSnapshot,
        vehicle: vehicleSnapshot,
        exterior,
        interior,
        accessories,
        remarks,
        validation: validationSnapshot,
      };

      // ============================================================================
      // ÉTAPE 4 : Préparation de l'UPDATE SQL
      // ============================================================================

      console.log("[SupabaseCheckinService] 💾 Préparation de l'UPDATE...");

      const updatePayload: Partial<CheckinDepart> = {
        snapshot_legal: snapshot,
        // Colonnes SQL critiques - Driver
        driver_email: driver.email,
        driver_phone: driver.phone,
        // Colonnes SQL critiques - Owner
        owner_last_name: owner.lastName,
        owner_first_name: owner.firstName,
        owner_email: owner.email,
        owner_phone: owner.phone,
        // Colonnes SQL critiques - Booking
        booking_reference_number: bookingSnapshot.referenceNumber,
        booking_departure_datetime: bookingSnapshot.departureDatetime
          ? new Date(bookingSnapshot.departureDatetime).toISOString()
          : null,
        booking_return_datetime: bookingSnapshot.returnDatetime
          ? new Date(bookingSnapshot.returnDatetime).toISOString()
          : null,
        booking_departure_location: bookingSnapshot.departureLocation,
        booking_return_location: bookingSnapshot.returnLocation,
        // Métadonnées
        snapshot_version: metadata.version,
        // Colonnes existantes - Validation (si disponibles)
        signature_owner: validationSnapshot.ownerSignature,
        signature_renter: validationSnapshot.renterSignature,
        validated_at: validationSnapshot.validatedAt,
        // Colonnes existantes - Remarques (depuis step6 ou snapshot.remarks)
        // Pour l'instant, remarques.observations est une remarque générale unique
        // On l'alimente dans les deux colonnes (owner et renter) pour l'instant
        // Si l'UI évolue pour avoir deux champs séparés, on adaptera le mapping
        remarques_owner: remarques.ownerRemarks || remarques.observations || remarks.general || null,
        remarques_renter: remarques.renterRemarks || remarques.observations || remarks.general || null,
        // ⚠️ NE PAS toucher au status ici (sera fait plus tard dans finalizeCheckinDepart)
        updated_at: new Date().toISOString(),
      };

      // ============================================================================
      // ÉTAPE 5 : Sauvegarde dans checkin_depart
      // ============================================================================

      console.log("[SupabaseCheckinService] 💾 Sauvegarde du snapshot...");

      const { data: updatedCheckin, error: updateError } = await supabase
        .from("checkin_depart" as any)
        .update(updatePayload)
        .eq("id", checkinId)
        .select()
        .single();

      if (updateError) {
        console.error("[SupabaseCheckinService] ❌ Erreur UPDATE:", updateError);
        return {
          data: null,
          error: `Erreur lors de la sauvegarde du snapshot: ${updateError.message}`,
          snapshotCreated: false,
        };
      }

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("[SupabaseCheckinService] ✅ Snapshot légal créé avec succès");
      console.log("[SupabaseCheckinService] 📦 Checkin ID:", (updatedCheckin as any)?.id);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      return {
        data: updatedCheckin as unknown as CheckinDepart,
        error: null,
        snapshotCreated: true,
      };
    } catch (error: any) {
      console.error("[SupabaseCheckinService] ❌ Exception non gérée:", error);
      return {
        data: null,
        error: `Erreur inattendue : ${error instanceof Error ? error.message : String(error)}`,
        snapshotCreated: false,
      };
    }
  },

  /**
   * Met à jour le statut d'un check-in
   * 
   * ⚠️ IMPORTANT : Cette fonction ne doit être utilisée que dans le contexte de finalisation.
   * Le verrouillage backend dans `saveCheckinDraft` empêche les modifications d'un check-in "completed".
   * 
   * @param checkinId - ID du check-in
   * @param newStatus - Nouveau statut ("draft", "completed", "cancelled", etc.)
   * @returns Résultat avec checkin mis à jour ou erreur
   */
  async updateCheckinStatus(
    checkinId: string,
    newStatus: string
  ): Promise<{ data: CheckinDepart | null; error: string | null }> {
    try {
      console.log("[SupabaseCheckinService] 🔄 Changement de statut:", { checkinId, newStatus });

      const { data, error } = await supabase
        .from("checkin_depart" as any)
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkinId)
        .select()
        .single();

      if (error) {
        console.error("[SupabaseCheckinService] ❌ Erreur changement de statut:", error);
        return { data: null, error: error.message || "Erreur lors du changement de statut" };
      }

      console.log("[SupabaseCheckinService] ✅ Statut changé avec succès");
      return { data: data as unknown as CheckinDepart, error: null };
    } catch (error: any) {
      console.error("[SupabaseCheckinService] ❌ Exception changement de statut:", error);
      return {
        data: null,
        error: error.message || "Erreur inattendue lors du changement de statut",
      };
    }
  },

  /**
   * Met à jour l'URL du PDF d'état des lieux
   * 
   * @param checkinId - ID du check-in
   * @param pdfUrl - URL publique du PDF
   * @returns Résultat avec checkin mis à jour ou erreur
   */
  async updateCheckinPDFUrl(
    checkinId: string,
    pdfUrl: string
  ): Promise<{ data: CheckinDepart | null; error: string | null }> {
    try {
      console.log("[SupabaseCheckinService] 📄 Mise à jour legal_pdf_url:", { checkinId, pdfUrl });

      const { data, error } = await supabase
        .from("checkin_depart" as any)
        .update({
          legal_pdf_url: pdfUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkinId)
        .select()
        .single();

      if (error) {
        console.error("[SupabaseCheckinService] ❌ Erreur mise à jour legal_pdf_url:", error);
        return { data: null, error: error.message || "Erreur lors de la mise à jour de legal_pdf_url" };
      }

      console.log("[SupabaseCheckinService] ✅ legal_pdf_url mis à jour avec succès");
      return { data: data as unknown as CheckinDepart, error: null };
    } catch (error: any) {
      console.error("[SupabaseCheckinService] ❌ Exception mise à jour legal_pdf_url:", error);
      return {
        data: null,
        error: error.message || "Erreur inattendue lors de la mise à jour de legal_pdf_url",
      };
    }
  },
};

