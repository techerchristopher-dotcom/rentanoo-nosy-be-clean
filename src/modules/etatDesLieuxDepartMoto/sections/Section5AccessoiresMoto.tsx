import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Camera, X, Package, Shield, Lock, Smartphone, Luggage, Zap, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { CheckinPhotoService } from "@/services/supabase/checkinPhotos";
import { saveStep5DraftMoto } from "@/services/checkinDepartService";

type MotoAccessoryKey =
  | "casque"
  | "gants"
  | "cadenas"
  | "support_telephone"
  | "top_case"
  | "prise_usb"
  | "gilet_jaune"
  | "autre";

interface MotoPhoto {
  url: string;
  storagePath: string;
}

interface Step5MotoData {
  completedAt?: string;
  accessories: Record<MotoAccessoryKey, boolean>;
  photos: MotoPhoto[];
  notes?: string;
}

interface Section5AccessoiresMotoProps {
  bookingId?: string;
  bookingReferenceNumber?: number | null;
  ownerId?: string | null;
  renterId?: string | null;
  checkinId?: string | null;
  onCheckinIdChange?: (id: string) => void;
  onComplete?: () => void;
  initialData?: Step5MotoData | null;
  isReadOnly?: boolean;
}

const motoAccessories: Array<{
  key: MotoAccessoryKey;
  label: string;
  icon: typeof Package;
}> = [
  {
    key: "casque",
    label: "Casque",
    icon: Shield,
  },
  {
    key: "gants",
    label: "Gants",
    icon: Shield,
  },
  {
    key: "cadenas",
    label: "Cadenas antivol",
    icon: Lock,
  },
  {
    key: "support_telephone",
    label: "Support téléphone",
    icon: Smartphone,
  },
  {
    key: "top_case",
    label: "Top case / Coffre",
    icon: Luggage,
  },
  {
    key: "prise_usb",
    label: "Prise USB",
    icon: Zap,
  },
  {
    key: "gilet_jaune",
    label: "Gilet jaune / Réfléchissant",
    icon: AlertTriangle,
  },
  {
    key: "autre",
    label: "Autre accessoire",
    icon: Package,
  },
];

export function Section5AccessoiresMoto({
  bookingId,
  bookingReferenceNumber,
  ownerId,
  renterId,
  checkinId,
  onCheckinIdChange,
  onComplete,
  initialData,
}: Section5AccessoiresMotoProps) {
  const [accessories, setAccessories] = useState<Record<MotoAccessoryKey, boolean>>(
    initialData?.accessories || {
      casque: false,
      gants: false,
      cadenas: false,
      support_telephone: false,
      top_case: false,
      prise_usb: false,
      gilet_jaune: false,
      autre: false,
    }
  );
  const [photos, setPhotos] = useState<MotoPhoto[]>(initialData?.photos || []);
  const [notes, setNotes] = useState<string>(initialData?.notes || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ⭐ Hydratation depuis initialData (draft chargé)
  useEffect(() => {
    if (initialData) {
      console.log("[Moto Step5] 🔄 Hydratation depuis draft:", {
        accessoriesCount: Object.keys(initialData.accessories || {}).length,
        photosCount: (initialData.photos || []).length,
        hasNotes: !!initialData.notes,
      });
      if (initialData.accessories) {
        setAccessories(initialData.accessories);
      }
      if (initialData.photos) {
        setPhotos(initialData.photos);
      }
      if (initialData.notes) {
        setNotes(initialData.notes);
      }
    }
  }, [initialData]);

  // Convertir base64 en File
  const base64ToFile = (base64: string, filename: string): File => {
    const arr = base64.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // Upload photos
  const handleUploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0 || !bookingId) return;

    setIsUploading(true);

    try {
      const uploadedPhotos: MotoPhoto[] = [];

      for (const file of Array.from(files)) {
        // Convertir en base64 puis en File
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const fileObj = base64ToFile(base64, `accessoires_${Date.now()}.jpg`);

        // Upload vers photos_accessoires
        const result = await CheckinPhotoService.uploadAccessoryPhoto(
          fileObj,
          bookingId,
          bookingReferenceNumber
        );

        if (result.error || !result.data) {
          console.error(`[Moto Step5] Erreur upload accessoires:`, result.error);
          toast.error(`Erreur lors de l'upload d'une photo`);
          continue;
        }

        uploadedPhotos.push({
          url: result.data.publicUrl,
          storagePath: result.data.storagePath,
        });
      }

      if (uploadedPhotos.length > 0) {
        setPhotos((prev) => [...prev, ...uploadedPhotos]);
        toast.success(`${uploadedPhotos.length} photo(s) ajoutée(s)`);
      }
    } catch (error) {
      console.error(`[Moto Step5] Exception upload accessoires:`, error);
      toast.error(`Erreur lors de l'upload des photos`);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ⭐ Helper pour obtenir un identifiant stable d'une photo (storagePath prioritaire, fallback url)
  const getPhotoId = (photo: MotoPhoto): string => {
    return (photo.storagePath?.trim() ? photo.storagePath : photo.url);
  };

  // Supprimer une photo (local seulement)
  const handleRemovePhoto = (photoId: string) => {
    setPhotos((prev) => {
      // ⭐ Comparer sur getPhotoId pour gérer le fallback storagePath → url
      return prev.filter((photo) => getPhotoId(photo) !== photoId);
    });
    toast.success("Photo supprimée");
  };

  // Toggle accessoire
  const handleToggleAccessory = (key: MotoAccessoryKey) => {
    setAccessories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Préparer le payload Step 5 et sauvegarder
  const handleComplete = async () => {
    if (!bookingId) {
      toast.error("Erreur : bookingId manquant");
      return;
    }

    setIsSaving(true);

    try {
      const step5Payload: Step5MotoData = {
        accessories,
        photos,
        notes: notes.trim() || undefined,
        completedAt: new Date().toISOString(),
      };

      // Sauvegarder via le service moto
      const result = await saveStep5DraftMoto({
        bookingId,
        ownerId: ownerId || null,
        renterId: renterId || null,
        checkinId: checkinId || null,
        step5: step5Payload,
      });

      // Propager le checkinId
      if (result.checkinId && onCheckinIdChange) {
        onCheckinIdChange(result.checkinId);
      }

      toast.success("✅ Étape 5 sauvegardée !", {
        description: "Les accessoires ont été enregistrés avec succès.",
      });

      // Navigation vers l'étape suivante
      onComplete?.();
    } catch (error: any) {
      console.error("[Moto Step5] ❌ Erreur sauvegarde:", error);
      toast.error("❌ Erreur lors de la sauvegarde", {
        description: error.message || "Vos données n'ont pas été perdues, vous pouvez réessayer.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          Accessoires & Équipements
        </h2>
        <p className="text-muted-foreground text-sm">
          Vérifiez la présence des accessoires et équipements de la moto.
        </p>
      </div>

      {/* Checklist accessoires */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inventaire des accessoires</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {motoAccessories.map((accessory) => {
              const Icon = accessory.icon;
              return (
                <div
                  key={accessory.key}
                  className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleToggleAccessory(accessory.key)}
                >
                  <Checkbox
                    checked={accessories[accessory.key]}
                    onCheckedChange={() => handleToggleAccessory(accessory.key)}
                    className="mt-1"
                  />
                  <div className="space-y-1 leading-none flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <label className="cursor-pointer text-sm font-medium">
                      {accessory.label}
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upload photos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Photos des accessoires</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => handleUploadPhotos(e.target.files)}
          />

          {photos.length === 0 ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-muted-foreground mb-4">
                Aucune photo d'accessoire
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? "Upload en cours..." : "Ajouter des photos"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo) => {
                  // ⭐ Clé stable basée sur getPhotoId pour éviter les erreurs removeChild
                  const photoId = getPhotoId(photo);
                  return (
                    <div key={photoId} className="relative group">
                      <img
                        src={photo.url}
                        alt="Accessoire - Photo"
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photoId)}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Supprimer la photo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? "Upload en cours..." : "Ajouter d'autres photos"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notes sur les accessoires (optionnel)</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Ajoutez un commentaire sur les accessoires présents ou manquants..."
            className="min-h-[100px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Bouton Suivant */}
      <div className="flex justify-end pt-4">
        <Button
          type="button"
          onClick={handleComplete}
          disabled={isSaving}
        >
          {isSaving ? "Sauvegarde en cours..." : "Suivant"}
        </Button>
      </div>
    </div>
  );
}
