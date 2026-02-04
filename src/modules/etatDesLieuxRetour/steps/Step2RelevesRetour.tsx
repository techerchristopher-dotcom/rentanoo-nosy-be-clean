import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolvePhotoUrl } from "@/utils/resolvePhotoUrl";
import { Gauge, Camera } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { FuelLevelSlider } from "@/components/FuelLevelSlider";
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

export default function Step2RelevesRetour({ departData, returnData, setValue, watch, bookingData, bookingId }: StepProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  // Données départ (lecture seule)
  const kilometrageDepart = departData?.step2?.releves?.kilometrage;
  const niveauCarburantDepart = departData?.step2?.releves?.niveauCarburant;
  const dashboardPhotosDepart = departData?.step2?.releves?.dashboardPhotos || [];

  // Données retour (éditables)
  const kilometrageRetour = watch("returnData.step2.releves.kilometrageRetour");
  const niveauCarburantRetour = watch("returnData.step2.releves.niveauCarburantRetour");
  const dashboardPhotosRetour = watch("returnData.step2.releves.dashboardPhotosRetour") || [];

  // ⭐ PhotoCaptureField → compression front → onFileChange reçoit File[] → upload parallèle
  const handleDashboardPhotosFileChange = async (files: File[]) => {
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
      const uploadPromises = files.map((file) =>
        CheckinPhotoService.uploadReturnDashboardPhoto(
          file,
          bookingId,
          bookingData?.referenceNumber ?? null
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

      const currentPhotos = dashboardPhotosRetour || [];
      const updatedPhotos = [...currentPhotos, ...newPhotos];

      setValue("returnData.step2.releves.dashboardPhotosRetour", updatedPhotos);

      toast({
        title: "📸 Photos uploadées",
        description: `${newPhotos.length} photo(s) dashboard retour ajoutée(s) avec succès`,
      });
    } catch (error: any) {
      console.error("[Step2RelevesRetour] ❌ Erreur upload:", error);
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
          <Gauge className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          <span className="break-words">Relevés retour</span>
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-snug">
          Renseignez les relevés du retour. Les valeurs de départ sont affichées en lecture seule.
        </p>
      </div>

      {/* Card : Relevés de départ (lecture seule) */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Gauge className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span>Relevés de départ (lecture seule)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4 space-y-3 sm:space-y-4">
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Kilométrage</p>
              <p className="text-sm sm:text-base font-semibold">
                {kilometrageDepart !== undefined && kilometrageDepart !== null
                  ? `${kilometrageDepart.toLocaleString("fr-FR")} km`
                  : "—"}
              </p>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">Niveau de carburant</p>
              {niveauCarburantDepart !== undefined && niveauCarburantDepart !== null ? (
                <FuelLevelSlider
                  label="Niveau de carburant départ"
                  value={Number(niveauCarburantDepart)}
                  onChange={() => {}} // Lecture seule, pas de changement
                />
              ) : (
                <p className="text-sm sm:text-base font-semibold">—</p>
              )}
            </div>
          </div>

          {dashboardPhotosDepart.length > 0 && (
            <>
              <Separator className="my-2 sm:my-3" />
              <div className="space-y-1.5 sm:space-y-2">
                <p className="text-xs sm:text-sm font-medium">Photos du tableau de bord</p>
                <PhotosGrid photos={dashboardPhotosDepart} />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Card : Relevés de retour */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 md:pb-4">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Gauge className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
            <span>Relevés de retour</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 md:pt-4 space-y-3 sm:space-y-4">
          <div className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium">Kilométrage retour</label>
              <input
                type="number"
                className="w-full border rounded-md px-3 py-2 text-sm sm:text-base"
                value={kilometrageRetour ?? ""}
                onChange={(e) => setValue("returnData.step2.releves.kilometrageRetour", e.target.value === "" ? null : Number(e.target.value))}
                placeholder="Saisir le kilométrage au retour"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <FuelLevelSlider
                label="Niveau de carburant retour"
                value={Number(niveauCarburantRetour || 0)}
                onChange={(nextPercent) => {
                  setValue("returnData.step2.releves.niveauCarburantRetour", nextPercent);
                }}
              />
            </div>
          </div>

          <Separator className="my-2 sm:my-3" />

          <div className="space-y-2 sm:space-y-3">
            <p className="text-xs sm:text-sm font-medium">Photos dashboard retour</p>
            <PhotosGrid photos={dashboardPhotosRetour} />
            <PhotoCaptureField
              label="Ajouter des photos"
              description={uploading ? "⏳ Upload en cours..." : "Prends une photo du compteur et du niveau de carburant."}
              value={dashboardPhotosRetour.map((p) => p?.publicUrl || p?.url).filter(Boolean) as string[]}
              onFileChange={handleDashboardPhotosFileChange}
              multiple={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
