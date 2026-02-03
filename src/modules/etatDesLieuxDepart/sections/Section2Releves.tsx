import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gauge, Loader2, ArrowRight } from "lucide-react";
import { PhotoCaptureField } from "@/components/ui/PhotoCaptureField";
import { FuelLevelSlider } from "@/components/FuelLevelSlider";
import { useToast } from "@/hooks/use-toast";
import { saveStep2Draft, Step2Payload } from "@/services/checkinDepartService";
import { CheckinPhotoService, UploadedCheckinPhoto } from "@/services/supabase/checkinPhotos";

interface Section2RelevesProps {
  onComplete: () => void;
  bookingId?: string;
  bookingReferenceNumber?: number | null;  // ⭐ NOUVEAU : pour naming des fichiers
  ownerId?: string | null;
  renterId?: string | null;
  checkinId?: string | null;
  onCheckinIdChange?: (id: string) => void;
  missingFieldsSet?: Set<string>;
  missingFieldsList?: string[];
  onNavigateToMissingField?: (target: { step: number; anchor?: string | null; fieldKey: string }) => void;
}

export default function Section2Releves({
  onComplete,
  bookingId,
  bookingReferenceNumber,  // ⭐ NOUVEAU
  ownerId,
  renterId,
  checkinId,
  onCheckinIdChange,
  missingFieldsSet,
  missingFieldsList,
  onNavigateToMissingField,
}: Section2RelevesProps) {
  const { control, watch, setValue, trigger } = useFormContext();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploadingDashboard, setUploadingDashboard] = useState(false);
  const dashboardPhotosData = watch("releves.dashboardPhotosData") || [];

  const formatPhotoTimestamp = (dateString?: string | null): string => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString);
      return d.toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("Erreur formatage timestamp photo:", error);
      return "";
    }
  };

  /**
   * ⭐ Helper pour convertir base64 → File
   */
  const base64ToFile = (base64: string, filename: string): File => {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  /**
   * ⭐ Upload photos dashboard vers bucket `checkin-photos`
   * 
   * Path : booking_<bookingId>/depart/photos_dashboard_<bookingId>_<timestamp>_<uuid>.jpg
   * Stockage : releves.dashboardPhotosData (métadonnées) + releves.dashboardPhotos (URLs pour affichage)
   */
  const handleUploadDashboardPhotos = async (base64Array: string | string[] | null) => {
    if (!base64Array || (Array.isArray(base64Array) && base64Array.length === 0)) {
      setValue("releves.dashboardPhotosData", [], { shouldDirty: true });
      setValue("releves.dashboardPhotos", [], { shouldDirty: true });
      return;
    }

    const base64s = Array.isArray(base64Array) ? base64Array : [base64Array];
    
    // Séparer URLs déjà uploadées des nouvelles à uploader
    const alreadyUploaded: UploadedCheckinPhoto[] = watch("releves.dashboardPhotosData") || [];
    const toUpload = base64s.filter(b => b.startsWith('data:image/'));

    if (toUpload.length === 0) {
      // Toutes les photos sont déjà uploadées
      return;
    }

    if (!bookingId) {
      toast({
        variant: "destructive",
        title: "❌ Erreur",
        description: "ID de réservation manquant pour l'upload",
      });
      return;
    }

    setUploadingDashboard(true);
    try {
      console.log(`[STEP2] 📸 Upload de ${toUpload.length} photo(s) dashboard...`);
      const isDev = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
      const logDev = isDev ? console.log : () => {};

      const uploadPromises = toUpload.map(async (base64, idx) => {
        const photoId = `${Date.now()}_${idx}_dashboard`;
        const t0 = performance.now();
        
        // Conversion base64 → File
        const tConvertStart = performance.now();
        const file = base64ToFile(base64, `dashboard_${Date.now()}.jpg`);
        const tConvert = performance.now() - tConvertStart;
        
        // ⭐ Upload avec nouvelle convention (resa_8/depart/photos_dashboard_8_...)
        const tUploadStart = performance.now();
        const { data, error } = await CheckinPhotoService.uploadDashboardPhoto(
          file,
          bookingId,
          bookingReferenceNumber  // ⭐ NOUVEAU : pour naming intelligent
        );
        const tUpload = performance.now() - tUploadStart;
        const tTotal = performance.now() - t0;
        
        if (error) {
          console.error('[STEP2] ❌ Erreur upload:', error);
          throw new Error(error);
        }

        logDev(`[STEP2] photoId=${photoId} convertMs=${tConvert.toFixed(0)} beforeKB=${(base64.length * 3 / 4 / 1024).toFixed(0)} afterKB=${(file.size / 1024).toFixed(0)} uploadMs=${tUpload.toFixed(0)} totalMs=${tTotal.toFixed(0)}`);
        console.log('[STEP2] ✅ Photo uploadée:', data!.storagePath);
        return data!;  // {storagePath, publicUrl, uploadedAt}
      });

      const newPhotos = await Promise.all(uploadPromises);
      const allPhotos = [...alreadyUploaded, ...newPhotos];

      // ⭐ Mesurer UI freeze (setValue)
      const tSetValueStart = performance.now();
      
      // ⭐ Stocker métadonnées complètes (avec URLs)
      setValue("releves.dashboardPhotosData", allPhotos, { shouldDirty: true });
      
      // ⭐ Stocker URLs pour affichage dans PhotoCaptureField
      setValue("releves.dashboardPhotos", allPhotos.map(p => p.publicUrl), { shouldDirty: true });
      
      requestAnimationFrame(() => {
        const tSetValueMs = performance.now() - tSetValueStart;
        const isDev = typeof process !== "undefined" && process.env?.NODE_ENV !== "production";
        const logDev = isDev ? console.log : () => {};
        logDev(`[STEP2_UI] setValueCostMs=${tSetValueMs.toFixed(0)} photosCount=${allPhotos.length}`);
      });

      toast({
        title: "📸 Photos dashboard uploadées",
        description: `${newPhotos.length} photo(s) ajoutée(s) dans checkin-photos`,
      });
    } catch (error: any) {
      console.error('[STEP2] ❌ Erreur upload:', error);
      toast({
        variant: "destructive",
        title: "❌ Erreur d'upload",
        description: error.message || "Impossible d'uploader les photos",
      });
    } finally {
      setUploadingDashboard(false);
    }
  };

  /**
   * ⭐ Sauvegarder Step2 et passer à l'étape suivante
   */
  const handleCompleteStep2AndGoNext = async () => {
    console.log("[STEP2] 🚀 Validation et sauvegarde Step2...");

    // Validation des champs obligatoires
    const isValid = await trigger(["releves.kilometrage", "releves.niveauCarburant"]);
    if (!isValid) {
      toast({
        variant: "destructive",
        title: "❌ Champs obligatoires manquants",
        description: "Veuillez remplir le kilométrage et le niveau de carburant.",
      });
      return;
    }

    if (!bookingId) {
      toast({
        variant: "destructive",
        title: "❌ Erreur",
        description: "ID de réservation manquant",
      });
      return;
    }

    setSaving(true);
    try {
      const formValues = watch();
      
      // ⭐ Construire le payload Step2 conforme au contrat
      const step2Payload: Step2Payload = {
        completedAt: new Date().toISOString(),
        vehicule: {
          marque: formValues.vehicule?.marque || "",
          modele: formValues.vehicule?.modele || "",
          immatriculation: formValues.vehicule?.immatriculation || "",
        },
        releves: {
          kilometrage: formValues.releves?.kilometrage || 0,
          niveauCarburant: formValues.releves?.niveauCarburant || 0,
          dashboardPhotos: formValues.releves?.dashboardPhotosData || [],  // ⭐ Métadonnées avec URLs
        },
      };

      console.log("[STEP2] 📦 Payload Step2:", {
        completedAt: step2Payload.completedAt,
        kilometrage: step2Payload.releves.kilometrage,
        niveauCarburant: step2Payload.releves.niveauCarburant,
        photosCount: step2Payload.releves.dashboardPhotos.length,
      });

      // ⭐ Appel au service
      const result = await saveStep2Draft({
        bookingId,
        ownerId: ownerId || null,
        renterId: renterId || null,
        checkinId: checkinId || null,  // ⭐ Devrait être défini grâce au fix Step1
        step2: step2Payload,
      });

      console.log("[STEP2] ✅ Sauvegarde OK, checkinId:", result.checkinId);
      console.log("[STEP2] 🔍 Mode opération:", checkinId ? "UPDATE" : "INSERT (première fois)");

      // ⭐ Propager le checkinId au parent si nécessaire
      if (result.checkinId && onCheckinIdChange) {
        onCheckinIdChange(result.checkinId);
        console.log("[STEP2] ✅ Propagation checkinId au parent:", result.checkinId);
        
        // ⭐ Attendre un cycle de rendu React pour garantir la propagation
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      toast({
        title: "✅ Relevés sauvegardés avec succès !",
        description: "Les données du véhicule ont été enregistrées.",
      });

      // ⭐ Navigation intelligente : si d'autres champs manquants existent, aller directement au suivant
      const remainingMissing =
        (missingFieldsList || []).filter((m) => m !== "Relevés : Kilométrage");

      if (remainingMissing.length > 0 && onNavigateToMissingField) {
        const nextKey = remainingMissing[0];
        // Mapping minimal vers les signatures (cas principal attendu après les relevés)
        const target =
          nextKey.toLowerCase().includes("signature du propriétaire")
            ? { step: 7, anchor: "field-signature-owner", fieldKey: nextKey }
            : nextKey.toLowerCase().includes("signature du locataire")
            ? { step: 7, anchor: "field-signature-driver", fieldKey: nextKey }
            : null;

        if (target) {
          onNavigateToMissingField(target);
          return;
        }
      }

      // ⭐ Sinon, navigation normale
      onComplete();
    } catch (error: any) {
      console.error("[STEP2] ❌ Erreur auto-save:", error);
      toast({
        variant: "destructive",
        title: "❌ Erreur de sauvegarde",
        description: error.message || "Une erreur est survenue lors de la sauvegarde.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold leading-none tracking-tight flex items-center justify-center gap-2">
          <Gauge className="h-6 w-6 text-primary" />
          Relevés du véhicule
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          Renseignez les informations du véhicule et les relevés initiaux
        </p>
      </div>

      {/* Informations du véhicule (READ-ONLY depuis booking) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informations du véhicule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={control}
              name="vehicule.marque"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marque *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Peugeot" 
                      {...field} 
                      disabled
                      readOnly
                      className="bg-muted/50 cursor-not-allowed"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="vehicule.modele"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modèle *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="208" 
                      {...field} 
                      disabled
                      readOnly
                      className="bg-muted/50 cursor-not-allowed"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="vehicule.immatriculation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Immatriculation *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="AB-123-CD" 
                      {...field} 
                      disabled
                      readOnly
                      className="bg-muted/50 cursor-not-allowed"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Relevés kilométriques et carburant */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Relevés kilométriques et carburant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="releves.kilometrage"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Kilométrage départ (km) *
                </FormLabel>
                <FormControl>
                  <Input
                    id="field-kilometrage"
                    type="number"
                    placeholder="50000"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                    value={field.value || ""}
                    className={missingFieldsSet?.has("Relevés : Kilométrage") ? "border-destructive ring-1 ring-destructive/50" : undefined}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-2">
            <FuelLevelSlider
              label="Niveau de carburant / batterie"
              value={Number(watch("releves.niveauCarburant") || 0)}
              onChange={(nextPercent) => {
                setValue("releves.niveauCarburant", nextPercent, {
                  shouldDirty: true,
                  shouldTouch: true,
                });
              }}
            />
          </div>

          {/* ⭐ Photos dashboard avec upload automatique */}
          <PhotoCaptureField
            label="Photos du tableau de bord (compteur km + jauge carburant)"
            description={
              uploadingDashboard
                ? "⏳ Upload vers checkin-photos/booking_.../depart/photos_dashboard_..."
                : "Prends une photo bien lisible du compteur et du niveau de carburant."
            }
            value={watch("releves.dashboardPhotos") || []}
            onChange={handleUploadDashboardPhotos}
            multiple={true}
          />

          {/* Horodatage des photos déjà uploadées */}
          {Array.isArray(dashboardPhotosData) && dashboardPhotosData.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs text-slate-700">
              {dashboardPhotosData.map((photo: any, idx: number) => (
                <div key={photo.storagePath || idx} className="border border-muted rounded-md p-2 bg-muted/30">
                  <div className="font-medium text-slate-800">
                    Photo {idx + 1}
                  </div>
                  {photo.uploadedAt ? (
                    <div className="text-slate-600">
                      Prise le {formatPhotoTimestamp(photo.uploadedAt)}
                    </div>
                  ) : (
                    <div className="text-slate-500 italic">Horodatage indisponible</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {uploadingDashboard && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Upload en cours vers Supabase Storage...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ⭐ Bouton de fin d'étape */}
      <div className="flex justify-end pt-4">
        <Button
          type="button"
          size="lg"
          onClick={handleCompleteStep2AndGoNext}
          disabled={saving || uploadingDashboard}
          className="w-full md:w-auto"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sauvegarde en cours...
            </>
          ) : (
            <>
              Terminer les relevés et passer à l'inspection extérieure
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
