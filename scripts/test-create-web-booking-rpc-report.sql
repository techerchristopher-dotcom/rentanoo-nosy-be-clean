CREATE TEMP TABLE IF NOT EXISTS _rpc_test_results (
  test_name text PRIMARY KEY,
  pickup_location text,
  return_location text,
  options_total numeric,
  passed boolean,
  error_message text
);

TRUNCATE _rpc_test_results;

DO $$
DECLARE
  v_vehicle_id uuid;
  v_user_id uuid;
  v_result jsonb;
  v_booking_id uuid;
  v_pickup text;
  v_return text;
  v_opts numeric;
BEGIN
  SELECT id INTO v_vehicle_id
  FROM public.vehicles
  WHERE available IS NOT FALSE AND price_per_day > 0
  LIMIT 1;

  SELECT p.id INTO v_user_id
  FROM public.profiles p
  WHERE p.phone IS NOT NULL AND length(trim(p.phone)) > 0 AND p.role = 'renter'
  LIMIT 1;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', v_user_id::text, 'role', 'authenticated')::text,
    true
  );

  -- A: no options
  BEGIN
    v_result := public.create_web_booking(
      v_vehicle_id, '2099-07-01'::date, '2099-07-03'::date,
      '08:00', '18:00', 'CLIENT_FAKE_PICKUP', '[]'::jsonb, NULL
    );
    v_booking_id := (v_result->>'id')::uuid;
    SELECT pickup_location, return_location, options_total
    INTO v_pickup, v_return, v_opts FROM public.bookings WHERE id = v_booking_id;
    INSERT INTO _rpc_test_results VALUES (
      'A_no_options', v_pickup, v_return, v_opts,
      v_pickup = 'Agence Rentanoo' AND v_return = 'Agence Rentanoo' AND v_opts = 0,
      NULL
    );
    DELETE FROM public.bookings WHERE id = v_booking_id;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rpc_test_results VALUES ('A_no_options', NULL, NULL, NULL, false, SQLERRM);
  END;

  -- B: hotel pickup
  BEGIN
    v_result := public.create_web_booking(
      v_vehicle_id, '2099-07-04'::date, '2099-07-06'::date,
      '08:00', '18:00', NULL,
      '[{"id":"platform-hotel-pickup","totalPrice":1}]'::jsonb,
      'Royal Beach Hotel'
    );
    v_booking_id := (v_result->>'id')::uuid;
    SELECT pickup_location, return_location, options_total
    INTO v_pickup, v_return, v_opts FROM public.bookings WHERE id = v_booking_id;
    INSERT INTO _rpc_test_results VALUES (
      'B_hotel_pickup', v_pickup, v_return, v_opts,
      v_pickup = 'Royal Beach Hotel' AND v_return = 'Agence Rentanoo' AND v_opts = 10,
      NULL
    );
    DELETE FROM public.bookings WHERE id = v_booking_id;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rpc_test_results VALUES ('B_hotel_pickup', NULL, NULL, NULL, false, SQLERRM);
  END;

  -- C: hotel return
  BEGIN
    v_result := public.create_web_booking(
      v_vehicle_id, '2099-07-07'::date, '2099-07-09'::date,
      '08:00', '18:00', NULL,
      '[{"id":"platform-hotel-return","totalPrice":1}]'::jsonb,
      'Royal Beach Hotel'
    );
    v_booking_id := (v_result->>'id')::uuid;
    SELECT pickup_location, return_location, options_total
    INTO v_pickup, v_return, v_opts FROM public.bookings WHERE id = v_booking_id;
    INSERT INTO _rpc_test_results VALUES (
      'C_hotel_return', v_pickup, v_return, v_opts,
      v_pickup = 'Agence Rentanoo' AND v_return = 'Royal Beach Hotel' AND v_opts = 10,
      NULL
    );
    DELETE FROM public.bookings WHERE id = v_booking_id;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rpc_test_results VALUES ('C_hotel_return', NULL, NULL, NULL, false, SQLERRM);
  END;

  -- D: mixed airport pickup + hotel return
  BEGIN
    v_result := public.create_web_booking(
      v_vehicle_id, '2099-07-10'::date, '2099-07-12'::date,
      '08:00', '18:00', NULL,
      '[{"id":"platform-airport-pickup","totalPrice":1},{"id":"platform-hotel-return","totalPrice":1}]'::jsonb,
      'Royal Beach Hotel'
    );
    v_booking_id := (v_result->>'id')::uuid;
    SELECT pickup_location, return_location, options_total
    INTO v_pickup, v_return, v_opts FROM public.bookings WHERE id = v_booking_id;
    INSERT INTO _rpc_test_results VALUES (
      'D_mixed_airport_hotel', v_pickup, v_return, v_opts,
      v_pickup = 'Aéroport de Nosy Be (Fascène)' AND v_return = 'Royal Beach Hotel' AND v_opts = 26,
      NULL
    );
    DELETE FROM public.bookings WHERE id = v_booking_id;
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _rpc_test_results VALUES ('D_mixed_airport_hotel', NULL, NULL, NULL, false, SQLERRM);
  END;
END $$;

SELECT jsonb_pretty(jsonb_build_object(
  'tests', (SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY test_name), '[]'::jsonb) FROM _rpc_test_results t),
  'all_passed', (SELECT bool_and(passed) FROM _rpc_test_results)
)) AS rpc_test_report;

-- Cleanup orphan test booking from earlier manual test
DELETE FROM public.bookings
WHERE start_date = '2099-06-10'::date AND end_date = '2099-06-12'::date AND pricing_mode = 'web';
