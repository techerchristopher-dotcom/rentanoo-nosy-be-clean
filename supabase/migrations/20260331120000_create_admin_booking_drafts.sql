-- Migration: create admin_booking_drafts (agency drafts)
-- Date: 2026-03-31
-- Description: Draft pre-dossiers for admin/agence booking flow (NOT bookings)

create extension if not exists pgcrypto;

create table if not exists public.admin_booking_drafts (
  id uuid primary key default gen_random_uuid(),
  created_by_admin_id uuid not null,
  status text not null default 'draft',
  progress_step text not null default 'client',

  renter_user_id uuid null,
  walk_in_payload jsonb null,

  vehicle_id uuid null,
  start_date date null,
  end_date date null,
  start_time text null,
  end_time text null,
  pickup_location text null,
  notes_admin text null,

  pricing_snapshot jsonb null,

  converted_booking_id uuid null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_booking_drafts_created_by_updated_at_idx
  on public.admin_booking_drafts (created_by_admin_id, updated_at desc);

create index if not exists admin_booking_drafts_created_by_status_idx
  on public.admin_booking_drafts (created_by_admin_id, status);

