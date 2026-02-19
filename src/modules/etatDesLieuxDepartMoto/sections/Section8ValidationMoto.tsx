import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { finalizeCheckinDepart, saveStep2Draft, saveStep3DraftMoto, type Step2Payload } from "@/services/checkinDepartService";
import { useFormContext } from "react-hook-form";
import { SignatureCanvas } from "@/components/checkin/SignatureCanvas";
import { SupabaseCheckinService } from "@/services/supabaseCheckinService";
import { FinalizeCheckinProgressModal } from "@/components/checkin/FinalizeCheckinProgressModal";

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
  const damageReports = watch("damageReports") || [];

  // ⭐ Step 4B : Mapping labels et ordre des zones
  const SIDE_LABELS: Record<string, string> = {
    avant: "Avant",
    droit: "Côté droit",
    arriere: "Arrière",
    gauche: "Côté gauche",
    coffre: "Coffre",
    janteAvDroit: "Jantes / Roues",
    janteArDroit: "Jante arrière droite",
    janteAvGauche: "Jante avant gauche",
    janteArGauche: "Jante arrière gauche",
    unknown: "Zone non renseignée",
  };

  const ZONE_ORDER = [
    "avant",
    "droit",
    "arriere",
    "gauche",
    "janteAvDroit",
    "janteArDroit",
    "janteAvGauche",
    "janteArGauche",
    "coffre",
    "unknown",
  ];

  // ⭐ Step 3C : Helper pour extraire URL photo (robuste multi-shapes)
  const getPhotoUrl = (photo: any): string | null => {
    if (!photo) return null;
    if (typeof photo === "string") return photo;
    return photo.url || photo.publicUrl || null;
  };

  // ⭐ Step 4B : Grouper damageReports par side
  const groupedDamages = damageReports.reduce((acc, damage) => {
    const side = damage.side || "unknown";
    if (!acc[side]) {
      acc[side] = [];
    }
    acc[side].push(damage);
    return acc;
  }, {} as Record<string, any[]>);

  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    missingFields: string[];
  }>({
    isValid: false,
    missingFields: [],
  });
  const [isFinalizing, setIsFinalizing] = useState(false);
  
  // ⭐ États pour la modale de progression
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizeProgress, setFinalizeProgress] = useState(0);
  const [finalizeLabel, setFinalizeLabel] = useState("");
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  
  const navigate = useNavigate();

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

    // ⭐ Ouvrir la modale et initialiser les états
    setShowFinalizeModal(true);
    setFinalizeProgress(0);
    setFinalizeLabel("Vérification des données…");
    setFinalizeError(null);
    setIsFinalizing(true);

    try {
      console.log("[Moto Validation] 🎯 Démarrage finalisation...");

      // ============================================================================
      // ⭐ PHASE 2 : Garantir persistance Step2 (vehicule.*) avant snapshot
      // ============================================================================
      setFinalizeProgress(5);
      setFinalizeLabel("Vérification des données véhicule…");
      
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
          setFinalizeProgress(10);
          setFinalizeLabel("Enregistrement des données véhicule…");
          
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
          setFinalizeError(
            step2Error.message || "Impossible de sauvegarder les informations du véhicule. La finalisation est annulée."
          );
          return; // ⚠️ Stopper la finalisation si Step2 échoue
        }
      }

      // ============================================================================
      // ⭐ PHASE 3 : Garantir persistance Step3 (extérieur moto) avant snapshot
      // ============================================================================
      setFinalizeProgress(12);
      setFinalizeLabel("Enregistrement des photos et dégâts…");

      const step3ZonesPhotos = getValues("step3ZonesPhotos" as any);
      const step3DamageReports = getValues("damageReports") || [];
      const hasStep3Data = step3ZonesPhotos && typeof step3ZonesPhotos === "object" && Object.keys(step3ZonesPhotos).length > 0;

      if (hasStep3Data && bookingId) {
        try {
          const step3Payload = {
            zonesPhotos: step3ZonesPhotos,
            completedAt: new Date().toISOString(),
            damageReports: step3DamageReports,
          };

          await saveStep3DraftMoto({
            bookingId,
            ownerId: ownerId || null,
            renterId: renterId || null,
            checkinId: checkinId || null,
            step3: step3Payload,
          });

          console.log("[Moto Validation] ✅ Step3 sauvegardé avant finalisation");
        } catch (step3Error: any) {
          console.error("[Moto Validation] ❌ Erreur sauvegarde Step3:", step3Error);
          setFinalizeError(
            step3Error.message || "Impossible de sauvegarder les photos et dégâts. La finalisation est annulée."
          );
          return;
        }
      }

      // ⭐ FINALISATION COMPLÈTE : Step 7 + Snapshot légal + Status "completed"
      setFinalizeProgress(20);
      setFinalizeLabel("Enregistrement des signatures…");
      
      const nowIso = new Date().toISOString();
      const step7Payload = {
        completedAt: nowIso,
        validation: {
          ownerSignature: ownerSignature || undefined,
          renterSignature: driverSignature || undefined,
          validatedAt: nowIso,
        },
      };

      setFinalizeProgress(30);
      setFinalizeLabel("Création du snapshot légal…");

      const result = await finalizeCheckinDepart({
        checkinId,
        bookingId,
        ownerId: ownerId || null,
        renterId: renterId || null,
        step7Payload,
      });

      if (result.error) {
        console.error("[Moto Validation] ❌ Erreur finalisation:", result.error);
        setFinalizeError(result.error);
        return;
      }

      // ⭐ Succès : propager le checkinId et le statut
      if (result.data?.id && result.data?.status === "completed") {
        if (onCheckinIdChange) {
          onCheckinIdChange(result.data.id);
        }

        // Afficher un avertissement si le PDF a échoué (mais ne pas bloquer)
        if (result.pdfError) {
          console.warn("[Moto Validation] ⚠️ PDF error during finalizeCheckinDepart:", result.pdfError);
          toast.warning("État des lieux finalisé, mais le document PDF n'a pas pu être généré", {
            description: "Il pourra être régénéré ultérieurement depuis la fiche de réservation.",
          });
        }

        // Le PDF est généré dans finalizeCheckinDepart (non-bloquant)
        // On considère que c'est fait à 80% même si ça peut échouer
        setFinalizeProgress(80);
        setFinalizeLabel("Génération du document PDF…");
        
        // Attendre un peu pour que l'utilisateur voie la progression PDF
        await new Promise(resolve => setTimeout(resolve, 500));

        setFinalizeProgress(100);
        setFinalizeLabel("État des lieux finalisé avec succès");

        // Attendre ~1200ms pour que l'utilisateur voie le message de succès avant redirection
        await new Promise(resolve => setTimeout(resolve, 1200));

        // Redirection automatique vers l'accueil
        navigate("/");
      } else if (result.data?.id && onCheckinIdChange) {
        // Fallback : propager uniquement le checkinId si le statut n'est pas "completed"
        onCheckinIdChange(result.data.id);
        setFinalizeError("Finalisation incomplète : le statut n'a pas été mis à jour.");
      }
    } catch (error: any) {
      console.error("[Moto Validation] ❌ Erreur finalisation:", error);
      setFinalizeError(error.message || "Une erreur inattendue s'est produite. Veuillez réessayer.");
    } finally {
      setIsFinalizing(false);
      // Ne pas fermer la modale en cas d'erreur (elle reste ouverte avec le message d'erreur)
      // En cas de succès, la redirection fermera la page donc la modale aussi
    }
  };

  // Handler pour fermer la modale en cas d'erreur
  const handleCloseModal = () => {
    setShowFinalizeModal(false);
    setFinalizeProgress(0);
    setFinalizeLabel("");
    setFinalizeError(null);
    // Rediriger vers les bookings même en cas d'erreur
    const redirectPath = ownerId && !renterId 
      ? "/me/owner/bookings" 
      : "/me/renter/bookings";
    navigate(redirectPath);
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

      {/* ⭐ Step 2A + Step 4B : Dégâts (draft) - Lecture seule, groupés par zone */}
      {damageReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dégâts (draft)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {ZONE_ORDER.map((zoneKey) => {
              const zoneDamages = groupedDamages[zoneKey];
              if (!zoneDamages || zoneDamages.length === 0) return null;

              const zoneLabel = SIDE_LABELS[zoneKey] ?? zoneKey;

              return (
                <div key={zoneKey} className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wide border-b border-gray-300 pb-1">
                    {zoneLabel} ({zoneDamages.length})
                  </h4>
                  <div className="space-y-3">
                    {zoneDamages.map((d: any, index: number) => {
                      // ⭐ Step 6A : Normaliser commentaire (trim) pour affichage placeholder
                      const commentaire = typeof d.commentaire === "string" ? d.commentaire.trim() : "";
                      const hasCommentaire = commentaire.length > 0;

                      return (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-md p-4 space-y-2 bg-gray-50"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1">
                              {Array.isArray(d.typeDegats) && d.typeDegats.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-muted-foreground">Type(s):</span>
                                  <span className="text-sm">{d.typeDegats.join(", ")}</span>
                                </div>
                              )}
                              <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Commentaire:</span>
                                {hasCommentaire ? (
                                  <p className="text-sm text-gray-700 italic">"{commentaire}"</p>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">(Sans commentaire)</p>
                                )}
                              </div>
                              {/* ⭐ Step 3C : Miniatures photos dégâts */}
                              {d.photos && Array.isArray(d.photos) && d.photos.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-muted-foreground">Photos:</span>
                                    <span className="text-sm">📷 {d.photos.length} photo{d.photos.length > 1 ? "s" : ""}</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    {d.photos.slice(0, 4).map((photo: any, photoIndex: number) => {
                                      const photoUrl = getPhotoUrl(photo);
                                      if (!photoUrl) return null;
                                      return (
                                        <div
                                          key={photoIndex}
                                          className="relative group cursor-pointer"
                                          onClick={() => window.open(photoUrl, "_blank", "noopener,noreferrer")}
                                        >
                                          <img
                                            src={photoUrl}
                                            alt={`Dégât ${index + 1} - Photo ${photoIndex + 1}`}
                                            className="w-full h-20 object-cover rounded-lg border hover:opacity-90 transition-opacity"
                                            loading="lazy"
                                          />
                                        </div>
                                      );
                                    })}
                                    {d.photos.length > 4 && (
                                      <div className="flex items-center justify-center h-20 border border-dashed rounded-lg bg-muted/30 text-xs text-muted-foreground">
                                        +{d.photos.length - 4}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

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

      {/* ⭐ Modale de progression de finalisation */}
      <FinalizeCheckinProgressModal
        open={showFinalizeModal}
        progress={finalizeProgress}
        label={finalizeLabel}
        error={finalizeError}
        onClose={handleCloseModal}
      />
    </div>
  );
}
