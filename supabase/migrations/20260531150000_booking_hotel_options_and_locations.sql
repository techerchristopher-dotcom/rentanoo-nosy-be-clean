-- ============================================================================
-- Options hôtel plateforme (10€) + return_location + dérivation lieux serveur
-- ============================================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS return_location text;

COMMENT ON COLUMN public.bookings.return_location IS
  'Lieu de restitution dérivé des options plateforme transport (aéroport, hôtel, agence).';

-- ---------------------------------------------------------------------------
-- Dérive pickup_location / return_location depuis options sanitizées
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.derive_booking_locations(
  p_selected_options jsonb,
  p_hotel_name text DEFAULT NULL
)
RETURNS TABLE (pickup_location text, return_location text)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_has_airport_pickup boolean := false;
  v_has_airport_return boolean := false;
  v_has_hotel_pickup boolean := false;
  v_has_hotel_return boolean := false;
  v_hotel text;
  v_pickup text;
  v_return text;
  v_opt jsonb;
  v_id text;
BEGIN
  v_hotel := nullif(trim(COALESCE(p_hotel_name, '')), '');
  IF v_hotel IS NOT NULL AND length(v_hotel) > 120 THEN
    v_hotel := left(v_hotel, 120);
  END IF;

  FOR v_opt IN SELECT value FROM jsonb_array_elements(COALESCE(p_selected_options, '[]'::jsonb))
  LOOP
    v_id := v_opt ->> 'id';
    IF v_id = 'platform-airport-pickup' THEN v_has_airport_pickup := true; END IF;
    IF v_id = 'platform-airport-return' THEN v_has_airport_return := true; END IF;
    IF v_id = 'platform-hotel-pickup' THEN v_has_hotel_pickup := true; END IF;
    IF v_id = 'platform-hotel-return' THEN v_has_hotel_return := true; END IF;
  END LOOP;

  IF v_has_hotel_pickup OR v_has_hotel_return THEN
    IF v_hotel IS NULL OR length(v_hotel) = 0 THEN
      RAISE EXCEPTION 'HOTEL_NAME_REQUIRED';
    END IF;
  END IF;

  v_pickup := 'Agence Rentanoo';
  v_return := 'Agence Rentanoo';

  IF v_has_airport_pickup THEN
    v_pickup := 'Aéroport de Nosy Be (Fascène)';
  ELSIF v_has_hotel_pickup THEN
    v_pickup := v_hotel;
  END IF;

  IF v_has_airport_return THEN
    v_return := 'Aéroport de Nosy Be (Fascène)';
  ELSIF v_has_hotel_return THEN
    v_return := v_hotel;
  END IF;

  pickup_location := v_pickup;
  return_location := v_return;
  RETURN NEXT;
END;
$$;

-- ---------------------------------------------------------------------------
-- Sanitize options : aéroport 16€ + hôtel 10€
-- ---------------------------------------------------------------------------
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
  v_allowed_platform text[] := ARRAY[
    'platform-airport-pickup',
    'platform-airport-return',
    'platform-hotel-pickup',
    'platform-hotel-return'
  ];
BEGIN
  FOR v_opt IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_raw_options, '[]'::jsonb))
  LOOP
    v_raw_id := v_opt ->> 'id';
    v_resolved_id := public._resolve_booking_option_id(v_raw_id);

    IF v_resolved_id LIKE 'platform-%'
       AND NOT (v_resolved_id = ANY (v_allowed_platform)) THEN
      CONTINUE;
    END IF;

    IF v_resolved_id = ANY (v_allowed_platform) THEN
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
      ELSIF v_resolved_id = 'platform-airport-return' THEN
        v_line := jsonb_build_object(
          'id', 'platform-airport-return',
          'name', 'Restitution à l''aéroport',
          'pricePerDay', 0,
          'totalPrice', 16
        );
        v_line_total := 16;
      ELSIF v_resolved_id = 'platform-hotel-pickup' THEN
        v_line := jsonb_build_object(
          'id', 'platform-hotel-pickup',
          'name', 'Prise en charge à l''hôtel',
          'pricePerDay', 0,
          'totalPrice', 10
        );
        v_line_total := 10;
      ELSE
        v_line := jsonb_build_object(
          'id', 'platform-hotel-return',
          'name', 'Restitution à l''hôtel',
          'pricePerDay', 0,
          'totalPrice', 10
        );
        v_line_total := 10;
      END IF;

      v_options := v_options || jsonb_build_array(v_line);
      v_opt_total := v_opt_total + v_line_total;
      CONTINUE;
    END IF;

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
  total_price := v_sub;
  RETURN NEXT;
END;
$$;

-- Drop old overload before creating extended signature
DROP FUNCTION IF EXISTS public.create_web_booking(uuid, date, date, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.create_web_booking(
  p_vehicle_id uuid,
  p_start_date date,
  p_end_date date,
  p_start_time text DEFAULT NULL,
  p_end_time text DEFAULT NULL,
  p_pickup_location text DEFAULT NULL,
  p_selected_options jsonb DEFAULT '[]'::jsonb,
  p_hotel_name text DEFAULT NULL
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
  v_locations record;
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

  SELECT * INTO v_locations
  FROM public.derive_booking_locations(v_pricing.selected_options, p_hotel_name);

  INSERT INTO public.bookings (
    user_id,
    vehicle_id,
    start_date,
    end_date,
    start_time,
    end_time,
    pickup_location,
    return_location,
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
    v_locations.pickup_location,
    v_locations.return_location,
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
    'total_price', v_row.total_price,
    'pickup_location', v_row.pickup_location,
    'return_location', v_row.return_location
  );
END;
$$;

COMMENT ON FUNCTION public.create_web_booking(uuid, date, date, text, text, text, jsonb, text) IS
  'Crée une réservation web avec recalcul serveur des montants et lieux pickup/return.';

REVOKE ALL ON FUNCTION public.create_web_booking(uuid, date, date, text, text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_web_booking(uuid, date, date, text, text, text, jsonb, text) TO authenticated;
