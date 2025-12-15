-- ============================================================================
-- SCRIPT SAFE MIGRATION - PROJET DESTINATION
-- Projet: tbsgzykqcksmqxpimwry (https://tbsgzykqcksmqxpimwry.supabase.co)
-- Mode: NON-DESTRUCTIF UNIQUEMENT
-- Date: 2025-01-27
-- ============================================================================
-- RÈGLES:
-- - CREATE TABLE IF NOT EXISTS
-- - CREATE OR REPLACE FUNCTION
-- - CREATE EXTENSION IF NOT EXISTS
-- - CREATE TRIGGER (si n'existe pas déjà)
-- - INTERDICTION: DROP / TRUNCATE / DELETE / CASCADE
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: INSTALLATION DE L'EXTENSION unaccent
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================================
-- ÉTAPE 2: CRÉATION DES FONCTIONS CUSTOM MANQUANTES
-- ============================================================================

-- Fonction: handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Vérifier si l'utilisateur existe déjà dans profiles
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (
      id, 
      email, 
      first_name, 
      last_name, 
      phone, 
      role, 
      kyc_status,
      created_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'firstName', ''),
      COALESCE(NEW.raw_user_meta_data->>'lastName', ''),
      COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
      'renter',
      'pending',
      NOW()
    );
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log l'erreur mais ne pas faire échouer l'inscription
    RAISE WARNING 'Erreur lors de la création du profil pour l''utilisateur %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Fonction: sync_profile_is_admin()
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

-- Fonction: normalize_text(input_text text)
CREATE OR REPLACE FUNCTION public.normalize_text(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
BEGIN
  RETURN LOWER(UNACCENT(input_text));
END;
$function$;

-- ============================================================================
-- ÉTAPE 3: CRÉATION DES TABLES MANQUANTES
-- ============================================================================

-- Table: payments
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    stripe_payment_id character varying(255),
    stripe_payment_intent_id character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT payments_pkey PRIMARY KEY (id),
    CONSTRAINT payments_amount_check CHECK (amount >= 0),
    CONSTRAINT payments_status_check CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) 
        REFERENCES public.bookings(id) ON DELETE CASCADE
);

-- Table: reviews
CREATE TABLE IF NOT EXISTS public.reviews (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL,
    user_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT reviews_pkey PRIMARY KEY (id),
    CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) 
        REFERENCES public.bookings(id) ON DELETE CASCADE,
    CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) 
        REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT reviews_vehicle_id_fkey FOREIGN KEY (vehicle_id) 
        REFERENCES public.vehicles(id) ON DELETE CASCADE
);

-- ============================================================================
-- ÉTAPE 4: CRÉATION DES INDEXES POUR LES NOUVELLES TABLES
-- ============================================================================

-- Index pour payments
CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);

-- Index pour reviews
CREATE INDEX IF NOT EXISTS idx_reviews_vehicle ON public.reviews(vehicle_id);

-- ============================================================================
-- ÉTAPE 5: ACTIVATION RLS SUR LES NOUVELLES TABLES
-- ============================================================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ÉTAPE 6: CRÉATION DES TRIGGERS POUR sync_profile_is_admin()
-- ============================================================================

-- Trigger INSERT sur profiles
CREATE TRIGGER trigger_sync_profile_is_admin_insert
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_is_admin();

-- Trigger UPDATE sur profiles (sur la colonne is_admin uniquement)
CREATE TRIGGER trigger_sync_profile_is_admin_update
    AFTER UPDATE OF is_admin ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_profile_is_admin();

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================

