-- Wire service_fee_rules + booking_options/booking_option_categories (added in
-- 20260618100000) into the actual pricing pipeline, with vehicle_type-aware
-- lookups and safe fallback to the old global behavior when no category rule
-- exists (so nothing breaks if a category is missing a row).
--
-- Also fixes a latent bug: sanitize_booking_selected_options hardcoded
-- totalPrice 16 / 10 (stale EUR-era values) for the 4 platform transport
-- options instead of the real MGA prices (80000 / 50000) — options_total was
-- silently wrong by orders of magnitude. Now reads real prices from
-- booking_options.

BEGIN;

-- ---------------------------------------------------------------------------
-- get_fee_percent: + p_vehicle_type optional (DEFAULT NULL) — looks up
-- service_fee_rules first, falls back to platform_settings global % if no
-- category rule found (or vehicle_type not provided).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_fee_percent(text);

CREATE OR REPLACE FUNCTION public.get_fee_percent(
  p_payment_method text,
  p_vehicle_type text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key     text;
  v_value   jsonb;
  v_percent numeric;
BEGIN
  IF p_payment_method IS NULL THEN
    RAISE EXCEPTION 'payment_method_required'
      USING ERRCODE = '22023';
  END IF;

  IF p_payment_method NOT IN ('card_online', 'cash_on_site') THEN
    RAISE EXCEPTION 'payment_method_unsupported: %', p_payment_method
      USING ERRCODE = '22023';
  END IF;

  IF p_vehicle_type IS NOT NULL THEN
    SELECT sfr.fee_percent INTO v_percent
    FROM public.service_fee_rules sfr
    WHERE sfr.vehicle_type = p_vehicle_type
      AND sfr.payment_method = p_payment_method;

    IF v_percent IS NOT NULL THEN
      RETURN v_percent;
    END IF;
  END IF;

  IF p_payment_method = 'card_online' THEN
    v_key := 'fee_card_online_percent';
  ELSE
    v_key := 'fee_cash_on_site_percent';
  END IF;

  SELECT value INTO v_value
  FROM public.platform_settings
  WHERE key = v_key;

  IF v_value IS NULL THEN
    RAISE EXCEPTION 'fee_config_missing: %', v_key
      USING ERRCODE = 'P0002';
  END IF;

  BEGIN
    v_percent := (v_value->>'percent')::numeric;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'fee_config_invalid: % = %', v_key, v_value
      USING ERRCODE = '22023';
  END;

  IF v_percent IS NULL OR v_percent < 0 OR v_percent > 1 THEN
    RAISE EXCEPTION 'fee_config_out_of_range: % = %', v_key, v_percent
      USING ERRCODE = '22023';
  END IF;

  RETURN v_percent;
END;
$$;

COMMENT ON FUNCTION public.get_fee_percent(text, text) IS
  'Source de vérité du taux de frais client. Cherche d''abord service_fee_rules (vehicle_type, payment_method) ; si absent, retombe sur platform_settings (global). Lève une exception si rien de configuré.';

REVOKE ALL ON FUNCTION public.get_fee_percent(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_fee_percent(text, text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- compute_renter_fee / compute_renter_total: + p_vehicle_type passthrough
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.compute_renter_fee(numeric, text);

CREATE OR REPLACE FUNCTION public.compute_renter_fee(
  p_subtotal       numeric,
  p_payment_method text,
  p_vehicle_type   text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_percent numeric;
BEGIN
  IF p_subtotal IS NULL OR p_subtotal < 0 THEN
    RETURN 0;
  END IF;

  v_percent := public.get_fee_percent(p_payment_method, p_vehicle_type);
  RETURN round(p_subtotal * v_percent, 2);
END;
$$;

COMMENT ON FUNCTION public.compute_renter_fee(numeric, text, text) IS
  'round(subtotal * get_fee_percent(payment_method, vehicle_type), 2). Retourne 0 si subtotal NULL/négatif.';

REVOKE ALL ON FUNCTION public.compute_renter_fee(numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_renter_fee(numeric, text, text) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.compute_renter_total(numeric, text);

CREATE OR REPLACE FUNCTION public.compute_renter_total(
  p_subtotal       numeric,
  p_payment_method text,
  p_vehicle_type   text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_fee numeric;
BEGIN
  IF p_subtotal IS NULL OR p_subtotal < 0 THEN
    RETURN 0;
  END IF;

  v_fee := public.compute_renter_fee(p_subtotal, p_payment_method, p_vehicle_type);
  RETURN round(p_subtotal + v_fee, 2);
END;
$$;

COMMENT ON FUNCTION public.compute_renter_total(numeric, text, text) IS
  'subtotal + compute_renter_fee(subtotal, payment_method, vehicle_type).';

REVOKE ALL ON FUNCTION public.compute_renter_total(numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.compute_renter_total(numeric, text, text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- sanitize_booking_selected_options: + p_vehicle_type, lit booking_options
-- (catalogue admin) au lieu du hardcode. Une option catalogue désactivée ou
-- non liée à la catégorie du véhicule est rejetée silencieusement (pas
-- traitée comme option libre).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.sanitize_booking_selected_options(jsonb, numeric);

CREATE OR REPLACE FUNCTION public.sanitize_booking_selected_options(
  p_raw_options  jsonb,
  p_base_price   numeric,
  p_vehicle_type text DEFAULT NULL
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
  v_seen_other text[] := ARRAY[]::text[];
  v_opt_total numeric := 0;
  v_line_total numeric := 0;
  v_safe_base numeric := round(greatest(COALESCE(p_base_price, 0), 0), 2);
  v_sub numeric;
  v_fee numeric;
  v_catalog record;
BEGIN
  FOR v_opt IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_raw_options, '[]'::jsonb))
  LOOP
    v_raw_id := v_opt ->> 'id';
    v_resolved_id := public._resolve_booking_option_id(v_raw_id);

    SELECT bo.price_mga, bo.name
    INTO v_catalog
    FROM public.booking_options bo
    WHERE bo.option_key = v_resolved_id
      AND bo.active = true
      AND (
        p_vehicle_type IS NULL
        OR EXISTS (
          SELECT 1 FROM public.booking_option_categories boc
          WHERE boc.option_id = bo.id AND boc.vehicle_type = p_vehicle_type
        )
      );

    IF v_catalog IS NOT NULL THEN
      IF v_resolved_id = ANY (v_seen_other) THEN
        CONTINUE;
      END IF;
      v_seen_other := array_append(v_seen_other, v_resolved_id);

      v_line_total := round(greatest(v_catalog.price_mga, 0), 2);
      v_line := jsonb_build_object(
        'id', v_resolved_id,
        'name', v_catalog.name,
        'pricePerDay', 0,
        'totalPrice', v_line_total
      );
      v_options := v_options || jsonb_build_array(v_line);
      v_opt_total := v_opt_total + v_line_total;
      CONTINUE;
    END IF;

    -- L'id correspond à une entrée catalogue mais désactivée / hors
    -- catégorie : rejet silencieux, pas de fallback en option libre.
    IF EXISTS (SELECT 1 FROM public.booking_options bo WHERE bo.option_key = v_resolved_id) THEN
      CONTINUE;
    END IF;

    -- Option libre (non catalogue) : comportement historique inchangé.
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
  v_fee := round(v_sub * 0.15, 2); -- colonne legacy service_fee, non utilisée pour le calcul client réel (cf compute_renter_fee)

  selected_options := v_options;
  options_total := v_opt_total;
  subtotal := v_sub;
  service_fee := v_fee;
  total_price := v_sub;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.sanitize_booking_selected_options(jsonb, numeric, text) IS
  'Valide et chiffre les options sélectionnées. Options catalogue (booking_options) : prix et autorisation par catégorie pilotés par admin, prix client ignoré. Options libres (hors catalogue) : comportement historique inchangé.';

-- ---------------------------------------------------------------------------
-- create_web_booking (10-arg, source de vérité) : récupère vehicle_type et le
-- propage à get_fee_percent / compute_renter_fee / compute_renter_total /
-- sanitize_booking_selected_options.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_web_booking(uuid, date, date, text, text, text, jsonb, text, text, uuid);

CREATE OR REPLACE FUNCTION public.create_web_booking(
  p_vehicle_id uuid,
  p_start_date date,
  p_end_date date,
  p_start_time text,
  p_end_time text,
  p_pickup_location text,
  p_selected_options jsonb,
  p_hotel_name text,
  p_payment_method text,
  p_cart_group_id uuid DEFAULT NULL
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
  v_fee_percent numeric;
  v_renter_fee  numeric;
  v_amount_total_expected numeric;
  v_row public.bookings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF p_payment_method IS NULL
     OR p_payment_method NOT IN ('card_online', 'cash_on_site') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD: %', COALESCE(p_payment_method, '(null)')
      USING ERRCODE = '22023';
  END IF;

  SELECT p.phone INTO v_phone
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_phone IS NULL OR length(trim(v_phone)) = 0 THEN
    RAISE EXCEPTION 'PHONE_REQUIRED';
  END IF;

  SELECT v.id, v.price_per_day, v.available, v.vehicle_type
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
  FROM public.sanitize_booking_selected_options(p_selected_options, v_base.base_price, v_vehicle.vehicle_type);

  SELECT * INTO v_locations
  FROM public.derive_booking_locations(v_pricing.selected_options, p_hotel_name);

  v_fee_percent           := public.get_fee_percent(p_payment_method, v_vehicle.vehicle_type);
  v_renter_fee            := public.compute_renter_fee(v_pricing.subtotal, p_payment_method, v_vehicle.vehicle_type);
  v_amount_total_expected := public.compute_renter_total(v_pricing.subtotal, p_payment_method, v_vehicle.vehicle_type);

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
    service_fee_renter,
    total_price,
    price_per_day,
    rental_days,
    payment_method,
    amount_total_expected,
    service_fee_percent_applied,
    cart_group_id
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
    CASE WHEN jsonb_array_length(v_pricing.selected_options) > 0
         THEN v_pricing.selected_options
         ELSE NULL
    END,
    v_base.base_price,
    v_pricing.options_total,
    v_pricing.subtotal,
    v_renter_fee,
    v_renter_fee,
    v_pricing.total_price,
    round(v_vehicle.price_per_day, 2),
    v_base.rental_days,
    p_payment_method,
    v_amount_total_expected,
    v_fee_percent,
    p_cart_group_id
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id',                          v_row.id,
    'reference_number',            v_row.reference_number,
    'status',                      v_row.status,
    'created_at',                  v_row.created_at,
    'base_price',                  v_row.base_price,
    'options_total',               v_row.options_total,
    'subtotal',                    v_row.subtotal,
    'service_fee',                 v_row.service_fee,
    'service_fee_renter',          v_row.service_fee_renter,
    'total_price',                 v_row.total_price,
    'pickup_location',             v_row.pickup_location,
    'return_location',             v_row.return_location,
    'payment_method',              v_row.payment_method,
    'amount_total_expected',       v_row.amount_total_expected,
    'service_fee_percent_applied', v_row.service_fee_percent_applied,
    'cart_group_id',               v_row.cart_group_id
  );
END;
$$;

COMMENT ON FUNCTION public.create_web_booking(uuid, date, date, text, text, text, jsonb, text, text, uuid) IS
  'P2 + cart + per-category : crée une réservation web, recalcule les montants en tenant compte du vehicle_type (frais de service ET catalogue d''options par catégorie), p_cart_group_id optionnel pour le panier multi-réservation.';

REVOKE ALL ON FUNCTION public.create_web_booking(uuid, date, date, text, text, text, jsonb, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_web_booking(uuid, date, date, text, text, text, jsonb, text, text, uuid) TO authenticated;

COMMIT;
