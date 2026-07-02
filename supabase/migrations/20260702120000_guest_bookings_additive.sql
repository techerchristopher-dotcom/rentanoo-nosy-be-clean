-- ============================================================================
-- Migration : Découplage demande invité — colonnes contact invité + user_id nullable
-- ============================================================================
-- Date : 2026-07-02
-- Description : Prépare la "demande en invité pur" (sans création de compte).
--   - Ajoute guest_name / guest_email / guest_phone (nullable) sur bookings :
--     stockage du contact client quand il n'y a pas de compte (user_id NULL).
--   - Rend bookings.user_id NULLABLE pour permettre les bookings invités.
--
-- Additive & non destructive : aucune ligne existante n'est modifiée. Les 33+
-- bookings actuels conservent leur user_id ; les nouvelles colonnes restent NULL.
--
-- Réversibilité :
--   - DROP COLUMN guest_* : entièrement réversible.
--   - user_id : SET NOT NULL réversible TANT QU'aucun booking invité (user_id NULL)
--     n'a été créé ; après, il faudrait d'abord traiter ces lignes.
--
-- Usage : Appliquer via Supabase (apply_migration / Dashboard / CLI).
-- ============================================================================

-- 1) Colonnes de contact invité (nullable, sans défaut)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS guest_name  text,
  ADD COLUMN IF NOT EXISTS guest_email text,
  ADD COLUMN IF NOT EXISTS guest_phone text;

-- 2) Autoriser les bookings sans compte (invité pur)
ALTER TABLE public.bookings
  ALTER COLUMN user_id DROP NOT NULL;

-- ============================================================================
-- Rollback (référence, à exécuter manuellement si besoin AVANT tout booking invité) :
--   ALTER TABLE public.bookings ALTER COLUMN user_id SET NOT NULL;
--   ALTER TABLE public.bookings
--     DROP COLUMN IF EXISTS guest_phone,
--     DROP COLUMN IF EXISTS guest_email,
--     DROP COLUMN IF EXISTS guest_name;
-- ============================================================================
