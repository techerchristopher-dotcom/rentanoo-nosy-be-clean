import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { SupabaseCheckinService } from "@/services/supabaseCheckinService";
import { checkinReturnService } from "@/services/checkinReturnService";
import { type CheckinReturn } from "@/services/supabaseCheckinReturnService";
import { supabase } from "@/integrations/supabase/client";
import { FinalizeCheckinProgressModal } from "@/components/checkin/FinalizeCheckinProgressModal";

import Step1DepartRecap from "./steps/Step1DepartRecap";
import Step2RelevesRetour from "./steps/Step2RelevesRetour";
import Step3ExterieurRetour from "./steps/Step3ExterieurRetour";
import Step4InterieurRetour from "./steps/Step4InterieurRetour";
import Step5AccessoiresRetour from "./steps/Step5AccessoiresRetour";
import Step6RemarquesRetour from "./steps/Step6RemarquesRetour";
import Step7ValidationRetour from "./steps/Step7ValidationRetour";

type FormValues = {
  departData: any;
  returnData: any;
};

const steps = [
  { id: 1, label: "Récap départ", component: Step1DepartRecap },
  { id: 2, label: "Relevés retour", component: Step2RelevesRetour },
  { id: 3, label: "Extérieur retour", component: Step3ExterieurRetour },
  { id: 4, label: "Intérieur retour", component: Step4InterieurRetour },
  { id: 5, label: "Accessoires retour", component: Step5AccessoiresRetour },
  { id: 6, label: "Remarques retour", component: Step6RemarquesRetour },
  { id: 7, label: "Validation retour", component: Step7ValidationRetour },
];

interface EtatDesLieuxRetourFormProps {
  bookingId?: string;
}

export default function EtatDesLieuxRetourForm({ bookingId }: EtatDesLieuxRetourFormProps) {
  const navigate = useNavigate();
  const methods = useForm<FormValues>({
    defaultValues: {
      departData: {},
      returnData: {},
    },
    mode: "onChange",
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkinReturn, setCheckinReturn] = useState<CheckinReturn | null>(null);
  const [departStatus, setDepartStatus] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [renterId, setRenterId] = useState<string | null>(null);
  const [bookingData, setBookingData] = useState<{ startDate?: string; endDate?: string; startTime?: string; endTime?: string; referenceNumber?: number | null } | null>(null);
  const [vehicleType, setVehicleType] = useState<string | null>(null);

  // États pour la modale de progression de finalisation du retour
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizeProgress, setFinalizeProgress] = useState(0);
  const [finalizeLabel, setFinalizeLabel] = useState("");
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  // Verrous autosave (fire-and-forget, anti-concurrence)
  const autoSaveLocksStep3 = useRef<Record<string, boolean>>({});
  const autoSaveLockStep4 = useRef(false);

  const totalSteps = steps.length;

  useEffect(() => {
    const loadData = async () => {
      if (!bookingId) {
        setError("Aucun bookingId fourni pour l'état des lieux de retour.");
        setLoading(false);
        return;
      }
      try {
        // 1) Charger le checkin_depart par booking
        const { data: depart, error: departError } = await SupabaseCheckinService.getCheckinByBookingId(bookingId);
        if (departError) {
          setError(departError);
          setLoading(false);
          return;
        }
        setOwnerId(depart?.owner_id || null);
        setRenterId(depart?.renter_id || null);
        setDepartStatus(depart?.status || null);

        // 1.5) Charger les données de booking pour les dates et reference_number
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .select('start_date, end_date, start_time, end_time, reference_number, vehicle_id')
          .eq('id', bookingId)
          .single();
        
        if (!bookingError && booking) {
          setBookingData({
            startDate: booking.start_date || undefined,
            endDate: booking.end_date || undefined,
            startTime: booking.start_time || undefined,
            endTime: booking.end_time || undefined,
            referenceNumber: booking.reference_number || null,
          });

          // Détection locale du type de véhicule pour le wizard retour
          if (booking.vehicle_id) {
            const { data: vehicle, error: vehicleError } = await supabase
              .from("vehicles" as any)
              .select("vehicle_type")
              .eq("id", booking.vehicle_id)
              .single();

            if (!vehicleError && vehicle) {
              setVehicleType((vehicle as any).vehicle_type || null);
            }
          }
        }

        // 2) Charger / créer le checkin_return draft
        const { data: retour, error: retourError } = await checkinReturnService.createOrGetCheckinReturn({
          bookingId,
          ownerId: depart?.owner_id || null,
          renterId: depart?.renter_id || null,
          checkinDepartId: depart?.id || "",
        });
        if (retourError) {
          setError(retourError);
          setLoading(false);
          return;
        }
        setCheckinReturn(retour || null);

        // 3) Hydrater le formulaire (departData read-only, returnData brouillon)
        //    ⚠️ Pour les relevés de départ (kilométrage, niveau de carburant),
        //    on fait confiance en priorité aux colonnes SQL `kilometrage_depart` et `niveau_carburant`
        //    qui sont déjà alimentées côté checkin_depart, avec fallback sur le JSON step2.releves.
        const baseDepartData = (depart as any)?.data || {};
        const step2FromData = baseDepartData.step2 || {};
        const relevesFromData = step2FromData.releves || {};

        const kilometrageFromSql = (depart as any)?.kilometrage_depart;
        const carburantFromSql = (depart as any)?.niveau_carburant;

        const mergedReleves = {
          ...relevesFromData,
          ...(kilometrageFromSql != null ? { kilometrage: kilometrageFromSql } : {}),
          ...(carburantFromSql != null ? { niveauCarburant: carburantFromSql } : {}),
        };

        const enhancedDepartData = {
          ...baseDepartData,
          step2: {
            ...step2FromData,
            releves: mergedReleves,
          },
        };

        methods.reset({
          departData: enhancedDepartData,
          returnData: retour?.data || {},
        });
      } catch (err: any) {
        setError(err?.message || "Erreur inattendue lors du chargement des données.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const CurrentStepComponent = useMemo(() => {
    const stepDef = steps.find((s) => s.id === currentStep);
    return stepDef?.component || null;
  }, [currentStep]);

  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));
  const goToStep = (stepNumber: number) => {
    setCurrentStep(() => {
      if (stepNumber < 1) return 1;
      if (stepNumber > totalSteps) return totalSteps;
      return stepNumber;
    });
  };

  const handleAutoSaveStep3 = useCallback(
    async (zoneKey: string) => {
      if (autoSaveLocksStep3.current[zoneKey]) return;
      const checkinDepartId = checkinReturn?.checkin_depart_id;
      const checkinReturnId = checkinReturn?.id;
      if (!bookingId || !checkinDepartId || !checkinReturnId || !ownerId || !renterId) return;

      autoSaveLocksStep3.current[zoneKey] = true;
      try {
        const section = methods.getValues(`returnData.step3.sections.${zoneKey}`) || {};
        const sectionPayload = {
          isSameAsDepart: !!section.isSameAsDepart,
          newDamages: Array.isArray(section.newDamages) ? section.newDamages : [],
        };
        const { error: saveError } = await checkinReturnService.saveReturnStep3Section({
          bookingId,
          checkinDepartId,
          checkinReturnId,
          ownerId,
          renterId,
          sectionKey: zoneKey,
          sectionPayload,
        });
        if (saveError) console.warn("[EtatDesLieuxRetourForm] Autosave step3:", saveError);
      } catch (err: any) {
        console.warn("[EtatDesLieuxRetourForm] Autosave step3 (non-bloquant):", err?.message);
      } finally {
        autoSaveLocksStep3.current[zoneKey] = false;
      }
    },
    [bookingId, checkinReturn?.checkin_depart_id, checkinReturn?.id, ownerId, renterId, methods]
  );

  const handleAutoSaveStep4 = useCallback(
    async () => {
      if (autoSaveLockStep4.current) return;
      const checkinDepartId = checkinReturn?.checkin_depart_id;
      const checkinReturnId = checkinReturn?.id;
      if (!bookingId || !checkinDepartId || !checkinReturnId || !ownerId || !renterId) return;

      autoSaveLockStep4.current = true;
      try {
        const interior = methods.getValues("returnData.step4.interior") || {};
        const interiorPayload = {
          isSameAsDepart: interior.isSameAsDepart !== false,
          newDamages: Array.isArray(interior.newDamages) ? interior.newDamages : [],
        };
        const { error: saveError } = await checkinReturnService.saveReturnStep4Interior({
          bookingId,
          checkinDepartId,
          checkinReturnId,
          ownerId,
          renterId,
          interiorPayload,
        });
        if (saveError) console.warn("[EtatDesLieuxRetourForm] Autosave step4:", saveError);
      } catch (err: any) {
        console.warn("[EtatDesLieuxRetourForm] Autosave step4 (non-bloquant):", err?.message);
      } finally {
        autoSaveLockStep4.current = false;
      }
    },
    [bookingId, checkinReturn?.checkin_depart_id, checkinReturn?.id, ownerId, renterId, methods]
  );

  const handleNextFromStep2 = async () => {
    if (!bookingId) {
      setError("Aucun bookingId fourni.");
      return;
    }
    const checkinDepartId = checkinReturn?.checkin_depart_id;
    const checkinReturnId = checkinReturn?.id || undefined;
    if (!checkinDepartId) {
      setError("Impossible de déterminer le checkin_depart associé.");
      return;
    }

    setIsSaving(true);
    try {
    const releves = methods.getValues("returnData.step2.releves") || {};
    const step2Payload = {
      releves: {
        kilometrageRetour: releves?.kilometrageRetour ?? null,
        niveauCarburantRetour: releves?.niveauCarburantRetour ?? null,
        dashboardPhotosRetour: releves?.dashboardPhotosRetour || [],
      },
    };

    const { error: saveError } = await checkinReturnService.saveReturnStep2Releves({
      bookingId,
      ownerId,
      renterId,
      checkinDepartId,
      checkinReturnId,
      step2Payload,
    });

    if (saveError) {
      setError(saveError);
      return;
    }

    setError(null);
    goToStep(3);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextFromStep3 = async () => {
    if (!bookingId) {
      setError("Aucun bookingId fourni.");
      return;
    }
    const checkinDepartId = checkinReturn?.checkin_depart_id;
    const checkinReturnId = checkinReturn?.id || undefined;
    if (!checkinDepartId) {
      setError("Impossible de déterminer le checkin_depart associé.");
      return;
    }

    setIsSaving(true);
    try {
    const sections = methods.getValues("returnData.step3.sections") || {};

      // Zones extérieures selon le type de véhicule.
      // Pour la VOITURE : conserver exactement la liste et l'ordre actuels.
      // Pour la MOTO : utiliser les zones moto sans "coffre", en réutilisant les mêmes keys.
      const isMoto = vehicleType === "moto";
      const zoneKeys = isMoto
        ? [
            "avant",
            "droit",
            "arriere",
            "gauche",
            "janteAvDroit",
            "janteArDroit",
            "janteAvGauche",
            "janteArGauche",
          ]
        : [
      "avant",
      "droit",
      "arriere",
      "gauche",
      "coffre",
      "janteAvDroit",
      "janteArDroit",
      "janteAvGauche",
      "janteArGauche",
    ];

      for (const zoneKey of zoneKeys) {
        const section = sections?.[zoneKey];
        if (!section) continue;

        const sectionPayload = {
          isSameAsDepart: !!section.isSameAsDepart,
          newDamages: Array.isArray(section.newDamages) ? section.newDamages : [],
        };

        const { error: saveError } = await checkinReturnService.saveReturnStep3Section({
          bookingId,
          checkinDepartId,
          checkinReturnId,
          ownerId,
          renterId,
          sectionKey: zoneKey,
          sectionPayload,
        });

        if (saveError) {
          throw new Error(saveError);
        }
      }

      setError(null);
      goToStep(4);
    } catch (e: any) {
      setError(e?.message || "Erreur lors de la sauvegarde des sections extérieures.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextFromStep4 = async () => {
    if (!bookingId) {
      setError("Aucun bookingId fourni.");
      return;
    }
    const checkinDepartId = checkinReturn?.checkin_depart_id;
    const checkinReturnId = checkinReturn?.id || undefined;
    if (!checkinDepartId) {
      setError("Impossible de déterminer le checkin_depart associé.");
      return;
    }

    setIsSaving(true);
    try {
    const interior = methods.getValues("returnData.step4.interior") || {};
    const interiorPayload = {
      isSameAsDepart: interior.isSameAsDepart !== false,
      newDamages: Array.isArray(interior.newDamages) ? interior.newDamages : [],
    };

    if (checkinReturnService.saveReturnStep4Interior) {
      const { error: saveError } = await checkinReturnService.saveReturnStep4Interior({
        bookingId,
        ownerId,
        renterId,
        checkinDepartId,
        checkinReturnId,
        interiorPayload,
      });
      if (saveError) {
        setError(saveError);
        return;
      }
    } else {
      // TODO: Implémenter saveReturnStep4Interior dans le service métier
      console.warn("[EtatDesLieuxRetourForm] saveReturnStep4Interior non implémenté");
    }

    setError(null);
    goToStep(5);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextFromStep5 = async () => {
    if (!bookingId) {
      setError("Aucun bookingId fourni.");
      return;
    }
    const checkinDepartId = checkinReturn?.checkin_depart_id;
    const checkinReturnId = checkinReturn?.id || undefined;
    if (!checkinDepartId) {
      setError("Impossible de déterminer le checkin_depart associé.");
      return;
    }

    setIsSaving(true);
    try {
    const accessoiresRetour = methods.getValues("returnData.step5.accessoiresRetour") || {};
    const accessoiresPayload = {
      isSameAsDepart: accessoiresRetour.isSameAsDepart !== false,
      accessoires: accessoiresRetour.accessoires || {},
      commentaire: accessoiresRetour.commentaire || "",
    };

    const { error: saveError } = await checkinReturnService.saveReturnStep5Accessoires({
      bookingId,
      ownerId,
      renterId,
      checkinDepartId,
      checkinReturnId,
      accessoiresPayload,
    });

    if (saveError) {
      setError(saveError);
      return;
    }

    setError(null);
    goToStep(6);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextFromStep6 = async () => {
    if (!bookingId) {
      setError("Aucun bookingId fourni.");
      return;
    }
    const checkinDepartId = checkinReturn?.checkin_depart_id;
    const checkinReturnId = checkinReturn?.id || undefined;
    if (!checkinDepartId) {
      setError("Impossible de déterminer le checkin_depart associé.");
      return;
    }

    setIsSaving(true);
    try {
    const remarquesRetour = methods.getValues("returnData.step6.remarquesRetour") || {};
    const remarquesPayload = {
      observations: remarquesRetour.observations || "",
      observationsOwner: remarquesRetour.observationsOwner || "",
      observationsRenter: remarquesRetour.observationsRenter || "",
    };

    const { error: saveError } = await checkinReturnService.saveReturnStep6Remarques({
      bookingId,
      ownerId,
      renterId,
      checkinDepartId,
      checkinReturnId,
      remarquesPayload,
    });

    if (saveError) {
      setError(saveError);
      return;
    }

    setError(null);
    goToStep(7);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalizeReturn = async () => {
    if (!bookingId) {
      setError("Aucun bookingId fourni.");
      return;
    }
    const checkinDepartId = checkinReturn?.checkin_depart_id;
    const checkinReturnId = checkinReturn?.id;
    if (!checkinDepartId) {
      setError("Impossible de déterminer le checkin_depart associé.");
      return;
    }
    if (!checkinReturnId) {
      setError("Impossible de déterminer le checkin_return à finaliser.");
      return;
    }

    // Récupérer les données de validation depuis RHF
    const validation = methods.getValues("returnData.step7.validation") || {};
    
    // Vérifier que les signatures sont présentes
    if (!validation.ownerSignature || !validation.renterSignature) {
      setError("Les deux signatures (propriétaire et locataire) sont requises pour finaliser.");
      return;
    }

    // Construire le payload Step 7
    const nowIso = new Date().toISOString();
    const step7Payload = {
      completedAt: nowIso,
      validation: {
        ownerSignature: validation.ownerSignature || null,
        renterSignature: validation.renterSignature || null,
        validatedAt: validation.validatedAt || nowIso,
      },
    };

    try {
      // Ouvrir la modale de progression
      setShowFinalizeModal(true);
      setFinalizeProgress(10);
      setFinalizeLabel("Préparation des données…");
      setFinalizeError(null);

      // Étape 1 : enregistrement des signatures
      setFinalizeProgress(30);
      setFinalizeLabel("Enregistrement des signatures…");

      // Appeler le service de finalisation (snapshot légal + éventuels documents)
      const { error: finalizeError, snapshotError } = await checkinReturnService.finalizeCheckinReturn({
        checkinReturnId,
        bookingId,
        ownerId,
        renterId,
        step7Payload,
      });

      // Étape 2 : création du snapshot légal (coté service)
      setFinalizeProgress(70);
      setFinalizeLabel("Création du snapshot légal…");

      if (finalizeError) {
        setError(finalizeError);
        setFinalizeError(finalizeError);
        setFinalizeProgress(100);
        setFinalizeLabel("Erreur lors de la finalisation");
        return;
      }

      // Gérer les erreurs non bloquantes (snapshot)
      if (snapshotError) {
        console.warn("[EtatDesLieuxRetourForm] ⚠️ Erreur snapshot lors de la finalisation:", snapshotError);
        // Ne pas bloquer la finalisation pour une erreur de snapshot
      }

      setError(null);
      
      // Mettre à jour le state local pour refléter le statut completed
      if (checkinReturn) {
        setCheckinReturn({
          ...checkinReturn,
          status: "completed",
        });
      }

      // Étape 3 : génération des documents (PDF, emails éventuels)
      setFinalizeProgress(90);
      setFinalizeLabel("Génération des documents…");

      // Laisser le temps de voir la progression puis terminer à 100%
      await new Promise((resolve) => setTimeout(resolve, 500));
      setFinalizeProgress(100);
      setFinalizeLabel("État des lieux de retour finalisé avec succès");

      // Fermer la modale après un court délai pour laisser voir le succès
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setShowFinalizeModal(false);
      setFinalizeProgress(0);
      setFinalizeLabel("");
      setFinalizeError(null);

      console.log("[EtatDesLieuxRetourForm] ✅ État des lieux de retour finalisé avec succès");

      // Redirection vers la page d'accueil du site
      navigate("/");
    } catch (error: any) {
      console.error("[EtatDesLieuxRetourForm] ❌ Erreur lors de la finalisation:", error);
      setError(error?.message || "Erreur inattendue lors de la finalisation.");
      setFinalizeError(error?.message || "Erreur inattendue lors de la finalisation.");
      setFinalizeProgress(100);
      setFinalizeLabel("Erreur lors de la finalisation");
    }
  };

  const handleCloseFinalizeModal = () => {
    setShowFinalizeModal(false);
    setFinalizeProgress(0);
    setFinalizeLabel("");
    setFinalizeError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full py-8 flex items-center justify-center">
        <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="mx-auto mb-1 h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <p className="text-sm sm:text-base text-muted-foreground text-center">
              Chargement de l'état des lieux de retour…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full py-8">
        <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="text-destructive text-center">Erreur : {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      <FormProvider {...methods}>
        {/* Wrapper centré pour tout le wizard */}
        <div className="w-full py-4 sm:py-6">
          <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 md:px-6 space-y-4 sm:space-y-6">
          {/* Header du wizard */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold">État des lieux de retour</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Étape {currentStep} sur {totalSteps}
              </p>
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              Checkin retour ID : {checkinReturn?.id || "non créé"}
            </div>
          </div>

          {/* Message d'erreur global */}
          {error && (
            <div className="p-3 sm:p-4 border border-destructive/50 rounded-md bg-destructive/10 text-destructive text-xs sm:text-sm">
              {error}
            </div>
          )}

          {/* Contenu du step actuel - chaque step a déjà son propre conteneur centré */}
          {CurrentStepComponent ? (
            <CurrentStepComponent
              departData={methods.watch("departData")}
              returnData={methods.watch("returnData")}
              setValue={methods.setValue}
              watch={methods.watch}
              departStatus={departStatus || undefined}
              checkinReturnStatus={checkinReturn?.status}
              bookingData={bookingData || undefined}
              bookingId={bookingId}
              vehicleType={vehicleType || null}
              onStartReturn={() => goToStep(2)}
              onAutoSaveStep3={handleAutoSaveStep3}
              onAutoSaveStep4={handleAutoSaveStep4}
            />
          ) : (
            <div className="text-center p-8 text-muted-foreground">Étape inconnue</div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between gap-3 sm:gap-4 pt-2 border-t">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={
                currentStep === 2
                  ? handleNextFromStep2
                  : currentStep === 3
                    ? handleNextFromStep3
                    : currentStep === 4
                      ? handleNextFromStep4
                      : currentStep === 5
                        ? handleNextFromStep5
                        : currentStep === 6
                          ? handleNextFromStep6
                          : currentStep === 7
                            ? handleFinalizeReturn
                            : nextStep
              }
              disabled={(currentStep === totalSteps && checkinReturn?.status === "completed") || isSaving}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm border rounded-md transition-colors flex items-center justify-center gap-2 ${
                currentStep === 7 && checkinReturn?.status === "completed"
                  ? "bg-green-600 text-white border-green-600"
                  : "hover:bg-primary hover:text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  <span>Sauvegarde en cours...</span>
                </>
              ) : currentStep === 7 ? (
                checkinReturn?.status === "completed"
                  ? "État des lieux finalisé"
                  : "Finaliser l'état des lieux de retour"
              ) : (
                "Suivant"
              )}
            </button>
          </div>
          </div>
        </div>

        {/* Modale de progression pour la finalisation de l'état des lieux de retour */}
        <FinalizeCheckinProgressModal
          open={showFinalizeModal}
          progress={finalizeProgress}
          label={finalizeLabel}
          error={finalizeError}
          onClose={handleCloseFinalizeModal}
        />
      </FormProvider>
    </div>
  );
}

