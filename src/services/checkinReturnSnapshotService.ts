/**
 * Service de création du snapshot légal complet pour l'état des lieux de retour
 * 
 * Inspiré de SupabaseCheckinService.createLegalSnapshot (départ)
 * 
 * Ce service :
 * - Charge toutes les données nécessaires (checkin_return, checkin_depart, booking, profiles, vehicle)
 * - Construit un objet snapshot complet pour le retour
 * - Remplit snapshot_legal dans checkin_return
 */

import { supabase } from "@/integrations/supabase/client";
import { SupabaseCheckinReturnService, type CheckinReturn } from "./supabaseCheckinReturnService";
import { SupabaseCheckinService, type CheckinDepart } from "./supabaseCheckinService";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Snapshot légal complet pour le retour
 * Structure similaire au départ mais adaptée au retour
 */
export interface CheckinReturnLegalSnapshot {
  metadata: {
    version: string;
    createdAt: string;
  };
  checkinReturnId: string;
  checkinDepartId: string;
  booking: {
    referenceNumber: number | null;
    departureDatetime: string | null;
    returnDatetime: string | null;
    departureLocation: string | null;
    returnLocation: string | null;
  };
  vehicle: {
    brand: string;
    model: string;
    licensePlate: string;
  };
  owner: {
    lastName: string;
    firstName: string;
    email: string | null;
    phone: string | null;
  };
  renter: {
    lastName: string;
    firstName: string;
    email: string | null;
    phone: string | null;
  };
  // Données départ (pour comparaison)
  depart: {
    mileage: number | null;
    fuelLevel: number | null;
    dashboardPhotos: Array<{
      publicUrl: string;
      uploadedAt: string;
      storagePath: string;
    }>;
  };
  // Données retour
  return: {
    step2: {
      mileage: number | null;
      fuelLevel: number | null;
      dashboardPhotos: Array<{
        publicUrl: string;
        uploadedAt: string;
        storagePath: string;
      }>;
    };
    step3: {
      sections: Record<string, {
        label: string; // ⭐ Label de la zone
        isSameAsDepart: boolean;
        newDamages: Array<{
          description: string;
          type?: string;
          photos: Array<{
            publicUrl: string;
            uploadedAt: string;
            storagePath: string;
          }>;
        }>;
      }>;
    };
    step4: {
      isSameAsDepart: boolean;
      newDamages: Array<{
        area: string;
        description: string;
        photos: Array<{
          publicUrl: string;
          uploadedAt: string;
          storagePath: string;
        }>;
      }>;
    };
    step5: {
      isSameAsDepart: boolean;
      accessoires: Record<string, boolean>;
      commentaire: string | null;
      accessoiresList: Array<{ // ⭐ Liste complète pour le PDF
        key: string;
        label: string;
        presentAtDepart: boolean;
        presentAtReturn: boolean;
      }>;
    };
    step6: {
      remarquesGeneral: string | null;
      remarquesOwner: string | null;
      remarquesRenter: string | null;
    };
    step7: {
      validatedAt: string | null;
      ownerSignature: string | null;
      renterSignature: string | null;
    };
  };
}

export interface CreateReturnSnapshotOptions {
  version?: string;
  force?: boolean;
}

export interface CreateReturnSnapshotResult {
  data: CheckinReturn | null;
  error: string | null;
  snapshotCreated: boolean;
}

// ============================================================================
// SERVICE
// ============================================================================

export const checkinReturnSnapshotService = {
  /**
   * Crée un snapshot légal complet pour le check-in retour
   */
  async createReturnSnapshot(
    checkinReturnId: string,
    options?: CreateReturnSnapshotOptions
  ): Promise<CreateReturnSnapshotResult> {
    try {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("[CheckinReturnSnapshotService] 🚀 Création snapshot légal retour");
      console.log("[CheckinReturnSnapshotService] 📦 Checkin Return ID:", checkinReturnId);
      console.log("[CheckinReturnSnapshotService] ⚙️ Options:", options);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      // ============================================================================
      // ÉTAPE 1 : Vérifications préalables
      // ============================================================================

      // 1.1. Charger le check-in retour
      const { data: checkinReturn, error: returnError } = await SupabaseCheckinReturnService.getReturnById(checkinReturnId);

      if (returnError || !checkinReturn) {
        console.error("[CheckinReturnSnapshotService] ❌ Check-in retour introuvable:", returnError);
        return {
          data: null,
          error: "Check-in retour introuvable",
          snapshotCreated: false,
        };
      }

      // 1.2. Vérifier le statut (doit être "draft")
      if (checkinReturn.status !== "draft") {
        console.warn(
          "[CheckinReturnSnapshotService] ⚠️ Le check-in retour doit être en statut 'draft' pour créer un snapshot. Statut actuel:",
          checkinReturn.status
        );
        return {
          data: null,
          error: `Le check-in retour doit être en statut 'draft' pour créer un snapshot. Statut actuel: ${checkinReturn.status}`,
          snapshotCreated: false,
        };
      }

      // 1.3. Vérifier si snapshot existe déjà
      if (checkinReturn.snapshot_legal && !options?.force) {
        console.log("[CheckinReturnSnapshotService] ℹ️ Snapshot déjà existant (force=false, on ne l'écrase pas)");
        return {
          data: checkinReturn,
          error: null,
          snapshotCreated: false,
        };
      }

      // ============================================================================
      // ÉTAPE 2 : Chargement des données sources
      // ============================================================================

      console.log("[CheckinReturnSnapshotService] 📥 Chargement des données sources...");

      // 2.1. Charger le check-in départ associé
      const { data: checkinDepart, error: departError } = await SupabaseCheckinService.getCheckinById(
        checkinReturn.checkin_depart_id
      );

      if (departError || !checkinDepart) {
        console.warn("[CheckinReturnSnapshotService] ⚠️ Check-in départ introuvable:", departError);
        // On continue avec des valeurs null pour départ
      }

      // 2.2. Charger la réservation
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, reference_number, start_date, end_date, start_time, end_time, user_id, vehicle_id, pickup_location")
        .eq("id", checkinReturn.booking_id)
        .single();

      if (bookingError || !booking) {
        console.warn("[CheckinReturnSnapshotService] ⚠️ Réservation introuvable:", bookingError);
        // On continue avec des valeurs null pour booking
      }

      // 2.3. Charger le véhicule
      let vehicle: {
        brand: string;
        model: string;
        license_plate: string;
        owner_id: string | null;
        vehicle_type: string | null;
      } | null = null;

      if (booking?.vehicle_id) {
        const { data: vehicleData, error: vehicleError } = await supabase
          .from("vehicles" as any)
          .select("id, brand, model, license_plate, owner_id, vehicle_type")
          .eq("id", booking.vehicle_id)
          .single();

        if (!vehicleError && vehicleData) {
          vehicle = vehicleData as any;
        }
      }

      // Exposer le type de véhicule pour les étapes suivantes
      const vehicleType = vehicle?.vehicle_type || null;

      // 2.4. Charger le profil propriétaire
      let ownerProfile: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        phone: string | null;
      } | null = null;

      if (vehicle?.owner_id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, phone")
          .eq("id", vehicle.owner_id)
          .single();

        if (!profileError && profile) {
          ownerProfile = profile;
        } else {
          console.warn("[CheckinReturnSnapshotService] ⚠️ Profil propriétaire introuvable:", profileError);
        }
      }

      // 2.5. Charger le profil locataire (via booking.user_id)
      let renterProfile: {
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
          renterProfile = profile;
        } else {
          console.warn("[CheckinReturnSnapshotService] ⚠️ Profil locataire introuvable:", profileError);
        }
      }

      // ============================================================================
      // ÉTAPE 3 : Construction de l'objet snapshot
      // ============================================================================

      console.log("[CheckinReturnSnapshotService] 🔨 Construction du snapshot...");

      const returnData = checkinReturn.data || {};
      const departData = checkinDepart?.data || {};

      // 3.1. Métadonnées
      const metadata = {
        version: options?.version || "return-1.0",
        createdAt: new Date().toISOString(),
      };

      // 3.2. Booking
      const bookingSnapshot = {
        referenceNumber: booking?.reference_number ?? null,
        departureDatetime: booking?.start_date ? `${booking.start_date}T${booking.start_time || '00:00'}:00` : null,
        returnDatetime: booking?.end_date ? `${booking.end_date}T${booking.end_time || '00:00'}:00` : null,
        departureLocation: booking?.pickup_location ?? null,
        returnLocation: booking?.return_location ?? booking?.pickup_location ?? null,
      };

      // 3.3. Vehicle
      const vehicleSnapshot = {
        brand: vehicle?.brand || "",
        model: vehicle?.model || "",
        licensePlate: vehicle?.license_plate || "",
      };

      // 3.4. Owner
      const ownerSnapshot = {
        lastName: ownerProfile?.last_name || "",
        firstName: ownerProfile?.first_name || "",
        email: ownerProfile?.email || null,
        phone: ownerProfile?.phone || null,
      };

      // 3.5. Renter
      const renterSnapshot = {
        lastName: renterProfile?.last_name || "",
        firstName: renterProfile?.first_name || "",
        email: renterProfile?.email || null,
        phone: renterProfile?.phone || null,
      };

      // 3.6. Données départ (pour comparaison)
      const departReleves = departData.step2?.releves || {};
      const departSnapshot = {
        mileage: departReleves.kilometrage ?? null,
        fuelLevel: departReleves.niveauCarburant ?? null,
        dashboardPhotos: (departReleves.dashboardPhotos || []).map((photo: any) => ({
          publicUrl: photo.publicUrl || "",
          uploadedAt: photo.uploadedAt || "",
          storagePath: photo.storagePath || "",
        })),
      };

      // 3.7. Données retour - Step 2
      const returnStep2 = returnData.step2?.releves || {};
      const returnStep2Snapshot = {
        mileage: returnStep2.kilometrageRetour ?? null,
        fuelLevel: returnStep2.niveauCarburantRetour ?? null,
        dashboardPhotos: (returnStep2.dashboardPhotosRetour || []).map((photo: any) => ({
          publicUrl: photo.publicUrl || "",
          uploadedAt: photo.uploadedAt || "",
          storagePath: photo.storagePath || "",
        })),
      };

      // 3.8. Données retour - Step 3 (extérieur)
      // ⭐ Configuration des zones selon le type de véhicule
      
      // Constantes VOITURE (comportement par défaut, strictement identique à l'existant)
      const RETURN_CAR_ZONE_KEYS = ["avant", "droit", "arriere", "gauche", "coffre", "janteAvDroit", "janteArDroit", "janteAvGauche", "janteArGauche"];
      const RETURN_CAR_ZONE_LABELS: Record<string, string> = {
        avant: "Avant",
        droit: "Côté droit",
        arriere: "Arrière",
        gauche: "Côté gauche",
        coffre: "Coffre",
        janteAvDroit: "Jante avant droite",
        janteArDroit: "Jante arrière droite",
        janteAvGauche: "Jante avant gauche",
        janteArGauche: "Jante arrière gauche",
      };

      // Constantes MOTO
      // Pour les motos, seulement 2 jantes : avant et arrière (sans distinction gauche/droite)
      // Pas de "coffre" pour la moto
      const RETURN_MOTO_ZONE_KEYS = ["avant", "droit", "arriere", "gauche", "janteAvant", "janteArriere"];
      const RETURN_MOTO_ZONE_LABELS: Record<string, string> = {
        avant: "Avant",
        droit: "Côté droit",
        arriere: "Arrière",
        gauche: "Côté gauche",
        janteAvant: "Jante avant",
        janteArriere: "Jante arrière",
      };

      // Sélection conditionnelle basée sur vehicleType
      const zoneKeys = vehicleType === 'moto' ? RETURN_MOTO_ZONE_KEYS : RETURN_CAR_ZONE_KEYS;
      const zoneLabels = vehicleType === 'moto' ? RETURN_MOTO_ZONE_LABELS : RETURN_CAR_ZONE_LABELS;

      const returnStep3 = returnData.step3?.sections || {};
      const returnStep3Snapshot: Record<string, any> = {};
      for (const zoneKey of zoneKeys) {
        const section = returnStep3[zoneKey] || {};
        returnStep3Snapshot[zoneKey] = {
          label: zoneLabels[zoneKey] || zoneKey, // ⭐ Label pour le PDF
          isSameAsDepart: section.isSameAsDepart !== false,
          newDamages: (section.newDamages || []).map((damage: any) => ({
            description: damage.description || "",
            type: damage.type || "",
            photos: (damage.photos || []).map((photo: any) => ({
              publicUrl: photo.publicUrl || "",
              uploadedAt: photo.uploadedAt || "",
              storagePath: photo.storagePath || "",
            })),
          })),
        };
      }

      // 3.9. Données retour - Step 4 (intérieur)
      const returnStep4 = returnData.step4?.interior || {};
      const returnStep4Snapshot = {
        isSameAsDepart: returnStep4.isSameAsDepart !== false,
        newDamages: (returnStep4.newDamages || []).map((damage: any) => ({
          area: damage.area || "",
          description: damage.description || "",
          photos: (damage.photos || []).map((photo: any) => ({
            publicUrl: photo.publicUrl || "",
            uploadedAt: photo.uploadedAt || "",
            storagePath: photo.storagePath || "",
          })),
        })),
      };

      // 3.10. Données retour - Step 5 (accessoires)
      // ⭐ Configuration des accessoires selon le type de véhicule
      
      // Constantes VOITURE (comportement par défaut, strictement identique à l'existant)
      const RETURN_CAR_ACCESSORY_LABELS: Record<string, string> = {
        gilet: "Gilet",
        triangle: "Triangle",
        roueSecours: "Roue de secours",
        cric: "Cric",
        cle: "Clé",
        cable: "Câble",
        manuel: "Manuel",
        carteCarburant: "Carte carburant",
      };

      // Constantes MOTO
      // ⚠️ Source : src/modules/etatDesLieuxDepartMoto/sections/Section5AccessoiresMoto.tsx lignes 45-90
      // Aucune liste d'accessoires retour moto spécifique n'existe dans le repo.
      // Cette liste provient du départ moto (seule source disponible).
      // TODO : Vérifier si une liste retour moto spécifique doit être créée.
      const RETURN_MOTO_ACCESSORY_LABELS: Record<string, string> = {
        casque: "Casque",
        gants: "Gants",
        cadenas: "Cadenas antivol",
        support_telephone: "Support téléphone",
        top_case: "Top case / Coffre",
        prise_usb: "Prise USB",
        gilet_jaune: "Gilet jaune / Réfléchissant",
        autre: "Autre accessoire",
      };

      // Sélection conditionnelle basée sur vehicleType
      const accessoryLabels = vehicleType === 'moto' ? RETURN_MOTO_ACCESSORY_LABELS : RETURN_CAR_ACCESSORY_LABELS;

      const returnStep5 = returnData.step5?.accessoiresRetour || {};
      const departAccessoires = departData.step5?.accessoires || {};
      const isSameAsDepart = returnStep5.isSameAsDepart !== false; // true par défaut
      
      // ⭐ Construire la liste complète des accessoires avec leurs états
      // ⚠️ LOGIQUE IMPORTANTE :
      // - Si isSameAsDepart = true → accessoires au retour = accessoires au départ
      // - Si isSameAsDepart = false → lire returnStep5.accessoires pour l'état réel
      const accessoiresList: Array<{ key: string; label: string; presentAtDepart: boolean; presentAtReturn: boolean }> = [];
      Object.keys(accessoryLabels).forEach(accKey => {
        const wasPresentAtDepart = departAccessoires[accKey] === true;
        let isPresentAtReturn: boolean;
        
        if (isSameAsDepart) {
          // Si identiques au départ → état retour = état départ
          isPresentAtReturn = wasPresentAtDepart;
        } else {
          // Si différences → lire l'état réel depuis returnStep5.accessoires
          isPresentAtReturn = returnStep5.accessoires?.[accKey] === true;
        }
        
        accessoiresList.push({
          key: accKey,
          label: accessoryLabels[accKey],
          presentAtDepart: wasPresentAtDepart,
          presentAtReturn: isPresentAtReturn,
        });
      });

      const returnStep5Snapshot = {
        isSameAsDepart: returnStep5.isSameAsDepart !== false,
        accessoires: returnStep5.accessoires || {},
        commentaire: returnStep5.commentaire || null,
        accessoiresList, // ⭐ Liste complète pour le PDF
      };

      // 3.11. Données retour - Step 6 (remarques)
      const returnStep6 = returnData.step6?.remarques || {};
      const returnStep6Snapshot = {
        remarquesGeneral: returnStep6.observations || null,
        remarquesOwner: returnStep6.ownerRemarks || null,
        remarquesRenter: returnStep6.renterRemarks || null,
      };

      // 3.12. Données retour - Step 7 (validation)
      const returnStep7 = returnData.step7?.validation || {};
      const returnStep7Snapshot = {
        validatedAt: returnStep7.validatedAt || new Date().toISOString(),
        ownerSignature: returnStep7.ownerSignature || null,
        renterSignature: returnStep7.renterSignature || null,
      };

      // Assemblage du snapshot complet
      const snapshot: CheckinReturnLegalSnapshot = {
        metadata,
        checkinReturnId: checkinReturn.id,
        checkinDepartId: checkinReturn.checkin_depart_id,
        booking: bookingSnapshot,
        vehicle: vehicleSnapshot,
        owner: ownerSnapshot,
        renter: renterSnapshot,
        depart: departSnapshot,
        return: {
          step2: returnStep2Snapshot,
          step3: {
            sections: returnStep3Snapshot,
          },
          step4: returnStep4Snapshot,
          step5: returnStep5Snapshot,
          step6: returnStep6Snapshot,
          step7: returnStep7Snapshot,
        },
      };

      // ============================================================================
      // ÉTAPE 4 : Sauvegarde dans checkin_return
      // ============================================================================

      console.log("[CheckinReturnSnapshotService] 💾 Sauvegarde du snapshot...");

      const { data: updatedCheckinReturn, error: updateError } = await supabase
        .from("checkin_return" as any)
        .update({
          snapshot_legal: snapshot,
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkinReturnId)
        .select()
        .single();

      if (updateError) {
        console.error("[CheckinReturnSnapshotService] ❌ Erreur UPDATE:", updateError);
        return {
          data: null,
          error: `Erreur lors de la sauvegarde du snapshot: ${updateError.message}`,
          snapshotCreated: false,
        };
      }

      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("[CheckinReturnSnapshotService] ✅ Snapshot légal retour créé avec succès");
      console.log("[CheckinReturnSnapshotService] 📦 Checkin Return ID:", (updatedCheckinReturn as any)?.id);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      return {
        data: updatedCheckinReturn as unknown as CheckinReturn,
        error: null,
        snapshotCreated: true,
      };
    } catch (err: any) {
      console.error("[CheckinReturnSnapshotService] ❌ Exception:", err);
      return {
        data: null,
        error: err.message || "Erreur inattendue lors de la création du snapshot",
        snapshotCreated: false,
      };
    }
  },
};
