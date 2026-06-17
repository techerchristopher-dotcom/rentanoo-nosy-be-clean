-- Extends create_web_booking (9-arg, source of truth) to accept an optional
-- p_cart_group_id so several independent bookings submitted together from
-- the multi-booking cart can be tagged with the same group id.
--
-- Signature must change (9 -> 10 args) so the old 9-arg function is dropped
-- and recreated with the new trailing DEFAULT NULL param. Existing callers
-- (frontend RPC by named args, 8-arg compat wrapper) are unaffected since
-- the new param is optional and appended at the end.

DROP FUNCTION IF EXISTS public.create_web_booking(uuid, date, date, text, text, text, jsonb, text, text);

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

  v_fee_percent           := public.get_fee_percent(p_payment_method);
  v_renter_fee            := public.compute_renter_fee(v_pricing.subtotal, p_payment_method);
  v_amount_total_expected := public.compute_renter_total(v_pricing.subtotal, p_payment_method);

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
  'P2 + cart : crée une réservation web avec recalcul serveur des montants, choix de payment_method, et p_cart_group_id optionnel pour le panier multi-réservation.';

REVOKE ALL ON FUNCTION public.create_web_booking(uuid, date, date, text, text, text, jsonb, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_web_booking(uuid, date, date, text, text, text, jsonb, text, text, uuid) TO authenticated;
