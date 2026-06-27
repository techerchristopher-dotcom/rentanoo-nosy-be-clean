import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import type { Locale } from "date-fns";
import { CartAddModal, type CartAddParams } from "@/components/booking/CartAddModal";

const getDateLocale = (lang: string): Promise<Locale> => {
  if (lang.startsWith("fr")) return import("date-fns/locale/fr").then((m) => m.fr);
  if (lang.startsWith("it")) return import("date-fns/locale/it").then((m) => m.it);
  if (lang.startsWith("de")) return import("date-fns/locale/de").then((m) => m.de);
  return import("date-fns/locale/en-US").then((m) => m.enUS);
};
import { 
  Car, 
  Fuel, 
  Settings, 
  MapPin, 
  Users,
  ArrowLeft,
  Star,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  Phone,
  CheckCircle,
  MessageSquare,
  Plane,
  Ship,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Footer } from "@/components/layout/footer";
import { MultiVehicleModal } from "@/components/vehicles/MultiVehicleModal";
import { BookingConfirmationModal } from "@/components/booking/BookingConfirmationModal";
import { ComplementaryServicesModal } from "@/components/booking/ComplementaryServicesModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LazyPhoneInput } from "@/components/ui/lazy-phone-input";
import { Loader2 } from "lucide-react";
import { VehiclesService, PhotosService } from "@/services";
import {
  SupabaseBookingsService,
  type BookingPaymentMethod,
} from "@/services/supabase/bookings";
import { supabase } from "@/integrations/supabase/client";
import { ANALYTICS_BOOKING_CURRENCY, trackGa4Event } from "@/lib/analytics";
import { trackMetaLead } from "@/lib/metaPixel";
import { ProfileService } from "@/services/supabase/profile";
import { Photo, User, RentalCalculation, VehicleRentalInfo, Vehicle as AppVehicle } from "@/types";
import { Vehicle } from "@/services/supabaseVehiclesService";
import { createVehicleRentalInfo, createRentalCalculation } from "@/lib/utils";
import { getBookingRentalPricing } from "@/utils/rentalPriceFromDates";
import { formatLegacyFormattedPrice } from "@/utils/formatLegacyFormattedPrice";
import { formatCurrency } from "@/utils/currency";
import { DualPrice } from "@/components/currency/DualPrice";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { createBookingDraft, getBookingDraft, clearBookingDraft, saveBookingDraft, finalizeBookingDraftForCheckout } from "@/services/localStorage/bookingStorage";
import { shouldShowComplementaryServicesModal } from "@/utils/bookingUpsell";
import { requiresHotelName } from "@/utils/bookingLocations";
import {
  saveBookingResumeIntent,
  loadBookingResumeIntent,
  clearBookingResumeIntent,
  intentMatchesPath,
  buildNavStateFromIntent,
  type VehicleNavState,
} from "@/lib/bookingResumeIntent";
import {
  trackViewItem,
  trackBeginCheckout,
  trackBookingBlocked,
} from "@/lib/bookingFunnelAnalytics";
import { SupabaseVehiclesService } from "@/services/supabaseVehiclesService";
import { PhotoService } from "@/services/supabase/photos";
import VehicleOwnerCard from "@/components/VehicleOwnerCard";
import { VehicleServiceOptions } from "@/components/vehicles/VehicleServiceOptions";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { useWhatsAppContact } from "@/contexts/WhatsAppContactContext";
import { trackWhatsAppFabEvent } from "@/lib/whatsappAnalytics";
import { ShoppingCart } from "lucide-react";
import { flyToCart } from "@/utils/cartFlyAnimation";
import { 
  getOptimizedImageUrl, 
  generateSrcSet, 
  IMAGE_SIZES, 
  IMAGE_WIDTHS 
} from "@/utils/imageOptimization";
import { Seo } from "@/components/seo/Seo";
import {
  buildVehicleSeoTitle,
  buildVehicleSeoDescription,
  buildVehicleCanonical,
  buildVehicleH1Title,
  getVehicleTypeLabel,
  getLocationArticle,
  buildVehicleBreadcrumbSchema,
} from "@/utils/vehicleSeo";
import { buildVehicleProductSchema } from "@/utils/vehicleSchema";
import { ShareButton } from "@/components/shared/ShareButton";
import { TranslatableDescription } from "@/components/shared/TranslatableDescription";
import { isMoto, isAccommodation } from "@/utils/vehicleType";
import { getCarEquipmentItems, mapSupabaseEquipment } from "@/utils/vehicleEquipment";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Fonction pour obtenir l'icône appropriée selon la zone
const getLocationIcon = (zone: string) => {
  switch (zone) {
    case "Aéroport":
      return Plane;
    case "Barge Petite Terre":
    case "Barge Grande Terre":
      return Ship;
    default:
      return MapPin;
  }
};

export default function VehicleDetails() {
  console.log('🎯 [DEBUG] VehicleDetails component rendering');
  
  const { license } = useParams<{ license: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { addItem: addToCart, updateItem: updateCartItem, isFull: isCartFull, openAddedModal } = useCart();
  const { waUrl: whatsappBaseUrl } = useWhatsAppContact();
  const { t, i18n } = useTranslation("common");
  const { footnote, formatClient, formatClientInline } = useExchangeRate();

  const fuelLabels = {
    gasoline: t("vehicle.fuel.gasoline"),
    diesel: t("vehicle.fuel.diesel"),
    electric: t("vehicle.fuel.electric"),
    hybrid: t("vehicle.fuel.hybrid"),
  };

  const transmissionLabels = {
    manual: t("vehicle.transmission.manual"),
    automatic: t("vehicle.transmission.automatic"),
  };
  
  console.log('🎯 [DEBUG] License from useParams:', license);
  console.log('🎯 [DEBUG] Navigate function:', typeof navigate);
  console.log('🎯 [DEBUG] Location state:', location.state);
  
  const [vehicle, setVehicle] = useState<AppVehicle | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [vehiclePhotos, setVehiclePhotos] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMultiVehicleModal, setShowMultiVehicleModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showComplementaryModal, setShowComplementaryModal] = useState(false);
  const [showPhoneRequiredModal, setShowPhoneRequiredModal] = useState(false);
  type PhoneGateSource = "booking_start" | "booking_confirmation";
  const [phoneGateSource, setPhoneGateSource] = useState<PhoneGateSource | null>(
    null
  );

  const hideMobileBookingBar =
    showConfirmationModal || showComplementaryModal || showPhoneRequiredModal;
  const [phoneReturnTo, setPhoneReturnTo] = useState<string>("");
  const [phone, setPhone] = useState<string | undefined>('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [expandedSections, setExpandedSections] = useState({
    owner: true,
    technical: true,
    options: true,
    reviews: true,
    insurance: true,
    benefits: true,
    legal: false
  });
  const [restoredNavState, setRestoredNavState] = useState<VehicleNavState>(null);
  const [manualNavState, setManualNavState] = useState<VehicleNavState>(null);
  const [isCartAddModalOpen, setIsCartAddModalOpen] = useState(false);
  const pendingOriginEl = useRef<HTMLElement | null>(null);
  // Tracks the cart item ID added during this page visit — enables date update (vs new add) when user re-validates dates
  const [lastAddedCartItemId, setLastAddedCartItemId] = useState<string | null>(null);
  const [dateLocale, setDateLocale] = useState<Locale | null>(null);
  const viewItemSentRef = useRef(false);

  useEffect(() => {
    getDateLocale(i18n.language).then(setDateLocale);
  }, [i18n.language]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [license]);

  useEffect(() => {
    const routerState = location.state as VehicleNavState | null;
    if (routerState?.rentalCalculation) {
      setRestoredNavState(null);
      setManualNavState(null);
      return;
    }
    if (!license) return;

    const currentPath = `/vehicle/${license}`;
    const intent = loadBookingResumeIntent();
    if (!intent || !intentMatchesPath(intent, currentPath)) return;

    const rebuilt = buildNavStateFromIntent(intent);
    if (rebuilt) setRestoredNavState(rebuilt);
  }, [license, location.state]);

  useEffect(() => {
    if (loading || !vehicle || viewItemSentRef.current) return;
    viewItemSentRef.current = true;

    const routerState = location.state as VehicleNavState | null;
    const effectiveNav = routerState?.rentalCalculation
      ? routerState
      : restoredNavState ?? routerState;

    trackViewItem({
      itemId: vehicle.id,
      itemName: `${vehicle.brand} ${vehicle.model}`,
      itemCategory: vehicle.vehicleType ?? "car",
      itemVariant: license,
      price: vehicle.dailyPrice,
      hasDates: Boolean(effectiveNav?.rentalCalculation),
      rentalDays: effectiveNav?.rentalCalculation?.rentalDays,
    });
  }, [loading, vehicle?.id, license]);

  useEffect(() => {
    console.log('🚀 [DEBUG] VehicleDetails useEffect triggered');
    console.log('🚀 [DEBUG] License param:', license);
    console.log('🚀 [DEBUG] Current URL:', window.location.href);
    loadVehicleData();
    loadCurrentUser();
  }, [license]);

  const loadCurrentUser = async () => {
    console.log('🔍 [DEBUG] Chargement de l\'utilisateur actuel...');
    try {
      const result = await ProfileService.getCurrentUserProfile();
      console.log('📊 [DEBUG] Résultat ProfileService:', result);
      console.log('👤 [DEBUG] Données utilisateur:', result.data);
      console.log('❌ [DEBUG] Erreur ProfileService:', result.error);
      
      if (result.error) {
        console.error('❌ [DEBUG] ProfileService a retourné une erreur:', result.error);
        setCurrentUser(null);
      } else {
        console.log('✅ [DEBUG] Utilisateur chargé avec succès');
        setCurrentUser(result.data);
      }
    } catch (error) {
      console.error('❌ [DEBUG] Erreur lors du chargement de l\'utilisateur:', error);
      setCurrentUser(null);
    }
  };

  const loadVehicleData = async () => {
    if (!license) return;
    
    try {
      setLoading(true);
      
             // Charger uniquement ce véhicule (requête ciblée par préfixe d'ID, pas tout le catalogue)
             const { data: vehicle } = await SupabaseVehiclesService.getVehicleByShortId(license);
      
      if (vehicle) {
        if (isAccommodation(vehicle)) {
          navigate(`/hebergement/${license}`, { replace: true, state: location.state });
          return;
        }
        if (isMoto(vehicle)) {
          navigate(`/moto/${license}`, { replace: true, state: location.state });
          return;
        }

        // Convertir le véhicule Supabase vers l'interface Vehicle attendue
        const mappedVehicle: AppVehicle = {
          id: vehicle.id,
          ownerId: vehicle.owner_id || "",
          license: license,
          brand: vehicle.brand,
          model: vehicle.model,
          color: vehicle.color || "Non spécifié",
          fuel: (vehicle.fuel_type as any) || "gasoline",
          year: vehicle.year,
          ...mapSupabaseEquipment(vehicle),
          doors: vehicle.seats || 5,
          transmission: (vehicle.transmission as any) || "manual",
          mileage: vehicle.mileage || 0,
          dailyPrice: vehicle.price_per_day,
          currency: "EUR",
          latitude: 0, // À ajouter dans la DB plus tard
          longitude: 0, // À ajouter dans la DB plus tard
          status: "available" as any,
          description: vehicle.description || undefined, // Description du véhicule
          engineCapacity: vehicle.engine_capacity || undefined,
          vehicleType: (vehicle.vehicle_type as 'car' | 'moto' | 'scooter') || 'car',
          location: vehicle.pickup_zones && vehicle.pickup_zones.length > 0 
            ? vehicle.pickup_zones.join(', ') 
            : "Nosy Be, Madagascar", // Utiliser les zones de prise en charge
          
          // 🆕 Services supplémentaires - MAPPING COMPLET
          // 🛩️ Services Aéroport
          airport_pickup_service: vehicle.airport_pickup_service || false,
          airport_pickup_retrieval: vehicle.airport_pickup_retrieval || false,
          airport_pickup_retrieval_free: vehicle.airport_pickup_retrieval_free || false,
          airport_pickup_retrieval_price: vehicle.airport_pickup_retrieval_price || 0,
          airport_pickup_return: vehicle.airport_pickup_return || false,
          airport_pickup_return_free: vehicle.airport_pickup_return_free || false,
          airport_pickup_return_price: vehicle.airport_pickup_return_price || 0,
          
          // 🚢 Services Barge Petite Terre
          barge_petite_terre_service: vehicle.barge_petite_terre_service || false,
          barge_petite_terre_retrieval: vehicle.barge_petite_terre_retrieval || false,
          barge_petite_terre_retrieval_free: vehicle.barge_petite_terre_retrieval_free || false,
          barge_petite_terre_retrieval_price: vehicle.barge_petite_terre_retrieval_price || 0,
          barge_petite_terre_return: vehicle.barge_petite_terre_return || false,
          barge_petite_terre_return_free: vehicle.barge_petite_terre_return_free || false,
          barge_petite_terre_return_price: vehicle.barge_petite_terre_return_price || 0,
          
          // 🚢 Services Barge Grande Terre
          barge_grande_terre_service: vehicle.barge_grande_terre_service || false,
          barge_grande_terre_retrieval: vehicle.barge_grande_terre_retrieval || false,
          barge_grande_terre_retrieval_free: vehicle.barge_grande_terre_retrieval_free || false,
          barge_grande_terre_retrieval_price: vehicle.barge_grande_terre_retrieval_price || 0,
          barge_grande_terre_return: vehicle.barge_grande_terre_return || false,
          barge_grande_terre_return_free: vehicle.barge_grande_terre_return_free || false,
          barge_grande_terre_return_price: vehicle.barge_grande_terre_return_price || 0,
          
          // 🚚 Services Livraison à domicile
          home_delivery_service: vehicle.home_delivery_service || false,
          home_delivery_pickup: vehicle.home_delivery_pickup || false,
          home_delivery_pickup_free: vehicle.home_delivery_pickup_free || false,
          home_delivery_pickup_price: vehicle.home_delivery_pickup_price || 0,
          home_delivery_return: vehicle.home_delivery_return || false,
          home_delivery_return_free: vehicle.home_delivery_return_free || false,
          home_delivery_return_price: vehicle.home_delivery_return_price || 0,
          
          // 👶 Services Siège bébé
          baby_seat_service: vehicle.baby_seat_service || false,
          baby_seat_free: vehicle.baby_seat_free || false,
          baby_seat_price: vehicle.baby_seat_price || 0,
          
          // 👨‍✈️ Services Conducteur additionnel
          additional_driver_service: vehicle.additional_driver_service || false,
          additional_driver_free: vehicle.additional_driver_free || false,
          additional_driver_price: vehicle.additional_driver_price || 0,
          
          createdAt: vehicle.created_at || new Date().toISOString(),
          updatedAt: vehicle.updated_at || new Date().toISOString(),
        };
        
        // 🧪 DEBUG: Vérifier le mapping des services
        console.log('🔧 [VehicleDetails] Véhicule Supabase original:', vehicle);
        console.log('🔧 [VehicleDetails] Véhicule mappé:', mappedVehicle);
        console.log('🔧 [VehicleDetails] Airport service mappé:', mappedVehicle.airport_pickup_service);
        console.log('🔧 [VehicleDetails] Baby seat service mappé:', mappedVehicle.baby_seat_service);
        
        setVehicle(mappedVehicle);

        // Charger les photos depuis Supabase Storage
        const photosResult = await PhotoService.getVehiclePhotos(vehicle.id);
        
        if (photosResult.data.length > 0) {
          // Convertir les photos Supabase vers le format de l'application
          const convertedPhotos: Photo[] = photosResult.data.map((supabasePhoto, index) => ({
            id: supabasePhoto.id,
            vehicleId: supabasePhoto.vehicleId,
            url: supabasePhoto.url,
            angle: supabasePhoto.photoType === 'frontLeft' ? 'front' :
                  supabasePhoto.photoType === 'profileLeft' ? 'side' :
                  supabasePhoto.photoType === 'interior' ? 'interior' : 'other',
            position: supabasePhoto.position,
            isPrimary: supabasePhoto.isPrimary,
            createdAt: new Date().toISOString()
          }));
          
          setPhotos(convertedPhotos);
          setVehiclePhotos(photosResult.data);
        } else {
          // Fallback vers l'image principale du véhicule
          const defaultPhoto: Photo = {
            id: `photo-${vehicle.id}`,
            vehicleId: vehicle.id,
            url: vehicle.image_url || "https://images.unsplash.com/photo-1549924231-f129b911e442?w=800&h=600&fit=crop",
            angle: "front" as any,
            position: 1,
            isPrimary: true,
            createdAt: new Date().toISOString()
          };
          setPhotos([defaultPhoto]);
        }
        
      } else {
        toast({
          title: "Véhicule non trouvé",
          description: "Ce véhicule n'existe pas ou n'est plus disponible.",
          variant: "destructive",
        });
        navigate("/");
      }
    } catch (error) {
      console.error("Erreur lors du chargement du véhicule:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les informations du véhicule.",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const openCartModal = (originEl?: HTMLElement) => {
    if (!vehicle) return;
    if (isCartFull) {
      toast({
        title: "Panier plein (10/10)",
        description: "Soumets d'abord ta demande actuelle avant d'ajouter un autre véhicule.",
        variant: "destructive",
      });
      return;
    }
    pendingOriginEl.current = originEl ?? null;
    setIsCartAddModalOpen(true);
  };

  const handleBooking = (userOverride?: User | null) => {
    const activeUser = userOverride ?? currentUser;
    console.log('🎯 [DEBUG] Clic sur Réserver');
    console.log('👤 [DEBUG] currentUser:', activeUser);
    console.log('🚗 [DEBUG] vehicle:', vehicle);
    
    if (!activeUser) {
      console.log('❌ [DEBUG] Utilisateur non connecté, redirection vers login');
      const path = `/vehicle/${license}`;
      saveBookingResumeIntent({ path, navState: navigationState });
      trackBookingBlocked({
        reason: "auth_required",
        itemId: vehicle?.id,
        itemVariant: license,
      });
      toast({
        title: "Connexion requise",
        description: "Vous devez être connecté pour réserver un véhicule.",
      });
      navigate(`/auth/login?redirect=${encodeURIComponent(path)}`);
      return;
    }

    if (!activeUser.phone?.trim()) {
      setPhoneGateSource("booking_start");
      setPhone("");
      setPhoneError(null);
      setShowPhoneRequiredModal(true);
      return;
    }

    if (!vehicle) {
      trackBookingBlocked({ reason: "missing_vehicle", itemVariant: license });
      return;
    }

    if (!navigationState?.rentalCalculation) {
      trackBookingBlocked({
        reason: "missing_dates",
        itemId: vehicle.id,
        itemVariant: license,
      });
      setIsDatePickerOpen(true);
      return;
    }

    trackBeginCheckout({
      itemId: vehicle.id,
      itemName: `${vehicle.brand} ${vehicle.model}`,
      value: vehicleRentalInfo?.totalCost ?? dailyRate,
      rentalDays: navigationState.rentalCalculation.rentalDays,
      source: "vehicle_detail",
    });
    
    // 🔧 SOLUTION : Récupérer le brouillon existant au lieu de le créer à nouveau
    let bookingDraft = getBookingDraft();
    
    if (!bookingDraft) {
      console.log('📝 [DEBUG] Aucun brouillon existant, création d\'un nouveau');
      // Créer un nouveau brouillon seulement s'il n'existe pas
      bookingDraft = createBookingDraft(
        vehicle.id,
        {
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          imageUrl: photos.length > 0 ? photos[0].url : undefined
        },
        navigationState.pickupLocation || 'Non spécifié',
        navigationState.rentalCalculation,
        dailyRate,
        vehicleRentalInfo?.totalCost || 0
      );
    } else {
      console.log('🔄 [DEBUG] Brouillon existant trouvé, mise à jour avec les nouvelles données');
      console.log('🔍 [DEBUG] Services déjà sélectionnés:', bookingDraft.selectedOptions);
      
      // ✅ PRÉSERVER les selectedOptions existantes
      const existingSelectedOptions = bookingDraft.selectedOptions || [];
      console.log('💾 [DEBUG] Préservation de', existingSelectedOptions.length, 'options sélectionnées');
      
      // Mettre à jour le brouillon existant avec les nouvelles données
      bookingDraft = {
        ...bookingDraft,
        vehicleId: vehicle.id,
        vehicleBrand: vehicle.brand,
        vehicleModel: vehicle.model,
        vehicleYear: vehicle.year,
        vehicleImageUrl: photos.length > 0 ? photos[0].url : undefined,
        startDate: navigationState.rentalCalculation.startDate.toISOString(),
        endDate: navigationState.rentalCalculation.endDate.toISOString(),
        startTime: navigationState.rentalCalculation.startTime,
        endTime: navigationState.rentalCalculation.endTime,
        rentalDays: navigationState.rentalCalculation.rentalDays,
        pricePerDay: dailyRate,
        basePrice: vehicleRentalInfo?.totalCost || 0,
        // ✅ GARDER les selectedOptions existantes !
        selectedOptions: existingSelectedOptions,
        updatedAt: new Date().toISOString()
      };
    }

    bookingDraft = finalizeBookingDraftForCheckout(bookingDraft);
    
    console.log('💾 [DEBUG] Brouillon final:', bookingDraft);
    
    // Ouvrir la modal de confirmation de réservation
    if (shouldShowComplementaryServicesModal()) {
      setShowComplementaryModal(true);
    } else {
      setShowConfirmationModal(true);
    }
  };
  
  // Handler pour sauvegarder le téléphone et continuer la réservation
  const handleSavePhoneAndContinue = async () => {
    setPhoneError(null);

    const trimmedPhone = phone?.trim() ?? "";
    if (trimmedPhone.length < 6) {
      setPhoneError(
        "Le numéro de téléphone doit contenir au moins 6 caractères"
      );
      return;
    }

    setIsSavingPhone(true);
    const gateSource = phoneGateSource;

    try {
      const { data: updatedUser, error } = await ProfileService.updateProfile({
        phone: trimmedPhone,
      });

      if (error) {
        setPhoneError(error || "Erreur lors de la sauvegarde du téléphone");
        setIsSavingPhone(false);
        return;
      }

      if (updatedUser) {
        setShowPhoneRequiredModal(false);
        setPhoneError(null);
        setPhone("");
        setPhoneGateSource(null);
        setCurrentUser(updatedUser);
        setIsSavingPhone(false);

        if (gateSource === "booking_start") {
          handleBooking(updatedUser);
          return;
        }

        const pendingRaw = sessionStorage.getItem("pendingBooking");
        let paymentMethod: BookingPaymentMethod = "card_online";
        if (pendingRaw) {
          try {
            const parsed = JSON.parse(pendingRaw) as {
              paymentMethod?: BookingPaymentMethod;
            };
            if (
              parsed.paymentMethod === "card_online" ||
              parsed.paymentMethod === "cash_on_site"
            ) {
              paymentMethod = parsed.paymentMethod;
            }
          } catch {
            /* ignore */
          }
        }
        await handleConfirmBooking(paymentMethod);
      }
    } catch (error: unknown) {
      setPhoneError(
        error instanceof Error ? error.message : "Une erreur est survenue"
      );
      setIsSavingPhone(false);
    }
  };
  
  const doAddToCart = ({ startDate, endDate, startTime, endTime, selectedPlatformOptions }: CartAddParams) => {
    if (!vehicle) return;

    const rentalCalculation = createRentalCalculation(startDate, startTime, endDate, endTime);
    if (!rentalCalculation.isCalculated) return;

    const newNavState: VehicleNavState = {
      rentalCalculation,
      startDate: rentalCalculation.startDate.toISOString(),
      endDate: rentalCalculation.endDate.toISOString(),
      startTime: rentalCalculation.startTime,
      endTime: rentalCalculation.endTime,
      pickupLocation: navigationState?.pickupLocation,
    };

    setManualNavState(newNavState);
    setIsCartAddModalOpen(false);

    if (license) {
      saveBookingResumeIntent({ path: `/vehicle/${license}`, navState: newNavState });
    }

    const pricing = getBookingRentalPricing({
      pricePerDay: vehicle.dailyPrice,
      startDate,
      endDate,
      startTime,
      endTime,
    });

    if (!pricing) {
      toast({
        title: "Dates invalides",
        description: "L'heure de fin doit être après l'heure de départ.",
        variant: "destructive",
      });
      return;
    }

    const cartSelectedOptions = selectedPlatformOptions.map((opt) => ({
      id: opt.id,
      name: opt.name,
      totalPrice: opt.totalPrice,
    }));

    const cartPayload = {
      vehicleId: vehicle.id,
      vehicleType: (vehicle.vehicleType as any) || "car",
      vehicleLabel: `${vehicle.brand} ${vehicle.model}`,
      vehicleThumbnail: photos.length > 0 ? photos[0].url : undefined,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startTime,
      endTime,
      pickupLocation: newNavState.pickupLocation || undefined,
      selectedOptions: cartSelectedOptions,
      estimatedPrice: pricing.basePrice,
      pricePerDay: vehicle.dailyPrice,
      rentalDays: pricing.billableDays,
    };

    const originEl = pendingOriginEl.current;

    if (lastAddedCartItemId) {
      updateCartItem(lastAddedCartItemId, cartPayload);
      openAddedModal({
        label: `${vehicle.brand} ${vehicle.model}`,
        dates: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      });
      return;
    }

    const added = addToCart(cartPayload);

    if (added) {
      clearBookingDraft();
      setLastAddedCartItemId(added);
      if (originEl) flyToCart(originEl, photos.length > 0 ? photos[0].url : undefined);
      openAddedModal({
        label: `${vehicle.brand} ${vehicle.model}`,
        dates: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      });
    }
  };

  const handleConfirmBooking = async (
    paymentMethod: BookingPaymentMethod = 'card_online',
  ) => {
    console.log('✅ [DEBUG] Confirmation de la réservation');
    // Fermer la modal de confirmation
    setShowConfirmationModal(false);
    
    // Rediriger directement vers la page de discussion
    if (!vehicle) {
      console.log('❌ [DEBUG] Pas de véhicule, arrêt');
      return;
    }
    
    if (!vehicle.license) {
      console.log('❌ [DEBUG] Pas de license, arrêt');
      return;
    }
    
    // Utiliser les dates depuis les critères de recherche ou des dates par défaut
    let startDate: Date;
    let endDate: Date;
    let pickupLocation: string = '';
    let startTime: string = '06:30';
    let endTime: string = '06:00';
    
    if (navigationState?.startDate && navigationState?.endDate) {
      // Utiliser les dates depuis les critères de recherche
      startDate = new Date(navigationState.startDate);
      endDate = new Date(navigationState.endDate);
      pickupLocation = navigationState.pickupLocation || '';
      startTime = navigationState.startTime || '06:30';
      endTime = navigationState.endTime || '06:00';
      
      // Ajouter les heures si disponibles
      if (navigationState.startTime) {
        const [hours, minutes] = navigationState.startTime.split(':');
        startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      if (navigationState.endTime) {
        const [hours, minutes] = navigationState.endTime.split(':');
        endDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      
      console.log('📅 [DEBUG] Utilisation des dates depuis les critères de recherche:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        startTime: navigationState.startTime,
        endTime: navigationState.endTime,
        pickupLocation
      });
    } else {
      // Utiliser des dates par défaut
      startDate = new Date();
      startDate.setHours(6, 0, 0, 0); // 06:00 aujourd'hui
      endDate = new Date();
      endDate.setDate(endDate.getDate() + 1); // demain
      endDate.setHours(14, 0, 0, 0); // 14:00
      
      console.log('📅 [DEBUG] Utilisation des dates par défaut:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
    }
    
    // Calcul jours calendaires + règle 9h/12h retour
    const pricing = getBookingRentalPricing({
      pricePerDay: vehicle.dailyPrice,
      startDate,
      endDate,
      startTime,
      endTime,
    });

    if (!pricing) {
      toast({
        title: "Dates invalides",
        description: "L’heure de fin doit être après l’heure de départ.",
        variant: "destructive",
      });
      return;
    }

    console.log('⏱️ [DEBUG] Calcul durée facturable:', {
      billableDays: pricing.billableDays,
      rentalHours: pricing.rentalHours.toFixed(2),
      totalPrice: pricing.basePrice,
    });

    const rentalDays = pricing.rentalDays;
    const basePrice = pricing.basePrice;
    
    // Récupérer les options sélectionnées depuis bookingStorage
    const bookingDraft = getBookingDraft();
    const selectedOptions = bookingDraft?.selectedOptions ? bookingDraft.selectedOptions
      .filter(option => option.selected)
      .map(option => ({
        id: option.id,
        name: option.name,
        pricePerDay: option.pricePerDay,
        totalPrice: option.totalPrice
      })) : [];

    const selectedOptionIds = selectedOptions.map((o) => o.id);
    if (requiresHotelName(selectedOptionIds) && !bookingDraft?.hotelName?.trim()) {
      toast({
        title: t("booking.complementaryServices.hotelRequiredTitle"),
        description: t("booking.complementaryServices.hotelRequiredDescription"),
        variant: "destructive",
      });
      return;
    }

    if (bookingDraft?.pickupLocation) {
      pickupLocation = bookingDraft.pickupLocation;
    }
    const returnLocation = bookingDraft?.returnLocation ?? pickupLocation;
    
    const optionsTotal = selectedOptions.reduce((sum, option) => sum + option.totalPrice, 0);
    const totalPriceWithOptions = basePrice + optionsTotal;
    
    // Créer l'objet de données de réservation pour la page de discussion
    const bookingData = {
      vehicle: {
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        license: vehicle.license,
        imageUrl: vehiclePhotos.exterior?.url || vehiclePhotos.other?.url || vehiclePhotos.side?.url
      },
      rentalInfo: {
        pickupLocation,
        returnLocation,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        startTime,
        endTime,
        rentalDays,
        pricePerDay: vehicle.dailyPrice,
        basePrice,
        optionsTotal,
        totalPrice: totalPriceWithOptions
      },
      selectedOptions
    };
    
    console.log('📋 [DEBUG] Données de réservation pour la discussion:', bookingData);
    
    // 🆕 CRÉER LA RÉSERVATION DANS SU comunesE
    try {
      console.log('💾 [DEBUG] Création de la réservation dans Supabase...');
      
      const subtotal = basePrice + optionsTotal;

      const bookingResult = await SupabaseBookingsService.createBooking({
        vehicleId: vehicle.id,
        renterId: currentUser.id,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalPrice: totalPriceWithOptions,
        pickupLocation: bookingDraft?.pickupLocation ?? bookingData.rentalInfo.pickupLocation,
        hotelName: bookingDraft?.hotelName?.trim() || undefined,
        startTime: bookingData.rentalInfo.startTime,
        endTime: bookingData.rentalInfo.endTime,
        selectedOptions: bookingData.selectedOptions,
        basePrice: bookingData.rentalInfo.basePrice,
        optionsTotal: bookingData.rentalInfo.optionsTotal,
        subtotal: subtotal,
        pricePerDay: vehicle.dailyPrice,
        rentalDays: bookingData.rentalInfo.rentalDays,
        paymentMethod,
      });
      
      if (bookingResult.error === "HOTEL_NAME_REQUIRED") {
        toast({
          title: t("booking.complementaryServices.hotelRequiredTitle"),
          description: t("booking.complementaryServices.hotelRequiredDescription"),
          variant: "destructive",
        });
        return;
      }

      if (bookingResult.error === "INVALID_DATETIME_RANGE") {
        toast({
          title: "Dates invalides",
          description: "L’heure de fin doit être après l’heure de départ.",
          variant: "destructive",
        });
        return;
      }

      // 🔒 Guard : Gérer l'erreur PHONE_REQUIRED
      if (bookingResult.error === "PHONE_REQUIRED") {
        const pendingBooking = {
          vehicleId: vehicle.id,
          vehicleLicense: vehicle.license,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          currentRoute: `/vehicle/${vehicle.license}`,
          paymentMethod,
        };
        sessionStorage.setItem("pendingBooking", JSON.stringify(pendingBooking));

        const returnTo = `/vehicle/${vehicle.license}`;
        setPhoneReturnTo(returnTo);
        setPhoneGateSource("booking_confirmation");
        setPhone("");
        setPhoneError(null);
        setShowPhoneRequiredModal(true);
        return;
      }
      
      if (bookingResult.data) {
        console.log('✅ [DEBUG] Réservation créée avec succès:', bookingResult.data);
        try {
          const { data: bookingRow } = await supabase
            .from("bookings")
            .select(
              "payment_method, amount_total_expected, service_fee_percent_applied, subtotal"
            )
            .eq("id", bookingResult.data.id)
            .single();
          if (bookingRow) {
            trackGa4Event("booking_created", {
              payment_method: bookingRow.payment_method ?? paymentMethod,
              amount_total_expected: Number(bookingRow.amount_total_expected ?? 0),
              service_fee_percent_applied: Number(
                bookingRow.service_fee_percent_applied ?? 0
              ),
              subtotal: Number(bookingRow.subtotal ?? subtotal),
              currency: ANALYTICS_BOOKING_CURRENCY,
            });
            trackMetaLead();
            trackGa4Event("generate_lead");
          }
        } catch {
          // best effort analytics
        }
        clearBookingResumeIntent();
        // Ajouter l'ID de la réservation aux données pour la discussion
        bookingData.bookingId = bookingResult.data.id;
        
        // Sauvegarder les données dans sessionStorage pour la page de discussion
        sessionStorage.setItem('lagon_booking_data', JSON.stringify(bookingData));
        
        // Inclure l'ID de la réservation dans l'URL pour créer une conversation unique
        const bookingId = bookingResult.data.id;
        let url = `/vehicle/${vehicle.license}/booking/discussion?start=${startDate.toISOString()}&end=${endDate.toISOString()}`;
        if (bookingId) {
          url += `&bookingId=${bookingId}`;
        }
        console.log('🔗 [DEBUG] URL de navigation directe:', url);
        
        try {
          navigate(url);
          console.log('✅ [DEBUG] Navigation directe vers la discussion réussie');
        } catch (error) {
          console.error('❌ [DEBUG] Erreur navigation directe:', error);
        }
        
      } else if (bookingResult.error) {
        console.error('❌ [DEBUG] Erreur création réservation:', bookingResult.error);
        toast({
          title: "Erreur de réservation",
          description: bookingResult.error || "Impossible de créer la réservation",
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      console.error('❌ [DEBUG] Erreur lors de la création de la réservation:', error);
      toast({
        title: "Erreur inattendue",
        description: "Une erreur est survenue lors de la création de la réservation",
        variant: "destructive",
      });
      return;
    }
  };

  const handleChooseMoreVehicles = () => {
    navigate('/');
  };

  const handleContinueWithOneVehicle = () => {
    console.log('🎯 [DEBUG] ===== DÉBUT handleContinueWithOneVehicle =====');
    console.log('🎯 [DEBUG] Clic sur "Envoyer ma demande maintenant"');
    console.log('🚗 [DEBUG] Vehicle:', vehicle);
    console.log('🔍 [DEBUG] Vehicle.license:', vehicle?.license);
    console.log('🔍 [DEBUG] License type:', typeof vehicle?.license);
    console.log('🔍 [DEBUG] License value:', vehicle?.license);
    
    if (!vehicle) {
      console.log('❌ [DEBUG] Pas de véhicule, arrêt');
      console.log('🎯 [DEBUG] ===== FIN handleContinueWithOneVehicle (pas de véhicule) =====');
      return;
    }
    
    if (!vehicle.license) {
      console.log('❌ [DEBUG] Pas de license, arrêt');
      console.log('🎯 [DEBUG] ===== FIN handleContinueWithOneVehicle (pas de license) =====');
      return;
    }
    
    // Simuler les dates par défaut (à terme, elles viendront d'un formulaire de dates)
    const startDate = new Date();
    startDate.setHours(10, 0, 0, 0); // 10h00 aujourd'hui
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 1); // demain
    endDate.setHours(18, 0, 0, 0); // 18h00
    
    const url = `/vehicle/${vehicle.license}/booking/discussion?start=${startDate.toISOString()}&end=${endDate.toISOString()}`;
    console.log('🔗 [DEBUG] URL de navigation:', url);
    console.log('🚀 [DEBUG] Navigation vers:', url);
    console.log('🚀 [DEBUG] Avant navigate() - URL actuelle:', window.location.href);
    
    try {
      console.log('🚀 [DEBUG] Appel navigate()...');
      navigate(url);
      console.log('✅ [DEBUG] navigate() appelé avec succès');
      console.log('🚀 [DEBUG] Après navigate() - URL actuelle:', window.location.href);
    } catch (error) {
      console.error('❌ [DEBUG] Erreur navigation:', error);
    }
    
    console.log('🎯 [DEBUG] ===== FIN handleContinueWithOneVehicle =====');
  };

  if (loading || !vehicle) {
    const isNotFound = !loading && !vehicle;
    return (
      <div className="min-h-screen flex flex-col bg-gradient-soft">
        <Seo
          title={t(isNotFound ? "seo.vehicleNotFound.title" : "seo.vehicleLoading.title")}
          description={t(
            isNotFound ? "seo.vehicleNotFound.description" : "seo.vehicleLoading.description"
          )}
        />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement du véhicule...</p>
          </div>
        </main>
      </div>
    );
  }

  const primaryPhoto = photos.find(p => p.isPrimary) || photos[0];
  const dailyRate = vehicle.dailyPrice;
  const originalRate = Math.round(dailyRate * 1.2);
  
  // Récupérer les informations de location depuis le state de navigation ou sessionStorage
  const routerNavState = location.state as {
    rentalCalculation?: RentalCalculation;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    pickupLocation?: string;
  } | null;

  const navigationState: VehicleNavState = manualNavState
    ? manualNavState
    : routerNavState?.rentalCalculation
    ? routerNavState
    : restoredNavState ?? routerNavState;
  
  // Calculer les informations de location pour ce véhicule
  const vehicleRentalInfo: VehicleRentalInfo | null = navigationState?.rentalCalculation
    ? createVehicleRentalInfo(vehicle.id, dailyRate, navigationState.rentalCalculation)
    : null;
  
  console.log('💰 [DEBUG] VehicleDetails - Rental Info:', {
    hasRentalCalculation: !!navigationState?.rentalCalculation,
    rentalDays: navigationState?.rentalCalculation?.rentalDays,
    totalCost: vehicleRentalInfo?.totalCost,
    formattedPrice: vehicleRentalInfo?.formattedPrice,
    pickupLocation: navigationState?.pickupLocation || 'Non défini'
  });

  const nextPhoto = () => {
    setSelectedPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setSelectedPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Sticky Pricing Component
  const PricingCard = ({ isMobile = false }: { isMobile?: boolean }) => (
    <Card className={`${isMobile ? 'shadow-xl border-t' : 'lg:shadow-lg'}`}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DualPrice
                amountMga={dailyRate}
                variant="client"
                primaryClassName="text-2xl font-bold text-primary"
                secondaryClassName="text-sm"
              />
              <span className="text-sm text-muted-foreground line-through">{formatClientInline(originalRate)}</span>
            </div>
            <p className="text-muted-foreground">par jour</p>

            <Link
              to="/politique-annulation"
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-success hover:underline"
            >
              <Clock className="h-3.5 w-3.5" />
              Annulation gratuite jusqu'à 48h avant le retrait
            </Link>

            {/* Afficher le total si des dates sont sélectionnées */}
            {vehicleRentalInfo && (
              <div className="mt-3 pt-3 border-t border-muted">
                <p className="text-sm text-muted-foreground mb-1">
                  Tarif de base* :
                </p>
                <DualPrice
                  amountMga={vehicleRentalInfo.totalCost}
                  variant="client"
                  primaryClassName="text-3xl font-bold text-primary"
                  secondaryClassName="text-sm"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {formatLegacyFormattedPrice(t, vehicleRentalInfo, (mga) => formatClient(mga).primary)}
                </p>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  * Hors options et frais de service
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{footnote}</p>
              </div>
            )}
          </div>

          <Button
            size="lg"
            onClick={(e) => openCartModal(e.currentTarget)}
            disabled={isCartFull}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            {isCartFull ? "Panier plein (10/10)" : "Simuler mon tarif gratuitement"}
          </Button>

          {/* Services supplémentaires proposés par ce véhicule */}
          {(() => {
            console.log('🔍 [VehicleDetails] Condition VehicleServiceOptions:', {
              vehicle: !!vehicle,
              navigationState: !!navigationState,
              rentalCalculation: !!navigationState?.rentalCalculation,
              vehicleId: vehicle?.id,
              rentalDays: navigationState?.rentalCalculation?.rentalDays
            });
            return vehicle && navigationState?.rentalCalculation;
          })() && (
            <VehicleServiceOptions 
              vehicle={vehicle}
              rentalDays={navigationState.rentalCalculation.rentalDays}
            />
          )}

          <Badge variant="secondary" className="w-full justify-center py-1">
            <CheckCircle className="h-4 w-4 mr-1" />
            Annulation gratuite
          </Badge>

          <a
            href={`${whatsappBaseUrl}?text=${encodeURIComponent(`Bonjour, j'ai une question sur ${vehicle ? `${vehicle.brand} ${vehicle.model}` : "ce véhicule"}${license ? ` (réf: ${license})` : ""}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsAppFabEvent("whatsapp_pdp_click", { page_path: `/vehicle/${license}`, vehicle_ref: license ?? "" })}
            className="flex items-center justify-center gap-2 w-full rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700 hover:bg-green-100 transition-colors"
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            Une question avant de réserver ? Écris-nous sur WhatsApp
          </a>
        </div>

        <Separator className="my-6" />

        <div>
          <h3 className="font-semibold mb-4">Inclus dans le prix</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Assurance multirisque</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-500" />
              <span>Assistance routière 24/7</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span>Conducteurs additionnels gratuits</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const seoInput = {
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    pricePerDay: vehicle.dailyPrice,
    isMoto: false,
    vehicleType: 'car', // VehicleDetails = toujours une voiture
    license: license || vehicle.license,
  };

  const canonical = buildVehicleCanonical(seoInput.license, false);
  const typeLabel = getVehicleTypeLabel({ model: vehicle.model, vehicleType: vehicle.vehicleType });
  const structuredData = buildVehicleProductSchema({
    canonical,
    license: seoInput.license,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year ?? undefined,
    description: vehicle.description,
    pricePerDay: vehicle.dailyPrice,
    currency: "EUR",
    images: photos.map((p) => p.url).filter(Boolean),
    isMoto: false,
    vehicleType: 'car', // VehicleDetails = toujours une voiture
  });
  const breadcrumbSchema = buildVehicleBreadcrumbSchema({
    typeLabel,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year ?? undefined,
    canonical,
  });

  return (
    <div className={`min-h-screen flex flex-col bg-background ${hideMobileBookingBar ? "pb-0" : "pb-20"} lg:pb-0`}>
      <Seo
        title={buildVehicleSeoTitle(seoInput)}
        description={buildVehicleSeoDescription(seoInput)}
        canonical={canonical}
        structuredData={structuredData}
        extraStructuredData={breadcrumbSchema}
      />
      <main className="flex-1 py-4 md:py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>

          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Accueil</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Location {typeLabel} à Nosy Be</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {vehicle.brand} {vehicle.model}
                  {vehicle.year ? ` (${vehicle.year})` : ""}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Photos Gallery */}
              <div className="space-y-4">
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                  {(() => {
                    const currentPhoto = photos[selectedPhotoIndex] || primaryPhoto;
                    const imageUrl = currentPhoto?.url || "https://images.unsplash.com/photo-1549924231-f129b911e442?w=800&h=600&fit=crop";
                    const isSupabaseUrl = imageUrl.includes('supabase.co/storage');
                    const srcSet = isSupabaseUrl ? generateSrcSet(imageUrl, IMAGE_WIDTHS.DETAIL) : undefined;
                    const sizes = IMAGE_SIZES.DETAIL_MAIN;
                    const optimizedSrc = isSupabaseUrl ? getOptimizedImageUrl(imageUrl, 800) : imageUrl;
                    
                    return (
                      <img
                        src={optimizedSrc}
                        srcSet={srcSet}
                        sizes={sizes}
                        alt={`${vehicle.brand} ${vehicle.model}`}
                        width={800}
                        height={600}
                        className="w-full h-full object-cover"
                        loading="eager"
                        fetchPriority="high"
                        decoding="async"
                      />
                    );
                  })()}
                  {photos.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/90 backdrop-blur"
                        onClick={prevPhoto}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/90 backdrop-blur"
                        onClick={nextPhoto}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur rounded-md px-2 py-1 text-sm">
                    {selectedPhotoIndex + 1} / {photos.length || 1}
                  </div>
                </div>
                
                {/* Photo Thumbnails */}
                {photos.length > 1 && (
                  <div className="grid grid-cols-6 gap-2">
                    {photos.slice(0, 6).map((photo, index) => {
                      const isSupabaseUrl = photo.url.includes('supabase.co/storage');
                      const srcSet = isSupabaseUrl ? generateSrcSet(photo.url, IMAGE_WIDTHS.THUMBNAIL) : undefined;
                      const optimizedSrc = isSupabaseUrl ? getOptimizedImageUrl(photo.url, 150) : photo.url;
                      
                      return (
                        <button
                          key={photo.id}
                          onClick={() => setSelectedPhotoIndex(index)}
                          className={`aspect-square rounded-lg overflow-hidden transition-all ${
                            selectedPhotoIndex === index 
                              ? "ring-2 ring-primary" 
                              : "hover:ring-2 hover:ring-primary/50"
                          }`}
                        >
                          <img
                            src={optimizedSrc}
                            srcSet={srcSet}
                            sizes={IMAGE_SIZES.THUMBNAIL}
                            alt={`Vue ${photo.angle}`}
                            width={150}
                            height={150}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Mobile: Price card appears here, right after photos - NOT STICKY */}
              <div className="lg:hidden mb-6">
                <PricingCard />
              </div>

              {/* Vehicle Title and Info */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="secondary" className="text-sm">{vehicle.license}</Badge>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">5.0</span>
                      <span className="text-muted-foreground">(24 avis)</span>
                    </div>
                    <ShareButton
                      title={`${vehicle.brand} ${vehicle.model} — Location à Nosy Be`}
                    />
                  </div>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold mb-3">
                  {buildVehicleH1Title({
                    brand: vehicle.brand,
                    model: vehicle.model,
                    engineCapacity: vehicle.engineCapacity,
                    vehicleType: vehicle.vehicleType,
                  })}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-4">
                  <span>{vehicle.mileage.toLocaleString()} km</span>
                  <span>•</span>
                  <span>{vehicle.year}</span>
                  <span>•</span>
                  <span>5 places</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Parking réservé
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Settings className="h-3 w-3" />
                    {transmissionLabels[vehicle.transmission]}
                  </Badge>
                </div>
              </div>

              {/* Location Map */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Récupération du véhicule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Zones de prise en charge */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">Zones de prise en charge disponibles :</h4>
                      {vehicle?.location ? (
                        <div className="flex flex-wrap gap-2">
                          {vehicle.location.split(', ').map((zone, index) => {
                            const IconComponent = getLocationIcon(zone.trim());
                            return (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="flex items-center gap-1 px-2 py-1"
                              >
                                <IconComponent className="h-3 w-3" />
                                {zone.trim()}
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1">
                          <MapPin className="h-3 w-3" />
                          Nosy Be, Madagascar
                        </Badge>
                      )}
                    </div>
                    
                    <div className="h-24 bg-gradient-to-r from-muted/50 to-muted/30 rounded-lg flex items-center justify-center border border-muted/40">
                      <div className="text-center text-muted-foreground">
                        <MapPin className="h-5 w-5 mx-auto mb-1" />
                        <p className="text-sm">Carte interactive</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Vous récupérerez les clés directement auprès du propriétaire lors de votre arrivée.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Owner and Description */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Propriétaire dynamique */}
                <div className="max-w-md">
                  {vehicle && (
                    <VehicleOwnerCard 
                      vehicleId={vehicle.id} 
                      className="w-full"
                    />
                  )}
                </div>

                {/* Description */}
                {vehicle.description && (
                  <div className="max-w-md">
                    <Card className="h-full overflow-hidden">
                      <CardHeader className="pb-3 bg-gradient-to-r from-primary-soft/10 to-transparent">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Car className="h-5 w-5 text-primary" />
                          Description du véhicule
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 p-4">
                        <h2 className="text-lg font-semibold mb-3">
                          {(() => {
                            const typeLabel = getVehicleTypeLabel({ model: vehicle.model, vehicleType: vehicle.vehicleType });
                            return `Location de ${getLocationArticle(typeLabel)} ${typeLabel} à Nosy Be`;
                          })()}
                        </h2>
                        <TranslatableDescription
                          descriptionFr={vehicle.description}
                          descriptionEn={vehicle.descriptionEn}
                          descriptionDe={vehicle.descriptionDe}
                          descriptionIt={vehicle.descriptionIt}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Technical Specifications */}
              <Collapsible open={expandedSections.technical} onOpenChange={() => toggleSection('technical')}>
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3 bg-gradient-to-r from-primary-soft/10 to-transparent">
                      <CardTitle className="flex items-center justify-between text-lg">
                        Caractéristiques techniques
                        <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.technical ? 'rotate-90' : ''}`} />
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div className="bg-gray-50/50 p-3 rounded-lg text-center">
                          <div className="text-xs text-gray-600 mb-1">Moteur</div>
                          <div className="text-sm font-semibold text-primary">{vehicle.fuel || "Non spécifié"}</div>
                        </div>
                        <div className="bg-gray-50/50 p-3 rounded-lg text-center">
                          <div className="text-xs text-gray-600 mb-1">Transmission</div>
                          <div className="text-sm font-semibold text-primary">{vehicle.transmission || "Non spécifiée"}</div>
                        </div>
                        <div className="bg-gray-50/50 p-3 rounded-lg text-center">
                          <div className="text-xs text-gray-600 mb-1">Kilométrage</div>
                          <div className="text-sm font-semibold text-primary">{vehicle.mileage.toLocaleString()} km</div>
                        </div>
                        <div className="bg-gray-50/50 p-3 rounded-lg text-center">
                          <div className="text-xs text-gray-600 mb-1">Portes</div>
                          <div className="text-sm font-semibold text-primary">{vehicle.doors}</div>
                        </div>
                        <div className="bg-gray-50/50 p-3 rounded-lg text-center">
                          <div className="text-xs text-gray-600 mb-1">Places</div>
                          <div className="text-sm font-semibold text-primary">5</div>
                        </div>
                        <div className="bg-gray-50/50 p-3 rounded-lg text-center">
                          <div className="text-xs text-gray-600 mb-1">Couleur</div>
                          <div className="text-sm font-semibold text-primary">{vehicle.color}</div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Options and Accessories — voitures uniquement, options réelles */}
              {(() => {
                const carEquipment = vehicle ? getCarEquipmentItems(vehicle) : [];
                if (carEquipment.length === 0) return null;
                return (
              <Collapsible open={expandedSections.options} onOpenChange={() => toggleSection('options')}>
                <Card className="overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3 bg-gradient-to-r from-primary-soft/10 to-transparent">
                      <CardTitle className="flex items-center justify-between text-lg">
                        Options et accessoires
                        <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.options ? 'rotate-90' : ''}`} />
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {carEquipment.map((item) => {
                          const Icon = item.icon;
                          return (
                            <div key={item.key} className="flex items-center gap-2 p-2 bg-gray-50/50 rounded-lg">
                              <Icon className={`h-4 w-4 flex-shrink-0 ${item.color}`} />
                              <span className="text-xs font-medium">{item.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
                );
              })()}

              {/* Reviews */}
              <Collapsible open={expandedSections.reviews} onOpenChange={() => toggleSection('reviews')}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span>Évaluations</span>
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-lg font-bold">5.0</span>
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.reviews ? 'rotate-90' : ''}`} />
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-4 mb-6">
                        {[5, 4, 3, 2, 1].map((rating) => (
                          <div key={rating} className="flex items-center gap-3">
                            <span className="text-sm w-3">{rating}</span>
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <Progress value={rating === 5 ? 90 : 0} className="flex-1" />
                            <span className="text-sm text-muted-foreground w-8">{rating === 5 ? '22' : '0'}</span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-4">
                        <div className="border-t pt-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face" />
                              <AvatarFallback>M</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">Marie</span>
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                Il y a 2 semaines • 3 jours de location
                              </p>
                              <p className="text-sm">
                                Véhicule en parfait état, très propre. Pierre est un hôte attentionné et disponible. Je recommande vivement !
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" />
                              <AvatarFallback>J</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">Jean</span>
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star key={star} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                Il y a 1 mois • 5 jours de location
                              </p>
                              <p className="text-sm">
                                Excellent véhicule pour découvrir l'île. Économique et fiable. Communication parfaite avec le propriétaire.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Insurance */}
              <Collapsible open={expandedSections.insurance} onOpenChange={() => toggleSection('insurance')}>
                <Card className="border-primary/20 bg-primary/5">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-primary/10 transition-colors">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary" />
                          Assurance incluse
                        </div>
                        <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.insurance ? 'rotate-90' : ''}`} />
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span>Assurance multirisque fournie par AXA</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span>Assistance routière 24/7</span>
                        </div>

                        <Separator />

                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <h4 className="font-medium mb-2">Ce que prend en charge l'assurance :</h4>
                            <ul className="space-y-1 text-muted-foreground">
                              <li>• Dommages collision</li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">Conditions :</h4>
                            <ul className="space-y-1 text-muted-foreground">
                              <li>• Caution : 400€</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Benefits */}
              <Collapsible open={expandedSections.benefits} onOpenChange={() => toggleSection('benefits')}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardTitle className="flex items-center justify-between">
                        Avantages à chaque location
                        <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.benefits ? 'rotate-90' : ''}`} />
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <span>Prolongation facile</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>30 minutes de marge pour les retours tardifs</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-purple-500" />
                          <span>Support client 7j/7</span>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Legal Information */}
              <Collapsible open={expandedSections.legal} onOpenChange={() => toggleSection('legal')}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardTitle className="flex items-center justify-between">
                        Informations précontractuelles
                        <ChevronRight className={`h-4 w-4 transition-transform ${expandedSections.legal ? 'rotate-90' : ''}`} />
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>
                          Conformément à l'article L.221-18 du Code de la consommation, vous disposez d'un droit de rétractation de 14 jours à compter de la conclusion du contrat.
                        </p>
                        <p>
                          En cas de litige, vous pouvez recourir à la médiation de la consommation ou saisir le tribunal compétent.
                        </p>
                        <div className="flex gap-4">
                          <Button variant="link" className="p-0 h-auto text-primary">
                            Conditions générales
                          </Button>
                          <Button variant="link" className="p-0 h-auto text-primary">
                            En savoir plus
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>

            {/* Sticky Sidebar - Only visible on desktop */}
            <div className="hidden lg:block">
              <div className="sticky top-24 h-fit">
                <PricingCard />
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Mobile Sticky Bottom Price Card */}
      {!hideMobileBookingBar && (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t">
        <div className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              {vehicleRentalInfo ? (
                <>
                  <DualPrice
                    amountMga={vehicleRentalInfo.totalCost}
                    variant="client"
                    primaryClassName="text-2xl font-bold text-primary"
                    secondaryClassName="text-xs"
                  />
                  <div className="text-xs text-muted-foreground">
                    {formatClientInline(dailyRate)}/jour • Hors options
                  </div>
                </>
              ) : (
                <div className="flex flex-col">
                  <DualPrice
                    amountMga={dailyRate}
                    variant="client"
                    primaryClassName="text-xl font-bold text-primary"
                    secondaryClassName="text-xs"
                    inline
                  />
                  <span className="text-sm text-muted-foreground">par jour</span>
                </div>
              )}
            </div>
            <Button
              size="lg"
              onClick={(e) => openCartModal(e.currentTarget)}
              disabled={isCartFull}
              className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 px-6 flex-shrink-0"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {isCartFull ? "Panier plein" : "Simuler mon tarif gratuitement"}
            </Button>
          </div>
        </div>
      </div>
      )}
      
      <Footer />

      <CartAddModal
        isOpen={isCartAddModalOpen}
        onClose={() => setIsCartAddModalOpen(false)}
        pricePerDay={vehicle?.dailyPrice ?? 0}
        vehicleLabel={vehicle ? `${vehicle.brand} ${vehicle.model}` : ""}
        vehicleThumbnail={photos.length > 0 ? photos[0].url : undefined}
        dateLocale={dateLocale}
        t={t}
        onAddToCart={doAddToCart}
        initialStartDate={navigationState?.rentalCalculation?.startDate ?? null}
        initialEndDate={navigationState?.rentalCalculation?.endDate ?? null}
      />

      {/* Complementary services upsell modal */}
      <ComplementaryServicesModal
        isOpen={showComplementaryModal}
        onClose={() => setShowComplementaryModal(false)}
        onContinue={() => {
          setShowComplementaryModal(false);
          setShowConfirmationModal(true);
        }}
      />

      {/* Booking Confirmation Modal */}
      {vehicle && navigationState?.rentalCalculation && (
        <BookingConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => setShowConfirmationModal(false)}
          onConfirm={handleConfirmBooking}
          vehicle={{
            id: vehicle.id,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            imageUrl: photos.length > 0 ? photos[0].url : undefined,
            category: vehicle.vehicleType ?? "car",
            vehicleType: vehicle.vehicleType ?? "car",
          }}
          rentalInfo={{
            pickupLocation: getBookingDraft()?.pickupLocation || navigationState.pickupLocation || 'Non spécifié',
            returnLocation: getBookingDraft()?.returnLocation,
            startDate: new Date(navigationState.startDate!),
            endDate: new Date(navigationState.endDate!),
            startTime: navigationState.startTime!,
            endTime: navigationState.endTime!,
            rentalDays: navigationState.rentalCalculation.rentalDays,
            pricePerDay: dailyRate,
            basePrice: vehicleRentalInfo?.totalCost || 0
          }}
          selectedOptions={[]}
        />
      )}
      
      {/* Multi Vehicle Selection Modal */}
      <MultiVehicleModal
        isOpen={showMultiVehicleModal}
        onClose={() => setShowMultiVehicleModal(false)}
        onContinueWithOne={handleContinueWithOneVehicle}
        selectedVehicleImage={photos.length > 0 ? photos[0].url : undefined}
        selectedVehicleName={vehicle ? `${vehicle.brand} ${vehicle.model}` : undefined}
      />

      {/* Phone Required Modal */}
      <Dialog
        open={showPhoneRequiredModal}
        onOpenChange={(open) => {
          setShowPhoneRequiredModal(open);
          if (!open) {
            setPhone("");
            setPhoneError(null);
            setPhoneGateSource(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Numéro de téléphone requis</DialogTitle>
            <DialogDescription>
              {phoneGateSource === "booking_start"
                ? "Pour finaliser votre demande de réservation, nous avons besoin de votre numéro de téléphone."
                : "Ajoutez votre numéro de téléphone pour continuer votre réservation."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone-modal" className="text-sm font-medium">
                Numéro de téléphone
              </Label>
              <LazyPhoneInput
                id="phone-modal"
                placeholder="Numéro de téléphone"
                value={phone}
                onChange={setPhone}
                defaultCountry="FR"
                international
                countryCallingCodeEditable={false}
                className="flex h-11 w-full rounded-lg border border-primary-soft/20 bg-background/30 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/10 focus-visible:border-primary transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {phoneError && (
                <p className="text-sm text-destructive mt-1">{phoneError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPhoneRequiredModal(false);
                setPhone("");
                setPhoneError(null);
                setPhoneGateSource(null);
              }}
              disabled={isSavingPhone}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSavePhoneAndContinue}
              disabled={isSavingPhone}
            >
              {isSavingPhone ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer et poursuivre ma réservation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}