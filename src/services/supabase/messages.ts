import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { Message, MessageType } from '@/types';

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

type SupabaseMessage = Tables<'messages'>;
type SupabaseMessageInsert = TablesInsert<'messages'>;
type SupabaseMessageUpdate = TablesUpdate<'messages'>;

/**
 * Service pour gérer les messages dans les conversations
 */
export class MessagesService {
  /**
   * Convertit un message Supabase en message application
   */
  private static fromSupabase(supabaseMessage: SupabaseMessage): Message {
    return {
      id: supabaseMessage.id,
      conversationId: supabaseMessage.conversation_id,
      senderId: supabaseMessage.sender_id,
      content: supabaseMessage.content,
      messageType: (supabaseMessage.message_type || 'text') as MessageType,
      isRead: supabaseMessage.is_read || false,
      createdAt: supabaseMessage.created_at || new Date().toISOString(),
    };
  }

  /**
   * Envoie un nouveau message
   */
  static async sendMessage(params: {
    conversationId: string;
    senderId: string;
    content: string;
    messageType?: MessageType;
  }): Promise<{ data: Message | null; error: string | null }> {
    try {
      // Vérifier l'état de la conversation avant d'envoyer le message
      const { data: convStatusCheck, error: convCheckError } = await supabase
        .from('conversations')
        .select('status')
        .eq('id', params.conversationId)
        .maybeSingle();

      if (convCheckError) {
        console.error('[MessagesService] Erreur vérification statut conversation:', convCheckError);
        return { data: null, error: 'CONVERSATION_STATUS_CHECK_FAILED' };
      }

      if (!convStatusCheck) {
        console.warn('[MessagesService] Conversation introuvable pour envoi de message:', params.conversationId);
        return { data: null, error: 'CONVERSATION_NOT_FOUND' };
      }

      if (convStatusCheck.status !== 'active') {
        console.warn('[MessagesService] Conversation fermée, message bloqué:', params.conversationId);
        return { data: null, error: 'CONVERSATION_CLOSED' };
      }

      const newMessage: SupabaseMessageInsert = {
        conversation_id: params.conversationId,
        sender_id: params.senderId,
        content: params.content,
        message_type: params.messageType || 'text',
        is_read: false,
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(newMessage)
        .select()
        .single();

      if (error) {
        console.error('Erreur envoi message:', error);
        return { data: null, error: error.message };
      }

      return { data: this.fromSupabase(data), error: null };
    } catch (error) {
      console.error('Erreur sendMessage:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      };
    }
  }

  /**
   * Récupère tous les messages d'une conversation
   */
  static async getConversationMessages(conversationId: string): Promise<{ 
    data: Message[]; 
    error: string | null 
  }> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erreur récupération messages:', error);
        return { data: [], error: error.message };
      }

      return { data: data.map(this.fromSupabase), error: null };
    } catch (error) {
      console.error('Erreur getConversationMessages:', error);
      return { 
        data: [], 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      };
    }
  }

  /**
   * Marque un message comme lu
   */
  static async markAsRead(messageId: string): Promise<{ 
    data: Message | null; 
    error: string | null 
  }> {
    try {
      const update: SupabaseMessageUpdate = {
        is_read: true,
      };

      const { data, error } = await supabase
        .from('messages')
        .update(update)
        .eq('id', messageId)
        .select()
        .single();

      if (error) {
        console.error('Erreur marquage message lu:', error);
        return { data: null, error: error.message };
      }

      return { data: this.fromSupabase(data), error: null };
    } catch (error) {
      console.error('Erreur markAsRead:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      };
    }
  }

  /**
   * Marque tous les messages d'une conversation comme lus pour un utilisateur
   */
  static async markConversationAsRead(
    conversationId: string, 
    currentUserId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const update: SupabaseMessageUpdate = {
        is_read: true,
      };

      const { error } = await supabase
        .from('messages')
        .update(update)
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUserId) // Marquer seulement les messages des autres
        .eq('is_read', false);

      if (error) {
        console.error('Erreur marquage conversation lue:', error);
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Erreur markConversationAsRead:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      };
    }
  }

  /**
   * Compte les messages non lus dans une conversation
   */
  static async getUnreadCount(
    conversationId: string, 
    currentUserId: string
  ): Promise<{ count: number; error: string | null }> {
    try {
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUserId)
        .eq('is_read', false);

      if (error) {
        console.error('Erreur comptage messages non lus:', error);
        return { count: 0, error: error.message };
      }

      return { count: count || 0, error: null };
    } catch (error) {
      console.error('Erreur getUnreadCount:', error);
      return { 
        count: 0, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      };
    }
  }

  /**
   * S'abonne aux nouveaux messages d'une conversation en temps réel
   */
  static subscribeToMessages(
    conversationId: string, 
    callback: (message: Message) => void
  ) {
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = this.fromSupabase(payload.new as SupabaseMessage);
          callback(newMessage);
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * S'abonne aux changements de messages (INSERT, UPDATE, DELETE) en temps réel
   */
  static subscribeToMessagesWithCallbacks(params: {
    conversationId: string;
    onInsert: (message: Message) => void;
    onDelete: (messageId: string) => void;
  }) {
    const subscription = supabase
      .channel(`messages-full:${params.conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${params.conversationId}`,
        },
        (payload) => {
          const newMessage = this.fromSupabase(payload.new as SupabaseMessage);
          params.onInsert(newMessage);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${params.conversationId}`,
        },
        (payload) => {
          params.onDelete(payload.old.id);
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Se désabonne des messages en temps réel
   */
  static async unsubscribe(subscription: ReturnType<typeof supabase.channel>) {
    await supabase.removeChannel(subscription);
  }
}

























