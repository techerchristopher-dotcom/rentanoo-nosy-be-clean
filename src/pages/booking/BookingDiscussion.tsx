import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { Navbar } from "@/components/layout/navbar";
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

const BookingDiscussion = () => {
  console.log('💬 [DEBUG] BookingDiscussion component rendering');
  
  const navigate = useNavigate();
  const { license } = useParams<{ license: string }>();
  const [searchParams] = useSearchParams();
  
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
          toast({
            title: "Erreur",
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
            title: "Véhicule non trouvé",
            description: "Ce véhicule n'existe pas ou n'est plus disponible.",
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
          } else {
            console.log('📸 [DEBUG] FORCE - Utilisation de la vraie photo Supabase !');
            // FORCER l'URL directe de la vraie photo Supabase
            const realSupabasePhoto = {
              id: `real-supabase-${foundVehicle.id}`,
              vehicleId: foundVehicle.id,
              url: `https://zykwfjxurwmputxwlkxs.supabase.co/storage/v1/object/public/vehicle-photos/exterior_1759781792034_lm9xwpqf8e.jpg`,
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
          title: "Erreur",
          description: "Impossible de charger les informations du véhicule.",
          variant: "destructive",
        });
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [license, navigate]);

  // Scroll vers le dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Charger l'utilisateur connecté et créer/récupérer la conversation
  useEffect(() => {
    const loadConversation = async () => {
      if (!vehicle) return;

      try {
        // Récupérer l'utilisateur connecté
        const userResult = await ProfileService.getCurrentUserProfile();
        if (userResult.error || !userResult.data) {
          toast({
            title: "Erreur",
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
                title: 'Réservation annulée',
                description: 'Cette réservation a été supprimée par le locataire.',
                variant: 'destructive',
              });
              // Rediriger vers la page du véhicule ou les réservations
              setTimeout(() => {
                navigate(`/vehicle/${vehicle.license}`);
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
    return new Date(date).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fonction pour formater les options supplémentaires depuis bookingData
  const formatSelectedServices = () => {
    if (!bookingData?.selectedOptions || bookingData.selectedOptions.length === 0) {
      return null;
    }
    
    return bookingData.selectedOptions
      .map(option => `• ${option.name}${option.totalPrice > 0 ? ` (+${option.totalPrice}€)` : ''}`)
      .join('\n');
  };

  const fuelIcons = {
    gasoline: Fuel,
    diesel: Fuel,
    electric: Fuel,
    hybrid: Fuel
  };

  const fuelLabels = {
    gasoline: "Essence",
    diesel: "Diesel", 
    electric: "Électrique",
    hybrid: "Hybride"
  };

  const transmissionLabels = {
    manual: "Manuelle",
    automatic: "Automatique"
  };

  const calculateTotalPrice = () => {
    // Recalculer le prix avec la nouvelle logique
    if (currentBooking && vehicle) {
      const startDateTime = new Date(currentBooking.start_date);
      const endDateTime = new Date(currentBooking.end_date);
      
      if (currentBooking.start_time) {
        const [startHour, startMinute] = currentBooking.start_time.split(':');
        startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
      }
      if (currentBooking.end_time) {
        const [endHour, endMinute] = currentBooking.end_time.split(':');
        endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
      }
      
      const rentalHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
      const completeDays = Math.floor(rentalHours / 24);
      const extraHours = Math.floor(rentalHours % 24);
      
      let basePrice: number;
      if (rentalHours < 24) {
        basePrice = vehicle.dailyPrice;
      } else if (extraHours === 0) {
        basePrice = completeDays * vehicle.dailyPrice;
      } else {
        // Toujours facturer les heures supplémentaires au prorata
        // Peu importe si heure retour < heure départ
        const hourPrice = vehicle.dailyPrice / 24;
        const extraHoursPrice = extraHours * hourPrice;
        basePrice = Math.ceil((completeDays * vehicle.dailyPrice) + extraHoursPrice);
      }
      
      const optionsTotal = currentBooking?.options_total || bookingData?.rentalInfo?.optionsTotal || 0;
      return basePrice + optionsTotal;
    }
    
    // Fallback: utiliser le prix de Supabase
    if (currentBooking?.total_price) {
      return Number(currentBooking.total_price);
    }
    
    if (bookingData?.rentalInfo?.totalPrice) {
      return bookingData.rentalInfo.totalPrice;
    }
    
    // Sinon, calculer de base
    if (!startDate || !endDate || !vehicle) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    const basePrice = vehicle.dailyPrice * days;
    const optionsTotal = bookingData?.rentalInfo?.optionsTotal || 0;
    
    return basePrice + optionsTotal;
  };

  // Calculer la durée réelle en heures pour affichage précis
  const calculateRealDuration = () => {
    // Déterminer les dates et heures
    let startDateTime: Date;
    let endDateTime: Date;
    
    if (currentBooking) {
      startDateTime = new Date(currentBooking.start_date);
      endDateTime = new Date(currentBooking.end_date);
      
      if (currentBooking.start_time) {
        const [startHour, startMinute] = currentBooking.start_time.split(':');
        startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
      }
      if (currentBooking.end_time) {
        const [endHour, endMinute] = currentBooking.end_time.split(':');
        endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
      }
    } else if (bookingData?.rentalInfo) {
      startDateTime = new Date(bookingData.rentalInfo.startDate);
      endDateTime = new Date(bookingData.rentalInfo.endDate);
      
      const [startHour, startMinute] = bookingData.rentalInfo.startTime.split(':');
      const [endHour, endMinute] = bookingData.rentalInfo.endTime.split(':');
      startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
      endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
    } else {
      return '1 jour'; // Fallback
    }
    
    const rentalHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
    const completeDays = Math.floor(rentalHours / 24);
    const extraHours = Math.floor(rentalHours % 24);
    
    if (rentalHours < 24) {
      return '1 jour';
    } else if (extraHours === 0) {
      return `${completeDays} ${completeDays === 1 ? 'jour' : 'jours'}`;
    } else {
      // Toujours afficher les heures supplémentaires
      // Peu importe si heure retour < heure départ
      return `${completeDays} ${completeDays === 1 ? 'jour' : 'jours'} + ${Math.floor(extraHours)} ${Math.floor(extraHours) === 1 ? 'heure' : 'heures'}`;
    }
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
          title: "Erreur",
          description: "Impossible d'envoyer le message",
          variant: "destructive",
        });
        return;
      }

      setMessage("");
      
      toast({
        title: "Message envoyé",
        description: "Votre message a été envoyé au propriétaire",
      });
    } catch (error) {
      console.error('Erreur envoi message:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
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
        title: "Erreur",
        description: "Impossible de récupérer les informations de réservation",
        variant: "destructive",
      });
      return;
    }

    // Calculer les valeurs nécessaires pour le paiement (copié depuis RenterBookingCard)
    const start = new Date(currentBooking.start_date);
    const end = new Date(currentBooking.end_date);
    const startTime = currentBooking.start_time || '06:30';
    const endTime = currentBooking.end_time || '14:00';
    const [sh, sm] = startTime.split(':');
    const [eh, em] = endTime.split(':');
    start.setHours(parseInt(sh), parseInt(sm), 0, 0);
    end.setHours(parseInt(eh), parseInt(em), 0, 0);
    const hours = (end.getTime() - start.getTime()) / (1000*60*60);
    const days = Math.max(1, Math.ceil(hours / 24));
    const base = vehicle.dailyPrice ? Math.ceil(days * vehicle.dailyPrice) : (currentBooking.total_price || 0);
    
    // Extras issus des options sélectionnées
    const selectedExtras: Array<{ label: string; price: number }> = currentBooking.selected_options 
      ? JSON.parse(currentBooking.selected_options).map((opt: any) => ({ label: opt.name, price: opt.totalPrice || opt.price || 0 }))
      : [];
    const optionsTotal = selectedExtras.reduce((s, x) => s + (x.price || 0), 0);
    const subtotal = base + optionsTotal;
    const fee = Math.round(subtotal * 0.15 * 100) / 100;
    const total = Math.round((subtotal + fee) * 100) / 100;

    // Préparer la réservation pour la modale
    const reservation: ReservationPayment = {
      id: currentBooking.id,
      voiture: `${vehicle.brand} ${vehicle.model}`,
      dateDebut: formatDate(currentBooking.start_date),
      dateFin: formatDate(currentBooking.end_date),
      duree: days === 1 ? '1 jour' : `${days} jours`,
      montantDeBase: base,
      fraisService: fee,
      totalTTC: total,
      extras: selectedExtras,
    };

    console.debug('[BookingDiscussion] pay button clicked', { bookingForPayment: reservation });
    
    // Ouvrir la modale de paiement
    setReservationForPayment(reservation);
    setStep1Complete(false);
    setIsPaymentModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Chargement...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">Véhicule non trouvé</p>
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
      <Navbar />
      
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {/* En-tête avec bouton retour */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/vehicle/${vehicle.license}`)}
            className="mr-4 hover:bg-slate-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au véhicule
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800">
              {isOwner ? 'Discussion avec le locataire' : 'Discussion avec le propriétaire'}
            </h1>
            {isOwner && (
              <Badge className="mt-2 bg-blue-600">
                <Car className="h-3 w-3 mr-1" />
                Vous êtes le propriétaire
              </Badge>
            )}
            {isRenter && (
              <Badge className="mt-2 bg-green-600">
                👤 Vous êtes le locataire
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
                      // Récupérer la première photo disponible
                      const photosArray = Object.values(vehiclePhotos);
                      const firstPhoto = photosArray[0];
                      
                      return firstPhoto?.url ? (
                        <AvatarImage src={firstPhoto.url} />
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
                      {bookingData?.rentalInfo?.pickupLocation || vehicle.location || 'Localisation non spécifiée'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Du {bookingData?.rentalInfo?.startDate ? formatDate(bookingData.rentalInfo.startDate) : (startDate ? formatDate(startDate) : 'N/A')} au {bookingData?.rentalInfo?.endDate ? formatDate(bookingData.rentalInfo.endDate) : (endDate ? formatDate(endDate) : 'N/A')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">
                    {calculateTotalPrice()}€
                  </div>
                  <div className="text-xs text-muted-foreground">
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
                Voir les détails de ma réservation
              </Button>
              
              {(() => {
                const shouldShowPayButton = currentBooking?.status === 'pending_payment' || bookingStatus === 'pending_payment';
                console.log('🔍 [BookingDiscussion] Affichage bouton paiement:', {
                  shouldShowPayButton,
                  currentBookingStatus: currentBooking?.status,
                  bookingStatus,
                  hasCurrentBooking: !!currentBooking,
                  bookingId: currentBooking?.id
                });
                return shouldShowPayButton ? (
                  <Button
                    size="lg"
                    className="bg-gradient-lagoon hover:opacity-90 text-white shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePayNow();
                    }}
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Payer ma location
                    <Shield className="h-4 w-4 ml-2 opacity-75" />
                  </Button>
                ) : null;
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
                        {isRenter ? 'Bonjour ! Je suis intéressé par la location de votre véhicule. Voici les détails :' : 'Bonjour ! Vous avez une nouvelle demande de réservation. Voici les détails :'}
                      </p>
                      
                      {/* Récapitulatif dans la bulle */}
                      <div className={`${isRenter ? 'bg-white/10' : 'bg-white/90'} rounded-lg p-3 space-y-3`}>
                        {/* Photo et infos véhicule */}
                        <div className="flex items-center gap-3">
                          <div className={`w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 ${isRenter ? 'bg-white/20' : 'bg-gray-200'}`}>
                            <img 
                              src={bookingData?.vehicle?.imageUrl || vehicleImageUrl || `https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=200&h=150&fit=crop&crop=center`}
                              alt={`${bookingData?.vehicle?.brand || vehicle.brand} ${bookingData?.vehicle?.model || vehicle.model}`}
                              className="w-full h-full object-cover"
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
                                Du {bookingData?.rentalInfo?.startDate ? formatDate(bookingData.rentalInfo.startDate) : formatDate(startDate)} au {bookingData?.rentalInfo?.endDate ? formatDate(bookingData.rentalInfo.endDate) : formatDate(endDate)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className={`h-4 w-4 ${isRenter ? 'text-white/80' : 'text-gray-600'}`} />
                              <span className={`text-xs ${isRenter ? 'text-white/90' : 'text-gray-800'}`}>
                                Départ à {bookingData?.rentalInfo?.startTime || (startDate ? formatTime(startDate) : 'Non spécifié')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className={`h-4 w-4 ${isRenter ? 'text-white/80' : 'text-gray-600'}`} />
                              <span className={`text-xs ${isRenter ? 'text-white/90' : 'text-gray-800'}`}>
                                Lieu : {bookingData?.rentalInfo?.pickupLocation || vehicle.location || 'Non spécifié'}
                              </span>
                            </div>
                          </div>
                        ) : null}
                        
                        {/* Options supplémentaires */}
                        {formatSelectedServices() && (
                          <div className="space-y-2">
                            <div className={`border-t ${isRenter ? 'border-white/20' : 'border-gray-300'} pt-2`}>
                              <span className={`text-xs font-medium ${isRenter ? 'text-white/80' : 'text-gray-700'}`}>Options supplémentaires :</span>
                              <div className={`text-xs mt-1 whitespace-pre-line ${isRenter ? 'text-white/90' : 'text-gray-800'}`}>
                                {formatSelectedServices()}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Prix */}
                        <div className={`border-t ${isRenter ? 'border-white/20' : 'border-gray-300'} pt-2`}>
                          <div className="flex justify-between items-center">
                            <span className={`text-xs ${isRenter ? 'text-white/80' : 'text-gray-700'}`}>
                              {(() => {
                                // PRIORITÉ 1: Utiliser currentBooking depuis Supabase
                                const pricePerDay = currentBooking?.price_per_day || bookingData?.rentalInfo?.pricePerDay || vehicle.dailyPrice;
                                const realDuration = calculateRealDuration();
                                return `${pricePerDay}€ × ${realDuration}`;
                              })()}
                            </span>
                            <span className={`font-bold text-lg ${isRenter ? 'text-white' : 'text-gray-800'}`}>
                              {calculateTotalPrice()}€
                            </span>
                          </div>
                          {(() => {
                            const optionsTotal = currentBooking?.options_total || bookingData?.rentalInfo?.optionsTotal || 0;
                            if (optionsTotal > 0) {
                              return (
                                <div className={`text-xs mt-1 ${isRenter ? 'text-white/70' : 'text-gray-600'}`}>
                                  Dont {optionsTotal}€ d'options
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                      
                      <p className={`${isRenter ? 'text-xs text-white/80' : 'text-xs text-gray-700'} mt-3`}>
                        {isRenter ? 'Pouvez-vous confirmer la disponibilité ? Merci !' : 'Merci de confirmer votre disponibilité !'}
                      </p>
                    </div>
                    <p className={`text-xs text-slate-500 mt-1 ${isRenter ? 'text-right' : 'text-left'}`}>
                      {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
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
                          {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
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
                        placeholder="Tapez votre message..."
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
                    Vous ne pouvez plus discuter. La demande de réservation a été annulée ou terminée. ❌
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
                  Vous ne pouvez plus discuter. La demande de réservation a été annulée.
                </p>
              </div>
              <Button
                onClick={() => navigate(`/vehicle/${vehicle?.license}`)}
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
            try {
              await payerLocation(rsv);
            } catch (e: any) {
              toast({ title: "Erreur paiement", description: e?.message || "Impossible de démarrer le paiement", variant: "destructive" });
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
