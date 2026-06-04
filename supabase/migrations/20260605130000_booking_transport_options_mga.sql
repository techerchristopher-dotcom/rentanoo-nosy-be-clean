-- Tarifs forfait options transport (MGA) + lecture publique platform_settings

insert into public.platform_settings (key, value, updated_at)
values (
  'booking_transport_options',
  jsonb_build_object(
    'airport_flat_mga', 80000,
    'hotel_flat_mga', 50000
  ),
  now()
)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

drop policy if exists "platform_settings_public_read_exchange" on public.platform_settings;

create policy "platform_settings_public_read"
  on public.platform_settings
  for select
  to anon, authenticated
  using (key in ('eur_mga_exchange', 'booking_transport_options'));
