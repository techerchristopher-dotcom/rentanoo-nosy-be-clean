-- Migration: ajouter le tarif agence véhicule + mode de pricing booking
-- Objectif:
-- - vehicles.price_per_day_agency: tarif agence distinct du tarif web (price_per_day)
-- - bookings.pricing_mode: distinguer les réservations 'web' et 'admin'
-- - backfill minimal de l'existant en 'web'

DO $$
BEGIN
  -- 1) Tarif agence sur vehicles
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vehicles'
      AND column_name = 'price_per_day_agency'
  ) THEN
    ALTER TABLE public.vehicles
    ADD COLUMN price_per_day_agency NUMERIC(10, 2);
    RAISE NOTICE 'Colonne vehicles.price_per_day_agency ajoutée';
  END IF;

  -- 2) pricing_mode sur bookings (web | admin)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'pricing_mode'
  ) THEN
    ALTER TABLE public.bookings
    ADD COLUMN pricing_mode TEXT DEFAULT 'web';
    RAISE NOTICE 'Colonne bookings.pricing_mode ajoutée';
  END IF;
END $$;

-- 3) Backfill minimal de l'existant
UPDATE public.bookings
SET pricing_mode = 'web'
WHERE pricing_mode IS NULL;

-- 4) Contrainte de cohérence (idempotente)
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_pricing_mode_check;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_pricing_mode_check
CHECK (pricing_mode IN ('web', 'admin'));

-- 5) Documentation
COMMENT ON COLUMN public.vehicles.price_per_day_agency IS 'Tarif journalier agence (réservations admin/agence)';
COMMENT ON COLUMN public.bookings.pricing_mode IS 'Mode de pricing utilisé pour la réservation: web ou admin';
