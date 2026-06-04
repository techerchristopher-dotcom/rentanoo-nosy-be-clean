-- Contact WhatsApp configurable (numéro + photo profil pour le bouton flottant)

insert into public.platform_settings (key, value, updated_at)
values (
  'whatsapp_contact',
  jsonb_build_object(
    'phoneE164', '33633707569',
    'profilePhotoUrl', null
  ),
  now()
)
on conflict (key) do nothing;

drop policy if exists "platform_settings_public_read" on public.platform_settings;

create policy "platform_settings_public_read"
  on public.platform_settings
  for select
  to anon, authenticated
  using (key in ('eur_mga_exchange', 'booking_transport_options', 'whatsapp_contact'));

-- Bucket public pour la photo WhatsApp (lecture anon)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'platform-assets',
  'platform-assets',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "platform_assets_public_read" on storage.objects;

create policy "platform_assets_public_read"
  on storage.objects
  for select
  to public
  using (bucket_id = 'platform-assets');
