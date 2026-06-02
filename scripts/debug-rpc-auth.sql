SELECT
  (SELECT id FROM public.vehicles WHERE available IS NOT FALSE AND price_per_day > 0 LIMIT 1) AS vehicle_id,
  (SELECT p.id FROM public.profiles p WHERE p.phone IS NOT NULL AND length(trim(p.phone)) > 0 AND p.role = 'renter' LIMIT 1) AS user_id;

SELECT set_config('request.jwt.claims', json_build_object('sub', '89207538-a32c-4326-9db6-af076f90e242', 'role', 'authenticated')::text, true);

SELECT auth.uid() AS auth_uid_after_jwt_set;

SELECT public.create_web_booking(
  '4b0802da-5f2b-46e8-80c5-f0d05bfd9155'::uuid,
  (CURRENT_DATE + 50)::date,
  (CURRENT_DATE + 52)::date,
  '08:00', '18:00',
  'IGNORED',
  '[]'::jsonb,
  NULL
) AS rpc_result;
