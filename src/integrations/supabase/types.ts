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
      admin_booking_drafts: {
        Row: {
          converted_booking_id: string | null
          created_at: string
          created_by_admin_id: string
          end_date: string | null
          end_time: string | null
          id: string
          notes_admin: string | null
          pickup_location: string | null
          pricing_snapshot: Json | null
          progress_step: string
          renter_user_id: string | null
          start_date: string | null
          start_time: string | null
          status: string
          updated_at: string
          vehicle_id: string | null
          walk_in_payload: Json | null
        }
        Insert: {
          converted_booking_id?: string | null
          created_at?: string
          created_by_admin_id: string
          end_date?: string | null
          end_time?: string | null
          id?: string
          notes_admin?: string | null
          pickup_location?: string | null
          pricing_snapshot?: Json | null
          progress_step?: string
          renter_user_id?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
          walk_in_payload?: Json | null
        }
        Update: {
          converted_booking_id?: string | null
          created_at?: string
          created_by_admin_id?: string
          end_date?: string | null
          end_time?: string | null
          id?: string
          notes_admin?: string | null
          pickup_location?: string | null
          pricing_snapshot?: Json | null
          progress_step?: string
          renter_user_id?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string | null
          walk_in_payload?: Json | null
        }
        Relationships: []
      }
      booking_claim_charges: {
        Row: {
          amount_cents: number
          booking_id: string
          created_at: string
          created_by_profile_id: string
          currency: string
          failure_code: string | null
          failure_message: string | null
          id: string
          metadata: Json
          reason: string
          receipt_url: string | null
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          booking_id: string
          created_at?: string
          created_by_profile_id: string
          currency?: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          metadata?: Json
          reason: string
          receipt_url?: string | null
          status: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string
          created_at?: string
          created_by_profile_id?: string
          currency?: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          metadata?: Json
          reason?: string
          receipt_url?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_claim_charges_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_claim_charges_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_option_categories: {
        Row: {
          option_id: string
          vehicle_type: string
        }
        Insert: {
          option_id: string
          vehicle_type: string
        }
        Update: {
          option_id?: string
          vehicle_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_option_categories_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "booking_options"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_options: {
        Row: {
          active: boolean
          description: string | null
          id: string
          name: string
          option_key: string
          price_mga: number
          pricing_mode: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          description?: string | null
          id?: string
          name: string
          option_key: string
          price_mga?: number
          pricing_mode?: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          description?: string | null
          id?: string
          name?: string
          option_key?: string
          price_mga?: number
          pricing_mode?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          admin_notes: string | null
          amount_total_expected: number | null
          amount_total_paid: number | null
          base_price: number
          cart_group_id: string | null
          created_at: string | null
          created_by_admin_id: string | null
          currency: string | null
          deposit_amount_snapshot: number | null
          deposit_capture_amount: number | null
          deposit_capture_before: string | null
          deposit_hold_created_at: string | null
          deposit_payment_intent_id: string | null
          deposit_reason: string | null
          deposit_status: string | null
          end_date: string
          end_time: string | null
          id: string
          offline_payment_method: string | null
          options_total: number
          owner_payout_amount: number | null
          paid_at: string | null
          payment_method: string | null
          pickup_location: string | null
          platform_total_fee: number | null
          price_per_day: number
          pricing_mode: string | null
          reference_number: number | null
          rental_contract_pdf_url: string | null
          rental_contract_signed_at: string | null
          rental_contract_template_version: string | null
          rental_days: number | null
          return_location: string | null
          selected_options: Json | null
          service_fee: number
          service_fee_owner: number | null
          service_fee_percent_applied: number | null
          service_fee_renter: number | null
          start_date: string
          start_time: string | null
          status: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_method_id: string | null
          subtotal: number
          total_price: number
          updated_at: string | null
          user_id: string
          vehicle_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_total_expected?: number | null
          amount_total_paid?: number | null
          base_price: number
          cart_group_id?: string | null
          created_at?: string | null
          created_by_admin_id?: string | null
          currency?: string | null
          deposit_amount_snapshot?: number | null
          deposit_capture_amount?: number | null
          deposit_capture_before?: string | null
          deposit_hold_created_at?: string | null
          deposit_payment_intent_id?: string | null
          deposit_reason?: string | null
          deposit_status?: string | null
          end_date: string
          end_time?: string | null
          id?: string
          offline_payment_method?: string | null
          options_total: number
          owner_payout_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          pickup_location?: string | null
          platform_total_fee?: number | null
          price_per_day: number
          pricing_mode?: string | null
          reference_number?: number | null
          rental_contract_pdf_url?: string | null
          rental_contract_signed_at?: string | null
          rental_contract_template_version?: string | null
          rental_days?: number | null
          return_location?: string | null
          selected_options?: Json | null
          service_fee: number
          service_fee_owner?: number | null
          service_fee_percent_applied?: number | null
          service_fee_renter?: number | null
          start_date: string
          start_time?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          subtotal: number
          total_price: number
          updated_at?: string | null
          user_id: string
          vehicle_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_total_expected?: number | null
          amount_total_paid?: number | null
          base_price?: number
          cart_group_id?: string | null
          created_at?: string | null
          created_by_admin_id?: string | null
          currency?: string | null
          deposit_amount_snapshot?: number | null
          deposit_capture_amount?: number | null
          deposit_capture_before?: string | null
          deposit_hold_created_at?: string | null
          deposit_payment_intent_id?: string | null
          deposit_reason?: string | null
          deposit_status?: string | null
          end_date?: string
          end_time?: string | null
          id?: string
          offline_payment_method?: string | null
          options_total?: number
          owner_payout_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          pickup_location?: string | null
          platform_total_fee?: number | null
          price_per_day?: number
          pricing_mode?: string | null
          reference_number?: number | null
          rental_contract_pdf_url?: string | null
          rental_contract_signed_at?: string | null
          rental_contract_template_version?: string | null
          rental_days?: number | null
          return_location?: string | null
          selected_options?: Json | null
          service_fee?: number
          service_fee_owner?: number | null
          service_fee_percent_applied?: number | null
          service_fee_renter?: number | null
          start_date?: string
          start_time?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          subtotal?: number
          total_price?: number
          updated_at?: string | null
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "scooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings_backup_pre_p2_20260611: {
        Row: {
          _backup_captured_at_utc: string | null
          admin_notes: string | null
          amount_total_expected: number | null
          amount_total_paid: number | null
          base_price: number | null
          created_at: string | null
          created_by_admin_id: string | null
          currency: string | null
          deposit_amount_snapshot: number | null
          deposit_capture_amount: number | null
          deposit_capture_before: string | null
          deposit_hold_created_at: string | null
          deposit_payment_intent_id: string | null
          deposit_reason: string | null
          deposit_status: string | null
          end_date: string | null
          end_time: string | null
          id: string | null
          offline_payment_method: string | null
          options_total: number | null
          owner_payout_amount: number | null
          paid_at: string | null
          payment_method: string | null
          pickup_location: string | null
          platform_total_fee: number | null
          price_per_day: number | null
          pricing_mode: string | null
          reference_number: number | null
          rental_contract_pdf_url: string | null
          rental_contract_signed_at: string | null
          rental_contract_template_version: string | null
          rental_days: number | null
          return_location: string | null
          selected_options: Json | null
          service_fee: number | null
          service_fee_owner: number | null
          service_fee_percent_applied: number | null
          service_fee_renter: number | null
          start_date: string | null
          start_time: string | null
          status: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_method_id: string | null
          subtotal: number | null
          total_price: number | null
          updated_at: string | null
          user_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          _backup_captured_at_utc?: string | null
          admin_notes?: string | null
          amount_total_expected?: number | null
          amount_total_paid?: number | null
          base_price?: number | null
          created_at?: string | null
          created_by_admin_id?: string | null
          currency?: string | null
          deposit_amount_snapshot?: number | null
          deposit_capture_amount?: number | null
          deposit_capture_before?: string | null
          deposit_hold_created_at?: string | null
          deposit_payment_intent_id?: string | null
          deposit_reason?: string | null
          deposit_status?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string | null
          offline_payment_method?: string | null
          options_total?: number | null
          owner_payout_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          pickup_location?: string | null
          platform_total_fee?: number | null
          price_per_day?: number | null
          pricing_mode?: string | null
          reference_number?: number | null
          rental_contract_pdf_url?: string | null
          rental_contract_signed_at?: string | null
          rental_contract_template_version?: string | null
          rental_days?: number | null
          return_location?: string | null
          selected_options?: Json | null
          service_fee?: number | null
          service_fee_owner?: number | null
          service_fee_percent_applied?: number | null
          service_fee_renter?: number | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          subtotal?: number | null
          total_price?: number | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          _backup_captured_at_utc?: string | null
          admin_notes?: string | null
          amount_total_expected?: number | null
          amount_total_paid?: number | null
          base_price?: number | null
          created_at?: string | null
          created_by_admin_id?: string | null
          currency?: string | null
          deposit_amount_snapshot?: number | null
          deposit_capture_amount?: number | null
          deposit_capture_before?: string | null
          deposit_hold_created_at?: string | null
          deposit_payment_intent_id?: string | null
          deposit_reason?: string | null
          deposit_status?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string | null
          offline_payment_method?: string | null
          options_total?: number | null
          owner_payout_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          pickup_location?: string | null
          platform_total_fee?: number | null
          price_per_day?: number | null
          pricing_mode?: string | null
          reference_number?: number | null
          rental_contract_pdf_url?: string | null
          rental_contract_signed_at?: string | null
          rental_contract_template_version?: string | null
          rental_days?: number | null
          return_location?: string | null
          selected_options?: Json | null
          service_fee?: number | null
          service_fee_owner?: number | null
          service_fee_percent_applied?: number | null
          service_fee_renter?: number | null
          start_date?: string | null
          start_time?: string | null
          status?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          subtotal?: number | null
          total_price?: number | null
          updated_at?: string | null
          user_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: []
      }
      cart_submissions: {
        Row: {
          cart_group_id: string
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          client_user_id: string | null
          created_at: string | null
          id: string
          items_count: number
          notes: string | null
        }
        Insert: {
          cart_group_id: string
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_user_id?: string | null
          created_at?: string | null
          id?: string
          items_count: number
          notes?: string | null
        }
        Update: {
          cart_group_id?: string
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_user_id?: string | null
          created_at?: string | null
          id?: string
          items_count?: number
          notes?: string | null
        }
        Relationships: []
      }
      checkin_depart: {
        Row: {
          booking_departure_datetime: string | null
          booking_departure_location: string | null
          booking_id: string | null
          booking_reference_number: number | null
          booking_return_datetime: string | null
          booking_return_location: string | null
          created_at: string | null
          data: Json | null
          degats: Json | null
          driver_email: string | null
          driver_phone: string | null
          edl_email_last_error: string | null
          edl_email_retry_count: number | null
          edl_email_sent_at: string | null
          edl_email_sent_status: string | null
          id: string
          kilometrage_depart: number | null
          legal_pdf_url: string | null
          niveau_carburant: number | null
          owner_email: string | null
          owner_first_name: string | null
          owner_id: string | null
          owner_last_name: string | null
          owner_phone: string | null
          photo_permis_recto: string | null
          photo_permis_verso: string | null
          photos_accessoires: Json | null
          photos_coffre: Json | null
          photos_dashboard: Json | null
          photos_exterieur: Json | null
          photos_jantes: Json | null
          remarques_owner: string | null
          remarques_renter: string | null
          renter_id: string | null
          signature_owner: string | null
          signature_renter: string | null
          snapshot_legal: Json | null
          snapshot_version: string | null
          status: string | null
          updated_at: string | null
          validated_at: string | null
        }
        Insert: {
          booking_departure_datetime?: string | null
          booking_departure_location?: string | null
          booking_id?: string | null
          booking_reference_number?: number | null
          booking_return_datetime?: string | null
          booking_return_location?: string | null
          created_at?: string | null
          data?: Json | null
          degats?: Json | null
          driver_email?: string | null
          driver_phone?: string | null
          edl_email_last_error?: string | null
          edl_email_retry_count?: number | null
          edl_email_sent_at?: string | null
          edl_email_sent_status?: string | null
          id?: string
          kilometrage_depart?: number | null
          legal_pdf_url?: string | null
          niveau_carburant?: number | null
          owner_email?: string | null
          owner_first_name?: string | null
          owner_id?: string | null
          owner_last_name?: string | null
          owner_phone?: string | null
          photo_permis_recto?: string | null
          photo_permis_verso?: string | null
          photos_accessoires?: Json | null
          photos_coffre?: Json | null
          photos_dashboard?: Json | null
          photos_exterieur?: Json | null
          photos_jantes?: Json | null
          remarques_owner?: string | null
          remarques_renter?: string | null
          renter_id?: string | null
          signature_owner?: string | null
          signature_renter?: string | null
          snapshot_legal?: Json | null
          snapshot_version?: string | null
          status?: string | null
          updated_at?: string | null
          validated_at?: string | null
        }
        Update: {
          booking_departure_datetime?: string | null
          booking_departure_location?: string | null
          booking_id?: string | null
          booking_reference_number?: number | null
          booking_return_datetime?: string | null
          booking_return_location?: string | null
          created_at?: string | null
          data?: Json | null
          degats?: Json | null
          driver_email?: string | null
          driver_phone?: string | null
          edl_email_last_error?: string | null
          edl_email_retry_count?: number | null
          edl_email_sent_at?: string | null
          edl_email_sent_status?: string | null
          id?: string
          kilometrage_depart?: number | null
          legal_pdf_url?: string | null
          niveau_carburant?: number | null
          owner_email?: string | null
          owner_first_name?: string | null
          owner_id?: string | null
          owner_last_name?: string | null
          owner_phone?: string | null
          photo_permis_recto?: string | null
          photo_permis_verso?: string | null
          photos_accessoires?: Json | null
          photos_coffre?: Json | null
          photos_dashboard?: Json | null
          photos_exterieur?: Json | null
          photos_jantes?: Json | null
          remarques_owner?: string | null
          remarques_renter?: string | null
          renter_id?: string | null
          signature_owner?: string | null
          signature_renter?: string | null
          snapshot_legal?: Json | null
          snapshot_version?: string | null
          status?: string | null
          updated_at?: string | null
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkin_depart_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_depart_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_depart_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_return: {
        Row: {
          booking_id: string
          checkin_depart_id: string
          created_at: string
          data: Json
          has_new_damage: boolean | null
          id: string
          legal_pdf_url: string | null
          new_damage_count: number | null
          owner_id: string
          renter_id: string
          snapshot_legal: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          checkin_depart_id: string
          created_at?: string
          data?: Json
          has_new_damage?: boolean | null
          id?: string
          legal_pdf_url?: string | null
          new_damage_count?: number | null
          owner_id: string
          renter_id: string
          snapshot_legal?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          checkin_depart_id?: string
          created_at?: string
          data?: Json
          has_new_damage?: boolean | null
          id?: string
          legal_pdf_url?: string | null
          new_damage_count?: number | null
          owner_id?: string
          renter_id?: string
          snapshot_legal?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_return_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_return_checkin_depart_id_fkey"
            columns: ["checkin_depart_id"]
            isOneToOne: false
            referencedRelation: "checkin_depart"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_return_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkin_return_renter_id_fkey"
            columns: ["renter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          booking_id: string | null
          created_at: string | null
          id: string
          owner_id: string
          renter_id: string
          status: string
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          owner_id: string
          renter_id: string
          status?: string
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string | null
          id?: string
          owner_id?: string
          renter_id?: string
          status?: string
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "scooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_category_rules: {
        Row: {
          deposit_enabled: boolean
          updated_at: string | null
          vehicle_type: string
        }
        Insert: {
          deposit_enabled?: boolean
          updated_at?: string | null
          vehicle_type: string
        }
        Update: {
          deposit_enabled?: boolean
          updated_at?: string | null
          vehicle_type?: string
        }
        Relationships: []
      }
      dictionary_entries: {
        Row: {
          created_at: string
          created_by: string | null
          definitions: Json
          etymology: Json | null
          id: string
          language_code: string
          part_of_speech: string | null
          pronunciation: string | null
          related_entry_ids: string[]
          sources: Json
          status: string
          tags: string[]
          updated_at: string
          updated_by: string | null
          verified: boolean
          word: string
          word_normalized: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          definitions?: Json
          etymology?: Json | null
          id?: string
          language_code: string
          part_of_speech?: string | null
          pronunciation?: string | null
          related_entry_ids?: string[]
          sources?: Json
          status?: string
          tags?: string[]
          updated_at?: string
          updated_by?: string | null
          verified?: boolean
          word: string
          word_normalized: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          definitions?: Json
          etymology?: Json | null
          id?: string
          language_code?: string
          part_of_speech?: string | null
          pronunciation?: string | null
          related_entry_ids?: string[]
          sources?: Json
          status?: string
          tags?: string[]
          updated_at?: string
          updated_by?: string | null
          verified?: boolean
          word?: string
          word_normalized?: string
        }
        Relationships: [
          {
            foreignKeyName: "dictionary_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dictionary_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_owners: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          owner_type: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id?: string
          owner_type?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          owner_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      location_areas: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_rules: {
        Row: {
          created_at: string
          id: string
          interval_days: number | null
          interval_km: number | null
          is_active: boolean
          maintenance_type: string
          model_filter: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          interval_days?: number | null
          interval_km?: number | null
          is_active?: boolean
          maintenance_type: string
          model_filter?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          interval_days?: number | null
          interval_km?: number | null
          is_active?: boolean
          maintenance_type?: string
          model_filter?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_rules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "scooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_rules_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          booking_id: string | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          is_read: boolean
          message_type: string
          sender_id: string
        }
        Insert: {
          booking_id?: string | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_read?: boolean
          message_type?: string
          sender_id: string
        }
        Update: {
          booking_id?: string | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_read?: boolean
          message_type?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          category: string | null
          compatible_models: string[] | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          location: string | null
          name: string
          purchase_price: number | null
          quantity_min: number
          quantity_on_hand: number
          sale_price: number | null
          sku: string
          supplier_id: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          compatible_models?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          purchase_price?: number | null
          quantity_min?: number
          quantity_on_hand?: number
          sale_price?: number | null
          sku: string
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          compatible_models?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          purchase_price?: number | null
          quantity_min?: number
          quantity_on_hand?: number
          sale_price?: number | null
          sku?: string
          supplier_id?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string | null
          id: string
          status: string | null
          stripe_payment_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string | null
          id?: string
          status?: string | null
          stripe_payment_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string | null
          id?: string
          status?: string | null
          stripe_payment_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_line1: string | null
          admin_role: string | null
          avatar_url: string | null
          bio: string | null
          birthdate: string | null
          city: string | null
          confirmation_email_sent_at: string | null
          country: string | null
          created_at: string | null
          driver_license_category: string | null
          driver_license_country: string | null
          driver_license_expiration_date: string | null
          driver_license_file_path: string | null
          driver_license_issue_date: string | null
          driver_license_number: string | null
          email: string
          email_confirmed_at: string | null
          first_name: string | null
          id: string
          is_admin: boolean | null
          kyc_confirmed_at: string | null
          kyc_status: string | null
          last_name: string | null
          phone: string | null
          place_of_birth: string | null
          postal_code: string | null
          role: string | null
          staff_role: string | null
          stripe_customer_id: string | null
          updated_at: string | null
        }
        Insert: {
          address_line1?: string | null
          admin_role?: string | null
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          city?: string | null
          confirmation_email_sent_at?: string | null
          country?: string | null
          created_at?: string | null
          driver_license_category?: string | null
          driver_license_country?: string | null
          driver_license_expiration_date?: string | null
          driver_license_file_path?: string | null
          driver_license_issue_date?: string | null
          driver_license_number?: string | null
          email: string
          email_confirmed_at?: string | null
          first_name?: string | null
          id: string
          is_admin?: boolean | null
          kyc_confirmed_at?: string | null
          kyc_status?: string | null
          last_name?: string | null
          phone?: string | null
          place_of_birth?: string | null
          postal_code?: string | null
          role?: string | null
          staff_role?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line1?: string | null
          admin_role?: string | null
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          city?: string | null
          confirmation_email_sent_at?: string | null
          country?: string | null
          created_at?: string | null
          driver_license_category?: string | null
          driver_license_country?: string | null
          driver_license_expiration_date?: string | null
          driver_license_file_path?: string | null
          driver_license_issue_date?: string | null
          driver_license_number?: string | null
          email?: string
          email_confirmed_at?: string | null
          first_name?: string | null
          id?: string
          is_admin?: boolean | null
          kyc_confirmed_at?: string | null
          kyc_status?: string | null
          last_name?: string | null
          phone?: string | null
          place_of_birth?: string | null
          postal_code?: string | null
          role?: string | null
          staff_role?: string | null
          stripe_customer_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      repair_parts: {
        Row: {
          client_request_id: string | null
          created_at: string
          id: string
          line_total: number | null
          part_id: string
          quantity: number
          repair_id: string
          stock_movement_id: string | null
          unit_cost: number
        }
        Insert: {
          client_request_id?: string | null
          created_at?: string
          id?: string
          line_total?: number | null
          part_id: string
          quantity: number
          repair_id: string
          stock_movement_id?: string | null
          unit_cost: number
        }
        Update: {
          client_request_id?: string | null
          created_at?: string
          id?: string
          line_total?: number | null
          part_id?: string
          quantity?: number
          repair_id?: string
          stock_movement_id?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "repair_parts_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_parts_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_parts_stock_movement_id_fkey"
            columns: ["stock_movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      repairs: {
        Row: {
          closed_at: string | null
          created_by: string | null
          description: string | null
          id: string
          intervention_type: string
          labor_cost: number
          mileage_at_repair: number | null
          notes: string | null
          opened_at: string
          parts_cost: number
          status: string
          title: string
          total_cost: number | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          closed_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          intervention_type: string
          labor_cost?: number
          mileage_at_repair?: number | null
          notes?: string | null
          opened_at?: string
          parts_cost?: number
          status?: string
          title: string
          total_cost?: number | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          closed_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          intervention_type?: string
          labor_cost?: number
          mileage_at_repair?: number | null
          notes?: string | null
          opened_at?: string
          parts_cost?: number
          status?: string
          title?: string
          total_cost?: number | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "repairs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repairs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "scooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repairs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          updated_at: string | null
          user_id: string
          vehicle_id: string
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          updated_at?: string | null
          user_id: string
          vehicle_id: string
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          updated_at?: string | null
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "scooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_lines: {
        Row: {
          created_at: string
          id: string
          line_margin: number | null
          line_total: number | null
          part_id: string
          quantity: number
          sale_id: string
          stock_movement_id: string | null
          unit_purchase_price: number
          unit_sale_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_margin?: number | null
          line_total?: number | null
          part_id: string
          quantity: number
          sale_id: string
          stock_movement_id?: string | null
          unit_purchase_price: number
          unit_sale_price: number
        }
        Update: {
          created_at?: string
          id?: string
          line_margin?: number | null
          line_total?: number | null
          part_id?: string
          quantity?: number
          sale_id?: string
          stock_movement_id?: string | null
          unit_purchase_price?: number
          unit_sale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_lines_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_lines_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_lines_stock_movement_id_fkey"
            columns: ["stock_movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_paid: number
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string | null
          discount: number
          id: string
          margin_total: number
          notes: string | null
          payment_method: string | null
          payment_status: string
          sale_date: string
          subtotal: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount?: number
          id?: string
          margin_total?: number
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          sale_date?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount?: number
          id?: string
          margin_total?: number
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          sale_date?: string
          subtotal?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_fee_rules: {
        Row: {
          fee_percent: number
          id: string
          payment_method: string
          updated_at: string | null
          vehicle_type: string
        }
        Insert: {
          fee_percent: number
          id?: string
          payment_method: string
          updated_at?: string | null
          vehicle_type: string
        }
        Update: {
          fee_percent?: number
          id?: string
          payment_method?: string
          updated_at?: string | null
          vehicle_type?: string
        }
        Relationships: []
      }
      site_analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          metadata: Json
          page_path: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json
          page_path?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json
          page_path?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: string
          part_id: string
          quantity: number
          reason: string | null
          repair_id: string | null
          sale_id: string | null
          supplier_id: string | null
          unit_cost: number | null
          unit_sale_price: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: string
          part_id: string
          quantity: number
          reason?: string | null
          repair_id?: string | null
          sale_id?: string | null
          supplier_id?: string | null
          unit_cost?: number | null
          unit_sale_price?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: string
          part_id?: string
          quantity?: number
          reason?: string | null
          repair_id?: string | null
          sale_id?: string | null
          supplier_id?: string | null
          unit_cost?: number | null
          unit_sale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_photos: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_primary: boolean | null
          photo_url: string
          storage_path: string
          updated_at: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_primary?: boolean | null
          photo_url: string
          storage_path: string
          updated_at?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_primary?: boolean | null
          photo_url?: string
          storage_path?: string
          updated_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_photos_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "scooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_photos_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_states: {
        Row: {
          booking_id: string | null
          created_at: string
          created_by: string | null
          damages: Json
          fuel_level: number | null
          general_condition: string | null
          id: string
          mileage: number | null
          photos: Json
          repair_id: string | null
          state_date: string
          state_type: string
          vehicle_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          damages?: Json
          fuel_level?: number | null
          general_condition?: string | null
          id?: string
          mileage?: number | null
          photos?: Json
          repair_id?: string | null
          state_date?: string
          state_type: string
          vehicle_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          damages?: Json
          fuel_level?: number | null
          general_condition?: string | null
          id?: string
          mileage?: number | null
          photos?: Json
          repair_id?: string | null
          state_date?: string
          state_type?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_states_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_states_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_states_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_states_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "scooters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_states_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          available: boolean
          brand: string
          color: string | null
          created_at: string | null
          deposit_amount: number
          description: string | null
          description_de: string | null
          description_en: string | null
          description_it: string | null
          engine_capacity: string | null
          fuel_type: string | null
          has_ac: boolean | null
          has_pool: boolean
          high_season_surcharge: number
          id: string
          internal_code: string | null
          internal_notes: string | null
          license_plate: string | null
          listing_owner_id: string | null
          listing_owner_phone: string | null
          location_area_id: string | null
          long_duration_discount_14: number
          long_duration_discount_60: number
          low_season_discount: number
          mileage: number
          model: string
          near_beach: boolean
          operational_status: string
          owner_id: string
          pickup_zones: Json | null
          price_per_day: number
          price_per_day_agency: number | null
          purchase_date: string | null
          purchase_price: number | null
          rental_count: number | null
          seats: number | null
          transmission: string | null
          updated_at: string | null
          vehicle_category: string | null
          vehicle_type: string | null
          vin: string | null
          year: number
        }
        Insert: {
          available?: boolean
          brand: string
          color?: string | null
          created_at?: string | null
          deposit_amount?: number
          description?: string | null
          description_de?: string | null
          description_en?: string | null
          description_it?: string | null
          engine_capacity?: string | null
          fuel_type?: string | null
          has_ac?: boolean | null
          has_pool?: boolean
          high_season_surcharge?: number
          id?: string
          internal_code?: string | null
          internal_notes?: string | null
          license_plate?: string | null
          listing_owner_id?: string | null
          listing_owner_phone?: string | null
          location_area_id?: string | null
          long_duration_discount_14?: number
          long_duration_discount_60?: number
          low_season_discount?: number
          mileage: number
          model: string
          near_beach?: boolean
          operational_status?: string
          owner_id: string
          pickup_zones?: Json | null
          price_per_day: number
          price_per_day_agency?: number | null
          purchase_date?: string | null
          purchase_price?: number | null
          rental_count?: number | null
          seats?: number | null
          transmission?: string | null
          updated_at?: string | null
          vehicle_category?: string | null
          vehicle_type?: string | null
          vin?: string | null
          year: number
        }
        Update: {
          available?: boolean
          brand?: string
          color?: string | null
          created_at?: string | null
          deposit_amount?: number
          description?: string | null
          description_de?: string | null
          description_en?: string | null
          description_it?: string | null
          engine_capacity?: string | null
          fuel_type?: string | null
          has_ac?: boolean | null
          has_pool?: boolean
          high_season_surcharge?: number
          id?: string
          internal_code?: string | null
          internal_notes?: string | null
          license_plate?: string | null
          listing_owner_id?: string | null
          listing_owner_phone?: string | null
          location_area_id?: string | null
          long_duration_discount_14?: number
          long_duration_discount_60?: number
          low_season_discount?: number
          mileage?: number
          model?: string
          near_beach?: boolean
          operational_status?: string
          owner_id?: string
          pickup_zones?: Json | null
          price_per_day?: number
          price_per_day_agency?: number | null
          purchase_date?: string | null
          purchase_price?: number | null
          rental_count?: number | null
          seats?: number | null
          transmission?: string | null
          updated_at?: string | null
          vehicle_category?: string | null
          vehicle_type?: string | null
          vin?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_listing_owner_id_fkey"
            columns: ["listing_owner_id"]
            isOneToOne: false
            referencedRelation: "listing_owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_location_area_id_fkey"
            columns: ["location_area_id"]
            isOneToOne: false
            referencedRelation: "location_areas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      scooters: {
        Row: {
          available: boolean | null
          brand: string | null
          color: string | null
          created_at: string | null
          deposit_amount: number | null
          description: string | null
          engine_capacity: string | null
          fuel_type: string | null
          high_season_surcharge: number | null
          id: string | null
          internal_code: string | null
          internal_notes: string | null
          license_plate: string | null
          long_duration_discount_14: number | null
          long_duration_discount_60: number | null
          low_season_discount: number | null
          mileage: number | null
          model: string | null
          operational_status: string | null
          owner_id: string | null
          pickup_zones: Json | null
          price_per_day: number | null
          price_per_day_agency: number | null
          purchase_date: string | null
          purchase_price: number | null
          rental_count: number | null
          seats: number | null
          transmission: string | null
          updated_at: string | null
          vehicle_category: string | null
          vehicle_type: string | null
          vin: string | null
          year: number | null
        }
        Insert: {
          available?: boolean | null
          brand?: string | null
          color?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          engine_capacity?: string | null
          fuel_type?: string | null
          high_season_surcharge?: number | null
          id?: string | null
          internal_code?: string | null
          internal_notes?: string | null
          license_plate?: string | null
          long_duration_discount_14?: number | null
          long_duration_discount_60?: number | null
          low_season_discount?: number | null
          mileage?: number | null
          model?: string | null
          operational_status?: string | null
          owner_id?: string | null
          pickup_zones?: Json | null
          price_per_day?: number | null
          price_per_day_agency?: number | null
          purchase_date?: string | null
          purchase_price?: number | null
          rental_count?: number | null
          seats?: number | null
          transmission?: string | null
          updated_at?: string | null
          vehicle_category?: string | null
          vehicle_type?: string | null
          vin?: string | null
          year?: number | null
        }
        Update: {
          available?: boolean | null
          brand?: string | null
          color?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          engine_capacity?: string | null
          fuel_type?: string | null
          high_season_surcharge?: number | null
          id?: string | null
          internal_code?: string | null
          internal_notes?: string | null
          license_plate?: string | null
          long_duration_discount_14?: number | null
          long_duration_discount_60?: number | null
          low_season_discount?: number | null
          mileage?: number | null
          model?: string | null
          operational_status?: string | null
          owner_id?: string | null
          pickup_zones?: Json | null
          price_per_day?: number | null
          price_per_day_agency?: number | null
          purchase_date?: string | null
          purchase_price?: number | null
          rental_count?: number | null
          seats?: number | null
          transmission?: string | null
          updated_at?: string | null
          vehicle_category?: string | null
          vehicle_type?: string | null
          vin?: string | null
          year?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _booking_combine_datetime: {
        Args: { p_date: string; p_time: string }
        Returns: string
      }
      _resolve_booking_option_id: { Args: { p_id: string }; Returns: string }
      _return_day_fraction: { Args: { p_end_time: string }; Returns: number }
      compute_booking_base_price: {
        Args: {
          p_end_date: string
          p_end_time?: string
          p_price_per_day: number
          p_start_date: string
          p_start_time?: string
        }
        Returns: {
          base_price: number
          rental_days: number
          rental_hours: number
        }[]
      }
      compute_renter_fee: {
        Args: {
          p_payment_method: string
          p_subtotal: number
          p_vehicle_type?: string
        }
        Returns: number
      }
      compute_renter_total: {
        Args: {
          p_payment_method: string
          p_subtotal: number
          p_vehicle_type?: string
        }
        Returns: number
      }
      create_web_booking:
        | {
            Args: {
              p_end_date: string
              p_end_time?: string
              p_hotel_name?: string
              p_pickup_location?: string
              p_selected_options?: Json
              p_start_date: string
              p_start_time?: string
              p_vehicle_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_cart_group_id?: string
              p_end_date: string
              p_end_time: string
              p_hotel_name: string
              p_payment_method: string
              p_pickup_location: string
              p_selected_options: Json
              p_start_date: string
              p_start_time: string
              p_vehicle_id: string
            }
            Returns: Json
          }
      derive_booking_locations: {
        Args: { p_hotel_name?: string; p_selected_options: Json }
        Returns: {
          pickup_location: string
          return_location: string
        }[]
      }
      get_fee_percent: {
        Args: { p_payment_method: string; p_vehicle_type?: string }
        Returns: number
      }
      get_vehicle_by_license: {
        Args: { p_license: string }
        Returns: {
          brand: string
          description: string
          engine_capacity: string
          id: string
          model: string
          photo_url: string
          vehicle_type: string
          year: number
        }[]
      }
      has_staff_role: { Args: { roles: string[] }; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      normalize_text: { Args: { input_text: string }; Returns: string }
      preview_renter_fee: {
        Args: { p_payment_method: string; p_subtotal: number }
        Returns: Json
      }
      recalc_vehicle_operational_status: {
        Args: { p_vehicle_id: string }
        Returns: undefined
      }
      rpc_cancel_part_sale: { Args: { p_sale_id: string }; Returns: undefined }
      rpc_cancel_repair: { Args: { p_repair_id: string }; Returns: undefined }
      rpc_consume_parts_for_repair: {
        Args: { p_lines: Json; p_repair_id: string }
        Returns: Json
      }
      rpc_create_part_sale: { Args: { p_payload: Json }; Returns: string }
      rpc_stock_adjustment: {
        Args: { p_delta: number; p_part_id: string; p_reason?: string }
        Returns: string
      }
      rpc_stock_in: {
        Args: {
          p_part_id: string
          p_quantity: number
          p_reason?: string
          p_supplier_id?: string
          p_unit_cost: number
        }
        Returns: string
      }
      sanitize_booking_selected_options: {
        Args: {
          p_base_price: number
          p_raw_options: Json
          p_vehicle_type?: string
        }
        Returns: {
          options_total: number
          selected_options: Json
          service_fee: number
          subtotal: number
          total_price: number
        }[]
      }
      unaccent: { Args: { "": string }; Returns: string }
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
