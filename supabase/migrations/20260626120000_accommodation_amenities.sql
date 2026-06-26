-- Ajout des équipements hébergement : piscine et proximité mer
-- La colonne has_ac existe déjà (see equipment columns on vehicles)

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS has_pool boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS near_beach boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.vehicles.has_pool IS 'Hébergement : piscine disponible';
COMMENT ON COLUMN public.vehicles.near_beach IS 'Hébergement : proche de la mer / accès plage';
