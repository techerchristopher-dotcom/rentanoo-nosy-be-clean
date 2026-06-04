-- Événements analytics site (widget WhatsApp, etc.) — lecture admin via API Express

create table if not exists public.site_analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  page_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists site_analytics_events_created_at_idx
  on public.site_analytics_events (created_at desc);

create index if not exists site_analytics_events_name_created_idx
  on public.site_analytics_events (event_name, created_at desc);

alter table public.site_analytics_events enable row level security;

-- Insert/select via service role (API Express) uniquement
