"use client";

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Import des sous-sections
import Section1Identification from "./sections/Section1Identification";
import Section2Releves from "./sections/Section2Releves";
import ExteriorInspectionAccordionSimple from "@/components/ExteriorInspectionAccordionSimple";
import Section4Interieur from "./sections/Section4Interieur";
import Section5Accessoires from "./sections/Section5Accessoires";
import Section6Remarques from "./sections/Section6Remarques";
import Section8Validation from "./sections/Section8Validation";
import { SupabaseCheckinService } from "@/services/supabaseCheckinService";

// Import du schema pour l'inspection extérieure
import { inspectionExterieureSchema } from "./schemas/inspectionExterieureSchema";

// === Validation globale Zod ===
const FormSchema = z.object({
  bookingId: z.string(),
  conducteur: z.object({
    nom: z.string().min(1, "Le nom est requis"),
    prenom: z.string().min(1, "Le prénom est requis"),
    numeroPermis: z.string().min(5, "Le numéro de permis doit contenir au moins 5 caractères"),
    paysEmission: z.string().min(1, "Le pays d'émission est requis"),
    dateDelivrance: z.string().min(1, "La date de délivrance est requise"),
    dateExpiration: z.string().min(1, "La date d'expiration est requise"),
    categoriePermis: z.string().min(1, "La catégorie de permis est requise"),
    photoPermisRecto: z.string().nullable().optional(),
    photoPermisVerso: z.string().nullable().optional(),
    driver_license_photos_recto: z.string().nullable().optional(),
    driver_license_photos_verso: z.string().nullable().optional(),
  }),
  driver: z.object({
    nom: z.string().optional(),
    prenom: z.string().optional(),
    permis: z.string().optional(),
    permisDelivreLe: z.string().optional(),
    permisExpireLe: z.string().optional(),
    pays: z.string().optional(),
    categorie: z.string().optional(),
    email: z.string().optional(),
    telephone: z.string().optional(),
  }).optional(),
  owner: z.object({
    nom: z.string().optional(),
    prenom: z.string().optional(),
    email: z.string().optional(),
    telephone: z.string().optional(),
  }).optional(),
  reservation: z.object({
    referenceNumber: z.number().nullable().optional(),
    departureDate: z.string().optional(),
    departureTime: z.string().optional(),
    returnDate: z.string().optional(),
    returnTime: z.string().optional(),
    departureLocation: z.string().nullable().optional(),
    returnLocation: z.string().nullable().optional(),
  }).optional(),
  vehicule: z.object({
    marque: z.string().min(1, "La marque est requise"),
    modele: z.string().min(1, "Le modèle est requis"),
    immatriculation: z.string().min(1, "L'immatriculation est requise"),
  }),
  releves: z.object({
    kilometrage: z.number().min(0, "Le kilométrage doit être positif").optional(),
    niveauCarburant: z
      .number()
      .min(0)
      .max(100)
      .optional(),
    photosTableauBord: z.array(z.string()).optional(),
    photos: z.array(z.string()).optional(),
    dashboardPhotos: z.array(z.any()).optional(),
  }),
  // Ancien schema exterieur (conservé pour compatibilité avec les données existantes si nécessaire)
  exterieur: z.object({
    rayuresBosses: z.boolean().optional(),
    photosRayuresBosses: z.array(z.string()).optional(),
    pareChocsAvant: z.enum(["OK", "Abîmé"]).optional(),
    photosPareChocsAvant: z.array(z.string()).optional(),
    pareChocsArriere: z.enum(["OK", "Abîmé"]).optional(),
    photosPareChocsArriere: z.array(z.string()).optional(),
    phares: z.enum(["OK", "Cassé", "Abrîmé"]).optional(),
    photosPhares: z.array(z.string()).optional(),
    pareBrise: z.enum(["OK", "Fêlé", "Cassé"]).optional(),
    photosPareBrise: z.array(z.string()).optional(),
    rouesPneus: z.enum(["OK", "Usé", "Abîmé"]).optional(),
    photosRouesPneus: z.array(z.string()).optional(),
    photosGlobales: z.array(z.string()).optional(),
    photosJantes: z.array(z.string()).optional(),
    photosCoffre: z.array(z.string()).optional(),
    photosAccessoires: z.array(z.string()).optional(),
  }).optional(),
  // Nouveau schema pour l'inspection extérieure structurée par zone
  inspection_exterieure: inspectionExterieureSchema.optional(),
  interieur: z.object({
    proprete: z.enum(["Excellent", "Bon", "Moyen", "Sale"]).optional(),
    sieges: z.enum(["OK", "Abîmés"]).optional(),
    tableauBord: z.enum(["OK", "Abîmé"]).optional(),
    radioGPS: z.enum(["Fonctionnel", "Non fonctionnel"]).optional(),
    climatisation: z.enum(["OK", "Non fonctionnelle"]).optional(),
    photosInterieur: z.array(z.string()).optional(),
    photosHabitacle: z.array(z.string()).optional(),
  }).optional(),
  accessoires: z.object({
    gilet: z.boolean().optional(),
    triangle: z.boolean().optional(),
    roueSecours: z.boolean().optional(),
    cric: z.boolean().optional(),
    cle: z.boolean().optional(),
    cable: z.boolean().optional(),
    manuel: z.boolean().optional(),
    carteCarburant: z.boolean().optional(),
    commentaire: z.string().optional(),
  }).optional(),
  exteriorInspection: z.object({
    propreteExterieure: z.object({
      photos: z.array(z.any()).optional(),
      level: z.enum(["Excellent", "Bon", "Moyen", "Sale"]).optional(),
      notes: z.string().optional(),
    }).optional(),
    coffreEquipements: z.object({
      triangle: z.boolean().optional(),
      gilet: z.boolean().optional(),
      roueSecours: z.boolean().optional(),
      kitAntiCrevaison: z.boolean().optional(),
    }).optional(),
    zonesHasDamage: z.object({
      avant: z.boolean().optional(),
      droit: z.boolean().optional(),
      arriere: z.boolean().optional(),
      gauche: z.boolean().optional(),
      janteAvDroit: z.boolean().optional(),
      janteArDroit: z.boolean().optional(),
      janteAvGauche: z.boolean().optional(),
      janteArGauche: z.boolean().optional(),
    }).optional(),
    zonesPhotos: z.object({
      avant: z.array(z.any()).optional(),
      droit: z.array(z.any()).optional(),
      arriere: z.array(z.any()).optional(),
      gauche: z.array(z.any()).optional(),
      coffre: z.array(z.any()).optional(),
      janteAvDroit: z.array(z.any()).optional(),
      janteArDroit: z.array(z.any()).optional(),
      janteAvGauche: z.array(z.any()).optional(),
      janteArGauche: z.array(z.any()).optional(),
    }).optional(),
  }).optional(),
  interiorInspection: z.object({
    propreteGenerale: z.object({
      photos: z.array(z.any()).optional(),
      level: z.enum(["Excellent", "Bon", "Moyen", "Sale"]).optional(),
      notes: z.string().optional(),
    }).optional(),
    sieges: z.object({
      photos: z.array(z.any()).optional(),
      hasDamage: z.boolean().optional(),
      damages: z.array(z.string()).optional(),
      notes: z.string().optional(),
    }).optional(),
    equipements: z.object({
      radioOk: z.boolean().optional(),
      acOk: z.boolean().optional(),
      centralLockOk: z.boolean().optional(),
      windowsOk: z.boolean().optional(),
    }).optional(),
  }).optional(),
  remarques: z.object({
    observations: z.string().optional(),
  }).optional(),
  signatures: z.object({
    signatureProprietaire: z.string().optional(),
    signatureLocataire: z.string().optional(),
  }).optional(),
  ownerSignature: z.string().optional(),
  driverSignature: z.string().optional(),
  damageReports: z.array(z.object({
    side: z.enum([
      "avant", 
      "droit", 
      "arriere",  // ✅ SANS accent pour cohérence avec groupedDamages
      "gauche", 
      "coffre",
      "janteAvDroit",
      "janteArDroit", 
      "janteAvGauche",
      "janteArGauche"
    ]).optional(),
    typeDegats: z.array(z.string()).optional(),
    commentaire: z.string().optional(),
    photos: z.array(z.any()).optional(),
  })).optional(),
});

type FormData = z.infer<typeof FormSchema>;

const steps = [
  { id: 1, label: "Identification" },
  { id: 2, label: "Relevés" },
  { id: 3, label: "Extérieur & Coffre" },
  { id: 4, label: "Intérieur" },
  { id: 5, label: "Accessoires & Équipements" },
  { id: 6, label: "Remarques & Observations" },
  { id: 7, label: "Validation & Signature" },
];

interface EtatDesLieuxDepartFormProps {
  bookingId?: string;
  bookingReferenceNumber?: number | null;  // ⭐ NOUVEAU : pour naming des fichiers
}

// Fonction pour mapper le nom du pays vers le code pays utilisé dans le formulaire
function mapCountryNameToCode(countryName: string | null | undefined): string {
  if (!countryName) return "";
  
  const countryMap: Record<string, string> = {
    "France": "FR",
    "Belgique": "BE",
    "Suisse": "CH",
    "Allemagne": "DE",
    "Italie": "IT",
    "Espagne": "ES",
    "Portugal": "PT",
    "Royaume-Uni": "GB",
    "La Réunion": "FR",
    "Madagascar": "MG",
    "Guadeloupe": "FR",
    "Martinique": "FR",
    "Guyane": "FR",
  };
  
  return countryMap[countryName] || countryName;
}

// Fonctions de formatage pour les dates et heures de réservation
function formatDate(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return "";
  try {
    return new Date(isoDateTime).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    console.error("Erreur formatage date:", error);
    return "";
  }
}

function formatTime(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) return "";
  try {
    return new Date(isoDateTime).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Erreur formatage heure:", error);
    return "";
  }
}


export default function EtatDesLieuxDepartForm({ 
  bookingId: bookingIdProp,
  bookingReferenceNumber: bookingReferenceNumberProp  // ⭐ NOUVEAU
}: EtatDesLieuxDepartFormProps) {
  const { toast } = useToast();
  const params = useParams();
  const bookingId = bookingIdProp || (params?.bookingId as string | undefined);
  
  const [loadingProfile, setLoadingProfile] = useState(true);
  // Garder ownerId et renterId pour le submit final
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [renterId, setRenterId] = useState<string | null>(null);
  // ⭐ NOUVEAU : Numéro de réservation pour naming des fichiers
  const [bookingReferenceNumber, setBookingReferenceNumber] = useState<number | null>(
    bookingReferenceNumberProp ?? null
  );
  // ⭐ NOUVEAU : ID du check-in pour auto-save progressif
  const [checkinId, setCheckinId] = useState<string | null>(null);
  // ⭐ Statut du check-in (pour verrouillage UI)
  const [checkinStatus, setCheckinStatus] = useState<string | null>(null);
  // ⭐ Mise en avant des steps invalides (piloté par Section8 Validation)
  const [invalidSteps, setInvalidSteps] = useState<Set<number>>(new Set());
  // Navigation automatique vers le champ manquant
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);
  const [missingFieldsSet, setMissingFieldsSet] = useState<Set<string>>(new Set());
  const [missingFieldsList, setMissingFieldsList] = useState<string[]>([]);
  
  // ⭐ États pour la modal de reprise de draft
  type CheckinDepartDraft = {
    id: string;
    booking_id: string;
    status: string;
    data: any;
    photo_permis_recto: string | null;
    photo_permis_verso: string | null;
    photos_dashboard: any[] | null;
    photos_exterieur: any[] | null;
    photos_jantes: any[] | null;
    photos_coffre: any[] | null;
    degats: any[] | null;
    kilometrage_depart: number | null;
    niveau_carburant: number | null;
    created_at: string;
    updated_at: string;
  };
  
  const [existingDraft, setExistingDraft] = useState<CheckinDepartDraft | null>(null);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  
  // pour éviter le crash UI trop violent
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const methods = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    mode: "onChange",
    defaultValues: {
      bookingId: bookingId || "",
      conducteur: {
        nom: "",
        prenom: "",
        numeroPermis: "",
        paysEmission: "",
        dateDelivrance: "",
        dateExpiration: "",
        categoriePermis: "B",
        photoPermisRecto: null,
        photoPermisVerso: null,
        driver_license_photos_recto: null,
        driver_license_photos_verso: null,
      },
      vehicule: { 
        marque: "", 
        modele: "", 
        immatriculation: "" 
      },
      releves: {
        kilometrage: undefined,
        niveauCarburant: 0,
        photosTableauBord: [],
        photos: [],
        dashboardPhotos: [],
      },
      exterieur: {
        rayuresBosses: false,
        photosRayuresBosses: [],
        pareChocsAvant: undefined,
        photosPareChocsAvant: [],
        pareChocsArriere: undefined,
        photosPareChocsArriere: [],
        phares: undefined,
        photosPhares: [],
        pareBrise: undefined,
        photosPareBrise: [],
        rouesPneus: undefined,
        photosRouesPneus: [],
        photosGlobales: [],
        photosJantes: [],
        photosCoffre: [],
        photosAccessoires: [],
      },
      inspection_exterieure: {
        avant: {
          photo_zone: [],
          degat_present: null,
          degat_description: undefined,
          degat_photos: undefined,
        },
        cote_droit: {
          photo_zone: [],
          degat_present: null,
          degat_description: undefined,
          degat_photos: undefined,
          jante_av_droite: undefined,
          jante_ar_droite: undefined,
        },
        arriere: {
          photo_zone: [],
          degat_present: null,
          degat_description: undefined,
          degat_photos: undefined,
        },
        coffre: {
          photo_coffre_ouvert: [],
          gilet_triangle_present: null,
          roue_secours: null,
          cable_recharge_present: null,
          photos_accessoires: undefined,
        },
        cote_gauche: {
          photo_zone: [],
          degat_present: null,
          degat_description: undefined,
          degat_photos: undefined,
          jante_av_gauche: undefined,
          jante_ar_gauche: undefined,
        },
      },
      interieur: {
        proprete: undefined,
        sieges: undefined,
        tableauBord: undefined,
        radioGPS: undefined,
        climatisation: undefined,
        photosInterieur: [],
        photosHabitacle: [],
      },
      accessoires: {
        gilet: false,
        triangle: false,
        roueSecours: false,
        cric: false,
        cle: false,
        cable: false,
        manuel: false,
        carteCarburant: false,
        commentaire: "",
      },
      exteriorInspection: {
        propreteExterieure: {
          photos: [],
          level: undefined,
          notes: "",
        },
        coffreEquipements: {
          triangle: false,
          gilet: false,
          roueSecours: false,
          kitAntiCrevaison: false,
        },
        zonesHasDamage: {
          avant: false,
          droit: false,
          arriere: false,
          gauche: false,
          janteAvDroit: false,
          janteArDroit: false,
          janteAvGauche: false,
          janteArGauche: false,
        },
        zonesPhotos: {
          avant: [],
          droit: [],
          arriere: [],
          gauche: [],
          coffre: [],
          janteAvDroit: [],
          janteArDroit: [],
          janteAvGauche: [],
          janteArGauche: [],
        },
      },
      interiorInspection: {
        propreteGenerale: {
          photos: [],
          level: undefined,
          notes: "",
        },
        sieges: {
          photos: [],
          hasDamage: false,
          damages: [],
          notes: "",
        },
        equipements: {
          radioOk: true,
          acOk: true,
          centralLockOk: true,
          windowsOk: true,
        },
      },
      remarques: {
        observations: "",
      },
      signatures: {
        signatureProprietaire: "",
        signatureLocataire: "",
      },
      driver: {
        nom: "",
        prenom: "",
        permis: "",
        permisDelivreLe: "",
        permisExpireLe: "",
        pays: "",
        categorie: "",
        email: "",
        telephone: "",
      },
      owner: {
        nom: "",
        prenom: "",
        email: "",
        telephone: "",
      },
      reservation: {
        referenceNumber: null,
        departureDate: "",
        departureTime: "",
        returnDate: "",
        returnTime: "",
        departureLocation: null,
        returnLocation: null,
      },
      ownerSignature: "",
      driverSignature: "",
      damageReports: [],
    },
  });

  const [currentStep, setCurrentStep] = useState(1);
  const progressPercentage = (currentStep / steps.length) * 100;
  const { reset } = methods;

  // Réinitialiser le bookingId dans le formulaire si il change
  useEffect(() => {
    methods.setValue("bookingId", bookingId);
  }, [bookingId, methods]);

  // Charger la booking et pré-remplir le profil du conducteur
  useEffect(() => {
    async function loadBookingProfileAndVehicle() {
      if (!bookingId) {
        console.error("[checkin] Pas de bookingId dans l'URL");
        setLoadError("Aucun bookingId");
        setLoadingInit(false);
        setLoadingProfile(false);
        return;
      }

      setLoadingInit(true);
      setLoadingProfile(true);
      setLoadError(null);

      try {
        //
        // 1️⃣ Récupérer la réservation avec les dates de départ et retour.
        //
        // booking.user_id  = locataire / conducteur
        // booking.vehicle_id = véhicule loué
        // booking.start_date = date/heure de départ
        // booking.end_date = date/heure de retour prévue
        // booking.reference_number = numéro lisible de réservation (1, 2, 3...)
        //
        const { data: booking, error: bookingError } = await supabase
          .from("bookings")
          .select("id, user_id, vehicle_id, start_date, end_date, reference_number, pickup_location")
          .eq("id", bookingId)
          .single();

        if (bookingError || !booking) {
          console.error("[checkin] Erreur récupération booking:", {
            bookingError,
            bookingId,
          });
          setLoadError("Erreur booking");
          setLoadingInit(false);
          setLoadingProfile(false);
          return;
        }

        console.log("[checkin] Booking chargée:", booking);

        // Récupérer le locataire et le propriétaire à partir de la booking
        const renter_id_resolved = booking.user_id || null;
        setRenterId(renter_id_resolved);

        //
        // 1️⃣bis Mapper les dates de réservation
        //
        const bookingData = booking as any;
        const reservationPatch = {
          referenceNumber: bookingData.reference_number ?? null,
          departureDate: formatDate(bookingData.start_date),
          departureTime: formatTime(bookingData.start_date),
          returnDate: formatDate(bookingData.end_date),
          returnTime: formatTime(bookingData.end_date),
          departureLocation: bookingData.pickup_location ?? null,
          returnLocation: bookingData.pickup_location ?? null, // Pour l'instant = departureLocation
        };

        console.log("[checkin] Dates de réservation:", reservationPatch);

        // ⭐ NOUVEAU : Mettre à jour le reference_number si pas encore défini
        if (bookingData.reference_number != null && !bookingReferenceNumber) {
          console.log("[checkin] 🔢 Mise à jour reference_number:", bookingData.reference_number);
          setBookingReferenceNumber(bookingData.reference_number);
        }

        if (!renter_id_resolved) {
          console.warn("[checkin] Pas de renter_id sur la réservation, pas de pré-remplissage conducteur.");
          setLoadingInit(false);
          setLoadingProfile(false);
          return;
        }

        //
        // 2️⃣ Récupérer le véhicule séparément via vehicle_id
        //
        let vehiculePatch: {
          marque: string;
          modele: string;
          immatriculation: string;
        } = {
          marque: "",
          modele: "",
          immatriculation: "",
        };

        let owner_id_resolved: string | null = null;

        if (booking.vehicle_id) {
          const { data: vehicle, error: vehicleError } = await supabase
            .from("vehicles" as any)
            .select("id, brand, model, license_plate, owner_id")
            .eq("id", booking.vehicle_id)
            .single();

          if (vehicleError) {
            console.error("[checkin] Erreur récupération véhicule:", vehicleError);
          } else if (vehicle) {
            console.log("[checkin] Véhicule chargé:", vehicle);

            const vehicleData = vehicle as any;
            vehiculePatch = {
              marque: vehicleData.brand || "",
              modele: vehicleData.model || "",
              immatriculation: vehicleData.license_plate || "",
            };

            // Récupérer owner_id depuis le véhicule
            owner_id_resolved = vehicleData.owner_id || null;
            setOwnerId(owner_id_resolved);
          }
        }

        //
        // 3️⃣ Récupérer le profil conducteur (le renter = booking.user_id)
        //
        let conducteurPatch: any = {};
        let driverPatch: any = {};

        if (booking.user_id) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select(`
              id,
              first_name,
              last_name,
              phone,
              email,
              birthdate,
              place_of_birth,
              address_line1,
              postal_code,
              city,
              country,
              driver_license_number,
              driver_license_country,
              driver_license_issue_date,
              driver_license_expiration_date,
              driver_license_category
            `)
            .eq("id", booking.user_id)
            .single();

          if (profileError || !profile) {
            console.error("[checkin] Erreur récupération profil conducteur:", {
              profileError,
              renter_id: booking.user_id,
            });
          } else {
            console.log("[checkin] Profil conducteur chargé:", profile);

            const profileData = profile as any;
            conducteurPatch = {
              nom: profileData.last_name || "",
              prenom: profileData.first_name || "",
              numeroPermis: profileData.driver_license_number || "",
              paysEmission: mapCountryNameToCode(profileData.driver_license_country),
              dateDelivrance: profileData.driver_license_issue_date || "",
              dateExpiration: profileData.driver_license_expiration_date || "",
              categoriePermis: profileData.driver_license_category || "B",
              photoPermisRecto: null,
              photoPermisVerso: null,
              driver_license_photos_recto: null,
              driver_license_photos_verso: null,
            };

            // Mapper vers le format "driver" utilisé dans la validation
            driverPatch = {
              nom: profileData.last_name || "",
              prenom: profileData.first_name || "",
              email: profileData.email || "",
              telephone: profileData.phone || "",
              permis: profileData.driver_license_number || "",
              permisDelivreLe: profileData.driver_license_issue_date || "",
              permisExpireLe: profileData.driver_license_expiration_date || "",
              pays: mapCountryNameToCode(profileData.driver_license_country),
              categorie: profileData.driver_license_category || "B",
            };
          }
        }

        //
        // 4️⃣ Récupérer le profil propriétaire (via owner_id du véhicule)
        //
        let ownerPatch: any = {};

        if (owner_id_resolved) {
          const { data: ownerProfile, error: ownerError } = await supabase
            .from("profiles")
            .select(`
              id,
              first_name,
              last_name,
              phone,
              email
            `)
            .eq("id", owner_id_resolved)
            .single();

          if (ownerError || !ownerProfile) {
            console.error("[checkin] Erreur récupération profil propriétaire:", {
              ownerError,
              owner_id: owner_id_resolved,
            });
          } else {
            console.log("[checkin] Profil propriétaire chargé:", ownerProfile);

            const ownerData = ownerProfile as any;
            ownerPatch = {
              nom: ownerData.last_name || "",
              prenom: ownerData.first_name || "",
              email: ownerData.email || "",
              telephone: ownerData.phone || "",
            };
          }
        }

        //
        // 5️⃣ Injection dans le formulaire avec form.reset()
        //
        reset((prev) => ({
          ...prev,
          vehicule: {
            ...prev.vehicule,
            ...vehiculePatch,
          },
          conducteur: {
            ...prev.conducteur,
            ...conducteurPatch,
          },
          driver: {
            ...prev.driver,
            ...driverPatch,
          },
          owner: {
            ...prev.owner,
            ...ownerPatch,
          },
          reservation: {
            ...prev.reservation,
            ...reservationPatch,
          },
        }));

        console.log("[checkin] Formulaire hydraté avec véhicule + conducteur + driver + owner + reservation ✅");
        console.log("[checkin] Driver data:", driverPatch);
        console.log("[checkin] Owner data:", ownerPatch);
        console.log("[checkin] Reservation data:", reservationPatch);

        setLoadingInit(false);
        setLoadingProfile(false);
      } catch (error) {
        console.error("[checkin] Erreur lors du chargement:", error);
        setLoadError("Erreur inattendue");
        setLoadingInit(false);
        setLoadingProfile(false);
      }
    }

    loadBookingProfileAndVehicle();
  }, [bookingId, reset]);

  // ============================================================================
  // ⭐ NOUVEAU : Charger le draft existant et hydrater le formulaire
  // ============================================================================

  /**
   * ⭐ Hydrater le formulaire RHF à partir d'un checkin_depart existant
   * 
   * Stratégie :
   * - Colonnes SQL en priorité (source de vérité)
   * - Fallback sur JSON data.stepX si colonne SQL vide
   * - N'écrase que si le draft a une valeur (garde les données de profil sinon)
   */
  const hydrateFormFromCheckin = (checkin: any) => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[CHECKIN_DRAFT] 🔄 Début de l'hydratation du formulaire");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    const step1 = checkin.data?.step1;
    const step2 = checkin.data?.step2;
    const step3 = checkin.data?.step3;

    // ============================================================================
    // STEP 1 : Identification + Photos Permis
    // ============================================================================
    if (step1?.identification) {
      const id = step1.identification;
      
      console.log("[CHECKIN_DRAFT] 📋 Hydratation Step1...");
      
      // Infos conducteur (seulement si présentes dans le draft)
      if (id.nom) {
        methods.setValue("conducteur.nom", id.nom);
      }
      if (id.prenom) {
        methods.setValue("conducteur.prenom", id.prenom);
      }
      if (id.numeroPermis) {
        methods.setValue("conducteur.numeroPermis", id.numeroPermis);
      }
      if (id.paysEmission) {
        methods.setValue("conducteur.paysEmission", id.paysEmission);
      }
      if (id.dateDelivrance) {
        methods.setValue("conducteur.dateDelivrance", id.dateDelivrance);
      }
      if (id.dateExpiration) {
        methods.setValue("conducteur.dateExpiration", id.dateExpiration);
      }
      if (id.categoriePermis) {
        methods.setValue("conducteur.categoriePermis", id.categoriePermis);
      }
      
      // ⭐ PHOTOS PERMIS : Priorité colonne SQL, fallback JSON
      const photoRecto = checkin.photo_permis_recto || id.photoPermisRecto || null;
      const photoVerso = checkin.photo_permis_verso || id.photoPermisVerso || null;
      
      if (photoRecto) {
        methods.setValue("conducteur.driver_license_photos_recto", photoRecto);
        console.log("[CHECKIN_DRAFT] ✅ Photo permis recto chargée");
      }
      
      if (photoVerso) {
        methods.setValue("conducteur.driver_license_photos_verso", photoVerso);
        console.log("[CHECKIN_DRAFT] ✅ Photo permis verso chargée");
      }
      
      console.log("[CHECKIN_DRAFT] ✅ Step1 hydraté");
    }

    // ============================================================================
    // STEP 2 : Relevés + Photos Dashboard
    // ============================================================================
    if (step2?.releves) {
      const rel = step2.releves;
      
      console.log("[CHECKIN_DRAFT] 📋 Hydratation Step2...");
      
      // Kilométrage : Priorité JSON, fallback colonne SQL
      const kilometrage = rel.kilometrage ?? checkin.kilometrage_depart ?? null;
      if (kilometrage != null) {
        methods.setValue("releves.kilometrage", kilometrage);
        console.log("[CHECKIN_DRAFT] ✅ Kilométrage:", kilometrage);
      }
      
      // Niveau carburant : Priorité JSON, fallback colonne SQL
      const niveauCarburant = rel.niveauCarburant ?? checkin.niveau_carburant ?? null;
      if (niveauCarburant != null) {
        methods.setValue("releves.niveauCarburant", niveauCarburant);
        console.log("[CHECKIN_DRAFT] ✅ Niveau carburant:", niveauCarburant);
      }
      
      // ⭐ PHOTOS DASHBOARD : Priorité colonne SQL, fallback JSON
      const dashboardPhotos = checkin.photos_dashboard || rel.dashboardPhotos || [];
      
      if (Array.isArray(dashboardPhotos) && dashboardPhotos.length > 0) {
        // Stocker l'array complet (avec métadonnées)
        methods.setValue("releves.dashboardPhotosData", dashboardPhotos);
        
        // Extraire les URLs pour affichage rapide (si nécessaire)
        const urls = dashboardPhotos
          .map((p: any) => p?.publicUrl)
          .filter((url: string | null | undefined) => !!url);
        
        methods.setValue("releves.dashboardPhotos", urls);
        
        console.log(`[CHECKIN_DRAFT] ✅ ${dashboardPhotos.length} photo(s) dashboard chargée(s)`);
      }
      
      console.log("[CHECKIN_DRAFT] ✅ Step2 hydraté");
    }

    // ============================================================================
    // STEP 3 : Extérieur & Coffre (préparation)
    // ============================================================================
    if (step3) {
      console.log("[CHECKIN_DRAFT] 📋 Hydratation Step3...");
      
      // Photos par zone
      if (step3.zonesPhotos) {
        methods.setValue("exteriorInspection.zonesPhotos", step3.zonesPhotos);
        const totalPhotos = Object.values(step3.zonesPhotos).flat().length;
        console.log(`[CHECKIN_DRAFT] ✅ ${totalPhotos} photo(s) extérieures chargées`);
      }
      
      // Dégâts
      if (step3.damageReports && Array.isArray(step3.damageReports)) {
        methods.setValue("damageReports", step3.damageReports);
        console.log(`[CHECKIN_DRAFT] ✅ ${step3.damageReports.length} dégât(s) chargé(s)`);
      }
      
      // Switches zonesHasDamage
      if (step3.zonesHasDamage) {
        methods.setValue("exteriorInspection.zonesHasDamage", step3.zonesHasDamage);
      }
      
      // Équipements coffre
      if (step3.coffreEquipements) {
        methods.setValue("exteriorInspection.coffreEquipements", step3.coffreEquipements);
      }
      
      // Propreté extérieure
      if (step3.propreteExterieure) {
        methods.setValue("exteriorInspection.propreteExterieure", step3.propreteExterieure);
      }
      
      console.log("[CHECKIN_DRAFT] ✅ Step3 hydraté");
    }

    // ============================================================================
    // STEP 4 : Intérieur
    // ============================================================================
    const step4 = checkin.data?.step4;
    if (step4) {
      console.log("[CHECKIN_DRAFT] 📋 Hydratation Step4...");
      
      // Sièges
      if (step4.sieges) {
        methods.setValue("interiorInspection.sieges", step4.sieges);
        console.log(`[CHECKIN_DRAFT] ✅ Sièges chargés (${step4.sieges.photos?.length || 0} photo(s))`);
      }
      
      // Propreté intérieure
      if (step4.propreteGenerale) {
        methods.setValue("interiorInspection.propreteGenerale", step4.propreteGenerale);
        console.log(`[CHECKIN_DRAFT] ✅ Propreté intérieure chargée (${step4.propreteGenerale.photos?.length || 0} photo(s))`);
      }
      
      // Équipements
      if (step4.equipements) {
        methods.setValue("interiorInspection.equipements", step4.equipements);
        console.log("[CHECKIN_DRAFT] ✅ Équipements chargés");
      }
      
      console.log("[CHECKIN_DRAFT] ✅ Step4 hydraté");
    }

    // ============================================================================
    // STEP 5 : Accessoires & Équipements
    // ============================================================================
    const step5 = checkin.data?.step5;
    if (step5) {
      console.log("[CHECKIN_DRAFT] 📋 Hydratation Step5...");
      
      // Accessoires
      if (step5.accessoires) {
        methods.setValue("accessoires", step5.accessoires);
        console.log("[CHECKIN_DRAFT] ✅ Accessoires chargés");
        if (step5.accessoires.commentaire) {
          console.log("[CHECKIN_DRAFT] ✅ Commentaire accessoires chargé");
        }
      }
      
      // Stocker aussi step5 pour récupération dans Step 7
      methods.setValue("step5", step5);
      
      console.log("[CHECKIN_DRAFT] ✅ Step5 hydraté");
    }

    // ============================================================================
    // STEP 6 : Remarques & Observations
    // ============================================================================
    const step6 = checkin.data?.step6;
    if (step6) {
      console.log("[CHECKIN_DRAFT] 📋 Hydratation Step6...");
      
      // Remarques
      if (step6.remarques) {
        methods.setValue("remarques", step6.remarques);
        console.log("[CHECKIN_DRAFT] ✅ Remarques chargées");
        if (step6.remarques.observations) {
          console.log("[CHECKIN_DRAFT] ✅ Observations générales chargées");
        }
      }
      
      // Stocker aussi step6 pour récupération dans Step 7
      methods.setValue("step6", step6);
      
      console.log("[CHECKIN_DRAFT] ✅ Step6 hydraté");
    }

    // ============================================================================
    // ⭐ NOUVEAU : Hydratation des lieux depuis snapshot_legal (si présent)
    // ============================================================================
    if (checkin.snapshot_legal?.booking) {
      const bookingSnapshot = checkin.snapshot_legal.booking;
      console.log("[CHECKIN_DRAFT] 📋 Hydratation lieux depuis snapshot...");
      
      // Injecter le snapshot_legal complet dans le form pour accès dans Step 7
      methods.setValue("snapshot_legal", checkin.snapshot_legal);
      
      if (bookingSnapshot.departureLocation !== undefined) {
        methods.setValue("reservation.departureLocation", bookingSnapshot.departureLocation ?? null);
        console.log("[CHECKIN_DRAFT] ✅ Lieu de départ hydraté:", bookingSnapshot.departureLocation);
      }
      
      if (bookingSnapshot.returnLocation !== undefined) {
        methods.setValue("reservation.returnLocation", bookingSnapshot.returnLocation ?? null);
        console.log("[CHECKIN_DRAFT] ✅ Lieu de retour hydraté:", bookingSnapshot.returnLocation);
      }
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[CHECKIN_DRAFT] ✅ Hydratation terminée avec succès");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  };

  /**
   * ⭐ Charger un draft existant pour ce booking_id (si existe)
   * 
   * NOUVEAU COMPORTEMENT : Ne plus hydrater automatiquement, ouvrir une modal de choix
   */
  useEffect(() => {
    async function loadExistingCheckinDraft() {
      if (!bookingId) return;
      
      // ⚠️ Attendre que les profils soient chargés d'abord
      if (loadingProfile) {
        console.log("[CHECKIN_DRAFT] ⏳ Attente du chargement des profils...");
        return;
      }
      
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("[CHECKIN_DRAFT] 🔍 Recherche d'un draft existant...");
      console.log("[CHECKIN_DRAFT] 📦 Booking ID:", bookingId);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      
      try {
        const { data: existingCheckin, error } = await supabase
          .from("checkin_depart")
          .select("*")  // ⭐ Charger TOUTES les colonnes
          .eq("booking_id", bookingId)
          .eq("status", "draft")  // ⭐ Uniquement les drafts
          .order("created_at", { ascending: false })  // Plus récent en premier
          .limit(1)
          .maybeSingle();
        
        if (error) {
          console.error("[CHECKIN_DRAFT] ❌ Erreur SELECT checkin_depart:", error);
          return;
        }
        
        if (existingCheckin) {
          console.log("[CHECKIN_DRAFT] ✅ Draft existant trouvé:", {
            id: existingCheckin.id,
            created_at: existingCheckin.created_at,
            updated_at: existingCheckin.updated_at,
            steps: Object.keys(existingCheckin.data || {}),
          });
          
          // ⭐ NOUVEAU : Stocker le draft et ouvrir la modal (NE PAS hydrater)
          setExistingDraft(existingCheckin as CheckinDepartDraft);
          // ⚠️ Vérifier le status pour verrouillage UI
          if (existingCheckin.status === "completed") {
            setCheckinStatus("completed");
            toast({
              title: "⚠️ État des lieux finalisé",
              description: "Cet état des lieux est finalisé et ne peut plus être modifié.",
              variant: "destructive",
            });
          }
          setIsDraftModalOpen(true);
          
          console.log("[CHECKIN_DRAFT] 📋 Modal ouverte, en attente du choix utilisateur...");
        } else {
          console.log("[CHECKIN_DRAFT] ℹ️ Aucun draft existant, nouveau check-in");
          console.log("[CHECKIN_DRAFT] 📝 checkinId reste null (INSERT au 1er save)");
        }
      } catch (error) {
        console.error("[CHECKIN_DRAFT] ❌ Exception loadExistingCheckinDraft:", error);
        // ⚠️ Ne pas bloquer le formulaire en cas d'erreur
      }
    }
    
    loadExistingCheckinDraft();
  }, [bookingId, loadingProfile]);  // ⭐ Se déclenche après le chargement des profils

  // ============================================================================
  // ⭐ FONCTIONS UTILITAIRES POUR LA MODAL "POURSUIVRE / REDÉMARRER"
  // ============================================================================

  /**
   * Extraire le storagePath depuis une URL publique Supabase
   */
  const extractStoragePathFromPublicUrl = (url?: string | null): string | null => {
    if (!url || typeof url !== "string") return null;
    
    // Ex: "https://xxx.supabase.co/storage/v1/object/public/checkin-photos/resa_8/documents/photo_permis_recto_8_..."
    // → "resa_8/documents/photo_permis_recto_8_..."
    const marker = "/storage/v1/object/public/checkin-photos/";
    const idx = url.indexOf(marker);
    
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
  };

  /**
   * Collecter tous les storagePath depuis un checkin_depart
   */
  const collectAllStoragePathsFromCheckin = (checkin: CheckinDepartDraft): string[] => {
    const paths = new Set<string>();
    
    const addPath = (p?: string | null) => {
      if (p && typeof p === "string") paths.add(p);
    };
    
    const addFromArray = (arr: any[] | null | undefined, key: string = "storagePath") => {
      if (!Array.isArray(arr)) return;
      for (const item of arr) {
        if (!item || typeof item !== "object") continue;
        if (item[key]) addPath(item[key]);
      }
    };
    
    // Step1 : Permis (URL simple → extraire storagePath)
    if (checkin.photo_permis_recto) {
      const p = extractStoragePathFromPublicUrl(checkin.photo_permis_recto);
      if (p) addPath(p);
    }
    if (checkin.photo_permis_verso) {
      const p = extractStoragePathFromPublicUrl(checkin.photo_permis_verso);
      if (p) addPath(p);
    }
    
    // Step2 : Dashboard
    addFromArray(checkin.photos_dashboard, "storagePath");
    if (checkin.data?.step2?.releves?.dashboardPhotos) {
      addFromArray(checkin.data.step2.releves.dashboardPhotos, "storagePath");
    }
    
    // Step3 : Extérieur / Jantes / Coffre
    addFromArray(checkin.photos_exterieur, "storagePath");
    addFromArray(checkin.photos_jantes, "storagePath");
    addFromArray(checkin.photos_coffre, "storagePath");
    
    // Step3 : Dégâts (nested photos)
    if (Array.isArray(checkin.degats)) {
      for (const degat of checkin.degats) {
        addFromArray(degat?.photos, "storagePath");
      }
    }
    
    // Step3 : Via JSON data (au cas où)
    if (checkin.data?.step3?.zonesPhotos) {
      const zonesPhotos = checkin.data.step3.zonesPhotos;
      Object.values(zonesPhotos).forEach((zone: any) => {
        if (Array.isArray(zone)) {
          addFromArray(zone, "storagePath");
        }
      });
    }
    
    if (Array.isArray(checkin.data?.step3?.damageReports)) {
      for (const damage of checkin.data.step3.damageReports) {
        addFromArray(damage?.photos, "storagePath");
      }
    }
    
    return Array.from(paths);
  };

  /**
   * Supprimer un draft complet (BDD + fichiers Storage)
   */
  const deleteCheckinDraftAndFiles = async (
    draft: CheckinDepartDraft,
    bookingId: string
  ): Promise<{ deletedFiles: number; errors: string[] }> => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[DELETE_DRAFT] 🗑️ Début de la suppression du draft");
    console.log("[DELETE_DRAFT] Draft ID:", draft.id);
    console.log("[DELETE_DRAFT] Booking ID:", bookingId);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const errors: string[] = [];
    let deletedFiles = 0;
    
    // ============================================================================
    // 1️⃣ SUPPRIMER LES FICHIERS STORAGE
    // ============================================================================
    const paths = collectAllStoragePathsFromCheckin(draft);
    console.log(`[DELETE_DRAFT] 📂 ${paths.length} fichier(s) à supprimer`);
    
    if (paths.length > 0) {
      // Supprimer par batch (Supabase accepte un array)
      const { data: deleteData, error: storageError } = await supabase.storage
        .from('checkin-photos')
        .remove(paths);
      
      if (storageError) {
        console.error("[DELETE_DRAFT] ⚠️ Erreur suppression Storage:", storageError);
        errors.push(`Storage: ${storageError.message}`);
        // ⚠️ On continue quand même avec la suppression BDD
      } else {
        deletedFiles = paths.length;
        console.log(`[DELETE_DRAFT] ✅ ${deletedFiles} fichier(s) supprimé(s)`);
      }
    }
    
    // ============================================================================
    // 2️⃣ SUPPRIMER LA LIGNE BDD
    // ============================================================================
    console.log("[DELETE_DRAFT] 🗄️ Suppression BDD...");
    
    const { error: dbError } = await supabase
      .from("checkin_depart")
      .delete()
      .eq("id", draft.id)
      .eq("status", "draft")  // ⚠️ SÉCURITÉ : uniquement les drafts
      .eq("booking_id", bookingId);  // ⚠️ Double vérification
    
    if (dbError) {
      console.error("[DELETE_DRAFT] ❌ Erreur suppression BDD:", dbError);
      throw new Error(`Erreur suppression BDD: ${dbError.message}`);
    }
    
    console.log("[DELETE_DRAFT] ✅ Draft supprimé en BDD");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[DELETE_DRAFT] ✅ Suppression terminée avec succès");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    return { deletedFiles, errors };
  };

  /**
   * Réinitialiser le formulaire pour un nouveau check-in
   */
  const resetFormForNewCheckin = () => {
    console.log("[DRAFT_MODAL] 🔄 Reset du formulaire pour nouveau check-in");
    
    // 1️⃣ Réinitialiser checkinId
    setCheckinId(null);
    
    // 2️⃣ Nettoyer le draft temporaire
    setExistingDraft(null);
    
    // 3️⃣ Reset du form RHF (garder les données de profil, vider les photos)
    const currentValues = methods.getValues();
    
    methods.reset({
      ...currentValues,
      conducteur: {
        ...currentValues.conducteur,
        driver_license_photos_recto: null,  // ⭐ Vider
        driver_license_photos_verso: null,  // ⭐ Vider
      },
      releves: {
        kilometrage: undefined,
        niveauCarburant: 0,
        dashboardPhotosData: [],  // ⭐ Vider
        dashboardPhotos: [],      // ⭐ Vider
        photosTableauBord: [],
        photos: [],
      },
      exteriorInspection: {
        zonesPhotos: {},  // ⭐ Vider
        zonesHasDamage: {},
        coffreEquipements: {},
        propreteExterieure: {},
      },
      damageReports: [],  // ⭐ Vider
    });
    
    console.log("[DRAFT_MODAL] ✅ Formulaire réinitialisé");
  };

  // ============================================================================
  // ⭐ HANDLERS POUR LA MODAL DE CHOIX
  // ============================================================================

  /**
   * Formatter une date avec heure en français
   */
  const formatDateTime = (isoDateTime: string): string => {
    try {
      const date = new Date(isoDateTime);
      return date.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Erreur formatage date:", error);
      return isoDateTime;
    }
  };

  /**
   * ⭐ Analyser la progression complète d'un draft
   * 
   * Retourne :
   * - stepsWithStatus : Liste des étapes avec leur statut (completed, current, pending)
   * - nextStepId : ID de l'étape à reprendre
   * - nextStepInfo : Infos complètes sur l'étape à reprendre
   */
  const getDraftProgress = (draft: CheckinDepartDraft) => {
    // Construire la liste de toutes les étapes avec leur statut de complétion
    const stepsWithStatus = steps.map((step) => {
      const stepKey = `step${step.id}`;
      const completedAt = draft?.data?.[stepKey]?.completedAt;
      
      return {
        id: step.id,
        label: step.label,
        completed: !!completedAt,
      };
    });
    
    // Trouver la dernière étape complétée
    const lastCompletedStep = stepsWithStatus
      .filter(s => s.completed)
      .map(s => s.id)
      .pop();
    
    // Déterminer l'étape à reprendre (suivante après la dernière complétée)
    const nextStepId = lastCompletedStep 
      ? Math.min(lastCompletedStep + 1, steps.length)
      : 1;
    
    const nextStepInfo = stepsWithStatus.find(s => s.id === nextStepId) || stepsWithStatus[0];
    
    console.log(`[DRAFT_MODAL] 📊 Progression:`, {
      completed: stepsWithStatus.filter(s => s.completed).length,
      total: stepsWithStatus.length,
      nextStep: nextStepId,
    });
    
    return {
      stepsWithStatus,
      nextStepId,
      nextStepInfo,
    };
  };

  /**
   * Handler : Poursuivre le draft existant
   */
  const handleContinueDraft = () => {
    if (!existingDraft) {
      console.error("[DRAFT_MODAL] ❌ Pas de draft à poursuivre");
      return;
    }
    
    console.log("[DRAFT_MODAL] ✅ Utilisateur choisit de poursuivre le draft:", existingDraft.id);
    
    // 1️⃣ Analyser la progression du draft
    const progress = getDraftProgress(existingDraft);
    
    // 2️⃣ Initialiser checkinId et status
    setCheckinId(existingDraft.id);
    setCheckinStatus(existingDraft.status || "draft");
    console.log("[DRAFT_MODAL] ✅ checkinId initialisé:", existingDraft.id);
    console.log("[DRAFT_MODAL] 📊 Status:", existingDraft.status);
    
    // ⚠️ Vérifier si le check-in est finalisé
    if (existingDraft.status === "completed") {
      toast({
        title: "⚠️ État des lieux finalisé",
        description: "Cet état des lieux est finalisé et ne peut plus être modifié.",
        variant: "destructive",
      });
    }
    
    // 3️⃣ Hydrater le formulaire (réutiliser la fonction existante)
    hydrateFormFromCheckin(existingDraft);
    
    // 4️⃣ Rediriger vers l'étape calculée
    setCurrentStep(progress.nextStepId);
    console.log(`[DRAFT_MODAL] 🔁 Redirection vers Step ${progress.nextStepId} — ${progress.nextStepInfo.label}`);
    
    // 5️⃣ Fermer la modal
    setIsDraftModalOpen(false);
    
    // 6️⃣ Nettoyer le state temporaire
    setExistingDraft(null);
    
    // 7️⃣ Toast informatif
    toast({
      title: "✅ Brouillon repris",
      description: `Reprise à l'étape ${progress.nextStepId} — ${progress.nextStepInfo.label}`,
    });
    
    console.log("[DRAFT_MODAL] ✅ Poursuite du draft terminée, formulaire prêt");
  };

  /**
   * Handler : Redémarrer à zéro (suppression complète)
   */
  const handleRestartFromScratch = async () => {
    if (!existingDraft || !bookingId) {
      console.error("[DRAFT_MODAL] ❌ Pas de draft à supprimer");
      return;
    }
    
    console.log("[DRAFT_MODAL] 🗑️ Utilisateur choisit de redémarrer à zéro");
    setIsDeletingDraft(true);
    
    try {
      // 1️⃣ Supprimer draft + fichiers
      const result = await deleteCheckinDraftAndFiles(existingDraft, bookingId);
      
      console.log("[DRAFT_MODAL] ✅ Suppression terminée:", {
        deletedFiles: result.deletedFiles,
        errors: result.errors.length,
      });
      
      // 2️⃣ Reset formulaire
      resetFormForNewCheckin();
      
      // 3️⃣ Fermer la modal
      setIsDraftModalOpen(false);
      
      // 4️⃣ Toast succès
      toast({
        title: "✅ Brouillon supprimé",
        description: `${result.deletedFiles} fichier(s) supprimé(s). Vous repartez de zéro.`,
      });
      
      // 5️⃣ Afficher warning si des erreurs partielles
      if (result.errors.length > 0) {
        console.warn("[DRAFT_MODAL] ⚠️ Erreurs partielles:", result.errors);
        toast({
          title: "⚠️ Suppression partielle",
          description: "Le brouillon a été supprimé, mais certains fichiers peuvent rester.",
          variant: "default",
        });
      }
    } catch (error: any) {
      console.error("[DRAFT_MODAL] ❌ Erreur suppression:", error);
      toast({
        title: "❌ Erreur lors de la suppression",
        description: error.message || "Veuillez réessayer",
        variant: "destructive",
      });
    } finally {
      setIsDeletingDraft(false);
    }
  };

  // Navigation simple entre étapes
  const nextStep = () => {
    setCurrentStep((s) => Math.min(s + 1, steps.length));
  };

  const prevStep = () => {
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  // Scroll/focus automatique sur l'ancre d'un champ manquant
  useEffect(() => {
    if (!pendingAnchor) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(pendingAnchor);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          el.focus();
        }
      }
      setPendingAnchor(null);
    }, 50);
    return () => clearTimeout(timer);
  }, [pendingAnchor, currentStep]);

  // Fonction pour soumettre le formulaire final
  async function handleFinalSubmit() {
    const allValues = methods.getValues();
    
    // on récupère chaque bloc pour plus de lisibilité
    const conducteur = allValues.conducteur;
    const vehicule = allValues.vehicule;
    const releves = allValues.releves;
    const exterieur = allValues.exterieur;
    const inspectionExterieure = allValues.inspection_exterieure;
    const interieur = allValues.interieur;
    const accessoires = allValues.accessoires;
    const remarques = allValues.remarques;
    const signatures = allValues.signatures;

    // construire le payload final tel qu'on veut le stocker en base
    const payload = {
      booking_id: bookingId ?? null,
      owner_id: ownerId ?? null,
      renter_id: renterId ?? null,
      status: "draft", // tant que pas signé officiellement
      // on pourra aussi mettre "submitted" plus tard
      conducteur: {
        first_name: conducteur.prenom || "",
        last_name: conducteur.nom || "",
        phone: "", // pas encore dans le formulaire actuel
        email: "", // pas encore dans le formulaire actuel
        birthdate: "", // pas encore dans le formulaire actuel
        place_of_birth: "", // pas encore dans le formulaire actuel
        address_line1: "", // pas encore dans le formulaire actuel
        postal_code: "", // pas encore dans le formulaire actuel
        city: "", // pas encore dans le formulaire actuel
        country: "", // pas encore dans le formulaire actuel
        driver_license_number: conducteur.numeroPermis || "",
        driver_license_country: conducteur.paysEmission || "",
        driver_license_issue_date: conducteur.dateDelivrance || "",
        driver_license_expiration_date: conducteur.dateExpiration || "",
        driver_license_category: conducteur.categoriePermis || "B",
        // photos du permis prises SUR PLACE pour cette loc (base64)
        driver_license_photos_recto: conducteur.driver_license_photos_recto || null,
        driver_license_photos_verso: conducteur.driver_license_photos_verso || null,
      },
      vehicule_depart: {
        marque: vehicule.marque || "",
        modele: vehicule.modele || "",
        immatriculation: vehicule.immatriculation || "",
        kilometrage_depart: releves.kilometrage,
        niveau_carburant: releves.niveauCarburant, // pourcentage numérique 0-100
        photos_dashboard: releves.photos || [], // base64[] des photos du tableau de bord
      },
      // Utiliser le nouveau schema inspection_exterieure si disponible, sinon fallback sur l'ancien
      exterieur: inspectionExterieure
        ? {
            // Nouveau format structuré par zone
            avant: {
              photo_zone: inspectionExterieure.avant?.photo_zone || [],
              degat_present: inspectionExterieure.avant?.degat_present ?? null,
              degat_description: inspectionExterieure.avant?.degat_description,
              degat_photos: inspectionExterieure.avant?.degat_photos || [],
            },
            cote_droit: {
              photo_zone: inspectionExterieure.cote_droit?.photo_zone || [],
              degat_present: inspectionExterieure.cote_droit?.degat_present ?? null,
              degat_description: inspectionExterieure.cote_droit?.degat_description,
              degat_photos: inspectionExterieure.cote_droit?.degat_photos || [],
              jante_av_droite: inspectionExterieure.cote_droit?.jante_av_droite || [],
              jante_ar_droite: inspectionExterieure.cote_droit?.jante_ar_droite || [],
            },
            arriere: {
              photo_zone: inspectionExterieure.arriere?.photo_zone || [],
              degat_present: inspectionExterieure.arriere?.degat_present ?? null,
              degat_description: inspectionExterieure.arriere?.degat_description,
              degat_photos: inspectionExterieure.arriere?.degat_photos || [],
            },
            coffre: {
              photo_coffre_ouvert: inspectionExterieure.coffre?.photo_coffre_ouvert || [],
              gilet_triangle_present: inspectionExterieure.coffre?.gilet_triangle_present ?? null,
              roue_secours: inspectionExterieure.coffre?.roue_secours ?? null,
              cable_recharge_present: inspectionExterieure.coffre?.cable_recharge_present ?? null,
              photos_accessoires: inspectionExterieure.coffre?.photos_accessoires || [],
            },
            cote_gauche: {
              photo_zone: inspectionExterieure.cote_gauche?.photo_zone || [],
              degat_present: inspectionExterieure.cote_gauche?.degat_present ?? null,
              degat_description: inspectionExterieure.cote_gauche?.degat_description,
              degat_photos: inspectionExterieure.cote_gauche?.degat_photos || [],
              jante_av_gauche: inspectionExterieure.cote_gauche?.jante_av_gauche || [],
              jante_ar_gauche: inspectionExterieure.cote_gauche?.jante_ar_gauche || [],
            },
          }
        : {
            // Ancien format (fallback pour compatibilité)
            rayures_bosses: exterieur?.rayuresBosses || false,
            photos_rayures_bosses: exterieur?.photosRayuresBosses || [],
            pare_chocs_avant: exterieur?.pareChocsAvant,
            photos_pare_chocs_avant: exterieur?.photosPareChocsAvant || [],
            pare_chocs_arriere: exterieur?.pareChocsArriere,
            photos_pare_chocs_arriere: exterieur?.photosPareChocsArriere || [],
            phares: exterieur?.phares,
            photos_phares: exterieur?.photosPhares || [],
            pare_brise: exterieur?.pareBrise,
            photos_pare_brise: exterieur?.photosPareBrise || [],
            roues_pneus: exterieur?.rouesPneus,
            photos_roues_pneus: exterieur?.photosRouesPneus || [],
            photos_vue_globale: exterieur?.photosGlobales || [],
            photos_jantes: exterieur?.photosJantes || [],
            photos_coffre: exterieur?.photosCoffre || [],
            photos_accessoires: exterieur?.photosAccessoires || [],
          },
      interieur: {
        proprete: interieur?.proprete,
        sieges: interieur?.sieges,
        tableau_bord: interieur?.tableauBord,
        radio_gps: interieur?.radioGPS,
        climatisation: interieur?.climatisation,
        photos_interieur: interieur?.photosInterieur || [],
        photos_habitacle: interieur?.photosHabitacle || [], // base64[] des photos de l'habitacle
      },
      accessoires: {
        gilet: accessoires?.gilet || false,
        triangle: accessoires?.triangle || false,
        roue_secours: accessoires?.roueSecours || false,
        cric: accessoires?.cric || false,
        cle: accessoires?.cle || false,
        cable: accessoires?.cable || false,
        manuel: accessoires?.manuel || false,
        carte_carburant: accessoires?.carteCarburant || false,
        commentaire: accessoires?.commentaire || "",
      },
      remarques: {
        observations: remarques?.observations || "",
      },
      signatures: {
        owner_signature: signatures?.signatureProprietaire || "",
        renter_signature: signatures?.signatureLocataire || "",
      },
      validated_at: new Date().toISOString(),
    };

    // POUR L'INSTANT : pas d'appel serveur.
    console.log("=== PAYLOAD CHECK-IN FINAL ===");
    console.dir(payload, { depth: null });
    
    toast({
      title: "✅ État des lieux prêt",
      description: "Le formulaire est prêt. Regarde la console pour voir le payload.",
      variant: "default",
    });

    // 🔜 plus tard (quand on sera prêts)
    // await fetch("/api/checkin/submit", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(payload),
    // });
  }

  const onSubmit = (data: FormData) => {
    // Ne plus utiliser cette fonction, utiliser handleFinalSubmit à la place
    handleFinalSubmit();
  };

  const getFieldsForStep = (step: number): string[] => {
    switch (step) {
      case 1:
        return [
          "conducteur.nom",
          "conducteur.prenom",
          "conducteur.numeroPermis",
          "conducteur.paysEmission",
          "conducteur.dateDelivrance",
          "conducteur.dateExpiration",
          "conducteur.categoriePermis",
        ];
      case 2:
        return ["vehicule.marque", "vehicule.modele", "vehicule.immatriculation"];
      default:
        return [];
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Section1Identification
            onComplete={nextStep}
            bookingId={bookingId}
            bookingReferenceNumber={bookingReferenceNumber}  // ⭐ NOUVEAU
            ownerId={ownerId}
            renterId={renterId}
            checkinId={checkinId}
            onCheckinIdChange={setCheckinId}
          />
        );
      case 2:
        return (
          <Section2Releves
            onComplete={nextStep}
            bookingId={bookingId}
            bookingReferenceNumber={bookingReferenceNumber}  // ⭐ NOUVEAU
            ownerId={ownerId}
            renterId={renterId}
            checkinId={checkinId}
            onCheckinIdChange={setCheckinId}
            missingFieldsSet={missingFieldsSet}
            missingFieldsList={missingFieldsList}
            onNavigateToMissingField={(target) => {
              if (target?.step) {
                setCurrentStep(target.step);
              }
              if (target?.anchor) {
                setPendingAnchor(target.anchor);
              }
            }}
          />
        );
      case 3:
        return (
          <ExteriorInspectionAccordionSimple
            bookingId={bookingId}
            bookingReferenceNumber={bookingReferenceNumber}
            ownerId={ownerId}
            renterId={renterId}
            checkinId={checkinId}
            onCheckinIdChange={setCheckinId}
            onComplete={nextStep}
          />
        );
      case 4:
        return (
          <Section4Interieur
            onComplete={nextStep}
            bookingId={bookingId}
            bookingReferenceNumber={bookingReferenceNumber}
            ownerId={ownerId}
            renterId={renterId}
            checkinId={checkinId}
            onCheckinIdChange={setCheckinId}
          />
        );
      case 5:
        return (
          <Section5Accessoires
            onComplete={nextStep}
            bookingId={bookingId}
            ownerId={ownerId}
            renterId={renterId}
            checkinId={checkinId}
            onCheckinIdChange={setCheckinId}
          />
        );
      case 6:
        return (
          <Section6Remarques
            bookingId={bookingId}
            ownerId={ownerId}
            renterId={renterId}
            checkinId={checkinId}
            onCheckinIdChange={setCheckinId}
            onComplete={nextStep}
          />
        );
      case 7:
        return (
          <Section8Validation 
            onInvalidStepsChange={setInvalidSteps}
            onMissingFieldsChange={(fields) => {
              setMissingFieldsSet(new Set(fields));
              setMissingFieldsList(fields);
            }}
            onNavigateToMissingField={(target) => {
              if (target?.step) {
                setCurrentStep(target.step);
              }
              if (target?.anchor) {
                setPendingAnchor(target.anchor);
              }
            }}
            bookingId={bookingId}
            ownerId={ownerId}
            renterId={renterId}
            checkinId={checkinId}
            onCheckinIdChange={(id, status) => {
              setCheckinId(id);
              // ⭐ Phase 1 : Mise à jour immédiate du statut si fourni (sans attendre Supabase)
              if (status) {
                console.log("[EtatDesLieuxDepartForm] ⚡ Mise à jour immédiate du statut:", status);
                setCheckinStatus(status);
              }
              // Charger le status depuis Supabase si non fourni (comportement existant pour compatibilité)
              if (id && !status) {
                SupabaseCheckinService.getCheckinById(id)
                  .then((result) => {
                    if (result.data) {
                      setCheckinStatus(result.data.status);
                    } else if (result.error) {
                      console.error("[EtatDesLieuxDepartForm] ❌ Erreur chargement checkin:", result.error);
                      // Si le checkin n'existe pas (supprimé), réinitialiser
                      if (result.error.includes("PGRST116") || result.error.includes("not found")) {
                        console.warn("[EtatDesLieuxDepartForm] ⚠️ Checkin supprimé, réinitialisation...");
                        setCheckinId(null);
                        setCheckinStatus("draft");
                      }
                    }
                  })
                  .catch((error) => {
                    console.error("[EtatDesLieuxDepartForm] ❌ Exception chargement checkin:", error);
                    // Ne pas bloquer l'UI, juste logger
                  });
              }
            }}
            isCheckinCompleted={checkinStatus === "completed"}
          />
        );
      default:
        return null;
    }
  };

  return (
    <FormProvider {...methods}>
      {/* ⭐ MODAL : Brouillon détecté */}
      <AlertDialog open={isDraftModalOpen} onOpenChange={setIsDraftModalOpen}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl flex items-center gap-2">
              <AlertCircle className="h-6 w-6 text-warning" />
              Brouillon d'état des lieux détecté
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base space-y-3">
              <p>
                Un état des lieux est déjà en cours pour cette réservation.
                Que souhaitez-vous faire ?
              </p>
              
              {existingDraft && (() => {
                const progress = getDraftProgress(existingDraft);
                
                return (
                  <div className="rounded-md bg-muted p-4 space-y-4 text-left">
                    {/* Dates */}
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div>
                        📅 Créé le : <span className="font-medium text-foreground">{formatDateTime(existingDraft.created_at)}</span>
                      </div>
                      <div>
                        🕐 Dernière modification : <span className="font-medium text-foreground">{formatDateTime(existingDraft.updated_at)}</span>
                      </div>
                    </div>
                    
                    {/* Progression */}
                    <div className="border-t border-border pt-3">
                      <div className="text-sm font-medium text-foreground mb-2">
                        📊 Progression :
                      </div>
                      <ul className="space-y-2 text-xs">
                        {progress.stepsWithStatus.map((step) => {
                          const isCurrentStep = step.id === progress.nextStepId;
                          
                          return (
                            <li
                              key={step.id}
                              className={cn(
                                "flex items-center gap-2",
                                step.completed && "text-success",
                                isCurrentStep && !step.completed && "text-foreground font-medium"
                              )}
                            >
                              {step.completed ? (
                                <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                              ) : isCurrentStep ? (
                                <Clock className="h-4 w-4 text-warning flex-shrink-0" />
                              ) : null}
                              
                              <span>
                                Étape {step.id} — {step.label}
                                {isCurrentStep && !step.completed && (
                                  <span className="ml-2 text-warning">(en cours)</span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter className="flex flex-col gap-3 sm:flex-col">
            <Button
              onClick={handleContinueDraft}
              disabled={isDeletingDraft}
              className="w-full bg-gradient-lagoon hover:opacity-90 text-white font-semibold shadow-lagoon"
              size="lg"
            >
              {existingDraft && (() => {
                const progress = getDraftProgress(existingDraft);
                return (
                  <>
                    📄 Reprendre à l'étape {progress.nextStepId} — {progress.nextStepInfo.label}
                  </>
                );
              })()}
            </Button>
            
            <Button
              onClick={handleRestartFromScratch}
              disabled={isDeletingDraft}
              variant="outline"
              className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              size="lg"
            >
              {isDeletingDraft ? (
                <>🔄 Suppression en cours...</>
              ) : (
                <>🗑️ Redémarrer à zéro</>
              )}
            </Button>
            
            <p className="text-xs text-muted-foreground text-center mt-2">
              ⚠️ "Redémarrer à zéro" supprimera définitivement toutes les données et photos du brouillon
            </p>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
        {/* ⭐ Bloquer l'affichage du form tant que la modal n'est pas résolue */}
        {isDraftModalOpen ? (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center space-y-4 min-h-[400px]">
              <div className="animate-pulse text-center">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div className="text-lg font-medium text-foreground">
                  Chargement de l'état des lieux...
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Veuillez choisir une option dans la fenêtre ci-dessus
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {/* Barre de progression */}
            <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm font-medium">
              <span className="text-muted-foreground">
                Étape {currentStep} sur {steps.length}
              </span>
              <span className="text-primary font-semibold">
                {Math.round(progressPercentage)}%
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex justify-between items-center text-xs">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={cn(
                    "flex flex-col items-center flex-1",
                    step.id === currentStep && "text-primary font-semibold",
                    invalidSteps.has(step.id) && "text-destructive",
                    step.id < currentStep && "text-success",
                    step.id > currentStep && "text-muted-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-all",
                      step.id === currentStep &&
                        "bg-primary text-primary-foreground shadow-lg scale-110",
                      invalidSteps.has(step.id) &&
                        "ring-2 ring-destructive ring-offset-2",
                      step.id < currentStep &&
                        "bg-success text-success-foreground",
                      step.id > currentStep &&
                        "bg-muted text-muted-foreground"
                    )}
                  >
                    {step.id < currentStep ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className="text-center text-[10px] leading-tight hidden sm:block">
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Étape actuelle */}
        <Card className="shadow-card">
          <CardContent className="p-6">
            {loadingProfile && currentStep === 1 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">
                  Chargement des informations du conducteur...
                </p>
              </div>
            ) : (
              renderStep()
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between gap-4">
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
          ) : (
            <div />
          )}
          {currentStep < steps.length ? (
            <Button
              type="button"
              onClick={nextStep}
              className="ml-auto flex items-center gap-2"
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleFinalSubmit}
              className="ml-auto flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Valider l'état des lieux
            </Button>
          )}
        </div>
          </>
        )}
      </form>

      {/* Dev Mode - Navigation libre entre les sections */}
      {process.env.NODE_ENV !== "production" && (
        <div className="fixed bottom-6 right-6 z-50">
          <details className="bg-white shadow-lg rounded-xl p-3 border border-border w-56">
            <summary className="cursor-pointer font-semibold flex items-center gap-2 text-sm hover:text-primary transition-colors">
              🔧 Dev mode
            </summary>
            <div className="mt-2 space-y-1">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    setCurrentStep(index + 1);
                    toast({
                      title: "Dev Mode",
                      description: `Navigation vers l'étape ${index + 1}: ${step.label}`,
                      variant: "default",
                    });
                  }}
                  className={cn(
                    "w-full text-left px-2 py-1 rounded text-sm transition-colors",
                    currentStep === index + 1
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted"
                  )}
                >
                  {index + 1}. {step.label}
                </button>
              ))}
            </div>
          </details>
        </div>
      )}
    </FormProvider>
  );
}

