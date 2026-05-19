import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { Conversation, ConversationStatus } from '@/types';

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

type SupabaseConversation = Tables<'conversations'>;
type SupabaseConversationInsert = TablesInsert<'conversations'>;
type SupabaseConversationUpdate = TablesUpdate<'conversations'>;

/**
 * Service pour gérer les conversations entre locataires et propriétaires
 */
export class ConversationsService {
  /**
   * Convertit une conversation Supabase en conversation application
   */
  private static fromSupabase(supabaseConversation: SupabaseConversation): Conversation {
    return {
      id: supabaseConversation.id,
      vehicleId: supabaseConversation.vehicle_id,
      renterId: supabaseConversation.renter_id,
      ownerId: supabaseConversation.owner_id,
      bookingId: supabaseConversation.booking_id || undefined,
      status: (supabaseConversation.status || 'active') as ConversationStatus,
      createdAt: supabaseConversation.created_at || new Date().toISOString(),
      updatedAt: supabaseConversation.updated_at || new Date().toISOString(),
    };
  }

  /**
   * Récupère ou crée une conversation pour une réservation
   * IDEMPOTENTE et résistante aux appels concurrents
   * 
   * Règle métier: 1 réservation (booking_id) = 1 conversation unique
   * Cette conversation change de statut (active → closed), mais on ne crée jamais une nouvelle
   * 
   * NE THROW JAMAIS - retourne toujours { data, error }
   * 
   * ⚠️ ATTENTION: Cette fonction CRÉE des conversations en base.
   * Ne l'utiliser QUE dans des contextes d'ACTION MÉTIER (création de demande, acceptation, etc.)
   * Pour les pages de LISTE/DASHBOARD, utiliser getConversationByBookingId() à la place.
   */
  static async getOrCreateConversation(params: {
    vehicleId: string;
    renterId: string;
    ownerId: string;
    bookingId?: string;
  }): Promise<{ data: Conversation | null; error: string | null }> {
    // Log de sécurité pour tracer les appels
    if (typeof window !== 'undefined') {
      console.warn('[getOrCreateConversation] ATTENTION: appelée depuis', window.location?.pathname);
    } else {
      console.warn('[getOrCreateConversation] appelée');
    }
    
    try {
      // ============================================
      // CAS 1: Si bookingId est fourni
      // ============================================
      if (params.bookingId) {
        // Étape A: Essayer d'abord de lire la conversation existante
        const { data: existing, error: searchError } = await supabase
          .from('conversations')
          .select('*')
          .eq('booking_id', params.bookingId)
          .limit(1)
          .maybeSingle();

        // Si conversation existe → on la renvoie immédiatement (idempotence)
        if (existing && !searchError) {
          console.log('[ConversationsService] Conversation existante trouvée pour booking:', params.bookingId);
          return { data: this.fromSupabase(existing), error: null };
        }

        // Si erreur autre que "not found" → retourner l'erreur
        if (searchError && searchError.code !== 'PGRST116') {
          console.error('[ConversationsService] Erreur recherche conversation:', searchError);
          return { data: null, error: searchError.message || 'Erreur lors de la recherche' };
        }

        // Étape B: Pas trouvée → on essaie de la créer
        console.log('[ConversationsService] Création nouvelle conversation pour booking:', params.bookingId);
        const newConversation: SupabaseConversationInsert = {
          vehicle_id: params.vehicleId,
          renter_id: params.renterId,
          owner_id: params.ownerId,
          booking_id: params.bookingId,
          status: 'active',
        };

        const { data: created, error: createError } = await supabase
          .from('conversations')
          .insert(newConversation)
          .select()
          .single();

        // Étape C: Gestion de la concurrence - violation de contrainte unique
        if (createError) {
          // Cas concurrence: quelqu'un d'autre l'a créée au même moment
          if (
            createError.code === '23505' ||
            (createError.message && createError.message.includes('unique_conversation_per_booking'))
          ) {
            console.warn('[getOrCreateConversation] Contrainte unique déclenchée, lecture après échec insert. bookingId:', params.bookingId);
            
            // Relire la conversation qui a été créée par l'autre appel concurrent
            const { data: retryData, error: retryError } = await supabase
              .from('conversations')
              .select('*')
              .eq('booking_id', params.bookingId)
              .limit(1)
              .maybeSingle();

            if (retryData && !retryError) {
              console.log('[getOrCreateConversation] Conversation récupérée après unique_violation:', retryData.id);
              return { data: this.fromSupabase(retryData), error: null };
            }

            console.error('[getOrCreateConversation] Impossible de relire la conversation après unique_violation:', retryError);
            return { 
              data: null, 
              error: retryError?.message || 'Conversation existe déjà mais relire a échoué' 
            };
          }

          // Autres erreurs d'insertion
          console.error('[ConversationsService] Erreur création conversation:', createError);
          return { 
            data: null, 
            error: createError.message || 'Erreur lors de la création de la conversation' 
          };
        }

        // Étape D: Conversation créée avec succès
        console.log('[ConversationsService] Conversation créée avec succès:', created?.id);
        return { data: created ? this.fromSupabase(created) : null, error: null };
      }

      // ============================================
      // CAS 2: Fallback legacy si pas de bookingId
      // ============================================
      // Compatibilité arrière: chercher une conversation existante pour ces participants/vehicle
      // Si plusieurs existent déjà, renvoyer la plus récente, ne pas recréer systématiquement
      const { data: existingArray, error: searchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('vehicle_id', params.vehicleId)
        .eq('renter_id', params.renterId)
        .eq('owner_id', params.ownerId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (searchError) {
        console.error('[ConversationsService] Erreur recherche conversation (fallback):', searchError);
        return { data: null, error: searchError.message };
      }

      const existing = existingArray?.[0] || null;

      // Si conversation existe, la retourner (ne pas recréer)
      if (existing) {
        console.log('[ConversationsService] Conversation existante trouvée (fallback, sans bookingId)');
        return { data: this.fromSupabase(existing), error: null };
      }

      // Sinon, créer une nouvelle conversation (sans booking_id)
      console.log('[ConversationsService] Création nouvelle conversation (fallback, sans bookingId)');
      const newConversation: SupabaseConversationInsert = {
        vehicle_id: params.vehicleId,
        renter_id: params.renterId,
        owner_id: params.ownerId,
        booking_id: params.bookingId || null,
        status: 'active',
      };

      const { data: created, error: createError } = await supabase
        .from('conversations')
        .insert(newConversation)
        .select()
        .single();

      if (createError) {
        console.error('[ConversationsService] Erreur création conversation (fallback):', createError);
        return { data: null, error: createError.message };
      }

      return { data: this.fromSupabase(created), error: null };
    } catch (error) {
      console.error('[ConversationsService] Exception getOrCreateConversation:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      };
    }
  }

  /**
   * Récupère une conversation par son ID
   */
  static async getConversationById(conversationId: string): Promise<{ 
    data: Conversation | null; 
    error: string | null 
  }> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('Erreur récupération conversation:', error);
        return { data: null, error: error.message };
      }

      return { data: this.fromSupabase(data), error: null };
    } catch (error) {
      console.error('Erreur getConversationById:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      };
    }
  }

  /**
   * Récupère une conversation par booking_id (READ-ONLY, ne crée jamais de conversation)
   * À utiliser dans les pages de liste/dashboard pour éviter la création automatique
   */
  static async getConversationByBookingId(bookingId: string): Promise<{ 
    data: Conversation | null; 
    error: string | null 
  }> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('booking_id', bookingId)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[ConversationsService] Erreur SELECT conversation par booking_id:', { bookingId, error });
        return { data: null, error: error.message || 'Erreur lors de la récupération de la conversation' };
      }

      if (!data) {
        return { data: null, error: 'NOT_FOUND' };
      }

      return { data: this.fromSupabase(data), error: null };
    } catch (err) {
      console.error('[ConversationsService] Exception getConversationByBookingId:', err);
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Récupère toutes les conversations d'un utilisateur.
   * Si `options.isAdmin === true`, retourne TOUTES les conversations de la plateforme.
   */
  static async getUserConversations(
    userId: string,
    options?: { isAdmin?: boolean }
  ): Promise<{
    data: Conversation[];
    error: string | null
  }> {
    try {
      let query = supabase
        .from('conversations')
        .select('*');

      if (!options?.isAdmin) {
        query = query.or(`renter_id.eq.${userId},owner_id.eq.${userId}`);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) {
        console.error('Erreur récupération conversations utilisateur:', error);
        return { data: [], error: error.message };
      }

      return { data: data.map(this.fromSupabase), error: null };
    } catch (error) {
      console.error('Erreur getUserConversations:', error);
      return { 
        data: [], 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      };
    }
  }

  /**
   * Récupère les conversations où l'utilisateur est propriétaire du véhicule.
   * Si `options.isAdmin === true`, retourne TOUTES les conversations.
   */
  static async getOwnerConversations(
    ownerId: string,
    options?: { isAdmin?: boolean }
  ): Promise<{
    data: Conversation[];
    error: string | null
  }> {
    try {
      let query = supabase
        .from('conversations')
        .select('*');

      if (!options?.isAdmin) {
        query = query.eq('owner_id', ownerId);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) {
        console.error('Erreur récupération conversations propriétaire:', error);
        return { data: [], error: error.message };
      }

      return { data: (data || []).map(this.fromSupabase), error: null };
    } catch (error) {
      console.error('Erreur getOwnerConversations:', error);
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Met à jour le statut d'une conversation
   */
  static async updateConversationStatus(
    conversationId: string, 
    status: ConversationStatus
  ): Promise<{ data: Conversation | null; error: string | null }> {
    try {
      const update: SupabaseConversationUpdate = {
        status,
      };

      const { data, error } = await supabase
        .from('conversations')
        .update(update)
        .eq('id', conversationId)
        .select()
        .single();

      if (error) {
        console.error('Erreur mise à jour conversation:', error);
        return { data: null, error: error.message };
      }

      return { data: this.fromSupabase(data), error: null };
    } catch (error) {
      console.error('Erreur updateConversationStatus:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      };
    }
  }

  /**
   * Associe une réservation à une conversation
   */
  static async linkBooking(
    conversationId: string, 
    bookingId: string
  ): Promise<{ data: Conversation | null; error: string | null }> {
    try {
      const update: SupabaseConversationUpdate = {
        booking_id: bookingId,
      };

      const { data, error } = await supabase
        .from('conversations')
        .update(update)
        .eq('id', conversationId)
        .select()
        .single();

      if (error) {
        console.error('Erreur association booking:', error);
        return { data: null, error: error.message };
      }

      return { data: this.fromSupabase(data), error: null };
    } catch (error) {
      console.error('Erreur linkBooking:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      };
    }
  }

  /**
   * S'abonne aux changements d'une conversation en temps réel
   */
  static subscribeToConversation(
    conversationId: string,
    callback: (event: 'deleted' | 'updated') => void
  ) {
    const subscription = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`,
        },
        () => {
          callback('deleted');
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Se désabonne d'une conversation en temps réel
   */
  static async unsubscribe(subscription: ReturnType<typeof supabase.channel>) {
    await supabase.removeChannel(subscription);
  }

  /**
   * Ferme une conversation associée à une réservation
   * Ne throw jamais - log seulement les erreurs
   */
  static async closeConversationForBooking(bookingId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ status: 'closed' })
        .eq('booking_id', bookingId);

      if (error) {
        console.error('[ConversationsService] Erreur fermeture conversation:', { bookingId, error });
      } else {
        console.log('[ConversationsService] Conversation fermée pour booking:', bookingId);
      }
    } catch (error) {
      console.error('[ConversationsService] Exception lors de la fermeture conversation:', { bookingId, error });
    }
  }
}


