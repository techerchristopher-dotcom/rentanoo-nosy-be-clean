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
  onAutoSaveStep4?: () => Promise<void>;
}

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

export default function Step4InterieurRetour({ departData, setValue, watch, bookingData, bookingId, vehicleType, onAutoSaveStep4 }: StepProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const propretePhotos = departData?.step4?.propreteGenerale?.photos || [];
  const siegesPhotos = departData?.step4?.sieges?.photos || [];
  const siegesDamagePhotos = departData?.step4?.sieges?.damagePhotos || [];
  const equipements = departData?.step4?.equipements || null;

  const interior = watch("returnData.step4.interior") || {};
  const isSameAsDepart = interior.isSameAsDepart;
  const newDamages = interior.newDamages || [];
  // hasNewDamage = true seulement si isSameAsDepart est explicitement false
  const hasNewDamage = isSameAsDepart === false;
  // isNoDamage = true seulement si isSameAsDepart est explicitement true
  const isNoDamage = isSameAsDepart === true;
  const firstDamage = newDamages[0] || {};
  const damagePhotos = firstDamage.photos || [];

  // ⭐ PhotoCaptureField → compression front → onFileChange reçoit File[] → upload parallèle
  const handleInteriorDamageFilesChange = async (files: File[]) => {
    if (!files.length || uploading) return;

    if (!bookingId) {
      toast({
        variant: "destructive",
        title: "❌ Erreur",
        description: "ID de réservation manquant pour l'upload",
      });
      return;
    }

    setUploading(true);
    try {
      const interiorData = watch("returnData.step4.interior") || {};
      const newDamagesData = interiorData.newDamages || [];
      const firstDamageData = newDamagesData[0] || {};
      const area = firstDamageData.area || "interieur";
      const referenceNumber = bookingData?.referenceNumber ?? null;

      // Upload parallèle
      const uploadPromises = files.map((file) =>
        CheckinPhotoService.uploadReturnInteriorDamagePhoto(
          file,
          bookingId,
          referenceNumber,
          area
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

      if (newPhotos.length === 0) {
        throw new Error("Erreur lors de l'upload");
      }

      const currentPhotos = firstDamageData.photos || [];
      const updatedFirstDamage = { ...firstDamageData, photos: [...currentPhotos, ...newPhotos] };

      setValue("returnData.step4.interior.newDamages.0", updatedFirstDamage);

      void onAutoSaveStep4?.();

      toast({
        title: "📸 Photos uploadées",
        description: `${newPhotos.length} photo(s) ajoutée(s)`,
      });
    } catch (error: any) {
      console.error("[Step4InterieurRetour] ❌ Erreur upload:", error);
      toast({
        variant: "destructive",
        title: "❌ Erreur d'upload",
        description: error.message || "Impossible d'uploader les photos",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-5 md:space-y-6">
      {/* En-tête - Typographie mobile-first */}
      <div className="space-y-1.5 sm:space-y-2">
        <h2 className="text-xl sm:text-2xl font-semibold leading-tight sm:leading-none tracking-tight flex items-center gap-2">
          <Car className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          <span className="break-words">Intérieur retour</span>
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
          Indiquez si l'intérieur est identique au départ ou s'il y a de nouveaux dégâts.
        </p>
      </div>

      {/* Card : Intérieur au départ (lecture seule) */}
      {/* Pour la MOTO, on évite d'afficher les équipements typés voiture (radio/clim/etc.). */}
      {vehicleType !== "moto" && (
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Car className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span>Intérieur au départ (lecture seule)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4 space-y-3 sm:space-y-4 md:space-y-6">
          {propretePhotos.length > 0 && (
            <div className="space-y-1.5 sm:space-y-2">
              <p className="text-xs sm:text-sm font-medium">Propreté générale</p>
              <PhotosGrid photos={propretePhotos} />
            </div>
          )}
          {siegesPhotos.length > 0 && (
            <div className="space-y-1.5 sm:space-y-2">
              <p className="text-xs sm:text-sm font-medium">Sièges</p>
              <PhotosGrid photos={siegesPhotos} />
            </div>
          )}
          {siegesDamagePhotos?.length > 0 && (
            <div className="space-y-1.5 sm:space-y-2">
              <p className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive flex-shrink-0" />
                <span>Dégâts sièges (départ)</span>
              </p>
              <PhotosGrid photos={siegesDamagePhotos} />
            </div>
          )}
          {equipements && (
            <div className="space-y-1.5 sm:space-y-2 pt-2 border-t">
              <p className="text-xs sm:text-sm font-medium">Équipements (départ)</p>
              <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Radio OK</span>
                  <span className="font-medium">{String(equipements.radioOk ?? true)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Clim OK</span>
                  <span className="font-medium">{String(equipements.acOk ?? true)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fermeture centrale OK</span>
                  <span className="font-medium">{String(equipements.centralLockOk ?? true)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vitres OK</span>
                  <span className="font-medium">{String(equipements.windowsOk ?? true)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Sélecteur Nouveaux dégâts intérieurs : deux boutons Non/Oui */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <span className="text-xs sm:text-sm font-medium">Nouveaux dégâts intérieurs ?</span>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              // "Non" = pas de nouveau dégât → isSameAsDepart = true, clear newDamages
              setValue("returnData.step4.interior.isSameAsDepart", true);
              setValue("returnData.step4.interior.newDamages", []);
              void onAutoSaveStep4?.();
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
              setValue("returnData.step4.interior.isSameAsDepart", false);
              // S'assurer que newDamages[0] existe si vide
              const currentNewDamages = watch("returnData.step4.interior.newDamages") || [];
              if (currentNewDamages.length === 0) {
                setValue("returnData.step4.interior.newDamages", [{
                  area: "",
                  description: "",
                  photos: []
                }]);
              }
              void onAutoSaveStep4?.();
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
          <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0" />
              <span>Nouveau dégât intérieur</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4 space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium">Zone / Élément</label>
              <input
                type="text"
                className="w-full border rounded-md px-3 py-2 text-xs sm:text-sm"
                value={firstDamage.area || ""}
                onChange={(e) =>
                  setValue("returnData.step4.interior.newDamages.0.area", e.target.value)
                }
                placeholder="Ex: sièges, tableau de bord, moquette..."
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium">Description</label>
              <textarea
                className="w-full border rounded-md px-3 py-2 text-xs sm:text-sm min-h-[80px] sm:min-h-[100px]"
                value={firstDamage.description || ""}
                onChange={(e) =>
                  setValue("returnData.step4.interior.newDamages.0.description", e.target.value)
                }
                placeholder="Décrivez le nouveau dégât intérieur"
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
                description={uploading ? "⏳ Upload en cours..." : "Ajoutez des photos du nouveau dégât"}
                value={damagePhotos.map((p) => p?.publicUrl || p?.url).filter(Boolean) as string[]}
                onFileChange={handleInteriorDamageFilesChange}
                multiple={true}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
