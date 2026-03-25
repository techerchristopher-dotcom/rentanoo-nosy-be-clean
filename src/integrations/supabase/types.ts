export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          id: string
          user_id: string
          vehicle_id: string
          start_date: string
          end_date: string
          total_price: number
          status: string | null
          created_at: string | null
          updated_at: string | null
          start_time: string | null
          end_time: string | null
          pickup_location: string | null
          selected_options: Json | null
          base_price: number
          options_total: number
          service_fee: number
          subtotal: number
          price_per_day: number
          rental_days: number | null
          reference_number: number | null
        }
        Insert: {
          id?: string
          user_id: string
          vehicle_id: string
          start_date: string
          end_date: string
          total_price: number
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
          start_time?: string | null
          end_time?: string | null
          pickup_location?: string | null
          selected_options?: Json | null
          base_price?: number
          options_total?: number
          service_fee?: number
          subtotal?: number
          price_per_day?: number
          rental_days?: number | null
          reference_number?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          vehicle_id?: string
          start_date?: string
          end_date?: string
          total_price?: number
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
          start_time?: string | null
          end_time?: string | null
          pickup_location?: string | null
          selected_options?: Json | null
          base_price?: number
          options_total?: number
          service_fee?: number
          subtotal?: number
          price_per_day?: number
          rental_days?: number | null
          reference_number?: number | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: string
          vehicle_id: string
          renter_id: string
          owner_id: string
          booking_id: string | null
          status: "active" | "closed" | "archived" | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          vehicle_id: string
          renter_id: string
          owner_id: string
          booking_id?: string | null
          status?: "active" | "closed" | "archived" | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          vehicle_id?: string
          renter_id?: string
          owner_id?: string
          booking_id?: string | null
          status?: "active" | "closed" | "archived" | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          sender_id: string
          content: string
          message_type: "text" | "image" | "file" | "system" | null
          is_read: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          sender_id: string
          content: string
          message_type?: "text" | "image" | "file" | "system" | null
          is_read?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          sender_id?: string
          content?: string
          message_type?: "text" | "image" | "file" | "system" | null
          is_read?: boolean | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          phone: string | null
          bio: string | null
          role: "renter" | "owner" | "admin" | null
          is_admin: boolean | null
          admin_role: "user" | "admin" | null
          kyc_status: "pending" | "verified" | "rejected" | null
          avatar_url: string | null
          birthdate: string | null
          created_at: string
          updated_at: string | null
          place_of_birth: string | null
          address_line1: string | null
          postal_code: string | null
          city: string | null
          country: string | null
          driver_license_number: string | null
          driver_license_issue_date: string | null
          driver_license_expiration_date: string | null
          driver_license_category: string | null
          driver_license_country: string | null
          driver_license_file_path: string | null
          full_name: string | null
          welcome_email_sent_at: string | null
        }
        Insert: {
          id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          bio?: string | null
          role?: "renter" | "owner" | "admin" | null
          is_admin?: boolean | null
          admin_role?: "user" | "admin" | null
          kyc_status?: "pending" | "verified" | "rejected" | null
          avatar_url?: string | null
          birthdate?: string | null
          created_at?: string
          updated_at?: string | null
          place_of_birth?: string | null
          address_line1?: string | null
          postal_code?: string | null
          city?: string | null
          country?: string | null
          driver_license_number?: string | null
          driver_license_issue_date?: string | null
          driver_license_expiration_date?: string | null
          driver_license_category?: string | null
          driver_license_country?: string | null
          driver_license_file_path?: string | null
          full_name?: string | null
          welcome_email_sent_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          bio?: string | null
          role?: "renter" | "owner" | "admin" | null
          is_admin?: boolean | null
          admin_role?: "user" | "admin" | null
          kyc_status?: "pending" | "verified" | "rejected" | null
          avatar_url?: string | null
          birthdate?: string | null
          created_at?: string
          updated_at?: string | null
          place_of_birth?: string | null
          address_line1?: string | null
          postal_code?: string | null
          city?: string | null
          country?: string | null
          driver_license_number?: string | null
          driver_license_issue_date?: string | null
          driver_license_expiration_date?: string | null
          driver_license_category?: string | null
          driver_license_country?: string | null
          driver_license_file_path?: string | null
          full_name?: string | null
          welcome_email_sent_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
