-- RPC integration test: create_web_booking location derivation (rollback after each test)
-- Uses first available vehicle + renter profile with phone

DO $$
DECLARE
  v_vehicle_id uuid;
  v_user_id uuid;
  v_result jsonb;
  v_booking_id uuid;
  v_pickup text;
  v_return text;
  v_opts_total numeric;
BEGIN
  SELECT id INTO v_vehicle_id
  FROM public.vehicles
  WHERE available IS NOT FALSE AND price_per_day > 0
  ORDER BY created_at DESC NULLS LAST
  LIMIT 1;

  SELECT p.id INTO v_user_id
  FROM public.profiles p
  WHERE p.phone IS NOT NULL AND length(trim(p.phone)) > 0 AND p.role = 'renter'
  ORDER BY p.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_vehicle_id IS NULL THEN
    RAISE EXCEPTION 'TEST_SETUP_FAILED: no available vehicle';
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'TEST_SETUP_FAILED: no renter with phone';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_user_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Test A: no options -> agency both sides
  v_result := public.create_web_booking(
    v_vehicle_id,
    (CURRENT_DATE + 30)::date,
    (CURRENT_DATE + 32)::date,
    '08:00', '18:00',
    'CLIENT_FAKE_PICKUP_SHOULD_BE_IGNORED',
    '[]'::jsonb,
    NULL
  );
  v_booking_id := (v_result->>'id')::uuid;
  SELECT pickup_location, return_location, options_total
  INTO v_pickup, v_return, v_opts_total
  FROM public.bookings WHERE id = v_booking_id;

  IF v_pickup <> 'Agence Rentanoo' OR v_return <> 'Agence Rentanoo' OR v_opts_total <> 0 THEN
    RAISE EXCEPTION 'TEST_A_FAILED: pickup=%, return=%, opts=%', v_pickup, v_return, v_opts_total;
  END IF;
  DELETE FROM public.bookings WHERE id = v_booking_id;
  RAISE NOTICE 'TEST_A_OK: no options -> agency/agency';

  -- Test B: hotel pickup
  v_result := public.create_web_booking(
    v_vehicle_id,
    (CURRENT_DATE + 33)::date,
    (CURRENT_DATE + 35)::date,
    '08:00', '18:00',
    NULL,
    '[{"id":"platform-hotel-pickup","totalPrice":1}]'::jsonb,
    'Royal Beach Hotel'
  );
  v_booking_id := (v_result->>'id')::uuid;
  SELECT pickup_location, return_location, options_total
  INTO v_pickup, v_return, v_opts_total
  FROM public.bookings WHERE id = v_booking_id;

  IF v_pickup <> 'Royal Beach Hotel' OR v_return <> 'Agence Rentanoo' OR v_opts_total <> 10 THEN
    RAISE EXCEPTION 'TEST_B_FAILED: pickup=%, return=%, opts=%', v_pickup, v_return, v_opts_total;
  END IF;
  DELETE FROM public.bookings WHERE id = v_booking_id;
  RAISE NOTICE 'TEST_B_OK: hotel pickup -> Royal Beach / agency, 10€';

  -- Test C: hotel return
  v_result := public.create_web_booking(
    v_vehicle_id,
    (CURRENT_DATE + 36)::date,
    (CURRENT_DATE + 38)::date,
    '08:00', '18:00',
    NULL,
    '[{"id":"platform-hotel-return","totalPrice":1}]'::jsonb,
    'Royal Beach Hotel'
  );
  v_booking_id := (v_result->>'id')::uuid;
  SELECT pickup_location, return_location, options_total
  INTO v_pickup, v_return, v_opts_total
  FROM public.bookings WHERE id = v_booking_id;

  IF v_pickup <> 'Agence Rentanoo' OR v_return <> 'Royal Beach Hotel' OR v_opts_total <> 10 THEN
    RAISE EXCEPTION 'TEST_C_FAILED: pickup=%, return=%, opts=%', v_pickup, v_return, v_opts_total;
  END IF;
  DELETE FROM public.bookings WHERE id = v_booking_id;
  RAISE NOTICE 'TEST_C_OK: hotel return -> agency / Royal Beach, 10€';

  -- Test D: mixed airport pickup + hotel return
  v_result := public.create_web_booking(
    v_vehicle_id,
    (CURRENT_DATE + 39)::date,
    (CURRENT_DATE + 41)::date,
    '08:00', '18:00',
    NULL,
    '[{"id":"platform-airport-pickup","totalPrice":1},{"id":"platform-hotel-return","totalPrice":1}]'::jsonb,
    'Royal Beach Hotel'
  );
  v_booking_id := (v_result->>'id')::uuid;
  SELECT pickup_location, return_location, options_total
  INTO v_pickup, v_return, v_opts_total
  FROM public.bookings WHERE id = v_booking_id;

  IF v_pickup <> 'Aéroport de Nosy Be (Fascène)' OR v_return <> 'Royal Beach Hotel' OR v_opts_total <> 26 THEN
    RAISE EXCEPTION 'TEST_D_FAILED: pickup=%, return=%, opts=%', v_pickup, v_return, v_opts_total;
  END IF;
  DELETE FROM public.bookings WHERE id = v_booking_id;
  RAISE NOTICE 'TEST_D_OK: mixed airport pickup + hotel return, 26€';

  RAISE NOTICE 'ALL_RPC_TESTS_PASSED';
END $$;
