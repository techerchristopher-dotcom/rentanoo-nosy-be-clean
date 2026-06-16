import { FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SupabaseVehiclesService } from "@/services/supabaseVehiclesService";
import { PhotoService } from "@/services/supabase/photos";
import { ProfileService } from "@/services/supabase/profile";
import { UserRoleUtils } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { OwnerDualCurrencyInput } from "@/components/currency/OwnerDualCurrencyInput";
import { Car, Camera, Upload, CheckCircle, Trash2, ArrowRight } from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const LOCATION_AREAS = [
  { id: "2fbc8909-381d-4bdb-baea-9789e2f7b28a", name: "Ambatoloaka" },
  { id: "bb7a3d32-79c8-4d33-af04-834b3eabcf97", name: "Ambondrona" },
  { id: "5879bc28-3903-481b-a0dc-d7f44f2982f1", name: "Andilana" },
  { id: "cc91659e-92ae-48b7-ad1a-55e7f82ec377", name: "Dar Es Salam" },
  { id: "ed8d772e-d58e-49f7-b223-94400ef507b3", name: "Dzamandzar" },
  { id: "8f9e7dfd-18a1-4eb0-8175-bfb326855dcb", name: "Fascène / Aéroport" },
  { id: "b5c87c3b-f425-4e71-8cc2-c4e5d23b3ee5", name: "Hell-Ville" },
  { id: "d82c4403-8ae7-4fe9-99fb-e42fb22fa419", name: "Madirokely" },
  { id: "ff030478-f4d5-4b90-a096-7f966f7c563f", name: "Palm Beach" },
  { id: "ababa367-8a66-4a3a-9f54-ba07e6028841", name: "Diego Hely" },
];

const CAR_CATEGORIES = [
  { value: "Citadine", label: "Citadine", icon: "🚗" },
  { value: "SUV", label: "SUV / 4x4", icon: "🚙" },
  { value: "Berline", label: "Berline", icon: "🚘" },
  { value: "Minibus", label: "Monospace / Minibus", icon: "🚐" },
  { value: "Pick-up", label: "Pick-up", icon: "🛻" },
  { value: "Utilitaire", label: "Van / Utilitaire", icon: "🚌" },
];

const EQUIPMENT_LIST = [
  { key: "hasAC", label: "Climatisation" },
  { key: "hasGPS", label: "GPS" },
  { key: "hasBluetooth", label: "Bluetooth" },
  { key: "hasCarPlay", label: "CarPlay / Android Auto" },
  { key: "hasBackupCamera", label: "Caméra de recul" },
  { key: "hasUSBPort", label: "Port USB" },
  { key: "hasLeatherSeats", label: "Sièges cuir" },
  { key: "hasSunroof", label: "Toit ouvrant" },
  { key: "hasParkingSensors", label: "Capteurs stationnement" },
  { key: "hasLargeTrunk", label: "Grand coffre" },
];

// ─── ServiceRow ───────────────────────────────────────────────────────────────

interface ServiceField {
  enabled: boolean;
  free: boolean;
  price: string;
}

function ServiceRow({
  label,
  icon,
  value,
  onChange,
  perDay = false,
}: {
  label: string;
  icon: string;
  value: ServiceField;
  onChange: (v: ServiceField) => void;
  perDay?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-2">{icon} {label}</span>
        <Switch
          checked={value.enabled}
          onCheckedChange={(checked) => onChange({ ...value, enabled: checked })}
        />
      </div>
      {value.enabled && (
        <div className="flex items-center gap-3 pl-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="rounded"
              checked={value.free}
              onChange={(e) => onChange({ ...value, free: e.target.checked, price: "" })}
            />
            Gratuit
          </label>
          {!value.free && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="0"
                value={value.price}
                onChange={(e) => onChange({ ...value, price: e.target.value })}
                className="w-24 h-8 text-sm"
              />
              <span className="text-xs text-muted-foreground">{perDay ? "€/jour" : "€ flat"}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function RentMyCar() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Identity
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [mileage, setMileage] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [transmission, setTransmission] = useState("");
  const [seats, setSeats] = useState("");
  const [doors, setDoors] = useState("");
  const [locationAreaId, setLocationAreaId] = useState("");

  // Price
  const [dailyPriceMga, setDailyPriceMga] = useState("");

  // Equipment
  const [equipment, setEquipment] = useState<Record<string, boolean>>(
    Object.fromEntries(EQUIPMENT_LIST.map((e) => [e.key, false]))
  );

  // Services
  const emptyService = (): ServiceField => ({ enabled: false, free: false, price: "" });
  const [svcAirportPickup, setSvcAirportPickup] = useState(emptyService());
  const [svcAirportReturn, setSvcAirportReturn] = useState(emptyService());
  const [svcBargePT, setSvcBargePT] = useState(emptyService());
  const [svcBargeGT, setSvcBargeGT] = useState(emptyService());
  const [svcDelivery, setSvcDelivery] = useState(emptyService());
  const [svcBabySeat, setSvcBabySeat] = useState(emptyService());
  const [svcExtraDriver, setSvcExtraDriver] = useState(emptyService());

  // Description
  const [description, setDescription] = useState("");

  // Photos
  const [vehiclePhotos, setVehiclePhotos] = useState<{
    frontLeft: File | null;
    profileLeft: File | null;
    interior: File | null;
  }>({ frontLeft: null, profileLeft: null, interior: null });
  const [additionalPhotos, setAdditionalPhotos] = useState<(File | null)[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  // ── Photo helpers ────────────────────────────────────────────────────────

  const validateFile = (file: File): boolean => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Erreur", description: "Fichier image requis.", variant: "destructive" });
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Erreur", description: "Photo max 10 MB.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleMainPhotoChange = (
    type: "frontLeft" | "profileLeft" | "interior",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setVehiclePhotos((prev) => ({ ...prev, [type]: file }));
      setFeedbackMessage("Photo ajoutée");
      toast({ title: "Photo ajoutée" });
    }
    e.target.value = "";
  };

  const handleAdditionalPhotoChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      setAdditionalPhotos((prev) => {
        const next = [...prev];
        next[index] = file;
        return next;
      });
      toast({ title: "Photo ajoutée" });
    }
    e.target.value = "";
  };

  const handleAddMorePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    Array.from(files)
      .slice(0, 3 - additionalPhotos.length)
      .forEach((file, i) => {
        if (validateFile(file)) {
          setAdditionalPhotos((prev) => {
            const next = [...prev];
            next[prev.length + i] = file;
            return next;
          });
        }
      });
    e.target.value = "";
  };

  const removeAdditionalPhoto = (index: number) => {
    setAdditionalPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const getPhotoPreview = (file: File | null) =>
    file ? URL.createObjectURL(file) : null;

  const clickInput = (id: string) =>
    (document.getElementById(id) as HTMLInputElement)?.click();

  // ── Submit ───────────────────────────────────────────────────────────────

  const svcPrice = (s: ServiceField) =>
    !s.enabled ? null : s.free ? null : parseFloat(s.price) || null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!brand.trim() || !model.trim() || !year.trim() || !fuelType || !transmission || !dailyPriceMga) {
      toast({
        title: "Champs manquants",
        description: "Marque, modèle, année, carburant, boîte et prix sont requis.",
        variant: "destructive",
      });
      return;
    }

    const hasPhoto =
      vehiclePhotos.frontLeft ||
      vehiclePhotos.profileLeft ||
      vehiclePhotos.interior ||
      additionalPhotos.some(Boolean);

    if (!hasPhoto) {
      toast({
        title: "Photo requise",
        description: "Ajoutez au moins une photo du véhicule.",
        variant: "destructive",
      });
      return;
    }

    const parsedYear = parseInt(year, 10);
    const parsedPrice = parseFloat(dailyPriceMga.replace(",", "."));

    if (Number.isNaN(parsedYear) || parsedYear < 1990 || parsedYear > 2030) {
      toast({ title: "Erreur", description: "Année invalide.", variant: "destructive" });
      return;
    }
    if (Number.isNaN(parsedPrice) || parsedPrice < 1000) {
      toast({ title: "Erreur", description: "Prix invalide (min 1 000 Ar).", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Récupère profil + met à jour rôle si nécessaire
      const userResult = await ProfileService.getCurrentUserProfile();
      if (!userResult.data) {
        toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
        return;
      }
      const currentUser = userResult.data;
      if (!UserRoleUtils.canCreateVehicles(currentUser)) {
        await ProfileService.updateUserRole(currentUser.id, "owner");
      }

      const vehicleResult = await SupabaseVehiclesService.createVehicle({
        owner_id: currentUser.id,
        brand: brand.trim(),
        model: model.trim(),
        color: color || undefined,
        year: parsedYear,
        mileage: mileage ? parseInt(mileage, 10) : undefined,
        price_per_day: parsedPrice,
        description: description || undefined,
        vehicle_type: "car",
        vehicle_category: category || undefined,
        location_area_id: locationAreaId || null,
        seats: seats ? parseInt(seats, 10) : undefined,
        doors: doors ? parseInt(doors, 10) : undefined,
        transmission: (transmission || "manual") as any,
        fuel_type: (fuelType || "gasoline") as any,
        // Équipements
        has_ac: equipment.hasAC,
        has_gps: equipment.hasGPS,
        has_bluetooth: equipment.hasBluetooth,
        has_carplay: equipment.hasCarPlay,
        has_audio_input: false,
        has_cruise_control: false,
        has_backup_camera: equipment.hasBackupCamera,
        has_usb_port: equipment.hasUSBPort,
        has_leather_seats: equipment.hasLeatherSeats,
        has_sunroof: equipment.hasSunroof,
        has_parking_sensors: equipment.hasParkingSensors,
        has_large_trunk: equipment.hasLargeTrunk,
        // Services aéroport
        airport_pickup_service: svcAirportPickup.enabled || svcAirportReturn.enabled || null,
        airport_pickup_retrieval: svcAirportPickup.enabled || null,
        airport_pickup_retrieval_free: svcAirportPickup.enabled ? svcAirportPickup.free : null,
        airport_pickup_retrieval_price: svcAirportPickup.enabled ? svcPrice(svcAirportPickup) : null,
        airport_pickup_return: svcAirportReturn.enabled || null,
        airport_pickup_return_free: svcAirportReturn.enabled ? svcAirportReturn.free : null,
        airport_pickup_return_price: svcAirportReturn.enabled ? svcPrice(svcAirportReturn) : null,
        // Services barge Petite Terre
        barge_petite_terre_service: svcBargePT.enabled || null,
        barge_petite_terre_retrieval: svcBargePT.enabled || null,
        barge_petite_terre_retrieval_free: svcBargePT.enabled ? svcBargePT.free : null,
        barge_petite_terre_retrieval_price: svcBargePT.enabled ? svcPrice(svcBargePT) : null,
        barge_petite_terre_return: svcBargePT.enabled || null,
        barge_petite_terre_return_free: svcBargePT.enabled ? svcBargePT.free : null,
        barge_petite_terre_return_price: svcBargePT.enabled ? svcPrice(svcBargePT) : null,
        // Services barge Grande Terre
        barge_grande_terre_service: svcBargeGT.enabled || null,
        barge_grande_terre_retrieval: svcBargeGT.enabled || null,
        barge_grande_terre_retrieval_free: svcBargeGT.enabled ? svcBargeGT.free : null,
        barge_grande_terre_retrieval_price: svcBargeGT.enabled ? svcPrice(svcBargeGT) : null,
        barge_grande_terre_return: svcBargeGT.enabled || null,
        barge_grande_terre_return_free: svcBargeGT.enabled ? svcBargeGT.free : null,
        barge_grande_terre_return_price: svcBargeGT.enabled ? svcPrice(svcBargeGT) : null,
        // Livraison
        home_delivery_service: svcDelivery.enabled || null,
        home_delivery_pickup: svcDelivery.enabled || null,
        home_delivery_pickup_free: svcDelivery.enabled ? svcDelivery.free : null,
        home_delivery_pickup_price: svcDelivery.enabled ? svcPrice(svcDelivery) : null,
        home_delivery_return: svcDelivery.enabled || null,
        home_delivery_return_free: svcDelivery.enabled ? svcDelivery.free : null,
        home_delivery_return_price: svcDelivery.enabled ? svcPrice(svcDelivery) : null,
        // Extras
        baby_seat_service: svcBabySeat.enabled || null,
        baby_seat_free: svcBabySeat.enabled ? svcBabySeat.free : null,
        baby_seat_price: svcBabySeat.enabled ? svcPrice(svcBabySeat) : null,
        additional_driver_service: svcExtraDriver.enabled || null,
        additional_driver_free: svcExtraDriver.enabled ? svcExtraDriver.free : null,
        additional_driver_price: svcExtraDriver.enabled ? svcPrice(svcExtraDriver) : null,
        available: true,
        status: "active",
      });

      if (!vehicleResult.data) {
        toast({
          title: "Erreur",
          description: vehicleResult.error || "Impossible de créer le véhicule",
          variant: "destructive",
        });
        return;
      }

      const vehicleId = vehicleResult.data.id;

      // Upload photos
      const photoUploads: { file: File; vehicleId: string; photoType: any }[] = [];
      if (vehiclePhotos.frontLeft) photoUploads.push({ file: vehiclePhotos.frontLeft, vehicleId, photoType: "frontLeft" });
      if (vehiclePhotos.profileLeft) photoUploads.push({ file: vehiclePhotos.profileLeft, vehicleId, photoType: "profileLeft" });
      if (vehiclePhotos.interior) photoUploads.push({ file: vehiclePhotos.interior, vehicleId, photoType: "interior" });
      additionalPhotos.forEach((photo) => {
        if (photo) photoUploads.push({ file: photo, vehicleId, photoType: "additional" });
      });

      if (photoUploads.length > 0) {
        const photoResult = await PhotoService.uploadMultiplePhotos(photoUploads);
        if (photoResult.data.length > 0) {
          await SupabaseVehiclesService.updateVehicleImage(vehicleId, photoResult.data[0].url);
        }
      }

      toast({ title: "Véhicule publié !", description: "Gérez-le depuis votre tableau de bord." });
      navigate("/me/owner/vehicles");
    } catch (err: any) {
      console.error("Erreur création voiture:", err);
      toast({ title: "Erreur", description: err?.message || "Erreur inattendue.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft/5 to-secondary-soft/10 pt-20">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Car className="h-8 w-8 text-primary" />
                <span>Ajouter une voiture</span>
              </CardTitle>
            </CardHeader>

            <CardContent>
              {/* Hidden file inputs — pattern identique scooter */}
              <input id="car-photo-frontLeft" type="file" accept="image/*"
                style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none", width: "1px", height: "1px" }}
                onChange={(e) => handleMainPhotoChange("frontLeft", e)} />
              <input id="car-photo-profileLeft" type="file" accept="image/*"
                style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none", width: "1px", height: "1px" }}
                onChange={(e) => handleMainPhotoChange("profileLeft", e)} />
              <input id="car-photo-interior" type="file" accept="image/*"
                style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none", width: "1px", height: "1px" }}
                onChange={(e) => handleMainPhotoChange("interior", e)} />
              <input id="car-photo-additional" type="file" accept="image/*" multiple
                style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none", width: "1px", height: "1px" }}
                disabled={additionalPhotos.length >= 3}
                onChange={handleAddMorePhotosChange} />

              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Catégorie */}
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CAR_CATEGORIES.map((cat) => (
                      <button key={cat.value} type="button"
                        onClick={() => setCategory(cat.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                          category === cat.value
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}>
                        {cat.icon} {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Marque / Modèle */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="brand">Marque *</Label>
                    <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ex : Toyota" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="model">Modèle *</Label>
                    <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex : RAV4" />
                  </div>
                </div>

                {/* Année / Kilométrage */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="year">Année *</Label>
                    <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2022" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="mileage">Kilométrage (approx.)</Label>
                    <Input id="mileage" type="number" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="0" />
                  </div>
                </div>

                {/* Carburant / Boîte */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Carburant *</Label>
                    <Select value={fuelType} onValueChange={setFuelType}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gasoline">Essence</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="electric">Électrique</SelectItem>
                        <SelectItem value="hybrid">Hybride</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Boîte *</Label>
                    <Select value={transmission} onValueChange={setTransmission}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manuelle</SelectItem>
                        <SelectItem value="automatic">Automatique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Places / Portes */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Places</Label>
                    <Select value={seats} onValueChange={setSeats}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        {["4", "5", "7", "9"].map((n) => (
                          <SelectItem key={n} value={n}>{n} places</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Portes</Label>
                    <Select value={doors} onValueChange={setDoors}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 portes</SelectItem>
                        <SelectItem value="5">5 portes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Couleur / Immatriculation */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="color">Couleur</Label>
                    <Input id="color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="Ex : Blanc" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="licensePlate">Immatriculation (optionnel)</Label>
                    <Input id="licensePlate" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} placeholder="Ex : 1234 NB" />
                  </div>
                </div>

                {/* Prix */}
                <OwnerDualCurrencyInput
                  id="daily-price"
                  label="Prix par jour *"
                  valueMga={dailyPriceMga}
                  onChangeMga={setDailyPriceMga}
                  required
                  minMga={1000}
                  arPlaceholder="200000"
                  eurPlaceholder="40"
                  hint="Saisissez en Ariary ou en € — équivalent affiché selon le taux du jour"
                />

                {/* Localisation */}
                <div className="space-y-1">
                  <Label>Localisation</Label>
                  <Select value={locationAreaId} onValueChange={setLocationAreaId}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un quartier" /></SelectTrigger>
                    <SelectContent>
                      {LOCATION_AREAS.map((area) => (
                        <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Équipements */}
                <div className="space-y-3">
                  <Label>Équipements</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {EQUIPMENT_LIST.map((item) => (
                      <label key={item.key}
                        className="flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors">
                        <span className="text-sm">{item.label}</span>
                        <Switch
                          checked={equipment[item.key] ?? false}
                          onCheckedChange={(checked) =>
                            setEquipment((prev) => ({ ...prev, [item.key]: checked }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Services */}
                <div className="space-y-1">
                  <Label>Services proposés</Label>
                  <p className="text-xs text-muted-foreground mb-2">Activez les services que vous offrez.</p>
                  <div className="rounded-lg border border-slate-200 px-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-3 pb-1">✈️ Aéroport Fascène</p>
                    <ServiceRow label="Prise en charge" icon="🛬" value={svcAirportPickup} onChange={setSvcAirportPickup} />
                    <ServiceRow label="Restitution" icon="🛫" value={svcAirportReturn} onChange={setSvcAirportReturn} />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-3 pb-1">🚢 Barge Petite Terre</p>
                    <ServiceRow label="Aller / retour" icon="⛴️" value={svcBargePT} onChange={setSvcBargePT} />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-3 pb-1">🚢 Barge Grande Terre</p>
                    <ServiceRow label="Aller / retour" icon="⛴️" value={svcBargeGT} onChange={setSvcBargeGT} />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-3 pb-1">🚗 Livraison à domicile</p>
                    <ServiceRow label="Aller / retour" icon="📍" value={svcDelivery} onChange={setSvcDelivery} />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-3 pb-1">Extras</p>
                    <ServiceRow label="Siège bébé" icon="👶" value={svcBabySeat} onChange={setSvcBabySeat} perDay />
                    <ServiceRow label="Conducteur supplémentaire" icon="👨‍✈️" value={svcExtraDriver} onChange={setSvcExtraDriver} perDay />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <Label htmlFor="description">Description (optionnel)</Label>
                  <textarea
                    id="description"
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez votre véhicule — état, options, restrictions..."
                  />
                </div>

                {/* Photos */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Photos du véhicule</p>
                      <p className="text-xs text-muted-foreground">Au moins une photo requise.</p>
                    </div>
                  </div>

                  <div className="sr-only" aria-live="polite" aria-atomic="true">{feedbackMessage}</div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {(
                      [
                        { type: "frontLeft" as const, id: "car-photo-frontLeft", label: "Photo principale", hint: "Avant gauche" },
                        { type: "profileLeft" as const, id: "car-photo-profileLeft", label: "Profil gauche", hint: "Vue de côté" },
                        { type: "interior" as const, id: "car-photo-interior", label: "Intérieur", hint: "Tableau de bord" },
                      ]
                    ).map(({ type, id, label, hint }) => {
                      const preview = getPhotoPreview(vehiclePhotos[type]);
                      return (
                        <div key={type} className="group border-2 border-dashed border-muted-foreground/25 rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
                          <div className="relative h-32 w-full bg-muted/40 flex flex-col items-center justify-center gap-2">
                            {type === "frontLeft" && (
                              <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[11px] px-2 py-1 rounded-md z-10">
                                {label}
                              </div>
                            )}
                            {preview ? (
                              <>
                                <img src={preview} alt={label} className="w-full h-full object-cover" />
                                <button type="button" onClick={() => clickInput(id)}
                                  className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-background/90 border rounded hover:bg-background">
                                  Changer
                                </button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => clickInput(id)}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border rounded-md bg-background hover:bg-muted">
                                  <Upload className="h-4 w-4" />Ajouter
                                </button>
                                <span className="text-xs text-muted-foreground text-center px-2">{hint}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button type="button" onClick={() => clickInput("car-photo-additional")}
                    disabled={additionalPhotos.length >= 3}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md transition-colors ${
                      additionalPhotos.length >= 3 ? "opacity-50 cursor-not-allowed" : "bg-background hover:bg-muted"
                    }`}>
                    <Upload className="h-4 w-4" />Ajouter des photos
                  </button>

                  {additionalPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {additionalPhotos.map((photo, index) => (
                        <div key={index} className="relative border rounded-lg overflow-hidden bg-muted/40">
                          <input id={`car-photo-additional-${index}`} type="file" accept="image/*"
                            style={{ position: "absolute", left: "-9999px", opacity: 0, pointerEvents: "none", width: "1px", height: "1px" }}
                            onChange={(e) => handleAdditionalPhotoChange(index, e)} />
                          <button type="button" onClick={() => clickInput(`car-photo-additional-${index}`)}
                            className="h-28 w-full cursor-pointer flex items-center justify-center">
                            {photo ? (
                              <img src={getPhotoPreview(photo) || ""} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <Upload className="h-5 w-5" /><span className="text-xs">Optionnel</span>
                              </div>
                            )}
                          </button>
                          {photo && (
                            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2 py-1 bg-black/50 text-[11px] text-white">
                              <button type="button" onClick={() => clickInput(`car-photo-additional-${index}`)}
                                className="inline-flex items-center gap-1">
                                <ArrowRight className="h-3 w-3 rotate-180" />Changer
                              </button>
                              <button type="button" onClick={() => removeAdditionalPhoto(index)}
                                className="inline-flex items-center gap-1">
                                <Trash2 className="h-3 w-3" />Supprimer
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
                  <Button type="button" variant="outline" onClick={() => navigate("/me/owner/vehicles")}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Création en cours..." : (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />Publier le véhicule
                      </span>
                    )}
                  </Button>
                </div>

              </form>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
}
