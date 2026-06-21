import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getPublicListingPath } from "@/utils/vehicleType";
import { useTranslation } from "react-i18next";
import { 
  ArrowLeft,
  MapPin, 
  Euro, 
  Users,
  Calendar,
  Fuel,
  Settings,
  Wind,
  Clock,
  Info,
  CheckCircle,
  Car,
  Send,
  MessageCircle,
  FileText,
  AlertCircle,
  CreditCard,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Footer } from "@/components/layout/footer";
import { Vehicle, Photo, Message as MessageType, Conversation, User } from "@/types";
import { VehiclesService, PhotosService, ConversationsService, MessagesService } from "@/services";
import { PhotoService } from "@/services/supabase/photos";
import { SupabaseVehiclesService } from "@/services/supabaseVehiclesService";
import { ProfileService } from "@/services/supabase/profile";
import { supabase } from "@/integrations/supabase/client";
import { getBookingDraft } from "@/services/localStorage/bookingStorage";
import { toast } from "@/hooks/use-toast";
import { PaymentFlowModal, type ReservationPayment } from "@/components/PaymentFlowModal";
import { payerLocation } from "@/lib/payerLocation";
import { formatBillableDays } from "@/utils/formatDuration";
import { getBookingRentalPricing } from "@/utils/rentalPriceFromDates";
import {
  buildReservationPaymentFromBooking,
  isCashOnSitePayment,
  getPaymentMethodFromBooking,
  getRenterPaymentAmountsFromBooking,
} from "@/utils/renterPaymentFromBooking";
import { useExchangeRate } from "@/contexts/ExchangeRateContext";
import { ANALYTICS_BOOKING_CURRENCY, trackGa4Event } from "@/lib/analytics";
import { ClientMgaPrice } from "@/components/currency/ClientMgaPrice";

const BookingDiscussion = () => {
  console.log('💬 [DEBUG] BookingDiscussion component rendering');
  
  const navigate = useNavigate();
  const { license } = useParams<{ license: string }>();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { formatClient, formatClientInline } = useExchangeRate();

  // Mapper simple entre langue i18n et locale de formatage dates/heures
  const getDateLocale = (lng?: string): string => {
    const base = (lng || "en").split("-")[0];
    switch (base) {
      case "fr":
        return "fr-FR";
      case "it":
        return "it-IT";
      case "de":
        return "de-DE";
      case "en":
      default:
        return "en-GB";
    }
  };

  if (import.meta.env.DEV) {
    // Logs DEV-only pour diagnostic i18n runtime complet
    // eslint-disable-next-line no-console
    
    // A. Infos i18n runtime
    const i18nDebugInfo = {
      language: i18n.language,
      languages: i18n.languages,
      resolvedLanguage: i18n.resolvedLanguage,
      defaultNS: i18n.options?.defaultNS,
      fallbackLng: i18n.options?.fallbackLng,
      ns: i18n.options?.ns,
      isInitialized: i18n.isInitialized,
      storeDataKeys: i18n.store?.data ? Object.keys(i18n.store.data) : [],
    };
    
    // B. Existence + valeur pour des clés critiques
    const criticalKeys = [
      "motoDetails.back",
      "motoDetails.notSpecified",
      "loading",
      "error",
      "booking.discussion.withRenter",
      "booking.discussion.withOwner",
      "booking.discussion.role.owner",
      "booking.discussion.role.renter",
      "booking.discussion.messagePlaceholder",
      "booking.discussion.toasts.messageSent.title",
      "booking.discussion.toasts.messageSent.description",
    ];
    
    const keyDebugInfo: Record<string, any> = {};
    criticalKeys.forEach((key) => {
      const exists = i18n.exists(key);
      keyDebugInfo[key] = {
        exists,
        value: exists ? t(key) : `[MISSING_KEY: ${key}]`,
        valueFr: exists ? t(key, { lng: 'fr' }) : `[MISSING_KEY: ${key}]`,
        valueEn: exists ? t(key, { lng: 'en' }) : `[MISSING_KEY: ${key}]`,
      };
    });
    
    // C. Vérif des ressources chargées (langues)
    const resourcesDebug: Record<string, any> = {};
    ['fr', 'en', 'it', 'de'].forEach((lang) => {
      const langData = i18n.store?.data?.[lang];
      resourcesDebug[lang] = {
        exists: typeof langData !== 'undefined',
        namespaces: langData ? Object.keys(langData) : [],
      };
    });
    
    const currentLangData = i18n.store?.data?.[i18n.language];
    const currentLangNamespaces = currentLangData ? Object.keys(currentLangData) : [];
    
    console.log("[i18n DEV][BookingDiscussion] === DIAGNOSTIC RUNTIME ===");
    console.log("[i18n DEV][BookingDiscussion] A. Infos i18n runtime:", i18nDebugInfo);
    console.log("[i18n DEV][BookingDiscussion] B. Clés critiques:", keyDebugInfo);
    console.log("[i18n DEV][BookingDiscussion] C. Ressources chargées:", resourcesDebug);
    console.log("[i18n DEV][BookingDiscussion] C. Namespaces pour langue actuelle:", {
      language: i18n.language,
      namespaces: currentLangNamespaces,
    });
    console.log("[i18n DEV][BookingDiscussion] === FIN DIAGNOSTIC ===");
  }
  
  console.log('💬 [DEBUG] License from useParams:', license);
  console.log('💬 [DEBUG] Search params:', Object.fromEntries(searchParams.entries()));
  console.log('💬 [DEBUG] Current URL:', window.location.href);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [vehicleImageUrl, setVehicleImageUrl] = useState<string | null>(null);
  const [vehiclePhotos, setVehiclePhotos] = useState<{ [key: string]: Photo }>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [owner, setOwner] = useState<User | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isRenter, setIsRenter] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<any>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [isConversationCancelled, setIsConversationCancelled] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  // États pour la modale de paiement
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [reservationForPayment, setReservationForPayment] = useState<ReservationPayment | null>(null);
  const [step1Complete, setStep1Complete] = useState(false);
  const [bookingData, setBookingData] = useState<{
    vehicle: {
      brand: string;
      model: string;
      year: number;
      color?: string;
      license: string;
      imageUrl?: string;
    };
    rentalInfo: {
      pickupLocation: string;
      returnLocation?: string;
      startDate: string;
      endDate: string;
      startTime: string;
      endTime: string;
      rentalDays: number;
      pricePerDay: number;
      basePrice: number;
      optionsTotal: number;
      totalPrice: number;
    };
    selectedOptions: Array<{
      name: string;
      pricePerDay: number;
      totalPrice: number;
    }>;
  } | null>(null);

  // Récupération des dates et de l'ID de réservation depuis les paramètres d'URL
  const startDate = searchParams.get('start') || '';
  const endDate = searchParams.get('end') || '';
  const bookingIdFromUrl = searchParams.get('bookingId') || null;

  useEffect(() => {
    const loadData = async () => {
      console.log('🚗 [DEBUG] ===== DÉBUT loadData =====');
      console.log('🚗 [DEBUG] License:', license);
      
      if (!license) {
        console.log('❌ [DEBUG] Pas de license, redirection vers /');
        navigate('/');
        return;
      }

      try {
        // Charger l'utilisateur actuel
        const profileResult = await ProfileService.getCurrentUserProfile();
        if (profileResult.error || !profileResult.data) {
          console.log('❌ [DEBUG] Utilisateur non connecté');
          // TODO(i18n): UNCERTAIN mapping -> motoDetails.errors.loginRequired.description (vérifier contexte)
          toast({
            title: t("error"),
            description: "Vous devez être connecté pour faire une réservation",
            variant: "destructive",
          });
          navigate('/auth/login');
          return;
        }
        setCurrentUserId(profileResult.data.id);
        setCurrentUser(profileResult.data);

        console.log('🚗 [DEBUG] Chargement de tous les véhicules...');
        
        // Charger le véhicule par license (même service que VehicleDetails)
        const allVehicles = await SupabaseVehiclesService.getAvailableVehicles();
        console.log('🚗 [DEBUG] Véhicules chargés:', allVehicles.length);
        
        // Trouver le véhicule qui correspond à la license (même logique que VehicleDetails)
        const foundVehicle = allVehicles.find(v => v.id.substring(0, 8).toUpperCase() === license.toUpperCase());
        console.log('🚗 [DEBUG] Véhicule trouvé:', foundVehicle);
        
        if (!foundVehicle) {
          console.log('❌ [DEBUG] Véhicule non trouvé, redirection vers /');
          toast({
            title: t("motoDetails.errors.vehicleNotFound.title"),
            description: t("motoDetails.errors.vehicleNotFound.description"),
            variant: "destructive",
          });
          navigate('/');
          return;
        }

        // Convertir le véhicule Supabase vers l'interface Vehicle (même logique que VehicleDetails)
        const mappedVehicle: Vehicle = {
          id: foundVehicle.id,
          ownerId: foundVehicle.owner_id || "",
          license: license,
          brand: foundVehicle.brand,
          model: foundVehicle.model,
          color: foundVehicle.color || "Non spécifié",
          fuel: (foundVehicle.fuel_type as any) || "gasoline",
          year: foundVehicle.year,
          hasAC: true, // À ajouter dans la DB plus tard
          doors: foundVehicle.seats || 5,
          transmission: (foundVehicle.transmission as any) || "manual",
          mileage: foundVehicle.mileage || 0,
          dailyPrice: foundVehicle.price_per_day,
          currency: "EUR",
          latitude: 0, // À ajouter dans la DB plus tard
          longitude: 0, // À ajouter dans la DB plus tard
          status: "available" as any,
          description: foundVehicle.description || undefined,
          location: foundVehicle.location || undefined,
          createdAt: foundVehicle.created_at || new Date().toISOString(),
          updatedAt: foundVehicle.updated_at || new Date().toISOString(),
          vehicleType: (foundVehicle.vehicle_type as Vehicle["vehicleType"]) ?? "car",
        };

        console.log('📸 [DEBUG] ===== IMAGE_URL DU VÉHICULE =====');
        console.log('📸 [DEBUG] foundVehicle.image_url:', foundVehicle.image_url);
        console.log('📸 [DEBUG] ===== FIN IMAGE_URL =====');

        // Stocker l'image_url du véhicule
        setVehicleImageUrl(foundVehicle.image_url || null);
        setVehicle(mappedVehicle);
        
        // Déterminer le rôle de l'utilisateur
        const vehicleOwnerId = foundVehicle.owner_id || "";
        setOwnerId(vehicleOwnerId);
        
        const userIsOwner = profileResult.data.id === vehicleOwnerId;
        const userIsRenter = !userIsOwner; // Pour l'instant, si ce n'est pas le propriétaire, c'est le locataire
        
        setIsOwner(userIsOwner);
        setIsRenter(userIsRenter);
        
        console.log('👤 [DEBUG] ===== DÉTECTION DU RÔLE =====');
        console.log('👤 [DEBUG] currentUserId:', profileResult.data.id);
        console.log('👤 [DEBUG] vehicleOwnerId:', vehicleOwnerId);
        console.log('👤 [DEBUG] isOwner:', userIsOwner);
        console.log('👤 [DEBUG] isRenter:', userIsRenter);
        console.log('👤 [DEBUG] ===== FIN DÉTECTION =====');

        // Récupérer les données de réservation depuis Supabase (priorité) ou sessionStorage
        try {
          // Essayer de charger depuis Supabase (réservation la plus récente pour ce véhicule)
          const { data: bookings, error: bookingsError } = await supabase
            .from('bookings')
            .select('*')
            .eq('vehicle_id', foundVehicle.id)
            .eq('user_id', profileResult.data.id)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (!bookingsError && bookings && bookings.length > 0) {
            const latestBooking = bookings[0];
            setCurrentBooking(latestBooking);
            setBookingStatus(latestBooking.status);
            setIsConversationCancelled(latestBooking.status === 'cancelled' || latestBooking.status === 'rejected');
            console.log('✅ [BookingDiscussion] Réservation trouvée dans Supabase:', latestBooking);
            console.log('✅ [BookingDiscussion] Statut de la réservation:', latestBooking.status);
            
            // Reconstruire bookingData depuis Supabase
            const reconstructedBookingData = {
              vehicle: {
                brand: foundVehicle.brand,
                model: foundVehicle.model,
                year: foundVehicle.year,
                color: foundVehicle.color || 'Non spécifié',
                license: license || 'N/A',
                imageUrl: undefined // Sera rempli par les photos
              },
              rentalInfo: {
                pickupLocation: latestBooking.pickup_location || 'Non spécifié',
                returnLocation: latestBooking.return_location || latestBooking.pickup_location || 'Non spécifié',
                startDate: latestBooking.start_date,
                endDate: latestBooking.end_date,
                startTime: latestBooking.start_time || '06:30',
                endTime: latestBooking.end_time || '14:00',
                rentalDays: latestBooking.rental_days || 0,
                pricePerDay: latestBooking.price_per_day || 0,
                basePrice: latestBooking.base_price || 0,
                optionsTotal: latestBooking.options_total || 0,
                totalPrice: latestBooking.total_price || 0
              },
              selectedOptions: latestBooking.selected_options ? JSON.parse(latestBooking.selected_options) : []
            };
            
            setBookingData(reconstructedBookingData);
            console.log('✅ [BookingDiscussion] bookingData reconstruit:', reconstructedBookingData);
          }
        } catch (error) {
          console.error('❌ [BookingDiscussion] Erreur lors du chargement depuis Supabase:', error);
        }
        
        // Fallback sur sessionStorage si Supabase n'a pas retourné de données
        const storedBookingData = sessionStorage.getItem('lagon_booking_data');
        if (storedBookingData && !bookingData) {
          try {
            const parsedData = JSON.parse(storedBookingData);
            setBookingData(parsedData);
            console.log('📋 [DEBUG] Données de réservation récupérées depuis sessionStorage:', parsedData);
          } catch (error) {
            console.error('❌ [DEBUG] Erreur lors du parsing des données de réservation:', error);
          }
        }

        // TESTER avec les vraies photos Supabase
        console.log('📸 [DEBUG] Test des vraies photos Supabase...');
        console.log('📸 [DEBUG] Véhicule ID:', foundVehicle.id);
        
        try {
          // FORCER l'utilisation du PhotoService corrigé
          console.log('📸 [DEBUG] ===== DÉBUT PhotoService corrigé =====');
          console.log('📸 [DEBUG] Vehicle ID:', foundVehicle.id);
          
          const vehiclePhotos = await PhotoService.getVehiclePhotos(foundVehicle.id);
          console.log('📸 [DEBUG] Photos Supabase récupérées:', vehiclePhotos.data);
          console.log('📸 [DEBUG] Nombre de photos Supabase:', vehiclePhotos.data?.length || 0);
          console.log('📸 [DEBUG] ===== FIN PhotoService corrigé =====');
          
          if (vehiclePhotos.data && vehiclePhotos.data.length > 0) {
            const primaryPhoto = vehiclePhotos.data.find(photo => photo.isPrimary) || vehiclePhotos.data[0];
            console.log('📸 [DEBUG] Photo principale Supabase trouvée:', primaryPhoto);
            console.log('📸 [DEBUG] URL de la photo Supabase:', primaryPhoto.url);
            
            // Convertir vers le format Photo de l'application
            const convertedPhoto = {
              id: primaryPhoto.id,
              vehicleId: primaryPhoto.vehicleId,
              url: primaryPhoto.url,
              angle: primaryPhoto.photoType === 'frontLeft' ? 'front' :
                     primaryPhoto.photoType === 'profileLeft' ? 'side' :
                     primaryPhoto.photoType === 'interior' ? 'interior' : 'other',
              position: primaryPhoto.position,
              isPrimary: primaryPhoto.isPrimary,
              createdAt: new Date().toISOString()
            };
            
            setVehiclePhotos({ [foundVehicle.id]: convertedPhoto });
            // Mettre à jour vehicleImageUrl avec la photo principale
            setVehicleImageUrl(primaryPhoto.url);
          } else {
            console.log('📸 [DEBUG] FORCE - Utilisation de la vraie photo Supabase !');
            // FORCER l'URL directe de la vraie photo Supabase (construction dynamique depuis env)
            const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
            const storagePath = 'vehicle-photos/exterior_1759781792034_lm9xwpqf8e.jpg';
            const photoUrl = SUPABASE_URL 
              ? `${SUPABASE_URL}/storage/v1/object/public/${storagePath}`
              : `https://picsum.photos/200/150?random=${foundVehicle.id}`; // Fallback si URL manquante
            
            const realSupabasePhoto = {
              id: `real-supabase-${foundVehicle.id}`,
              vehicleId: foundVehicle.id,
              url: photoUrl,
              isPrimary: true
            };
            console.log('📸 [DEBUG] URL forcée:', realSupabasePhoto.url);
            setVehiclePhotos({ [foundVehicle.id]: realSupabasePhoto });
          }
        } catch (photoError) {
          console.error('📸 [DEBUG] Erreur PhotoService Supabase:', photoError);
          console.log('📸 [DEBUG] Fallback vers Picsum');
          const fallbackPhoto = {
            id: `fallback-${foundVehicle.id}`,
            vehicleId: foundVehicle.id,
            url: `https://picsum.photos/200/150?random=${foundVehicle.id}`,
            isPrimary: true
          };
          setVehiclePhotos({ [foundVehicle.id]: fallbackPhoto });
        }
      } catch (error) {
        console.error('Erreur lors du chargement du véhicule:', error);
        toast({
          title: t("error"),
          description: t("motoDetails.errors.loadError.description"),
          variant: "destructive",
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [license, navigate]);

  // Log DEV-only pour détecter les changements de langue
  useEffect(() => {
    if (import.meta.env.DEV) {
      // Stocker la langue précédente
      let previousLanguage = i18n.language;
      
      const handleLanguageChanged = (lng: string) => {
        // eslint-disable-next-line no-console
        console.log("[i18n DEV][BookingDiscussion] === CHANGEMENT DE LANGUE ===");
        // eslint-disable-next-line no-console
        console.log("[i18n DEV][BookingDiscussion] Langue précédente:", previousLanguage);
        // eslint-disable-next-line no-console
        console.log("[i18n DEV][BookingDiscussion] Nouvelle langue:", lng);
        // eslint-disable-next-line no-console
        console.log("[i18n DEV][BookingDiscussion] === FIN CHANGEMENT ===");
        previousLanguage = lng;
      };
      
      i18n.on('languageChanged', handleLanguageChanged);
      
      return () => {
        i18n.off('languageChanged', handleLanguageChanged);
      };
    }
  }, [i18n]);

  // Scroll vers le dernier message - DÉSACTIVÉ
  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [messages]);

  // Charger l'utilisateur connecté et créer/récupérer la conversation
  useEffect(() => {
    const loadConversation = async () => {
      if (!vehicle) return;

      try {
        // Récupérer l'utilisateur connecté
        const userResult = await ProfileService.getCurrentUserProfile();
        if (userResult.error || !userResult.data) {
          // TODO(i18n): UNCERTAIN mapping -> motoDetails.errors.loginRequired.title (vérifier contexte)
          toast({
            title: t("error"),
            description: "Vous devez être connecté",
            variant: "destructive",
          });
          navigate('/auth/login');
          return;
        }

        setCurrentUserId(userResult.data.id);
        setOwnerId(vehicle.ownerId);

        // Charger les informations du propriétaire
        if (vehicle.ownerId) {
          try {
            const { data: ownerProfile, error: ownerError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', vehicle.ownerId)
              .single();

            if (!ownerError && ownerProfile) {
              const ownerUser: User = {
                id: ownerProfile.id,
                email: ownerProfile.email || '',
                firstName: ownerProfile.first_name || '',
                lastName: ownerProfile.last_name || '',
                phone: ownerProfile.phone || undefined,
                bio: ownerProfile.bio || undefined,
                roles: ownerProfile.role ? [ownerProfile.role] : ['owner'],
                kycStatus: ownerProfile.kyc_status || 'pending',
                avatarUrl: ownerProfile.avatar_url || undefined,
              };
              setOwner(ownerUser);
              console.log('✅ [BookingDiscussion] Propriétaire chargé:', ownerUser);
            }
          } catch (error) {
            console.error('❌ [BookingDiscussion] Erreur lors du chargement du propriétaire:', error);
          }
        }

        // Détecter si l'utilisateur est le propriétaire ou le locataire
        const isCurrentUserOwner = userResult.data.id === vehicle.ownerId;
        
        // Si c'est le propriétaire, il faut récupérer le renterId depuis une réservation
        let renterId = userResult.data.id;
        if (isCurrentUserOwner && bookingIdFromUrl) {
          // Récupérer le booking spécifique depuis l'URL
          const { data: specificBooking } = await supabase
            .from('bookings')
            .select('user_id')
            .eq('id', bookingIdFromUrl)
            .single();
          
          if (specificBooking?.user_id) {
            renterId = specificBooking.user_id;
          }
        } else if (isCurrentUserOwner) {
          // Fallback: Récupérer le dernier booking pour ce véhicule pour connaître le renter
          const { data: latestBooking } = await supabase
            .from('bookings')
            .select('user_id')
            .eq('vehicle_id', vehicle.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (latestBooking?.user_id) {
            renterId = latestBooking.user_id;
          }
        }
        
        // Récupérer ou créer la conversation avec les bons IDs selon le rôle
        // Utiliser bookingIdFromUrl pour créer une conversation unique par réservation
        // IMPORTANT: Si on a un bookingId, essayer d'abord de RÉCUPÉRER la conversation existante
        // pour éviter de créer des conversations en double dans les pages de liste
        let convResult;
        
        if (bookingIdFromUrl) {
          // Essayer d'abord de récupérer la conversation existante (READ-ONLY)
          const existingConv = await ConversationsService.getConversationByBookingId(bookingIdFromUrl);
          
          if (existingConv.data) {
            // Conversation existante trouvée, pas besoin de créer
            console.log('[BookingDiscussion] Conversation existante trouvée pour booking:', bookingIdFromUrl);
            convResult = existingConv;
          } else {
            // Pas de conversation existante, créer une nouvelle (action métier: ouverture de discussion)
            console.log('[BookingDiscussion] Aucune conversation trouvée, création pour booking:', bookingIdFromUrl);
            convResult = await ConversationsService.getOrCreateConversation({
              vehicleId: vehicle.id,
              renterId: renterId,
              ownerId: vehicle.ownerId,
              bookingId: bookingIdFromUrl,
            });
          }
        } else {
          // Pas de bookingId dans l'URL, utiliser getOrCreateConversation (compatibilité arrière)
          convResult = await ConversationsService.getOrCreateConversation({
            vehicleId: vehicle.id,
            renterId: renterId,
            ownerId: vehicle.ownerId,
            bookingId: bookingIdFromUrl || undefined,
          });
        }

        if (convResult.error || !convResult.data) {
          console.error('Erreur conversation:', convResult.error);
          return;
        }

        setConversation(convResult.data);

        // Vérifier le statut de la réservation si conversation liée à un booking
        if (convResult.data.bookingId) {
          try {
            const { data: booking } = await supabase
              .from('bookings')
              .select('*')
              .eq('id', convResult.data.bookingId)
              .single();

            if (booking) {
              setBookingStatus(booking.status);
              setIsConversationCancelled(booking.status === 'cancelled' || booking.status === 'rejected');
              // Toujours mettre à jour le booking pour avoir le statut à jour
              setCurrentBooking(booking);
              console.log('✅ [BookingDiscussion] Booking chargé depuis la conversation:', booking);
              console.log('✅ [BookingDiscussion] Statut du booking:', booking.status);
            }
          } catch (error) {
            console.error('Erreur chargement statut réservation:', error);
          }
        }
        
        // Charger les messages existants
        const messagesResult = await MessagesService.getConversationMessages(convResult.data.id);
        if (!messagesResult.error && messagesResult.data) {
          // Trier les messages par date (du plus ancien au plus récent)
          const sortedMessages = [...messagesResult.data].sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          setMessages(sortedMessages);
          console.log('✅ [BookingDiscussion] Messages chargés:', sortedMessages.length);
          console.log('✅ [BookingDiscussion] Messages:', sortedMessages.map(m => ({ id: m.id, content: m.content.substring(0, 50), senderId: m.senderId, createdAt: m.createdAt })));
        }

        // S'abonner aux changements de messages en temps réel (INSERT + DELETE)
        const subscription = MessagesService.subscribeToMessagesWithCallbacks({
          conversationId: convResult.data.id,
          onInsert: (newMessage) => {
            console.log('📨 [BookingDiscussion] Nouveau message reçu:', { id: newMessage.id, content: newMessage.content.substring(0, 50), senderId: newMessage.senderId });
            setMessages((prev) => {
              const updated = [...prev, newMessage];
              // Trier par date après l'insertion
              return updated.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            });
          },
          onDelete: (deletedMessageId) => {
            // Retirer le message supprimé de la liste
            setMessages((prev) => prev.filter(msg => msg.id !== deletedMessageId));
            console.log('🗑️ [BookingDiscussion] Message supprimé en temps réel:', deletedMessageId);
          }
        });

        // S'abonner aux changements de la conversation en temps réel
        // (pour détecter si la conversation est supprimée)
        const conversationSubscription = ConversationsService.subscribeToConversation(
          convResult.data.id,
          (event) => {
            if (event === 'deleted') {
              console.log('🗑️ [BookingDiscussion] Conversation supprimée en temps réel');
              toast({
                title: t("booking.discussion.toasts.bookingCancelled.title"),
                description: t("booking.discussion.toasts.bookingCancelled.description"),
                variant: 'destructive',
              });
              // Rediriger vers la page du véhicule ou les réservations
              setTimeout(() => {
                navigate(getPublicListingPath(mappedVehicle));
              }, 2000);
            }
          }
        );

        // S'abonner aux changements de statut du booking en temps réel
        let bookingSubscription: any = null;
        if (convResult.data.bookingId) {
          bookingSubscription = supabase
            .channel(`booking:${convResult.data.bookingId}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'bookings',
                filter: `id=eq.${convResult.data.bookingId}`,
              },
              (payload) => {
                console.log('🔄 [BookingDiscussion] Booking mis à jour en temps réel:', payload.new);
                const updatedBooking = payload.new as any;
                setCurrentBooking(updatedBooking);
                setBookingStatus(updatedBooking.status);
                setIsConversationCancelled(updatedBooking.status === 'cancelled' || updatedBooking.status === 'rejected');
              }
            )
            .subscribe();
        }

        // Nettoyer tous les abonnements au démontage
        return () => {
          MessagesService.unsubscribe(subscription);
          ConversationsService.unsubscribe(conversationSubscription);
          if (bookingSubscription) {
            bookingSubscription.unsubscribe();
          }
        };
      } catch (error) {
        console.error('Erreur loadConversation:', error);
      }
    };

    loadConversation();
  }, [vehicle, navigate, currentBooking]);

  const formatDate = (date: string) => {
    const locale = getDateLocale(i18n.language);
    const formatted = new Date(date).toLocaleDateString(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[i18n DEV][BookingDiscussion] formatDate:", {
        input: date,
        localeUsed: locale,
        i18nLanguage: i18n.language,
        output: formatted,
        note: `Locale calculée depuis i18n.language (i18n.language=${i18n.language})`,
      });
    }
    
    return formatted;
  };

  const formatTime = (date: string) => {
    const locale = getDateLocale(i18n.language);
    const formatted = new Date(date).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[i18n DEV][BookingDiscussion] formatTime:", {
        input: date,
        localeUsed: locale,
        i18nLanguage: i18n.language,
        output: formatted,
        note: `Locale calculée depuis i18n.language (i18n.language=${i18n.language})`,
      });
    }
    
    return formatted;
  };

  // Fonction pour formater les options supplémentaires depuis bookingData
  const formatSelectedServices = () => {
    if (!bookingData?.selectedOptions || bookingData.selectedOptions.length === 0) {
      return null;
    }
    
    return bookingData.selectedOptions
      .map(option => `• ${option.name}${option.totalPrice > 0 ? ` (+${formatClientInline(option.totalPrice)})` : ''}`)
      .join('\n');
  };

  const fuelIcons = {
    gasoline: Fuel,
    diesel: Fuel,
    electric: Fuel,
    hybrid: Fuel
  };

  const calculateTotalPrice = () => {
    if (currentBooking) {
      const dbAmounts = getRenterPaymentAmountsFromBooking(currentBooking);
      if (dbAmounts.amountTotalExpected > 0) {
        return dbAmounts.amountTotalExpected;
      }
      if (dbAmounts.subtotal > 0) {
        return dbAmounts.subtotal;
      }
    }

    if (currentBooking && vehicle) {
      const pricing = getBookingRentalPricing({
        pricePerDay: vehicle.dailyPrice,
        startDate: currentBooking.start_date,
        endDate: currentBooking.end_date,
        startTime: currentBooking.start_time,
        endTime: currentBooking.end_time,
      });

      if (pricing) {
        const optionsTotal =
          currentBooking?.options_total || bookingData?.rentalInfo?.optionsTotal || 0;
        return pricing.basePrice + optionsTotal;
      }
    }

    if (currentBooking?.total_price) {
      return Number(currentBooking.total_price);
    }

    if (bookingData?.rentalInfo?.totalPrice) {
      return bookingData.rentalInfo.totalPrice;
    }

    if (!startDate || !endDate || !vehicle) return 0;

    const pricing = getBookingRentalPricing({
      pricePerDay: vehicle.dailyPrice,
      startDate,
      endDate,
      startTime: bookingData?.rentalInfo?.startTime,
      endTime: bookingData?.rentalInfo?.endTime,
    });
    const basePrice = pricing?.basePrice ?? 0;
    const optionsTotal = bookingData?.rentalInfo?.optionsTotal || 0;
    return basePrice + optionsTotal;
  };

  const calculateRealDuration = () => {
    let pricing = null;

    if (currentBooking) {
      pricing = getBookingRentalPricing({
        pricePerDay: vehicle?.dailyPrice ?? 0,
        startDate: currentBooking.start_date,
        endDate: currentBooking.end_date,
        startTime: currentBooking.start_time,
        endTime: currentBooking.end_time,
      });
    } else if (bookingData?.rentalInfo) {
      pricing = getBookingRentalPricing({
        pricePerDay: vehicle?.dailyPrice ?? bookingData.rentalInfo.basePrice ?? 0,
        startDate: bookingData.rentalInfo.startDate,
        endDate: bookingData.rentalInfo.endDate,
        startTime: bookingData.rentalInfo.startTime,
        endTime: bookingData.rentalInfo.endTime,
      });
    }

    if (!pricing) {
      return t("duration.day", { count: 1 });
    }

    const result =
      formatBillableDays(t, pricing.billableDays) ??
      t("duration.day", { count: 1 });

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[i18n DEV][BookingDiscussion] calculateRealDuration:", {
        billableDays: pricing.billableDays,
        rentalHours: pricing.rentalHours,
        result,
      });
    }

    return result;
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !conversation || !currentUserId) return;
    
    try {
      const result = await MessagesService.sendMessage({
        conversationId: conversation.id,
        senderId: currentUserId,
        content: message.trim(),
        messageType: 'text',
      });

      if (result.error) {
        toast({
          title: t("error"),
          description: t("booking.discussion.toasts.sendMessageError"),
          variant: "destructive",
        });
        return;
      }

      setMessage("");
      
      toast({
        title: t("booking.discussion.toasts.messageSent.title"),
        description: t("booking.discussion.toasts.messageSent.description"),
      });
    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast({
        title: t("error"),
        description: t("booking.discussion.toasts.unexpectedError"),
        variant: "destructive",
      });
    }
  };

  const handlePayNow = () => {
    console.log('[BookingDiscussion] handlePayNow called', { 
      hasBooking: !!currentBooking, 
      hasVehicle: !!vehicle,
      bookingId: currentBooking?.id,
      bookingStatus: currentBooking?.status
    });
    
    if (!currentBooking || !vehicle) {
      console.warn('[BookingDiscussion] handlePayNow: missing currentBooking or vehicle', {
        currentBooking,
        vehicle
      });
      toast({
        title: t("error"),
        description: t("booking.discussion.toasts.loadBookingError"),
        variant: "destructive",
      });
      return;
    }

    // Utiliser les valeurs DB (source de vérité) au lieu de recalculer
    // Le booking a déjà base_price, options_total, subtotal stockés en DB
    const base = Number(currentBooking.base_price || 0);
    const optionsTotal = Number(currentBooking.options_total || 0);
    const subtotalDB = Number(currentBooking.subtotal || 0);
    
    // Valider que subtotal est disponible (obligatoire en DB)
    if (!subtotalDB || subtotalDB <= 0) {
      console.error('[BookingDiscussion] handlePayNow: subtotal invalide en DB', {
        bookingId: currentBooking.id,
        base_price: base,
        options_total: optionsTotal,
        subtotal: subtotalDB
      });
      toast({
        title: t("error"),
        description: "Impossible de récupérer les informations de prix depuis la base de données.",
        variant: "destructive",
      });
      return;
    }
    
    // Calculer la durée pour l'affichage
    const start = new Date(currentBooking.start_date);
    const end = new Date(currentBooking.end_date);
    const hours = (end.getTime() - start.getTime()) / (1000*60*60);
    const days = Math.max(1, Math.ceil(hours / 24));
    
    // Extras issus des options sélectionnées (pour affichage uniquement)
    const selectedExtras: Array<{ label: string; price: number }> = currentBooking.selected_options 
      ? JSON.parse(currentBooking.selected_options).map((opt: any) => ({ label: opt.name, price: opt.totalPrice || opt.price || 0 }))
      : [];

    const reservation = buildReservationPaymentFromBooking(currentBooking, {
      voiture: `${vehicle.brand} ${vehicle.model}`,
      dateDebut: formatDate(currentBooking.start_date),
      dateFin: formatDate(currentBooking.end_date),
      duree: t("duration.day", { count: days }),
      extras: selectedExtras,
    });

    console.debug("[BookingDiscussion] handlePayNow: Réservation préparée depuis DB", {
      bookingId: currentBooking.id,
      base_price_DB: base,
      options_total_DB: optionsTotal,
      subtotal_DB: subtotalDB,
      payment_method: reservation.paymentMethod,
      service_fee_renter: reservation.serviceFeeRenter,
      amount_total_expected: reservation.amountTotalExpected,
    });

    console.debug('[BookingDiscussion] pay button clicked', { bookingForPayment: reservation });

    if (!isCashOnSitePayment(reservation.paymentMethod ?? "card_online")) {
      trackGa4Event("payment_flow_opened", {
        booking_id: String(reservation.id),
        payment_method: reservation.paymentMethod ?? "card_online",
        amount_total_expected:
          reservation.amountTotalExpected ?? reservation.totalTTC ?? 0,
        currency: ANALYTICS_BOOKING_CURRENCY,
      });
    }

    // Ouvrir la modale de paiement
    setReservationForPayment(reservation);
    setStep1Complete(false);
    setIsPaymentModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t("loading")}</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">
                {t("motoDetails.errors.vehicleNotFound.title")}
              </p>
              {/* TODO(i18n): UNCERTAIN mapping -> profile.hero.back (vérifier contexte) */}
              <Button onClick={() => navigate('/')}>
                Retour à l'accueil
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* En-tête avec bouton retour */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => vehicle && navigate(getPublicListingPath(vehicle))}
            className="mr-4 hover:bg-slate-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("motoDetails.back")}
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">
              {isOwner ? t("booking.discussion.withRenter") : t("booking.discussion.withOwner")}
            </h1>
            {isOwner && (
              <Badge className="mt-2 bg-blue-600">
                <Car className="h-3 w-3 mr-1" />
                {t("booking.discussion.role.owner")}
              </Badge>
            )}
            {isRenter && (
              <Badge className="mt-2 bg-green-600">
                👤 {t("booking.discussion.role.renter")}
              </Badge>
            )}
          </div>
        </div>

        {/* Interface de conversation style Facebook Messenger */}
        <div className="max-w-4xl mx-auto">
          <Card className="shadow-lg border-0 bg-white h-[700px] flex flex-col">
            {/* Header avec informations du véhicule */}
            <CardHeader className="border-b bg-slate-50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    {(() => {
                      // Récupérer la photo principale (isPrimary) ou la première disponible
                      const photosArray = Object.values(vehiclePhotos);
                      const primaryPhoto = photosArray.find(p => p.isPrimary) || photosArray[0];
                      
                      // Fallback vers vehicleImageUrl ou bookingData si pas de photos dans vehiclePhotos
                      const imageUrl = primaryPhoto?.url 
                        || vehicleImageUrl 
                        || bookingData?.vehicle?.imageUrl;
                      
                      return imageUrl ? (
                        <AvatarImage src={imageUrl} />
                      ) : (
                        <AvatarFallback className="bg-blue-600 text-white">
                          <Car className="h-6 w-6" />
                        </AvatarFallback>
                      );
                    })()}
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-slate-800">
                      {vehicle.brand} {vehicle.model}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {bookingData?.rentalInfo?.pickupLocation || vehicle.location || t("motoDetails.notSpecified")}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {t("booking.discussion.dateRange", {
                        startDate: bookingData?.rentalInfo?.startDate ? formatDate(bookingData.rentalInfo.startDate) : (startDate ? formatDate(startDate) : 'N/A'),
                        endDate: bookingData?.rentalInfo?.endDate ? formatDate(bookingData.rentalInfo.endDate) : (endDate ? formatDate(endDate) : 'N/A')
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <ClientMgaPrice
                    amountMga={calculateTotalPrice()}
                    className="items-end"
                    primaryClassName="text-lg font-bold text-primary"
                  />
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {calculateRealDuration()}
                  </div>
                </div>
              </div>
            </CardHeader>

            {/* Bouton Détails réservation */}
            <div className="border-b bg-slate-50 p-3 flex justify-center items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigate('/me/renter/bookings');
                }}
                className="hover:bg-slate-200"
              >
                <FileText className="h-4 w-4 mr-2" />
                {t("booking.discussion.viewBookingDetails")}
              </Button>
              
              {(() => {
                const isPendingPayment =
                  currentBooking?.status === "pending_payment" || bookingStatus === "pending_payment";
                if (!isPendingPayment) return null;

                const paymentMethod = getPaymentMethodFromBooking(currentBooking ?? {});
                const isCash = isCashOnSitePayment(paymentMethod);

                if (isCash) {
                  return (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 max-w-md">
                      <p className="font-semibold">
                        {t("booking.paymentMethod.noOnlinePaymentRequired", "Aucun paiement en ligne n'est nécessaire")}
                      </p>
                      <p className="text-amber-800 mt-1 text-xs">
                        {t("booking.paymentMethod.cashOnSite.modalHint", "Règlement lors de la remise des clés à l'agence.")}
                      </p>
                    </div>
                  );
                }

                return (
                  <Button
                    size="lg"
                    className="bg-gradient-lagoon hover:opacity-90 text-white shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePayNow();
                    }}
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    {t("booking.discussion.payRental")}
                    <Shield className="h-4 w-4 ml-2 opacity-75" />
                  </Button>
                );
              })()}
            </div>
            
            {/* Zone des messages */}
            <CardContent className="flex-1 flex flex-col p-0 min-h-0">
              <div className="flex-1 overflow-y-auto p-4 space-y-6 max-h-[60vh]">
                {/* Message initial avec détails */}
                {/* Affichage dynamique selon le rôle */}
                <div className={`flex items-end gap-2 ${isRenter ? 'justify-end' : 'justify-start'}`}>
                  {/* Avatar pour le message initial à gauche (si propriétaire voit la demande) */}
                  {!isRenter && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      {currentUser?.avatarUrl ? (
                        <AvatarImage src={currentUser.avatarUrl} />
                      ) : (
                        <AvatarFallback className="bg-green-600 text-white text-xs">
                          {currentUser?.firstName?.[0] || currentUser?.lastName?.[0] || 'L'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  )}
                  
                  <div className="max-w-xs lg:max-w-md">
                    <div className={`${isRenter ? 'bg-green-600 text-white rounded-2xl rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md'} p-4 shadow-sm`}>
                      <p className="text-sm mb-3">
                        {isRenter ? t("booking.discussion.initialMessage.renter") : t("booking.discussion.initialMessage.owner")}
                      </p>
                      
                      {/* Récapitulatif dans la bulle */}
                      <div className={`${isRenter ? 'bg-white/10' : 'bg-white/90'} rounded-lg p-3 space-y-3`}>
                        {/* Photo et infos véhicule */}
                        <div className="flex items-center gap-3">
                          <div className={`w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 ${isRenter ? 'bg-white/20' : 'bg-gray-200'}`}>
                            <img 
                              src={(() => {
                                // Priorité 1: Photo depuis vehiclePhotos (Supabase)
                                const photosArray = Object.values(vehiclePhotos);
                                const primaryPhoto = photosArray.find(p => p.isPrimary) || photosArray[0];
                                if (primaryPhoto?.url) return primaryPhoto.url;
                                
                                // Priorité 2: bookingData vehicle imageUrl
                                if (bookingData?.vehicle?.imageUrl) return bookingData.vehicle.imageUrl;
                                
                                // Priorité 3: vehicleImageUrl
                                if (vehicleImageUrl) return vehicleImageUrl;
                                
                                // Fallback: placeholder
                                return `https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=200&h=150&fit=crop&crop=center`;
                              })()}
                              alt={`${bookingData?.vehicle?.brand || vehicle.brand} ${bookingData?.vehicle?.model || vehicle.model}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Fallback si l'image ne charge pas
                                const target = e.target as HTMLImageElement;
                                if (!target.src.includes('unsplash.com')) {
                                  target.src = `https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=200&h=150&fit=crop&crop=center`;
                                }
                              }}
                            />
                          </div>
                          <div className="flex-grow">
                            <h4 className={`font-semibold ${isRenter ? 'text-white' : 'text-gray-800'}`}>
                              {bookingData?.vehicle?.brand || vehicle.brand} {bookingData?.vehicle?.model || vehicle.model}
                            </h4>
                            <p className={`text-xs ${isRenter ? 'text-white/80' : 'text-gray-600'}`}>
                              {bookingData?.vehicle?.color || vehicle.color} • {bookingData?.vehicle?.year || vehicle.year} • ID: {bookingData?.vehicle?.license || vehicle.license}
                            </p>
                          </div>
                        </div>
                        
                        {/* Dates */}
                        {(bookingData?.rentalInfo?.startDate && bookingData?.rentalInfo?.endDate) || (startDate && endDate) ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar className={`h-4 w-4 ${isRenter ? 'text-white/80' : 'text-gray-600'}`} />
                              <span className={`text-xs ${isRenter ? 'text-white/90' : 'text-gray-800'}`}>
                                {t("booking.discussion.dateRange", {
                                  startDate: bookingData?.rentalInfo?.startDate ? formatDate(bookingData.rentalInfo.startDate) : formatDate(startDate),
                                  endDate: bookingData?.rentalInfo?.endDate ? formatDate(bookingData.rentalInfo.endDate) : formatDate(endDate)
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className={`h-4 w-4 ${isRenter ? 'text-white/80' : 'text-gray-600'}`} />
                              <span className={`text-xs ${isRenter ? 'text-white/90' : 'text-gray-800'}`}>
                                {t("booking.discussion.departureTime", {
                                  startTime: bookingData?.rentalInfo?.startTime || (startDate ? formatTime(startDate) : t("motoDetails.notSpecified"))
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className={`h-4 w-4 ${isRenter ? 'text-white/80' : 'text-gray-600'}`} />
                              <span className={`text-xs ${isRenter ? 'text-white/90' : 'text-gray-800'}`}>
                                {t("booking.discussion.pickupLocation", {
                                  pickupLocation: bookingData?.rentalInfo?.pickupLocation || vehicle.location || t("motoDetails.notSpecified")
                                })}
                              </span>
                            </div>
                            {bookingData?.rentalInfo?.returnLocation &&
                              bookingData.rentalInfo.returnLocation !== bookingData.rentalInfo.pickupLocation && (
                              <div className="flex items-center gap-2">
                                <MapPin className={`h-4 w-4 ${isRenter ? 'text-white/80' : 'text-gray-600'}`} />
                                <span className={`text-xs ${isRenter ? 'text-white/90' : 'text-gray-800'}`}>
                                  {t("booking.discussion.returnLocation", {
                                    returnLocation: bookingData.rentalInfo.returnLocation
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : null}
                        
                        {/* Options supplémentaires */}
                        {formatSelectedServices() && (
                          <div className="space-y-2">
                            <div className={`border-t ${isRenter ? 'border-white/20' : 'border-gray-300'} pt-2`}>
                              <span className={`text-xs font-medium ${isRenter ? 'text-white/80' : 'text-gray-700'}`}>{t("booking.discussion.additionalOptions")}</span>
                              <div className={`text-xs mt-1 whitespace-pre-line ${isRenter ? 'text-white/90' : 'text-gray-800'}`}>
                                {formatSelectedServices()}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Prix */}
                        <div className={`border-t ${isRenter ? 'border-white/20' : 'border-gray-300'} pt-2`}>
                          <div className="flex justify-between items-end gap-3">
                            <div className={`flex flex-col ${isRenter ? 'text-white/80' : 'text-gray-700'}`}>
                              {(() => {
                                const pricePerDay = currentBooking?.price_per_day || bookingData?.rentalInfo?.pricePerDay || vehicle.dailyPrice;
                                const realDuration = calculateRealDuration();
                                const { secondary } = formatClient(pricePerDay);
                                return (
                                  <>
                                    <span className="text-xs">
                                      {formatClientInline(pricePerDay)} × {realDuration}
                                    </span>
                                    <span className={`text-[10px] mt-0.5 ${isRenter ? 'text-white/60' : 'text-gray-500'}`}>
                                      {secondary} / {t("pricing.perDayShort")}
                                    </span>
                                  </>
                                );
                              })()}
                            </div>
                            <ClientMgaPrice
                              amountMga={calculateTotalPrice()}
                              primaryClassName={`font-bold text-lg ${isRenter ? "text-white" : "text-gray-800"}`}
                              secondaryClassName={`mt-0.5 text-xs tabular-nums ${isRenter ? "text-white/70" : "text-gray-600"}`}
                            />
                          </div>
                          {(() => {
                            const optionsTotal = currentBooking?.options_total || bookingData?.rentalInfo?.optionsTotal || 0;
                            if (optionsTotal > 0) {
                              return (
                                <div className={`text-xs mt-1 ${isRenter ? 'text-white/70' : 'text-gray-600'}`}>
                                  {t("booking.discussion.optionsTotal", { optionsTotal: formatClientInline(optionsTotal) })}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                      
                      <p className={`${isRenter ? 'text-xs text-white/80' : 'text-xs text-gray-700'} mt-3`}>
                        {isRenter ? t("booking.discussion.confirmAvailability.renter") : t("booking.discussion.confirmAvailability.owner")}
                      </p>
                    </div>
                    <p className={`text-xs text-slate-500 mt-1 ${isRenter ? 'text-right' : 'text-left'}`}>
                      {formatTime(new Date().toISOString())}
                    </p>
                  </div>
                </div>

                {/* Messages existants */}
                {messages.map((msg) => {
                  const isCurrentUser = msg.senderId === currentUserId;
                  // Déterminer si c'est un message du propriétaire ou du locataire
                  const msgSenderIsOwner = msg.senderId === ownerId;
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Avatar uniquement pour les messages de gauche (autre personne) */}
                      {!isCurrentUser && (
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          {msgSenderIsOwner && owner?.avatarUrl ? (
                            <AvatarImage src={owner.avatarUrl} />
                          ) : !msgSenderIsOwner && currentUser?.avatarUrl ? (
                            <AvatarImage src={currentUser.avatarUrl} />
                          ) : (
                            <AvatarFallback className={`${msgSenderIsOwner ? 'bg-blue-600' : 'bg-green-600'} text-white text-xs`}>
                              {msgSenderIsOwner 
                                ? (owner?.firstName?.[0] || owner?.lastName?.[0] || 'P')
                                : (currentUser?.firstName?.[0] || currentUser?.lastName?.[0] || 'L')
                              }
                            </AvatarFallback>
                          )}
                        </Avatar>
                      )}
                      
                      <div className="max-w-xs lg:max-w-md">
                        <div
                          className={`px-4 py-3 rounded-2xl shadow-sm ${
                            isCurrentUser
                              ? 'bg-green-600 text-white rounded-br-md'
                              : 'bg-gray-100 text-gray-800 rounded-bl-md'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                        </div>
                        <p className={`text-xs mt-1 ${
                          isCurrentUser ? 'text-right text-slate-500' : 'text-left text-slate-500'
                        }`}>
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Div invisible pour scroll automatique */}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Zone de saisie fixe en bas */}
              {conversation?.status === 'active' ? (
                <div className="border-t p-4 bg-white">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-green-600 text-white text-xs">
                        {currentUser?.firstName?.[0]}{currentUser?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 relative">
                      <Input
                        placeholder={t("booking.discussion.messagePlaceholder")}
                        className="rounded-full border-0 bg-gray-100 pr-12 focus:bg-white focus:ring-2 focus:ring-green-500/20"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <Button
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                        onClick={handleSendMessage}
                        disabled={!message.trim()}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-t p-4 bg-white">
                  <div className="text-center text-sm text-red-600 bg-red-50 border border-red-200 py-3 rounded-lg">
                    {t("booking.discussion.conversationCancelled")}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Alerte conversation annulée sticky en bas */}
      {isConversationCancelled && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-orange-50 border-t border-orange-200 shadow-lg">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-900">
                  {t("booking.discussion.conversationCancelledShort")}
                </p>
              </div>
              <Button
                onClick={() => vehicle && navigate(getPublicListingPath(vehicle))}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                Nouvelle réservation
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />

      {/* Modale de paiement */}
      {isPaymentModalOpen && reservationForPayment && (
        <PaymentFlowModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          reservation={reservationForPayment}
          onPayNow={async (rsv) => {
            if (isCashOnSitePayment(rsv.paymentMethod ?? "card_online")) return;
            try {
              await payerLocation(rsv);
            } catch (e: any) {
              toast({
                title: t("booking.discussion.toasts.paymentError.title"),
                description: e?.message || t("booking.discussion.toasts.paymentError.description"),
                variant: "destructive",
              });
            }
          }}
          step1Complete={step1Complete}
          setStep1Complete={setStep1Complete}
        />
      )}
    </div>
  );
};

export default BookingDiscussion;
