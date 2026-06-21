import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  Car, 
  MessageCircle, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Euro,
  MoreVertical,
  RotateCcw,
  Filter
} from "lucide-react";
import { getPublicDiscussionPath } from "@/utils/vehicleType";
import { BookingsService } from "@/services";
import { SupabaseBookingsService } from "@/services/supabase/bookings";
import { ProfileService } from "@/services/supabase/profile";
import { ConversationsService } from "@/services/supabase/conversations";
import { MessagesService } from "@/services/supabase/messages";
import { SupabaseVehiclesService } from "@/services/supabaseVehiclesService";
import { PhotoService } from "@/services/supabase/photos";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import type { Booking, User, Vehicle as AppVehicle, Conversation, Message, Photo, CheckinDepartSummary, CheckinReturnSummary } from "@/types";
import OwnerBookingCard from "@/components/OwnerBookingCard";

interface BookingWithDetails extends Omit<Booking, 'startTime' | 'endTime' | 'pickupLocation'> {
  renter?: User;
  vehicle?: AppVehicle;
  conversation?: Conversation;
  primaryPhoto?: Photo;
  // Champs supplémentaires depuis Supabase
  startTime?: string;
  endTime?: string;
  selectedOptions?: any;
  basePrice?: number;
  optionsTotal?: number;
  serviceFee?: number;
  serviceFeeRenter?: number;
  serviceFeePercentApplied?: number;
  amountTotalExpected?: number;
  subtotal?: number;
  pricePerDay?: number;
  rentalDays?: number;
  pickupLocation?: string;
  hotelName?: string;
  notes?: string;
  totalPrice?: number;
  depositStatus?: 'pending' | 'paid' | 'refunded' | 'card_registered' | 'not_required' | null;
  depositAmountSnapshot?: number | null;
  stripePaymentMethodId?: string | null;
  checkinDepart?: CheckinDepartSummary;
  checkinReturn?: CheckinReturnSummary;
}

interface BookingRequest extends Conversation {
  renter?: User;
  vehicle?: AppVehicle;
  lastMessage?: Message;
  unreadCount?: number;
}

const OwnerBookings = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [pendingBookings, setPendingBookings] = useState<BookingWithDetails[]>([]); // Stocker les bookings pending avec toutes les données
  const [loading, setLoading] = useState(true);
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'active' | 'upcoming' | 'past' | 'cancelled' | 'refused'>('all');
  // Notification badge logic removed
  const [ownerVehicleIds, setOwnerVehicleIds] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(3);
  const enrichedIdsRef = useRef<Set<string>>(new Set());
  const conversationsRef = useRef<Conversation[] | null>(null);
  const currentUserIdRef = useRef<string>('');
  const isAdminRef = useRef(false);

  useEffect(() => {
    setVisibleCount(3);
  }, [activeFilter]);

  const matchesFilter = (booking: BookingWithDetails, filter: typeof activeFilter, now: Date) => {
    const startDate = new Date(booking.startDate);
    const endDate = new Date(booking.endDate);
    switch (filter) {
      case 'pending':
        return (booking.status === 'confirmed' && booking.depositStatus === 'pending') ||
               booking.status === 'pending' ||
               booking.status === 'pending_payment';
      case 'active':
        return booking.status === 'active' ||
               (booking.status === 'confirmed' &&
                booking.depositStatus === 'paid' &&
                startDate <= now &&
                endDate >= now);
      case 'upcoming':
        return booking.status === 'confirmed' &&
               booking.depositStatus === 'paid' &&
               startDate > now;
      case 'past':
        return booking.status === 'completed';
      case 'cancelled':
        return booking.status === 'cancelled' ||
               booking.status === 'rejected' ||
               booking.status === 'declined';
      case 'refused':
        return booking.status === 'declined';
      case 'all':
      default:
        return true;
    }
  };

  // Enrichit (locataire, photo, conversation) seulement les réservations affichées à l'écran —
  // évite de tout charger (N requêtes par réservation) pour un historique qui peut compter des dizaines d'entrées.
  const enrichVisibleBookings = async (targets: BookingWithDetails[]) => {
    const toEnrich = targets.filter((b) => !enrichedIdsRef.current.has(b.id));
    if (toEnrich.length === 0) return;
    toEnrich.forEach((b) => enrichedIdsRef.current.add(b.id));

    if (!conversationsRef.current) {
      const conversationsResult = await ConversationsService.getUserConversations(currentUserIdRef.current, {
        isAdmin: isAdminRef.current,
      });
      conversationsRef.current = !conversationsResult.error && conversationsResult.data ? conversationsResult.data : [];
    }
    const conversations = conversationsRef.current;

    const patches = await Promise.all(
      toEnrich.map(async (booking) => {
        const renterResult = await ProfileService.getUserProfile(booking.renterId);
        const renter = renterResult.error ? undefined : renterResult.data;

        let primaryPhoto: Photo | undefined;
        if (booking.vehicleId) {
          try {
            const photosResult = await PhotoService.getVehiclePhotos(booking.vehicleId);
            if (photosResult.data && photosResult.data.length > 0) {
              const uploadedPhoto = photosResult.data[0] as any;
              primaryPhoto = {
                id: uploadedPhoto.id,
                vehicleId: uploadedPhoto.vehicleId || uploadedPhoto.vehicle_id,
                url: uploadedPhoto.url,
                angle: uploadedPhoto.angle || 'exterior',
                position: uploadedPhoto.position || 0,
                isPrimary: uploadedPhoto.isPrimary || uploadedPhoto.is_primary || false,
                type: uploadedPhoto.type || 'exterior',
                createdAt: uploadedPhoto.createdAt || uploadedPhoto.created_at || new Date().toISOString(),
              } as Photo;
            }
          } catch (photoError) {
            console.error('Erreur lors du chargement des photos:', photoError);
          }
        }

        const conversation = conversations.find(
          (c) => c.vehicleId === booking.vehicleId && c.renterId === booking.renterId
        );

        return { id: booking.id, renter, primaryPhoto, conversation };
      })
    );

    setBookings((prev) =>
      prev.map((b) => {
        const patch = patches.find((p) => p.id === b.id);
        return patch ? { ...b, renter: patch.renter, primaryPhoto: patch.primaryPhoto, conversation: patch.conversation } : b;
      })
    );
  };

  useEffect(() => {
    if (bookings.length === 0) return;
    const now = new Date();
    const filtered = bookings.filter((b) => matchesFilter(b, activeFilter, now));
    enrichVisibleBookings(filtered.slice(0, visibleCount));
  }, [bookings.length, activeFilter, visibleCount]);

  const toggleExpanded = (bookingId: string) => {
    setExpandedBookings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId);
      } else {
        newSet.add(bookingId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Notification badge logic removed

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 0. Annuler automatiquement les réservations expirées
      await SupabaseBookingsService.cancelExpiredPayments();

      // 1. Récupérer l'utilisateur connecté
      const profileResult = await ProfileService.getCurrentUserProfile();
      if (profileResult.error || !profileResult.data) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté",
          variant: "destructive",
        });
        navigate('/auth/login');
        return;
      }

      const user = profileResult.data;
      setCurrentUser(user);
      const isAdmin = user.isAdmin === true;
      currentUserIdRef.current = user.id;
      isAdminRef.current = isAdmin;
      enrichedIdsRef.current = new Set();
      conversationsRef.current = null;

      // Vérifier que l'utilisateur est propriétaire (les admins bypassent la restriction)
      if (!isAdmin && !user.roles.includes('owner')) {
        toast({
          title: "Accès refusé",
          description: "Cette page est réservée aux propriétaires",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      // 2. Récupérer les véhicules (admin → tous, sinon ceux du propriétaire)
      const vehiclesResult = await SupabaseVehiclesService.getOwnerVehicles(user.id, { isAdmin });
      if (vehiclesResult.error || !vehiclesResult.data) {
        console.error('Erreur récupération véhicules:', vehiclesResult.error);
        setLoading(false);
        return;
      }

      const ownerVehicles = vehiclesResult.data;
      const vehicleIds = ownerVehicles.map(v => v.id);
      setOwnerVehicleIds(vehicleIds);

      console.log('🚗 Véhicules visibles:', vehicleIds, isAdmin ? '(admin)' : '');

      // 3. Récupérer toutes les réservations (admin → toutes, sinon celles des véhicules du propriétaire)
      const bookingsResult = await SupabaseBookingsService.getOwnerBookings(user.id, { isAdmin });
      if (bookingsResult.error || !bookingsResult.data) {
        console.error('Erreur récupération réservations:', bookingsResult.error);
        setLoading(false);
        return;
      }

      console.log('📋 Réservations du propriétaire (Supabase):', bookingsResult.data);
      
      // Log détaillé pour diagnostic
      console.log('🔍 [DIAGNOSTIC] Toutes les réservations:');
      bookingsResult.data.forEach(booking => {
        console.log(`  - ID: ${booking.id}, Status: ${booking.status}, Véhicule: ${booking.vehicle_id}`);
      });

      // Convertir les réservations Supabase vers le format de l'application
      const ownerBookings = bookingsResult.data.map(booking => {
        const rawCheckin = (booking as any).checkin_depart;
        const checkinEntry = Array.isArray(rawCheckin) ? rawCheckin[0] : rawCheckin;
        const checkinDepart = checkinEntry ? {
          id: checkinEntry.id,
          status: checkinEntry.status,
          legalPdfUrl: checkinEntry.legal_pdf_url || null,
        } : undefined;

        // Extraire checkin_return (même pattern que checkin_depart)
        const rawCheckinReturn = (booking as any).checkin_return;
        const checkinReturnEntry = Array.isArray(rawCheckinReturn) ? rawCheckinReturn[0] : rawCheckinReturn;
        const checkinReturn = checkinReturnEntry ? {
          id: checkinReturnEntry.id,
          status: checkinReturnEntry.status,
          legalPdfUrl: checkinReturnEntry.legal_pdf_url || null,
          updatedAt: checkinReturnEntry.updated_at || null,
          has_new_damage: checkinReturnEntry.has_new_damage ?? false,
          new_damage_count: checkinReturnEntry.new_damage_count ?? 0,
        } : undefined;

        // Debug pour voir les motifs d'annulation
        const selectedOptions = booking.selected_options ? 
          (typeof booking.selected_options === 'string' ? 
            JSON.parse(booking.selected_options) : 
            booking.selected_options) : [];
        
        if (booking.status === 'cancelled' || booking.status === 'declined') {
          console.log(`🎯 Réservation ${booking.id} (${booking.status}):`, {
            status: booking.status,
            selectedOptions,
            cancellationReason: selectedOptions?.cancellation?.reason
          });
        }
        
        return {
        id: booking.id,
        vehicleId: booking.vehicle_id,
        renterId: booking.user_id,
        startDate: booking.start_date,
        endDate: booking.end_date,
        totalAmount: booking.total_price,
        currency: 'EUR' as const,
        status: (booking.status as any) || 'pending',
        createdAt: booking.created_at || new Date().toISOString(),
        updatedAt: booking.updated_at || new Date().toISOString(),
        // Récupérer tous les champs depuis Supabase
        startTime: (booking.start_time as string) || '08:00',
        endTime: (booking.end_time as string) || '10:00',
        pickupLocation: (booking.pickup_location as string) || '',
        returnLocation: (booking.return_location as string) || (booking.pickup_location as string) || '',
        hotelName: (booking.hotel_name as string) || '',
        notes: (booking.notes as string) || '',
        selectedOptions: selectedOptions, // Utiliser la variable calculée
        basePrice: booking.base_price,
        optionsTotal: booking.options_total,
        serviceFee: booking.service_fee,
        serviceFeeRenter: (booking as any).service_fee_renter ?? booking.service_fee,
        serviceFeePercentApplied: (booking as any).service_fee_percent_applied ?? null,
        amountTotalExpected: (booking as any).amount_total_expected ?? null,
        subtotal: booking.subtotal,
        pricePerDay: booking.price_per_day,
        rentalDays: booking.rental_days,
        totalPrice: booking.total_price,
        depositStatus: (booking as any).deposit_status || null,
        depositAmountSnapshot: (booking as any).deposit_amount_snapshot ?? null,
        stripePaymentMethodId: (booking as any).stripe_payment_method_id ?? null,
        pricingMode: (booking as any).pricing_mode ?? undefined,
        createdByAdminId: (booking as any).created_by_admin_id ?? null,
        checkinDepart,
        checkinReturn,
      };
      });

      // 4. Attacher le véhicule (déjà en mémoire depuis l'étape 2, pas besoin d'appel réseau)
      // Locataire/photo/conversation sont chargés à la demande par enrichVisibleBookings(),
      // seulement pour les réservations réellement affichées — évite N requêtes par historique.
      const ownerBookingsWithVehicle = ownerBookings.map((booking) => {
        const vehicle = ownerVehicles.find(v => v.id === booking.vehicleId);

        const mappedVehicle: AppVehicle | undefined = vehicle ? {
          id: vehicle.id,
          ownerId: vehicle.owner_id || "",
          license: vehicle.id.substring(0, 8).toUpperCase(),
          brand: vehicle.brand,
          model: vehicle.model,
          color: vehicle.color || "Non spécifié",
          fuel: (vehicle.fuel_type as any) || "gasoline",
          year: vehicle.year,
          hasAC: vehicle.has_ac || false,
          doors: vehicle.doors || 5,
          transmission: (vehicle.transmission as any) || "manual",
          mileage: vehicle.mileage || 0,
          dailyPrice: vehicle.price_per_day,
          currency: "EUR",
          latitude: 0,
          longitude: 0,
          status: "available" as any,
          description: vehicle.description || undefined,
          location: vehicle.location || undefined,
          createdAt: vehicle.created_at || new Date().toISOString(),
          updatedAt: vehicle.updated_at || new Date().toISOString(),
        } : undefined;

        return { ...booking, vehicle: mappedVehicle };
      });

      const enrichedBookings = ownerBookingsWithVehicle;
      const allBookings = enrichedBookings;

      const confirmedBookings = enrichedBookings.filter(b =>
        b.status === 'accepted' || b.status === 'active' || b.status === 'closed'
        || b.status === 'cancelled' || b.status === 'declined' || b.status === 'confirmed'
      );
      const pendingRequests = enrichedBookings.filter(b => 
        b.status === 'pending' || b.status === 'pending_payment'
      );

      console.log('✅ Réservations confirmées (incluant annulées/refusées/confirmed):', confirmedBookings.length);
      console.log('⏳ Demandes en attente:', pendingRequests.length);
      console.log('🔍 Détail des statuts:', {
        accepted: enrichedBookings.filter(b => b.status === 'accepted').length,
        confirmed: enrichedBookings.filter(b => b.status === 'confirmed').length,
        active: enrichedBookings.filter(b => b.status === 'active').length,
        closed: enrichedBookings.filter(b => b.status === 'closed').length,
        cancelled: enrichedBookings.filter(b => b.status === 'cancelled').length,
        declined: enrichedBookings.filter(b => b.status === 'declined').length,
        pending: enrichedBookings.filter(b => b.status === 'pending').length,
        pending_payment: enrichedBookings.filter(b => b.status === 'pending_payment').length,
      });
      console.log('💰 Détail deposit_status:', {
        confirmed_pending: enrichedBookings.filter(b => b.status === 'confirmed' && b.depositStatus === 'pending').length,
        confirmed_paid: enrichedBookings.filter(b => b.status === 'confirmed' && b.depositStatus === 'paid').length,
      });

      setBookings(allBookings); // Utiliser toutes les réservations
      setPendingBookings([]); // Ne plus utiliser pendingBookings pour l'affichage
      setRequests(pendingRequests.map(booking => ({
        id: booking.id, // Utiliser l'ID du booking, pas de la conversation
        bookingId: booking.id,
        vehicleId: booking.vehicleId,
        renterId: booking.renterId,
        ownerId: booking.conversation?.ownerId || currentUser?.id || '',
        status: booking.conversation?.status || 'active',
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        renter: booking.renter,
        vehicle: booking.vehicle,
        lastMessage: undefined,
        unreadCount: 0,
      })));
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les réservations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Abonnement temps réel aux réservations des véhicules du propriétaire
  useEffect(() => {
    if (!currentUser || ownerVehicleIds.length === 0) return;

    const channel = supabase
      .channel('owner-bookings-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `vehicle_id=in.(${ownerVehicleIds.join(',')})`
      }, () => {
        // Recharger dès qu'une réservation liée change
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, ownerVehicleIds.join(',')]);

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
          <AlertCircle className="h-3 w-3 mr-1" />
          En attente
        </Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          Acceptée
        </Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
          <XCircle className="h-3 w-3 mr-1" />
          Annulée
        </Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
          <CheckCircle className="h-3 w-3 mr-1" />
          Terminée
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewRequest = (request: BookingRequest) => {
    navigate(`/me/owner/requests/${request.id}/discussion`);
  };

  const handleAcceptRequest = async (request: BookingRequest) => {
    try {
      // TODO: Implémenter l'acceptation de la demande
      toast({
        title: "Demande acceptée",
        description: "La demande a été acceptée avec succès",
      });
      await loadData(); // Recharger les données
    } catch (error) {
      console.error('Erreur lors de l\'acceptation:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'accepter la demande",
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async (request: BookingRequest) => {
    try {
      // TODO: Implémenter le refus de la demande
      toast({
        title: "Demande refusée",
        description: "La demande a été refusée",
      });
      await loadData(); // Recharger les données
    } catch (error) {
      console.error('Erreur lors du refus:', error);
      toast({
        title: "Erreur",
        description: "Impossible de refuser la demande",
        variant: "destructive",
      });
    }
  };

  const getRequestStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      case 'closed':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Acceptée</Badge>;
      default:
        return <Badge variant="secondary">Inconnu</Badge>;
    }
  };

  const getFilterIcon = (filter: 'all' | 'pending' | 'active' | 'upcoming' | 'past' | 'cancelled' | 'refused') => {
    switch (filter) {
      case 'pending':
        return <AlertCircle className="h-4 w-4" />;
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'upcoming':
        return <Calendar className="h-4 w-4" />;
      case 'past':
        return <Clock className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'refused':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Filter className="h-4 w-4" />;
    }
  };

  const getFilterLabel = (filter: 'all' | 'pending' | 'active' | 'upcoming' | 'past' | 'cancelled' | 'refused') => {
    switch (filter) {
      case 'pending':
        return 'En attente';
      case 'active':
        return 'En cours';
      case 'upcoming':
        return 'À venir';
      case 'past':
        return 'Terminées';
      case 'cancelled':
        return 'Annulées';
      case 'refused':
        return 'Refusées';
      case 'all':
      default:
        return 'Toutes';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getDuration = (startDate: string, endDate: string) => {
    const days = computeBillableRentalDays(
      new Date(startDate),
      new Date(endDate),
      "06:30",
      "14:00"
    );
    if (days === 1) return "1 jour";
    if (Number.isInteger(days)) return `${days} jours`;
    return `${days} jours`;
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (startDate: string, endDate: string) =>
    computeBillableRentalDays(
      new Date(startDate),
      new Date(endDate),
      "06:30",
      "14:00"
    );

  const handleOpenConversation = (booking: BookingWithDetails) => {
    if (!booking.vehicle) {
      toast({
        title: "Erreur",
        description: "Véhicule introuvable",
        variant: "destructive",
      });
      return;
    }

    navigate(
      getPublicDiscussionPath(booking.vehicle, {
        start: booking.startDate,
        end: booking.endDate,
      })
    );
  };

  // Notification badge logic removed

  // Marquer un filtre comme vu quand on clique dessus
  // Notification badge logic removed

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
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

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Mes réservations
          </h1>
        </div>

        {/* Section réservations sans onglets */}
        <div className="space-y-4">
            {/* Filtres horizontaux */}
            {bookings.length > 0 && (
              <div className="mb-8">
                <div className="flex flex-wrap gap-2">
                  {(['all', 'pending', 'active', 'upcoming', 'past', 'cancelled', 'refused'] as const).map((filter) => (
                    <Button
                      key={filter}
                      variant={activeFilter === filter ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveFilter(filter)}
                      className={cn(
                        "flex items-center gap-2 transition-all duration-300 relative",
                        activeFilter === filter 
                          ? "bg-gradient-lagoon hover:opacity-90 shadow-lagoon text-white" 
                          : "hover:bg-primary-soft hover:text-primary"
                      )}
                    >
                      {getFilterIcon(filter)}
                      {getFilterLabel(filter)}
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "ml-1 text-xs",
                          activeFilter === filter ? "bg-white/20 text-white" : "bg-muted"
                        )}
                      >
                        {(() => {
                          const now = new Date();
                          
                          return bookings.filter(booking => {
                            const startDate = new Date(booking.startDate);
                            const endDate = new Date(booking.endDate);
                            
                            switch (filter) {
                              case 'pending':
                                // En attente : confirmed + deposit_status pending OU pending/pending_payment
                                return (booking.status === 'confirmed' && booking.depositStatus === 'pending') ||
                                       booking.status === 'pending' || 
                                       booking.status === 'pending_payment';
                              case 'active':
                                // En cours : active OU (confirmed + deposit paid + dates chevauchantes)
                                return booking.status === 'active' ||
                                       (booking.status === 'confirmed' && 
                                        booking.depositStatus === 'paid' &&
                                        startDate <= now && 
                                        endDate >= now);
                              case 'upcoming':
                                // À venir : confirmed + deposit paid + start_date > now
                                return booking.status === 'confirmed' && 
                                       booking.depositStatus === 'paid' && 
                                       startDate > now;
                              case 'past':
                                // Terminées : completed
                                return booking.status === 'completed';
                              case 'cancelled':
                                // Annulées : cancelled, rejected, declined
                                return booking.status === 'cancelled' || 
                                       booking.status === 'rejected' || 
                                       booking.status === 'declined';
                              case 'refused':
                                return booking.status === 'declined';
                              case 'all':
                              default:
                                return true;
                            }
                          }).length;
                        })()}
                </Badge>

                    
                    </Button>
                  ))}
                </div>
                </div>
            )}
            
            {/* Filtrer les demandes selon le filtre actif */}
            {(() => {
              const now = new Date();
              
              const filteredBookings = bookings.filter(booking => {
                const startDate = new Date(booking.startDate);
                const endDate = new Date(booking.endDate);
                
                switch (activeFilter) {
                  case 'pending':
                    // En attente : confirmed + deposit_status pending OU pending/pending_payment
                    return (booking.status === 'confirmed' && booking.depositStatus === 'pending') ||
                           booking.status === 'pending' || 
                           booking.status === 'pending_payment';
                  case 'active':
                    // En cours : active OU (confirmed + deposit paid + dates chevauchantes)
                    return booking.status === 'active' ||
                           (booking.status === 'confirmed' && 
                            booking.depositStatus === 'paid' &&
                            startDate <= now && 
                            endDate >= now);
                  case 'upcoming':
                    // À venir : confirmed + deposit paid + start_date > now
                    return booking.status === 'confirmed' && 
                           booking.depositStatus === 'paid' && 
                           startDate > now;
                  case 'past':
                    // Terminées : completed
                    return booking.status === 'completed';
                  case 'cancelled':
                    // Annulées : cancelled, rejected, declined
                    return booking.status === 'cancelled' || 
                           booking.status === 'rejected' || 
                           booking.status === 'declined';
                  case 'refused':
                    return booking.status === 'declined';
                  case 'all':
                  default:
                    return true;
                }
              });

              return filteredBookings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      Aucune réservation
                    </h3>
                  <p className="text-muted-foreground">
                      Vous n'avez actuellement aucune réservation dans cette catégorie
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {filteredBookings.slice(0, visibleCount).map((booking) => {
                  const bookingDetails: BookingWithDetails = {
                    ...booking,
                  };

                  // Calculer le totalPrice si non présent
                  if (!bookingDetails.totalPrice && bookingDetails.totalAmount) {
                    (bookingDetails as any).totalPrice = bookingDetails.totalAmount;
                  }

                  // Auto-expand les cards qui nécessitent une action (pending/pending_payment)
                  const forceExpand = booking.status === 'pending' || booking.status === 'pending_payment';

                  return (
                    <OwnerBookingCard
                      key={booking.id}
                      booking={bookingDetails as any}
                      isExpanded={expandedBookings.has(booking.id) || forceExpand}
                      toggleExpanded={toggleExpanded}
                      formatDate={formatDate}
                      getDuration={getDuration}
                      onBookingUpdated={(bookingId) => {
                        loadData();
                        setExpandedBookings(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(bookingId);
                          return newSet;
                        });
                      }}
                    />
                  );
                })}
                {filteredBookings.length > visibleCount && (
                  <div className="flex justify-center pt-2">
                    <Button variant="outline" onClick={() => setVisibleCount((c) => c + 10)}>
                      Voir plus de réservations ({filteredBookings.length - visibleCount} restantes)
                    </Button>
                  </div>
                )}
              </>
              );
            })()}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OwnerBookings;
