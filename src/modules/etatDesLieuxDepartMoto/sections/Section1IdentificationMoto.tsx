import { memo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { User, CreditCard, Loader2 } from "lucide-react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoCaptureField } from "@/components/ui/PhotoCaptureField";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { saveStep1Draft, buildStep1Payload } from "@/services/checkinDepartService";
import { CheckinPhotoService } from "@/services/supabase/checkinPhotos";

interface Section1IdentificationMotoProps {
  onComplete?: () => void;
  bookingId?: string;
  bookingReferenceNumber?: number | null;
  ownerId?: string | null;
  renterId?: string | null;
  checkinId?: string | null;
  onCheckinIdChange?: (id: string) => void;
  isReadOnly?: boolean;
}

const Section1IdentificationMoto = memo(function Section1IdentificationMoto({
  onComplete,
  bookingId,
  bookingReferenceNumber,
  ownerId,
  renterId,
  checkinId,
  onCheckinIdChange,
  isReadOnly,
}: Section1IdentificationMotoProps) {
  const { control, watch, setValue, getValues } = useFormContext<any>();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingRecto, setUploadingRecto] = useState(false);
  const [uploadingVerso, setUploadingVerso] = useState(false);

  const base64ToFile = (base64: string, filename: string): File => {
    const arr = base64.split(",");
    const mime = arr[0]?.match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1] || "");
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const validateStep1Moto = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const values = getValues();

    const nom = values?.conducteur?.nom;
    const prenom = values?.conducteur?.prenom;

    if (!nom || nom.trim() === "") {
      errors.push("Nom");
    }
    if (!prenom || prenom.trim() === "") {
      errors.push("Prénom");
    }

    return { isValid: errors.length === 0, errors };
  };

  const handleUploadPermisRecto = async (base64OrNull: string | string[] | null) => {
    if (!base64OrNull) {
      setValue("conducteur.driver_license_photos_recto", null, { shouldDirty: true });
      return;
    }

    const base64 = Array.isArray(base64OrNull) ? base64OrNull[0] : base64OrNull;

    if (base64.startsWith("http")) {
      setValue("conducteur.driver_license_photos_recto", base64, { shouldDirty: true });
      return;
    }

    if (!base64.startsWith("data:image/")) {
      console.warn("[Step1 Moto] Format base64 invalide pour recto");
      return;
    }

    if (!bookingId) {
      toast.error("Impossible d'uploader : ID de réservation manquant");
      return;
    }

    setUploadingRecto(true);
    try {
      const file = base64ToFile(base64, `permis_recto_${Date.now()}.jpg`);
      const { data, error } = await CheckinPhotoService.uploadLicenseRecto(
        file,
        bookingId,
        bookingReferenceNumber
      );

      if (error) {
        toast.error("Erreur d'upload photo recto", { description: error });
        console.error("[Step1 Moto] Erreur upload recto:", error);
        return;
      }

      if (data?.publicUrl) {
        setValue("conducteur.driver_license_photos_recto", data.publicUrl, { shouldDirty: true });
        toast.success("📸 Photo recto uploadée avec succès");
      }
    } catch (error: any) {
      toast.error("Erreur inattendue lors de l'upload", { description: error?.message });
      console.error("[Step1 Moto] Exception upload recto:", error);
    } finally {
      setUploadingRecto(false);
    }
  };

  const handleUploadPermisVerso = async (base64OrNull: string | string[] | null) => {
    if (!base64OrNull) {
      setValue("conducteur.driver_license_photos_verso", null, { shouldDirty: true });
      return;
    }

    const base64 = Array.isArray(base64OrNull) ? base64OrNull[0] : base64OrNull;

    if (base64.startsWith("http")) {
      setValue("conducteur.driver_license_photos_verso", base64, { shouldDirty: true });
      return;
    }

    if (!base64.startsWith("data:image/")) {
      console.warn("[Step1 Moto] Format base64 invalide pour verso");
      return;
    }

    if (!bookingId) {
      toast.error("Impossible d'uploader : ID de réservation manquant");
      return;
    }

    setUploadingVerso(true);
    try {
      const file = base64ToFile(base64, `permis_verso_${Date.now()}.jpg`);
      const { data, error } = await CheckinPhotoService.uploadLicenseVerso(
        file,
        bookingId,
        bookingReferenceNumber
      );

      if (error) {
        toast.error("Erreur d'upload photo verso", { description: error });
        console.error("[Step1 Moto] Erreur upload verso:", error);
        return;
      }

      if (data?.publicUrl) {
        setValue("conducteur.driver_license_photos_verso", data.publicUrl, { shouldDirty: true });
        toast.success("📸 Photo verso uploadée avec succès");
      }
    } catch (error: any) {
      toast.error("Erreur inattendue lors de l'upload", { description: error?.message });
      console.error("[Step1 Moto] Exception upload verso:", error);
    } finally {
      setUploadingVerso(false);
    }
  };

  const handleCompleteIdentificationAndGoNextMoto = async () => {
    if (isReadOnly) {
      toast.info("État des lieux finalisé", {
        description: "Cet état des lieux est finalisé et ne peut plus être modifié.",
      });
      return;
    }

    const validation = validateStep1Moto();
    if (!validation.isValid) {
      toast.error("Identification incomplète", {
        description:
          validation.errors.length > 0
            ? `Champs manquants : ${validation.errors.join(", ")}`
            : "Veuillez remplir les champs obligatoires",
      });
      return;
    }

    if (!bookingId) {
      toast.error("❌ Erreur : ID de réservation manquant");
      console.error("[Step1 Moto] Missing bookingId, cannot save");
      return;
    }

    setIsSaving(true);
    try {
      const formValues = getValues();
      const step1Payload = buildStep1Payload(formValues);

      console.log("[Step1 Moto] Envoi auto-save...", {
        bookingId,
        hasCheckinId: !!checkinId,
        payloadKeys: Object.keys(step1Payload),
      });

      const response = await saveStep1Draft({
        bookingId,
        ownerId: ownerId || null,
        renterId: renterId || null,
        checkinId: checkinId || null,
        step1: step1Payload,
      });

      console.log("[Step1 Moto] ✅ Sauvegarde OK, checkinId:", response.checkinId);

      if (onCheckinIdChange && response.checkinId) {
        onCheckinIdChange(response.checkinId);
        console.log("[Step1 Moto] ✅ Propagation checkinId au parent:", response.checkinId);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      toast.success("✅ Identification sauvegardée avec succès !");
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error("[Step1 Moto] Erreur auto-save:", error);
      toast.error(error?.message || "❌ Erreur de sauvegarde - Veuillez réessayer", {
        description: "Vos données n'ont pas été perdues, vous pouvez réessayer.",
        duration: 6000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center justify-center gap-2">
          <User className="h-6 w-6 text-primary" />
          Identification du conducteur
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Renseignez les informations du conducteur principal et ajoutez les photos du permis si
          nécessaire.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations personnelles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="conducteur.nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom *</FormLabel>
                  <FormControl>
                    <Input placeholder="Dupont" {...field} disabled={isReadOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="conducteur.prenom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prénom *</FormLabel>
                  <FormControl>
                    <Input placeholder="Jean" {...field} disabled={isReadOnly} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Photos du permis de conduire
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <PhotoCaptureField
                label="Photo du permis (recto)"
                description={
                  uploadingRecto
                    ? "Upload en cours..."
                    : "Prends une photo nette du recto du permis."
                }
                value={watch("conducteur.driver_license_photos_recto") || null}
                onChange={handleUploadPermisRecto}
                multiple={false}
              />
              {uploadingRecto && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Upload en cours vers Supabase Storage...</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <PhotoCaptureField
                label="Photo du permis (verso)"
                description={
                  uploadingVerso
                    ? "Upload en cours..."
                    : "Prends une photo du verso du permis."
                }
                value={watch("conducteur.driver_license_photos_verso") || null}
                onChange={handleUploadPermisVerso}
                multiple={false}
              />
              {uploadingVerso && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Upload en cours vers Supabase Storage...</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {!isReadOnly && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCompleteIdentificationAndGoNextMoto}
            disabled={isSaving}
            className={cn(
              "w-full rounded-md px-4 py-3 text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2",
              isSaving
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isSaving ? (
              <>
                <span className="animate-spin">⏳</span>
                Sauvegarde en cours...
              </>
            ) : (
              <>Terminer l'identification et passer aux relevés</>
            )}
          </button>
        </div>
      )}
    </div>
  );
});

export default Section1IdentificationMoto;
