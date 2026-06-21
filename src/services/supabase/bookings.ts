// Service Supabase pour la gestion des réservations
import { supabase } from '@/integrations/supabase/client';
import type { Json, Tables, TablesUpdate } from '@/integrations/supabase/types';
import type { BookingPricingMode } from '@/types';
import { isAdminCreatedBooking } from '@/utils/bookingAdmin';
import { ProfileService } from './profile';
import { SupabaseVehiclesService } from '@/services/supabaseVehiclesService';

type SupabaseBooking = Tables<'bookings'>;
type SupabaseBookingUpdate = TablesUpdate<'bookings'>;

/** Réponse JSON de la RPC Postgres `create_web_booking`. */
interface CreateWebBookingRpcResult {
  id: string;
  reference_number: number | null;
  status: string;
  created_at: string;
}

/**
 * Mode de paiement client (P2 fees dynamic v2).
 * - card_online : Stripe en ligne, frais = get_fee_percent('card_online') côté DB (10% par défaut).
 * - cash_on_site : espèces à l'agence, frais = get_fee_percent('cash_on_site') côté DB (15% par défaut).
 */
export type BookingPaymentMethod = 'card_online' | 'cash_on_site';

function mapCreateWebBookingRpcError(message: string): string {
  if (message.includes('PHONE_REQUIRED')) return 'PHONE_REQUIRED';
  if (message.includes('VEHICLE_NOT_FOUND')) return 'VEHICLE_NOT_FOUND';
  if (message.includes('VEHICLE_UNAVAILABLE')) return 'VEHICLE_UNAVAILABLE';
  if (message.includes('INVALID_DATETIME_RANGE')) return 'INVALID_DATETIME_RANGE';
  if (message.includes('INVALID_PRICE_PER_DAY')) return 'INVALID_PRICE_PER_DAY';
  if (message.includes('HOTEL_NAME_REQUIRED')) return 'HOTEL_NAME_REQUIRED';
  if (message.includes('UNAUTHENTICATED')) return 'UNAUTHENTICATED';
  if (message.includes('INVALID_PAYMENT_METHOD')) return 'INVALID_PAYMENT_METHOD';
  return message;
}

export interface BookingData {
  vehicleId: string;
  renterId: string;
  startDate: string; // Format ISO
  endDate: string; // Format ISO
  totalPrice: number;
  pickupLocation?: string;
  hotelName?: string;
  notes?: string;
  startTime?: string; // Format "06:30"
  endTime?: string; // Format "14:00"
  // Nouvelles colonnes
  selectedOptions?: Array<{
    id?: string;
    name: string;
    pricePerDay: number;
    totalPrice: number;
  }>;
  basePrice?: number;
  optionsTotal?: number;
  serviceFee?: number;
  subtotal?: number;
  pricePerDay?: number;
  rentalDays?: number;
  /** Optionnel : aligné sur `bookings.pricing_mode` (défaut DB `web` si absent à l’insertion) */
  pricingMode?: BookingPricingMode;
  /**
   * P2 (fees dynamic v2) — mode de paiement client.
   * Si absent, la RPC `create_web_booking` applique `card_online` par défaut
   * (via le wrapper 8-arg). Quand le frontend P3 affiche la modale CB/espèces,
   * il doit toujours fournir cette valeur explicitement.
   */
  paymentMethod?: BookingPaymentMethod;
  /** Panier multi-réservation : regroupe plusieurs bookings soumis en une seule fois. */
  cartGroupId?: string;
}

export interface BookingResponse {
  id: string;
  referenceNumber: number;
  status: string;
  createdAt: string;
}

export class SupabaseBookingsService {
  /**
   * Créer une nouvelle réservation
   */
  static async createBooking(bookingData: BookingData): Promise<{
    data: BookingResponse | null;
    error: string | null;
  }> {
    try {
      // 🔒 Guard : Vérifier que l'utilisateur a un téléphone renseigné
      const { data: currentUser, error: profileError } = await ProfileService.getCurrentUserProfile();
      
      if (profileError) {
        // Erreur lors de la récupération du profil utilisateur
        return { data: null, error: 'PROFILE_FETCH_FAILED' };
      }

      if (!currentUser) {
        // Profil utilisateur non trouvé
        return { data: null, error: 'USER_NOT_FOUND' };
      }

      // Vérifier si le téléphone est renseigné (non vide après trim)
      const hasPhone = currentUser.phone && currentUser.phone.trim().length > 0;
      
      if (!hasPhone) {
        // Téléphone manquant - réservation bloquée
        return { data: null, error: 'PHONE_REQUIRED' };
      }

      const startMs = new Date(bookingData.startDate).getTime();
      const endMs = new Date(bookingData.endDate).getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        return { data: null, error: 'INVALID_DATETIME_RANGE' };
      }

      // 🔒 Création via RPC SECURITY DEFINER (recalcul serveur des montants, RLS INSERT bloqué).
      // P2 : on envoie systématiquement `p_payment_method` pour cibler la signature
      // 9-arg de `create_web_booking`. Défaut = 'card_online' (parité 1:1 avec le
      // wrapper 8-arg conservé en compat 72h pour les onglets en cache).
      const paymentMethod: BookingPaymentMethod =
        bookingData.paymentMethod ?? 'card_online';

      // Chaînes vides côté wire → NULLIF(trim(...), '') côté Postgres → NULL.
      // Permet de matcher l'overload 9-arg (params text NOT NULL) tout en
      // produisant les bons NULL en base.
      const { data: rpcData, error: rpcError } = await supabase.rpc('create_web_booking', {
        p_vehicle_id: bookingData.vehicleId,
        p_start_date: bookingData.startDate.split('T')[0],
        p_end_date: bookingData.endDate.split('T')[0],
        p_start_time: bookingData.startTime ?? '',
        p_end_time: bookingData.endTime ?? '',
        p_pickup_location: bookingData.pickupLocation ?? '',
        p_selected_options: (bookingData.selectedOptions ?? []) as unknown as Json,
        p_hotel_name: bookingData.hotelName?.trim() ?? '',
        p_payment_method: paymentMethod,
        p_cart_group_id: bookingData.cartGroupId ?? null,
        p_notes: bookingData.notes?.trim() ?? '',
      });

      if (rpcError) {
        return { data: null, error: mapCreateWebBookingRpcError(rpcError.message) };
      }

      const created = rpcData as CreateWebBookingRpcResult | null;
      if (!created?.id) {
        return { data: null, error: 'Erreur lors de la création de la réservation' };
      }

      if (import.meta.env.DEV) {
        const clientBasePrice = Number(bookingData.basePrice ?? 0) || 0;
        const clientSubtotal = Number(bookingData.subtotal ?? 0) || 0;
        console.debug('[SupabaseBookingsService.createBooking] Réservation créée via RPC', {
          bookingId: created.id,
          clientBasePrice,
          clientSubtotal,
          rpcResult: created,
        });
      }

      return {
        data: {
          id: created.id,
          referenceNumber: created.reference_number ?? 0,
          status: created.status || 'pending',
          createdAt: created.created_at || new Date().toISOString(),
        },
        error: null,
      };
    } catch (error: any) {
      // Erreur inattendue lors de la création de la réservation
      return { data: null, error: error.message || 'Erreur lors de la création de la réservation' };
    }
  }

  /**
   * Récupérer toutes les réservations d'un utilisateur.
   * Si `options.isAdmin === true`, retourne TOUTES les réservations de la plateforme
   * (les RLS Supabase autorisent déjà l'accès complet pour les admins).
   */
  static async getRenterBookings(
    renterId: string,
    options?: { isAdmin?: boolean }
  ): Promise<{
    data: SupabaseBooking[] | null;
    error: string | null;
  }> {
    try {
      console.log('🔍 [BookingsService] Récupération des réservations pour:', renterId, options?.isAdmin ? '(admin: toutes)' : '');

      let query = supabase
        .from('bookings')
        .select(`
          *,
          checkin_depart:checkin_depart(id, status, legal_pdf_url, booking_id)
        `);

      if (!options?.isAdmin) {
        query = query.eq('user_id', renterId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [BookingsService] Erreur lors de la récupération:', error);
        return { data: null, error: error.message };
      }

      console.log('✅ [BookingsService] Réservations récupérées:', data?.length);

      return { data, error: null };
    } catch (error: any) {
      console.error('❌ [BookingsService] Erreur inattendue:', error);
      return { data: null, error: error.message || 'Erreur lors de la récupération des réservations' };
    }
  }

  /**
   * Mettre à jour le statut d'une réservation avec motif optionnel
   */
  static async updateBookingStatusWithReason(
    bookingId: string,
    status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'active' | 'closed' | 'declined' | 'confirmed' | 'pending_payment' | 'terminated',
    reason?: string
  ): Promise<{
    data: SupabaseBooking | null;
    error: string | null;
  }> {
    try {
      console.log('🔄 [BookingsService] Mise à jour du statut avec motif:', bookingId, status, reason);

      // Récupérer les options actuelles
      const { data: currentBooking } = await supabase
        .from('bookings')
        .select('selected_options')
        .eq('id', bookingId)
        .single();

      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Ajouter le motif si fourni
      if (reason) {
        const currentOptions = currentBooking?.selected_options ? 
          (typeof currentBooking.selected_options === 'string' ? 
            JSON.parse(currentBooking.selected_options) : 
            currentBooking.selected_options) : 
          {};
        
        updateData.selected_options = {
          ...currentOptions,
          cancellation: {
            reason,
            cancelledAt: new Date().toISOString()
          }
        };
      }

      const { data, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)
        .select();

      if (error) {
        console.error('❌ [BookingsService] Erreur lors de la mise à jour:', error);
        return { data: null, error: error.message };
      }

      if (!data || data.length === 0) {
        console.error('❌ [BookingsService] Aucune ligne mise à jour');
        return { data: null, error: 'Aucune réservation trouvée avec cet ID' };
      }

      console.log('✅ [BookingsService] Statut mis à jour:', data[0]);

      return { data: data[0], error: null };
    } catch (error: any) {
      console.error('❌ [BookingsService] Erreur inattendue:', error);
      return { data: null, error: error.message || 'Erreur lors de la mise à jour' };
    }
  }

  /**
   * Mettre à jour le statut d'une réservation
   */
  static async updateBookingStatus(
    bookingId: string,
    status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'active' | 'closed' | 'declined' | 'confirmed' | 'pending_payment' | 'terminated'
  ): Promise<{
    data: SupabaseBooking | null;
    error: string | null;
  }> {
    try {
      console.log('🔄 [BookingsService] Mise à jour du statut:', bookingId, status);

      const updateData: SupabaseBookingUpdate = {
        status,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)
        .select();

      if (error) {
        console.error('❌ [BookingsService] Erreur lors de la mise à jour:', error);
        return { data: null, error: error.message };
      }

      if (!data || data.length === 0) {
        console.error('❌ [BookingsService] Aucune ligne mise à jour');
        return { data: null, error: 'Aucune réservation trouvée avec cet ID' };
      }

      console.log('✅ [BookingsService] Statut mis à jour:', data[0]);

      return { data: data[0], error: null };
    } catch (error: any) {
      console.error('❌ [BookingsService] Erreur inattendue:', error);
      return { data: null, error: error.message || 'Erreur lors de la mise à jour' };
    }
  }

  /**
   * Mettre à jour une réservation en pending_payment avec snapshot caution.
   * Utilisé uniquement à l'acceptation owner (pending → pending_payment).
   */
  static async updateBookingToPendingPaymentWithDepositSnapshot(
    bookingId: string,
    vehicleId: string
  ): Promise<{
    data: SupabaseBooking | null;
    error: string | null;
  }> {
    try {
      const { data: vehicle, error: vehicleError } = await SupabaseVehiclesService.getVehicleById(vehicleId);
      if (vehicleError || !vehicle) {
        return { data: null, error: vehicleError || 'Véhicule non trouvé' };
      }
      const depositAmount = (vehicle as { deposit_amount?: number | null }).deposit_amount ?? 1000;
      const vehicleType = (vehicle as { vehicle_type?: string | null }).vehicle_type ?? null;

      let depositEnabledForCategory = true;
      if (vehicleType) {
        const { data: depositRule } = await supabase
          .from('deposit_category_rules')
          .select('deposit_enabled')
          .eq('vehicle_type', vehicleType)
          .maybeSingle();
        if (depositRule && depositRule.deposit_enabled === false) {
          depositEnabledForCategory = false;
        }
      }

      const snapshot = depositEnabledForCategory ? depositAmount : 0;
      const depositStatus = snapshot > 0 ? 'pending' : 'not_required';

      const updateData = {
        status: 'pending_payment' as const,
        updated_at: new Date().toISOString(),
        deposit_amount_snapshot: snapshot,
        deposit_status: depositStatus,
      };

      const { data, error } = await supabase
        .from('bookings')
        .update(updateData as any)
        .eq('id', bookingId)
        .select();

      if (error) {
        console.error('❌ [BookingsService] Erreur snapshot caution:', error);
        return { data: null, error: error.message };
      }
      if (!data || data.length === 0) {
        return { data: null, error: 'Aucune réservation trouvée avec cet ID' };
      }
      return { data: data[0], error: null };
    } catch (err: any) {
      console.error('❌ [BookingsService] Erreur inattendue:', err);
      return { data: null, error: err?.message || 'Erreur lors de la mise à jour' };
    }
  }

  /**
   * Annuler une réservation
   */
  static async cancelBooking(bookingId: string): Promise<{
    data: SupabaseBooking | null;
    error: string | null;
  }> {
    return this.updateBookingStatus(bookingId, 'cancelled');
  }

  /**
   * Récupérer une réservation par son numéro de référence
   */
  static async getBookingByReferenceNumber(referenceNumber: number): Promise<{
    data: SupabaseBooking | null;
    error: string | null;
  }> {
    try {
      console.log('🔍 [BookingsService] Recherche réservation #', referenceNumber);

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('reference_number', referenceNumber)
        .single();

      if (error) {
        console.error('❌ [BookingsService] Erreur lors de la recherche:', error);
        return { data: null, error: error.message };
      }

      console.log('✅ [BookingsService] Réservation trouvée:', data);

      return { data, error: null };
    } catch (error: any) {
      console.error('❌ [BookingsService] Erreur inattendue:', error);
      return { data: null, error: error.message || 'Erreur lors de la recherche' };
    }
  }

  /**
   * Vérifier la disponibilité d'un véhicule
   */
  static async checkAvailability(
    vehicleId: string,
    startDate: string,
    endDate: string
  ): Promise<{ data: boolean; error: string | null }> {
    try {
      console.log('🔍 [BookingsService] Vérification disponibilité:', vehicleId, startDate, endDate);

      const { data, error } = await supabase
        .from('bookings')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .eq('status', 'accepted')
        .or(
          `start_date.gte.${startDate},start_date.lte.${startDate},end_date.gte.${endDate},end_date.lte.${endDate}`
        );

      if (error) {
        console.error('❌ [BookingsService] Erreur lors de la vérification:', error);
        return { data: false, error: error.message };
      }

      const isAvailable = !data || data.length === 0;
      console.log('✅ [BookingsService] Disponibilité:', isAvailable);

      return { data: isAvailable, error: null };
    } catch (error: any) {
      console.error('❌ [BookingsService] Erreur inattendue:', error);
      return { data: false, error: error.message || 'Erreur lors de la vérification de disponibilité' };
    }
  }

  /**
   * Annuler automatiquement les réservations en attente de paiement expirées.
   * Les réservations 'pending' (en attente de décision propriétaire) ne sont PLUS annulées
   * automatiquement — elles restent visibles jusqu'à action manuelle.
   */
  static async cancelExpiredPayments(): Promise<{
    cancelled: number;
    error: string | null;
  }> {
    try {
      console.log('⏰ [BookingsService] Vérification des paiements expirés...');

      // Uniquement pending_payment — les 'pending' ne sont plus auto-annulées
      const { data: bookings, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .in('status', ['pending_payment']);

      if (fetchError) {
        console.error('❌ [BookingsService] Erreur lors de la récupération:', fetchError);
        return { cancelled: 0, error: fetchError.message };
      }

      if (!bookings || bookings.length === 0) {
        return { cancelled: 0, error: null };
      }

      const now = new Date();
      let cancelledCount = 0;

      // Vérifier chaque réservation
      for (const booking of bookings) {
        // Réservations admin : pas de délai (encaissement hors Stripe)
        if (isAdminCreatedBooking(booking)) {
          continue;
        }

        // Vérifier si le délai de paiement (24h) est dépassé
        const confirmedAt = new Date(booking.updated_at || booking.created_at);
        const deadline = new Date(confirmedAt.getTime() + 24 * 60 * 60 * 1000); // +24h

        if (now > deadline) {
          console.log(`⏰ [BookingsService] Réservation ${booking.id} expirée (paiement), annulation...`);

          const result = await this.updateBookingStatusWithReason(booking.id, 'cancelled', 'Délai de paiement expiré');

          if (!result.error) {
            cancelledCount++;

            // Fermer la conversation associée à cette réservation
            const { ConversationsService } = await import('./conversations');
            await ConversationsService.closeConversationForBooking(booking.id);
          } else {
            console.error(`❌ [BookingsService] Erreur lors de l'annulation:`, result.error);
          }
        }
      }

      if (cancelledCount > 0) {
        console.log(`✅ [BookingsService] ${cancelledCount} réservation(s) annulée(s)`);
      }

      return { cancelled: cancelledCount, error: null };
    } catch (error: any) {
      console.error('❌ [BookingsService] Erreur inattendue:', error);
      return { cancelled: 0, error: error.message || 'Erreur lors de l\'annulation automatique' };
    }
  }

  /**
   * Récupérer toutes les réservations des véhicules d'un propriétaire.
   * Si `options.isAdmin === true`, retourne TOUTES les réservations de la plateforme
   * (les RLS Supabase autorisent déjà l'accès complet pour les admins).
   */
  static async getOwnerBookings(
    ownerId: string,
    options?: { isAdmin?: boolean }
  ): Promise<{
    data: SupabaseBooking[] | null;
    error: string | null;
  }> {
    try {
      console.log('🔍 [BookingsService] Récupération réservations pour le propriétaire:', ownerId, options?.isAdmin ? '(admin: toutes)' : '');

      // Cas admin : on saute l'étape véhicules et on récupère tout.
      if (options?.isAdmin) {
        const { data: bookings, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            *,
            checkin_depart:checkin_depart(id, status, legal_pdf_url, booking_id),
            checkin_return:checkin_return(id, status, legal_pdf_url, booking_id, checkin_depart_id, updated_at, has_new_damage, new_damage_count)
          `)
          .order('created_at', { ascending: false });

        if (bookingsError) {
          console.error('❌ [BookingsService] (admin) Erreur récupération réservations:', bookingsError);
          return { data: null, error: bookingsError.message };
        }

        console.log('✅ [BookingsService] (admin) Réservations récupérées:', bookings?.length || 0);
        return { data: bookings, error: null };
      }

      // 1. Récupérer les véhicules du propriétaire
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('owner_id', ownerId);

      if (vehiclesError) {
        console.error('❌ [BookingsService] Erreur récupération véhicules:', vehiclesError);
        return { data: null, error: vehiclesError.message };
      }

      if (!vehicles || vehicles.length === 0) {
        console.log('ℹ️ [BookingsService] Aucun véhicule pour ce propriétaire');
        return { data: [], error: null };
      }

      const vehicleIds = vehicles.map(v => v.id);
      console.log('🚗 [BookingsService] Véhicules du propriétaire:', vehicleIds);

      // 2. Récupérer toutes les réservations pour ces véhicules
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          checkin_depart:checkin_depart(id, status, legal_pdf_url, booking_id),
          checkin_return:checkin_return(id, status, legal_pdf_url, booking_id, checkin_depart_id, updated_at, has_new_damage, new_damage_count)
        `)
        .in('vehicle_id', vehicleIds)
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('❌ [BookingsService] Erreur récupération réservations:', bookingsError);
        return { data: null, error: bookingsError.message };
      }

      console.log('✅ [BookingsService] Réservations récupérées:', bookings?.length || 0);

      return { data: bookings, error: null };
    } catch (error: any) {
      console.error('❌ [BookingsService] Erreur inattendue:', error);
      return { data: null, error: error.message || 'Erreur lors de la récupération des réservations' };
    }
  }
}
