import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, CreditCard, Calendar, Globe, ArrowRight, Loader2 } from "lucide-react";
import { PhotoCaptureField } from "@/components/ui/PhotoCaptureField";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { saveStep1Draft, buildStep1Payload } from "@/services/checkinDepartService";
import { CheckinPhotoService } from "@/services/supabase/checkinPhotos";

interface Section1IdentificationProps {
  onComplete?: () => void;
  bookingId?: string;
  bookingReferenceNumber?: number | null;  // ⭐ NOUVEAU : pour naming des fichiers
  ownerId?: string | null;
  renterId?: string | null;
  checkinId?: string | null;
  onCheckinIdChange?: (id: string) => void;
}

export default function Section1Identification({
  onComplete,
  bookingReferenceNumber,  // ⭐ NOUVEAU
  bookingId,
  ownerId,
  renterId,
  checkinId,
  onCheckinIdChange,
}: Section1IdentificationProps) {
  const { control, watch, setValue, trigger, getValues } = useFormContext();
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingRecto, setUploadingRecto] = useState(false);
  const [uploadingVerso, setUploadingVerso] = useState(false);
  
  // ⭐ États pour contrôler l'ouverture des Select (fix removeChild)
  // En rendant les Select contrôlés, on évite les problèmes de Portal lors du démontage
  // Fix minimal : uniquement contrôle React state, pas de manipulation DOM
  const [paysEmissionOpen, setPaysEmissionOpen] = useState(false);
  const [categoriePermisOpen, setCategoriePermisOpen] = useState(false);

  /**
   * 🛠️ HELPER : Convertir base64 → File
   * PhotoCaptureField renvoie du base64, mais Supabase Storage attend un File
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
   * ⭐ VALIDATION DE L'ÉTAPE 1 - Règles strictes
   * Valide tous les champs obligatoires de l'identification
   */
  const validateStep1 = async (): Promise<{ isValid: boolean; errors: string[] }> => {
    const errors: string[] = [];

    // Liste des champs obligatoires de l'étape 1
    const requiredFields = [
      "conducteur.nom",
      "conducteur.prenom",
      "conducteur.numeroPermis",
      "conducteur.paysEmission",
      "conducteur.dateDelivrance",
      "conducteur.dateExpiration",
      "conducteur.categoriePermis",
    ];

    // Validation avec React Hook Form (trigger Zod)
    const isValid = await trigger(requiredFields);

    if (!isValid) {
      // Récupérer les valeurs pour construire la liste des erreurs
      const values = getValues();

      const labelMap: Record<string, string> = {
        "conducteur.nom": "Nom",
        "conducteur.prenom": "Prénom",
        "conducteur.numeroPermis": "Numéro de permis",
        "conducteur.paysEmission": "Pays d'émission",
        "conducteur.dateDelivrance": "Date de délivrance",
        "conducteur.dateExpiration": "Date d'expiration",
        "conducteur.categoriePermis": "Catégorie de permis",
      };

      requiredFields.forEach((field) => {
        const value = field.split(".").reduce((obj: any, key) => obj?.[key], values);
        if (!value || value === "") {
          errors.push(labelMap[field] || field);
        }
      });
    }

    return { isValid, errors };
  };

  /**
   * ⭐ UPLOAD PHOTO PERMIS RECTO
   * 
   * PhotoCaptureField renvoie du base64 → on convertit en File → on upload vers Storage
   * Pattern identique à l'upload des photos de véhicules
   */
  const handleUploadPermisRecto = async (base64OrNull: string | string[] | null) => {
    // Cas suppression
    if (!base64OrNull) {
      setValue("conducteur.driver_license_photos_recto", null, { shouldDirty: true });
      return;
    }

    // Sécurité type (multiple = false donc devrait être string)
    const base64 = Array.isArray(base64OrNull) ? base64OrNull[0] : base64OrNull;

    // Si c'est déjà une URL Supabase (commence par http), on la garde telle quelle
    if (base64.startsWith('http')) {
      console.log("[STEP1] Photo recto déjà uploadée (URL), pas de re-upload");
      setValue("conducteur.driver_license_photos_recto", base64, { shouldDirty: true });
      return;
    }

    // Si ce n'est pas du base64 valide, skip
    if (!base64.startsWith('data:image/')) {
      console.warn("[STEP1] Format base64 invalide pour recto");
      return;
    }

    // Vérifier booking_id
    if (!bookingId) {
      toast.error("Impossible d'uploader : ID de réservation manquant");
      return;
    }

    setUploadingRecto(true);
    try {
      // Convertir base64 → File
      const file = base64ToFile(base64, `permis_recto_${Date.now()}.jpg`);

      console.log("[STEP1] Conversion base64 → File OK, taille:", file.size, "bytes");

      // Upload vers Supabase Storage avec reference_number pour naming
      const { data, error } = await CheckinPhotoService.uploadLicenseRecto(
        file,
        bookingId,
        bookingReferenceNumber  // ⭐ NOUVEAU : pour naming resa_8/...
      );

      if (error) {
        toast.error("Erreur d'upload photo recto", { description: error });
        console.error("[STEP1] Erreur upload recto:", error);
        return;
      }

      // ✅ Stocker l'URL publique dans le state RHF (pas le base64)
      setValue("conducteur.driver_license_photos_recto", data!.publicUrl, { shouldDirty: true });  // ⭐ FIX : publicUrl au lieu de url
      toast.success("📸 Photo recto uploadée avec succès");
      console.log("[STEP1] Photo recto uploadée → URL:", data!.publicUrl);

    } catch (error: any) {
      toast.error("Erreur inattendue lors de l'upload", { description: error.message });
      console.error("[STEP1] Exception upload recto:", error);
    } finally {
      setUploadingRecto(false);
    }
  };

  /**
   * ⭐ UPLOAD PHOTO PERMIS VERSO
   * 
   * PhotoCaptureField renvoie du base64 → on convertit en File → on upload vers Storage
   * Pattern identique à l'upload des photos de véhicules
   */
  const handleUploadPermisVerso = async (base64OrNull: string | string[] | null) => {
    // Cas suppression
    if (!base64OrNull) {
      setValue("conducteur.driver_license_photos_verso", null, { shouldDirty: true });
      return;
    }

    // Sécurité type (multiple = false donc devrait être string)
    const base64 = Array.isArray(base64OrNull) ? base64OrNull[0] : base64OrNull;

    // Si c'est déjà une URL Supabase (commence par http), on la garde telle quelle
    if (base64.startsWith('http')) {
      console.log("[STEP1] Photo verso déjà uploadée (URL), pas de re-upload");
      setValue("conducteur.driver_license_photos_verso", base64, { shouldDirty: true });
      return;
    }

    // Si ce n'est pas du base64 valide, skip
    if (!base64.startsWith('data:image/')) {
      console.warn("[STEP1] Format base64 invalide pour verso");
      return;
    }

    // Vérifier booking_id
    if (!bookingId) {
      toast.error("Impossible d'uploader : ID de réservation manquant");
      return;
    }

    setUploadingVerso(true);
    try {
      // Convertir base64 → File
      const file = base64ToFile(base64, `permis_verso_${Date.now()}.jpg`);

      console.log("[STEP1] Conversion base64 → File OK, taille:", file.size, "bytes");

      // Upload vers Supabase Storage avec reference_number pour naming
      const { data, error } = await CheckinPhotoService.uploadLicenseVerso(
        file,
        bookingId,
        bookingReferenceNumber  // ⭐ NOUVEAU : pour naming resa_8/...
      );

      if (error) {
        toast.error("Erreur d'upload photo verso", { description: error });
        console.error("[STEP1] Erreur upload verso:", error);
        return;
      }

      // ✅ Stocker l'URL publique dans le state RHF (pas le base64)
      setValue("conducteur.driver_license_photos_verso", data!.publicUrl, { shouldDirty: true });  // ⭐ FIX : publicUrl au lieu de url
      toast.success("📸 Photo verso uploadée avec succès");
      console.log("[STEP1] Photo verso uploadée → URL:", data!.publicUrl);

    } catch (error: any) {
      toast.error("Erreur inattendue lors de l'upload", { description: error.message });
      console.error("[STEP1] Exception upload verso:", error);
    } finally {
      setUploadingVerso(false);
    }
  };

  /**
   * ⭐ HANDLER PRINCIPAL - Valide + Auto-Save + Navigation
   * 
   * 1. Valide les champs de l'étape 1
   * 2. Envoie les données au backend via /api/checkin/saveDraft
   * 3. Stocke le checkin_id retourné
   * 4. Passe à l'étape suivante uniquement si succès
   */
  const handleCompleteIdentificationAndGoNext = async () => {
    // ⭐ FIX removeChild : Fermer tous les Select avant navigation (React state uniquement)
    setPaysEmissionOpen(false);
    setCategoriePermisOpen(false);
    
    // 🔍 Étape 1 : Validation front-end stricte
    const validation = await validateStep1();

    if (!validation.isValid) {
      // Blocage strict : afficher les erreurs
      toast.error("Identification incomplète", {
        description:
          validation.errors.length > 0
            ? `Champs manquants : ${validation.errors.slice(0, 3).join(", ")}${
                validation.errors.length > 3 ? ` (+${validation.errors.length - 3} autre(s))` : ""
              }`
            : "Veuillez remplir tous les champs obligatoires",
      });

      // Scroll vers le premier champ en erreur (optionnel mais améliore l'UX)
      // ⭐ FIX removeChild : Vérifier que l'élément est toujours dans le DOM avant scrollIntoView
      setTimeout(() => {
        const firstError = document.querySelector('[role="alert"]');
        // Vérifier que l'élément existe ET qu'il est toujours attaché au DOM
        if (firstError && firstError.isConnected && document.body.contains(firstError)) {
          firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);

      return;
    }

    // 🔍 Étape 2 : Vérification booking_id (sécurité)
    if (!bookingId) {
      toast.error("❌ Erreur : ID de réservation manquant");
      console.error("[STEP1] Missing bookingId, cannot save");
      return;
    }

    // 🚀 Étape 3 : Sauvegarde backend
    setIsSaving(true);
    
    try {
      const formValues = getValues();
      const step1Payload = buildStep1Payload(formValues);

      console.log("[STEP1] Envoi auto-save...", {
        bookingId,
        hasCheckinId: !!checkinId,
        payloadKeys: Object.keys(step1Payload),
      });

      // Appel API
      const response = await saveStep1Draft({
        bookingId,
        ownerId: ownerId || null,
        renterId: renterId || null,
        checkinId: checkinId || null,
        step1: step1Payload,
      });

      console.log("[STEP1] ✅ Sauvegarde OK, checkinId:", response.checkinId);

      // ⭐ FIX : Propager le checkinId AVANT de naviguer
      // On utilise une approche synchrone : d'abord on met à jour le parent,
      // puis on ajoute un micro-délai pour garantir que React a propagé le state
      if (onCheckinIdChange && response.checkinId) {
        onCheckinIdChange(response.checkinId);
        console.log("[STEP1] ✅ Propagation checkinId au parent:", response.checkinId);
        
        // ⭐ Attendre un cycle de rendu React pour garantir la propagation du state
        // Ceci permet à EtatDesLieuxDepartForm de mettre à jour son state
        // et de passer la nouvelle valeur de checkinId à Section2Releves
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      toast.success("✅ Identification sauvegardée avec succès !");

      // 🔀 Navigation vers Étape 2 (maintenant le checkinId est garanti d'être à jour)
      if (onComplete) {
        onComplete();
      }

    } catch (error: any) {
      // ❌ Erreur de sauvegarde
      console.error("[STEP1] Erreur auto-save:", error);
      
      toast.error(
        error.message || "❌ Erreur de sauvegarde - Veuillez réessayer",
        {
          description: "Vos données n'ont pas été perdues, vous pouvez réessayer.",
          duration: 6000,
        }
      );
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
          Renseignez les informations du conducteur principal
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
                    <Input placeholder="Dupont" {...field} />
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
                    <Input placeholder="Jean" {...field} />
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
            Permis de conduire
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name="conducteur.numeroPermis"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numéro de permis *</FormLabel>
                <FormControl>
                  <Input placeholder="12345678901234567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="conducteur.paysEmission"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Pays d'émission *
                  </FormLabel>
                  <Select 
                    open={paysEmissionOpen} 
                    onOpenChange={setPaysEmissionOpen}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Fermer le Select après sélection pour éviter les problèmes de Portal
                      setPaysEmissionOpen(false);
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un pays" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="FR">France</SelectItem>
                      <SelectItem value="BE">Belgique</SelectItem>
                      <SelectItem value="CH">Suisse</SelectItem>
                      <SelectItem value="DE">Allemagne</SelectItem>
                      <SelectItem value="IT">Italie</SelectItem>
                      <SelectItem value="ES">Espagne</SelectItem>
                      <SelectItem value="PT">Portugal</SelectItem>
                      <SelectItem value="GB">Royaume-Uni</SelectItem>
                      <SelectItem value="OTHER">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="conducteur.categoriePermis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie *</FormLabel>
                  <Select 
                    open={categoriePermisOpen} 
                    onOpenChange={setCategoriePermisOpen}
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Fermer le Select après sélection pour éviter les problèmes de Portal
                      setCategoriePermisOpen(false);
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="B">B - Voiture</SelectItem>
                      <SelectItem value="A">A - Moto</SelectItem>
                      <SelectItem value="C">C - Poids lourd</SelectItem>
                      <SelectItem value="D">D - Transport de personnes</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={control}
              name="conducteur.dateDelivrance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date de délivrance *
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="conducteur.dateExpiration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date d'expiration *
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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

      {/* ⭐ BOUTON DE NAVIGATION AVEC VALIDATION + AUTO-SAVE */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={handleCompleteIdentificationAndGoNext}
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
            <>
              Terminer l'identification et passer aux relevés
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

