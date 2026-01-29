import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { finalizeCheckinDepart, saveStep2Draft, type Step2Payload } from "@/services/checkinDepartService";
import { useFormContext } from "react-hook-form";
import { SignatureCanvas } from "@/components/checkin/SignatureCanvas";
import { SupabaseCheckinService } from "@/services/supabaseCheckinService";

interface Section8ValidationMotoProps {
  onInvalidStepsChange?: (steps: Set<number>) => void;
  onMissingFieldsChange?: (fields: string[]) => void;
  onNavigateToMissingField?: (target: { step: number; anchor?: string | null; fieldKey: string }) => void;
  bookingId?: string;
  ownerId?: string | null;
  renterId?: string | null;
  checkinId?: string | null;
  onCheckinIdChange?: (checkinId: string, status?: string) => void;
  isCheckinCompleted?: boolean;
  onComplete?: () => void;
}

// Mapping champ → step (sans Step 4)
// ⚠️ IMPORTANT : Step 4 est totalement ignoré pour moto
function computeInvalidStepsFromMissingFields(missing: string[]): Set<number> {
  const invalid = new Set<number>();
  for (const m of missing) {
    const label = m.toLowerCase();
    if (label.startsWith("conducteur") || label.startsWith("propriétaire")) {
      invalid.add(1); // Identification
    }
    if (label.startsWith("véhicule") || label.startsWith("relevés")) {
      invalid.add(2); // Relevés
    }
    if (label.includes("extérieur") || label.includes("zone")) {
      invalid.add(3); // Extérieur moto
    }
    // Step 4 ignoré complètement - AUCUNE validation pour Step 4
    if (label.includes("accessoire")) {
      invalid.add(5); // Accessoires
    }
    if (label.includes("remarque")) {
      invalid.add(6); // Remarques
    }
    if (label.includes("signature")) {
      invalid.add(7); // Validation & Signature
    }
  }
  // S'assurer que Step 4 n'est JAMAIS dans invalidSteps (sécurité)
  invalid.delete(4);
  return invalid;
}

export function Section8ValidationMoto({
  onInvalidStepsChange,
  onMissingFieldsChange,
  onNavigateToMissingField,
  bookingId,
  ownerId,
  renterId,
  checkinId,
  onCheckinIdChange,
  isCheckinCompleted = false,
  onComplete,
}: Section8ValidationMotoProps) {
  const { watch, setValue, getValues } = useFormContext();

  const ownerSignature = watch("ownerSignature");
  const driverSignature = watch("driverSignature");

  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    missingFields: string[];
  }>({
    isValid: false,
    missingFields: [],
  });
  const [isFinalizing, setIsFinalizing] = useState(false);

  const checkValidationData = (showToast: boolean = false) => {
    const missing: string[] = [];

    // Validation des signatures (copie conforme voiture)
    if (!ownerSignature) missing.push("Signature du propriétaire");
    if (!driverSignature) missing.push("Signature du locataire");

    const isValid = missing.length === 0;

    setValidationStatus({ isValid, missingFields: missing });

    if (onMissingFieldsChange) {
      onMissingFieldsChange(missing);
    }

    // Propager les steps invalides (sans Step 4)
    if (onInvalidStepsChange) {
      const invalidSteps = computeInvalidStepsFromMissingFields(missing);
      onInvalidStepsChange(invalidSteps);
    }

    if (showToast) {
      if (isValid) {
        toast.success("Toutes les données sont bien chargées, prêtes pour validation ✅");
      } else {
        toast.error(`Validation incomplète : ${missing.length} champ(s) manquant(s)`, {
          description: missing.slice(0, 5).join(", ") + (missing.length > 5 ? "..." : ""),
        });
      }
    }

    return { isValid, missingFields: missing };
  };

  // Navigation vers le premier champ manquant (en sautant Step 4)
  const navigateToFirstMissing = (missingFields: string[]) => {
    if (missingFields.length === 0) return;

    const firstMissing = missingFields[0];
    const label = firstMissing.toLowerCase();

    let targetStep: number | null = null;
    let anchor: string | null = null;

    if (label.startsWith("conducteur") || label.startsWith("propriétaire")) {
      targetStep = 1;
    } else if (label.startsWith("véhicule") || label.startsWith("relevés")) {
      targetStep = 2;
    } else if (label.includes("extérieur") || label.includes("zone")) {
      targetStep = 3;
    } else if (label.includes("accessoire")) {
      targetStep = 5;
    } else if (label.includes("remarque")) {
      targetStep = 6;
    } else if (label.includes("signature")) {
      targetStep = 7;

      if (label.includes("signature du propriétaire")) {
        anchor = "field-signature-owner";
      } else if (label.includes("signature du locataire")) {
        anchor = "field-signature-driver";
      }
    }

    // ⚠️ SÉCURITÉ : S'assurer qu'on ne navigue JAMAIS vers Step 4
    // Si par erreur targetStep serait 4, on saute vers Step 5
    if (targetStep === 4) {
      console.warn("[Moto Validation] Tentative de navigation vers Step 4 ignorée, redirection vers Step 5");
      targetStep = 5;
    }

    if (targetStep && onNavigateToMissingField) {
      onNavigateToMissingField({
        step: targetStep,
        anchor,
        fieldKey: firstMissing,
      });
    }
  };

  // Vérification automatique au chargement
  useEffect(() => {
    checkValidationData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = validationStatus.isValid;

  const handleFinalize = async () => {
    // ⚠️ Protection : ne pas finaliser si déjà completed
    if (isCheckinCompleted) {
      toast.error("État des lieux finalisé", {
        description: "Cet état des lieux est finalisé et ne peut plus être modifié.",
      });
      return;
    }

    if (!canSubmit) {
      checkValidationData(true);
      if (validationStatus.missingFields.length > 0) {
        navigateToFirstMissing(validationStatus.missingFields);
      }
      return;
    }

    // ⚠️ Protection anti double-clic
    if (isFinalizing) {
      console.warn("[Moto Validation] Finalisation déjà en cours, ignore le clic");
      return;
    }

    if (!bookingId || !checkinId) {
      toast.error("Erreur: ID de réservation ou check-in manquant.");
      return;
    }

    setIsFinalizing(true);

    try {
      console.log("[Moto Validation] 🎯 Démarrage finalisation...");

      // ============================================================================
      // ⭐ PHASE 2 : Garantir persistance Step2 (vehicule.*) avant snapshot
      // ============================================================================
      const isBlankString = (v: unknown) => typeof v !== "string" || v.trim() === "";

      // 1️⃣ Lire le checkin DB pour vérifier si Step2 existe et contient vehicule.*
      let existingStep2: any = null;
      let needsStep2Save = false;

      if (checkinId) {
        try {
          const { data: existingCheckin, error: checkinError } =
            await SupabaseCheckinService.getCheckinById(checkinId);

          if (!checkinError && existingCheckin?.data) {
            existingStep2 = existingCheckin.data.step2;
            const existingVehicule = existingStep2?.vehicule || {};

            // Vérifier si Step2 est absent ou si vehicule.* est vide
            if (
              !existingStep2 ||
              !existingVehicule ||
              isBlankString(existingVehicule.marque) ||
              isBlankString(existingVehicule.modele) ||
              isBlankString(existingVehicule.immatriculation)
            ) {
              needsStep2Save = true;
              console.log("[Moto Validation] Step2 missing or vehicule empty → saving minimal Step2 before finalize");
            } else {
              console.log("[Moto Validation] Step2 already present with vehicule data → skip save");
            }
          } else {
            // Si erreur de lecture, on assume qu'il faut sauvegarder (safe fallback)
            needsStep2Save = true;
            console.warn("[Moto Validation] Could not read existing checkin, will save Step2 as fallback");
          }
        } catch (error: any) {
          console.error("[Moto Validation] Error reading checkin for Step2 check:", error);
          // En cas d'erreur, on sauvegarde Step2 (safe fallback)
          needsStep2Save = true;
        }
      } else {
        // Pas de checkinId, on ne peut pas vérifier, mais on sauvegarde quand même (création)
        needsStep2Save = true;
      }

      // 2️⃣ Si nécessaire, sauvegarder Step2 minimal avec valeurs RHF
      if (needsStep2Save && bookingId) {
        try {
          const vehicule = getValues("vehicule");
          const releves = getValues("releves");

          // Construire payload Step2 minimal (compatible avec Step2Payload)
          const step2Payload: Step2Payload = {
            completedAt: new Date().toISOString(),
            vehicule: {
              marque: vehicule?.marque || "",
              modele: vehicule?.modele || "",
              immatriculation: vehicule?.immatriculation || "",
            },
            releves: {
              kilometrage: typeof releves?.kilometrage === "number" ? releves.kilometrage : 0,
              niveauCarburant: typeof releves?.niveauCarburant === "number" ? releves.niveauCarburant : 0,
              // dashboardPhotos : utiliser le format attendu (array d'objets avec storagePath/publicUrl/uploadedAt)
              // Si dashboardPhotosData existe, on le mappe, sinon tableau vide
              dashboardPhotos: Array.isArray(releves?.dashboardPhotosData)
                ? releves.dashboardPhotosData
                : Array.isArray(releves?.dashboardPhotos)
                ? releves.dashboardPhotos
                : [],
            },
          };

          console.log("[Moto Validation] 💾 Sauvegarde Step2 minimal avant finalisation...", {
            vehicule: step2Payload.vehicule,
            hasReleves: !!step2Payload.releves.kilometrage || !!step2Payload.releves.niveauCarburant,
          });

          await saveStep2Draft({
            bookingId,
            ownerId: ownerId || null,
            renterId: renterId || null,
            checkinId: checkinId || null,
            step2: step2Payload,
          });

          console.log("[Moto Validation] ✅ Step2 sauvegardé avec succès");
        } catch (step2Error: any) {
          console.error("[Moto Validation] ❌ Erreur sauvegarde Step2:", step2Error);
          toast.error("Erreur lors de la sauvegarde des données véhicule", {
            description: step2Error.message || "Impossible de sauvegarder les informations du véhicule. La finalisation est annulée.",
          });
          return; // ⚠️ Stopper la finalisation si Step2 échoue
        }
      }

      // ⭐ FINALISATION COMPLÈTE : Step 7 + Snapshot légal + Status "completed"
      const nowIso = new Date().toISOString();
      const step7Payload = {
        completedAt: nowIso,
        validation: {
          ownerSignature: ownerSignature || undefined,
          renterSignature: driverSignature || undefined,
          validatedAt: nowIso,
        },
      };

      const result = await finalizeCheckinDepart({
        checkinId,
        bookingId,
        ownerId: ownerId || null,
        renterId: renterId || null,
        step7Payload,
      });

      if (result.error) {
        console.error("[Moto Validation] ❌ Erreur finalisation:", result.error);
        toast.error("Erreur lors de la finalisation", {
          description: result.error,
        });
        return;
      }

      // ⭐ Succès : propager le checkinId et le statut
      if (result.data?.id && result.data?.status === "completed") {
        if (onCheckinIdChange) {
          onCheckinIdChange(result.data.id);
        }

        toast.success("État des lieux finalisé avec succès !", {
          description: "Un snapshot légal a été enregistré. L'état des lieux est maintenant verrouillé.",
        });

        // Afficher un avertissement si le PDF a échoué
        if (result.pdfError) {
          console.warn("[Moto Validation] ⚠️ PDF error during finalizeCheckinDepart:", result.pdfError);
          toast.warning("État des lieux finalisé, mais le PDF n'a pas pu être généré.", {
            description: result.pdfError,
            duration: 8000,
          });
        }

        // Appeler onComplete pour notifier le parent
        onComplete?.();
      } else if (result.data?.id && onCheckinIdChange) {
        // Fallback : propager uniquement le checkinId si le statut n'est pas "completed"
        onCheckinIdChange(result.data.id);
      }
    } catch (error: any) {
      console.error("[Moto Validation] ❌ Erreur finalisation:", error);
      toast.error("Erreur lors de la finalisation", {
        description: error.message || "Veuillez réessayer.",
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center justify-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-success" />
          Validation & Signature
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Vérifiez les informations avant de valider le formulaire
        </p>
      </div>

      {/* Indicateur d'état de validation */}
      <Card
        className={`border-2 ${
          validationStatus.isValid
            ? "border-green-500 bg-green-50"
            : "border-orange-500 bg-orange-50"
        }`}
      >
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            {validationStatus.isValid ? (
              <>
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-green-800">Données complètes ✅</p>
                  <p className="text-sm text-green-700">
                    Toutes les informations sont renseignées, prêtes pour validation.
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-orange-800">
                    Validation incomplète ({validationStatus.missingFields.length} champ(s)
                    manquant(s))
                  </p>
                  <p className="text-sm text-orange-700 mt-1">
                    {validationStatus.missingFields.length > 0 ? (
                      <>
                        Champs manquants : {validationStatus.missingFields.slice(0, 3).join(", ")}
                        {validationStatus.missingFields.length > 3 &&
                          ` et ${validationStatus.missingFields.length - 3} autre(s)...`}
                      </>
                    ) : (
                      "Veuillez compléter tous les champs requis"
                    )}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Signatures propriétaire / locataire (copie logique voiture) */}
      <Card>
        <CardContent className="grid gap-6 md:grid-cols-2 text-sm p-6">
          <SignatureCanvas
            id="field-signature-owner"
            value={ownerSignature}
            onChange={(dataUrl) => setValue("ownerSignature", dataUrl)}
            label="Signature du propriétaire"
          />

          <SignatureCanvas
            id="field-signature-driver"
            value={driverSignature}
            onChange={(dataUrl) => setValue("driverSignature", dataUrl)}
            label="Signature du locataire"
          />
        </CardContent>
      </Card>

      {/* Bouton de validation manuelle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vérifier les données</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => checkValidationData(true)}
            className="w-full"
          >
            Vérifier les champs requis
          </Button>
        </CardContent>
      </Card>

      {/* Bouton Finaliser */}
      <div className="flex justify-end pt-4">
        <Button
          type="button"
          onClick={handleFinalize}
          disabled={!canSubmit || isFinalizing || isCheckinCompleted}
          className={`${
            isCheckinCompleted || isFinalizing
              ? "bg-gray-400 cursor-not-allowed"
              : canSubmit
                ? "bg-gradient-lagoon hover:opacity-90 text-white font-semibold shadow-lagoon"
                : "bg-gray-400 hover:bg-gray-500 cursor-not-allowed"
          }`}
          size="lg"
        >
          {isFinalizing
            ? "Finalisation en cours..."
            : isCheckinCompleted
              ? "État des lieux finalisé"
              : canSubmit
                ? "Finaliser l'état des lieux"
                : "Complétez les champs requis"}
        </Button>
      </div>
      {isCheckinCompleted && (
        <p className="text-xs text-muted-foreground text-center max-w-md mx-auto mt-2">
          ✅ Cet état des lieux a été finalisé et est maintenant verrouillé.
        </p>
      )}
    </div>
  );
}
