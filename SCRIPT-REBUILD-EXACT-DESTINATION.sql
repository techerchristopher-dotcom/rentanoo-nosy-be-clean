-- ============================================================================
-- SCRIPT REBUILD EXACT - PROJET DESTINATION
-- Projet DESTINATION: tbsgzykqcksmqxpimwry
-- Alignement sur projet SOURCE: zykwfjxurwmputxwlkxs
-- Date: 2025-01-27
-- ============================================================================
-- ⚠️  DESTRUCTIF: Supprime et recrée tout le schéma Rentanoo
-- ============================================================================

-- ============================================================================
-- A) PRECHECK (READ-ONLY)
-- ============================================================================

DO $$
DECLARE
    row_counts JSONB := '{}'::JSONB;
    total_rows INTEGER := 0;
    table_name TEXT;
    row_count INTEGER;
BEGIN
    FOR table_name IN 
        SELECT unnest(ARRAY['bookings', 'checkin_depart', 'checkin_return', 'conversations', 
                            'messages', 'payments', 'profiles', 'reviews', 'vehicle_photos', 'vehicles'])
    LOOP
        BEGIN
            EXECUTE format('SELECT COUNT(*) FROM public.%I', table_name) INTO row_count;
            row_counts := row_counts || jsonb_build_object(table_name, row_count);
            total_rows := total_rows + row_count;
        EXCEPTION WHEN OTHERS THEN
            row_counts := row_counts || jsonb_build_object(table_name, 0);
        END;
    END LOOP;
    
    RAISE NOTICE 'PRECHECK row_count: %', row_counts;
    
    IF total_rows > 0 THEN
        RAISE EXCEPTION 'STOP: destination non vide (total_rows: %)', total_rows;
    END IF;
END $$;

-- ============================================================================
-- B) DROP COMPLET DU SCHÉMA RENTANOO
-- ============================================================================

-- DROP Triggers
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
DROP TRIGGER IF EXISTS trigger_sync_profile_is_admin_insert ON public.profiles;
DROP TRIGGER IF EXISTS trigger_sync_profile_is_admin_update ON public.profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
DROP TRIGGER IF EXISTS trg_checkin_depart_updated_at ON public.checkin_depart;
DROP TRIGGER IF EXISTS trg_checkin_return_updated_at ON public.checkin_return;
DROP TRIGGER IF EXISTS trg_messages_updated_at ON public.messages;
DROP TRIGGER IF EXISTS trg_vehicles_updated_at ON public.vehicles;

-- DROP Policies (toutes)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- DROP Functions custom
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_profile_is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.normalize_text(text) CASCADE;

-- DROP Types enum / USER-DEFINED
DROP TYPE IF EXISTS public.booking_status CASCADE;

-- DROP Tables (ordre inverse des dépendances)
DROP TABLE IF EXISTS public.checkin_return CASCADE;
DROP TABLE IF EXISTS public.checkin_depart CASCADE;
DROP TABLE IF EXISTS public.vehicle_photos CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================================
-- C) RECREATE EXACT DEPUIS SOURCE
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Functions custom
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (
      id, email, first_name, last_name, phone, role, kyc_status, created_at
    )
    VALUES (
      NEW.id, NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
      COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
      COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
      'renter', 'pending', NOW()
    );
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erreur lors de la création du profil pour l''utilisateur %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_profile_is_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
  update auth.users
  set raw_app_meta_data = jsonb_set(
    coalesce(raw_app_meta_data, '{}'::jsonb),
    '{is_admin}',
    to_jsonb(new.is_admin)
  )
  where id = new.id;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_text(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
  RETURN LOWER(UNACCENT(input_text));
END;
$function$;

-- Table: profiles
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY,
    email text NOT NULL,
    first_name text,
    last_name text,
    phone text,
    avatar_url text,
    bio text,
    role text DEFAULT 'renter'::text,
    kyc_status text DEFAULT 'pending'::text,
    is_admin boolean DEFAULT false,
    admin_role text DEFAULT 'user'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_bio_length CHECK ((bio IS NULL) OR (length(bio) <= 500)),
    CONSTRAINT profiles_admin_role_check CHECK ((admin_role = ANY (ARRAY['user'::text, 'admin'::text]))),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table: vehicles
CREATE TABLE public.vehicles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id uuid NOT NULL,
    brand text NOT NULL,
    model text NOT NULL,
    year integer NOT NULL,
    color text,
    license_plate text,
    mileage integer NOT NULL,
    fuel_type text NOT NULL,
    transmission text NOT NULL,
    seats integer NOT NULL,
    price_per_day numeric NOT NULL,
    available boolean NOT NULL DEFAULT true,
    vehicle_category text,
    pickup_zones jsonb DEFAULT '[]'::jsonb,
    description text,
    rental_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT check_vehicle_category CHECK ((((vehicle_category)::text = ANY ((ARRAY['Citadine'::character varying, 'Berline'::character varying, 'SUV'::character varying, 'Break'::character varying, 'Coupé'::character varying, 'Cabriolet'::character varying, 'Utilitaire'::character varying, 'Camionnette'::character varying, 'Minibus'::character varying, 'Pick-up'::character varying, 'Non spécifié'::character varying])::text[])) OR (vehicle_category IS NULL))),
    CONSTRAINT vehicles_mileage_check CHECK ((mileage >= 0)),
    CONSTRAINT vehicles_price_per_day_check CHECK ((price_per_day > (0)::numeric)),
    CONSTRAINT vehicles_rental_count_check CHECK ((rental_count >= 0)),
    CONSTRAINT vehicles_seats_check CHECK (((seats > 0) AND (seats <= 20))),
    CONSTRAINT vehicles_year_check CHECK (((year >= 1900) AND (year <= 2100))),
    CONSTRAINT vehicles_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table: bookings
CREATE TABLE public.bookings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_price numeric NOT NULL,
    status character varying DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    start_time character varying,
    end_time character varying,
    pickup_location character varying,
    selected_options jsonb,
    base_price numeric NOT NULL,
    options_total numeric NOT NULL,
    service_fee numeric NOT NULL,
    subtotal numeric NOT NULL,
    price_per_day numeric NOT NULL,
    rental_days integer,
    reference_number integer,
    CONSTRAINT bookings_check CHECK ((end_date > start_date)),
    CONSTRAINT bookings_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'pending_payment'::character varying, 'confirmed'::character varying, 'active'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'rejected'::character varying, 'declined'::character varying])::text[]))),
    CONSTRAINT bookings_total_price_check CHECK ((total_price >= (0)::numeric)),
    CONSTRAINT check_start_time_format CHECK (((start_time)::text ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'::text)),
    CONSTRAINT check_end_time_format CHECK (((end_time)::text ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'::text)),
    CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT bookings_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- Table: conversations
CREATE TABLE public.conversations (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id uuid NOT NULL,
    renter_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    booking_id uuid,
    status text NOT NULL DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT conversations_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'closed'::character varying, 'archived'::character varying])::text[]))),
    CONSTRAINT unique_conversation_per_booking UNIQUE (booking_id)
);

-- Table: messages
CREATE TABLE public.messages (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    message_type text NOT NULL DEFAULT 'text'::text,
    is_read boolean NOT NULL DEFAULT false,
    booking_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT messages_message_type_check CHECK (((message_type)::text = ANY (ARRAY[('text'::character varying)::text, ('image'::character varying)::text, ('file'::character varying)::text, ('system'::character varying)::text]))),
    CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT messages_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- Table: checkin_depart
CREATE TABLE public.checkin_depart (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id uuid,
    owner_id uuid,
    renter_id uuid,
    data jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'draft'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    kilometrage_depart numeric,
    niveau_carburant numeric,
    photos_dashboard jsonb DEFAULT '[]'::jsonb,
    photos_exterieur jsonb DEFAULT '[]'::jsonb,
    photos_jantes jsonb DEFAULT '[]'::jsonb,
    photos_coffre jsonb DEFAULT '[]'::jsonb,
    photos_accessoires jsonb DEFAULT '[]'::jsonb,
    degats jsonb DEFAULT '[]'::jsonb,
    remarques_owner text,
    remarques_renter text,
    signature_owner text,
    signature_renter text,
    validated_at timestamp with time zone,
    photo_permis_recto text,
    photo_permis_verso text,
    snapshot_legal jsonb,
    driver_email text,
    driver_phone text,
    owner_last_name text,
    owner_first_name text,
    owner_email text,
    owner_phone text,
    booking_reference_number integer,
    booking_departure_datetime timestamp with time zone,
    booking_return_datetime timestamp with time zone,
    snapshot_version text,
    booking_departure_location text,
    booking_return_location text,
    legal_pdf_url text,
    CONSTRAINT checkin_depart_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT checkin_depart_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE NO ACTION,
    CONSTRAINT checkin_depart_renter_id_fkey FOREIGN KEY (renter_id) REFERENCES profiles(id) ON DELETE NO ACTION
);

-- Table: checkin_return
CREATE TABLE public.checkin_return (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id uuid NOT NULL,
    checkin_depart_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    renter_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'draft'::text,
    data jsonb NOT NULL DEFAULT '{}'::jsonb,
    snapshot_legal jsonb,
    legal_pdf_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT checkin_return_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE RESTRICT,
    CONSTRAINT checkin_return_checkin_depart_id_fkey FOREIGN KEY (checkin_depart_id) REFERENCES checkin_depart(id) ON DELETE RESTRICT,
    CONSTRAINT checkin_return_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE RESTRICT,
    CONSTRAINT checkin_return_renter_id_fkey FOREIGN KEY (renter_id) REFERENCES profiles(id) ON DELETE RESTRICT
);

-- Table: vehicle_photos
CREATE TABLE public.vehicle_photos (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id uuid NOT NULL,
    photo_url text NOT NULL,
    storage_path text NOT NULL,
    is_primary boolean DEFAULT false,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vehicle_photos_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- Table: payments
CREATE TABLE public.payments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    stripe_payment_id character varying(255),
    stripe_payment_intent_id character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payments_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT payments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[]))),
    CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Table: reviews
CREATE TABLE public.reviews (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id uuid NOT NULL,
    user_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT reviews_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- Indexes
CREATE UNIQUE INDEX bookings_pkey ON public.bookings(id);
CREATE INDEX idx_bookings_dates ON public.bookings(start_date, end_date);
CREATE UNIQUE INDEX idx_bookings_reference_number ON public.bookings(reference_number) WHERE reference_number IS NOT NULL;
CREATE INDEX idx_bookings_user ON public.bookings(user_id);
CREATE INDEX idx_bookings_vehicle ON public.bookings(vehicle_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles(id);

CREATE UNIQUE INDEX vehicles_pkey ON public.vehicles(id);
CREATE INDEX idx_vehicles_available ON public.vehicles(available) WHERE available = true;
CREATE INDEX idx_vehicles_category ON public.vehicles(vehicle_category);
CREATE INDEX idx_vehicles_pickup_zones ON public.vehicles USING gin(pickup_zones);
CREATE INDEX idx_vehicles_pickup_zones_gin ON public.vehicles USING gin(pickup_zones);

CREATE UNIQUE INDEX conversations_pkey ON public.conversations(id);
CREATE INDEX idx_conversations_booking_id ON public.conversations(booking_id);
CREATE INDEX idx_conversations_owner_id ON public.conversations(owner_id);
CREATE INDEX idx_conversations_renter_id ON public.conversations(renter_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_vehicle_id ON public.conversations(vehicle_id);
CREATE UNIQUE INDEX unique_conversation_per_booking ON public.conversations(booking_id) WHERE booking_id IS NOT NULL;

CREATE UNIQUE INDEX messages_pkey ON public.messages(id);
CREATE INDEX idx_messages_booking_id ON public.messages(booking_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_messages_is_read ON public.messages(is_read);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);

CREATE UNIQUE INDEX checkin_depart_pkey ON public.checkin_depart(id);
CREATE INDEX checkin_depart_booking_id_idx ON public.checkin_depart(booking_id);
CREATE INDEX idx_checkin_depart_booking_reference_number ON public.checkin_depart(booking_reference_number);
CREATE INDEX idx_checkin_depart_driver_email ON public.checkin_depart(driver_email);
CREATE INDEX idx_checkin_depart_legal_pdf_url ON public.checkin_depart(legal_pdf_url) WHERE legal_pdf_url IS NOT NULL;
CREATE INDEX idx_checkin_depart_snapshot_legal_gin ON public.checkin_depart USING gin(snapshot_legal);
CREATE INDEX idx_checkin_depart_validated_at ON public.checkin_depart(validated_at);
CREATE INDEX idx_checkin_depart_owner_email ON public.checkin_depart(owner_email);

CREATE UNIQUE INDEX checkin_return_pkey ON public.checkin_return(id);
CREATE INDEX idx_checkin_return_booking_id ON public.checkin_return(booking_id);
CREATE INDEX idx_checkin_return_checkin_depart_id ON public.checkin_return(checkin_depart_id);
CREATE UNIQUE INDEX idx_checkin_return_booking_draft ON public.checkin_return(booking_id) WHERE status = 'draft';

CREATE UNIQUE INDEX vehicle_photos_pkey ON public.vehicle_photos(id);
CREATE INDEX idx_vehicle_photos_vehicle_id ON public.vehicle_photos(vehicle_id);
CREATE INDEX idx_vehicle_photos_is_primary ON public.vehicle_photos(vehicle_id, is_primary);

CREATE UNIQUE INDEX payments_pkey ON public.payments(id);
CREATE INDEX idx_payments_booking ON public.payments(booking_id);

CREATE UNIQUE INDEX reviews_pkey ON public.reviews(id);
CREATE INDEX idx_reviews_vehicle ON public.reviews(vehicle_id);

-- Triggers
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_sync_profile_is_admin_insert
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_is_admin();

CREATE TRIGGER trigger_sync_profile_is_admin_update
    AFTER UPDATE OF is_admin ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_is_admin();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_depart DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_return DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_photos ENABLE ROW LEVEL SECURITY;

-- Policies (29 policies exactes du SOURCE)
CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their bookings" ON public.bookings FOR UPDATE TO public USING (auth.uid() = user_id);
CREATE POLICY "Users can view their bookings" ON public.bookings FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "owners_can_update_vehicle_bookings_status" ON public.bookings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = bookings.vehicle_id AND vehicles.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = bookings.vehicle_id AND vehicles.owner_id = auth.uid()));
CREATE POLICY "owners_can_view_vehicle_bookings" ON public.bookings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = bookings.vehicle_id AND vehicles.owner_id = auth.uid()));
CREATE POLICY "renters_can_delete_own_bookings" ON public.bookings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "renters_can_insert_own_bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "renters_can_update_own_bookings" ON public.bookings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "renters_can_view_own_bookings" ON public.bookings FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" ON public.conversations FOR UPDATE TO public USING ((renter_id = auth.uid()) OR (owner_id = auth.uid()));
CREATE POLICY "Users can view conversations they participate in" ON public.conversations FOR SELECT TO public USING ((renter_id = auth.uid()) OR (owner_id = auth.uid()));
CREATE POLICY "owners or renters can create conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK ((auth.uid() = owner_id) OR (auth.uid() = renter_id));

CREATE POLICY "Users can send messages in their conversations" ON public.messages FOR INSERT TO public WITH CHECK ((sender_id = auth.uid()) AND (conversation_id IN (SELECT conversations.id FROM conversations WHERE conversations.renter_id = auth.uid() OR conversations.owner_id = auth.uid())));
CREATE POLICY "Users can update their own messages" ON public.messages FOR UPDATE TO public USING (sender_id = auth.uid());
CREATE POLICY "Users can view messages from their conversations" ON public.messages FOR SELECT TO public USING (conversation_id IN (SELECT conversations.id FROM conversations WHERE conversations.renter_id = auth.uid() OR conversations.owner_id = auth.uid()));

CREATE POLICY "Users can view their payments" ON public.payments FOR SELECT TO public USING (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid()));

CREATE POLICY "profiles_all_access" ON public.profiles FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT TO public USING (true);
CREATE POLICY "Users can create reviews for their bookings" ON public.reviews FOR INSERT TO public WITH CHECK ((auth.uid() = user_id) AND (EXISTS (SELECT 1 FROM bookings WHERE bookings.id = reviews.booking_id AND bookings.user_id = auth.uid() AND bookings.status = 'completed')));
CREATE POLICY "Users can delete their reviews" ON public.reviews FOR DELETE TO public USING (auth.uid() = user_id);
CREATE POLICY "Users can update their reviews" ON public.reviews FOR UPDATE TO public USING (auth.uid() = user_id);

CREATE POLICY "Owners can delete vehicle photos" ON public.vehicle_photos FOR DELETE TO public USING (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = vehicle_photos.vehicle_id AND vehicles.owner_id = auth.uid()));
CREATE POLICY "Owners can insert vehicle photos" ON public.vehicle_photos FOR INSERT TO public WITH CHECK (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = vehicle_photos.vehicle_id AND vehicles.owner_id = auth.uid()));
CREATE POLICY "Owners can update vehicle photos" ON public.vehicle_photos FOR UPDATE TO public USING (EXISTS (SELECT 1 FROM vehicles WHERE vehicles.id = vehicle_photos.vehicle_id AND vehicles.owner_id = auth.uid()));
CREATE POLICY "Photos are viewable by everyone" ON public.vehicle_photos FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can view available vehicles" ON public.vehicles FOR SELECT TO public USING (available = true);
CREATE POLICY "Authenticated users can insert vehicles" ON public.vehicles FOR INSERT TO public WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their vehicles" ON public.vehicles FOR DELETE TO public USING (auth.uid() = owner_id);
CREATE POLICY "Owners can update their vehicles" ON public.vehicles FOR UPDATE TO public USING (auth.uid() = owner_id);

