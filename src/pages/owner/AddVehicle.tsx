import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { uploadVehiclePhotos } from "@/templates/vehicleTemplate";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { OwnerDualCurrencyInput } from "@/components/currency/OwnerDualCurrencyInput";
import { Car, Camera, Upload, CheckCircle, Trash2, ArrowRight, ArrowLeft } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

type CarCategory = "citadine" | "suv" | "berline" | "monospace" | "pickup" | "van";
type FuelType = "gasoline" | "diesel" | "electric" | "hybrid";
type Transmission = "manual" | "automatic";

interface ServiceField {
  enabled: boolean;
  free: boolean;
  price: string;
}

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

const CAR_CATEGORIES: { value: CarCategory; label: string; icon: string }[] = [
  { value: "citadine", label: "Citadine", icon: "🚗" },
  { value: "suv", label: "SUV / 4x4", icon: "🚙" },
  { value: "berline", label: "Berline", icon: "🚘" },
  { value: "monospace", label: "Monospace", icon: "🚐" },
  { value: "pickup", label: "Pick-up", icon: "🛻" },
  { value: "van", label: "Van / Minibus", icon: "🚌" },
];

const COLORS = [
  { value: "white", label: "Blanc" },
  { value: "black", label: "Noir" },
  { value: "gray", label: "Gris" },
  { value: "silver", label: "Argent" },
  { value: "blue", label: "Bleu" },
  { value: "red", label: "Rouge" },
  { value: "green", label: "Vert" },
  { value: "beige", label: "Beige" },
  { value: "brown", label: "Marron" },
  { value: "other", label: "Autre" },
];

const EQUIPMENT_GROUPS = [
  {
    label: "Confort",
    items: [
      { key: "hasAC", label: "Climatisation" },
      { key: "hasLeatherSeats", label: "Sièges cuir" },
      { key: "hasSunroof", label: "Toit ouvrant" },
      { key: "hasGPS", label: "GPS" },
      { key: "hasCruiseControl", label: "Régulateur de vitesse" },
    ],
  },
  {
    label: "Connectivité",
    items: [
      { key: "hasBluetooth", label: "Bluetooth" },
      { key: "hasCarPlay", label: "CarPlay" },
      { key: "hasAndroidAuto", label: "Android Auto" },
      { key: "hasAudioInput", label: "Entrée audio (jack)" },
      { key: "hasUSBPort", label: "Port USB" },
      { key: "hasWirelessCharger", label: "Chargeur sans fil" },
      { key: "hasPremiumAudio", label: "Sono premium" },
    ],
  },
  {
    label: "Sécurité",
    items: [
      { key: "hasBackupCamera", label: "Caméra de recul" },
      { key: "hasABS", label: "ABS" },
      { key: "hasParkingSensors", label: "Capteurs de stationnement" },
    ],
  },
  {
    label: "Praticité",
    items: [
      { key: "hasLargeTrunk", label: "Grand coffre" },
      { key: "hasRoofRack", label: "Porte-bagages toit" },
      { key: "hasRoofBox", label: "Boîte de toit" },
      { key: "hasBikeRack", label: "Porte-vélos" },
    ],
  },
];

// ─── ServiceRow component ────────────────────────────────────────────────────

function ServiceRow({
  label,
  icon,
  value,
  onChange,
  priceLabel = "Prix (€ flat)",
  perDay = false,
}: {
  label: string;
  icon: string;
  value: ServiceField;
  onChange: (v: ServiceField) => void;
  priceLabel?: string;
  perDay?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-2">
          {icon} {label}
        </span>
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
              <span className="text-xs text-muted-foreground">{perDay ? "€/jour" : "€"}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AddVehicle() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // ── Step 1: Identity ─────────────────────────────────────────────────────
  const [category, setCategory] = useState<CarCategory | "">("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [mileage, setMileage] = useState("");
  const [fuelType, setFuelType] = useState<FuelType | "">("");
  const [transmission, setTransmission] = useState<Transmission | "">("");
  const [seats, setSeats] = useState("");
  const [doors, setDoors] = useState("");

  // ── Step 2: Equipment ────────────────────────────────────────────────────
  const [equipment, setEquipment] = useState<Record<string, boolean>>({
    hasAC: false,
    hasGPS: false,
    hasCruiseControl: false,
    hasBluetooth: false,
    hasCarPlay: false,
    hasAudioInput: false,
    hasBackupCamera: false,
    hasUSBPort: false,
    hasLeatherSeats: false,
    hasSunroof: false,
    hasPremiumAudio: false,
    hasRoofRack: false,
    hasWirelessCharger: false,
    hasParkingSensors: false,
    hasABS: false,
    hasLargeTrunk: false,
    hasRoofBox: false,
    hasBikeRack: false,
    hasAndroidAuto: false,
  });

  // ── Step 2: Services ─────────────────────────────────────────────────────
  const emptyService = (): ServiceField => ({ enabled: false, free: false, price: "" });
  const [svcAirportPickup, setSvcAirportPickup] = useState(emptyService());
  const [svcAirportReturn, setSvcAirportReturn] = useState(emptyService());
  const [svcBargePTPickup, setSvcBargePTPickup] = useState(emptyService());
  const [svcBargePTReturn, setSvcBargePTReturn] = useState(emptyService());
  const [svcBargeGTPickup, setSvcBargeGTPickup] = useState(emptyService());
  const [svcBargeGTReturn, setSvcBargeGTReturn] = useState(emptyService());
  const [svcDeliveryPickup, setSvcDeliveryPickup] = useState(emptyService());
  const [svcDeliveryReturn, setSvcDeliveryReturn] = useState(emptyService());
  const [svcBabySeat, setSvcBabySeat] = useState(emptyService());
  const [svcExtraDriver, setSvcExtraDriver] = useState(emptyService());

  // ── Step 3: Price, location, photos, description ─────────────────────────
  const [dailyPriceMga, setDailyPriceMga] = useState("");
  const [locationAreaId, setLocationAreaId] = useState("");
  const [description, setDescription] = useState("");
  const [vehiclePhotos, setVehiclePhotos] = useState<{
    frontLeft: File | null;
    profileLeft: File | null;
    interior: File | null;
  }>({ frontLeft: null, profileLeft: null, interior: null });
  const [additionalPhotos, setAdditionalPhotos] = useState<(File | null)[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  // ── Photo handlers ───────────────────────────────────────────────────────

  const validatePhotoFile = (file: File): boolean => {
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
    if (file && validatePhotoFile(file)) {
      setVehiclePhotos((prev) => ({ ...prev, [type]: file }));
      setFeedbackMessage("Photo ajoutée");
      toast({ title: "Photo ajoutée", description: "Photo ajoutée avec succès." });
    }
    e.target.value = "";
  };

  const handleAdditionalPhotoChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file && validatePhotoFile(file)) {
      setAdditionalPhotos((prev) => {
        const next = [...prev];
        next[index] = file;
        return next;
      });
      setFeedbackMessage("Photo ajoutée");
      toast({ title: "Photo ajoutée", description: "Photo supplémentaire ajoutée." });
    }
    e.target.value = "";
  };

  const handleAddMorePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    Array.from(files)
      .slice(0, 3 - additionalPhotos.length)
      .forEach((file, i) => {
        if (validatePhotoFile(file)) {
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
    toast({ title: "Photo supprimée", description: "Photo retirée." });
  };

  const getPhotoPreview = (file: File | null) =>
    file ? URL.createObjectURL(file) : null;

  const clickInput = (id: string) => {
    (document.getElementById(id) as HTMLInputElement)?.click();
  };

  // ── Navigation ───────────────────────────────────────────────────────────

  const nextStep = () => {
    if (currentStep === 1) {
      if (!category || !brand.trim() || !model.trim() || !year.trim() || !fuelType || !transmission) {
        toast({
          title: "Champs manquants",
          description: "Catégorie, marque, modèle, année, carburant et boîte sont requis.",
          variant: "destructive",
        });
        return;
      }
    }
    setCurrentStep((s) => Math.min(s + 1, 3));
  };

  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({ title: "Erreur", description: "Vous devez être connecté.", variant: "destructive" });
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
    const parsedMileage = mileage ? parseInt(mileage, 10) : 0;
    const parsedSeats = seats ? parseInt(seats, 10) : undefined;
    const parsedDoors = doors ? parseInt(doors, 10) : undefined;

    if (Number.isNaN(parsedYear) || parsedYear < 1990 || parsedYear > 2030) {
      toast({ title: "Erreur", description: "Année invalide.", variant: "destructive" });
      return;
    }
    if (Number.isNaN(parsedPrice) || parsedPrice < 1000) {
      toast({ title: "Erreur", description: "Prix invalide (min 1 000 Ar).", variant: "destructive" });
      return;
    }

    const svcPrice = (s: ServiceField) =>
      !s.enabled ? null : s.free ? null : parseFloat(s.price) || null;

    setLoading(true);
    try {
      const { data, error } = await SupabaseVehiclesService.createVehicle({
        owner_id: user.id,
        brand: brand.trim(),
        model: model.trim(),
        color: color || undefined,
        year: parsedYear,
        mileage: parsedMileage,
        price_per_day: parsedPrice,
        description: description || undefined,
        vehicle_type: "car",
        vehicle_category: category || undefined,
        location_area_id: locationAreaId || null,
        seats: parsedSeats,
        doors: parsedDoors,
        transmission: (transmission || "manual") as any,
        fuel_type: (fuelType || "gasoline") as any,
        license_plate: licensePlate || undefined,
        has_ac: equipment.hasAC,
        has_gps: equipment.hasGPS,
        has_cruise_control: equipment.hasCruiseControl,
        has_bluetooth: equipment.hasBluetooth,
        has_carplay: equipment.hasCarPlay,
        has_audio_input: equipment.hasAudioInput,
        // Services aéroport
        airport_pickup_service: svcAirportPickup.enabled || svcAirportReturn.enabled || null,
        airport_pickup_retrieval: svcAirportPickup.enabled || null,
        airport_pickup_retrieval_free: svcAirportPickup.enabled ? svcAirportPickup.free : null,
        airport_pickup_retrieval_price: svcAirportPickup.enabled ? svcPrice(svcAirportPickup) : null,
        airport_pickup_return: svcAirportReturn.enabled || null,
        airport_pickup_return_free: svcAirportReturn.enabled ? svcAirportReturn.free : null,
        airport_pickup_return_price: svcAirportReturn.enabled ? svcPrice(svcAirportReturn) : null,
        // Services barge Petite Terre
        barge_petite_terre_service: svcBargePTPickup.enabled || svcBargePTReturn.enabled || null,
        barge_petite_terre_retrieval: svcBargePTPickup.enabled || null,
        barge_petite_terre_retrieval_free: svcBargePTPickup.enabled ? svcBargePTPickup.free : null,
        barge_petite_terre_retrieval_price: svcBargePTPickup.enabled ? svcPrice(svcBargePTPickup) : null,
        barge_petite_terre_return: svcBargePTReturn.enabled || null,
        barge_petite_terre_return_free: svcBargePTReturn.enabled ? svcBargePTReturn.free : null,
        barge_petite_terre_return_price: svcBargePTReturn.enabled ? svcPrice(svcBargePTReturn) : null,
        // Services barge Grande Terre
        barge_grande_terre_service: svcBargeGTPickup.enabled || svcBargeGTReturn.enabled || null,
        barge_grande_terre_retrieval: svcBargeGTPickup.enabled || null,
        barge_grande_terre_retrieval_free: svcBargeGTPickup.enabled ? svcBargeGTPickup.free : null,
        barge_grande_terre_retrieval_price: svcBargeGTPickup.enabled ? svcPrice(svcBargeGTPickup) : null,
        barge_grande_terre_return: svcBargeGTReturn.enabled || null,
        barge_grande_terre_return_free: svcBargeGTReturn.enabled ? svcBargeGTReturn.free : null,
        barge_grande_terre_return_price: svcBargeGTReturn.enabled ? svcPrice(svcBargeGTReturn) : null,
        // Livraison
        home_delivery_service: svcDeliveryPickup.enabled || svcDeliveryReturn.enabled || null,
        home_delivery_pickup: svcDeliveryPickup.enabled || null,
        home_delivery_pickup_free: svcDeliveryPickup.enabled ? svcDeliveryPickup.free : null,
        home_delivery_pickup_price: svcDeliveryPickup.enabled ? svcPrice(svcDeliveryPickup) : null,
        home_delivery_return: svcDeliveryReturn.enabled || null,
        home_delivery_return_free: svcDeliveryReturn.enabled ? svcDeliveryReturn.free : null,
        home_delivery_return_price: svcDeliveryReturn.enabled ? svcPrice(svcDeliveryReturn) : null,
        // Siège bébé
        baby_seat_service: svcBabySeat.enabled || null,
        baby_seat_free: svcBabySeat.enabled ? svcBabySeat.free : null,
        baby_seat_price: svcBabySeat.enabled ? svcPrice(svcBabySeat) : null,
        // Conducteur supp.
        additional_driver_service: svcExtraDriver.enabled || null,
        additional_driver_free: svcExtraDriver.enabled ? svcExtraDriver.free : null,
        additional_driver_price: svcExtraDriver.enabled ? svcPrice(svcExtraDriver) : null,
        available: true,
        status: "active",
      });

      if (error || !data) throw new Error(error || "Erreur création véhicule");

      // Équipements supplémentaires non couverts par createVehicle
      const extraEquip = {
        has_backup_camera: equipment.hasBackupCamera,
        has_usb_port: equipment.hasUSBPort,
        has_leather_seats: equipment.hasLeatherSeats,
        has_sunroof: equipment.hasSunroof,
        has_premium_audio: equipment.hasPremiumAudio,
        has_roof_rack: equipment.hasRoofRack,
        has_wireless_charger: equipment.hasWirelessCharger,
        has_parking_sensors: equipment.hasParkingSensors,
        has_abs: equipment.hasABS,
        has_large_trunk: equipment.hasLargeTrunk,
        has_roof_box: equipment.hasRoofBox,
        has_bike_rack: equipment.hasBikeRack,
        has_android_auto: equipment.hasAndroidAuto,
      };
      const hasExtraEquip = Object.values(extraEquip).some(Boolean);
      if (hasExtraEquip) {
        await supabase.from("vehicles").update(extraEquip).eq("id", data.id);
      }

      // Upload photos
      await uploadVehiclePhotos(data.id, vehiclePhotos, additionalPhotos, toast);

      toast({
        title: "Véhicule ajouté !",
        description: "Votre annonce a été créée. Gérez-la depuis votre tableau de bord.",
      });
      navigate("/me/owner/vehicles");
    } catch (err: any) {
      console.error("Erreur création voiture:", err);
      toast({
        title: "Erreur",
        description: err?.message || "Impossible de créer le véhicule. Réessayez.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Render steps ─────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-6">
      {/* Catégorie */}
      <div className="space-y-2">
        <Label>Catégorie du véhicule *</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CAR_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                category === cat.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Marque / Modèle */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="brand">Marque *</Label>
          <Input
            id="brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Ex : Toyota"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="model">Modèle *</Label>
          <Input
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Ex : RAV4"
          />
        </div>
      </div>

      {/* Année / Kilométrage */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="year">Année *</Label>
          <Input
            id="year"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2022"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="mileage">Kilométrage (approx.)</Label>
          <Input
            id="mileage"
            type="number"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      {/* Carburant / Boîte */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Carburant *</Label>
          <Select value={fuelType} onValueChange={(v: FuelType) => setFuelType(v)}>
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
          <Select value={transmission} onValueChange={(v: Transmission) => setTransmission(v)}>
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
          <Label>Nombre de places</Label>
          <Select value={seats} onValueChange={setSeats}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {["2", "4", "5", "7", "9"].map((n) => (
                <SelectItem key={n} value={n}>{n} places</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Nombre de portes</Label>
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
          <Label>Couleur</Label>
          <Select value={color} onValueChange={setColor}>
            <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              {COLORS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="licensePlate">Immatriculation (optionnel)</Label>
          <Input
            id="licensePlate"
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value)}
            placeholder="Ex : 1234 NB"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* Équipements */}
      <div>
        <h3 className="text-base font-semibold mb-4">Équipements du véhicule</h3>
        <div className="space-y-6">
          {EQUIPMENT_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                {group.label}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.items.map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors"
                  >
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
          ))}
        </div>
      </div>

      {/* Services */}
      <div>
        <h3 className="text-base font-semibold mb-1">Services proposés</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Activez les services que vous offrez et indiquez leur tarif.
        </p>

        <div className="rounded-lg border border-slate-200 px-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-4 pb-2">
            ✈️ Aéroport de Fascène
          </p>
          <ServiceRow label="Prise en charge" icon="🛬" value={svcAirportPickup} onChange={setSvcAirportPickup} />
          <ServiceRow label="Restitution" icon="🛫" value={svcAirportReturn} onChange={setSvcAirportReturn} />

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-4 pb-2">
            🚢 Barge Petite Terre
          </p>
          <ServiceRow label="Prise en charge" icon="⬇️" value={svcBargePTPickup} onChange={setSvcBargePTPickup} />
          <ServiceRow label="Restitution" icon="⬆️" value={svcBargePTReturn} onChange={setSvcBargePTReturn} />

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-4 pb-2">
            🚢 Barge Grande Terre
          </p>
          <ServiceRow label="Prise en charge" icon="⬇️" value={svcBargeGTPickup} onChange={setSvcBargeGTPickup} />
          <ServiceRow label="Restitution" icon="⬆️" value={svcBargeGTReturn} onChange={setSvcBargeGTReturn} />

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-4 pb-2">
            🚗 Livraison à domicile
          </p>
          <ServiceRow label="Prise en charge" icon="📍" value={svcDeliveryPickup} onChange={setSvcDeliveryPickup} />
          <ServiceRow label="Restitution" icon="🏠" value={svcDeliveryReturn} onChange={setSvcDeliveryReturn} />

          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-4 pb-2">
            Extras
          </p>
          <ServiceRow label="Siège bébé" icon="👶" value={svcBabySeat} onChange={setSvcBabySeat} perDay />
          <ServiceRow label="Conducteur supplémentaire" icon="👨‍✈️" value={svcExtraDriver} onChange={setSvcExtraDriver} perDay />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
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

      {/* Zone */}
      <div className="space-y-1">
        <Label>Localisation *</Label>
        <Select value={locationAreaId} onValueChange={setLocationAreaId}>
          <SelectTrigger><SelectValue placeholder="Sélectionner un quartier" /></SelectTrigger>
          <SelectContent>
            {LOCATION_AREAS.map((area) => (
              <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Photos – hidden file inputs (pattern identique scooter) */}
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

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Photos du véhicule</p>
            <p className="text-xs text-muted-foreground">Ajoutez au moins une photo pour attirer plus de locataires.</p>
          </div>
        </div>

        <div className="sr-only" aria-live="polite" aria-atomic="true">{feedbackMessage}</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(
            [
              { type: "frontLeft" as const, inputId: "car-photo-frontLeft", label: "Photo principale", hint: "Avant gauche – angle recommandé" },
              { type: "profileLeft" as const, inputId: "car-photo-profileLeft", label: "Profil gauche", hint: "Vue de côté" },
              { type: "interior" as const, inputId: "car-photo-interior", label: "Intérieur", hint: "Tableau de bord, habitacle" },
            ] as const
          ).map(({ type, inputId, label, hint }) => {
            const preview = getPhotoPreview(vehiclePhotos[type]);
            return (
              <div key={type} className="group border-2 border-dashed border-muted-foreground/25 rounded-lg overflow-hidden transition-colors hover:border-primary/50">
                <div className="relative h-32 w-full bg-muted/40 flex flex-col items-center justify-center gap-2">
                  {type === "frontLeft" && (
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[11px] px-2 py-1 rounded-md z-10">
                      {label}
                    </div>
                  )}
                  {preview ? (
                    <>
                      <img src={preview} alt={label} className="w-full h-full object-cover" />
                      <button type="button"
                        onClick={() => clickInput(inputId)}
                        className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-background/90 border rounded hover:bg-background transition-colors">
                        Changer
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={() => clickInput(inputId)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs border rounded-md bg-background hover:bg-muted transition-colors">
                        <Upload className="h-4 w-4" />
                        Ajouter une photo
                      </button>
                      <span className="text-xs text-muted-foreground text-center px-2">{hint}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Photos supplémentaires */}
        <button type="button" onClick={() => clickInput("car-photo-additional")}
          disabled={additionalPhotos.length >= 3}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md transition-colors ${
            additionalPhotos.length >= 3 ? "opacity-50 cursor-not-allowed" : "bg-background hover:bg-muted cursor-pointer"
          }`}>
          <Upload className="h-4 w-4" />
          Ajouter des photos
        </button>

        {additionalPhotos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* Description */}
      <div className="space-y-1">
        <Label htmlFor="description">Description (optionnel)</Label>
        <textarea
          id="description"
          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez votre véhicule — état, options incluses, disponibilité, restrictions..."
        />
        <span className={`text-xs ${description.length > 800 ? "text-red-600" : "text-muted-foreground"}`}>
          {description.length}/800
        </span>
      </div>
    </div>
  );

  const STEP_LABELS = ["Votre véhicule", "Équipements & Services", "Prix & Photos"];

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

              {/* Progress */}
              <div className="mt-4">
                <div className="flex justify-between mb-2">
                  {STEP_LABELS.map((label, i) => (
                    <span
                      key={label}
                      className={`text-xs font-medium ${i + 1 === currentStep ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {i + 1}. {label}
                    </span>
                  ))}
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${(currentStep / 3) * 100}%` }}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}

                {/* Navigation */}
                <div className="flex justify-between gap-3 pt-4">
                  {currentStep > 1 ? (
                    <Button type="button" variant="outline" onClick={prevStep}
                      className="flex items-center gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Précédent
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => navigate("/me/owner/vehicles")}>
                      Annuler
                    </Button>
                  )}

                  {currentStep < 3 ? (
                    <Button type="button" onClick={nextStep}
                      className="flex items-center gap-2 bg-gradient-lagoon hover:opacity-90 text-white">
                      Suivant
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={loading}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white">
                      {loading ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Création...</>
                      ) : (
                        <><CheckCircle className="h-4 w-4" />Créer le véhicule</>
                      )}
                    </Button>
                  )}
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
