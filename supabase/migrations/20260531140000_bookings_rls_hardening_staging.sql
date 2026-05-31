-- ============================================================================
-- Phase 6 — Durcissement RLS/RPC bookings (STAGING ONLY — tester avant prod)
-- ============================================================================
-- Objectif :
--   - Interdire INSERT direct client sur bookings (montants falsifiables)
--   - Exposer create_web_booking() SECURITY DEFINER avec recalcul Postgres
--   - Bloquer UPDATE locataire/propriétaire sur colonnes pricing sensibles
--
-- Rollback (staging) :
--   DROP TRIGGER IF EXISTS trg_bookings_guard_pricing_update ON public.bookings;
--   DROP FUNCTION IF EXISTS public.bookings_guard_pricing_update();
--   DROP FUNCTION IF EXISTS public.create_web_booking(uuid, date, date, text, text, text, jsonb);
--   DROP FUNCTION IF EXISTS public.sanitize_booking_selected_options(jsonb, numeric);
--   DROP FUNCTION IF EXISTS public.compute_booking_base_price(numeric, date, date, text, text);
--   DROP FUNCTION IF EXISTS public._booking_combine_datetime(date, text);
--   -- Recréer les policies INSERT supprimées (voir SCRIPT-ALIGN-RLS-POLICIES.sql)
--   CREATE POLICY "Users can create bookings" ON public.bookings FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
--   CREATE POLICY "renters_can_insert_own_bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers tarification (alignés sur src/utils/rentalPriceFromDates.ts)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._booking_combine_datetime(p_date date, p_time text)
RETURNS timestamp
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_date::timestamp + COALESCE(NULLIF(trim(p_time), ''), '00:00')::time;
$$;

COMMENT ON FUNCTION public._booking_combine_datetime(date, text) IS
  'Combine date + HH:mm en timestamp local (aligné combineBookingDateTime TS).';

CREATE OR REPLACE FUNCTION public.compute_booking_base_price(
  p_price_per_day numeric,
  p_start_date date,
  p_end_date date,
  p_start_time text DEFAULT NULL,
  p_end_time text DEFAULT NULL
)
RETURNS TABLE (
  base_price numeric,
  rental_days integer,
  rental_hours numeric
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_start_ts timestamp;
  v_end_ts timestamp;
  v_rental_hours numeric;
  v_complete_days integer;
  v_extra_hours numeric;
  v_total numeric;
BEGIN
  IF p_price_per_day IS NULL OR p_price_per_day < 0 THEN
    RAISE EXCEPTION 'INVALID_PRICE_PER_DAY';
  END IF;

  v_start_ts := public._booking_combine_datetime(p_start_date, p_start_time);
  v_end_ts := public._booking_combine_datetime(p_end_date, p_end_time);

  IF v_end_ts <= v_start_ts THEN
    RAISE EXCEPTION 'INVALID_DATETIME_RANGE';
  END IF;

  v_rental_hours := EXTRACT(EPOCH FROM (v_end_ts - v_start_ts)) / 3600.0;
  v_complete_days := floor(v_rental_hours / 24)::integer;
  v_extra_hours := v_rental_hours - (v_complete_days * 24);

  IF v_rental_hours < 24 THEN
    v_total := p_price_per_day;
    rental_days := 1;
  ELSIF v_extra_hours = 0 THEN
    v_total := v_complete_days * p_price_per_day;
    rental_days := v_complete_days;
  ELSE
    v_total := ceil(v_complete_days * p_price_per_day + v_extra_hours * (p_price_per_day / 24.0));
    rental_days := v_complete_days + 1;
  END IF;

  base_price := round(v_total, 2);
  rental_hours := round(v_rental_hours, 4);
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.compute_booking_base_price(numeric, date, date, text, text) IS
  'Prix location de base (sans options), aligné computeBaseRentalPrice côté app.';

-- ---------------------------------------------------------------------------
-- Sanitization options (aligné src/utils/bookingOptionSecurity.ts)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._resolve_booking_option_id(p_id text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_id
    WHEN 'airport-pickup-retrieval' THEN 'platform-airport-pickup'
    WHEN 'airport-pickup-return' THEN 'platform-airport-return'
    ELSE p_id
  END;
$$;

CREATE OR REPLACE FUNCTION public.sanitize_booking_selected_options(
  p_raw_options jsonb,
  p_base_price numeric
)
RETURNS TABLE (
  selected_options jsonb,
  options_total numeric,
  subtotal numeric,
  service_fee numeric,
  total_price numeric
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_opt jsonb;
  v_raw_id text;
  v_resolved_id text;
  v_name text;
  v_key text;
  v_line jsonb;
  v_options jsonb := '[]'::jsonb;
  v_seen_platform text[] := ARRAY[]::text[];
  v_seen_other text[] := ARRAY[]::text[];
  v_opt_total numeric := 0;
  v_line_total numeric := 0;
  v_safe_base numeric := round(greatest(COALESCE(p_base_price, 0), 0), 2);
  v_sub numeric;
  v_fee numeric;
BEGIN
  FOR v_opt IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_raw_options, '[]'::jsonb))
  LOOP
    v_raw_id := v_opt ->> 'id';
    v_resolved_id := public._resolve_booking_option_id(v_raw_id);

    -- Ignorer options plateforme inconnues (platform-* non autorisées)
    IF v_resolved_id LIKE 'platform-%'
       AND v_resolved_id NOT IN ('platform-airport-pickup', 'platform-airport-return') THEN
      CONTINUE;
    END IF;

    IF v_resolved_id IN ('platform-airport-pickup', 'platform-airport-return') THEN
      IF v_resolved_id = ANY (v_seen_platform) THEN
        CONTINUE;
      END IF;
      v_seen_platform := array_append(v_seen_platform, v_resolved_id);

      IF v_resolved_id = 'platform-airport-pickup' THEN
        v_line := jsonb_build_object(
          'id', 'platform-airport-pickup',
          'name', 'Prise en charge à l''aéroport',
          'pricePerDay', 0,
          'totalPrice', 16
        );
        v_line_total := 16;
      ELSE
        v_line := jsonb_build_object(
          'id', 'platform-airport-return',
          'name', 'Restitution à l''aéroport',
          'pricePerDay', 0,
          'totalPrice', 16
        );
        v_line_total := 16;
      END IF;

      v_options := v_options || jsonb_build_array(v_line);
      v_opt_total := v_opt_total + v_line_total;
      CONTINUE;
    END IF;

    -- Options non plateforme (barge, siège bébé, etc.) — compatibilité existante
    v_name := nullif(trim(v_opt ->> 'name'), '');
    IF v_name IS NULL THEN
      CONTINUE;
    END IF;

    v_key := COALESCE(v_resolved_id, v_name);
    IF v_key = ANY (v_seen_other) THEN
      CONTINUE;
    END IF;
    v_seen_other := array_append(v_seen_other, v_key);

    v_line_total := round(greatest(COALESCE((v_opt ->> 'totalPrice')::numeric, 0), 0), 2);
    v_line := jsonb_build_object(
      'id', COALESCE(v_resolved_id, v_name),
      'name', v_name,
      'pricePerDay', round(greatest(COALESCE((v_opt ->> 'pricePerDay')::numeric, 0), 0), 2),
      'totalPrice', v_line_total
    );
    v_options := v_options || jsonb_build_array(v_line);
    v_opt_total := v_opt_total + v_line_total;
  END LOOP;

  v_opt_total := round(v_opt_total, 2);
  v_sub := round(v_safe_base + v_opt_total, 2);
  v_fee := round(v_sub * 0.15, 2);

  selected_options := v_options;
  options_total := v_opt_total;
  subtotal := v_sub;
  service_fee := v_fee;
  total_price := v_sub; -- bookings.total_price = sous-total (pas TTC Stripe)
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.sanitize_booking_selected_options(jsonb, numeric) IS
  'Recalcule options_total/subtotal/service_fee ; options plateforme à 16€ fixes.';

-- ---------------------------------------------------------------------------
-- RPC création réservation web (SECURITY DEFINER — bypass RLS INSERT)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_web_booking(
  p_vehicle_id uuid,
  p_start_date date,
  p_end_date date,
  p_start_time text DEFAULT NULL,
  p_end_time text DEFAULT NULL,
  p_pickup_location text DEFAULT NULL,
  p_selected_options jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_phone text;
  v_vehicle record;
  v_base record;
  v_pricing record;
  v_row public.bookings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT p.phone INTO v_phone
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_phone IS NULL OR length(trim(v_phone)) = 0 THEN
    RAISE EXCEPTION 'PHONE_REQUIRED';
  END IF;

  SELECT v.id, v.price_per_day, v.available
  INTO v_vehicle
  FROM public.vehicles v
  WHERE v.id = p_vehicle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VEHICLE_NOT_FOUND';
  END IF;

  IF v_vehicle.available IS FALSE THEN
    RAISE EXCEPTION 'VEHICLE_UNAVAILABLE';
  END IF;

  IF v_vehicle.price_per_day IS NULL OR v_vehicle.price_per_day <= 0 THEN
    RAISE EXCEPTION 'INVALID_PRICE_PER_DAY';
  END IF;

  SELECT * INTO v_base
  FROM public.compute_booking_base_price(
    v_vehicle.price_per_day,
    p_start_date,
    p_end_date,
    p_start_time,
    p_end_time
  );

  SELECT * INTO v_pricing
  FROM public.sanitize_booking_selected_options(p_selected_options, v_base.base_price);

  INSERT INTO public.bookings (
    user_id,
    vehicle_id,
    start_date,
    end_date,
    start_time,
    end_time,
    pickup_location,
    status,
    pricing_mode,
    selected_options,
    base_price,
    options_total,
    subtotal,
    service_fee,
    total_price,
    price_per_day,
    rental_days
  ) VALUES (
    v_user_id,
    p_vehicle_id,
    p_start_date,
    p_end_date,
    NULLIF(trim(p_start_time), ''),
    NULLIF(trim(p_end_time), ''),
    NULLIF(trim(p_pickup_location), ''),
    'pending',
    'web',
    CASE WHEN jsonb_array_length(v_pricing.selected_options) > 0 THEN v_pricing.selected_options ELSE NULL END,
    v_base.base_price,
    v_pricing.options_total,
    v_pricing.subtotal,
    v_pricing.service_fee,
    v_pricing.total_price,
    round(v_vehicle.price_per_day, 2),
    v_base.rental_days
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'reference_number', v_row.reference_number,
    'status', v_row.status,
    'created_at', v_row.created_at,
    'base_price', v_row.base_price,
    'options_total', v_row.options_total,
    'subtotal', v_row.subtotal,
    'service_fee', v_row.service_fee,
    'total_price', v_row.total_price
  );
END;
$$;

COMMENT ON FUNCTION public.create_web_booking(uuid, date, date, text, text, text, jsonb) IS
  'Crée une réservation web avec recalcul serveur des montants. Remplace INSERT direct client.';

REVOKE ALL ON FUNCTION public.create_web_booking(uuid, date, date, text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_web_booking(uuid, date, date, text, text, text, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- Trigger : empêcher modification pricing par locataire / propriétaire
-- (service_role / postgres : pas de restriction — webhooks Stripe, API admin)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.bookings_guard_pricing_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt_role text := coalesce(auth.jwt() ->> 'role', '');
BEGIN
  -- Bypass : service role, postgres, ou session sans JWT utilisateur
  IF v_jwt_role = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin')
     OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Locataire : verrouille colonnes sensibles ; autorise annulation (+ selected_options)
  IF auth.uid() = OLD.user_id THEN
    NEW.user_id := OLD.user_id;
    NEW.vehicle_id := OLD.vehicle_id;
    NEW.base_price := OLD.base_price;
    NEW.options_total := OLD.options_total;
    NEW.subtotal := OLD.subtotal;
    NEW.service_fee := OLD.service_fee;
    NEW.total_price := OLD.total_price;
    NEW.price_per_day := OLD.price_per_day;
    NEW.rental_days := OLD.rental_days;
    NEW.pricing_mode := OLD.pricing_mode;

    IF NOT (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status) THEN
      NEW.selected_options := OLD.selected_options;
    END IF;

    RETURN NEW;
  END IF;

  -- Propriétaire du véhicule : peut changer statut / caution, pas le pricing
  IF EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = OLD.vehicle_id AND v.owner_id = auth.uid()
  ) THEN
    NEW.user_id := OLD.user_id;
    NEW.vehicle_id := OLD.vehicle_id;
    NEW.base_price := OLD.base_price;
    NEW.options_total := OLD.options_total;
    NEW.subtotal := OLD.subtotal;
    NEW.service_fee := OLD.service_fee;
    NEW.total_price := OLD.total_price;
    NEW.price_per_day := OLD.price_per_day;
    NEW.rental_days := OLD.rental_days;
    NEW.pricing_mode := OLD.pricing_mode;
    NEW.selected_options := OLD.selected_options;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.bookings_guard_pricing_update() IS
  'Empêche locataire/propriétaire de modifier les montants ; laisse service_role libre.';

DROP TRIGGER IF EXISTS trg_bookings_guard_pricing_update ON public.bookings;

CREATE TRIGGER trg_bookings_guard_pricing_update
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.bookings_guard_pricing_update();

-- ---------------------------------------------------------------------------
-- Policies RLS — remplacement INSERT permissif
-- ---------------------------------------------------------------------------
-- Policies existantes (prod typique, voir SCRIPT-ALIGN-RLS-POLICIES.sql) :
--   DANGEREUSES :
--     "Users can create bookings"              → INSERT sans contrôle montants
--     "renters_can_insert_own_bookings"        → idem (doublon authenticated)
--   PERMISSIVES UPDATE :
--     "Users can update their bookings"        → UPDATE locataire sans restriction colonnes
--     "renters_can_update_own_bookings"        → idem
--   CONSERVÉES (SELECT / owner / DELETE) :
--     "Users can view their bookings"
--     "renters_can_view_own_bookings"
--     "owners_can_view_vehicle_bookings"
--     "owners_can_update_vehicle_bookings_status"
--     "renters_can_delete_own_bookings"
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "renters_can_insert_own_bookings" ON public.bookings;

-- Pas de nouvelle policy INSERT pour authenticated :
-- → INSERT direct refusé par RLS ; création web via RPC create_web_booking (SECURITY DEFINER).

-- Lecture admin dashboard (optionnel — profils is_admin)
DROP POLICY IF EXISTS "admins_can_view_all_bookings" ON public.bookings;

CREATE POLICY "admins_can_view_all_bookings"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.is_admin IS TRUE
          OR p.admin_role = 'admin'
          OR p.role = 'admin'
        )
    )
  );

COMMENT ON POLICY "admins_can_view_all_bookings" ON public.bookings IS
  'Permet aux admins plateforme de lister les réservations via client Supabase.';

-- ---------------------------------------------------------------------------
-- Tests SQL manuels (staging) — exécuter avec JWT locataire / service_role
-- ---------------------------------------------------------------------------
-- 1) INSERT direct (doit ÉCHOUER pour authenticated) :
--    INSERT INTO bookings (user_id, vehicle_id, start_date, end_date, total_price,
--      base_price, options_total, service_fee, subtotal, price_per_day, status)
--    VALUES (auth.uid(), '<vehicle_uuid>', '2026-06-01', '2026-06-03',
--      1, 1, 0, 0, 1, 25, 'pending');
--
-- 2) RPC create_web_booking (doit RÉUSSIR) :
--    SELECT create_web_booking(
--      '<vehicle_uuid>'::uuid,
--      '2026-06-01'::date, '2026-06-03'::date,
--      '08:00', '18:00', 'Aéroport',
--      '[{"id":"platform-airport-pickup","name":"x","totalPrice":0}]'::jsonb
--    );
--    → base_price depuis vehicles.price_per_day, option à 16€, subtotal recalculé
--
-- 3) UPDATE locataire pricing (doit être IGNORÉ par trigger) :
--    UPDATE bookings SET base_price = 0, subtotal = 0 WHERE id = '<booking_id>';
--    → base_price inchangé
--
-- 4) UPDATE locataire annulation (doit PASSER) :
--    UPDATE bookings SET status = 'cancelled',
--      selected_options = selected_options || '{"cancellation":{"reason":"test"}}'::jsonb
--    WHERE id = '<booking_id>' AND user_id = auth.uid();
--
-- 5) Admin API service_role INSERT (doit PASSER — bypass RLS) :
--    via POST /api/admin/bookings avec pricing_mode = admin
