import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Car, Calendar, Euro, MapPin, Clock, Plus, Filter, CheckCircle, XCircle, AlertCircle, MessageSquare, FileText, Phone, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Footer } from "@/components/layout/footer";
import { VehiclesService, PhotosService } from "@/services";
import { SupabaseVehiclesService } from "@/services/supabaseVehiclesService";
import { PhotoService } from "@/services/supabase/photos";
import { ProfileService } from "@/services/supabase/profile";
import { SupabaseBookingsService } from "@/services/supabase/bookings";
import { supabase } from "@/integrations/supabase/client";
import { Booking, Vehicle, Photo, User } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import RenterBookingCard from "@/components/RenterBookingCard";
import { PaymentFlowModal, type ReservationPayment } from "@/components/PaymentFlowModal";
import { DepositFlowModal } from "@/components/DepositFlowModal";
import { payerLocation } from "@/lib/payerLocation";
import { useTranslation } from "react-i18next";
import {
  buildReservationPaymentFromBooking,
  isCashOnSitePayment,
} from "@/utils/renterPaymentFromBooking";
import { computeBillableRentalDays } from "@/utils/rentalPriceFromDates";
import { logRadixPortalDebug, subscribeRadixPortalDebug } from "@/lib/debugRadixPortal";
import { ANALYTICS_BOOKING_CURRENCY, trackGa4Event } from "@/lib/analytics";

interface BookingWithDetails extends Booking {
  vehicle?: Vehicle;
  primaryPhoto?: Photo;
  depositStatus?: string | null;
  depositAmount?: number | null;
  depositAmountSnapshot?: number | null;
  stripePaymentMethodId?: string | null;
}

type BookingFilter = 'all' | 'pending' | 'active' | 'upcoming' | 'past' | 'cancelled' | 'refused';

/**
 * Détermine si une réservation est considérée comme payée
 * Une réservation est payée si :
 * - status === "accepted"
 * OU
 * - status === "confirmed" (paiement confirmé, même si caution en attente)
 * OU
 * - paid_at est défini/non null
 * OU
 * - stripe_checkout_session_id est défini/non null
 */
function isBookingPaid(booking: BookingWithDetails): boolean {
  // Vérifier le statut
  if (booking.status === "accepted" || booking.status === "confirmed") {
    return true;
  }
  
  // Vérifier les champs de paiement (qui peuvent être dans les données Supabase non typées)
  const bookingAny = booking as any;
  if (bookingAny.paid_at || bookingAny.stripe_checkout_session_id || bookingAny.stripe_payment_intent_id) {
    return true;
  }
  
  return false;
}

/** Option A strict : modale caution uniquement si location payée et caution en attente */
function canOpenDepositModal(booking: BookingWithDetails): boolean {
  const status = booking.status;
  const depositStatus = (booking as any).depositStatus ?? null;
  const snapshot = Number((booking as any).depositAmount ?? (booking as any).depositAmountSnapshot ?? 0);
  const stripePmId = (booking as any).stripePaymentMethodId ?? (booking as any).stripe_payment_method_id ?? null;
  const allowedStatuses = ["confirmed", "accepted"];
  return (
    allowedStatuses.includes(status) &&
    depositStatus === "pending" &&
    snapshot > 0 &&
    !stripePmId
  );
}

export default function RenterBookings() {
  const { t } = useTranslation("common");
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingWithDetails[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<BookingFilter>('all');
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());
  // Notification badge logic removed
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const comingFromStripeSuccess = searchParams.get("afterPayment") === "1";
  const debugRadixDialogs = searchParams.get("debugDialogs") === "1";
  const [isModalOpen, setIsModalOpen] = useState(comingFromStripeSuccess);
  const [modalMode, setModalMode] = useState<"avantPaiement"|"apresPaiement">("avantPaiement");
  const [step1Complete, setStep1Complete] = useState(comingFromStripeSuccess);
  const [reservationCourante, setReservationCourante] = useState<ReservationPayment | null>(null);
  const [depositModalBooking, setDepositModalBooking] = useState<BookingWithDetails | null>(null);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  /**
   * Opt-in: /me/renter/bookings?debugDialogs=1
   * Preuve runtime : nœuds [data-state=open], détail portail, body/html styles,
   * calques fixed plein écran (overlay orphelin), heuristique modale (voir src/lib/debugRadixPortal.ts).
   */
  useEffect(() => {
    if (!debugRadixDialogs) return;

    let raf = 0;
    const scheduleLog = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        raf = 0;
        logRadixPortalDebug();
      });
    };

    scheduleLog();
    const unsubscribe = subscribeRadixPortalDebug(scheduleLog);
    return () => {
      unsubscribe();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [debugRadixDialogs]);

  useEffect(() => {
    if (currentUser) {
      loadBookings();
    }
  }, [currentUser]);

  // Recharger les bookings quand on revient après paiement Stripe
  useEffect(() => {
    if (comingFromStripeSuccess && currentUser) {
      // Recharger les bookings depuis l'API pour avoir les statuts à jour (après webhook)
      loadBookings();
    }
  }, [comingFromStripeSuccess, currentUser]);

  // Auto-remplir la modale quand on revient après paiement Stripe (une fois les bookings chargés)
  useEffect(() => {
    if (comingFromStripeSuccess && bookings.length > 0 && !reservationCourante) {
      // Trouver la réservation la plus récente avec status "accepted", "confirmed" (payée) ou "pending_payment"
      // Note: Le webhook met le status à "confirmed" après paiement réussi
      const recentBooking = bookings
        .filter(b => b.status === 'accepted' || b.status === 'pending_payment' || b.status === 'confirmed')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      
      if (recentBooking && recentBooking.vehicle) {
        const startDate = new Date(recentBooking.startDate);
        const endDate = new Date(recentBooking.endDate);
        const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        const selectedExtras = getServicesFromOptions(recentBooking.selectedOptions);

        setReservationCourante(
          buildReservationPaymentFromBooking(recentBooking as Record<string, unknown>, {
            voiture: `${recentBooking.vehicle.brand} ${recentBooking.vehicle.model}`,
            dateDebut: new Date(recentBooking.startDate).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            dateFin: new Date(recentBooking.endDate).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            duree: days === 1 ? "1 jour" : `${days} jours`,
            extras: selectedExtras,
          })
        );
        
        // Si la réservation est payée (accepted ou trace de paiement), marquer étape 1 complète
        if (isBookingPaid(recentBooking)) {
          setStep1Complete(true);
        }
      }
    }
  }, [comingFromStripeSuccess, bookings, reservationCourante]);

  useEffect(() => {
    filterBookings();
  }, [bookings, activeFilter]);

  // Auto-expand les réservations en attente de paiement + persistance
  useEffect(() => {
    if (filteredBookings.length > 0) {
      // Charger l'état précédent depuis sessionStorage
      const now = new Date();
      const currentCounts: Record<BookingFilter, number> = {
        all: bookings.length,
        pending: 0,
        active: 0,
        upcoming: 0,
        past: 0,
        cancelled: 0,
        refused: 0
      };
      
      bookings.forEach(booking => {
        const startDate = new Date(booking.startDate);
        const endDate = new Date(booking.endDate);
        
        if (booking.status === 'pending' || booking.status === 'pending_payment') {
          currentCounts.pending++;
        }
        if (booking.status === 'accepted' && startDate <= now && endDate >= now) {
          currentCounts.active++;
        }
        if (booking.status === 'accepted' && startDate > now) {
          currentCounts.upcoming++;
        }
        if (booking.status === 'closed' || (endDate < now && booking.status !== 'cancelled')) {
          currentCounts.past++;
        }
        if (booking.status === 'cancelled') {
          currentCounts.cancelled++;
        }
        if (booking.status === 'declined') {
          currentCounts.refused++;
        }
      });
      
      // Nettoyage de l'ancienne logique de badges (aucune initialisation nécessaire)
      return;
    }
    
    // Ne détecter les changements que si on a déjà initialisé
    if (false) {
      // Calculer les comptes actuels et détecter les nouveaux changements
      const now = new Date();
      const currentCounts: Record<BookingFilter, number> = {
        all: bookings.length,
        pending: 0,
        active: 0,
        upcoming: 0,
        past: 0,
        cancelled: 0,
        refused: 0
      };
      
      bookings.forEach(booking => {
        const startDate = new Date(booking.startDate);
        const endDate = new Date(booking.endDate);
        
        if (booking.status === 'pending' || booking.status === 'pending_payment') {
          currentCounts.pending++;
        }
        if (booking.status === 'accepted' && startDate <= now && endDate >= now) {
          currentCounts.active++;
        }
        if (booking.status === 'accepted' && startDate > now) {
          currentCounts.upcoming++;
        }
        if (booking.status === 'closed' || (endDate < now && booking.status !== 'cancelled')) {
          currentCounts.past++;
        }
        if (booking.status === 'cancelled') {
          currentCounts.cancelled++;
        }
        if (booking.status === 'declined') {
          currentCounts.refused++;
        }
      });
      
      // Si un compte a augmenté, marquer ce filtre comme non vu
      setViewedFilters(prev => {
        const newSet = new Set(prev);
        (Object.keys(currentCounts) as BookingFilter[]).forEach(filter => {
          if (filter !== 'all' && currentCounts[filter] > previousCountsRef.current[filter]) {
            newSet.delete(filter); // Retirer du set des vus pour afficher le badge
          }
        });
        return newSet;
      });
      
      // Mettre à jour les comptes précédents
      previousCountsRef.current = currentCounts;
    }
  }, [bookings, activeFilter]);

  // Auto-expand les réservations en attente de paiement + persistance
  useEffect(() => {
    if (filteredBookings.length > 0) {
      // Charger l'état précédent depuis sessionStorage
      const savedExpanded = sessionStorage.getItem('expandedBookings');
      const savedSet = savedExpanded ? new Set(JSON.parse(savedExpanded)) : new Set();
      
      // Ajouter automatiquement les pending_payment
      const pendingPaymentIds = filteredBookings
        .filter(b => b.status === 'pending_payment')
        .map(b => b.id);
      
      // Merger les deux sets
      const newSet = new Set([...savedSet, ...pendingPaymentIds]);
      
      setExpandedBookings(newSet);
      
      // Sauvegarder dans sessionStorage
      sessionStorage.setItem('expandedBookings', JSON.stringify([...newSet]));
    }
  }, [filteredBookings]);

  // Sauvegarder les changements d'état
  const toggleExpanded = (bookingId: string) => {
    setExpandedBookings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId);
      } else {
        newSet.add(bookingId);
      }
      
      // Sauvegarder dans sessionStorage
      sessionStorage.setItem('expandedBookings', JSON.stringify([...newSet]));
      
      return newSet;
    });
  };

  const loadCurrentUser = async () => {
    try {
      const result = await ProfileService.getCurrentUserProfile();
      if (result.data) {
        setCurrentUser(result.data);
        
        // Vérifier le rôle mais NE PAS rediriger (pour ne pas casser le flow de paiement)
        if (!result.data.roles.includes("renter") && !result.data.roles.includes("admin")) {
          console.warn("⚠️ [RenterBookings] Utilisateur sans rôle renter/admin détecté:", result.data.roles);
          toast({
            title: "Accès non autorisé",
            description: "Cette section est réservée aux locataires.",
            variant: "destructive",
          });
          // NE PAS FAIRE navigate("/") ici - on ne veut pas interrompre le paiement
        }
      } else {
        // Pas de données utilisateur mais NE PAS rediriger
        console.warn("⚠️ [RenterBookings] Aucune donnée utilisateur retournée par ProfileService");
        setCurrentUser(null);
        // NE PAS FAIRE navigate("/auth/login") ici - on ne veut pas interrompre le paiement
      }
    } catch (error) {
      // Erreur mais NE PAS rediriger
      console.error("❌ [RenterBookings] Erreur lors du chargement de l'utilisateur:", error);
      setCurrentUser(null);
      // NE PAS FAIRE navigate("/auth/login") ici - on ne veut pas interrompre le paiement
    }
  };

  const loadBookings = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      // Annuler automatiquement les réservations expirées
      await SupabaseBookingsService.cancelExpiredPayments();
      
      const isAdmin = currentUser.isAdmin === true;
      const result = await SupabaseBookingsService.getRenterBookings(currentUser.id, { isAdmin });
      
      console.log('🔍 [RenterBookings] Résultat Supabase:', result);
      
      if (result.error) {
        console.error('❌ [RenterBookings] Erreur Supabase:', result.error);
        toast({
          title: "Erreur",
          description: `Impossible de charger vos réservations: ${result.error}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (!result.data || result.data.length === 0) {
        console.log('ℹ️ [RenterBookings] Aucune réservation trouvée');
        setBookings([]);
        setLoading(false);
        return;
      }

      // Load vehicle and photo details for each booking using Supabase services
      const bookingsWithDetails = await Promise.all(
        result.data.map(async (booking: any) => {
            try {
              const rawCheckin = booking.checkin_depart;
              const checkinEntry = Array.isArray(rawCheckin) ? rawCheckin[0] : rawCheckin;
              const checkinDepart = checkinEntry ? {
                id: checkinEntry.id,
                status: checkinEntry.status,
                legalPdfUrl: checkinEntry.legal_pdf_url || null,
              } : undefined;

              // Convertir les champs snake_case de Supabase vers camelCase
              const bookingId = booking.id;
              const vehicleId = booking.vehicle_id;
              const renterId = booking.user_id;
              const startDate = booking.start_date;
              const endDate = booking.end_date;
              const totalAmount = booking.total_price;
              const startTime = booking.start_time;
              const endTime = booking.end_time;
              const rentalDays = booking.rental_days;
              const pickupLocation = booking.pickup_location;
              const referenceNumber = booking.reference_number;
              
              console.log('🔍 [RenterBookings] Réservation brute:', booking);
              console.log('⏰ [RenterBookings] Heures:', { startTime, endTime, rentalDays });
              
              // Récupérer tous les véhicules depuis Supabase
              const allVehicles = await SupabaseVehiclesService.getAvailableVehicles();
              
              // Debug véhicule
              console.log(`🔍 [RenterBookings] Recherche véhicule ${vehicleId} parmi ${allVehicles.length} véhicules`);
              const vehicleIds = allVehicles.map(v => v.id);
              console.log(`🔍 [RenterBookings] IDs disponibles:`, vehicleIds.slice(0, 3), '...');
              
              // Trouver le véhicule correspondant à l'ID de la réservation
              const vehicle = allVehicles.find(v => v.id === vehicleId);
              
              if (!vehicle) {
                console.error(`❌ [RenterBookings] Véhicule ${vehicleId} NON TROUVÉ !`);
              } else {
                console.log(`✅ [RenterBookings] Véhicule trouvé: ${vehicle.brand} ${vehicle.model}`);
              }
              
              // Récupérer les photos du véhicule
              const photosResult = await PhotoService.getVehiclePhotos(vehicleId);
              const primaryPhoto = photosResult.data?.find(photo => photo.type === 'exterior') || 
                                 photosResult.data?.find(photo => photo.type === 'other') || 
                                 photosResult.data?.[0];

              // Convertir le véhicule Supabase vers l'interface Vehicle attendue
              const mappedVehicle: Vehicle = vehicle ? {
                id: vehicle.id,
                ownerId: vehicle.owner_id || "",
                license: vehicle.id.substring(0, 8).toUpperCase(), // Utiliser les 8 premiers caractères comme license
                brand: vehicle.brand,
                model: vehicle.model,
                color: vehicle.color || "Non spécifié",
                fuel: (vehicle.fuel_type as any) || "gasoline",
                year: vehicle.year,
                hasAC: true,
                doors: vehicle.seats || 5,
                transmission: (vehicle.transmission as any) || "manual",
                mileage: vehicle.mileage || 0,
                dailyPrice: vehicle.price_per_day,
                currency: "EUR",
                latitude: 0,
                longitude: 0,
                status: "available" as any,
                description: vehicle.description || undefined,
                location: vehicle.pickup_zones && vehicle.pickup_zones.length > 0 
                  ? vehicle.pickup_zones.join(', ') 
                  : "Nosy Be, Madagascar",
                // Services supplémentaires (simplifiés pour l'affichage)
                airport_pickup_service: vehicle.airport_pickup_service || false,
                airport_pickup_retrieval: vehicle.airport_pickup_retrieval || false,
                airport_pickup_retrieval_free: vehicle.airport_pickup_retrieval_free || false,
                airport_pickup_retrieval_price: vehicle.airport_pickup_retrieval_price || 0,
                airport_pickup_return: vehicle.airport_pickup_return || false,
                airport_pickup_return_free: vehicle.airport_pickup_return_free || false,
                airport_pickup_return_price: vehicle.airport_pickup_return_price || 0,
                barge_petite_terre_service: vehicle.barge_petite_terre_service || false,
                barge_petite_terre_retrieval: vehicle.barge_petite_terre_retrieval || false,
                barge_petite_terre_retrieval_free: vehicle.barge_petite_terre_retrieval_free || false,
                barge_petite_terre_retrieval_price: vehicle.barge_petite_terre_retrieval_price || 0,
                barge_petite_terre_return: vehicle.barge_petite_terre_return || false,
                barge_petite_terre_return_free: vehicle.barge_petite_terre_return_free || false,
                barge_petite_terre_return_price: vehicle.barge_petite_terre_return_price || 0,
                barge_grande_terre_service: vehicle.barge_grande_terre_service || false,
                barge_grande_terre_retrieval: vehicle.barge_grande_terre_retrieval || false,
                barge_grande_terre_retrieval_free: vehicle.barge_grande_terre_retrieval_free || false,
                barge_grande_terre_retrieval_price: vehicle.barge_grande_terre_retrieval_price || 0,
                barge_grande_terre_return: vehicle.barge_grande_terre_return || false,
                barge_grande_terre_return_free: vehicle.barge_grande_terre_return_free || false,
                barge_grande_terre_return_price: vehicle.barge_grande_terre_return_price || 0,
                // Autres services...
                gps_navigation: vehicle.gps_navigation || false,
                gps_navigation_free: vehicle.gps_navigation_free || false,
                gps_navigation_price: vehicle.gps_navigation_price || 0,
                child_seat: vehicle.child_seat || false,
                child_seat_free: vehicle.child_seat_free || false,
                child_seat_price: vehicle.child_seat_price || 0,
                additional_driver: vehicle.additional_driver || false,
                additional_driver_free: vehicle.additional_driver_free || false,
                additional_driver_price: vehicle.additional_driver_price || 0,
                unlimited_mileage: vehicle.unlimited_mileage || false,
                unlimited_mileage_free: vehicle.unlimited_mileage_free || false,
                unlimited_mileage_price: vehicle.unlimited_mileage_price || 0,
                insurance_coverage: vehicle.insurance_coverage || false,
                insurance_coverage_free: vehicle.insurance_coverage_free || false,
                insurance_coverage_price: vehicle.insurance_coverage_price || 0,
                roadside_assistance: vehicle.roadside_assistance || false,
                roadside_assistance_free: vehicle.roadside_assistance_free || false,
                roadside_assistance_price: vehicle.roadside_assistance_price || 0
              } : undefined;

              // Retourner un objet Booking compatible avec l'interface
              const bookingWithTimes: any = {
                id: bookingId,
                vehicleId: vehicleId,
                renterId: renterId,
                startDate: startDate,
                endDate: endDate,
                totalAmount: totalAmount || 0,
                currency: 'EUR',
                status: booking.status || 'pending',
                createdAt: booking.created_at || new Date().toISOString(),
                updatedAt: booking.updated_at || new Date().toISOString(),
                vehicle: mappedVehicle,
                primaryPhoto: primaryPhoto,
                selectedOptions: booking.selected_options ? 
                  (typeof booking.selected_options === 'string' ? 
                    JSON.parse(booking.selected_options) : 
                    booking.selected_options) : 
                  [],
                // Ajouter depositStatus, depositAmount, depositAmountSnapshot, stripePaymentMethodId depuis Supabase
                depositStatus: (booking as any).deposit_status || null,
                depositAmount: (booking as any).deposit_amount_snapshot ?? null,
                depositAmountSnapshot: (booking as any).deposit_amount_snapshot ?? null,
                stripePaymentMethodId: (booking as any).stripe_payment_method_id ?? null,
                pricingMode: (booking as any).pricing_mode ?? undefined,
                createdByAdminId: (booking as any).created_by_admin_id ?? null,
                paymentMethod: (booking as any).payment_method ?? "card_online",
                amountTotalExpected: (booking as any).amount_total_expected ?? null,
                serviceFeeRenter: (booking as any).service_fee_renter ?? null,
                serviceFeePercentApplied: (booking as any).service_fee_percent_applied ?? null,
                subtotal: (booking as any).subtotal ?? null,
                basePrice: (booking as any).base_price ?? null,
                optionsTotal: (booking as any).options_total ?? null,
                checkinDepart,
              };
              
              // Debug pour les réservations refusées/annulées
              if (booking.status === 'declined' || booking.status === 'cancelled') {
                console.log(`🎯 [RenterBookings] Réservation ${booking.id} (${booking.status}):`, {
                  status: booking.status,
                  selectedOptions: bookingWithTimes.selectedOptions,
                  cancellationReason: (bookingWithTimes.selectedOptions as any)?.cancellation?.reason,
                  vehicle: mappedVehicle ? 'OK' : 'MANQUANT'
                });
              }
              
              // Ajouter les heures et jours si disponibles dans la table bookings
              if (startTime) bookingWithTimes.startTime = startTime;
              if (endTime) bookingWithTimes.endTime = endTime;
              if (rentalDays) (bookingWithTimes as any).rentalDays = rentalDays;
              if (pickupLocation) bookingWithTimes.pickupLocation = pickupLocation;
              if (booking.hotel_name) (bookingWithTimes as any).hotelName = booking.hotel_name;
              if (booking.notes) (bookingWithTimes as any).notes = booking.notes;
              if (referenceNumber) (bookingWithTimes as any).referenceNumber = referenceNumber;
              
              console.log('✅ [RenterBookings] Booking final avec heures:', bookingWithTimes);
              
              return bookingWithTimes;
            } catch (error) {
              console.error(`Erreur lors du chargement du véhicule ${booking.vehicle_id}:`, error);
              return {
                id: booking.id,
                vehicleId: booking.vehicle_id,
                renterId: booking.user_id,
                startDate: booking.start_date,
                endDate: booking.end_date,
                totalAmount: booking.total_price || 0,
                currency: 'EUR',
                status: booking.status || 'pending',
                createdAt: booking.created_at || new Date().toISOString(),
                updatedAt: booking.updated_at || new Date().toISOString(),
                vehicle: undefined,
                primaryPhoto: undefined,
                selectedOptions: booking.selected_options ? 
                  (typeof booking.selected_options === 'string' ? 
                    JSON.parse(booking.selected_options) : 
                    booking.selected_options) : 
                  [],
                // Ajouter depositStatus, depositAmount, depositAmountSnapshot, stripePaymentMethodId depuis Supabase
                depositStatus: (booking as any).deposit_status || null,
                depositAmount: (booking as any).deposit_amount_snapshot ?? null,
                depositAmountSnapshot: (booking as any).deposit_amount_snapshot ?? null,
                stripePaymentMethodId: (booking as any).stripe_payment_method_id ?? null,
                pricingMode: (booking as any).pricing_mode ?? undefined,
                createdByAdminId: (booking as any).created_by_admin_id ?? null,
                paymentMethod: (booking as any).payment_method ?? "card_online",
                amountTotalExpected: (booking as any).amount_total_expected ?? null,
                serviceFeeRenter: (booking as any).service_fee_renter ?? null,
                serviceFeePercentApplied: (booking as any).service_fee_percent_applied ?? null,
                subtotal: (booking as any).subtotal ?? null,
                basePrice: (booking as any).base_price ?? null,
                optionsTotal: (booking as any).options_total ?? null,
                hotelName: (booking as any).hotel_name ?? null,
                notes: (booking as any).notes ?? null,
              };
            }
          })
        );

      setBookings(bookingsWithDetails);
    } catch (error: any) {
      console.error("❌ [RenterBookings] Erreur lors du chargement des réservations:", error);
      console.error("❌ [RenterBookings] Détails de l'erreur:", error?.message, error?.stack);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos réservations.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Abonnement temps réel aux mises à jour des réservations du locataire
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel(`renter-bookings-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          // Recharger la liste dès qu'un statut change côté propriétaire
          loadBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // Helper pour extraire les services/options d'un selectedOptions
  const getServicesFromOptions = (selectedOptions: any) => {
    if (!selectedOptions) return [];
    if (Array.isArray(selectedOptions)) {
      return selectedOptions.map((opt: any) => ({
        label: opt.name || opt.label || 'Service',
        price: opt.totalPrice || opt.price || 0
      }));
    }
    if (typeof selectedOptions === 'object' && selectedOptions.services && Array.isArray(selectedOptions.services)) {
      return selectedOptions.services.map((opt: any) => ({
        label: opt.name || opt.label || 'Service',
        price: opt.totalPrice || opt.price || 0
      }));
    }
    return [];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
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
    return `${days} jours`;
  };

  const handleBookingDeleted = (bookingId: string) => {
    console.log('🗑️ [RenterBookings] Suppression de la réservation:', bookingId);
    
    // Retirer la réservation de la liste
    setBookings(prev => prev.filter(booking => booking.id !== bookingId));
    setFilteredBookings(prev => prev.filter(booking => booking.id !== bookingId));
    
    // Fermer l'accordéon si la réservation était ouverte
    setExpandedBookings(prev => {
      const newSet = new Set(prev);
      newSet.delete(bookingId);
      return newSet;
    });
  };

  const handleBookingUpdated = (bookingId: string) => {
    console.log('🔄 [RenterBookings] Mise à jour de la réservation:', bookingId);
    
    // Recharger toutes les données pour refléter le nouveau statut
    loadBookings();
    
    // Fermer l'accordéon
    setExpandedBookings(prev => {
      const newSet = new Set(prev);
      newSet.delete(bookingId);
      return newSet;
    });
  };

  // Notification badge logic removed

  // Marquer un filtre comme vu quand on clique dessus
  // Notification badge logic removed

  const filterBookings = () => {
    const now = new Date();
    
    const filtered = bookings.filter(booking => {
      const startDate = new Date(booking.startDate);
      const endDate = new Date(booking.endDate);
      const depositStatus = (booking as any).depositStatus;
      
      switch (activeFilter) {
        case 'pending':
          // En attente : confirmed + deposit_status pending OU pending/pending_payment
          return (booking.status === 'confirmed' && depositStatus === 'pending') ||
                 booking.status === 'pending' || 
                 booking.status === 'pending_payment';
        case 'active':
          // En cours : active OU accepted OU (confirmed + deposit paid + dates chevauchantes)
          return booking.status === 'active' ||
                 (booking.status === 'accepted' && startDate <= now && endDate >= now) ||
                 (booking.status === 'confirmed' && 
                  depositStatus === 'paid' &&
                  startDate <= now && 
                  endDate >= now);
        case 'upcoming':
          // À venir : accepted OU (confirmed + deposit paid + start_date > now)
          return (booking.status === 'accepted' && startDate > now) ||
                 (booking.status === 'confirmed' && 
                  depositStatus === 'paid' && 
                  startDate > now);
        case 'past':
          return booking.status === 'closed' || (endDate < now && booking.status !== 'cancelled');
        case 'cancelled':
          return booking.status === 'cancelled';
        case 'refused':
          return booking.status === 'declined';
        case 'all':
        default:
          return true;
      }
    });
    
    setFilteredBookings(filtered);
  };

  const getFilterIcon = (filter: BookingFilter) => {
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

  const getFilterLabel = (filter: BookingFilter) => {
    switch (filter) {
      case "pending":
        return t("bookings.filters.pending", "En attente");
      case "active":
        return t("bookings.filters.active", "En cours");
      case "upcoming":
        return t("bookings.filters.upcoming", "À venir");
      case "past":
        return t("bookings.filters.past", "Terminées");
      case "cancelled":
        return t("bookings.filters.cancelled", "Annulées");
      case "refused":
        return t("bookings.filters.refused", "Refusées");
      case "all":
      default:
        return t("bookings.filters.all", "Toutes");
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-soft min-w-0">
      <main className="flex-1 py-8 min-w-0">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl min-w-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {t("bookings.header.title", "Mes réservations")}
              </h1>
              <p className="text-muted-foreground">
                {t(
                  "bookings.header.subtitle",
                  "Gérez vos locations de véhicules"
                )}
              </p>
            </div>
            <Button
              onClick={() => navigate("/")}
              className="mt-4 sm:mt-0 bg-gradient-lagoon hover:opacity-90 shadow-lagoon"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("bookings.header.newBooking", "Nouvelle réservation")}
            </Button>
          </div>

          {/* Filters — scroll horizontal mobile pour éviter débordement (Option A) */}
          {bookings.length > 0 && (
            <div className="mb-8 -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="flex gap-2 overflow-x-auto pb-2 sm:overflow-visible sm:flex-wrap">
                {(['all', 'pending', 'active', 'upcoming', 'past', 'cancelled', 'refused'] as BookingFilter[]).map((filter) => (
                  <Button
                    key={filter}
                    variant={activeFilter === filter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveFilter(filter)}
                    className={cn(
                      "flex items-center gap-2 transition-all duration-300 relative shrink-0",
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
                      {bookings.filter(booking => {
                        const now = new Date();
                        const startDate = new Date(booking.startDate);
                        const endDate = new Date(booking.endDate);
                        const depositStatus = (booking as any).depositStatus;
                        
                        switch (filter) {
                          case 'pending':
                            // En attente : confirmed + deposit_status pending OU pending/pending_payment
                            return (booking.status === 'confirmed' && depositStatus === 'pending') ||
                                   booking.status === 'pending' || 
                                   booking.status === 'pending_payment';
                          case 'active':
                            // En cours : active OU accepted OU (confirmed + deposit paid + dates chevauchantes)
                            return booking.status === 'active' ||
                                   (booking.status === 'accepted' && startDate <= now && endDate >= now) ||
                                   (booking.status === 'confirmed' && 
                                    depositStatus === 'paid' &&
                                    startDate <= now && 
                                    endDate >= now);
                          case 'upcoming':
                            // À venir : accepted OU (confirmed + deposit paid + start_date > now)
                            return (booking.status === 'accepted' && startDate > now) ||
                                   (booking.status === 'confirmed' && 
                                    depositStatus === 'paid' && 
                                    startDate > now);
                          case 'past':
                            return booking.status === 'closed' || (endDate < now && booking.status !== 'cancelled');
                          case 'cancelled':
                            return booking.status === 'cancelled';
                          case 'refused':
                            return booking.status === 'declined';
                          case 'all':
                          default:
                            return true;
                        }
                      }).length}
                    </Badge>

                    
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div className="w-24 h-20 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                        <div className="h-3 bg-muted rounded w-1/4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredBookings.length > 0 ? (
            <div className="space-y-4">
              {filteredBookings.map((booking) => {
                const isExpanded = expandedBookings.has(booking.id);
                
                return (
                  <RenterBookingCard
                    key={booking.id}
                    booking={booking}
                    isExpanded={isExpanded}
                    toggleExpanded={toggleExpanded}
                    formatDate={formatDate}
                    getDuration={getDuration}
                    onBookingDeleted={handleBookingDeleted}
                    onBookingUpdated={handleBookingUpdated}
                    onRequestPay={(reservation) => {
                      const method = reservation.paymentMethod ?? "card_online";
                      if (!isCashOnSitePayment(method)) {
                        trackGa4Event("payment_flow_opened", {
                          booking_id: String(reservation.id),
                          payment_method: method,
                          amount_total_expected:
                            reservation.amountTotalExpected ?? reservation.totalTTC ?? 0,
                          currency: ANALYTICS_BOOKING_CURRENCY,
                        });
                      }
                      setReservationCourante(reservation);
                      setModalMode("avantPaiement");
                      setStep1Complete(false);
                      setIsModalOpen(true);
                    }}
                    onRequestDeposit={(booking) => {
                      if (!canOpenDepositModal(booking)) {
                        toast({
                          title: t("bookings.deposit.toastPayFirst", "Paiement requis"),
                          description: t("bookings.deposit.toastPayFirstDesc", "Vous pourrez activer la caution après paiement de la location."),
                          variant: "default",
                        });
                        return;
                      }
                      setDepositModalBooking(booking);
                      setIsDepositModalOpen(true);
                    }}
                  />
                );
              })}
            </div>
          ) : bookings.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <CardTitle className="mb-2">
                  {t("bookings.empty.title", "Aucune réservation")}
                </CardTitle>
                <CardDescription className="mb-6">
                  {t(
                    "bookings.empty.description",
                    "Vous n'avez pas encore effectué de réservation. Découvrez nos véhicules disponibles !"
                  )}
                </CardDescription>
                <Button 
                  onClick={() => navigate("/")}
                  className="bg-gradient-lagoon hover:opacity-90 shadow-lagoon"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("bookings.empty.cta", "Faire une réservation")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                {getFilterIcon(activeFilter)}
                <CardTitle className="mb-2 mt-4">
                  {t(
                    "bookings.emptyFiltered.title",
                    "Aucune réservation {{filter}}",
                    { filter: getFilterLabel(activeFilter).toLowerCase() }
                  )}
                </CardTitle>
                <CardDescription className="mb-6">
                  {t(
                    "bookings.emptyFiltered.description",
                    "Aucune réservation ne correspond au filtre sélectionné. Essayez un autre filtre."
                  )}
                </CardDescription>
                <Button 
                  onClick={() => setActiveFilter('all')}
                  variant="outline"
                  className="hover:bg-primary-soft hover:text-primary"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {t(
                    "bookings.emptyFiltered.reset",
                    "Voir toutes les réservations"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <PaymentFlowModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          // Nettoyer le query param après fermeture
          if (comingFromStripeSuccess) {
            navigate("/me/renter/bookings", { replace: true });
          }
        }}
        reservation={reservationCourante || {
          id: "-",
          voiture: "",
          dateDebut: "",
          dateFin: "",
          duree: "",
          montantDeBase: 0,
          fraisService: 0,
          totalTTC: 0,
          extras: [],
        }}
        onPayNow={async (rsv) => {
          if (isCashOnSitePayment(rsv.paymentMethod ?? "card_online")) return;
          try {
            await payerLocation(rsv);
          } catch (e: any) {
            toast({ title: "Erreur paiement", description: e?.message || "Impossible de démarrer le paiement", variant: "destructive" });
          }
        }}
        step1Complete={step1Complete}
        setStep1Complete={setStep1Complete}
        highlightStep2={comingFromStripeSuccess}
        bookingStatus={reservationCourante ? bookings.find(b => b.id === reservationCourante.id)?.status : undefined}
        bookingPaid={(() => {
          if (!reservationCourante) return false;
          const booking = bookings.find(b => b.id === reservationCourante.id);
          return booking ? isBookingPaid(booking) : false;
        })()}
      />

      {depositModalBooking && (
        <DepositFlowModal
          isOpen={isDepositModalOpen}
          onClose={() => {
            setIsDepositModalOpen(false);
            setDepositModalBooking(null);
          }}
          bookingId={depositModalBooking.id}
          depositAmount={Number(depositModalBooking.depositAmount ?? depositModalBooking.depositAmountSnapshot ?? 0)}
          onSuccess={() => {
            loadBookings();
            toast({ title: "Caution activée", description: "Votre carte a été enregistrée avec succès.", variant: "default" });
          }}
        />
      )}

      <Footer />
    </div>
  );
}