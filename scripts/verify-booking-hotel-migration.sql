SELECT jsonb_pretty(jsonb_build_object(
  'return_location_column', (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('column_name', column_name, 'data_type', data_type)), '[]'::jsonb)
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'return_location'
  ),
  'functions', (
    SELECT COALESCE(jsonb_agg(jsonb_build_object('name', p.proname, 'args', pg_get_function_identity_arguments(p.oid)) ORDER BY p.proname), '[]'::jsonb)
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('derive_booking_locations','sanitize_booking_selected_options','create_web_booking')
  ),
  'create_web_booking_has_hotel_param', (
    SELECT COUNT(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'create_web_booking'
      AND pg_get_function_identity_arguments(p.oid) LIKE '%p_hotel_name%'
  ),
  'hotel_sanitize_10eur', (
    SELECT jsonb_build_object('options_total', options_total, 'selected_options', selected_options)
    FROM public.sanitize_booking_selected_options(
      '[{"id":"platform-hotel-pickup","totalPrice":1},{"id":"platform-hotel-return","totalPrice":1}]'::jsonb, 100)
  ),
  'airport_sanitize_16eur', (
    SELECT jsonb_build_object('options_total', options_total, 'selected_options', selected_options)
    FROM public.sanitize_booking_selected_options(
      '[{"id":"platform-airport-pickup","totalPrice":1},{"id":"platform-airport-return","totalPrice":1}]'::jsonb, 100)
  ),
  'max_platform_52eur', (
    SELECT options_total FROM public.sanitize_booking_selected_options(
      '[{"id":"platform-airport-pickup","totalPrice":1},{"id":"platform-airport-return","totalPrice":1},{"id":"platform-hotel-pickup","totalPrice":1},{"id":"platform-hotel-return","totalPrice":1}]'::jsonb, 0)
  ),
  'derive_no_options', (
    SELECT jsonb_build_object('pickup', pickup_location, 'return', return_location)
    FROM public.derive_booking_locations('[]'::jsonb, NULL)
  ),
  'derive_hotel_pickup', (
    SELECT jsonb_build_object('pickup', pickup_location, 'return', return_location)
    FROM public.derive_booking_locations('[{"id":"platform-hotel-pickup"}]'::jsonb, 'Royal Beach Hotel')
  ),
  'derive_hotel_return', (
    SELECT jsonb_build_object('pickup', pickup_location, 'return', return_location)
    FROM public.derive_booking_locations('[{"id":"platform-hotel-return"}]'::jsonb, 'Royal Beach Hotel')
  ),
  'derive_mixed', (
    SELECT jsonb_build_object('pickup', pickup_location, 'return', return_location)
    FROM public.derive_booking_locations('[{"id":"platform-airport-pickup"},{"id":"platform-hotel-return"}]'::jsonb, 'Royal Beach Hotel')
  )
)) AS verification_report;
