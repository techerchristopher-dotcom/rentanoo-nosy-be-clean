-- Taux de change EUR → MGA (ariary) configurable par l'admin
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

-- Lecture publique du taux (affichage client)
create policy "platform_settings_public_read_exchange"
  on public.platform_settings
  for select
  to anon, authenticated
  using (key = 'eur_mga_exchange');

-- Écriture réservée au service role (API admin Express)
-- Pas de policy INSERT/UPDATE pour authenticated : bypass via service_role côté serveur

insert into public.platform_settings (key, value, updated_at)
values (
  'eur_mga_exchange',
  jsonb_build_object('rate', 5000, 'effectiveFrom', to_char(now() at time zone 'Indian/Antananarivo', 'YYYY-MM-DD')),
  now()
)
on conflict (key) do nothing;
