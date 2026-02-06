import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolvePhotoUrl } from "@/utils/resolvePhotoUrl";
import { Car, Camera, AlertTriangle } from "lucide-react";
import { PhotoCaptureField } from "@/components/ui/PhotoCaptureField";
import { CheckinPhotoService } from "@/services/supabase/checkinPhotos";
import { useToast } from "@/hooks/use-toast";

interface StepProps {
  departData: any;
  returnData: any;
  setValue: (name: string, value: any) => void;
  watch: (name: string) => any;
  bookingData?: { startDate?: string; endDate?: string; startTime?: string; endTime?: string; referenceNumber?: number | null };
  bookingId?: string;
  vehicleType?: string | null;
  onAutoSaveStep3?: (zoneKey: string) => Promise<void>;
}

// Configuration des zones extérieures RETOUR
// VOITURE : liste actuelle inchangée (ordre et labels identiques).
const RETURN_CAR_ZONES = [
  { key: "avant", label: "Avant" },
  { key: "droit", label: "Côté droit" },
  { key: "arriere", label: "Arrière" },
  { key: "gauche", label: "Côté gauche" },
  { key: "coffre", label: "Coffre" },
  { key: "janteAvDroit", label: "Jante avant droite" },
  { key: "janteArDroit", label: "Jante arrière droite" },
  { key: "janteAvGauche", label: "Jante avant gauche" },
  { key: "janteArGauche", label: "Jante arrière gauche" },
];

// MOTO : zones conformes aux définitions moto (sans coffre),
// Pour les motos, seulement 2 jantes : avant et arrière (sans distinction gauche/droite)
const RETURN_MOTO_ZONES = [
  { key: "avant", label: "Avant" },
  { key: "droit", label: "Côté droit" },
  { key: "arriere", label: "Arrière" },
  { key: "gauche", label: "Côté gauche" },
  { key: "janteAvant", label: "Jante avant" },
  { key: "janteArriere", label: "Jante arrière" },
];

/**
 * Composant de grille de photos réutilisable - Mobile-first
 */
function PhotosGrid({ photos, className = "" }: { photos: any[]; className?: string }) {
  if (!photos || photos.length === 0) {
    return (
      <div className="text-xs sm:text-sm text-muted-foreground italic py-2 sm:py-4 text-center border border-dashed rounded-md bg-muted/20">
        Aucune photo disponible
      </div>
    );
  }
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2 md:gap-3 ${className}`}>
      {photos.map((p, idx) => {
        const photoUrl = resolvePhotoUrl(p);
        if (!photoUrl) return null;
        
        return (
          <div
            key={idx}
            className="group relative border rounded-md sm:rounded-lg overflow-hidden bg-muted/30 hover:shadow-md transition-shadow cursor-pointer active:opacity-80"
            onClick={() => {
              window.open(photoUrl, "_blank", "noopener,noreferrer");
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={p?.storagePath || `photo-${idx}`}
              className="w-full h-20 sm:h-24 md:h-28 lg:h-32 object-cover group-hover:opacity-90 transition-opacity"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <Camera className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Step3ExterieurRetour({
  departData,
  returnData,
  setValue,
  watch,
  bookingData,
  bookingId,
  vehicleType,
  onAutoSaveStep3,
}: StepProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const zonesPhotos = departData?.step3?.zonesPhotos || {};

  // Déterminer la liste des zones selon le type de véhicule
  const zones = vehicleType === "moto" ? RETURN_MOTO_ZONES : RETURN_CAR_ZONES;

  // ⭐ PhotoCaptureField → compression front → onFileChange reçoit File[] → upload parallèle
  const handleExteriorDamageFilesChange = async (zoneKey: string, files: File[]) => {
    if (!files.length || uploading[zoneKey]) return;

    if (!bookingId) {
      toast({
        variant: "destructive",
        title: "❌ Erreur",
        description: "ID de réservation manquant pour l'upload",
      });
      return;
    }

    setUploading((prev) => ({ ...prev, [zoneKey]: true }));
    try {
      // Pour V1, on gère un seul dégât par zone (index 0)
      const damageIndex = 0;
      const referenceNumber = bookingData?.referenceNumber ?? null;

      // Upload parallèle
      const uploadPromises = files.map((file) =>
        CheckinPhotoService.uploadReturnExteriorDamagePhoto(
          file,
          bookingId,
          referenceNumber,
          zoneKey,
          damageIndex
        )
      );

      const results = await Promise.all(uploadPromises);

      const newPhotos = results
        .filter((r) => r.data)
        .map((r) => r.data!);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        const firstError = errors[0];
        throw new Error(firstError?.error || "Erreur lors de l'upload");
      }

      // Récupérer les dégâts existants pour cette zone
      const currentNewDamages = watch(`returnData.step3.sections.${zoneKey}.newDamages`) || [];
      const firstDamage = currentNewDamages[0] || { description: "", type: "", photos: [] };
      const currentPhotos = firstDamage.photos || [];

      // Ajouter les nouvelles photos
      const updatedPhotos = [...currentPhotos, ...newPhotos];
      const updatedFirstDamage = { ...firstDamage, photos: updatedPhotos };

      // Mettre à jour le form state
      setValue(`returnData.step3.sections.${zoneKey}.newDamages.0`, updatedFirstDamage);

      void onAutoSaveStep3?.(zoneKey);

      // Trouver le label de la zone
      const zoneLabel = zones.find(z => z.key === zoneKey)?.label || zoneKey;

      toast({
        title: "📸 Photos uploadées",
        description: `${newPhotos.length} photo(s) de dégât pour ${zoneLabel} ajoutée(s)`,
      });
    } catch (error: any) {
      console.error("[Step3ExterieurRetour] ❌ Erreur upload:", error);
      toast({
        variant: "destructive",
        title: "❌ Erreur d'upload",
        description: error.message || "Impossible d'uploader les photos",
      });
    } finally {
      setUploading((prev) => ({ ...prev, [zoneKey]: false }));
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-5 md:space-y-6">
      {/* En-tête - Typographie mobile-first */}
      <div className="space-y-1.5 sm:space-y-2">
        <h2 className="text-xl sm:text-2xl font-semibold leading-tight sm:leading-none tracking-tight flex items-center gap-2">
          <Car className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          <span className="break-words">Extérieur retour</span>
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
          Pour chaque zone, indiquez s'il y a un nouveau dégât et ajoutez les informations associées.
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {(vehicleType === "moto" ? RETURN_MOTO_ZONES : RETURN_CAR_ZONES).map((zone) => {
          const photosDepart = zonesPhotos?.[zone.key] || [];
          const isSameAsDepart = watch(`returnData.step3.sections.${zone.key}.isSameAsDepart`);
          const newDamages = watch(`returnData.step3.sections.${zone.key}.newDamages`) || [];
          // hasNewDamage = true seulement si isSameAsDepart est explicitement false
          const hasNewDamage = isSameAsDepart === false;
          // isNoDamage = true seulement si isSameAsDepart est explicitement true
          const isNoDamage = isSameAsDepart === true;
          // isUndefined = aucun choix n'a été fait (état par défaut)
          const isUndefined = isSameAsDepart === undefined;
          const firstDamage = newDamages[0] || {};
          const damagePhotos = firstDamage.photos || [];

          return (
            <Card key={zone.key} className="border">
              <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Car className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <span className="break-words">{zone.label}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4 space-y-3 sm:space-y-4">
                {/* Photos départ */}
                {photosDepart.length > 0 && (
                  <div className="space-y-1.5 sm:space-y-2">
                    <p className="text-xs sm:text-sm font-medium">Photos départ</p>
                    <PhotosGrid photos={photosDepart} />
                  </div>
                )}

                {/* Sélecteur Nouveau dégât : deux boutons Non/Oui */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="text-xs sm:text-sm font-medium">Nouveau dégât ?</span>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        // "Non" = pas de nouveau dégât → isSameAsDepart = true, clear newDamages
                        setValue(
                          `returnData.step3.sections.${zone.key}.isSameAsDepart`,
                          true
                        );
                        setValue(`returnData.step3.sections.${zone.key}.newDamages`, []);
                        void onAutoSaveStep3?.(zone.key);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors border ${
                        isNoDamage
                          ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      Non
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // "Oui" = il y a un nouveau dégât → isSameAsDepart = false
                        setValue(
                          `returnData.step3.sections.${zone.key}.isSameAsDepart`,
                          false
                        );
                        // S'assurer que newDamages[0] existe si vide
                        const currentNewDamages = watch(`returnData.step3.sections.${zone.key}.newDamages`) || [];
                        if (currentNewDamages.length === 0) {
                          setValue(`returnData.step3.sections.${zone.key}.newDamages`, [{
                            description: "",
                            type: "",
                            photos: []
                          }]);
                        }
                        void onAutoSaveStep3?.(zone.key);
                      }}
                      className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors border ${
                        hasNewDamage
                          ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      Oui
                    </button>
                  </div>
                </div>

                {/* Formulaire nouveau dégât */}
                {hasNewDamage && (
                  <Card className="border-dashed bg-muted/30">
                    <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                      <div className="space-y-1.5 sm:space-y-2">
                        <label className="text-xs sm:text-sm font-medium">Description du dégât</label>
                        <textarea
                          className="w-full border rounded-md px-3 py-2 text-xs sm:text-sm min-h-[80px] sm:min-h-[100px]"
                          value={firstDamage.description || ""}
                          onChange={(e) =>
                            setValue(
                              `returnData.step3.sections.${zone.key}.newDamages.0.description`,
                              e.target.value
                            )
                          }
                          placeholder="Décrivez le nouveau dégât"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <label className="text-xs sm:text-sm font-medium">Type de dégât (optionnel)</label>
                        <input
                          type="text"
                          className="w-full border rounded-md px-3 py-2 text-xs sm:text-sm"
                          value={firstDamage.type || ""}
                          onChange={(e) =>
                            setValue(
                              `returnData.step3.sections.${zone.key}.newDamages.0.type`,
                              e.target.value
                            )
                          }
                          placeholder="Ex: rayure, bosse..."
                        />
                      </div>
                      <div className="space-y-2 sm:space-y-3">
                        <p className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive flex-shrink-0" />
                          <span>Photos du nouveau dégât</span>
                        </p>
                        <PhotosGrid photos={damagePhotos} />
                        <PhotoCaptureField
                          label="Ajouter des photos"
                          description={uploading[zone.key] ? "⏳ Upload en cours..." : "Ajoutez des photos du nouveau dégât"}
                          value={damagePhotos.map((p) => p?.publicUrl || p?.url).filter(Boolean) as string[]}
                          onFileChange={(files) => handleExteriorDamageFilesChange(zone.key, files)}
                          multiple={true}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
