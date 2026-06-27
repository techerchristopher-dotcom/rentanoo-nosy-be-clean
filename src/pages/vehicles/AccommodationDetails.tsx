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
  Home,
  Fuel,
  Settings,
  Wind,
  MapPin,
  Euro,
  Users,
  Calendar,
  ArrowLeft,
  Star,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  UserCheck,
  Navigation,
  Bluetooth,
  Smartphone,
  Volume2,
  Thermometer,
  Phone,
  CheckCircle,
  Info,
  Heart,
  BarChart3,
  MessageSquare,
  Camera,
  FileText,
  HelpCircle,
  Gauge,
  Cog,
  Calendar as CalendarIcon,
  Plane,
  Ship,
  Waves,
  Umbrella,
  Wifi,
  Bath,
  Zap,
  ShoppingBag,
  Music,
  UtensilsCrossed,
  Sun,
  Sparkles,
  Shirt,
  Laptop,
  Tv,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Footer } from "@/components/layout/footer";
import { BookingConfirmationModal } from "@/components/booking/BookingConfirmationModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { LazyPhoneInput } from "@/components/ui/lazy-phone-input";
import { Loader2 } from "lucide-react";
import {
  SupabaseBookingsService,
  type BookingPaymentMethod,
} from "@/services/supabase/bookings";
import { supabase } from "@/integrations/supabase/client";
import { ANALYTICS_BOOKING_CURRENCY, trackGa4Event } from "@/lib/analytics";
import { trackMetaLead } from "@/lib/metaPixel";
import { ProfileService } from "@/services/supabase/profile";
import { Photo, User, RentalCalculation, VehicleRentalInfo, Vehicle } from "@/types";
import { createVehicleRentalInfo, createRentalCalculation } from "@/lib/utils";
import { getBookingRentalPricing } from "@/utils/rentalPriceFromDates";
import { formatLegacyFormattedPrice } from "@/utils/formatLegacyFormattedPrice";
import { getVehicleCardTotalSummary } from "@/utils/formatVehicleCardRental";
import { formatCurrency } from "@/utils/currency";
import { DualPrice } from "@/components/currency/DualPrice";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { formatBillableDays } from "@/utils/formatDuration";
import {
  createBookingDraft,
  getBookingDraft,
  clearBookingDraft,
  saveBookingDraft,
  finalizeBookingDraftForCheckout,
} from "@/services/localStorage/bookingStorage";
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
import { AccommodationHighlights } from "@/components/accommodation/AccommodationHighlights";
import { ListingDescriptionContent } from "@/components/listing/ListingDescriptionContent";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart, MessageSquare } from "lucide-react";
import { useWhatsAppContact } from "@/contexts/WhatsAppContactContext";
import { trackWhatsAppFabEvent } from "@/lib/whatsappAnalytics";
import { flyToCart } from "@/utils/cartFlyAnimation";
import { mapToAccommodationVehicle } from "@/mappers/vehicleMappers";
import { isAccommodation } from "@/utils/vehicleType";
import { useListingTerms } from "@/utils/listingTerminology";
import { Seo } from "@/components/seo/Seo";
import { ShareButton } from "@/components/shared/ShareButton";
import { TranslatableDescription } from "@/components/shared/TranslatableDescription";
import {
  buildAccommodationSeoTitle,
  buildAccommodationSeoDescription,
  buildAccommodationCanonical,
  buildAccommodationH1Title,
  buildAccommodationShortName,
  buildAccommodationOgImage,
} from "@/utils/accommodationSeo";
import {
  buildAccommodationVacationRentalSchema,
  buildAccommodationBreadcrumbSchema,
} from "@/utils/accommodationSchema";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";


export default function AccommodationDetails() {

  const { license } = useParams<{ license: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { addItem: addToCart, updateItem: updateCartItem, isFull: isCartFull, openAddedModal } = useCart();
  const { waUrl: whatsappBaseUrl } = useWhatsAppContact();
  const { t, i18n } = useTranslation();
  const { footnote, formatClient, formatClientInline } = useExchangeRate();
  const listingTerms = useListingTerms("accommodation");
  
  // Locale pour formatCurrency (comme dans BookingConfirmationModal)
  const currentLang = i18n.language || "fr";
  const currencyLocale = 
    currentLang.startsWith("fr") ? "fr-FR" :
    currentLang.startsWith("it") ? "it-IT" :
    currentLang.startsWith("de") ? "de-DE" :
    "en-US";

  console.log("🏍️ [DEBUG] License from useParams:", license);
  console.log("🏍️ [DEBUG] Navigate function:", typeof navigate);
  console.log("🏍️ [DEBUG] Location state:", location.state);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [vehiclePhotos, setVehiclePhotos] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showPhoneRequiredModal, setShowPhoneRequiredModal] = useState(false);
  type PhoneGateSource = "booking_start" | "booking_confirmation";
  const [phoneGateSource, setPhoneGateSource] = useState<PhoneGateSource | null>(
    null
  );

  const hideMobileBookingBar =
    showConfirmationModal || showPhoneRequiredModal;
  const [phoneReturnTo, setPhoneReturnTo] = useState<string>("");
  const [phone, setPhone] = useState<string | undefined>('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [expandedSections, setExpandedSections] = useState({
    owner: true,
    reviews: true,
    legal: false,
  });
  const [restoredNavState, setRestoredNavState] = useState<VehicleNavState>(null);
  const [manualNavState, setManualNavState] = useState<VehicleNavState>(null);
  const [isCartAddModalOpen, setIsCartAddModalOpen] = useState(false);
  const pendingOriginEl = useRef<HTMLElement | null>(null);
  const [dateLocale, setDateLocale] = useState<Locale | null>(null);
  // Tracks the cart item ID added during this page visit — enables date update (vs new add) when user re-validates dates
  const [lastAddedCartItemId, setLastAddedCartItemId] = useState<string | null>(null);
  const viewItemSentRef = useRef(false);
  const [rawVehicleCategory, setRawVehicleCategory] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [license]);

  useEffect(() => {
    getDateLocale(i18n.language).then(setDateLocale);
  }, [i18n.language]);

  useEffect(() => {
    const routerState = location.state as VehicleNavState | null;
    if (routerState?.rentalCalculation) {
      setRestoredNavState(null);
      setManualNavState(null);
      return;
    }
    if (!license) return;

    const currentPath = `/hebergement/${license}`;
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
      itemCategory: vehicle.vehicleType ?? "accommodation",
      itemVariant: license,
      price: vehicle.dailyPrice,
      hasDates: Boolean(effectiveNav?.rentalCalculation),
      rentalDays: effectiveNav?.rentalCalculation?.rentalDays,
    });
  }, [loading, vehicle?.id, license]);

  useEffect(() => {
    console.log("🏍️ [DEBUG] MotoVehicleDetails useEffect triggered");
    console.log("🏍️ [DEBUG] License param:", license);
    console.log("🏍️ [DEBUG] Current URL:", window.location.href);
    loadVehicleData();
    loadCurrentUser();
  }, [license]);

  const loadCurrentUser = async () => {
    console.log("🔍 [DEBUG] Chargement de l'utilisateur actuel (moto)...");
    try {
      const result = await ProfileService.getCurrentUserProfile();
      console.log("📊 [DEBUG] Résultat ProfileService:", result);
      console.log("👤 [DEBUG] Données utilisateur:", result.data);
      console.log("❌ [DEBUG] Erreur ProfileService:", result.error);

      if (result.error) {
        console.error(
          "❌ [DEBUG] ProfileService a retourné une erreur:",
          result.error
        );
        setCurrentUser(null);
      } else {
        console.log("✅ [DEBUG] Utilisateur chargé avec succès");
        setCurrentUser(result.data);
      }
    } catch (error) {
      console.error(
        "❌ [DEBUG] Erreur lors du chargement de l'utilisateur:",
        error
      );
      setCurrentUser(null);
    }
  };

  const loadVehicleData = async () => {
    if (!license) return;

    try {
      setLoading(true);

      // Charger uniquement ce véhicule (requête ciblée par préfixe d'ID, pas tout le catalogue)
      const { data: supabaseVehicle } = await SupabaseVehiclesService.getVehicleByShortId(license);

      if (supabaseVehicle) {
        // Guard : vérifier qu'il s'agit bien d'une moto
        if (!isAccommodation(supabaseVehicle)) {
          console.warn(
            "⚠️ [AccommodationDetails] Véhicule trouvé mais type différent de 'accommodation':",
            supabaseVehicle.vehicle_type
          );
          toast({
            title: t("accommodationDetails.errors.vehicleIncompatible.title"),
            description: t("accommodationDetails.errors.vehicleIncompatible.description"),
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        const mappedVehicle: Vehicle = mapToAccommodationVehicle(supabaseVehicle);
        setRawVehicleCategory(supabaseVehicle.vehicle_category ?? null);

        console.log(
          "🏍️ [MotoVehicleDetails] Véhicule Supabase original:",
          supabaseVehicle
        );
        console.log("🏍️ [MotoVehicleDetails] Véhicule mappé (moto):", mappedVehicle);

        setVehicle(mappedVehicle);

        // Charger les photos depuis Supabase Storage
        const photosResult = await PhotoService.getVehiclePhotos(
          supabaseVehicle.id
        );

        if (photosResult.data.length > 0) {
          // Convertir les photos Supabase vers le format de l'application
          const convertedPhotos: Photo[] = photosResult.data.map(
            (supabasePhoto) => ({
              id: supabasePhoto.id,
              vehicleId: supabasePhoto.vehicleId,
              url: supabasePhoto.url,
              angle:
                supabasePhoto.photoType === "frontLeft"
                  ? "front"
                  : supabasePhoto.photoType === "profileLeft"
                  ? "side"
                  : supabasePhoto.photoType === "interior"
                  ? "interior"
                  : "other",
              position: supabasePhoto.position,
              isPrimary: supabasePhoto.isPrimary,
              createdAt: new Date().toISOString(),
            })
          );

          setPhotos(convertedPhotos);
          setVehiclePhotos(photosResult.data);
        } else {
          // Fallback vers l'image principale du véhicule
          const defaultPhoto: Photo = {
            id: `photo-${supabaseVehicle.id}`,
            vehicleId: supabaseVehicle.id,
            url:
              supabaseVehicle.image_url ||
              "https://images.unsplash.com/photo-1549924231-f129b911e442?w=800&h=600&fit=crop",
            angle: "front",
            position: 1,
            isPrimary: true,
            createdAt: new Date().toISOString(),
          };
          setPhotos([defaultPhoto]);
        }
      } else {
        toast({
          title: t("motoDetails.errors.vehicleNotFound.title"),
          description: t("motoDetails.errors.vehicleNotFound.description"),
          variant: "destructive",
        });
        navigate("/");
      }
    } catch (error) {
      console.error("Erreur lors du chargement du véhicule (moto):", error);
      toast({
        title: t("motoDetails.errors.loadError.title"),
        description: t("motoDetails.errors.loadError.description"),
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

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

  const vehicleRentalInfo: VehicleRentalInfo | null =
    vehicle && navigationState?.rentalCalculation
      ? createVehicleRentalInfo(
          vehicle.id,
          vehicle.dailyPrice,
          navigationState.rentalCalculation
        )
      : null;

  const durationText = vehicleRentalInfo
    ? formatBillableDays(t, vehicleRentalInfo.days)
    : null;

  const openCartModal = (originEl?: HTMLElement) => {
    if (!vehicle) return;
    if (isCartFull) {
      toast({
        title: "Panier plein (10/10)",
        description: "Soumets d'abord ta demande actuelle avant d'ajouter un autre élément.",
        variant: "destructive",
      });
      return;
    }
    pendingOriginEl.current = originEl ?? null;
    setIsCartAddModalOpen(true);
  };

  const handleBooking = (userOverride?: User | null) => {
    const activeUser = userOverride ?? currentUser;
    console.log("🏍️ [DEBUG] Clic sur Réserver (moto)");
    console.log("👤 [DEBUG] currentUser:", activeUser);
    console.log("🏍️ [DEBUG] vehicle:", vehicle);

    if (!activeUser) {
      console.log(
        "❌ [DEBUG] Utilisateur non connecté, redirection vers login (moto)"
      );
      const path = `/hebergement/${license}`;
      saveBookingResumeIntent({ path, navState: navigationState });
      trackBookingBlocked({
        reason: "auth_required",
        itemId: vehicle?.id,
        itemVariant: license,
      });
      toast({
        title: t("motoDetails.errors.loginRequired.title"),
        description: t("motoDetails.errors.loginRequired.description"),
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
      value: vehicleRentalInfo?.totalCost ?? vehicle.dailyPrice,
      rentalDays: navigationState.rentalCalculation.rentalDays,
      source: "accommodation_detail",
    });

    let bookingDraft = getBookingDraft();

    if (!bookingDraft) {
      console.log(
        "📝 [DEBUG] Aucun brouillon existant, création d'un nouveau (moto)"
      );
      bookingDraft = createBookingDraft(
        vehicle.id,
        {
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          imageUrl: photos.length > 0 ? photos[0].url : undefined,
        },
        navigationState.pickupLocation || t("motoDetails.notSpecified"),
        navigationState.rentalCalculation,
        vehicle.dailyPrice,
        vehicleRentalInfo?.totalCost || 0
      );
    } else {
      console.log(
        "🔄 [DEBUG] Brouillon existant trouvé, mise à jour avec les nouvelles données (moto)"
      );

      const existingSelectedOptions = bookingDraft.selectedOptions || [];

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
        pricePerDay: vehicle.dailyPrice,
        basePrice: vehicleRentalInfo?.totalCost || 0,
        selectedOptions: existingSelectedOptions,
        updatedAt: new Date().toISOString(),
      };
    }

    bookingDraft = finalizeBookingDraftForCheckout(bookingDraft);

    console.log("💾 [DEBUG] Brouillon final (moto):", bookingDraft);

    setShowConfirmationModal(true);
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
      saveBookingResumeIntent({ path: `/hebergement/${license}`, navState: newNavState });
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
      vehicleType: "accommodation" as const,
      vehicleLabel: vehicle.model,
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
        label: vehicle.model,
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
        label: vehicle.model,
        dates: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      });
    }
  };

  const handleConfirmBooking = async (
    paymentMethod: BookingPaymentMethod = 'card_online',
  ) => {
    console.log("✅ [DEBUG] Confirmation de la réservation (moto)");
    setShowConfirmationModal(false);

    if (!vehicle) {
      console.log("❌ [DEBUG] Pas de véhicule, arrêt (moto)");
      return;
    }

    if (!vehicle.license) {
      console.log("❌ [DEBUG] Pas de license, arrêt (moto)");
      return;
    }

    let startDate: Date;
    let endDate: Date;
    let pickupLocation: string = "";
    let startTime: string = "06:30";
    let endTime: string = "06:00";

    if (navigationState?.startDate && navigationState?.endDate) {
      startDate = new Date(navigationState.startDate);
      endDate = new Date(navigationState.endDate);
      pickupLocation = navigationState.pickupLocation || "";
      startTime = navigationState.startTime || "06:30";
      endTime = navigationState.endTime || "06:00";

      if (navigationState.startTime) {
        const [hours, minutes] = navigationState.startTime.split(":");
        startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
      if (navigationState.endTime) {
        const [hours, minutes] = navigationState.endTime.split(":");
        endDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }
    } else {
      startDate = new Date();
      startDate.setHours(6, 0, 0, 0);
      endDate = new Date();
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(14, 0, 0, 0);
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
        title: t("motoDetails.errors.invalidDates.title", "Dates invalides"),
        description: t(
          "motoDetails.errors.invalidDates.description",
          "L’heure de fin doit être après l’heure de départ."
        ),
        variant: "destructive",
      });
      return;
    }

    const rentalDays = pricing.rentalDays;
    const basePrice = pricing.basePrice;

    const bookingDraft = getBookingDraft();
    const selectedOptions = bookingDraft?.selectedOptions
      ? bookingDraft.selectedOptions
          .filter((option) => option.selected)
          .map((option) => ({
            id: option.id,
            name: option.name,
            pricePerDay: option.pricePerDay,
            totalPrice: option.totalPrice,
          }))
      : [];

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

    const optionsTotal = selectedOptions.reduce(
      (sum, option) => sum + option.totalPrice,
      0
    );
    const totalPriceWithOptions = basePrice + optionsTotal;

    const bookingData: any = {
      vehicle: {
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        license: vehicle.license,
        imageUrl:
          (vehiclePhotos as any)?.exterior?.url ||
          (vehiclePhotos as any)?.other?.url ||
          (vehiclePhotos as any)?.side?.url,
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
        totalPrice: totalPriceWithOptions,
      },
      selectedOptions,
    };

    try {
      const subtotal = basePrice + optionsTotal;

      const bookingResult = await SupabaseBookingsService.createBooking({
        vehicleId: vehicle.id,
        renterId: currentUser!.id,
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
          title: t("motoDetails.errors.invalidDates.title", "Dates invalides"),
          description: t(
            "motoDetails.errors.invalidDates.description",
            "L’heure de fin doit être après l’heure de départ."
          ),
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
          currentRoute: `/hebergement/${vehicle.license}`,
          paymentMethod,
        };
        sessionStorage.setItem("pendingBooking", JSON.stringify(pendingBooking));

        const returnTo = `/hebergement/${vehicle.license}`;
        setPhoneReturnTo(returnTo);
        setPhoneGateSource("booking_confirmation");
        setPhone("");
        setPhoneError(null);
        setShowPhoneRequiredModal(true);
        return;
      }

      if (bookingResult.data) {
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
        bookingData.bookingId = bookingResult.data.id;
        sessionStorage.setItem("lagon_booking_data", JSON.stringify(bookingData));

        const bookingId = bookingResult.data.id;
        let url = `/hebergement/${vehicle.license}/booking/discussion?start=${startDate.toISOString()}&end=${endDate.toISOString()}`;
        if (bookingId) {
          url += `&bookingId=${bookingId}`;
        }

        navigate(url);
      } else if (bookingResult.error) {
        toast({
          title: t("motoDetails.errors.bookingError.title"),
          description:
            bookingResult.error || t("motoDetails.errors.bookingError.description"),
          variant: "destructive",
        });
        return;
      }
    } catch (error) {
      console.error(
        "❌ [DEBUG] Erreur lors de la création de la réservation (moto):",
        error
      );
      toast({
        title: t("motoDetails.errors.unexpectedError.title"),
        description: t("motoDetails.errors.unexpectedError.description"),
        variant: "destructive",
      });
      return;
    }
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
            <p className="text-muted-foreground">
              {t("accommodationDetails.loading", "Chargement de l'hébergement...")}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const primaryPhoto = photos.find((p) => p.isPrimary) || photos[0];
  const dailyRate = vehicle.dailyPrice;

  const originalRate = Math.round(dailyRate * 1.2);

  const nextPhoto = () => {
    setSelectedPhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setSelectedPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const PricingCard = ({ isMobile = false }: { isMobile?: boolean }) => (
    <Card className={`${isMobile ? "shadow-xl border-t" : "lg:shadow-lg"}`}>
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
              <span className="text-sm text-muted-foreground line-through">
                {formatClientInline(originalRate)}
              </span>
            </div>
            <p className="text-muted-foreground">
              {t("pricing.perNightShort", "par nuit")}
            </p>

            <Link
              to="/politique-annulation"
              className="mt-2 inline-flex items-center gap-1.5 text-xs text-success hover:underline"
            >
              <Clock className="h-3.5 w-3.5" />
              Annulation gratuite jusqu'à 48h avant l'arrivée
            </Link>

            {vehicleRentalInfo && (
              <div className="mt-3 pt-3 border-t border-muted">
                <p className="text-sm text-muted-foreground mb-1">
                  {t("booking.baseRateLabel")}
                </p>
                <DualPrice
                  amountMga={vehicleRentalInfo.totalCost}
                  variant="client"
                  primaryClassName="text-3xl font-bold text-primary"
                  secondaryClassName="text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  {formatLegacyFormattedPrice(t, vehicleRentalInfo, (mga) => formatClient(mga).primary)}
                </p>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  {t("booking.excludingFeesNote")}
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

          <Badge variant="secondary" className="w-full justify-center py-1">
            <CheckCircle className="h-4 w-4 mr-1" />
            {t("booking.freeCancellation")}
          </Badge>

          <a
            href={`${whatsappBaseUrl}?text=${encodeURIComponent(`Bonjour, j'ai une question sur ${vehicle ? vehicle.model : "cet hébergement"}${license ? ` (réf: ${license})` : ""}.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsAppFabEvent("whatsapp_pdp_click", { page_path: `/hebergement/${license}`, vehicle_ref: license ?? "" })}
            className="flex items-center justify-center gap-2 w-full rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700 hover:bg-green-100 transition-colors"
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            Une question avant de réserver ? Écris-nous sur WhatsApp
          </a>
        </div>
      </CardContent>
    </Card>
  );

  const seoInput = {
    model: vehicle.model,
    vehicleCategory: rawVehicleCategory ?? vehicle.vehicleCategory,
    description: vehicle.description,
    locationArea: vehicle.locationArea ?? null,
    location: vehicle.location,
    pricePerDay: vehicle.dailyPrice,
    license: license || vehicle.license,
    seats: vehicle.seats,
  };

  const canonical = buildAccommodationCanonical(seoInput.license);
  const h1Title = buildAccommodationH1Title(seoInput);
  const shortName = buildAccommodationShortName(seoInput);
  const ogImage = buildAccommodationOgImage(primaryPhoto?.url);
  const structuredData = buildAccommodationVacationRentalSchema({
    ...seoInput,
    canonical,
    images: photos.map((p) => p.url).filter(Boolean),
  });
  const breadcrumbSchema = buildAccommodationBreadcrumbSchema({
    shortName,
    canonical,
  });

  return (
    <div className={`min-h-screen flex flex-col bg-background ${hideMobileBookingBar ? "pb-0" : "pb-20"} lg:pb-0`}>
      <Seo
        title={buildAccommodationSeoTitle(seoInput)}
        description={buildAccommodationSeoDescription(seoInput)}
        canonical={canonical}
        ogImage={ogImage}
        structuredData={structuredData}
        extraStructuredData={breadcrumbSchema}
      />
      <main className="flex-1 py-4 md:py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("accommodationDetails.back", "Retour")}
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
                  <Link to="/">Location hébergement à Nosy Be</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{shortName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-4">
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                  <img
                    src={
                      photos[selectedPhotoIndex]?.url ||
                      primaryPhoto?.url ||
                      "https://images.unsplash.com/photo-1549924231-f129b911e442?w=800&h=600&fit=crop"
                    }
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    className="w-full h-full object-cover"
                  />
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

                {photos.length > 1 && (
                  <div className="grid grid-cols-6 gap-2">
                    {photos.slice(0, 6).map((photo, index) => (
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
                          src={photo.url}
                          alt={`Vue ${photo.angle}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:hidden mb-6">
                <PricingCard />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="secondary" className="text-sm">
                    {vehicle.license}
                  </Badge>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">5.0</span>
                      <span className="text-muted-foreground">(24 avis)</span>
                    </div>
                    <ShareButton
                      title={`${vehicle.brand} ${vehicle.model} — Hébergement à Nosy Be`}
                    />
                  </div>
                </div>

                <h1 className="text-3xl md:text-4xl font-bold mb-3">
                  {h1Title}
                </h1>

                <AccommodationHighlights
                  location={vehicle.location}
                  locationArea={vehicle.locationArea}
                  seats={vehicle.seats}
                  category={rawVehicleCategory ?? vehicle.vehicleCategory}
                />
                {(vehicle.hasAC || vehicle.hasPool || vehicle.nearBeach || vehicle.hasWifi || vehicle.hasPrivateBathroom || vehicle.hasSecurityGuard || vehicle.nearShoppingCenter || vehicle.nearNightlife || vehicle.hasEquippedKitchen || vehicle.hasSolarPanel || vehicle.hasHousekeeper || vehicle.hasLaundry || vehicle.hasRemoteWork || vehicle.hasCanalPlus) && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {vehicle.hasAC && (
                      <div className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        <Wind className="h-3 w-3 shrink-0" />
                        {t("accommodationDetails.hasAC", "Climatisation")}
                      </div>
                    )}
                    {vehicle.hasPool && (
                      <div className="flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
                        <Waves className="h-3 w-3 shrink-0" />
                        {t("accommodationDetails.hasPool", "Piscine")}
                      </div>
                    )}
                    {vehicle.nearBeach && (
                      <div className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                        <Umbrella className="h-3 w-3 shrink-0" />
                        {t("accommodationDetails.nearBeach", "Proche de la mer")}
                      </div>
                    )}
                    {vehicle.hasWifi && (
                      <div className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                        <Wifi className="h-3 w-3 shrink-0" />
                        {t("accommodationDetails.hasWifi", "WiFi")}
                      </div>
                    )}
                    {vehicle.hasPrivateBathroom && (
                      <div className="flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
                        <Bath className="h-3 w-3 shrink-0" />
                        {t("accommodationDetails.hasPrivateBathroom", "Salle de bain privative")}
                      </div>
                    )}
                    {vehicle.hasSecurityGuard && (
                      <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        <Shield className="h-3 w-3 shrink-0" />
                        {t("accommodationDetails.hasSecurityGuard", "Gardien sur place")}
                      </div>
                    )}
                    {vehicle.nearShoppingCenter && (
                      <div className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                        <ShoppingBag className="h-3 w-3 shrink-0" />
                        {t("accommodationDetails.nearShoppingCenter", "Proche centre commercial")}
                      </div>
                    )}
                    {vehicle.nearNightlife && (
                      <div className="flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                        <Music className="h-3 w-3 shrink-0" />
                        {t("accommodationDetails.nearNightlife", "Proche activités nocturnes")}
                      </div>
                    )}
                    {vehicle.hasEquippedKitchen && (
                      <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                        <UtensilsCrossed className="h-3 w-3 shrink-0" />
                        {t("accommodationDetails.hasEquippedKitchen", "Cuisine équipée")}
                      </div>
                    )}
                    {vehicle.hasSolarPanel && (
                      <div className="flex items-center gap-1.5 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700">
                        <Sun className="h-3 w-3 shrink-0" />
                        {t("accommodationDetails.hasSolarPanel", "Panneau solaire")}
                      </div>
                    )}
                    {vehicle.hasHousekeeper && (
                      <div className="flex items-center gap-1.5 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-medium text-fuchsia-700">
                        <Sparkles className="h-3 w-3 shrink-0" />
                        {t("accommodationDetails.hasHousekeeper", "Femme de ménage")}
                      </div>
                    )}
                    {vehicle.hasLaundry && (
                      <div className="flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                        <Shirt className="h-3 w-3 shrink-0" />
                        {t("accommodationDetails.hasLaundry", "Blanchisserie")}
                      </div>
                    )}
                    {vehicle.hasRemoteWork && (
                      <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                        <Laptop className="h-3 w-3 shrink-0" />
                        {t("accommodationDetails.hasRemoteWork", "Télétravail possible")}
                      </div>
                    )}
                    {vehicle.hasCanalPlus && (
                      <div className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                        <Tv className="h-3 w-3 shrink-0" />
                        {t("accommodationDetails.hasCanalPlus", "Canal+")}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <div className="w-full max-w-md">
                  {vehicle && (
                    <VehicleOwnerCard vehicleId={vehicle.id} className="w-full" />
                  )}
                </div>

                {vehicle.description && (
                  <div className="w-full min-w-0">
                    <Card className="h-full overflow-hidden">
                      <CardHeader className="pb-3 bg-gradient-to-r from-primary-soft/10 to-transparent">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Home className="h-5 w-5 text-primary" />
                          {t("accommodationDetails.descriptionTitle", "Description")}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 p-4 sm:p-5">
                        <TranslatableDescription
                          descriptionFr={vehicle.description}
                          descriptionEn={vehicle.descriptionEn}
                          descriptionDe={vehicle.descriptionDe}
                          descriptionIt={vehicle.descriptionIt}
                          renderContent={(text) => <ListingDescriptionContent content={text} />}
                        />
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {(vehicle.hasAC || vehicle.hasPool || vehicle.nearBeach || vehicle.hasWifi || vehicle.hasPrivateBathroom || vehicle.hasSecurityGuard || vehicle.nearShoppingCenter || vehicle.nearNightlife || vehicle.hasEquippedKitchen || vehicle.hasSolarPanel || vehicle.hasHousekeeper || vehicle.hasLaundry || vehicle.hasRemoteWork || vehicle.hasCanalPlus) && (
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3 bg-gradient-to-r from-primary-soft/10 to-transparent">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      {t("accommodationDetails.amenitiesTitle", "Équipements")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 p-4 sm:p-5">
                    <div className="flex flex-wrap gap-3">
                      {vehicle.hasAC && (
                        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                          <Wind className="h-4 w-4 text-blue-600 shrink-0" />
                          <span className="text-sm font-medium text-blue-800">
                            {t("accommodationDetails.hasAC", "Climatisation")}
                          </span>
                        </div>
                      )}
                      {vehicle.hasPool && (
                        <div className="flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2">
                          <Waves className="h-4 w-4 text-cyan-600 shrink-0" />
                          <span className="text-sm font-medium text-cyan-800">
                            {t("accommodationDetails.hasPool", "Piscine")}
                          </span>
                        </div>
                      )}
                      {vehicle.nearBeach && (
                        <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                          <Umbrella className="h-4 w-4 text-orange-600 shrink-0" />
                          <span className="text-sm font-medium text-orange-800">
                            {t("accommodationDetails.nearBeach", "Proche de la mer")}
                          </span>
                        </div>
                      )}
                      {vehicle.hasWifi && (
                        <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2">
                          <Wifi className="h-4 w-4 text-violet-600 shrink-0" />
                          <span className="text-sm font-medium text-violet-800">
                            {t("accommodationDetails.hasWifi", "WiFi")}
                          </span>
                        </div>
                      )}
                      {vehicle.hasPrivateBathroom && (
                        <div className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
                          <Bath className="h-4 w-4 text-teal-600 shrink-0" />
                          <span className="text-sm font-medium text-teal-800">
                            {t("accommodationDetails.hasPrivateBathroom", "Salle de bain privative")}
                          </span>
                        </div>
                      )}
                      {vehicle.hasSecurityGuard && (
                        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                          <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span className="text-sm font-medium text-emerald-800">
                            {t("accommodationDetails.hasSecurityGuard", "Gardien sur place")}
                          </span>
                        </div>
                      )}
                      {vehicle.nearShoppingCenter && (
                        <div className="flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2">
                          <ShoppingBag className="h-4 w-4 text-purple-600 shrink-0" />
                          <span className="text-sm font-medium text-purple-800">
                            {t("accommodationDetails.nearShoppingCenter", "Proche centre commercial")}
                          </span>
                        </div>
                      )}
                      {vehicle.nearNightlife && (
                        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                          <Music className="h-4 w-4 text-rose-600 shrink-0" />
                          <span className="text-sm font-medium text-rose-800">
                            {t("accommodationDetails.nearNightlife", "Proche activités nocturnes")}
                          </span>
                        </div>
                      )}
                      {vehicle.hasEquippedKitchen && (
                        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                          <UtensilsCrossed className="h-4 w-4 text-amber-600 shrink-0" />
                          <span className="text-sm font-medium text-amber-800">
                            {t("accommodationDetails.hasEquippedKitchen", "Cuisine équipée")}
                          </span>
                        </div>
                      )}
                      {vehicle.hasSolarPanel && (
                        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2">
                          <Sun className="h-4 w-4 text-yellow-600 shrink-0" />
                          <span className="text-sm font-medium text-yellow-800">
                            {t("accommodationDetails.hasSolarPanel", "Panneau solaire")}
                          </span>
                        </div>
                      )}
                      {vehicle.hasHousekeeper && (
                        <div className="flex items-center gap-2 rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-2">
                          <Sparkles className="h-4 w-4 text-fuchsia-600 shrink-0" />
                          <span className="text-sm font-medium text-fuchsia-800">
                            {t("accommodationDetails.hasHousekeeper", "Femme de ménage")}
                          </span>
                        </div>
                      )}
                      {vehicle.hasLaundry && (
                        <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
                          <Shirt className="h-4 w-4 text-sky-600 shrink-0" />
                          <span className="text-sm font-medium text-sky-800">
                            {t("accommodationDetails.hasLaundry", "Blanchisserie")}
                          </span>
                        </div>
                      )}
                      {vehicle.hasRemoteWork && (
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <Laptop className="h-4 w-4 text-slate-600 shrink-0" />
                          <span className="text-sm font-medium text-slate-800">
                            {t("accommodationDetails.hasRemoteWork", "Télétravail possible")}
                          </span>
                        </div>
                      )}
                      {vehicle.hasCanalPlus && (
                        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                          <Tv className="h-4 w-4 text-red-600 shrink-0" />
                          <span className="text-sm font-medium text-red-800">
                            {t("accommodationDetails.hasCanalPlus", "Canal+")}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Collapsible
                open={expandedSections.reviews}
                onOpenChange={() => toggleSection("reviews")}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span>{t("motoDetails.reviews.title")}</span>
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-lg font-bold">5.0</span>
                          </div>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${
                            expandedSections.reviews ? "rotate-90" : ""
                          }`}
                        />
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
                            <Progress
                              value={rating === 5 ? 90 : 0}
                              className="flex-1"
                            />
                            <span className="text-sm text-muted-foreground w-8">
                              {rating === 5 ? "22" : "0"}
                            </span>
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
                                    <Star
                                      key={star}
                                      className="h-3 w-3 fill-yellow-400 text-yellow-400"
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                {listingTerms.reviewSample1Meta}
                              </p>
                              <p className="text-sm">
                                {listingTerms.reviewSample1Text}
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
                                    <Star
                                      key={star}
                                      className="h-3 w-3 fill-yellow-400 text-yellow-400"
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-1">
                                {listingTerms.reviewSample2Meta}
                              </p>
                              <p className="text-sm">
                                {listingTerms.reviewSample2Text}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              <Collapsible
                open={expandedSections.legal}
                onOpenChange={() => toggleSection("legal")}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardTitle className="flex items-center justify-between">
                        {t("motoDetails.legal.title")}
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${
                            expandedSections.legal ? "rotate-90" : ""
                          }`}
                        />
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <p>
                          {t("motoDetails.legal.paragraph1")}
                        </p>
                        <p>
                          {t("motoDetails.legal.paragraph2")}
                        </p>
                        <div className="flex gap-4">
                          <Button
                            variant="link"
                            className="p-0 h-auto text-primary"
                          >
                            {t("motoDetails.legal.ctaConditions")}
                          </Button>
                          <Button
                            variant="link"
                            className="p-0 h-auto text-primary"
                          >
                            {t("motoDetails.legal.ctaMore")}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>

            <div className="hidden lg:block">
              <div className="sticky top-24 h-fit">
                <PricingCard />
              </div>
            </div>
          </div>
        </div>
      </main>

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
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {getVehicleCardTotalSummary(t, vehicleRentalInfo, (mga) => formatClient(mga).primary)}
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
                  <span className="text-sm text-muted-foreground">{t("pricing.perNightShort", "par nuit")}</span>
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

      {/* Panneau debug i18n - DEV uniquement */}

      <Footer />

      <CartAddModal
        isOpen={isCartAddModalOpen}
        onClose={() => setIsCartAddModalOpen(false)}
        pricePerDay={vehicle?.dailyPrice ?? 0}
        vehicleLabel={vehicle?.model ?? ""}
        vehicleThumbnail={photos.length > 0 ? photos[0].url : undefined}
        dateLocale={dateLocale}
        t={t}
        onAddToCart={doAddToCart}
        showDeliveryOptions={false}
        initialStartDate={navigationState?.rentalCalculation?.startDate ?? null}
        initialEndDate={navigationState?.rentalCalculation?.endDate ?? null}
      />

      {vehicle && navigationState?.rentalCalculation && (
        <BookingConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => setShowConfirmationModal(false)}
          onConfirm={handleConfirmBooking}
          listingKind="accommodation"
          vehicle={{
            id: vehicle.id,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            imageUrl: photos.length > 0 ? photos[0].url : undefined,
            category: vehicle.vehicleType ?? "accommodation",
            vehicleType: vehicle.vehicleType ?? "accommodation",
          }}
          rentalInfo={{
            pickupLocation: getBookingDraft()?.pickupLocation || navigationState.pickupLocation || t("motoDetails.notSpecified"),
            returnLocation: getBookingDraft()?.returnLocation,
            startDate: new Date(navigationState.startDate!),
            endDate: new Date(navigationState.endDate!),
            startTime: navigationState.startTime!,
            endTime: navigationState.endTime!,
            rentalDays: navigationState.rentalCalculation.rentalDays,
            pricePerDay: dailyRate,
            basePrice: vehicleRentalInfo?.totalCost || 0,
          }}
          selectedOptions={[]}
        />
      )}

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


