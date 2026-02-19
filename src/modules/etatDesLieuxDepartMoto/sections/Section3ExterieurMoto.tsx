import { useState, useRef, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Camera, X, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CheckinPhotoService } from "@/services/supabase/checkinPhotos";
import { saveStep3DraftMoto } from "@/services/checkinDepartService";
import type { Step3MotoData, MotoExteriorZone, MotoPhoto } from "../types/step3Moto";

interface Section3ExterieurMotoProps {
  bookingId?: string;
  bookingReferenceNumber?: number | null;
  ownerId?: string | null;
  renterId?: string | null;
  checkinId?: string | null;
  onCheckinIdChange?: (id: string) => void;
  onComplete?: () => void;
  initialData?: Step3MotoData | null;
  isReadOnly?: boolean;
}

const motoZones: Array<{
  id: MotoExteriorZone;
  label: string;
  description: string;
  bddColumn: "photos_exterieur" | "photos_jantes";
}> = [
  {
    id: "avant",
    label: "Avant",
    description: "Photo de l'avant de la moto (phare, garde-boue avant)",
    bddColumn: "photos_exterieur",
  },
  {
    id: "cote_droit",
    label: "Côté droit",
    description: "Photo du côté droit de la moto",
    bddColumn: "photos_exterieur",
  },
  {
    id: "arriere",
    label: "Arrière",
    description: "Photo de l'arrière de la moto (feux, garde-boue arrière)",
    bddColumn: "photos_exterieur",
  },
  {
    id: "cote_gauche",
    label: "Côté gauche",
    description: "Photo du côté gauche de la moto",
    bddColumn: "photos_exterieur",
  },
  {
    id: "jantes",
    label: "Jantes / Roues",
    description: "Photos des jantes et roues (avant et arrière)",
    bddColumn: "photos_jantes",
  },
];

export function Section3ExterieurMoto({
  bookingId,
  bookingReferenceNumber,
  ownerId,
  renterId,
  checkinId,
  onCheckinIdChange,
  onComplete,
  initialData,
}: Section3ExterieurMotoProps) {
  // ⭐ Step 3A : Accès RHF pour damageReports
  const { watch, setValue, getValues } = useFormContext();
  const damageReports = watch("damageReports") || [];

  const [zonesPhotos, setZonesPhotos] = useState<Step3MotoData["zonesPhotos"]>(
    initialData?.zonesPhotos || {}
  );
  const [isUploading, setIsUploading] = useState<Record<MotoExteriorZone, boolean>>({
    avant: false,
    cote_droit: false,
    arriere: false,
    cote_gauche: false,
    jantes: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  // ⭐ Step 3B : State pour upload photos dégâts
  const [isUploadingDamagePhoto, setIsUploadingDamagePhoto] = useState<Record<number, boolean>>({});
  const fileInputRefs = useRef<Record<MotoExteriorZone, HTMLInputElement | null>>({
    avant: null,
    cote_droit: null,
    arriere: null,
    cote_gauche: null,
    jantes: null,
  });
  // ⭐ Step 3B : Refs pour inputs file photos dégâts
  const damagePhotoInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // ⭐ Hydratation depuis initialData (draft chargé)
  useEffect(() => {
    if (initialData?.zonesPhotos) {
      console.log("[Moto Step3] 🔄 Hydratation depuis draft:", {
        zones: Object.keys(initialData.zonesPhotos),
        totalPhotos: Object.values(initialData.zonesPhotos).flat().length,
      });
      setZonesPhotos(initialData.zonesPhotos);
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

  // Upload photo pour une zone
  const handleUploadPhoto = async (
    zone: MotoExteriorZone,
    files: FileList | null
  ) => {
    if (!files || files.length === 0 || !bookingId) return;

    setIsUploading((prev) => ({ ...prev, [zone]: true }));

    try {
      const zoneConfig = motoZones.find((z) => z.id === zone);
      if (!zoneConfig) return;

      const uploadedPhotos: MotoPhoto[] = [];

      for (const file of Array.from(files)) {
        // Convertir en base64 puis en File
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const fileObj = base64ToFile(base64, `${zone}_${Date.now()}.jpg`);

        let result;
        if (zoneConfig.bddColumn === "photos_exterieur") {
          // Mapping zones moto vers zones attendues par le service
          const serviceZoneMap: Record<MotoExteriorZone, string> = {
            avant: "avant",
            cote_droit: "droit",
            arriere: "arriere",
            cote_gauche: "gauche",
            jantes: "jantes", // Ne sera pas utilisé ici
          };
          const serviceZone = serviceZoneMap[zone];
          
          // Upload vers photos_exterieur avec suffix zone
          result = await CheckinPhotoService.uploadExteriorZonePhoto(
            fileObj,
            bookingId,
            bookingReferenceNumber,
            serviceZone
          );
        } else {
          // Upload vers photos_jantes avec suffix jantes (pour moto, on utilise un suffix simple)
          result = await CheckinPhotoService.uploadWheelPhoto(
            fileObj,
            bookingId,
            bookingReferenceNumber,
            "jantes" // Suffix simple pour moto
          );
        }

        if (result.error || !result.data) {
          console.error(`[Moto Step3] Erreur upload ${zone}:`, result.error);
          toast.error(`Erreur lors de l'upload de la photo ${zone}`);
          continue;
        }

        uploadedPhotos.push({
          url: result.data.publicUrl,
          storagePath: result.data.storagePath,
        });
      }

      if (uploadedPhotos.length > 0) {
        setZonesPhotos((prev) => ({
          ...prev,
          [zone]: [...(prev[zone] || []), ...uploadedPhotos],
        }));
        toast.success(`${uploadedPhotos.length} photo(s) ajoutée(s) pour ${zoneConfig.label}`);
      }
    } catch (error) {
      console.error(`[Moto Step3] Exception upload ${zone}:`, error);
      toast.error(`Erreur lors de l'upload des photos`);
    } finally {
      setIsUploading((prev) => ({ ...prev, [zone]: false }));
      // Reset input
      const input = fileInputRefs.current[zone];
      if (input) input.value = "";
    }
  };

  // ⭐ Helper pour obtenir un identifiant stable d'une photo (storagePath prioritaire, fallback url)
  const getPhotoId = (photo: MotoPhoto): string => {
    return (photo.storagePath?.trim() ? photo.storagePath : photo.url);
  };

  // Supprimer une photo (local seulement)
  const handleRemovePhoto = (zone: MotoExteriorZone, photoId: string) => {
    setZonesPhotos((prev) => {
      const zonePhotos = prev[zone] || [];
      // ⭐ Comparer sur getPhotoId pour gérer le fallback storagePath → url
      const updated = zonePhotos.filter((photo) => getPhotoId(photo) !== photoId);
      return {
        ...prev,
        [zone]: updated.length > 0 ? updated : undefined,
      };
    });
    toast.success("Photo supprimée");
  };

  // ⭐ Step 3A : Handlers pour gérer damageReports
  const handleAddDamage = () => {
    const newDamage = { side: "avant", typeDegats: [], commentaire: "", photos: [] };
    setValue("damageReports", [...damageReports, newDamage], {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handleUpdateDamage = (index: number, field: "side" | "commentaire", value: string) => {
    const updated = [...damageReports];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setValue("damageReports", updated, {
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handleRemoveDamage = (index: number) => {
    const updated = damageReports.filter((_: any, i: number) => i !== index);
    setValue("damageReports", updated, {
      shouldDirty: true,
      shouldTouch: true,
    });
    toast.success("Dégât supprimé");
  };

  // ⭐ Step 3B : Upload photo pour un dégât
  const handleAddDamagePhoto = async (damageIndex: number, files: FileList | null) => {
    if (!files || files.length === 0 || !bookingId) {
      if (!bookingId) {
        toast.error("Erreur : bookingId manquant");
      }
      return;
    }

    setIsUploadingDamagePhoto((prev) => ({ ...prev, [damageIndex]: true }));

    try {
      const damage = damageReports[damageIndex];
      if (!damage) {
        toast.error("Dégât introuvable");
        return;
      }

      const zone = damage.side || "avant";
      const uploadedPhotos: MotoPhoto[] = [];

      for (const file of Array.from(files)) {
        // Convertir en base64 puis en File (même logique que zones)
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const fileObj = base64ToFile(base64, `degat_${damageIndex}_${Date.now()}.jpg`);

        // Upload via CheckinPhotoService
        const result = await CheckinPhotoService.uploadDamagePhoto(
          fileObj,
          bookingId,
          bookingReferenceNumber,
          zone,
          damageIndex
        );

        if (result.error || !result.data) {
          console.error(`[Moto Step3] Erreur upload photo dégât ${damageIndex}:`, result.error);
          toast.error(`Erreur lors de l'upload de la photo`);
          continue;
        }

        uploadedPhotos.push({
          url: result.data.publicUrl,
          storagePath: result.data.storagePath,
        });
      }

      if (uploadedPhotos.length > 0) {
        const updated = [...damageReports];
        updated[damageIndex] = {
          ...updated[damageIndex],
          photos: [...(updated[damageIndex].photos || []), ...uploadedPhotos],
        };
        setValue("damageReports", updated, {
          shouldDirty: true,
          shouldTouch: true,
        });
        toast.success(`${uploadedPhotos.length} photo(s) ajoutée(s) pour ce dégât`);
      }
    } catch (error) {
      console.error(`[Moto Step3] Exception upload photo dégât ${damageIndex}:`, error);
      toast.error(`Erreur lors de l'upload des photos`);
    } finally {
      setIsUploadingDamagePhoto((prev) => ({ ...prev, [damageIndex]: false }));
      // Reset input
      const input = damagePhotoInputRefs.current[damageIndex];
      if (input) input.value = "";
    }
  };

  // ⭐ Step 3B : Supprimer une photo d'un dégât (local seulement)
  const handleRemoveDamagePhoto = (damageIndex: number, photoIndex: number) => {
    const updated = [...damageReports];
    const damage = updated[damageIndex];
    if (!damage || !damage.photos) return;

    const updatedPhotos = damage.photos.filter((_: any, i: number) => i !== photoIndex);
    updated[damageIndex] = {
      ...damage,
      photos: updatedPhotos.length > 0 ? updatedPhotos : [],
    };

    setValue("damageReports", updated, {
      shouldDirty: true,
      shouldTouch: true,
    });
    toast.success("Photo supprimée");
  };

  // Vérifier si toutes les zones ont au moins une photo
  const allZonesHavePhotos = motoZones.every(
    (zone) => zonesPhotos[zone.id] && zonesPhotos[zone.id]!.length > 0
  );

  const handleComplete = async () => {
    if (!allZonesHavePhotos) {
      toast.error("Veuillez ajouter au moins une photo pour chaque zone");
      return;
    }

    if (!bookingId) {
      toast.error("Erreur : bookingId manquant");
      return;
    }

    setIsSaving(true);

    try {
      // ⭐ Step 3A : Récupérer damageReports depuis RHF
      const currentDamageReports = getValues("damageReports") || [];

      // ⭐ Persister zonesPhotos dans le form pour Section8ValidationMoto (sauvegarde avant finalisation)
      setValue("step3ZonesPhotos" as any, zonesPhotos, { shouldDirty: false, shouldTouch: false });

      // Préparer le payload Step 3
      const step3Payload: Step3MotoData & { damageReports?: any[] } = {
        zonesPhotos,
        completedAt: new Date().toISOString(),
        damageReports: currentDamageReports,
      };

      // Sauvegarder via le service moto
      const result = await saveStep3DraftMoto({
        bookingId,
        ownerId: ownerId || null,
        renterId: renterId || null,
        checkinId: checkinId || null,
        step3: step3Payload,
      });

      // Propager le checkinId
      if (result.checkinId && onCheckinIdChange) {
        onCheckinIdChange(result.checkinId);
      }

      toast.success("✅ Étape 3 sauvegardée !", {
        description: "Les photos ont été enregistrées avec succès.",
      });

      // Navigation vers l'étape suivante
      onComplete?.();
    } catch (error: any) {
      console.error("[Moto Step3] ❌ Erreur sauvegarde:", error);
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
        <h2 className="text-2xl font-semibold mb-2">Extérieur de la moto</h2>
        <p className="text-muted-foreground text-sm">
          Prenez des photos de chaque zone de la moto pour documenter son état.
        </p>
      </div>

      <div className="space-y-4">
        {motoZones.map((zoneConfig) => {
          const zone = zoneConfig.id;
          const photos = zonesPhotos[zone] || [];
          const hasPhotos = photos.length > 0;
          const isUploadingZone = isUploading[zone];

          return (
            <Card key={zone}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {zoneConfig.label}
                  {hasPhotos && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {zoneConfig.description}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={(el) => {
                    fileInputRefs.current[zone] = el;
                  }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUploadPhoto(zone, e.target.files)}
                />

                {!hasPhotos ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Aucune photo pour cette zone
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRefs.current[zone]?.click()}
                      disabled={isUploadingZone}
                    >
                      {isUploadingZone ? "Upload en cours..." : "Ajouter une photo"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {photos.map((photo) => {
                        // ⭐ Clé stable basée sur zone + getPhotoId pour éviter les erreurs removeChild
                        // La clé doit être unique même si 2 zones ont la même url
                        const photoId = getPhotoId(photo);
                        const photoKey = `${zone}-${photoId}`;
                        return (
                          <div key={photoKey} className="relative group">
                            <img
                              src={photo.url}
                              alt={`${zoneConfig.label} - Photo`}
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(zone, photoId)}
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
                      onClick={() => fileInputRefs.current[zone]?.click()}
                      disabled={isUploadingZone}
                    >
                      {isUploadingZone ? "Upload en cours..." : "Ajouter une autre photo"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ⭐ Step 3A : Card Dégâts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Dégâts</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddDamage}
            >
              Ajouter un dégât
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {damageReports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun dégât enregistré
            </p>
          ) : (
            damageReports.map((damage: any, index: number) => (
              <div
                key={index}
                className="border border-gray-200 rounded-md p-4 space-y-3 bg-gray-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1 block">
                        Zone
                      </label>
                      <Select
                        value={damage.side || "avant"}
                        onValueChange={(value) => handleUpdateDamage(index, "side", value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sélectionner une zone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="avant">Avant</SelectItem>
                          <SelectItem value="droit">Côté droit</SelectItem>
                          <SelectItem value="arriere">Arrière</SelectItem>
                          <SelectItem value="gauche">Côté gauche</SelectItem>
                          <SelectItem value="janteAvDroit">Jantes / Roues</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1 block">
                        Commentaire
                      </label>
                      <Textarea
                        value={damage.commentaire || ""}
                        onChange={(e) => handleUpdateDamage(index, "commentaire", e.target.value)}
                        placeholder="Décrire le dégât observé..."
                        className="min-h-[80px]"
                      />
                    </div>
                    {/* ⭐ Step 3B : Photos du dégât */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-1 block">
                        Photos du dégât
                      </label>
                      <input
                        ref={(el) => {
                          damagePhotoInputRefs.current[index] = el;
                        }}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={(e) => handleAddDamagePhoto(index, e.target.files)}
                      />
                      <div className="space-y-2">
                        {damage.photos && Array.isArray(damage.photos) && damage.photos.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {damage.photos.map((photo: MotoPhoto, photoIndex: number) => (
                              <div key={photoIndex} className="relative group">
                                <img
                                  src={photo.url}
                                  alt={`Dégât ${index + 1} - Photo ${photoIndex + 1}`}
                                  className="w-full h-24 object-cover rounded-lg border"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDamagePhoto(index, photoIndex)}
                                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-sm hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                                  aria-label="Supprimer la photo"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => damagePhotoInputRefs.current[index]?.click()}
                          disabled={isUploadingDamagePhoto[index]}
                          className="w-full"
                        >
                          {isUploadingDamagePhoto[index] ? (
                            <span className="flex items-center gap-2">
                              <span>Upload en cours...</span>
                            </span>
                          ) : (
                            "Ajouter une photo"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveDamage(index)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4 border-t">
        <Button
          type="button"
          onClick={handleComplete}
          disabled={!allZonesHavePhotos || isSaving}
        >
          {isSaving ? "Sauvegarde en cours..." : "Suivant"}
        </Button>
      </div>
    </div>
  );
}
