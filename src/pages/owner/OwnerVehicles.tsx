import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Car, Calendar, Settings, Loader2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Footer } from "@/components/layout/footer";
import { ProfileService } from "@/services/supabase/profile";
import { SupabaseVehiclesService } from "@/services/supabaseVehiclesService";
import { PhotoService } from "@/services/supabase/photos";
import { Vehicle, User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { VehicleTypeModal } from "@/components/owner/VehicleTypeModal";
import { getPublicListingPath } from "@/utils/vehicleType";
import { getOptimizedImageUrl } from "@/utils/imageOptimization";
import { MdHotel, MdMoped, MdTwoWheeler, MdTerrain } from "react-icons/md";

const LOCKED_OPERATIONAL_STATUSES = new Set([
  "rented",
  "reserved",
  "maintenance",
  "broken",
  "accident",
]);

const PUBLICATION_BADGE: Record<string, { label: string; className: string }> = {
  available: { label: "Publié", className: "bg-green-500 text-white" },
  retired: { label: "Hors ligne", className: "bg-red-500 text-white" },
  rented: { label: "En location", className: "bg-blue-500 text-white" },
  reserved: { label: "Réservé", className: "bg-purple-500 text-white" },
  maintenance: { label: "En entretien", className: "bg-orange-500 text-white" },
  broken: { label: "En panne", className: "bg-red-700 text-white" },
  accident: { label: "Accidenté", className: "bg-red-700 text-white" },
};

type OwnerVehicleRow = Vehicle & {
  operationalStatus: string;
  isPublished: boolean;
  vehicleCategory: string | null;
};

// ── Filter config ────────────────────────────────────────────────────────────
const TYPE_FILTERS = [
  { id: "accommodation", label: "Hébergements",  Icon: MdHotel },
  { id: "scooter",       label: "Scooters",      Icon: MdMoped },
  { id: "moto",          label: "Motos",         Icon: MdTwoWheeler },
  { id: "quad",          label: "Quads/Buggys",  Icon: MdTerrain },
  { id: "car",           label: "Voitures",      Icon: Car },
] as const;

const SUB_CATEGORY_FILTERS: Record<string, { id: string; label: string }[]> = {
  accommodation: [
    { id: "Appartement", label: "Appartement" },
    { id: "Villa",       label: "Villa" },
    { id: "Bungalow",   label: "Bungalow" },
    { id: "Maison",     label: "Maison" },
    { id: "Chambre",    label: "Chambre" },
  ],
  car: [
    { id: "Citadine",    label: "Citadine" },
    { id: "SUV",         label: "SUV" },
    { id: "Pick-up",     label: "Pick-up" },
    { id: "Minibus",     label: "Minibus" },
    { id: "Berline",     label: "Berline" },
  ],
};

function vehicleMatchesType(v: OwnerVehicleRow, typeId: string): boolean {
  const vt = v.vehicleType as string;
  if (typeId === "car") return !["scooter", "moto", "accommodation", "quad"].includes(vt);
  return vt === typeId;
}

function PublicationBadge({
  operationalStatus,
  isPublished,
}: {
  operationalStatus: string;
  isPublished: boolean;
}) {
  const config =
    PUBLICATION_BADGE[operationalStatus] ??
    (isPublished ? PUBLICATION_BADGE.available : PUBLICATION_BADGE.retired);

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

const OwnerVehicles = () => {
  const { t } = useTranslation("common");
  const [vehicles, setVehicles] = useState<OwnerVehicleRow[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [pendingAvailabilityChange, setPendingAvailabilityChange] = useState<{vehicleId: string, newValue: boolean} | null>(null);
  const [updatingVehicle, setUpdatingVehicle] = useState<string | null>(null);
  const [showVehicleTypeModal, setShowVehicleTypeModal] = useState(false);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [activeSubCat, setActiveSubCat] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Computed counts per type
  const typeCounts = useMemo(() =>
    Object.fromEntries(TYPE_FILTERS.map(f => [f.id, vehicles.filter(v => vehicleMatchesType(v, f.id)).length])),
    [vehicles]
  );

  // Sub-cat counts for the active type
  const subCatCounts = useMemo(() => {
    if (!activeType || !SUB_CATEGORY_FILTERS[activeType]) return {} as Record<string, number>;
    const typeVehicles = vehicles.filter(v => vehicleMatchesType(v, activeType));
    return Object.fromEntries(
      SUB_CATEGORY_FILTERS[activeType].map(s => [s.id, typeVehicles.filter(v => v.vehicleCategory === s.id).length])
    );
  }, [vehicles, activeType]);

  // Filtered list for display
  const displayVehicles = useMemo(() => {
    let result = activeType ? vehicles.filter(v => vehicleMatchesType(v, activeType)) : vehicles;
    if (activeType && activeSubCat && SUB_CATEGORY_FILTERS[activeType]) {
      result = result.filter(v => v.vehicleCategory === activeSubCat);
    }
    return result;
  }, [vehicles, activeType, activeSubCat]);

  const handleTypeClick = (typeId: string) => {
    if (activeType === typeId) {
      setActiveType(null);
      setActiveSubCat(null);
    } else {
      setActiveType(typeId);
      setActiveSubCat(null);
    }
  };

  const handleSubCatClick = (subId: string) => {
    setActiveSubCat(prev => prev === subId ? null : subId);
  };

  const handleResetFilters = () => {
    setActiveType(null);
    setActiveSubCat(null);
  };

  useEffect(() => {
    loadData();
  }, []);

  const checkActiveReservations = async (vehicleId: string) => {
    try {
      // Vérifier s'il y a des réservations actives pour ce véhicule
      const { data, error } = await supabase
        .from('reservations')
        .select('id, status, start_date, end_date')
        .eq('vehicle_id', vehicleId)
        .in('status', ['confirmed', 'active', 'pending']);

      if (error) {
        console.error("Erreur lors de la vérification des réservations:", error);
        return false;
      }

      // Vérifier s'il y a des réservations futures ou en cours
      const now = new Date();
      const hasActive = data?.some(reservation => {
        const startDate = new Date(reservation.start_date);
        const endDate = new Date(reservation.end_date);
        return startDate <= now && endDate >= now;
      }) || false;

      return hasActive;
    } catch (error) {
      console.error("Erreur lors de la vérification des réservations:", error);
      return false;
    }
  };

  const handleAvailabilityChange = async (vehicleId: string, newValue: boolean) => {
    // Si on désactive la disponibilité, demander confirmation
    if (!newValue) {
      const hasActive = await checkActiveReservations(vehicleId);
      
      if (hasActive) {
        toast({
          title: t(
            "ownerVehicles.toasts.cannotDisable.title",
            "Impossible de désactiver"
          ),
          description: t(
            "ownerVehicles.toasts.cannotDisable.description",
            "Ce véhicule a des réservations actives ou futures. Annulez d'abord les réservations."
          ),
          variant: "destructive",
        });
        return;
      }

      setPendingAvailabilityChange({ vehicleId, newValue });
      setShowAvailabilityDialog(true);
    } else {
      // Si on active, pas de confirmation nécessaire
      await saveVehicleStatus(vehicleId, newValue);
    }
  };

  const saveVehicleStatus = async (vehicleId: string, isAvailable: boolean) => {
    setUpdatingVehicle(vehicleId);

    try {
      const { error } = await supabase
        .from('vehicles')
        .update({ available: isAvailable })
        .eq('id', vehicleId);

      if (error) {
        console.error("Erreur lors de la sauvegarde du statut:", error);
        toast({
          title: t("ownerVehicles.toasts.saveStatusError.title", "Erreur"),
          description: t(
            "ownerVehicles.toasts.saveStatusError.description",
            "Impossible de sauvegarder le statut : {{message}}",
            { message: error.message }
          ),
          variant: "destructive",
        });
        return;
      }

      // Mettre à jour l'état local
      setVehicles(prev => prev.map(vehicle => 
        vehicle.id === vehicleId 
          ? {
              ...vehicle,
              status: isAvailable ? "active" : "inactive",
              isPublished: isAvailable,
              operationalStatus: isAvailable ? "available" : "retired",
            }
          : vehicle
      ));

      toast({
        title: t(
          "ownerVehicles.toasts.statusUpdated.title",
          "Statut mis à jour"
        ),
        description: t(
          isAvailable
            ? "ownerVehicles.toasts.statusUpdated.available"
            : "ownerVehicles.toasts.statusUpdated.unavailable",
          isAvailable
            ? "Le véhicule est maintenant disponible"
            : "Le véhicule est maintenant indisponible"
        ),
      });
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du statut:", error);
      toast({
        title: t("ownerVehicles.toasts.genericError.title", "Erreur"),
        description: t(
          "ownerVehicles.toasts.genericError.description",
          "Une erreur est survenue lors de la sauvegarde."
        ),
        variant: "destructive",
      });
    } finally {
      setUpdatingVehicle(null);
    }
  };

  const confirmAvailabilityChange = async () => {
    if (pendingAvailabilityChange) {
      await saveVehicleStatus(pendingAvailabilityChange.vehicleId, pendingAvailabilityChange.newValue);
    }
    setShowAvailabilityDialog(false);
    setPendingAvailabilityChange(null);
  };

  const cancelAvailabilityChange = () => {
    setShowAvailabilityDialog(false);
    setPendingAvailabilityChange(null);
  };

  // Ouvre la modal de choix du type de véhicule
  const handleAddVehicleClick = () => {
    setShowVehicleTypeModal(true);
  };

  // Navigation vers le formulaire voiture existant
  const handleSelectCar = () => {
    setShowVehicleTypeModal(false);
    navigate("/rent-my-car/register?existingOwner=true");
  };

  // Navigation vers la future page moto / scooter (placeholder)
  const handleSelectMoto = () => {
    setShowVehicleTypeModal(false);
    navigate("/me/owner/vehicles/add-moto");
  };

  const handleSelectAccommodation = () => {
    setShowVehicleTypeModal(false);
    navigate("/me/owner/vehicles/add-moto?kind=accommodation");
  };

  const handleSelectQuad = () => {
    setShowVehicleTypeModal(false);
    navigate("/me/owner/vehicles/add-moto?kind=quad");
  };

  const loadData = async () => {
    try {
      const userResult = await ProfileService.getCurrentUserProfile();
      if (!userResult.data) {
        toast({
          title: t("ownerVehicles.toasts.mustBeLoggedIn.title", "Erreur"),
          description: t(
            "ownerVehicles.toasts.mustBeLoggedIn.description",
            "Vous devez être connecté pour accéder à cette page"
          ),
          variant: "destructive",
        });
        return;
      }

      setCurrentUser(userResult.data);

      const isAdmin = userResult.data.isAdmin === true;
      const vehiclesResult = await SupabaseVehiclesService.getOwnerVehicles(
        userResult.data.id,
        { isAdmin }
      );
      if (vehiclesResult.error) {
        toast({
          title: t("ownerVehicles.toasts.loadVehiclesError.title", "Erreur"),
          description:
            typeof vehiclesResult.error === "string"
              ? vehiclesResult.error
              : t(
                  "ownerVehicles.toasts.loadVehiclesError.description",
                  "Impossible de charger vos véhicules"
                ),
          variant: "destructive",
        });
        setVehicles([]);
      } else {
        // Mapper les véhicules Supabase vers le format de l'application
        const mappedVehicles: OwnerVehicleRow[] = vehiclesResult.data.map((supabaseVehicle) => ({
          id: supabaseVehicle.id,
          ownerId: supabaseVehicle.owner_id || "",
          license: supabaseVehicle.id.substring(0, 8).toUpperCase(), // Temporaire
          brand: supabaseVehicle.brand,
          model: supabaseVehicle.model,
          color: supabaseVehicle.color || "Non spécifié",
          fuel: (supabaseVehicle.fuel_type as any) || "gasoline",
          year: supabaseVehicle.year,
          hasAC: true, // À ajouter dans la DB plus tard
          doors: supabaseVehicle.seats || 5,
          transmission: (supabaseVehicle.transmission as any) || "manual",
          mileage: supabaseVehicle.mileage || 0,
          dailyPrice: supabaseVehicle.price_per_day,
          currency: "EUR" as const,
          latitude: 0, // À ajouter dans la DB plus tard
          longitude: 0, // À ajouter dans la DB plus tard
          status: supabaseVehicle.available ? "active" : "inactive",
          operationalStatus: supabaseVehicle.operational_status ?? "available",
          isPublished: supabaseVehicle.available ?? false,
          imageUrl: supabaseVehicle.image_url || null,
          createdAt: supabaseVehicle.created_at || new Date().toISOString(),
          updatedAt: supabaseVehicle.updated_at || new Date().toISOString(),
          vehicleType: (supabaseVehicle.vehicle_type as Vehicle["vehicleType"]) ?? "car",
          vehicleCategory: supabaseVehicle.vehicle_category ?? null,
        }));

        // Enrichir avec les photos uploadées (vehicle_photos table)
        const vehicleIds = mappedVehicles.map(v => v.id);
        const { data: primaryPhotos } = await PhotoService.getPrimaryPhotosForVehicles(vehicleIds);
        const enriched = mappedVehicles.map(v => ({
          ...v,
          imageUrl: primaryPhotos[v.id]?.url || v.imageUrl,
        }));

        setVehicles(enriched);
      }
    } catch (error) {
      toast({
        title: t("ownerVehicles.toasts.loadVehiclesError.title", "Erreur"),
        description: t(
          "ownerVehicles.toasts.loadVehiclesError.description",
          "Impossible de charger vos véhicules"
        ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <div className="min-h-screen bg-background pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">
                {t("ownerVehicles.loading", "Chargement...")}
              </p>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        <div className="min-h-screen bg-background pt-20">
          <div className="container mx-auto px-4 py-8">
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-center">
                  {t(
                    "ownerVehicles.accessDenied.title",
                    "Accès refusé"
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="mb-4">
                  {t(
                    "ownerVehicles.accessDenied.description",
                    "Vous devez être connecté pour accéder à cette page."
                  )}
                </p>
                <Link to="/auth/login">
                  <Button>
                    {t(
                      "ownerVehicles.accessDenied.login",
                      "Se connecter"
                    )}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-primary-soft/5 to-secondary-soft/10 pt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {t("ownerVehicles.header.title", "Mes véhicules")}
              </h1>
              <p className="text-muted-foreground">
                {t(
                  "ownerVehicles.header.subtitle",
                  "Gérez vos véhicules et vos réservations"
                )}
              </p>
            </div>
            {vehicles.length > 0 && (
              <Button
                type="button"
                onClick={handleAddVehicleClick}
                className="shrink-0 inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {t("ownerVehicles.addCard.title", "Ajouter un véhicule")}
              </Button>
            )}
          </div>

          {/* ── Type filter cards ── */}
          {vehicles.length > 0 && (
            <div className="mb-6 space-y-3">
              {(activeType || activeSubCat) && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground font-medium">Filtres :</span>
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 text-primary font-semibold hover:underline"
                  >
                    <X className="h-3 w-3" /> Réinitialiser
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {TYPE_FILTERS.map(({ id, label, Icon }) => {
                  const count = typeCounts[id] ?? 0;
                  const isActive = activeType === id;
                  return (
                    <button
                      key={id}
                      onClick={() => handleTypeClick(id)}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 text-center cursor-pointer ${
                        isActive
                          ? "border-primary bg-primary/5 shadow-md"
                          : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
                      }`}
                    >
                      <div className={`rounded-full p-2 ${isActive ? "bg-primary/10" : "bg-muted"}`}>
                        <Icon className={`h-6 w-6 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <span className={`font-semibold text-sm ${isActive ? "text-primary" : "text-foreground"}`}>{label}</span>
                      <span className={`text-xs ${count === 0 ? "text-muted-foreground/60" : isActive ? "text-primary" : "text-muted-foreground"}`}>
                        {count} annonce{count !== 1 ? "s" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sub-category chips */}
              {activeType && SUB_CATEGORY_FILTERS[activeType] && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUB_CATEGORY_FILTERS[activeType].map(({ id, label }) => {
                    const count = subCatCounts[id] ?? 0;
                    const isActive = activeSubCat === id;
                    return (
                      <button
                        key={id}
                        onClick={() => handleSubCatClick(id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-all ${
                          isActive
                            ? "border-primary bg-primary text-white"
                            : "border-border bg-background text-foreground hover:border-primary/50"
                        }`}
                      >
                        {label}
                        <span className={`text-xs ${isActive ? "text-white/80" : "text-muted-foreground"}`}>
                          ({count})
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {currentUser.kycStatus !== "verified" && (
            <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3">
                  <Settings className="h-5 w-5 text-amber-600" />
                  <div>
                    <h3 className="font-medium text-amber-800 dark:text-amber-200">
                      {t(
                        "ownerVehicles.kycRequired.title",
                        "Vérification KYC requise"
                      )}
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {t(
                        "ownerVehicles.kycRequired.description",
                        "Pour publier vos véhicules, vous devez compléter votre vérification d'identité."
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {vehicles.length === 0 ? (
            <Card className="max-w-lg mx-auto text-center">
              <CardContent className="pt-12 pb-12">
                <Car className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {t("ownerVehicles.empty.title", "Aucun véhicule")}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {t(
                    "ownerVehicles.empty.description",
                    "Commencez par ajouter votre premier véhicule à la plateforme."
                  )}
                </p>

                {/* CTA d'ajout de véhicule même lorsque la liste est vide */}
                <Button
                  type="button"
                  onClick={handleAddVehicleClick}
                  className="mt-2 inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {t(
                    "ownerVehicles.empty.addFirstVehicle",
                    "Ajouter mon premier véhicule"
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {displayVehicles.map((vehicle) => (
                <Card key={vehicle.id} className="hover:shadow-xl hover:scale-105 transition-all duration-300 relative overflow-hidden group border-0 shadow-lg">
                  {/* Fond avec photo — img + lazy au lieu de background-image pour optimiser */}
                  {vehicle.imageUrl && (
                    <img
                      src={
                        vehicle.imageUrl.includes("supabase.co/storage")
                          ? getOptimizedImageUrl(vehicle.imageUrl, 600, 400)
                          : vehicle.imageUrl
                      }
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110 opacity-60"
                      loading="lazy"
                      decoding="async"
                      width={600}
                      height={400}
                    />
                  )}
                  
                  {/* Overlay avec dégradé moderne */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/85 via-white/70 to-white/90 group-hover:from-white/80 group-hover:via-white/65 group-hover:to-white/85 transition-all duration-300" />
                  
                  {/* Contenu de la carte */}
                  <div className="relative z-10 p-6">
                    {/* Header avec badge et toggle */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-gray-800 transition-colors">
                          {vehicle.brand} {vehicle.model}
                        </h3>
                        <p className="text-sm text-gray-600 font-medium">
                          {vehicle.license}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <PublicationBadge
                          operationalStatus={vehicle.operationalStatus}
                          isPublished={vehicle.isPublished}
                        />
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`availability-${vehicle.id}`}
                            checked={vehicle.isPublished}
                            onCheckedChange={(checked) => handleAvailabilityChange(vehicle.id, checked)}
                            disabled={
                              updatingVehicle === vehicle.id ||
                              LOCKED_OPERATIONAL_STATUSES.has(vehicle.operationalStatus)
                            }
                            className="data-[state=checked]:bg-green-500"
                          />
                          {updatingVehicle === vehicle.id && (
                            <Loader2 className="h-3 w-3 animate-spin text-gray-500" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Informations du véhicule */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white/60 rounded-lg p-3 backdrop-blur-sm border border-white/50">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                          {t(
                            "ownerVehicles.card.pricePerDay",
                            "Prix/jour"
                          )}
                        </p>
                        <p className="text-lg font-bold text-gray-900">{vehicle.dailyPrice} {vehicle.currency}</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3 backdrop-blur-sm border border-white/50">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                          {t(
                            "ownerVehicles.card.year",
                            "Année"
                          )}
                        </p>
                        <p className="text-lg font-bold text-gray-900">{vehicle.year}</p>
                      </div>
                    </div>

                    {/* Carburant */}
                    <div className="mb-6">
                      <div className="bg-white/60 rounded-lg p-3 backdrop-blur-sm border border-white/50">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">
                          {t(
                            "ownerVehicles.card.fuel",
                            "Carburant"
                          )}
                        </p>
                        <p className="text-sm font-medium text-gray-900 capitalize">{vehicle.fuel}</p>
                      </div>
                    </div>
                    
                    {/* Boutons d'action */}
                    <div className="space-y-3">
                      <Link to={`/me/owner/vehicles/${vehicle.id}/manage`}>
                        <Button 
                          variant="outline" 
                          className="w-full bg-white/90 hover:bg-white border-gray-300 hover:border-gray-400 hover:shadow-md transition-all duration-200 font-medium"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          {t(
                            "ownerVehicles.card.actions.manage",
                            "Gérer le véhicule"
                          )}
                        </Button>
                      </Link>
                      <Link to={getPublicListingPath(vehicle)}>
                        <Button 
                          variant="ghost"
                          className="w-full bg-white/70 hover:bg-white/90 text-gray-700 hover:text-gray-900 hover:shadow-sm transition-all duration-200"
                        >
                          {t(
                            "ownerVehicles.card.actions.viewPublic",
                            "Voir la fiche publique"
                          )}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
              
              {/* Empty state when filter gives 0 results */}
              {displayVehicles.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <p className="text-lg font-semibold mb-2">Aucune annonce pour ce filtre</p>
                  <button onClick={handleResetFilters} className="text-sm text-primary underline">Voir toutes les annonces</button>
                </div>
              )}

              {/* Carte d'ajout de véhicule — masquée si filtre actif */}
              {!activeType && <Card
                className="hover:shadow-xl hover:scale-105 transition-all duration-300 relative overflow-hidden group border-2 border-dashed border-gray-300 hover:border-primary/50 bg-gradient-to-br from-gray-50 to-gray-100 cursor-pointer"
                onClick={handleAddVehicleClick}
              >
                <div className="relative z-10 p-6 h-full flex flex-col items-center justify-center text-center min-h-[400px]">
                  <div className="bg-white/80 rounded-full p-6 mb-4 group-hover:bg-white/90 transition-all duration-300">
                    <Plus className="h-12 w-12 text-gray-400 group-hover:text-primary transition-colors duration-300" />
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-700 mb-2 group-hover:text-gray-900 transition-colors">
                    {t(
                      "ownerVehicles.addCard.title",
                      "Ajouter un véhicule"
                    )}
                  </h3>
                  
                  <p className="text-sm text-gray-500 mb-6 group-hover:text-gray-600 transition-colors max-w-xs">
                    {t(
                      "ownerVehicles.addCard.description",
                      "Cliquez ici pour ajouter un nouveau véhicule à votre flotte et commencer à le louer"
                    )}
                  </p>
                  
                  <div className="bg-white/60 rounded-lg p-4 backdrop-blur-sm border border-white/50 w-full">
                    <div className="flex items-center justify-center space-x-2 text-gray-600">
                      <Car className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {t(
                          "ownerVehicles.addCard.badge",
                          "Nouveau véhicule"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>}
            </div>
          )}
        </div>
      </div>
      
      {/* Fenêtre de confirmation pour la disponibilité */}
      <AlertDialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                "ownerVehicles.availabilityDialog.title",
                "Confirmer la modification de disponibilité"
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {t(
                  "ownerVehicles.availabilityDialog.intro",
                  "En désactivant la disponibilité de votre véhicule :"
                )}
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>
                  {t(
                    "ownerVehicles.availabilityDialog.point1",
                    "Il ne sera plus visible dans les résultats de recherche"
                  )}
                </li>
                <li>
                  {t(
                    "ownerVehicles.availabilityDialog.point2",
                    "Les clients ne pourront plus effectuer de nouvelles réservations"
                  )}
                </li>
                <li>
                  {t(
                    "ownerVehicles.availabilityDialog.point3",
                    "Les réservations existantes restent valides"
                  )}
                </li>
              </ul>
              <p className="font-medium">
                {t(
                  "ownerVehicles.availabilityDialog.confirmQuestion",
                  "Êtes-vous sûr de vouloir continuer ?"
                )}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelAvailabilityChange}>
              {t("ownerVehicles.availabilityDialog.cancel", "Annuler")}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAvailabilityChange}
              className="bg-red-600 hover:bg-red-700"
            >
              {t(
                "ownerVehicles.availabilityDialog.confirm",
                "Confirmer la désactivation"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Modal de sélection du type de véhicule */}
      <VehicleTypeModal
        open={showVehicleTypeModal}
        onOpenChange={setShowVehicleTypeModal}
        onSelectCar={handleSelectCar}
        onSelectMoto={handleSelectMoto}
        onSelectQuad={handleSelectQuad}
        onSelectAccommodation={handleSelectAccommodation}
      />

      <Footer />
    </>
  );
};

export default OwnerVehicles;