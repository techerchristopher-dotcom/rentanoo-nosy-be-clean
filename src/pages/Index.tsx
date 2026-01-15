import { useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate } from "react-router-dom";
import { Search, Filter, Calendar, MapPin, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SearchBarAirbnb } from "@/components/ui/search-bar-airbnb";
import { cn, calculateRentalDays, calculateRentalCost, createRentalCalculation, createVehicleRentalInfo, isValidRentalCalculation } from "@/lib/utils";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { VehicleCard } from "@/components/vehicles/vehicle-card";
import { MotoVehicleCard } from "@/components/vehicles/moto-vehicle-card";
import { SingleLocationModal } from "@/components/ui/single-location-modal";
import { VehiclesService, PhotosService } from "@/services";
import { Vehicle, Photo, VehicleFilters, RentalCalculation, VehicleRentalInfo } from "@/types";
import { SupabaseVehiclesService, Vehicle as SupabaseVehicle } from "@/services/supabaseVehiclesService";
import { PhotoService } from "@/services/supabase/photos";
import { useToast } from "@/hooks/use-toast";
import { saveSearchCriteria, getSearchCriteria, clearSearchCriteria, cleanupExpiredSearchCriteria, markPageRefresh } from "@/services/localStorage/searchStorage";
import { FEATURES } from "@/config/features";
import { isMoto } from "@/utils/vehicleType";
import { mapToCarVehicle, mapToMotoVehicle } from "@/mappers/vehicleMappers";


const Index = () => {
  const {
    t,
    i18n,
  } = useTranslation('common');

  const [vehicles, setVehicles] = useState<SupabaseVehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<SupabaseVehicle[]>([]);
  const [photos, setPhotos] = useState<Record<string, Photo>>({});
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [filters, setFilters] = useState<VehicleFilters>({});
  const [searchText, setSearchText] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("06:30");
  const [endTime, setEndTime] = useState("06:00");
  const [selectedFuelTypes, setSelectedFuelTypes] = useState<string[]>([]);
  const [selectedTransmissions, setSelectedTransmissions] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Variables pour le calcul de location (structure structurée)
  const [rentalCalculation, setRentalCalculation] = useState<RentalCalculation | null>(null);

  // Fonction pour mettre à jour le calcul de location
  const updateRentalCalculation = () => {
    if (startDate && endDate && startTime && endTime) {
      const calculation = createRentalCalculation(startDate, startTime, endDate, endTime);
      setRentalCalculation(calculation);
      
      console.log('📊 Calcul de location mis à jour:', {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        startTime,
        endTime,
        rentalDays: calculation.rentalDays,
        isCalculated: calculation.isCalculated,
        // Test avec différents prix
        test35eur: createVehicleRentalInfo('test_35', 35, calculation).formattedPrice,
        test50eur: createVehicleRentalInfo('test_50', 50, calculation).formattedPrice,
        test80eur: createVehicleRentalInfo('test_80', 80, calculation).formattedPrice
      });
    } else {
      setRentalCalculation(null);
    }
  };

  // Fonction pour calculer le coût total pour un véhicule spécifique
  const calculateVehicleRentalCost = (pricePerDay: number): number => {
    if (!rentalCalculation || !rentalCalculation.isCalculated) {
      return 0;
    }
    return calculateRentalCost(pricePerDay, rentalCalculation.rentalDays);
  };

  // Fonction pour formater l'affichage du prix de location
  const formatRentalPrice = (pricePerDay: number): string => {
    if (!rentalCalculation || !rentalCalculation.isCalculated) {
      return `${pricePerDay}€ par jour`;
    }
    
    const totalCost = calculateVehicleRentalCost(pricePerDay);
    const daysText = rentalCalculation.rentalDays === 1 ? 'jour' : rentalCalculation.rentalDays % 1 === 0 ? 'jours' : 'jours';
    
    return `${pricePerDay}€ par jour, soit **${totalCost}€** (${rentalCalculation.rentalDays} ${daysText})`;
  };

  // Fonction pour créer les infos de location d'un véhicule
  const getVehicleRentalInfo = (vehicleId: string, pricePerDay: number): VehicleRentalInfo => {
    if (!rentalCalculation) {
      return {
        vehicleId,
        pricePerDay,
        totalCost: 0,
        formattedPrice: `${pricePerDay}€ par jour`
      };
    }
    return createVehicleRentalInfo(vehicleId, pricePerDay, rentalCalculation);
  };

  const navigate = useNavigate();
  const { toast } = useToast();


  // Charger les véhicules depuis Supabase
  useEffect(() => {
    const loadVehicles = async () => {
      setLoading(true);
      try {
        console.log('Tentative de chargement des véhicules...');
        const data = await SupabaseVehiclesService.getAvailableVehicles();
        console.log('Véhicules chargés:', data);
        console.log('Nombre de véhicules:', data.length);
        setVehicles(data);
        setFilteredVehicles(data);
        console.log('Loading mis à false');
      } catch (error) {
        console.error('Erreur lors du chargement des véhicules:', error);
        // Note: Il faudrait importer et utiliser le toast ici
        // toast({
        //   title: "Erreur",
        //   description: "Impossible de charger les véhicules",
        //   variant: "destructive",
        // });
      } finally {
        setLoading(false);
        console.log('Loading finalement mis à false');
      }
    };

    loadVehicles();
  }, []);

  // Charger les photos principales (covers) pour les véhicules affichés
  useEffect(() => {
    let isCancelled = false;

    const loadPrimaryPhotos = async () => {
      try {
        // IDs des véhicules qui n'ont pas encore de cover en mémoire
        const vehicleIdsToFetch = vehicles
          .map((v) => v.id)
          .filter((id) => id && !photos[id]);

        if (vehicleIdsToFetch.length === 0) {
          return;
        }

        const { data, error } = await PhotoService.getPrimaryPhotosForVehicles(vehicleIdsToFetch);

        if (error) {
          console.error("Erreur lors du chargement des photos principales:", error);
          return;
        }

        if (isCancelled || !data) return;

        const mapped: Record<string, Photo> = {};

        Object.entries(data).forEach(([vehicleId, uploaded]) => {
          mapped[vehicleId] = {
            id: uploaded.id,
            vehicleId: uploaded.vehicleId,
            url: uploaded.url,
            angle: (uploaded.photoType === "frontLeft" ? "front" : "other") as any,
            position: uploaded.position ?? 1,
            isPrimary: uploaded.isPrimary,
            createdAt: new Date().toISOString(),
          };
        });

        setPhotos((prev) => ({
          ...prev,
          ...mapped,
        }));
      } catch (error) {
        console.error("Erreur inattendue lors du chargement des photos principales:", error);
      }
    };

    loadPrimaryPhotos();

    return () => {
      isCancelled = true;
    };
  }, [vehicles, photos]);

  // Restaurer les critères de recherche depuis localStorage au montage
  useEffect(() => {
    // Nettoyer les critères expirés (> 7 jours)
    cleanupExpiredSearchCriteria();
    
    // Restaurer les critères sauvegardés
    const savedCriteria = getSearchCriteria();
    if (savedCriteria) {
      console.log('🔄 [localStorage] Restauration des critères de recherche:', savedCriteria);
      
      setSearchText(savedCriteria.searchText);
      setStartDate(savedCriteria.startDate ? new Date(savedCriteria.startDate) : undefined);
      setEndDate(savedCriteria.endDate ? new Date(savedCriteria.endDate) : undefined);
      setStartTime(savedCriteria.startTime);
      setEndTime(savedCriteria.endTime);
      setSelectedFuelTypes(savedCriteria.selectedFuelTypes);
      setSelectedTransmissions(savedCriteria.selectedTransmissions);
      setSelectedCategories(savedCriteria.selectedCategories);
      
      // 🔧 NOUVEAU : Relancer automatiquement la recherche après restauration
      // Utiliser les critères sauvegardés directement au lieu des états React
      setTimeout(() => {
        console.log('🔄 [localStorage] Relance automatique de la recherche après restauration');
        
        // Vérifier que les critères sont bien présents avant de relancer
        const hasValidCriteria = savedCriteria.searchText?.trim() || 
                                 savedCriteria.startDate || 
                                 savedCriteria.endDate ||
                                 savedCriteria.selectedFuelTypes?.length > 0 ||
                                 savedCriteria.selectedTransmissions?.length > 0 ||
                                 savedCriteria.selectedCategories?.length > 0;
        
        if (hasValidCriteria) {
          console.log('✅ [localStorage] Critères valides détectés, relance de la recherche');
          console.log('🔍 [localStorage] Critères utilisés pour la relance:', savedCriteria);
          
          // Relancer la recherche directement avec les critères sauvegardés
          performSearchWithCriteria(savedCriteria);
        } else {
          console.log('⚠️ [localStorage] Aucun critère valide, pas de relance automatique');
        }
      }, 300); // Délai pour la synchronisation des états React
      
      toast({
        title: t("home.toasts.searchRestored.title", "Recherche restaurée"),
        description: t(
          "home.toasts.searchRestored.description",
          "Vos critères de recherche ont été rechargés et la recherche relancée."
        ),
      });
    }
  }, []); // Exécuter une seule fois au montage

  // Fonction pour effectuer une recherche avec des critères spécifiques
  const performSearchWithCriteria = async (criteria: any) => {
    try {
      setSearching(true);
      
      const searchFilters: any = {
        fuelTypes: criteria.selectedFuelTypes || [],
        transmissions: criteria.selectedTransmissions || [],
        categories: criteria.selectedCategories || []
      };

      // MVP: pickup disabled → do not pass location filter when feature is off
      if (FEATURES.pickupLocationEnabled && criteria.searchText?.trim()) {
        searchFilters.location = criteria.searchText.trim();
      }

      if (criteria.startDate && criteria.endDate) {
        const startDate = new Date(criteria.startDate);
        const endDate = new Date(criteria.endDate);
        searchFilters.startDate = `${format(startDate, 'yyyy-MM-dd')}T${criteria.startTime}:00.000Z`;
        searchFilters.endDate = `${format(endDate, 'yyyy-MM-dd')}T${criteria.endTime}:00.000Z`;
      }

      console.log('🔍 Recherche automatique avec filtres:', searchFilters);

      const results = await SupabaseVehiclesService.searchAvailableVehicles(searchFilters);
      
      setFilteredVehicles(results);
      
      if (results.length === 0) {
        toast({
          title: t("home.toasts.noResults.title", "Aucun résultat"),
          description: t(
            "home.toasts.noResults.description",
            "Aucun véhicule disponible pour ces critères"
          ),
        });
      } else {
        toast({
          title: t("home.toasts.searchRestored.title", "Recherche restaurée"),
          description: t("home.toasts.resultsFound", "{{count}} véhicule trouvé", {
            count: results.length,
          }),
        });
      }
    } catch (error) {
      console.error('Erreur lors de la recherche automatique:', error);
      toast({
        title: t("home.toasts.errorSearchAuto.title", "Erreur"),
        description: t(
          "home.toasts.errorSearchAuto.description",
          "Impossible d'effectuer la recherche automatique"
        ),
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async () => {
    // Validation : au moins un critère requis
    if (!searchText.trim() && !startDate && !endDate) {
      toast({
        title: t("home.toasts.requiredFields.title", "Champs requis"),
        description: t(
          "home.toasts.requiredFields.description",
          "Veuillez renseigner au moins un critère de recherche"
        ),
        variant: "destructive",
      });
      return;
    }

    // Validation : dates complètes
    if ((startDate && !endDate) || (!startDate && endDate)) {
      toast({
        title: t("home.toasts.incompleteDates.title", "Dates incomplètes"),
        description: t(
          "home.toasts.incompleteDates.description",
          "Veuillez sélectionner une date de début ET une date de fin"
        ),
        variant: "destructive",
      });
      return;
    }

    // Validation : date de début < date de fin
    if (startDate && endDate && startDate > endDate) {
      toast({
        title: t("home.toasts.invalidDates.title", "Dates invalides"),
        description: t(
          "home.toasts.invalidDates.description",
          "La date de début doit être antérieure à la date de fin"
        ),
        variant: "destructive",
      });
      return;
    }

    setSearching(true);
    try {
      const searchFilters: {
        location?: string;
        startDate?: string;
        endDate?: string;
      } = {};

      // MVP: pickup disabled → do not pass location filter when feature is off
      if (FEATURES.pickupLocationEnabled && searchText.trim()) {
        searchFilters.location = searchText.trim();
      }

      if (startDate && endDate) {
        searchFilters.startDate = `${format(startDate, 'yyyy-MM-dd')}T${startTime}:00.000Z`;
        searchFilters.endDate = `${format(endDate, 'yyyy-MM-dd')}T${endTime}:00.000Z`;
      }

      console.log('🔍 Recherche avec filtres:', searchFilters);

      const results = await SupabaseVehiclesService.searchAvailableVehicles(searchFilters);
      
      setFilteredVehicles(results);
      
      if (results.length === 0) {
        toast({
          title: t("home.toasts.noResults.title", "Aucun résultat"),
          description: t(
            "home.toasts.noResults.description",
            "Aucun véhicule disponible pour ces critères"
          ),
        });
      } else {
        toast({
          title: t("home.toasts.searchDone.title", "Recherche effectuée"),
          description: t(
            "home.toasts.resultsFound",
            "{{count}} véhicule trouvé",
            { count: results.length }
          ),
        });
      }
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      toast({
        title: t("home.toasts.errorSearch.title", "Erreur"),
        description: t(
          "home.toasts.errorSearch.description",
          "Impossible d'effectuer la recherche"
        ),
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  // Fonction pour réinitialiser tous les critères de recherche
  const handleResetSearch = () => {
    console.log("🔄 [RESET] Réinitialisation des critères de recherche");
    
    // Marquer le rafraîchissement avant de nettoyer
    markPageRefresh();
    
    // Nettoyer les critères de recherche
    clearSearchCriteria();
    console.log("🔄 [RESET] Critères de recherche nettoyés");
    
    // Réinitialiser tous les états
    setSearchText("");
    setStartDate(undefined);
    setEndDate(undefined);
    setStartTime("06:30");
    setEndTime("06:00");
    setSelectedFuelTypes([]);
    setSelectedTransmissions([]);
    setSelectedCategories([]);
    setFilteredVehicles(vehicles);
    
    console.log("🔄 [RESET] États réinitialisés");
    
    toast({
      title: t("home.toasts.criteriaReset.title", "Critères réinitialisés"),
      description: t(
        "home.toasts.criteriaReset.description",
        "Tous vos critères de recherche ont été effacés."
      ),
    });
  };


  // Vérifier si des critères de recherche sont actifs
  const hasSearchCriteria = searchText.trim() !== "" || startDate !== undefined || endDate !== undefined;

  // Debug pour voir les valeurs
  console.log('🔍 Debug recherche:', {
    searchText: searchText,
    startDate: startDate,
    endDate: endDate,
    hasSearchCriteria: hasSearchCriteria
  });

  // Debug pour voir les variables de calcul de location
  console.log('💰 Debug calcul location:', {
    rentalCalculation: rentalCalculation ? {
      rentalDays: rentalCalculation.rentalDays,
      isCalculated: rentalCalculation.isCalculated,
      calculatedAt: rentalCalculation.calculatedAt.toISOString()
    } : null,
    startTime,
    endTime,
    // Test avec un prix exemple
    examplePrice: rentalCalculation?.isCalculated ? formatRentalPrice(35) : 'Non calculé'
  });

  // Appliquer les filtres
  useEffect(() => {
    console.log('Filtrage - véhicules:', vehicles.length, 'selectedFuelTypes:', selectedFuelTypes, 'selectedTransmissions:', selectedTransmissions, 'selectedCategories:', selectedCategories);
    let filtered = [...vehicles];

    // Filtre carburant
    if (selectedFuelTypes.length > 0) {
      filtered = filtered.filter(v => 
        v.fuel_type && selectedFuelTypes.includes(v.fuel_type)
      );
    }

    // Filtre transmission
    if (selectedTransmissions.length > 0) {
      filtered = filtered.filter(v => 
        v.transmission && selectedTransmissions.includes(v.transmission)
      );
    }

    // Filtre catégorie
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(v => 
        v.vehicle_category && selectedCategories.includes(v.vehicle_category)
      );
    }

    console.log('Véhicules filtrés:', filtered.length);
    setFilteredVehicles(filtered);
  }, [vehicles, selectedFuelTypes, selectedTransmissions, selectedCategories]);

  // Calcul automatique de la location quand les dates/heures changent
  useEffect(() => {
    updateRentalCalculation();
  }, [startDate, endDate, startTime, endTime]);

  // Sauvegarder automatiquement les critères de recherche à chaque changement
  useEffect(() => {
    // Ne sauvegarder que si au moins un critère est défini
    if (searchText || startDate || endDate || selectedFuelTypes.length > 0 || selectedTransmissions.length > 0 || selectedCategories.length > 0) {
      saveSearchCriteria({
        searchText,
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null,
        startTime,
        endTime,
        selectedFuelTypes,
        selectedTransmissions,
        selectedCategories,
        // Note: Les services seront ajoutés plus tard via un système de synchronisation
        selectedServices: undefined // Pour l'instant, pas de services dans la page d'accueil
      });
    }
  }, [searchText, startDate, endDate, startTime, endTime, selectedFuelTypes, selectedTransmissions, selectedCategories]);

  const handleVehicleClick = (vehicle: SupabaseVehicle) => {
    // Utiliser la license générée temporairement pour la navigation
    const license = vehicle.id.substring(0, 8).toUpperCase();
    
    // Déterminer la route selon le type de véhicule
    const isMotoVehicle = isMoto(vehicle);
    const route = isMotoVehicle ? `/moto/${license}` : `/vehicle/${license}`;
    
    // Passer les informations de location via le state de navigation
        navigate(route, {
          state: {
            rentalCalculation: rentalCalculation || undefined,
            startDate: startDate?.toISOString(),
            endDate: endDate?.toISOString(),
            startTime,
            endTime,
            // MVP: pickup disabled → only propagate pickupLocation when feature is active
            pickupLocation: FEATURES.pickupLocationEnabled ? (searchText || undefined) : undefined,
          }
        });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-soft">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-lagoon text-white py-16 lg:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white">
              {t(
                "home.heroTitle",
                "Louez votre scooter à Nosy Be en quelques clics"
              )}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto font-medium">
              {t(
                "home.heroSubtitle",
                "RENTANOO, la première plateforme de location de scooters 100 % en ligne"
              )}
            </p>
            
            {/* 🎨 Nouvelle SearchBar style Airbnb */}
            <SearchBarAirbnb
              searchText={searchText}
              onSearchTextChange={setSearchText}
              startDate={startDate || null}
              endDate={endDate || null}
              onStartDateChange={(date) => setStartDate(date || undefined)}
              onEndDateChange={(date) => setEndDate(date || undefined)}
              startTime={startTime}
              endTime={endTime}
              onStartTimeChange={setStartTime}
              onEndTimeChange={setEndTime}
              onSearch={handleSearch}
              searching={searching}
              onResetSearch={handleResetSearch}
            />
          </div>
        </section>

        {/* Filters & Results */}
        <section className="py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Filters */}
            <div className="mb-8">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{t('common.filtres')}</span>
                </div>
                
                <Select
                  value={selectedFuelTypes[0] || ""}
                  onValueChange={(value) => 
                    setSelectedFuelTypes(value ? [value] : [])
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Carburant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gasoline">{t('common.essence')}</SelectItem>
                    <SelectItem value="diesel">{t('common.diesel')}</SelectItem>
                    <SelectItem value="electric">{t('common.lectrique')}</SelectItem>
                    <SelectItem value="hybrid">{t('common.hybride')}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={selectedTransmissions[0] || ""}
                  onValueChange={(value) => 
                    setSelectedTransmissions(value ? [value] : [])
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Transmission" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">{t('common.manuelle')}</SelectItem>
                    <SelectItem value="automatic">{t('common.automatique')}</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={selectedCategories[0] || ""}
                  onValueChange={(value) => 
                    setSelectedCategories(value ? [value] : [])
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Berline">{t('common.berline')}</SelectItem>
                    <SelectItem value="Break (SW)">{t('common.break_sw')}</SelectItem>
                    <SelectItem value="Cabriolet">{t('common.cabriolet')}</SelectItem>
                    <SelectItem value="Citadine">{t('common.citadine')}</SelectItem>
                    <SelectItem value="Coupé">{t('common.coup')}</SelectItem>
                    <SelectItem value="Coupé 4 portes / GT">Coupé 4 portes / GT</SelectItem>
                    <SelectItem value="Crossover">{t('common.crossover')}</SelectItem>
                    <SelectItem value="Minibus">{t('common.minibus')}</SelectItem>
                    <SelectItem value="Monospace">{t('common.monospace')}</SelectItem>
                    <SelectItem value="Pick-up">{t('common.pickup')}</SelectItem>
                    <SelectItem value="Roadster">{t('common.roadster')}</SelectItem>
                    <SelectItem value="SUV">{t('common.suv')}</SelectItem>
                    <SelectItem value="Supercar / Hypercar">Supercar / Hypercar</SelectItem>
                  </SelectContent>
                </Select>

                {(selectedFuelTypes.length > 0 || selectedTransmissions.length > 0 || selectedCategories.length > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFuelTypes([]);
                      setSelectedTransmissions([]);
                      setSelectedCategories([]);
                    }}
                  >{t('common.rinitialiser')}</Button>
                )}
              </div>
            </div>

            {/* Results */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-foreground">{t('common.vhicules_disponibles')}</h2>
                <p className="text-muted-foreground">
                  {filteredVehicles.length} véhicule{filteredVehicles.length > 1 ? 's' : ''} trouvé{filteredVehicles.length > 1 ? 's' : ''}
                </p>
              </div>
              {console.log('Rendu - loading:', loading, 'filteredVehicles:', filteredVehicles.length)}

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="aspect-[4/3] bg-muted" />
                      <CardContent className="p-4">
                        <div className="h-4 bg-muted rounded mb-2" />
                        <div className="h-3 bg-muted rounded mb-4 w-2/3" />
                        <div className="flex gap-2 mb-4">
                          <div className="h-6 bg-muted rounded-full w-16" />
                          <div className="h-6 bg-muted rounded-full w-16" />
                        </div>
                        <div className="h-8 bg-muted rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : !loading && filteredVehicles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVehicles.map((vehicle) => {
                    // Calculer les informations de location pour ce véhicule
                    const vehicleRentalInfo = rentalCalculation 
                      ? getVehicleRentalInfo(vehicle.id, vehicle.price_per_day)
                      : undefined;

                    const isMotoVehicle = isMoto(vehicle);
                    const mappedVehicle: Vehicle = isMotoVehicle
                      ? mapToMotoVehicle(vehicle)
                      : mapToCarVehicle(vehicle);

                    return isMotoVehicle ? (
                      <MotoVehicleCard
                        key={vehicle.id}
                        vehicle={mappedVehicle}
                        primaryPhoto={photos[vehicle.id] ?? null}
                        rentalInfo={vehicleRentalInfo}
                        onClick={() => handleVehicleClick(vehicle)}
                        index={filteredVehicles.indexOf(vehicle)}
                      />
                    ) : (
                      <VehicleCard
                        key={vehicle.id}
                        vehicle={mappedVehicle}
                        primaryPhoto={photos[vehicle.id] ?? null}
                        rentalInfo={vehicleRentalInfo}
                        onClick={() => handleVehicleClick(vehicle)}
                        index={filteredVehicles.indexOf(vehicle)}
                      />
                    );
                  })}
                </div>
              ) : !loading ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    {filteredVehicles.length === 0 && vehicles.length > 0 
                      ? "Aucun véhicule ne correspond à vos critères."
                      : t('common.aucun_vhicule_disponible_pour_le_moment', 'Aucun véhicule disponible pour le moment.')}
                  </p>
                  {filteredVehicles.length === 0 && vehicles.length > 0 ? (
                    <Button variant="outline" onClick={() => {
                      setSelectedFuelTypes([]);
                      setSelectedTransmissions([]);
                    }}>{t('common.rinitialiser_les_filtres')}</Button>
                  ) : (
                    <Button variant="outline" onClick={() => window.location.reload()}>{t('common.actualiser_la_page')}</Button>
                  )}
                </Card>
              ) : null}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
