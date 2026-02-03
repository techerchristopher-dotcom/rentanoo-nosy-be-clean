import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SupabaseVehiclesService } from "@/services/supabaseVehiclesService";
import { uploadVehiclePhotos } from "@/templates/vehicleTemplate";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Bike, Camera, Upload, CheckCircle, Trash2, ArrowRight } from "lucide-react";

export default function AddMotoPlaceholder() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // 🔍 ÉTAPE 1 - DIAGNOSTIC RENDER (preuve qu'on modifie le bon composant)
  const COMPONENT_FILE_PATH = "src/pages/owner/AddMotoPlaceholder.tsx";
  const BUILD_VERSION = "v2.0-diagnostic";
  console.log("[ADD-MOTO] render", { 
    file: COMPONENT_FILE_PATH,
    version: BUILD_VERSION,
    timestamp: new Date().toISOString()
  });

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [engineCapacity, setEngineCapacity] = useState("");
  const [vehicleKind, setVehicleKind] = useState<"moto" | "scooter" | "">("");
  const [licensePlate, setLicensePlate] = useState("");
  const [dailyPrice, setDailyPrice] = useState("");
  const [mileage, setMileage] = useState("");
  const [fuelType, setFuelType] = useState<"gasoline" | "electric" | "hybrid" | "">("");
  const [transmission, setTransmission] = useState<"manual" | "automatic" | "">("");
  const [seats, setSeats] = useState("2");
  const [description, setDescription] = useState("");
  const [vehiclePhotos, setVehiclePhotos] = useState<{
    frontLeft: File | null;
    profileLeft: File | null;
    interior: File | null;
  }>({
    frontLeft: null,
    profileLeft: null,
    interior: null,
  });
  const [additionalPhotos, setAdditionalPhotos] = useState<(File | null)[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePhotoUpload = (photoType: "frontLeft" | "profileLeft" | "interior", file: File) => {
    console.log("[Moto] handlePhotoUpload called", { photoType, fileName: file?.name, fileType: file?.type, fileSize: file?.size });
    if (!file.type.startsWith("image/")) {
      toast({
        title: t("common.error", "Erreur"),
        description: t(
          "ownerVehicles.motoForm.photos.invalidType",
          "Veuillez sélectionner un fichier image valide."
        ),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t("common.error", "Erreur"),
        description: t(
          "ownerVehicles.motoForm.photos.tooLarge",
          "La photo doit faire moins de 10MB."
        ),
        variant: "destructive",
      });
      return;
    }

    setVehiclePhotos((prev) => ({
      ...prev,
      [photoType]: file,
    }));

    setFeedbackMessage(
      t("ownerVehicles.motoForm.photos.added", "Photo ajoutée")
    );
    toast({
      title: t("ownerVehicles.motoForm.photos.addedTitle", "Photo ajoutée"),
      description: t(
        "ownerVehicles.motoForm.photos.addedDescription",
        "Votre photo a été ajoutée avec succès."
      ),
    });
  };

  // ✅ CORRECTIF 2 : Handlers onChange simples pour pattern label/htmlFor
  const handleMainPhotoChange = (photoType: "frontLeft" | "profileLeft" | "interior", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("[ADD-MOTO] onChange fired", { photoType, fileName: file.name, filesCount: 1 });
      handlePhotoUpload(photoType, file);
    }
    // Reset input pour permettre de sélectionner le même fichier à nouveau
    e.target.value = "";
  };

  const getPhotoPreview = (file: File | null) => {
    if (!file) return null;
    return URL.createObjectURL(file);
  };

  const handleAdditionalPhotoUpload = (file: File, index: number) => {
    console.log("[Moto] handleAdditionalPhotoUpload called", { index, fileName: file?.name, fileType: file?.type, fileSize: file?.size });
    if (!file.type.startsWith("image/")) {
      toast({
        title: t("common.error", "Erreur"),
        description: t(
          "ownerVehicles.motoForm.photos.invalidType",
          "Veuillez sélectionner un fichier image valide."
        ),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: t("common.error", "Erreur"),
        description: t(
          "ownerVehicles.motoForm.photos.tooLarge",
          "La photo doit faire moins de 10MB."
        ),
        variant: "destructive",
      });
      return;
    }

    setAdditionalPhotos((prev) => {
      const newPhotos = [...prev];
      newPhotos[index] = file;
      return newPhotos;
    });

    setFeedbackMessage(
      t("ownerVehicles.motoForm.photos.additionalAdded", "Photo supplémentaire ajoutée")
    );
    toast({
      title: t("ownerVehicles.motoForm.photos.addedTitle", "Photo ajoutée"),
      description: t(
        "ownerVehicles.motoForm.photos.additionalAddedDescription",
        "Votre photo supplémentaire a été ajoutée avec succès."
      ),
    });
  };

  const removeAdditionalPhoto = (index: number) => {
    setAdditionalPhotos((prev) => {
      const newPhotos = [...prev];
      newPhotos.splice(index, 1);
      return newPhotos;
    });

    setFeedbackMessage(
      t("ownerVehicles.motoForm.photos.removed", "Photo supprimée")
    );
    toast({
      title: t("ownerVehicles.motoForm.photos.removedTitle", "Photo supprimée"),
      description: t(
        "ownerVehicles.motoForm.photos.removedDescription",
        "La photo a été supprimée avec succès."
      ),
    });
  };

  // ✅ CORRECTIF 2 : Handler onChange pour photos supplémentaires individuelles
  const handleAdditionalPhotoChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log("[ADD-MOTO] onChange fired (additional)", { index, fileName: file.name, filesCount: 1 });
      handleAdditionalPhotoUpload(file, index);
    }
    // Reset input pour permettre de sélectionner le même fichier à nouveau
    e.target.value = "";
  };

  // ✅ CORRECTIF 2 : Handler onChange pour bouton "Ajouter des photos" (multiple)
  const handleAddMorePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) {
      console.log("[ADD-MOTO] No files selected");
      return;
    }
    
    console.log("[ADD-MOTO] onChange fired (addMore)", { filesCount: files.length });
    
    Array.from(files)
      .slice(0, 3 - additionalPhotos.length)
      .forEach((file, i) => {
        handleAdditionalPhotoUpload(file, additionalPhotos.length + i);
      });
    
    // Reset input pour permettre de sélectionner les mêmes fichiers à nouveau
    e.target.value = "";
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    console.log("[Moto] handleSubmit called", {
      hasUser: !!user,
      hasFrontLeft: !!vehiclePhotos.frontLeft,
      hasProfileLeft: !!vehiclePhotos.profileLeft,
      hasInterior: !!vehiclePhotos.interior,
      additionalPhotosCount: additionalPhotos.filter((p) => p !== null).length,
    });

    if (!user) {
      toast({
        title: t("common.error", "Erreur"),
        description: t(
          "ownerVehicles.toasts.mustBeLoggedIn.description",
          "Vous devez être connecté pour accéder à cette page"
        ),
        variant: "destructive",
      });
      return;
    }

    const hasPhotos =
      vehiclePhotos.frontLeft ||
      vehiclePhotos.profileLeft ||
      vehiclePhotos.interior ||
      additionalPhotos.some((photo) => photo !== null);

    if (!hasPhotos) {
      toast({
        title: t("common.error", "Erreur"),
        description: t(
          "ownerVehicles.motoForm.photos.minRequired",
          "Veuillez ajouter au moins une photo de votre moto ou scooter."
        ),
        variant: "destructive",
      });
      return;
    }

    // Validations minimales
    if (!brand.trim() || !model.trim() || !dailyPrice.trim() || !year.trim()) {
      toast({
        title: t("common.error", "Erreur"),
        description: t(
          "ownerVehicles.motoForm.errors.required",
          "Merci de renseigner au minimum la marque, le modèle, l'année et le prix par jour."
        ),
        variant: "destructive",
      });
      return;
    }

    const parsedYear = parseInt(year, 10);
    const parsedPrice = parseFloat(dailyPrice.replace(",", "."));
    const parsedMileage = mileage ? parseInt(mileage, 10) : 0;
    const parsedSeats = seats ? parseInt(seats, 10) : 2;

    if (Number.isNaN(parsedYear) || parsedYear < 1950 || parsedYear > 2100) {
      toast({
        title: t("common.error", "Erreur"),
        description: t(
          "ownerVehicles.motoForm.errors.year",
          "Merci de saisir une année valide."
        ),
        variant: "destructive",
      });
      return;
    }

    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      toast({
        title: t("common.error", "Erreur"),
        description: t(
          "ownerVehicles.motoForm.errors.price",
          "Merci de saisir un prix par jour valide."
        ),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log("[Moto] Creating vehicle via SupabaseVehiclesService.createVehicle");
      const { data, error } = await SupabaseVehiclesService.createVehicle({
        owner_id: user.id,
        brand: brand.trim(),
        model: model.trim(),
        color: null,
        year: parsedYear,
        mileage: parsedMileage,
        price_per_day: parsedPrice,
        description: description || undefined,
        image_url: undefined,
        location: undefined,
        seats: parsedSeats,
        doors: undefined,
        transmission: (transmission || "manual") as any,
        fuel_type: (fuelType || "gasoline") as any,
        engine_capacity: engineCapacity || undefined,
        vehicle_type: 'moto',
        has_ac: false,
        has_gps: false,
        has_cruise_control: false,
        has_bluetooth: false,
        has_carplay: false,
        has_audio_input: false,
        low_season_discount: undefined,
        high_season_surcharge: undefined,
        long_duration_discount_14: undefined,
        long_duration_discount_60: undefined,
        available: true,
        status: "active",
      });

      if (error || !data) {
        throw new Error(error || "Erreur lors de la création du véhicule");
      }

      // Upload des photos une fois le véhicule créé
      console.log("[Moto] Vehicle created, starting photo upload", {
        vehicleId: data.id,
        hasFrontLeft: !!vehiclePhotos.frontLeft,
        hasProfileLeft: !!vehiclePhotos.profileLeft,
        hasInterior: !!vehiclePhotos.interior,
        additionalPhotosCount: additionalPhotos.filter((p) => p !== null).length,
      });
      const photoResult = await uploadVehiclePhotos(
        data.id,
        vehiclePhotos,
        additionalPhotos,
        toast
      );

      if (photoResult.uploadedPhotos.length > 0) {
        console.log(
          `${photoResult.uploadedPhotos.length} photos moto/scooter uploadées avec succès`
        );
      }

      if (photoResult.errors.length > 0) {
        console.warn("Erreurs d'upload de photos moto/scooter:", photoResult.errors);
      }

      toast({
        title: t(
          "ownerVehicles.motoForm.successTitle",
          "Moto / scooter ajouté avec succès"
        ),
        description: t(
          "ownerVehicles.motoForm.successDescription",
          "Votre véhicule a été créé. Vous pouvez maintenant le gérer dans la liste de vos véhicules."
        ),
      });

      navigate("/me/owner/vehicles");
    } catch (err: any) {
      console.error("Erreur création véhicule moto:", err);
      toast({
        title: t("common.error", "Erreur"),
        description:
          err?.message ||
          t(
            "ownerVehicles.motoForm.errors.generic",
            "Impossible de créer le véhicule. Veuillez réessayer."
          ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft/5 to-secondary-soft/10 pt-20">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Bike className="h-8 w-8 text-primary" />
                <span>
                  {t(
                    "ownerVehicles.motoForm.title",
                    "Ajouter une moto / scooter"
                  )}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form 
                onSubmit={(e) => {
                  console.log("[ADD-MOTO] form onSubmit called", {
                    timestamp: new Date().toISOString()
                  });
                  handleSubmit(e);
                }}
                onClick={(e) => {
                  // Log tous les clics dans le form pour voir ce qui déclenche le submit
                  if (e.target instanceof HTMLLabelElement) {
                    console.log("[ADD-MOTO] form click on label", {
                      htmlFor: e.target.htmlFor,
                      timestamp: new Date().toISOString()
                    });
                  }
                }}
                className="space-y-6"
              >
                {/* ✅ CORRECTIF Chrome : Inputs avec position absolute + opacity 0 (Chrome accepte mieux que sr-only) */}
                <input
                  id="moto-photo-frontLeft"
                  type="file"
                  accept="image/*"
                  style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }}
                  onChange={(e) => {
                    console.log("[ADD-MOTO] input onChange fired (frontLeft)");
                    handleMainPhotoChange("frontLeft", e);
                  }}
                  onClick={(e) => {
                    console.log("[ADD-MOTO] input onClick fired (frontLeft)", {
                      timestamp: new Date().toISOString()
                    });
                  }}
                />
                <input
                  id="moto-photo-profileLeft"
                  type="file"
                  accept="image/*"
                  style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }}
                  onChange={(e) => {
                    console.log("[ADD-MOTO] input onChange fired (profileLeft)");
                    handleMainPhotoChange("profileLeft", e);
                  }}
                  onClick={(e) => {
                    console.log("[ADD-MOTO] input onClick fired (profileLeft)", {
                      timestamp: new Date().toISOString()
                    });
                  }}
                />
                <input
                  id="moto-photo-interior"
                  type="file"
                  accept="image/*"
                  style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }}
                  onChange={(e) => {
                    console.log("[ADD-MOTO] input onChange fired (interior)");
                    handleMainPhotoChange("interior", e);
                  }}
                  onClick={(e) => {
                    console.log("[ADD-MOTO] input onClick fired (interior)", {
                      timestamp: new Date().toISOString()
                    });
                  }}
                />
                <input
                  id="moto-photo-additional"
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }}
                  onChange={(e) => {
                    console.log("[ADD-MOTO] input onChange fired (additional)", {
                      filesCount: e.target.files?.length || 0,
                      timestamp: new Date().toISOString()
                    });
                    handleAddMorePhotosChange(e);
                  }}
                  onClick={(e) => {
                    console.log("[ADD-MOTO] input onClick fired (additional)", {
                      timestamp: new Date().toISOString()
                    });
                  }}
                  disabled={additionalPhotos.length >= 3}
                />
                {/* Ligne 1 : Marque / Modèle */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="brand">
                      {t(
                        "ownerVehicles.motoForm.brand",
                        "Marque"
                      )}
                    </Label>
                    <Input
                      id="brand"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder={t(
                        "ownerVehicles.motoForm.brandPlaceholder",
                        "Ex : Honda"
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="model">
                      {t(
                        "ownerVehicles.motoForm.model",
                        "Modèle"
                      )}
                    </Label>
                    <Input
                      id="model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder={t(
                        "ownerVehicles.motoForm.modelPlaceholder",
                        "Ex : PCX 125"
                      )}
                    />
                  </div>
                </div>

                {/* Ligne 2 : Année / Kilométrage */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="year">
                      {t(
                        "ownerVehicles.motoForm.year",
                        "Année"
                      )}
                    </Label>
                    <Input
                      id="year"
                      type="number"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      placeholder="2022"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="mileage">
                      {t(
                        "ownerVehicles.motoForm.mileage",
                        "Kilométrage (approx.)"
                      )}
                    </Label>
                    <Input
                      id="mileage"
                      type="number"
                      value={mileage}
                      onChange={(e) => setMileage(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Ligne 3 : Type & Cylindrée */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>
                      {t(
                        "ownerVehicles.motoForm.kind",
                        "Type"
                      )}
                    </Label>
                    <Select
                      value={vehicleKind}
                      onValueChange={(v: "moto" | "scooter") =>
                        setVehicleKind(v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "ownerVehicles.motoForm.kindPlaceholder",
                            "Sélectionner"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="moto">
                          {t(
                            "ownerVehicles.motoForm.kindMoto",
                            "Moto"
                          )}
                        </SelectItem>
                        <SelectItem value="scooter">
                          {t(
                            "ownerVehicles.motoForm.kindScooter",
                            "Scooter"
                          )}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="engineCapacity">
                      {t(
                        "ownerVehicles.motoForm.engineCapacity",
                        "Cylindrée (cc)"
                      )}
                    </Label>
                    <Input
                      id="engineCapacity"
                      value={engineCapacity}
                      onChange={(e) => setEngineCapacity(e.target.value)}
                      placeholder="125"
                    />
                  </div>
                </div>

                {/* Ligne 4 : Plaque / Places */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="licensePlate">
                      {t(
                        "ownerVehicles.motoForm.licensePlate",
                        "Immatriculation (optionnel)"
                      )}
                    </Label>
                    <Input
                      id="licensePlate"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="seats">
                      {t(
                        "ownerVehicles.motoForm.seats",
                        "Nombre de places"
                      )}
                    </Label>
                    <Input
                      id="seats"
                      type="number"
                      value={seats}
                      min={1}
                      max={2}
                      onChange={(e) => setSeats(e.target.value)}
                    />
                  </div>
                </div>

                {/* Ligne 5 : Carburant / Boîte */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>
                      {t(
                        "ownerVehicles.motoForm.fuel",
                        "Carburant"
                      )}
                    </Label>
                    <Select
                      value={fuelType}
                      onValueChange={(v: "gasoline" | "electric" | "hybrid") =>
                        setFuelType(v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "ownerVehicles.motoForm.fuelPlaceholder",
                            "Sélectionner"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gasoline">
                          {t("common.essence", "Essence")}
                        </SelectItem>
                        <SelectItem value="electric">
                          {t("common.lectrique", "Électrique")}
                        </SelectItem>
                        <SelectItem value="hybrid">
                          {t("common.hybride", "Hybride")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>
                      {t(
                        "ownerVehicles.motoForm.transmission",
                        "Boîte"
                      )}
                    </Label>
                    <Select
                      value={transmission}
                      onValueChange={(v: "manual" | "automatic") =>
                        setTransmission(v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            "ownerVehicles.motoForm.transmissionPlaceholder",
                            "Sélectionner"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">
                          {t("common.manuelle", "Manuelle")}
                        </SelectItem>
                        <SelectItem value="automatic">
                          {t("common.automatique", "Automatique")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Ligne 6 : Prix / jour */}
                <div className="space-y-1">
                  <Label htmlFor="dailyPrice">
                    {t(
                      "ownerVehicles.motoForm.dailyPrice",
                      "Prix par jour (€)"
                    )}
                  </Label>
                  <Input
                    id="dailyPrice"
                    value={dailyPrice}
                    onChange={(e) => setDailyPrice(e.target.value)}
                    placeholder="25"
                  />
                </div>

                {/* Ligne 7 : Description */}
                <div className="space-y-1">
                  <Label htmlFor="description">
                    {t(
                      "ownerVehicles.motoForm.description",
                      "Description (optionnel)"
                    )}
                  </Label>
                  <textarea
                    id="description"
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t(
                      "ownerVehicles.motoForm.descriptionPlaceholder",
                      "Décrivez l'état de la moto, les équipements fournis (casque, top case, etc.)..."
                    )}
                  />
                </div>

                {/* Ligne 8 : Photos */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">
                          {t(
                            "ownerVehicles.motoForm.photos.sectionTitle",
                            "Photos du véhicule"
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t(
                            "ownerVehicles.motoForm.photos.sectionSubtitle",
                            "Ajoutez au moins une photo de votre moto ou scooter pour attirer plus de locataires."
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground hidden sm:block">
                      {additionalPhotos.length}/3
                    </div>
                  </div>

                  {/* Zone de feedback invisible pour les lecteurs d'écran */}
                  <div className="sr-only" aria-live="polite" aria-atomic="true">
                    {feedbackMessage}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Photo principale */}
                    <div className="group border-2 border-dashed border-muted-foreground/25 rounded-lg overflow-hidden transition-colors hover:border-primary/50">
                      <div className="relative h-32 w-full bg-muted/40 flex flex-col items-center justify-center gap-2">
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[11px] px-2 py-1 rounded-md z-10">
                          {t(
                            "ownerVehicles.motoForm.photos.primaryLabel",
                            "Photo principale"
                          )}
                        </div>
                        {vehiclePhotos.frontLeft ? (
                          <>
                            <img
                              src={getPhotoPreview(vehiclePhotos.frontLeft) || ""}
                              alt={t(
                                "ownerVehicles.motoForm.photos.primaryLabel",
                                "Photo principale"
                              )}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("[ADD-MOTO] button click change (frontLeft)");
                                const input = document.getElementById("moto-photo-frontLeft") as HTMLInputElement;
                                if (input) {
                                  input.click();
                                }
                              }}
                              className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-background/90 border rounded hover:bg-background transition-colors cursor-pointer"
                            >
                              {t(
                                "ownerVehicles.motoForm.photos.changePhoto",
                                "Changer"
                              )}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("[ADD-MOTO] button click (frontLeft)");
                                const input = document.getElementById("moto-photo-frontLeft") as HTMLInputElement;
                                if (input) {
                                  input.click();
                                }
                              }}
                              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border rounded-md bg-background hover:bg-muted transition-colors cursor-pointer"
                            >
                              <Upload className="h-4 w-4" />
                              {t("ownerVehicles.motoForm.photos.addMore", "Ajouter une photo")}
                            </button>
                            <span className="text-xs text-muted-foreground text-center px-2">
                              {t(
                                "ownerVehicles.motoForm.photos.primaryHint",
                                "Avant gauche – angle recommandé"
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Profil gauche */}
                    <div className="group border-2 border-dashed border-muted-foreground/25 rounded-lg overflow-hidden transition-colors hover:border-primary/50">
                      <div className="relative h-32 w-full bg-muted/40 flex flex-col items-center justify-center gap-2">
                        {vehiclePhotos.profileLeft ? (
                          <>
                            <img
                              src={getPhotoPreview(vehiclePhotos.profileLeft) || ""}
                              alt={t(
                                "ownerVehicles.motoForm.photos.profileLabel",
                                "Profil gauche"
                              )}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("[ADD-MOTO] button click change (profileLeft)");
                                const input = document.getElementById("moto-photo-profileLeft") as HTMLInputElement;
                                if (input) {
                                  input.click();
                                }
                              }}
                              className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-background/90 border rounded hover:bg-background transition-colors cursor-pointer"
                            >
                              {t(
                                "ownerVehicles.motoForm.photos.changePhoto",
                                "Changer"
                              )}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("[ADD-MOTO] button click (profileLeft)");
                                const input = document.getElementById("moto-photo-profileLeft") as HTMLInputElement;
                                if (input) {
                                  input.click();
                                }
                              }}
                              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border rounded-md bg-background hover:bg-muted transition-colors cursor-pointer"
                            >
                              <Upload className="h-4 w-4" />
                              {t("ownerVehicles.motoForm.photos.addMore", "Ajouter une photo")}
                            </button>
                            <span className="text-xs text-muted-foreground text-center px-2">
                              {t(
                                "ownerVehicles.motoForm.photos.profileHint",
                                "Vue de côté pour bien voir la ligne"
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Détails / équipements */}
                    <div className="group border-2 border-dashed border-muted-foreground/25 rounded-lg overflow-hidden transition-colors hover:border-primary/50">
                      <div className="relative h-32 w-full bg-muted/40 flex flex-col items-center justify-center gap-2">
                        {vehiclePhotos.interior ? (
                          <>
                            <img
                              src={getPhotoPreview(vehiclePhotos.interior) || ""}
                              alt={t(
                                "ownerVehicles.motoForm.photos.interiorLabel",
                                "Détails / équipements"
                              )}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("[ADD-MOTO] button click change (interior)");
                                const input = document.getElementById("moto-photo-interior") as HTMLInputElement;
                                if (input) {
                                  input.click();
                                }
                              }}
                              className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-background/90 border rounded hover:bg-background transition-colors cursor-pointer"
                            >
                              {t(
                                "ownerVehicles.motoForm.photos.changePhoto",
                                "Changer"
                              )}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("[ADD-MOTO] button click (interior)");
                                const input = document.getElementById("moto-photo-interior") as HTMLInputElement;
                                if (input) {
                                  input.click();
                                }
                              }}
                              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border rounded-md bg-background hover:bg-muted transition-colors cursor-pointer"
                            >
                              <Upload className="h-4 w-4" />
                              {t("ownerVehicles.motoForm.photos.addMore", "Ajouter une photo")}
                            </button>
                            <span className="text-xs text-muted-foreground text-center px-2">
                              {t(
                                "ownerVehicles.motoForm.photos.interiorHint",
                                "Compteur, selle, top case..."
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ✅ CORRECTIF 3 : Bouton type="button" qui déclenche le click sur l'input (évite submit involontaire) */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("[ADD-MOTO] button click detected", { 
                          timestamp: new Date().toISOString()
                        });
                        const input = document.getElementById("moto-photo-additional") as HTMLInputElement;
                        if (input && !input.disabled) {
                          console.log("[ADD-MOTO] triggering input.click()", {
                            inputExists: !!input,
                            inputDisabled: input.disabled,
                            inputType: input.type
                          });
                          input.click();
                          console.log("[ADD-MOTO] input.click() executed");
                        } else {
                          console.warn("[ADD-MOTO] input not found or disabled", {
                            inputExists: !!input,
                            inputDisabled: input?.disabled
                          });
                        }
                      }}
                      disabled={additionalPhotos.length >= 3}
                      className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md transition-colors ${
                        additionalPhotos.length >= 3
                          ? "opacity-50 cursor-not-allowed"
                          : "bg-background hover:bg-muted cursor-pointer"
                      }`}
                    >
                      <Upload className="h-4 w-4" />
                      {t(
                        "ownerVehicles.motoForm.photos.addMore",
                        "Ajouter des photos"
                      )}
                    </button>
                    {additionalPhotos.length >= 3 && (
                      <span className="text-xs text-muted-foreground">
                        {t(
                          "ownerVehicles.motoForm.photos.addMoreLimit",
                          "Limite atteinte (3 photos supplémentaires)"
                        )}
                      </span>
                    )}
                  </div>

                  {/* ✅ CORRECTIF 2 : Photos supplémentaires avec inputs réels + labels */}
                  {additionalPhotos.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {additionalPhotos.map((photo, index) => (
                        <div
                          key={index}
                          className="group relative border rounded-lg overflow-hidden bg-muted/40"
                        >
                          {/* Input pour chaque slot supplémentaire - style inline pour Chrome */}
                          <input
                            id={`moto-photo-additional-${index}`}
                            type="file"
                            accept="image/*"
                            style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }}
                            onChange={(e) => handleAdditionalPhotoChange(index, e)}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log("[ADD-MOTO] button click (additional)", { index });
                              const input = document.getElementById(`moto-photo-additional-${index}`) as HTMLInputElement;
                              if (input) {
                                input.click();
                              }
                            }}
                            className="h-28 w-full cursor-pointer flex items-center justify-center block"
                          >
                            {photo ? (
                              <img
                                src={getPhotoPreview(photo) || ""}
                                alt={t(
                                  "ownerVehicles.motoForm.photos.slotLabel",
                                  `Photo ${index + 1}`
                                )}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                <Upload className="h-5 w-5" />
                                <span className="text-xs">
                                  {t(
                                    "ownerVehicles.motoForm.photos.slotOptional",
                                    "Optionnel"
                                  )}
                                </span>
                              </div>
                            )}
                          </button>
                          {photo && (
                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2 py-1 bg-black/50 text-[11px] text-white">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log("[ADD-MOTO] button click change (additional)", { index });
                                  const input = document.getElementById(`moto-photo-additional-${index}`) as HTMLInputElement;
                                  if (input) {
                                    input.click();
                                  }
                                }}
                                className="inline-flex items-center gap-1 cursor-pointer"
                              >
                                <ArrowRight className="h-3 w-3 rotate-180" />
                                {t(
                                  "ownerVehicles.motoForm.photos.changePhoto",
                                  "Changer ma photo"
                                )}
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeAdditionalPhoto(index);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                                {t(
                                  "ownerVehicles.motoForm.photos.deletePhoto",
                                  "Supprimer"
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/me/owner/vehicles")}
                  >
                    {t(
                      "ownerVehicles.motoForm.cancel",
                      "Annuler"
                    )}
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading
                      ? t(
                          "ownerVehicles.motoForm.saving",
                          "Création en cours..."
                        )
                      : t(
                          "ownerVehicles.motoForm.submit",
                          "Créer le véhicule"
                        )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
      
      {/* 🔍 ÉTAPE 1 - MARQUEUR VISUEL (preuve qu'on modifie le bon composant) */}
      <div className="fixed bottom-4 left-4 bg-yellow-400 text-black text-xs px-2 py-1 rounded shadow-lg z-50 font-mono">
        Build: ADD-MOTO {BUILD_VERSION}
      </div>
    </>
  );
}

