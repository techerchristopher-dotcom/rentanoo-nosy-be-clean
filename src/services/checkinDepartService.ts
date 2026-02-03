/**
 * Service pour la gestion des états des lieux de départ (check-in)
 * 
 * ✅ NOUVEAU : Appel DIRECT à Supabase (pattern identique à supabaseVehiclesService)
 * ❌ ANCIEN : Passait par la route Express /api/checkin/saveDraft (causait des 500)
 */

import { SupabaseCheckinService, type CheckinDepart } from "./supabaseCheckinService";
// ⚠️ IMPORTANT : generateCheckinDepartPdf est importé dynamiquement dans finalizeCheckinDepart
// pour éviter de charger le module checkinDepartPdfService (et ses dépendances html2canvas/jsPDF)
// lors de l'import de checkinDepartService

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

/**
 * Payload de l'Étape 1 : Identification du conducteur
 */
export interface Step1IdentificationPayload {
  completedAt: string;  // ISO timestamp de complétion
  identification: {
    // Informations personnelles
    nom: string;
    prenom: string;

    // Permis de conduire
    numeroPermis: string;
    paysEmission: string;        // Code pays (FR, BE, CH, etc.)
    categoriePermis: string;     // B, A, C, D
    dateDelivrance: string;      // ISO date
    dateExpiration: string;      // ISO date

    // Photos du permis (URLs publiques Supabase Storage)
    photoPermisRecto?: string | null;   // URL
    photoPermisVerso?: string | null;   // URL
  };
}

/**
 * ⭐ Payload de l'Étape 2 : Relevés du véhicule
 */
export interface Step2Payload {
  completedAt: string;  // ISO timestamp
  vehicule: {
    marque: string;
    modele: string;
    immatriculation: string;
  };
  releves: {
    kilometrage: number;
    niveauCarburant: number;  // 0-100
    dashboardPhotos: {
      storagePath: string;
      publicUrl: string;      // URL complète Supabase Storage
      uploadedAt: string;
    }[];
  };
  location?: string;
}

/**
 * ⭐ Payload de l'Étape 3 : Extérieur & Coffre
 * Import depuis les types dédiés
 */
export type { Step3Payload, ExteriorPhoto, ExteriorDamage } from '@/types/step3';

/**
 * Arguments pour sauvegarder un brouillon d'étape 1
 */
interface SaveStep1DraftArgs {
  bookingId: string;
  ownerId: string | null;
  renterId: string | null;
  checkinId?: string | null;  // Optionnel - fourni si UPDATE, absent si INSERT
  step1: Step1IdentificationPayload;
}

/**
 * Réponse de l'API après sauvegarde
 */
export interface SaveDraftResponse {
  checkinId: string;
  status: string;
  data: any;
  raw?: any;  // Enregistrement complet si besoin
}

// ============================================================================
// SERVICE
// ============================================================================

/**
 * ⭐ SAUVEGARDE DE L'ÉTAPE 1 (Identification)
 * 
 * ✅ NOUVEAU : Appel DIRECT à Supabase (comme updateVehicle qui fonctionne)
 * ❌ ANCIEN : Passait par /api/checkin/saveDraft (Express) → causait des 500
 * 
 * @returns SaveDraftResponse ou throw Error
 */
export async function saveStep1Draft({
  bookingId,
  ownerId,
  renterId,
  checkinId,
  step1,
}: SaveStep1DraftArgs): Promise<SaveDraftResponse> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[CHECKIN_SERVICE] 🚀 Sauvegarde Étape 1 (DIRECT Supabase)");
  console.log("[CHECKIN_SERVICE] 📊 Context:", {
    bookingId,
    hasCheckinId: !!checkinId,
    action: checkinId ? "UPDATE" : "INSERT",
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ✅ Appel DIRECT à Supabase (pattern identique à supabaseVehiclesService)
  const { data, error } = await SupabaseCheckinService.saveCheckinDraft({
    checkin_id: checkinId || null,
    booking_id: bookingId,
    owner_id: ownerId || null,
    renter_id: renterId || null,
    status: "draft",
    data: {
      step1,  // Structure : { step1: { completedAt, identification } }
    },
  });

  // Gestion d'erreur (comme dans supabaseVehiclesService.updateVehicle)
  if (error) {
    console.error("[CHECKIN_SERVICE] ❌ Erreur:", error);
    throw new Error(error);
  }

  // Succès
  if (!data || !data.id) {
    console.error("[CHECKIN_SERVICE] ❌ Réponse invalide (pas d'ID):", data);
    throw new Error("Réponse Supabase invalide : ID manquant");
  }

  console.log("[CHECKIN_SERVICE] ✅ Sauvegarde réussie:", {
    checkinId: data.id,
    status: data.status,
    dataKeys: Object.keys(data.data || {}),
  });

  return {
    checkinId: data.id,
    status: data.status || "draft",
    data: data.data,
    raw: data,
  };
}

// ============================================================================
// ⭐ SAUVEGARDE DE L'ÉTAPE 2 (Relevés du véhicule)
// ============================================================================

/**
 * Arguments pour sauvegarder un brouillon d'étape 2
 */
interface SaveStep2DraftArgs {
  bookingId: string;
  ownerId: string | null;
  renterId: string | null;
  checkinId?: string | null;
  step2: Step2Payload;
}

/**
 * ⭐ SAUVEGARDE DE L'ÉTAPE 2 (Relevés du véhicule)
 * 
 * ✅ Appel DIRECT à Supabase (même pattern que Step1)
 * 
 * @returns SaveDraftResponse ou throw Error
 */
export async function saveStep2Draft({
  bookingId,
  ownerId,
  renterId,
  checkinId,
  step2,
}: SaveStep2DraftArgs): Promise<SaveDraftResponse> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[CHECKIN_SERVICE] 🚀 Sauvegarde Étape 2 (DIRECT Supabase)");
  console.log("[CHECKIN_SERVICE] 📊 Context:", {
    bookingId,
    hasCheckinId: !!checkinId,
    action: checkinId ? "UPDATE" : "INSERT",
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ✅ Appel DIRECT à Supabase
  const { data, error } = await SupabaseCheckinService.saveCheckinDraft({
    checkin_id: checkinId || null,
    booking_id: bookingId,
    owner_id: ownerId || null,
    renter_id: renterId || null,
    status: "draft",
    data: {
      step2,  // Structure : { step2: { completedAt, vehicule, releves } }
    },
  });

  // Gestion d'erreur
  if (error) {
    console.error("[CHECKIN_SERVICE] ❌ Erreur Step2:", error);
    throw new Error(error);
  }

  // Succès
  if (!data || !data.id) {
    console.error("[CHECKIN_SERVICE] ❌ Réponse invalide (pas d'ID):", data);
    throw new Error("Réponse Supabase invalide : ID manquant");
  }

  console.log("[CHECKIN_SERVICE] ✅ Sauvegarde Step2 réussie:", {
    checkinId: data.id,
    status: data.status,
    dataKeys: Object.keys(data.data || {}),
  });

  return {
    checkinId: data.id,
    status: data.status || "draft",
    data: data.data,
    raw: data,
  };
}

// ============================================================================
// ⭐ SAUVEGARDE DE L'ÉTAPE 3 (Extérieur & Coffre)
// ============================================================================

/**
 * Arguments pour sauvegarder un brouillon d'étape 3
 */
interface SaveStep3DraftArgs {
  bookingId: string;
  ownerId: string | null;
  renterId: string | null;
  checkinId?: string | null;
  step3: import('@/types/step3').Step3Payload;
}

/**
 * ⭐ SAUVEGARDE DE L'ÉTAPE 3 (Extérieur & Coffre)
 * 
 * ✅ Appel DIRECT à Supabase (même pattern que Step1/Step2)
 * 
 * @returns SaveDraftResponse ou throw Error
 */
export async function saveStep3Draft({
  bookingId,
  ownerId,
  renterId,
  checkinId,
  step3,
}: SaveStep3DraftArgs): Promise<SaveDraftResponse> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[CHECKIN_SERVICE] 🚀 Sauvegarde Étape 3 (DIRECT Supabase)");
  console.log("[CHECKIN_SERVICE] 📊 Context:", {
    bookingId,
    hasCheckinId: !!checkinId,
    action: checkinId ? "UPDATE" : "INSERT",
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ✅ Appel DIRECT à Supabase
  const { data, error } = await SupabaseCheckinService.saveCheckinDraft({
    checkin_id: checkinId || null,
    booking_id: bookingId,
    owner_id: ownerId || null,
    renter_id: renterId || null,
    status: "draft",
    data: {
      step3,  // Structure : { step3: { completedAt, zonesPhotos, damageReports, ... } }
    },
  });

  // Gestion d'erreur
  if (error) {
    console.error("[CHECKIN_SERVICE] ❌ Erreur Step3:", error);
    throw new Error(error);
  }

  // Succès
  if (!data || !data.id) {
    console.error("[CHECKIN_SERVICE] ❌ Réponse invalide (pas d'ID):", data);
    throw new Error("Réponse Supabase invalide : ID manquant");
  }

  console.log("[CHECKIN_SERVICE] ✅ Sauvegarde Step3 réussie:", {
    checkinId: data.id,
    status: data.status,
    dataKeys: Object.keys(data.data || {}),
  });

  return {
    checkinId: data.id,
    status: data.status || "draft",
    data: data.data,
    raw: data,
  };
}

// ============================================================================
// ⭐ SAUVEGARDE PARTIELLE D'UNE ZONE DE L'ÉTAPE 3 (Extérieur & Coffre)
// ============================================================================

interface SaveStep3ZoneDraftArgs {
  bookingId: string;
  ownerId: string | null;
  renterId: string | null;
  checkinId?: string | null;
  zoneKey:
    | "avant"
    | "droit"
    | "arriere"
    | "coffre"
    | "gauche"
    | "janteAvDroit"
    | "janteArDroit"
    | "janteAvGauche"
    | "janteArGauche"
    | "propreteExterieure";
  // Photos principales de la zone (si fourni) — conservé pour compatibilité
  zonePhotos?: import('@/types/step3').ExteriorPhoto[];
  // Patch de photos par clé (permet d'envoyer plusieurs clés de jantes)
  photosPatch?: Record<string, import('@/types/step3').ExteriorPhoto[]>;
  zoneHasDamage?: boolean; // toggle dégâts
  // Dégâts à persister pour ce scope
  zoneDamageReports?: import('@/types/step3').ExteriorDamage[];
  // Côtés couverts par ce scope (ex: ['droit','janteAvDroit','janteArDroit'])
  scopeSides?: string[];
  // 🆕 Patch spécifique pour la propreté extérieure
  propreteExterieure?: {
    level?: string;
    notes?: string;
    photos?: import('@/types/step3').ExteriorPhoto[];
  };
}

/**
 * Sauvegarde incrémentale d'une zone de step3 en fusionnant avec les données existantes.
 * - Lit le draft existant (par checkinId si présent, sinon par bookingId)
 * - Merge la zone (photos/zonesHasDamage/damageReports filtrés) dans step3
 * - Envoie un saveCheckinDraft avec le step3 complet mergé
 */
export async function saveStep3ZoneDraft({
  bookingId,
  ownerId,
  renterId,
  checkinId,
  zoneKey,
  zonePhotos,
  photosPatch,
  zoneHasDamage,
  zoneDamageReports,
  scopeSides,
  propreteExterieure,
}: SaveStep3ZoneDraftArgs): Promise<SaveDraftResponse> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[CHECKIN_SERVICE] 🚀 Sauvegarde partielle Step3 (zone)", {
    zoneKey,
    bookingId,
    hasCheckinId: !!checkinId,
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 1) Charger le check-in existant (par ID si dispo, sinon par bookingId)
  let existing: import('./supabaseCheckinService').CheckinDepart | null = null;
  if (checkinId) {
    const { data, error } = await SupabaseCheckinService.getCheckinById(checkinId);
    if (error) throw new Error(error);
    existing = data;
  } else {
    const { data, error } = await SupabaseCheckinService.getCheckinByBookingId(bookingId);
    if (error) throw new Error(error);
    existing = data;
  }

  const existingData = existing?.data || {};
  const existingStep3 = existingData.step3 || {};
  const existingZonesPhotos = existingStep3.zonesPhotos || {};
  const existingZonesHasDamage = existingStep3.zonesHasDamage || {};
  const existingDamageReports: import('@/types/step3').ExteriorDamage[] = existingStep3.damageReports || [];
  const existingPropreteExterieure = existingStep3.propreteExterieure || {};

  // 2) Construire le step3 mergé
  const mergedZonesPhotos = {
    ...existingZonesPhotos,
    ...(zonePhotos ? { [zoneKey]: zonePhotos } : {}),
    ...(photosPatch ? photosPatch : {}),
  };

  const mergedZonesHasDamage = {
    ...existingZonesHasDamage,
    ...(typeof zoneHasDamage === "boolean" ? { [zoneKey]: zoneHasDamage } : {}),
  };

  // Remplacer les dégâts de cette zone par ceux fournis (si fournis)
  let mergedDamageReports = existingDamageReports;
  if (Array.isArray(zoneDamageReports)) {
    const sidesToReplace = Array.isArray(scopeSides) && scopeSides.length > 0 ? scopeSides : [zoneKey];
    mergedDamageReports = [
      // garder les dégâts des côtés hors scope
      ...existingDamageReports.filter((d) => !sidesToReplace.includes((d as any)?.side)),
      // ajouter ceux fournis pour le scope courant
      ...zoneDamageReports,
    ];
  }

  // 🆕 Merge de la propreté extérieure si fournie
  const mergedPropreteExterieure = typeof propreteExterieure !== "undefined"
    ? {
        ...existingPropreteExterieure,
        ...propreteExterieure,
      }
    : existingPropreteExterieure;

  const mergedStep3 = {
    ...existingStep3,
    zonesPhotos: mergedZonesPhotos,
    zonesHasDamage: mergedZonesHasDamage,
    damageReports: mergedDamageReports,
    ...(typeof propreteExterieure !== "undefined" ? { propreteExterieure: mergedPropreteExterieure } : {}),
  };

  // 3) Sauvegarde via saveCheckinDraft (merge JSON côté service)
  const { data, error } = await SupabaseCheckinService.saveCheckinDraft({
    checkin_id: existing?.id || checkinId || null,
    booking_id: bookingId,
    owner_id: ownerId || null,
    renter_id: renterId || null,
    status: "draft",
    data: {
      step3: mergedStep3,
    },
  });

  if (error) {
    console.error("[CHECKIN_SERVICE] ❌ Erreur saveStep3ZoneDraft:", error);
    throw new Error(error);
  }

  if (!data || !data.id) {
    console.error("[CHECKIN_SERVICE] ❌ Réponse invalide (pas d'ID):", data);
    throw new Error("Réponse Supabase invalide : ID manquant (zone)");
  }

  console.log("[CHECKIN_SERVICE] ✅ Sauvegarde zone Step3 OK:", { zoneKey, checkinId: data.id });
  return {
    checkinId: data.id,
    status: data.status || "draft",
    data: data.data,
    raw: data,
  };
}

// ============================================================================
// ⭐ SAUVEGARDE DE L'ÉTAPE 4 (Intérieur)
// ============================================================================

/**
 * Arguments pour sauvegarder un brouillon d'étape 4
 */
interface SaveStep4DraftArgs {
  bookingId: string;
  ownerId: string | null;
  renterId: string | null;
  checkinId?: string | null;
  step4: {
    completedAt?: string; // ⭐ Ajout de completedAt pour la progression
    sieges?: {
      photos?: import('@/types/step4').InteriorPhoto[];
      hasDamage?: boolean;
      damages?: string[];
      notes?: string;
      damagePhotos?: import('@/types/step4').InteriorPhoto[];
    };
    propreteGenerale?: {
      photos?: import('@/types/step4').InteriorPhoto[];
      level?: "Excellent" | "Bon" | "Moyen" | "Sale";
      notes?: string;
    };
    equipements?: {
      radioOk?: boolean;
      acOk?: boolean;
      centralLockOk?: boolean;
      windowsOk?: boolean;
    };
  };
}

/**
 * ⭐ SAUVEGARDE DE L'ÉTAPE 4 (Intérieur) - Snapshot global
 * 
 * ✅ Appel DIRECT à Supabase (même pattern que Step1/Step2/Step3)
 * 
 * @returns SaveDraftResponse ou throw Error
 */
export async function saveStep4Draft({
  bookingId,
  ownerId,
  renterId,
  checkinId,
  step4,
}: SaveStep4DraftArgs): Promise<SaveDraftResponse> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[CHECKIN_SERVICE] 🚀 Sauvegarde Étape 4 (DIRECT Supabase)");
  console.log("[CHECKIN_SERVICE] 📊 Context:", {
    bookingId,
    hasCheckinId: !!checkinId,
    action: checkinId ? "UPDATE" : "INSERT",
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ✅ Appel DIRECT à Supabase
  const { data, error } = await SupabaseCheckinService.saveCheckinDraft({
    checkin_id: checkinId || null,
    booking_id: bookingId,
    owner_id: ownerId || null,
    renter_id: renterId || null,
    status: "draft",
    data: {
      step4,  // Structure : { step4: { sieges, propreteGenerale, equipements } }
    },
  });

  // Gestion d'erreur
  if (error) {
    console.error("[CHECKIN_SERVICE] ❌ Erreur Step4:", error);
    throw new Error(error);
  }

  // Succès
  if (!data || !data.id) {
    console.error("[CHECKIN_SERVICE] ❌ Réponse invalide (pas d'ID):", data);
    throw new Error("Réponse Supabase invalide : ID manquant");
  }

  console.log("[CHECKIN_SERVICE] ✅ Sauvegarde Step4 réussie:", {
    checkinId: data.id,
    status: data.status,
    dataKeys: Object.keys(data.data || {}),
  });

  return {
    checkinId: data.id,
    status: data.status || "draft",
    data: data.data,
    raw: data,
  };
}

// ============================================================================
// ⭐ SAUVEGARDE PARTIELLE D'UNE SECTION DE L'ÉTAPE 4 (Intérieur)
// ============================================================================

interface SaveStep4SectionDraftArgs {
  bookingId: string;
  ownerId: string | null;
  renterId: string | null;
  checkinId?: string | null;
  sectionKey: "sieges" | "propreteGenerale" | "equipements";
  sieges?: {
    photos?: import('@/types/step4').InteriorPhoto[];
    hasDamage?: boolean;
    damages?: string[];
    notes?: string;
    damagePhotos?: import('@/types/step4').InteriorPhoto[];
  };
  propreteGenerale?: {
    photos?: import('@/types/step4').InteriorPhoto[];
    level?: "Excellent" | "Bon" | "Moyen" | "Sale";
    notes?: string;
  };
  equipements?: {
    radioOk?: boolean;
    acOk?: boolean;
    centralLockOk?: boolean;
    windowsOk?: boolean;
  };
}

/**
 * Sauvegarde incrémentale d'une section de step4 en fusionnant avec les données existantes.
 * - Lit le draft existant (par checkinId si présent, sinon par bookingId)
 * - Merge la section dans step4
 * - Envoie un saveCheckinDraft avec le step4 complet mergé
 */
export async function saveStep4SectionDraft({
  bookingId,
  ownerId,
  renterId,
  checkinId,
  sectionKey,
  sieges,
  propreteGenerale,
  equipements,
}: SaveStep4SectionDraftArgs): Promise<SaveDraftResponse> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[CHECKIN_SERVICE] 🚀 Sauvegarde partielle Step4 (section)", {
    sectionKey,
    bookingId,
    hasCheckinId: !!checkinId,
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // 1) Charger le check-in existant (par ID si dispo, sinon par bookingId)
  let existing: import('./supabaseCheckinService').CheckinDepart | null = null;
  if (checkinId) {
    const { data, error } = await SupabaseCheckinService.getCheckinById(checkinId);
    if (error) throw new Error(error);
    existing = data;
  } else {
    const { data, error } = await SupabaseCheckinService.getCheckinByBookingId(bookingId);
    if (error) throw new Error(error);
    existing = data;
  }

  const existingData = existing?.data || {};
  const existingStep4 = existingData.step4 || {};

  // 2) Construire le step4 mergé
  const mergedStep4 = {
    ...existingStep4,
    ...(sectionKey === "sieges" && typeof sieges !== "undefined"
      ? { sieges: { ...(existingStep4.sieges || {}), ...sieges } }
      : {}),
    ...(sectionKey === "propreteGenerale" && typeof propreteGenerale !== "undefined"
      ? { propreteGenerale: { ...(existingStep4.propreteGenerale || {}), ...propreteGenerale } }
      : {}),
    ...(sectionKey === "equipements" && typeof equipements !== "undefined"
      ? { equipements: { ...(existingStep4.equipements || {}), ...equipements } }
      : {}),
  };

  // 3) Sauvegarde via saveCheckinDraft (merge JSON côté service)
  const { data, error } = await SupabaseCheckinService.saveCheckinDraft({
    checkin_id: existing?.id || checkinId || null,
    booking_id: bookingId,
    owner_id: ownerId || null,
    renter_id: renterId || null,
    status: "draft",
    data: {
      step4: mergedStep4,
    },
  });

  if (error) {
    console.error("[CHECKIN_SERVICE] ❌ Erreur saveStep4SectionDraft:", error);
    throw new Error(error);
  }

  if (!data || !data.id) {
    console.error("[CHECKIN_SERVICE] ❌ Réponse invalide (pas d'ID):", data);
    throw new Error("Réponse Supabase invalide : ID manquant (section)");
  }

  console.log("[CHECKIN_SERVICE] ✅ Sauvegarde section Step4 OK:", { sectionKey, checkinId: data.id });
  return {
    checkinId: data.id,
    status: data.status || "draft",
    data: data.data,
    raw: data,
  };
}

/**
 * ⭐ HELPER : Construire le payload Étape 1 depuis les valeurs RHF
 * 
 * Extrait et formate uniquement les champs de l'étape 1 (identification)
 */
export function buildStep1Payload(formValues: any): Step1IdentificationPayload {
  const conducteur = formValues.conducteur || {};

  return {
    completedAt: new Date().toISOString(),
    identification: {
      // Informations personnelles
      nom: conducteur.nom || "",
      prenom: conducteur.prenom || "",

      // Permis de conduire
      numeroPermis: conducteur.numeroPermis || "",
      paysEmission: conducteur.paysEmission || "",
      categoriePermis: conducteur.categoriePermis || "B",
      dateDelivrance: conducteur.dateDelivrance || "",
      dateExpiration: conducteur.dateExpiration || "",

      // Photos (optionnelles)
      photoPermisRecto: conducteur.driver_license_photos_recto || null,
      photoPermisVerso: conducteur.driver_license_photos_verso || null,
    },
  };
}

// ============================================================================
// ⭐ SAUVEGARDE DE L'ÉTAPE 5 (Accessoires & Équipements)
// ============================================================================

/**
 * Arguments pour sauvegarder un brouillon d'étape 5
 */
interface SaveStep5DraftArgs {
  bookingId: string;
  ownerId: string | null;
  renterId: string | null;
  checkinId?: string | null;
  step5: {
    completedAt?: string; // ⭐ Pour la progression
    accessoires?: {
      gilet?: boolean;
      triangle?: boolean;
      roueSecours?: boolean;
      cric?: boolean;
      commentaire?: string;
    };
  };
}

/**
 * ⭐ SAUVEGARDE DE L'ÉTAPE 5 (Accessoires & Équipements) - Snapshot global
 * 
 * ✅ Appel DIRECT à Supabase (même pattern que Step1/Step2/Step3/Step4)
 * 
 * @returns SaveDraftResponse ou throw Error
 */
export async function saveStep5Draft({
  bookingId,
  ownerId,
  renterId,
  checkinId,
  step5,
}: SaveStep5DraftArgs): Promise<SaveDraftResponse> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[CHECKIN_SERVICE] 🚀 Sauvegarde Étape 5 (DIRECT Supabase)");
  console.log("[CHECKIN_SERVICE] 📊 Context:", {
    bookingId,
    hasCheckinId: !!checkinId,
    action: checkinId ? "UPDATE" : "INSERT",
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ✅ Appel DIRECT à Supabase
  const { data, error } = await SupabaseCheckinService.saveCheckinDraft({
    checkin_id: checkinId || null,
    booking_id: bookingId,
    owner_id: ownerId || null,
    renter_id: renterId || null,
    status: "draft",
    data: {
      step5,  // Structure : { step5: { completedAt, accessoires } }
    },
  });

  // Gestion d'erreur
  if (error) {
    console.error("[CHECKIN_SERVICE] ❌ Erreur Step5:", error);
    throw new Error(error);
  }

  // Succès
  if (!data || !data.id) {
    console.error("[CHECKIN_SERVICE] ❌ Réponse invalide (pas d'ID):", data);
    throw new Error("Réponse Supabase invalide : ID manquant");
  }

  console.log("[CHECKIN_SERVICE] ✅ Sauvegarde Step5 réussie:", {
    checkinId: data.id,
    status: data.status,
    dataKeys: Object.keys(data.data || {}),
  });

  return {
    checkinId: data.id,
    status: data.status || "draft",
    data: data.data,
    raw: data,
  };
}

// ============================================================================
// ⭐ SAUVEGARDE DE L'ÉTAPE 6 (Remarques & Observations)
// ============================================================================

/**
 * Arguments pour sauvegarder un brouillon d'étape 6
 */
interface SaveStep6DraftArgs {
  bookingId: string;
  ownerId: string | null;
  renterId: string | null;
  checkinId?: string | null;
  step6: {
    completedAt?: string; // ⭐ Pour la progression
    remarques?: {
      observations?: string;
    };
  };
}

/**
 * ⭐ SAUVEGARDE DE L'ÉTAPE 6 (Remarques & Observations) - Snapshot global
 * 
 * ✅ Appel DIRECT à Supabase (même pattern que Step1/Step2/Step3/Step4/Step5)
 * 
 * @returns SaveDraftResponse ou throw Error
 */
export async function saveStep6Draft({
  bookingId,
  ownerId,
  renterId,
  checkinId,
  step6,
}: SaveStep6DraftArgs): Promise<SaveDraftResponse> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[CHECKIN_SERVICE] 🚀 Sauvegarde Étape 6 (DIRECT Supabase)");
  console.log("[CHECKIN_SERVICE] 📊 Context:", {
    bookingId,
    hasCheckinId: !!checkinId,
    action: checkinId ? "UPDATE" : "INSERT",
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ✅ Appel DIRECT à Supabase
  const { data, error } = await SupabaseCheckinService.saveCheckinDraft({
    checkin_id: checkinId || null,
    booking_id: bookingId,
    owner_id: ownerId || null,
    renter_id: renterId || null,
    status: "draft",
    data: {
      step6,  // Structure : { step6: { completedAt, remarques } }
    },
  });

  // Gestion d'erreur
  if (error) {
    console.error("[CHECKIN_SERVICE] ❌ Erreur Step6:", error);
    throw new Error(error);
  }

  // Succès
  if (!data || !data.id) {
    console.error("[CHECKIN_SERVICE] ❌ Réponse invalide (pas d'ID):", data);
    throw new Error("Réponse Supabase invalide : ID manquant");
  }

  console.log("[CHECKIN_SERVICE] ✅ Sauvegarde Step6 réussie:", {
    checkinId: data.id,
    status: data.status,
    dataKeys: Object.keys(data.data || {}),
  });

  return {
    checkinId: data.id,
    status: data.status || "draft",
    data: data.data,
    raw: data,
  };
}

/**
 * ⭐ Interface pour la sauvegarde de l'étape 7 (Validation & Signature)
 */
export interface SaveStep7DraftArgs {
  bookingId: string;
  ownerId: string | null;
  renterId: string | null;
  checkinId?: string | null;
  step7: {
    completedAt?: string; // ⭐ Pour la progression
    validation?: {
      ownerSignature?: string;
      renterSignature?: string;
      validatedAt?: string;
    };
  };
}

/**
 * ⭐ SAUVEGARDE DE L'ÉTAPE 7 (Validation & Signature) - Snapshot global
 * 
 * ✅ Appel DIRECT à Supabase (même pattern que Step1/Step2/Step3/Step4/Step5/Step6)
 * 
 * ⚠️ NOTE : Cette fonction sauvegarde uniquement Step7 en mode "draft".
 * Pour finaliser l'état des lieux (créer snapshot + changer status), utiliser `finalizeCheckinDepart`.
 * 
 * @returns SaveDraftResponse ou throw Error
 */
export async function saveStep7Draft({
  bookingId,
  ownerId,
  renterId,
  checkinId,
  step7,
}: SaveStep7DraftArgs): Promise<SaveDraftResponse> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[CHECKIN_SERVICE] 🚀 Sauvegarde Étape 7 (DIRECT Supabase)");
  console.log("[CHECKIN_SERVICE] 📊 Context:", {
    bookingId,
    hasCheckinId: !!checkinId,
    action: checkinId ? "UPDATE" : "INSERT",
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ✅ Appel DIRECT à Supabase
  const { data, error } = await SupabaseCheckinService.saveCheckinDraft({
    checkin_id: checkinId || null,
    booking_id: bookingId,
    owner_id: ownerId || null,
    renter_id: renterId || null,
    status: "draft",
    data: {
      step7,  // Structure : { step7: { completedAt, validation } }
    },
  });

  // Gestion d'erreur
  if (error) {
    console.error("[CHECKIN_SERVICE] ❌ Erreur Step7:", error);
    throw new Error(error);
  }

  // Succès
  if (!data || !data.id) {
    console.error("[CHECKIN_SERVICE] ❌ Réponse invalide (pas d'ID):", data);
    throw new Error("Réponse Supabase invalide : ID manquant");
  }

  console.log("[CHECKIN_SERVICE] ✅ Sauvegarde Step7 réussie:", {
    checkinId: data.id,
    status: data.status,
    dataKeys: Object.keys(data.data || {}),
  });

  return {
    checkinId: data.id,
    status: data.status || "draft",
    data: data.data,
    raw: data,
  };
}

/**
 * ⭐ FINALISATION COMPLÈTE DE L'ÉTAT DES LIEUX DE DÉPART
 * 
 * Cette fonction :
 * 1. Sauvegarde Step 7 (signatures + validatedAt)
 * 2. Crée le snapshot légal (createLegalSnapshot)
 * 3. Change le statut de "draft" → "completed"
 * 
 * ⚠️ IMPORTANT : Cette fonction est la SEULE qui peut changer le status vers "completed".
 * Elle doit être appelée uniquement lors de la validation finale (bouton "Valider et enregistrer").
 * 
 * @param params - Paramètres de finalisation
 * @returns Résultat avec checkin finalisé ou erreur
 */
export async function finalizeCheckinDepart(params: {
  checkinId: string;
  bookingId: string;
  ownerId: string | null;
  renterId: string | null;
  step7Payload: {
    completedAt?: string;
    validation?: {
      ownerSignature?: string;
      renterSignature?: string;
      validatedAt?: string;
    };
  };
}): Promise<{ data: CheckinDepart | null; error: string | null; pdfError?: string | null }> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[CHECKIN_SERVICE] 🎯 FINALISATION État des lieux");
  console.log("[CHECKIN_SERVICE] 📦 Checkin ID:", params.checkinId);
  console.log("[CHECKIN_SERVICE] 📋 Booking ID:", params.bookingId);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    // ============================================================================
    // ÉTAPE 1 : Vérifier que le check-in est encore en "draft"
    // ============================================================================
    const { data: existingCheckin, error: checkinError } = await SupabaseCheckinService.getCheckinById(params.checkinId);

    if (checkinError || !existingCheckin) {
      console.error("[CHECKIN_SERVICE] ❌ Check-in introuvable:", checkinError);
      return {
        data: null,
        error: checkinError || "Check-in introuvable",
      };
    }

    if (existingCheckin.status !== "draft") {
      console.warn(
        "[CHECKIN_SERVICE] ⚠️ Le check-in n'est pas en statut 'draft':",
        existingCheckin.status
      );
      return {
        data: null,
        error: `Impossible de finaliser un état des lieux qui n'est pas en statut 'draft' (statut actuel: ${existingCheckin.status})`,
      };
    }

    // ============================================================================
    // ÉTAPE 2 : Sauvegarder Step 7 (signatures + validatedAt)
    // ============================================================================
    console.log("[CHECKIN_SERVICE] 📝 Étape 2 : Sauvegarde Step 7...");

    try {
      await saveStep7Draft({
        bookingId: params.bookingId,
        ownerId: params.ownerId,
        renterId: params.renterId,
        checkinId: params.checkinId,
        step7: params.step7Payload,
      });
      console.log("[CHECKIN_SERVICE] ✅ Step 7 sauvegardée avec succès");
    } catch (step7Error: any) {
      console.error("[CHECKIN_SERVICE] ❌ Erreur sauvegarde Step 7:", step7Error);
      return {
        data: null,
        error: `Erreur lors de la sauvegarde de l'étape 7 : ${step7Error.message || step7Error}`,
      };
    }

    // ============================================================================
    // ÉTAPE 3 : Créer le snapshot légal
    // ============================================================================
    console.log("[CHECKIN_SERVICE] 📸 Étape 3 : Création du snapshot légal...");

    const snapshotResult = await SupabaseCheckinService.createLegalSnapshot(params.checkinId, {
      version: "1.0",
      force: false, // Ne pas écraser si snapshot existe déjà
    });

    if (snapshotResult.error || !snapshotResult.data) {
      console.error("[CHECKIN_SERVICE] ❌ Erreur création snapshot:", snapshotResult.error);
      return {
        data: null,
        error: `Erreur lors de la création du snapshot légal : ${snapshotResult.error || "Erreur inconnue"}`,
      };
    }

    if (!snapshotResult.snapshotCreated) {
      console.warn("[CHECKIN_SERVICE] ⚠️ Snapshot déjà existant (force=false)");
      // On continue quand même, le snapshot existe déjà
    } else {
      console.log("[CHECKIN_SERVICE] ✅ Snapshot légal créé avec succès");
    }

    // ============================================================================
    // ÉTAPE 4 : Changer le statut vers "completed"
    // ============================================================================
    console.log("[CHECKIN_SERVICE] 🔒 Étape 4 : Changement de statut vers 'completed'...");

    const { data: finalizedCheckin, error: statusError } = await SupabaseCheckinService.updateCheckinStatus(
      params.checkinId,
      "completed"
    );

    if (statusError || !finalizedCheckin) {
      console.error("[CHECKIN_SERVICE] ❌ Erreur changement de statut:", statusError);
      return {
        data: null,
        error: `Erreur lors du changement de statut : ${statusError || "Erreur inconnue"}`,
      };
    }

    console.log("[CHECKIN_SERVICE] ✅ Statut mis à jour:", {
      checkinId: params.checkinId,
      status: finalizedCheckin.status,
    });

    // ============================================================================
    // ÉTAPE 4.5 : Appel webhook n8n pour envoi email EDL (non-bloquant)
    // ============================================================================
    if (finalizedCheckin.status === "completed") {
      const n8nWebhookUrl = 
        (typeof import.meta !== "undefined" && import.meta.env?.VITE_N8N_WEBHOOK_CHECKIN_DEPART_URL) ||
        "https://n8n.srv1285649.hstgr.cloud/webhook/checkin-depart-updated";

      console.log("[CHECKIN_SERVICE] 📧 Appel webhook n8n pour envoi email EDL...");

      try {
        const n8nPayload = {
          event: "checkin_depart_completed",
          checkinId: params.checkinId,
          bookingId: params.bookingId,
          timestamp: new Date().toISOString(),
        };

        // Timeout de 8 secondes pour éviter de bloquer le front
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 8000);

        const n8nResponse = await fetch(n8nWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(n8nPayload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!n8nResponse.ok) {
          console.warn("[CHECKIN_SERVICE] ⚠️ Webhook n8n erreur:", {
            status: n8nResponse.status,
            statusText: n8nResponse.statusText,
          });
        } else {
          console.log("[CHECKIN_SERVICE] ✅ Webhook n8n appelé avec succès");
        }
      } catch (n8nError: any) {
        // Ne pas bloquer la finalisation si le webhook échoue
        const isTimeout = n8nError?.name === "AbortError" || 
                          n8nError?.code === "ETIMEDOUT" ||
                          n8nError?.message?.toLowerCase().includes("timeout");

        console.warn("[CHECKIN_SERVICE] ⚠️ Erreur appel webhook n8n (non-bloquant):", {
          message: n8nError?.message,
          isTimeout,
        });
      }
    }

    // ⭐ Instrumentation : Log pour tracer les déclenchements email (DIAG 6 emails)
    const correlationId = `${params.checkinId}_${Date.now()}`;
    console.log(`[CHECKIN_SERVICE] 📧 Email trigger correlationId=${correlationId}`, {
      checkinId: params.checkinId,
      bookingId: params.bookingId,
      status: finalizedCheckin.status,
      timestamp: new Date().toISOString(),
      caller: new Error().stack?.split('\n').slice(1, 4).map(l => l.trim()).join(' | '),
    });

    // ============================================================================
    // ÉTAPE 5 : Générer le PDF d'état des lieux (non-bloquant)
    // ============================================================================
    console.log("[CHECKIN_SERVICE] 📄 Étape 5 : Génération du PDF...");

    // ⚠️ IMPORTANT : La génération PDF est NON-BLOQUANTE
    // Si le PDF échoue, la finalisation reste réussie (status = "completed")
    // Le legal_pdf_url pourra rester NULL et on pourra régénérer le PDF plus tard
    // ⭐ Phase 2 : Variable pour capturer les erreurs PDF et les remonter au front
    let pdfError: string | null = null;

    try {
      // ⚠️ Import dynamique pour éviter de charger le module (et html2canvas/jsPDF) au chargement
      console.log("[CHECKIN_SERVICE] 📄 Import dynamique du service PDF...");
      const { generateCheckinDepartPdf } = await import("./checkinDepartPdfService");
      console.log("[CHECKIN_SERVICE] 📄 Import dynamique OK, fonction disponible:", typeof generateCheckinDepartPdf);
      
      console.log("[CHECKIN_SERVICE] 📄 Appel à generateCheckinDepartPdf avec skipStatusCheck: true");
      const pdfResult = await generateCheckinDepartPdf(params.checkinId, {
        skipStatusCheck: true, // Bypasser la vérification de status car on vient de le changer
      });
      
      console.log("[CHECKIN_SERVICE] 📄 Résultat génération PDF:", {
        checkinId: params.checkinId,
        hasError: !!pdfResult.error,
        hasPublicUrl: !!pdfResult.publicUrl,
        pdfStoragePath: pdfResult.pdfStoragePath,
        error: pdfResult.error,
      });
      
      // 🔍 LOG DE DEBUG TRÈS VISIBLE
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🔍 [DEBUG PHASE 2] ANALYSE pdfResult:");
      console.log("🔍 [DEBUG PHASE 2] pdfResult.error:", pdfResult.error);
      console.log("🔍 [DEBUG PHASE 2] pdfResult.publicUrl:", pdfResult.publicUrl);
      console.log("🔍 [DEBUG PHASE 2] pdfResult.pdfStoragePath:", pdfResult.pdfStoragePath);
      console.log("🔍 [DEBUG PHASE 2] pdfResult.error existe?", 'error' in pdfResult);
      console.log("🔍 [DEBUG PHASE 2] pdfResult.error est truthy?", !!pdfResult.error);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

      if (pdfResult.error) {
        // ⭐ Phase 2 : Stocker l'erreur PDF pour la remonter au front
        pdfError = pdfResult.error;
        console.error("[CHECKIN_SERVICE] ❌ Erreur génération PDF:", {
          checkinId: params.checkinId,
          error: pdfResult.error,
        });
        console.error("[CHECKIN_SERVICE] ❌ PDF non généré, mais finalisation réussie");
        console.error("[CHECKIN_SERVICE] ❌ legal_pdf_url restera NULL (peut être régénéré plus tard)");
      } else if (pdfResult.publicUrl) {
        // ✅ PDF généré avec succès
        // Note : generateCheckinDepartPdf met déjà à jour legal_pdf_url en interne
        console.log("[CHECKIN_SERVICE] ✅ PDF généré avec succès:", {
          checkinId: params.checkinId,
          publicUrl: pdfResult.publicUrl,
          pdfStoragePath: pdfResult.pdfStoragePath,
        });
        
        // Recharger le checkin pour obtenir la version avec legal_pdf_url mis à jour
        const { data: refreshedCheckin } = await SupabaseCheckinService.getCheckinById(params.checkinId);
        if (refreshedCheckin) {
          Object.assign(finalizedCheckin, refreshedCheckin);
          console.log("[CHECKIN_SERVICE] ✅ Checkin rechargé avec legal_pdf_url:", refreshedCheckin.legal_pdf_url);
        }
      } else {
        // ⭐ Phase 2 : Cas où le PDF est généré mais l'URL publique est absente
        pdfError = "PDF généré mais URL publique absente";
        console.error("[CHECKIN_SERVICE] ❌ PDF généré mais URL publique absente", {
          checkinId: params.checkinId,
          pdfResult,
        });
      }
    } catch (pdfException: any) {
      // ⭐ Phase 2 : Stocker l'exception PDF pour la remonter au front
      pdfError = pdfException?.message || String(pdfException);
      console.error("[CHECKIN_SERVICE] ❌ Exception génération PDF:", {
        checkinId: params.checkinId,
        error: pdfException,
        errorMessage: pdfException?.message || String(pdfException),
        errorStack: pdfException?.stack,
      });
      // Ne pas bloquer la finalisation
      console.error("[CHECKIN_SERVICE] ❌ Exception PDF, mais finalisation réussie");
      console.error("[CHECKIN_SERVICE] ❌ legal_pdf_url restera NULL (peut être régénéré plus tard)");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[CHECKIN_SERVICE] ✅ État des lieux finalisé avec succès !");
    console.log("[CHECKIN_SERVICE] 📦 Checkin ID:", finalizedCheckin.id);
    console.log("[CHECKIN_SERVICE] 📊 Status:", finalizedCheckin.status);
    console.log("[CHECKIN_SERVICE] 📄 PDF URL:", finalizedCheckin.legal_pdf_url || "NULL (non généré)");
    // ⭐ Phase 2 : Logger l'état du PDF pour faciliter le debugging
    if (pdfError) {
      console.error("[CHECKIN_SERVICE] ⚠️ PDF non généré - Erreur:", pdfError);
    } else {
      console.log("[CHECKIN_SERVICE] ✅ PDF généré avec succès");
    }
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // ⭐ Phase 2 : Retourner pdfError pour informer le front
    // 🔍 LOG DE DEBUG TRÈS VISIBLE
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🔍 [DEBUG PHASE 2] VALEUR DE pdfError AVANT RETOUR:", pdfError);
    console.log("🔍 [DEBUG PHASE 2] Type de pdfError:", typeof pdfError);
    console.log("🔍 [DEBUG PHASE 2] legal_pdf_url dans finalizedCheckin:", finalizedCheckin.legal_pdf_url);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const returnValue = {
      data: finalizedCheckin,
      error: null,
      pdfError: pdfError || null,
    };
    
    console.log("🔍 [DEBUG PHASE 2] VALEUR RETOURNÉE:", JSON.stringify(returnValue, null, 2));
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    return returnValue;
  } catch (error: any) {
    console.error("[CHECKIN_SERVICE] ❌ Exception non gérée:", error);
    return {
      data: null,
      error: `Erreur inattendue : ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================================================
// ⭐ SAUVEGARDE MOTO - ÉTAPE 3 (Extérieur Moto)
// ============================================================================

import type { Step3MotoData } from '@/modules/etatDesLieuxDepartMoto/types/step3Moto';

/**
 * Arguments pour sauvegarder un brouillon d'étape 3 moto
 */
interface SaveStep3DraftMotoArgs {
  bookingId: string;
  ownerId: string | null;
  renterId: string | null;
  checkinId?: string | null;
  step3: Step3MotoData;
}

/**
 * ⭐ SAUVEGARDE DE L'ÉTAPE 3 MOTO (Extérieur Moto)
 * 
 * ✅ Appel DIRECT à Supabase (même pattern que Step3 voiture)
 * ⚠️ IMPORTANT : Force step4 = null pour cohérence DB moto
 * 
 * Mapping photos :
 * - zones extérieures (avant, cote_droit, arriere, cote_gauche) → photos_exterieur
 * - jantes → photos_jantes
 * 
 * @returns SaveDraftResponse ou throw Error
 */
export async function saveStep3DraftMoto({
  bookingId,
  ownerId,
  renterId,
  checkinId,
  step3,
}: SaveStep3DraftMotoArgs): Promise<SaveDraftResponse> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[CHECKIN_SERVICE] 🏍️ Sauvegarde Étape 3 MOTO (DIRECT Supabase)");
  console.log("[CHECKIN_SERVICE] 📊 Context:", {
    bookingId,
    hasCheckinId: !!checkinId,
    action: checkinId ? "UPDATE" : "INSERT",
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Adapter la structure moto pour compatibilité avec l'extraction automatique du service
  // Le service attend : zonesPhotos.avant, zonesPhotos.droit, zonesPhotos.gauche, zonesPhotos.arriere
  // Moto utilise : zonesPhotos.avant, zonesPhotos.cote_droit, zonesPhotos.cote_gauche, zonesPhotos.arriere
  const adaptedZonesPhotos: any = {};
  
  // Mapper les zones moto vers le format attendu par le service
  if (step3.zonesPhotos) {
    if (step3.zonesPhotos.avant) adaptedZonesPhotos.avant = step3.zonesPhotos.avant;
    if (step3.zonesPhotos.cote_droit) adaptedZonesPhotos.droit = step3.zonesPhotos.cote_droit;
    if (step3.zonesPhotos.arriere) adaptedZonesPhotos.arriere = step3.zonesPhotos.arriere;
    if (step3.zonesPhotos.cote_gauche) adaptedZonesPhotos.gauche = step3.zonesPhotos.cote_gauche;
    
    // Jantes : le service attend janteAvDroit, janteArDroit, janteAvGauche, janteArGauche
    // Pour moto, on a juste "jantes" - on peut les répartir ou les mettre dans une seule clé
    // Pour l'instant, on les met dans janteAvDroit (le service les agrègera dans photos_jantes)
    if (step3.zonesPhotos.jantes) {
      adaptedZonesPhotos.janteAvDroit = step3.zonesPhotos.jantes;
    }
  }

  // Construire le step3 adapté
  const adaptedStep3 = {
    ...step3,
    zonesPhotos: adaptedZonesPhotos,
  };

  // ✅ Appel DIRECT à Supabase avec step4 = null (cohérence DB moto)
  // Le service extraira automatiquement les photos depuis zonesPhotos
  const { data, error } = await SupabaseCheckinService.saveCheckinDraft({
    checkin_id: checkinId || null,
    booking_id: bookingId,
    owner_id: ownerId || null,
    renter_id: renterId || null,
    status: "draft",
    data: {
      step3: adaptedStep3,  // Structure adaptée pour extraction automatique
      step4: null,  // ⚠️ IMPORTANT : Step 4 toujours null pour moto
    },
  });

  // Gestion d'erreur
  if (error) {
    console.error("[CHECKIN_SERVICE] ❌ Erreur Step3 Moto:", error);
    throw new Error(error);
  }

  // Succès
  if (!data || !data.id) {
    console.error("[CHECKIN_SERVICE] ❌ Réponse invalide (pas d'ID):", data);
    throw new Error("Réponse Supabase invalide : ID manquant");
  }

  console.log("[CHECKIN_SERVICE] ✅ Sauvegarde Step3 Moto réussie:", {
    checkinId: data.id,
    status: data.status,
    dataKeys: Object.keys(data.data || {}),
  });

  return {
    checkinId: data.id,
    status: data.status || "draft",
    data: data.data,
    raw: data,
  };
}

// ============================================================================
// ⭐ SAUVEGARDE MOTO - ÉTAPE 5 (Accessoires Moto)
// ============================================================================

interface Step5MotoData {
  completedAt?: string;
  accessories: Record<string, boolean>;
  photos: Array<{ url: string; storagePath: string }>;
  notes?: string;
}

/**
 * Arguments pour sauvegarder un brouillon d'étape 5 moto
 */
interface SaveStep5DraftMotoArgs {
  bookingId: string;
  ownerId: string | null;
  renterId: string | null;
  checkinId?: string | null;
  step5: Step5MotoData;
}

/**
 * ⭐ SAUVEGARDE DE L'ÉTAPE 5 MOTO (Accessoires Moto)
 * 
 * ✅ Appel DIRECT à Supabase (même pattern que Step5 voiture)
 * ⚠️ IMPORTANT : Force step4 = null pour cohérence DB moto
 * 
 * Mapping photos :
 * - accessoires → photos_accessoires
 * 
 * @returns SaveDraftResponse ou throw Error
 */
export async function saveStep5DraftMoto({
  bookingId,
  ownerId,
  renterId,
  checkinId,
  step5,
}: SaveStep5DraftMotoArgs): Promise<SaveDraftResponse> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[CHECKIN_SERVICE] 🏍️ Sauvegarde Étape 5 MOTO (DIRECT Supabase)");
  console.log("[CHECKIN_SERVICE] 📊 Context:", {
    bookingId,
    hasCheckinId: !!checkinId,
    action: checkinId ? "UPDATE" : "INSERT",
  });
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Le service n'extrait pas automatiquement photos_accessoires depuis step5
  // Il faut les ajouter dans data.step5.photos pour qu'elles soient persistées
  // Pour l'extraction vers la colonne SQL, on devra peut-être adapter le service plus tard
  // Pour l'instant, on les garde dans data.step5.photos
  
  // ✅ Appel DIRECT à Supabase avec step4 = null (cohérence DB moto)
  const { data, error } = await SupabaseCheckinService.saveCheckinDraft({
    checkin_id: checkinId || null,
    booking_id: bookingId,
    owner_id: ownerId || null,
    renter_id: renterId || null,
    status: "draft",
    data: {
      step5: {
        completedAt: step5.completedAt,
        accessories: step5.accessories,
        photos: step5.photos,  // Photos conservées dans data.step5
        notes: step5.notes,
      },
      step4: null,  // ⚠️ IMPORTANT : Step 4 toujours null pour moto
    },
  });

  // Gestion d'erreur
  if (error) {
    console.error("[CHECKIN_SERVICE] ❌ Erreur Step5 Moto:", error);
    throw new Error(error);
  }

  // Succès
  if (!data || !data.id) {
    console.error("[CHECKIN_SERVICE] ❌ Réponse invalide (pas d'ID):", data);
    throw new Error("Réponse Supabase invalide : ID manquant");
  }

  console.log("[CHECKIN_SERVICE] ✅ Sauvegarde Step5 Moto réussie:", {
    checkinId: data.id,
    status: data.status,
    dataKeys: Object.keys(data.data || {}),
  });

  return {
    checkinId: data.id,
    status: data.status || "draft",
    data: data.data,
    raw: data,
  };
}

