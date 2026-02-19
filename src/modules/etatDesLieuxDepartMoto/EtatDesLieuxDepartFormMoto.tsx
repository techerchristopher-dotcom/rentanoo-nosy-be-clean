import { useState, useEffect, useMemo } from "react";
import { useForm, FormProvider, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Section1IdentificationMoto from "./sections/Section1IdentificationMoto";
import Section2RelevesMoto from "./sections/Section2RelevesMoto";
import { Section3ExterieurMoto } from "./sections/Section3ExterieurMoto";
import { Section5AccessoiresMoto } from "./sections/Section5AccessoiresMoto";
import Section6RemarquesMoto from "./sections/Section6RemarquesMoto";
import { Section8ValidationMoto } from "./sections/Section8ValidationMoto";
import type { Step3MotoData } from "./types/step3Moto";

// Steps visibles moto : 1, 2, 3, 5, 6, 7 (Step 4 masqué)
const visibleSteps = [1, 2, 3, 5, 6, 7];

const stepLabels: Record<number, string> = {
  1: "Identification",
  2: "Relevés",
  3: "Extérieur moto",
  5: "Accessoires",
  6: "Remarques",
  7: "Validation & Signature",
};

interface EtatDesLieuxDepartFormMotoProps {
  bookingId?: string;
  bookingReferenceNumber?: number | null;
}

// ⭐ Schema minimal pour les sections réutilisées (1, 2, 6) qui utilisent useFormContext
// On réutilise la même structure que le form voiture pour compatibilité
const MotoFormSchema = z.object({
  bookingId: z.string().optional(),
  conducteur: z.object({
    nom: z.string().optional(),
    prenom: z.string().optional(),
    numeroPermis: z.string().optional(),
    paysEmission: z.string().optional(),
    dateDelivrance: z.string().optional(),
    dateExpiration: z.string().optional(),
    categoriePermis: z.string().optional(),
    photoPermisRecto: z.string().nullable().optional(),
    photoPermisVerso: z.string().nullable().optional(),
    driver_license_photos_recto: z.string().nullable().optional(),
    driver_license_photos_verso: z.string().nullable().optional(),
  }).optional(),
  vehicule: z.object({
    marque: z.string().optional(),
    modele: z.string().optional(),
    immatriculation: z.string().optional(),
  }).optional(),
  releves: z.object({
    kilometrage: z.number().optional(),
    niveauCarburant: z.number().optional(),
    photosTableauBord: z.array(z.string()).optional(),
    photos: z.array(z.string()).optional(),
    dashboardPhotos: z.array(z.any()).optional(),
  }).optional(),
  remarques: z.object({
    observations: z.string().optional(),
  }).optional(),
  ownerSignature: z.string().optional(),
  driverSignature: z.string().optional(),
});

type MotoFormData = z.infer<typeof MotoFormSchema>;

export function EtatDesLieuxDepartFormMoto({
  bookingId,
  bookingReferenceNumber,
}: EtatDesLieuxDepartFormMotoProps) {
  // ⭐ DefaultValues stables (sans dépendance bookingId pour éviter la recréation)
  // bookingId n'a pas besoin d'être dans le form, il est passé en props
  const defaultValues = useMemo<MotoFormData>(
    () => ({
      bookingId: "",
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
        immatriculation: "",
      },
      releves: {
        kilometrage: undefined,
        niveauCarburant: 0,
        photosTableauBord: [],
        photos: [],
        dashboardPhotos: [],
      },
      remarques: {
        observations: "",
      },
      ownerSignature: "",
      driverSignature: "",
      damageReports: [], // ⭐ Step 1 : Initialisation damageReports pour hydratation
      step3ZonesPhotos: {}, // ⭐ Persistance zones photos pour sauvegarde Step3 avant finalisation
    }),
    [] // ⭐ Pas de dépendance - valeurs statiques
  );

  // ⭐ FormProvider pour les sections réutilisées (1, 2, 6)
  // ⚠️ IMPORTANT : useForm doit être stable pour éviter les erreurs removeChild
  // Les defaultValues sont statiques (pas de dépendance), donc useForm reste stable
  // Note: useForm est appelé à chaque render mais l'instance reste stable grâce à React Hook Form
  const methods = useForm<MotoFormData>({
    resolver: zodResolver(MotoFormSchema),
    mode: "onChange",
    defaultValues,
    // ⭐ Désactiver shouldUnregister pour éviter les problèmes de démontage
    shouldUnregister: false,
  });

  const isBlank = (v: unknown) => typeof v !== "string" || v.trim() === "";

  /**
   * Injecte une valeur uniquement si le champ est encore vide (anti-overwrite),
   * sans impacter formState (dirty/touched/errors) : pas de reset().
   *
   * NOTE: `conducteur` est optionnel dans le schema, mais `setValue("conducteur.nom", ...)`
   * est OK : RHF crée le chemin au besoin.
   */
  const setIfEmpty = (field: Path<MotoFormData>, next: unknown) => {
    if (typeof next !== "string") return;
    const trimmed = next.trim();
    if (!trimmed) return;

    const current = methods.getValues(field);
    if (!isBlank(current)) return;

    methods.setValue(field, trimmed as any, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: false,
    });
  };

  // Helpers dédiés (optionnel mais lisible)
  const setConducteurNomIfEmpty = (v: unknown) => setIfEmpty("conducteur.nom", v);
  const setConducteurPrenomIfEmpty = (v: unknown) => setIfEmpty("conducteur.prenom", v);
  const setVehiculeMarqueIfEmpty = (v: unknown) => setIfEmpty("vehicule.marque", v);
  const setVehiculeModeleIfEmpty = (v: unknown) => setIfEmpty("vehicule.modele", v);
  const setVehiculeImmatriculationIfEmpty = (v: unknown) => setIfEmpty("vehicule.immatriculation", v);

  const [currentStep, setCurrentStep] = useState(1);
  // États pour la validation (comme la voiture)
  const [invalidSteps, setInvalidSteps] = useState<Set<number>>(new Set());
  const [missingFieldsSet, setMissingFieldsSet] = useState<Set<string>>(new Set());
  const [missingFieldsList, setMissingFieldsList] = useState<string[]>([]);
  const [pendingAnchor, setPendingAnchor] = useState<string | null>(null);
  // État pour le checkinId (propagé entre les steps)
  const [checkinId, setCheckinId] = useState<string | null>(null);
  // ⭐ Statut du check-in (pour verrouillage UI)
  const [checkinStatus, setCheckinStatus] = useState<string | null>(null);
  // États pour l'hydratation des données draft
  const [initialStep3Data, setInitialStep3Data] = useState<Step3MotoData | null>(null);
  const [initialStep5Data, setInitialStep5Data] = useState<{
    completedAt?: string;
    accessories: Record<string, boolean>;
    photos: Array<{ url: string; storagePath: string }>;
    notes?: string;
  } | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  // Indique si un draft Step1 contient déjà un nom/prénom (pour ne pas écraser)
  const [hasDraftStep1Name, setHasDraftStep1Name] = useState(false);

  // ⭐ Calcul du mode read-only
  const isReadOnly = checkinStatus === "completed";

  // Fonction pour obtenir le step suivant (saut du Step 4)
  const getNextStep = (step: number): number => {
    const currentIndex = visibleSteps.indexOf(step);
    if (currentIndex === -1 || currentIndex === visibleSteps.length - 1) {
      return step; // Dernier step ou step invalide
    }
    return visibleSteps[currentIndex + 1];
  };

  // Fonction pour obtenir le step précédent (saut du Step 4)
  const getPrevStep = (step: number): number => {
    const currentIndex = visibleSteps.indexOf(step);
    if (currentIndex <= 0) {
      return step; // Premier step ou step invalide
    }
    return visibleSteps[currentIndex - 1];
  };

  const nextStep = () => {
    if (isReadOnly) {
      toast.info("État des lieux finalisé", {
        description: "Cet état des lieux est finalisé et ne peut plus être modifié.",
      });
      return;
    }
    setCurrentStep((s) => getNextStep(s));
  };

  const prevStep = () => {
    if (isReadOnly) {
      toast.info("État des lieux finalisé", {
        description: "Cet état des lieux est finalisé et ne peut plus être modifié.",
      });
      return;
    }
    setCurrentStep((s) => getPrevStep(s));
  };

  const currentStepIndex = visibleSteps.indexOf(currentStep) + 1;

  // ============================================================================
  // ⭐ Charger le draft existant et hydrater les données Step 1 (nom/prénom) + Step 3/5
  // ============================================================================
  useEffect(() => {
    let cancelled = false;

    async function loadExistingCheckinDraftMoto() {
      if (!bookingId) {
        setIsLoadingDraft(false);
        return;
      }

      console.log("[Moto Draft] 🔍 Recherche d'un draft existant...", bookingId);

      try {
        // ⭐ Charger draft OU completed (pour read-only)
        const { data: existingCheckin, error } = await supabase
          .from("checkin_depart" as any)
          .select("*")
          .eq("booking_id", bookingId)
          .in("status", ["draft", "completed"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("[Moto Draft] ❌ Erreur SELECT checkin_depart:", error);
          if (!cancelled) {
            setIsLoadingDraft(false);
          }
          return;
        }

        if (existingCheckin) {
          const checkin = existingCheckin as any;
          console.log("[Moto Draft] ✅ Draft existant trouvé:", {
            id: checkin?.id,
            created_at: checkin?.created_at,
            updated_at: checkin?.updated_at,
            steps: Object.keys(checkin?.data || {}),
          });

          if (!cancelled) {
            // Initialiser checkinId et checkinStatus
            setCheckinId(checkin.id);
            setCheckinStatus(checkin.status || "draft");
          }

          // Hydrater Step1 (nom/prénom) depuis le draft si présent
          const step1 = checkin.data?.step1;
          const id = step1?.identification;
          if (id) {
            const hasName =
              (typeof id.nom === "string" && id.nom.trim() !== "") ||
              (typeof id.prenom === "string" && id.prenom.trim() !== "");

            if (hasName) {
              if (!cancelled) {
                // Injection fine-grain (évite reset => ne casse pas dirty/touched/errors)
                // Re-check au moment de l’écriture (anti-race si user tape pendant async)
                setConducteurNomIfEmpty(id.nom);
                setConducteurPrenomIfEmpty(id.prenom);

                // Flag après tentative d’injection (évite edge-case "flag true mais rien injecté")
                setHasDraftStep1Name(true);
              }
            }
          }

          // ⭐ Afficher un toast si le check-in est finalisé
          if (checkin.status === "completed") {
            toast.info("État des lieux finalisé", {
              description: "Cet état des lieux est finalisé et ne peut plus être modifié.",
            });
          }

          // Extraire Step 3 (avec mapping inverse zones DB → zones UI moto)
          const step3 = checkin.data?.step3;
          if (step3 && !cancelled) {
            const zonesPhotos = step3.zonesPhotos || {};
            
            // Mapping inverse : DB stocke (droit/gauche) → UI moto veut (cote_droit/cote_gauche)
            const mappedZonesPhotos: Step3MotoData["zonesPhotos"] = {};
            
            if (zonesPhotos.avant) mappedZonesPhotos.avant = zonesPhotos.avant;
            if (zonesPhotos.droit) mappedZonesPhotos.cote_droit = zonesPhotos.droit;
            if (zonesPhotos.arriere) mappedZonesPhotos.arriere = zonesPhotos.arriere;
            if (zonesPhotos.gauche) mappedZonesPhotos.cote_gauche = zonesPhotos.gauche;
            
            // Jantes : DB peut avoir janteAvDroit, janteArDroit, etc. → on agrège en "jantes"
            const jantesPhotos: any[] = [];
            if (zonesPhotos.janteAvDroit) jantesPhotos.push(...zonesPhotos.janteAvDroit);
            if (zonesPhotos.janteArDroit) jantesPhotos.push(...zonesPhotos.janteArDroit);
            if (zonesPhotos.janteAvGauche) jantesPhotos.push(...zonesPhotos.janteAvGauche);
            if (zonesPhotos.janteArGauche) jantesPhotos.push(...zonesPhotos.janteArGauche);
            // Si déjà stocké comme "jantes" (format moto direct)
            if (zonesPhotos.jantes) jantesPhotos.push(...zonesPhotos.jantes);
            
            if (jantesPhotos.length > 0) {
              mappedZonesPhotos.jantes = jantesPhotos;
            }

            setInitialStep3Data({
              zonesPhotos: mappedZonesPhotos,
              completedAt: step3.completedAt,
              degats: step3.degats,
            });

            // ⭐ Hydrater step3ZonesPhotos pour Section8ValidationMoto (sauvegarde avant finalisation)
            if (Object.keys(mappedZonesPhotos).length > 0 && !cancelled) {
              methods.setValue("step3ZonesPhotos" as any, mappedZonesPhotos, {
                shouldDirty: false,
                shouldTouch: false,
                shouldValidate: false,
              });
            }

            console.log("[Moto Draft] ✅ Step 3 hydraté:", {
              zones: Object.keys(mappedZonesPhotos),
              totalPhotos: Object.values(mappedZonesPhotos).flat().length,
            });

            // ⭐ Step 1 : Hydratation damageReports (priorité : damageReports > degats)
            if (!cancelled) {
              let convertedDamageReports: any[] = [];

              // Priorité 1 : Si step3.damageReports existe et est un array → utiliser tel quel
              if (step3.damageReports && Array.isArray(step3.damageReports)) {
                convertedDamageReports = step3.damageReports;
                console.log("[Moto Draft] ✅ damageReports chargé depuis step3.damageReports:", convertedDamageReports.length);
              }
              // Priorité 2 : Sinon, convertir step3.degats → damageReports
              else if (step3.degats && Array.isArray(step3.degats) && step3.degats.length > 0) {
                // Fonction de conversion locale
                const convertDegatsMotoToDamageReports = (degats: any[]): any[] => {
                  return degats.map((degat) => {
                    // Mapping zone moto → side voiture
                    let side: string;
                    switch (degat.zone) {
                      case "avant":
                        side = "avant";
                        break;
                      case "cote_droit":
                        side = "droit";
                        break;
                      case "arriere":
                        side = "arriere";
                        break;
                      case "cote_gauche":
                        side = "gauche";
                        break;
                      case "jantes":
                        side = "janteAvDroit"; // ⚠️ Obligatoire : "jantes" n'est pas un side valide
                        break;
                      default:
                        side = degat.zone || "avant"; // Fallback
                    }

                    return {
                      side,
                      typeDegats: [], // Toujours vide (pas de types prédéfinis dans ancien format)
                      commentaire: degat.description || "",
                      photos: degat.photos || [],
                    };
                  });
                };

                convertedDamageReports = convertDegatsMotoToDamageReports(step3.degats);
                console.log("[Moto Draft] ✅ damageReports converti depuis step3.degats:", convertedDamageReports.length);
              }
              // Priorité 3 : Sinon → [] (déjà initialisé)

              // Hydrater RHF
              if (convertedDamageReports.length > 0) {
                methods.setValue("damageReports", convertedDamageReports, {
                  shouldDirty: false,
                  shouldTouch: false,
                  shouldValidate: false,
                });
                console.log("[Moto Draft] ✅ damageReports hydraté dans RHF:", convertedDamageReports.length, "dégât(s)");
              }
            }
          }

          // Extraire Step 5
          const step5 = checkin.data?.step5;
          if (step5 && !cancelled) {
            setInitialStep5Data({
              accessories: step5.accessories || {},
              photos: step5.photos || [],
              notes: step5.notes,
              completedAt: step5.completedAt,
            });

            console.log("[Moto Draft] ✅ Step 5 hydraté:", {
              accessoriesCount: Object.keys(step5.accessories || {}).length,
              photosCount: (step5.photos || []).length,
            });
          }

          // Vérifier que step4 est bien null (cohérence)
          if (checkin.data?.step4 !== null && checkin.data?.step4 !== undefined) {
            console.warn("[Moto Draft] ⚠️ Step 4 n'est pas null dans le draft, devrait être null pour moto");
          }

          toast.success("Draft chargé", {
            description: "Vos données précédentes ont été restaurées.",
          });
        } else {
          console.log("[Moto Draft] ℹ️ Aucun draft existant");
        }
      } catch (error: any) {
        console.error("[Moto Draft] ❌ Erreur lors du chargement:", error);
        toast.error("Erreur lors du chargement du draft", {
          description: error.message || "Vous pouvez continuer normalement.",
        });
      } finally {
        if (!cancelled) {
          setIsLoadingDraft(false);
        }
      }
    }

    loadExistingCheckinDraftMoto();
    return () => {
      cancelled = true;
    };
  }, [bookingId, methods.getValues, methods.setValue]);

  // ============================================================================
  // ⭐ Pré-remplissage Nom / Prénom conducteur (flow MOTO)
  // Aligne le comportement sur la voiture, sans écraser :
  // - un draft Step1 existant (hasDraftStep1Name)
  // - une saisie utilisateur déjà présente dans le form
  // Ne fait rien en mode read-only (checkinStatus === "completed").
  // ============================================================================
  useEffect(() => {
    let cancelled = false;

    if (!bookingId) return;
    if (checkinStatus === "completed") return; // read-only : ne pas modifier le form
    if (isLoadingDraft) return; // attendre que le draft éventuel soit chargé
    if (hasDraftStep1Name) return; // un draft Step1 avec nom/prénom existe déjà

    (async () => {
      try {
        // 1️⃣ Vérifier si le formulaire a déjà un nom/prénom saisi
        const currentNom = methods.getValues("conducteur.nom");
        const currentPrenom = methods.getValues("conducteur.prenom");
        if (!isBlank(currentNom) || !isBlank(currentPrenom)) return;

        // 2️⃣ Charger la booking pour récupérer le renter (locataire)
        const { data: booking, error: bookingError } = await supabase
          .from("bookings" as any)
          .select("id, user_id")
          .eq("id", bookingId)
          .single();

        const bookingData = booking as any;

        if (bookingError || !bookingData?.user_id) {
          console.warn("[Moto Prefill] Impossible de charger la booking ou renter_id absent:", {
            bookingId,
            bookingError,
          });
          return;
        }

        const renterId = bookingData.user_id as string;

        // 3️⃣ Charger le profil du locataire pour obtenir nom/prénom
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", renterId)
          .single();

        if (profileError || !profile) {
          console.error("[Moto Prefill] Erreur récupération profil locataire:", {
            renterId,
            profileError,
          });
          return;
        }

        if (cancelled) return;

        const profileData = profile as any;
        const lastName =
          typeof profileData.last_name === "string" ? profileData.last_name : "";
        const firstName =
          typeof profileData.first_name === "string" ? profileData.first_name : "";

        // 4️⃣ Re-check + setValue ciblé (anti-overwrite + pas d’impact formState global)
        setConducteurNomIfEmpty(lastName);
        setConducteurPrenomIfEmpty(firstName);
      } catch (error: any) {
        console.error("[Moto Prefill] Exception lors du pré-remplissage conducteur:", error);
        toast.error("Impossible de pré-remplir le conducteur", {
          description: error?.message || "Vous pouvez saisir le nom et le prénom manuellement.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    bookingId,
    checkinStatus,
    isLoadingDraft,
    hasDraftStep1Name,
    methods.getValues,
    methods.setValue,
  ]);

  // ============================================================================
  // ⭐ Pré-remplissage Véhicule (marque/modèle/immatriculation) depuis vehicles table
  // Aligne le comportement sur la voiture, sans écraser :
  // - un draft Step2 existant (vehicule.* déjà présent)
  // - une saisie utilisateur déjà présente dans le form
  // Ne fait rien en mode read-only (checkinStatus === "completed").
  // ============================================================================
  useEffect(() => {
    let cancelled = false;

    if (!bookingId) return;
    if (checkinStatus === "completed") return; // read-only : ne pas modifier le form
    if (isLoadingDraft) return; // attendre que le draft éventuel soit chargé

    (async () => {
      try {
        // 1️⃣ Vérifier si le formulaire a déjà des valeurs véhicule saisies
        const currentMarque = methods.getValues("vehicule.marque");
        const currentModele = methods.getValues("vehicule.modele");
        const currentImmatriculation = methods.getValues("vehicule.immatriculation");
        if (
          !isBlank(currentMarque) ||
          !isBlank(currentModele) ||
          !isBlank(currentImmatriculation)
        ) {
          // Au moins un champ est rempli, on ne pré-remplit pas
          return;
        }

        // 2️⃣ Charger la booking pour récupérer vehicle_id
        const { data: booking, error: bookingError } = await supabase
          .from("bookings" as any)
          .select("id, vehicle_id")
          .eq("id", bookingId)
          .single();

        const bookingData = booking as any;

        if (bookingError || !bookingData?.vehicle_id) {
          console.warn("[Moto Prefill Vehicle] Impossible de charger la booking ou vehicle_id absent:", {
            bookingId,
            bookingError,
          });
          return;
        }

        const vehicleId = bookingData.vehicle_id as string;

        // 3️⃣ Charger le véhicule pour obtenir brand/model/license_plate
        const { data: vehicle, error: vehicleError } = await supabase
          .from("vehicles" as any)
          .select("id, brand, model, license_plate")
          .eq("id", vehicleId)
          .single();

        if (vehicleError || !vehicle) {
          console.warn("[Moto Prefill Vehicle] Erreur récupération véhicule:", {
            vehicleId,
            vehicleError,
          });
          return;
        }

        if (cancelled) return;

        const vehicleData = vehicle as any;
        const brand = typeof vehicleData.brand === "string" ? vehicleData.brand : "";
        const model = typeof vehicleData.model === "string" ? vehicleData.model : "";
        const licensePlate =
          typeof vehicleData.license_plate === "string" ? vehicleData.license_plate : "";

        // 4️⃣ Re-check + setValue ciblé (anti-overwrite + pas d'impact formState global)
        setVehiculeMarqueIfEmpty(brand);
        setVehiculeModeleIfEmpty(model);
        setVehiculeImmatriculationIfEmpty(licensePlate);

        if (brand || model || licensePlate) {
          console.log("[Moto Prefill Vehicle] ✅ Champs véhicule injectés:", {
            marque: brand || "(vide)",
            modele: model || "(vide)",
            immatriculation: licensePlate || "(vide)",
          });
        }
      } catch (error: any) {
        console.error("[Moto Prefill Vehicle] Exception lors du pré-remplissage véhicule:", error);
        // Ne pas afficher de toast pour éviter le spam, juste log
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    bookingId,
    checkinStatus,
    isLoadingDraft,
    methods.getValues,
    methods.setValue,
  ]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Section1IdentificationMoto
            key="step-1-identification"
            onComplete={nextStep}
            bookingId={bookingId}
            bookingReferenceNumber={bookingReferenceNumber}
            ownerId={null}
            renterId={null}
            checkinId={checkinId}
            onCheckinIdChange={setCheckinId}
            isReadOnly={isReadOnly}
          />
        );
      case 2:
        return (
          <Section2RelevesMoto
            key="step-2-releves"
            onComplete={nextStep}
            bookingId={bookingId}
            bookingReferenceNumber={bookingReferenceNumber}
            ownerId={null}
            renterId={null}
            checkinId={checkinId}
            onCheckinIdChange={setCheckinId}
            missingFieldsSet={missingFieldsSet}
            missingFieldsList={missingFieldsList}
            onNavigateToMissingField={(target) => {
              if (target?.step) {
                const targetStep = target.step === 4 ? 5 : target.step;
                setCurrentStep(targetStep);
              }
              if (target?.anchor) {
                setPendingAnchor(target.anchor);
              }
            }}
            isReadOnly={isReadOnly}
          />
        );
      case 3:
        return (
          <Section3ExterieurMoto
            key="step-3-exterieur"
            bookingId={bookingId}
            bookingReferenceNumber={bookingReferenceNumber}
            ownerId={null}
            renterId={null}
            checkinId={checkinId}
            onCheckinIdChange={setCheckinId}
            onComplete={nextStep}
            initialData={initialStep3Data}
            isReadOnly={isReadOnly}
          />
        );
      case 5:
        return (
          <Section5AccessoiresMoto
            key="step-5-accessoires"
            bookingId={bookingId}
            bookingReferenceNumber={bookingReferenceNumber}
            ownerId={null}
            renterId={null}
            checkinId={checkinId}
            onCheckinIdChange={setCheckinId}
            onComplete={nextStep}
            initialData={initialStep5Data}
            isReadOnly={isReadOnly}
          />
        );
      case 6:
        return (
          <Section6RemarquesMoto
            key="step-6-remarques"
            bookingId={bookingId || ""}
            ownerId={null}
            renterId={null}
            checkinId={checkinId}
            onCheckinIdChange={setCheckinId}
            onComplete={nextStep}
            isReadOnly={isReadOnly}
          />
        );
      case 7:
        return (
          <Section8ValidationMoto
            key="step-7-validation"
            onInvalidStepsChange={setInvalidSteps}
            onMissingFieldsChange={(fields) => {
              setMissingFieldsSet(new Set(fields));
              setMissingFieldsList(fields);
            }}
            onNavigateToMissingField={(target) => {
              if (target?.step) {
                // S'assurer qu'on ne navigue jamais vers Step 4
                const targetStep = target.step === 4 ? 5 : target.step;
                setCurrentStep(targetStep);
              }
              if (target?.anchor) {
                setPendingAnchor(target.anchor);
              }
            }}
            bookingId={bookingId}
            ownerId={null}
            renterId={null}
            checkinId={checkinId}
            onCheckinIdChange={(id, status) => {
              setCheckinId(id);
              if (status) {
                setCheckinStatus(status);
              }
              // Charger le status depuis Supabase si non fourni
              if (id && !status) {
                (async () => {
                  try {
                    const result: any = await supabase.from("checkin_depart" as any).select("status").eq("id", id).single();
                    if (result.data) {
                      setCheckinStatus(result.data.status);
                    } else if (result.error) {
                      console.error("[EtatDesLieuxDepartFormMoto] ❌ Erreur chargement checkin:", result.error);
                      if (result.error.code === "PGRST116" || result.error.message.includes("not found")) {
                        console.warn("[EtatDesLieuxDepartFormMoto] ⚠️ Checkin supprimé, réinitialisation...");
                        setCheckinId(null);
                        setCheckinStatus("draft");
                      }
                    }
                  } catch (error: any) {
                    console.error("[EtatDesLieuxDepartFormMoto] ❌ Exception chargement checkin:", error);
                  }
                })();
              }
            }}
            isCheckinCompleted={isReadOnly}
            onComplete={() => {
              console.log("[Moto] ✅ État des lieux finalisé avec succès");
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <FormProvider {...methods}>
      <div className="space-y-6">
      {/* Barre de progression */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm font-medium">
            <span className="text-muted-foreground">
              Étape {currentStepIndex} sur {visibleSteps.length}
            </span>
            <span className="text-primary font-semibold">
              {Math.round((currentStepIndex / visibleSteps.length) * 100)}%
            </span>
          </div>
          <Progress value={(currentStepIndex / visibleSteps.length) * 100} className="h-2" />
          <div className="flex justify-between items-center text-xs">
            {visibleSteps.map((stepId) => {
              const stepIndex = visibleSteps.indexOf(stepId) + 1;
              const isCurrent = stepId === currentStep;
              const isCompleted = visibleSteps.indexOf(stepId) < visibleSteps.indexOf(currentStep);

              return (
                <div
                  key={stepId}
                    className={cn(
                      "flex flex-col items-center flex-1",
                      isCurrent && "text-primary font-semibold",
                      invalidSteps.has(stepId) && "text-destructive",
                      isCompleted && "text-success",
                      !isCurrent && !isCompleted && "text-muted-foreground"
                    )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-all",
                      isCurrent &&
                        "bg-primary text-primary-foreground shadow-lg scale-110",
                      invalidSteps.has(stepId) &&
                        "ring-2 ring-destructive ring-offset-2",
                      isCompleted &&
                        "bg-success text-success-foreground",
                      !isCurrent && !isCompleted &&
                        "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      stepIndex
                    )}
                  </div>
                  <span className="text-center text-[10px] leading-tight hidden sm:block">
                    {stepLabels[stepId]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Étape actuelle */}
      <Card className="shadow-card">
        <CardContent className="p-6">
          {/* ⭐ Wrapper avec key stable pour forcer un remount propre lors du changement de step */}
          {/* Cela évite les erreurs removeChild lors du démontage de Step 1 → Step 2 */}
          <div key={`step-content-${currentStep}`}>
            {renderStep()}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      {!isReadOnly && (
        <div className="flex justify-between gap-4">
          {currentStepIndex > 1 ? (
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
          {currentStepIndex < visibleSteps.length && currentStep !== 3 ? (
            <Button
              type="button"
              onClick={nextStep}
              className="ml-auto flex items-center gap-2"
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : currentStep === 3 ? (
            /* Step 3 : seul le bouton dans Section3ExterieurMoto permet d'avancer (force la sauvegarde) */
            <div />
          ) : (
            <Button
              type="button"
              className="ml-auto flex items-center gap-2"
              disabled
            >
              Validation (à venir)
            </Button>
          )}
        </div>
      )}
      {isReadOnly && (
        <Card className="border-2 border-blue-500 bg-blue-50">
          <CardContent className="py-4 text-center">
            <p className="text-sm font-medium text-blue-800">
              ✅ Cet état des lieux a été finalisé et est maintenant verrouillé.
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Vous pouvez consulter les informations mais ne plus les modifier.
            </p>
          </CardContent>
        </Card>
      )}
      </div>
    </FormProvider>
  );
}
