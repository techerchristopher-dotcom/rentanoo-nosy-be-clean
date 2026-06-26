-- Ajout colonne has_ac (climatisation) manquante en base
-- has_pool et near_beach ont été ajoutés dans la migration précédente (20260626120000)

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS has_ac boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.vehicles.has_ac IS 'Équipement : climatisation';
