-- Migration: add damage flags to checkin_return (V1 EDL retour)
-- Plan: PLAN-IMPLEMENTATION-EDL-RETOUR-DAMAGE-AUTOSAVE.md

ALTER TABLE public.checkin_return
  ADD COLUMN IF NOT EXISTS has_new_damage boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS new_damage_count integer DEFAULT 0;
