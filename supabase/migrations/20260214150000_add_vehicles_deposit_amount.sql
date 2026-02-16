-- Migration: Ajouter vehicles.deposit_amount
-- Date: 2026-02-14
-- Description: Montant caution (empreinte) en euros par véhicule. 0 = pas de caution. Par défaut 1000.
-- Idempotent: IF NOT EXISTS

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'vehicles' 
    AND column_name = 'deposit_amount'
  ) THEN
    ALTER TABLE public.vehicles 
    ADD COLUMN deposit_amount NUMERIC(10, 2) NOT NULL DEFAULT 1000;
    RAISE NOTICE 'Colonne vehicles.deposit_amount ajoutée';
  END IF;
END $$;

COMMENT ON COLUMN public.vehicles.deposit_amount IS 'Montant caution (empreinte) en euros. 0 = pas de caution. Par défaut 1000.';
