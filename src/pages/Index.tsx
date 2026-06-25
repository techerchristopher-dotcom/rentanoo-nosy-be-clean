import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import { SearchBarAirbnb } from "@/components/ui/search-bar-airbnb";
import { Button } from "@/components/ui/button";
import { calculateRentalCost, createRentalCalculation, createVehicleRentalInfo } from "@/lib/utils";
import { VehicleFilters, RentalCalculation, VehicleRentalInfo } from "@/types";
import { SupabaseVehiclesService, Vehicle as SupabaseVehicle } from "@/services/supabaseVehiclesService";
import { trackMetaSearchInitiateCheckout } from "@/lib/metaPixel";

const Footer = lazy(() => import("@/components/layout/footer").then((m) => ({ default: m.Footer })));
const HomeResults = lazy(() => import("@/components/home/HomeResults").then((m) => ({ default: m.HomeResults })));
import { HomeBlogPreview } from "@/components/home/HomeBlogPreview";
import { useToast } from "@/hooks/use-toast";
import { saveSearchCriteria, getSearchCriteria, clearSearchCriteria, cleanupExpiredSearchCriteria, markPageRefresh } from "@/services/localStorage/searchStorage";
import { FEATURES } from "@/config/features";
import { getPublicListingPath } from "@/utils/vehicleType";
import { getHomeToastKeys } from "@/utils/listingTerminology";
import { applyExplorerFilters } from "@/utils/explorerFilterUtils";
import type { ExplorerMainCategoryId } from "@/data/explorerFilterConfig";
import { isExplorerMainCategoryId } from "@/utils/explorerFilterUtils";
import { Seo } from "@/components/seo/Seo";
import { HomeDayContextStrip } from "@/components/home/HomeDayContextStrip";
import { HomeHeroTrustStrip } from "@/components/home/HomeHeroTrustStrip";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import {
  isFilterableVehicleType,
  useCategoryShowcase,
  type FilterableVehicleType,
} from "@/hooks/useCategoryShowcase";


const Index = () => {
  const {
    t,
    i18n,
  } = useTranslation('common');
  const { formatClientInline } = useExchangeRate();

  const [vehicles, setVehicles] = useState<SupabaseVehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<SupabaseVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [filters, setFilters] = useState<VehicleFilters>({});
  const [searchText, setSearchText] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startTime, setStartTime] = useState("06:30");
  const [endTime, setEndTime] = useState("06:00");
  const [selectedMainCategory, setSelectedMainCategory] =
    useState<ExplorerMainCategoryId | null>(null);
  const [selectedSubFilter, setSelectedSubFilter] = useState<string | null>(
    null
  );
  const [showResults, setShowResults] = useState(false);
  const shouldScrollToResultsRef = useRef(false);
  const pendingCatalogScrollRef = useRef(false);
  const selectedMainCategoryRef = useRef<ExplorerMainCategoryId | null>(null);
  const selectedSubFilterRef = useRef<string | null>(null);

  const scrollToResults = useCallback(() => {
    requestAnimationFrame(() => {
      document.getElementById("search-results")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  const requestCatalogScroll = useCallback(() => {
    setShowResults(true);
    pendingCatalogScrollRef.current = true;
  }, []);

  const applyCategoryFilter = useCallback((type: FilterableVehicleType) => {
    setSelectedMainCategory(type);
    setSelectedSubFilter(null);
    requestCatalogScroll();
  }, [requestCatalogScroll]);

  const handleCatalogCtaClick = useCallback(() => {
    requestCatalogScroll();
  }, [requestCatalogScroll]);

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
      return `${formatClientInline(pricePerDay)} par jour`;
    }
    
    const totalCost = calculateVehicleRentalCost(pricePerDay);
    const daysText = rentalCalculation.rentalDays === 1 ? 'jour' : rentalCalculation.rentalDays % 1 === 0 ? 'jours' : 'jours';
    
    return `${formatClientInline(pricePerDay)} par jour, soit **${formatClientInline(totalCost)}** (${rentalCalculation.rentalDays} ${daysText})`;
  };

  // Fonction pour créer les infos de location d'un véhicule
  const getVehicleRentalInfo = (vehicleId: string, pricePerDay: number): VehicleRentalInfo => {
    if (!rentalCalculation) {
      return {
        vehicleId,
        pricePerDay,
        totalCost: 0,
        formattedPrice: `${formatClientInline(pricePerDay)} par jour`
      };
    }
    return createVehicleRentalInfo(vehicleId, pricePerDay, rentalCalculation);
  };

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const {
    registerHomeCatalogHandlers,
    unregisterHomeCatalogHandlers,
  } = useCategoryShowcase();

  const minPricePerDay = useMemo(() => {
    if (vehicles.length === 0) return null;
    return Math.min(...vehicles.map((v) => v.price_per_day));
  }, [vehicles]);

  const minPriceLabel =
    minPricePerDay != null ? formatClientInline(minPricePerDay) : null;

  const showCatalogUi = !loading && vehicles.length > 0;

  // Scroll vers le catalogue quand on arrive avec #search-results (ex: CTA depuis le blog)
  useEffect(() => {
    if (location.hash !== "#search-results") return;
    if (!showCatalogUi) return;
    const id = window.setTimeout(() => {
      document.getElementById("search-results")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);
    return () => window.clearTimeout(id);
  }, [location.hash, showCatalogUi]);

  useEffect(() => {
    selectedMainCategoryRef.current = selectedMainCategory;
    selectedSubFilterRef.current = selectedSubFilter;
  }, [selectedMainCategory, selectedSubFilter]);

  useEffect(() => {
    registerHomeCatalogHandlers({ applyCategoryFilter });
    return () => unregisterHomeCatalogHandlers();
  }, [
    registerHomeCatalogHandlers,
    unregisterHomeCatalogHandlers,
    applyCategoryFilter,
  ]);

  useEffect(() => {
    const state = location.state as {
      categoryFilter?: string;
      scrollCatalog?: boolean;
    } | null;

    if (!state?.categoryFilter || !isFilterableVehicleType(state.categoryFilter)) {
      return;
    }

    applyCategoryFilter(state.categoryFilter);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate, applyCategoryFilter]);

  useEffect(() => {
    if (!pendingCatalogScrollRef.current || !showResults || loading) return;

    pendingCatalogScrollRef.current = false;
    const timer = setTimeout(scrollToResults, 100);
    return () => clearTimeout(timer);
  }, [filteredVehicles, showResults, loading, scrollToResults]);

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

  // LCP: laisser le hero (H1 + SearchBar) peindre avant la grille
  useEffect(() => {
    const raf = requestAnimationFrame(() => setShowResults(true));
    const t = setTimeout(() => setShowResults(true), 200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!searching && shouldScrollToResultsRef.current) {
      shouldScrollToResultsRef.current = false;
      const timer = setTimeout(scrollToResults, 150);
      return () => clearTimeout(timer);
    }
  }, [searching, filteredVehicles]);

  // Pré-remplir depuis les query params (?cat=&start=&end=) — ex: redirection
  // depuis la modale panier "Continuer mes recherches". Priorité sur localStorage.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get("cat");
    const start = params.get("start");
    const end = params.get("end");

    if (!cat && !start && !end) return;

    if (cat && isExplorerMainCategoryId(cat)) {
      setSelectedMainCategory(cat);
    }
    if (start) setStartDate(new Date(start));
    if (end) setEndDate(new Date(end));

    requestCatalogScroll();

    if (start && end) {
      const catId = cat && isExplorerMainCategoryId(cat) ? cat : null;
      setTimeout(async () => {
        await performSearchWithCriteria({
          searchText: "",
          startDate: start,
          endDate: end,
          startTime: "06:30",
          endTime: "06:00",
          selectedMainCategory: catId,
          selectedSubFilter: null,
          selectedVehicleTypes: [],
        });
        if (catId) {
          // Wait for React to commit the state update to the DOM before scrolling
          setTimeout(() => {
            (document.getElementById(`section-${catId}`) ??
              document.getElementById("search-results"))
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 150);
        }
      }, 300);
    }
  }, []); // Exécuter une seule fois au montage

  // Restaurer les critères de recherche depuis localStorage au montage
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("cat") || params.get("start") || params.get("end")) return;

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
      setSelectedMainCategory(
        isExplorerMainCategoryId(savedCriteria.selectedMainCategory ?? "")
          ? savedCriteria.selectedMainCategory
          : isExplorerMainCategoryId(
                savedCriteria.selectedVehicleTypes?.[0] ?? ""
              )
            ? (savedCriteria.selectedVehicleTypes![0] as ExplorerMainCategoryId)
            : null
      );
      setSelectedSubFilter(savedCriteria.selectedSubFilter ?? null);
      
      requestCatalogScroll();

      // Relancer automatiquement la recherche après restauration, puis scroller
      // vers la section catégorie (même comportement que la navigation ?cat=...)
      const savedCatId = isExplorerMainCategoryId(savedCriteria.selectedMainCategory ?? "")
        ? savedCriteria.selectedMainCategory as ExplorerMainCategoryId
        : null;

      setTimeout(async () => {
        const hasValidCriteria = savedCriteria.searchText?.trim() ||
                                 savedCriteria.startDate ||
                                 savedCriteria.endDate ||
                                 savedCriteria.selectedMainCategory ||
                                 savedCriteria.selectedSubFilter ||
                                 (savedCriteria.selectedVehicleTypes?.length ?? 0) > 0;

        if (hasValidCriteria) {
          await performSearchWithCriteria(savedCriteria);
          // Scroll vers la section catégorie après chargement des données
          setTimeout(() => {
            (savedCatId
              ? (document.getElementById(`section-${savedCatId}`) ?? document.getElementById("search-results"))
              : document.getElementById("search-results"))
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 150);
        }
      }, 300);
      
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
      
      const searchFilters: {
        location?: string;
        startDate?: string;
        endDate?: string;
      } = {};

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

      const restoredMain = isExplorerMainCategoryId(
        criteria.selectedMainCategory ?? criteria.selectedVehicleTypes?.[0] ?? ""
      )
        ? (criteria.selectedMainCategory ??
            criteria.selectedVehicleTypes?.[0])
        : null;

      setFilteredVehicles(
        applyExplorerFilters(
          results,
          (selectedMainCategoryRef.current ??
            restoredMain) as ExplorerMainCategoryId | null,
          selectedSubFilterRef.current ?? criteria.selectedSubFilter ?? null
        )
      );
      
      if (results.length === 0) {
        const toastKeys = getHomeToastKeys(
          criteria.selectedMainCategory ??
            criteria.selectedVehicleTypes?.[0] ??
            undefined
        );
        toast({
          title: t("home.toasts.noResults.title", "Aucun résultat"),
          description: t(toastKeys.noResultsDescription),
        });
      } else {
        const toastKeys = getHomeToastKeys(
          criteria.selectedMainCategory ??
            criteria.selectedVehicleTypes?.[0] ??
            undefined
        );
        toast({
          title: t("home.toasts.searchRestored.title", "Recherche restaurée"),
          description: t(toastKeys.resultsFound, { count: results.length }),
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

    trackMetaSearchInitiateCheckout({ value: 0, currency: "EUR" });

    shouldScrollToResultsRef.current = true;
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
      
      setFilteredVehicles(
        applyExplorerFilters(
          results,
          isExplorerMainCategoryId(selectedMainCategory ?? "")
            ? selectedMainCategory
            : null,
          selectedSubFilter
        )
      );
      
      if (results.length === 0) {
        const toastKeys = getHomeToastKeys(selectedMainCategory ?? undefined);
        toast({
          title: t("home.toasts.noResults.title", "Aucun résultat"),
          description: t(toastKeys.noResultsDescription),
        });
      } else {
        const toastKeys = getHomeToastKeys(selectedMainCategory ?? undefined);
        toast({
          title: t("home.toasts.searchDone.title", "Recherche effectuée"),
          description: t(toastKeys.resultsFound, { count: results.length }),
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
    setSelectedMainCategory(null);
    setSelectedSubFilter(null);
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

  // Appliquer les filtres Explorer sur le catalogue
  useEffect(() => {
    setFilteredVehicles(
      applyExplorerFilters(vehicles, selectedMainCategory, selectedSubFilter)
    );
  }, [vehicles, selectedMainCategory, selectedSubFilter]);

  // Calcul automatique de la location quand les dates/heures changent
  useEffect(() => {
    updateRentalCalculation();
  }, [startDate, endDate, startTime, endTime]);

  // Sauvegarder automatiquement les critères de recherche à chaque changement
  useEffect(() => {
    // Ne sauvegarder que si au moins un critère est défini
    if (
      searchText ||
      startDate ||
      endDate ||
      selectedMainCategory ||
      selectedSubFilter
    ) {
      saveSearchCriteria({
        searchText,
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null,
        startTime,
        endTime,
        selectedMainCategory,
        selectedSubFilter,
        selectedServices: undefined
      });
    }
  }, [
    searchText,
    startDate,
    endDate,
    startTime,
    endTime,
    selectedMainCategory,
    selectedSubFilter,
  ]);

  const handleMainCategoryChange = useCallback(
    (category: ExplorerMainCategoryId | null) => {
      setSelectedMainCategory(category);
      setSelectedSubFilter(null);
      if (category !== null) {
        scrollToResults();
      }
    },
    [scrollToResults]
  );

  const handleResetExplorerFilters = useCallback(() => {
    setSelectedMainCategory(null);
    setSelectedSubFilter(null);
    setFilteredVehicles(applyExplorerFilters(vehicles, null, null));
  }, [vehicles]);

  const handleVehicleClick = (vehicle: SupabaseVehicle) => {
    const route = getPublicListingPath(vehicle);
    
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
      <Seo
        title={t("seo.home.title")}
        description={t("seo.home.description")}
        canonical="https://rentanoo.com"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "Rentanoo",
          url: "https://rentanoo.com",
          image: "https://rentanoo.com/og-rentanoo-nosy-be.webp",
          description:
            "Location scooter, moto et hébergement à Nosy Be. Livraison à l'aéroport ou à l'hôtel. Réservation en ligne.",
          areaServed: {
            "@type": "Place",
            name: "Nosy Be, Madagascar",
          },
        }}
      />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-lagoon bg-[length:200%_200%] animate-gradient-shift text-white py-16 lg:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-white animate-fade-up [animation-delay:0ms]">
              {t(
                "home.heroTitle",
                "Louez votre scooter à Nosy Be en quelques clics"
              )}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto font-medium animate-fade-up [animation-delay:120ms]">
              {t(
                "home.heroSubtitle",
                "RENTANOO, la première plateforme de location de scooters 100 % en ligne"
              )}
            </p>

            {showCatalogUi ? (
              <div className="animate-fade-up [animation-delay:220ms]">
                <HomeHeroTrustStrip
                  vehicleCount={vehicles.length}
                  minPriceLabel={minPriceLabel}
                />
              </div>
            ) : null}

            <div className="animate-fade-up [animation-delay:280ms]">
              <HomeDayContextStrip variant="hero" />
            </div>

            {/* 🎨 Nouvelle SearchBar style Airbnb */}
            <div className="animate-fade-up [animation-delay:340ms]">
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

          </div>
        </section>

        {/* Filters & Results — lazy + rendu différé pour LCP (H1 prioritaire) */}
        {!showResults ? (
          <div id="search-results" className="min-h-[400px] scroll-mt-4" aria-hidden="true" />
        ) : (
          <Suspense fallback={<div id="search-results" className="min-h-[400px] scroll-mt-4" />}>
            <HomeResults
              filteredVehicles={filteredVehicles}
              loading={loading}
              vehicles={vehicles}
              selectedMainCategory={selectedMainCategory}
              selectedSubFilter={selectedSubFilter}
              onMainCategoryChange={handleMainCategoryChange}
              onSubFilterChange={setSelectedSubFilter}
              onResetFilters={handleResetExplorerFilters}
              rentalCalculation={rentalCalculation}
              getVehicleRentalInfo={getVehicleRentalInfo}
              onVehicleClick={handleVehicleClick}
              deferImages={true}
            />
          </Suspense>
        )}

        {/* Bloc texte SEO — location scooter Nosy Be, livraison, assurance */}
        <section className="py-10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-xl font-semibold text-foreground mb-3">
                {t("home.seoBlockTitle")}
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed">
                {t("home.seoBlock")}
              </p>
            </div>
          </div>
        </section>

        {/* Blog preview — 3 derniers articles */}
        <HomeBlogPreview />
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
