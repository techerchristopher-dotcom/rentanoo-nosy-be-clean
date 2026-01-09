-- Migration: Ajouter les colonnes de frais de service et Stripe à la table bookings
-- Date: 2025-01-27
-- Description: Ajoute les colonnes nécessaires pour que les webhooks Stripe puissent mettre à jour les bookings
-- 
-- Colonnes ajoutées:
-- - paid_at: Timestamp du paiement
-- - stripe_payment_intent_id: ID du PaymentIntent Stripe
-- - stripe_checkout_session_id: ID de la session Checkout Stripe
-- - amount_total_paid: Montant total payé par le locataire
-- - service_fee_renter: Frais de service côté locataire (15% du subtotal)
-- - service_fee_owner: Frais de service côté propriétaire (15% du subtotal)
-- - owner_payout_amount: Revenu du propriétaire après commission
-- - platform_total_fee: Commission totale de la plateforme
-- - currency: Devise du paiement (défaut: EUR)

-- Migration idempotente: utilise IF NOT EXISTS pour éviter les erreurs si les colonnes existent déjà

DO $$ 
BEGIN
  -- paid_at: timestamp du paiement
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE public.bookings 
    ADD COLUMN paid_at TIMESTAMPTZ;
    RAISE NOTICE 'Colonne paid_at ajoutée';
  END IF;

  -- stripe_payment_intent_id: ID du PaymentIntent Stripe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'stripe_payment_intent_id'
  ) THEN
    ALTER TABLE public.bookings 
    ADD COLUMN stripe_payment_intent_id TEXT;
    RAISE NOTICE 'Colonne stripe_payment_intent_id ajoutée';
  END IF;

  -- stripe_checkout_session_id: ID de la session Checkout Stripe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'stripe_checkout_session_id'
  ) THEN
    ALTER TABLE public.bookings 
    ADD COLUMN stripe_checkout_session_id TEXT;
    RAISE NOTICE 'Colonne stripe_checkout_session_id ajoutée';
  END IF;

  -- amount_total_paid: montant total payé par le locataire (subtotal + service_fee_renter)
  -- Type: NUMERIC(10, 2) pour rester cohérent avec total_price, base_price, etc.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'amount_total_paid'
  ) THEN
    ALTER TABLE public.bookings 
    ADD COLUMN amount_total_paid NUMERIC(10, 2);
    RAISE NOTICE 'Colonne amount_total_paid ajoutée';
  END IF;

  -- service_fee_renter: frais de service côté locataire (15% du subtotal)
  -- Type: NUMERIC(10, 2) pour rester cohérent avec service_fee existant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'service_fee_renter'
  ) THEN
    ALTER TABLE public.bookings 
    ADD COLUMN service_fee_renter NUMERIC(10, 2);
    RAISE NOTICE 'Colonne service_fee_renter ajoutée';
  END IF;

  -- service_fee_owner: frais de service côté propriétaire (15% du subtotal)
  -- Type: NUMERIC(10, 2) pour rester cohérent avec service_fee existant
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'service_fee_owner'
  ) THEN
    ALTER TABLE public.bookings 
    ADD COLUMN service_fee_owner NUMERIC(10, 2);
    RAISE NOTICE 'Colonne service_fee_owner ajoutée';
  END IF;

  -- owner_payout_amount: revenu du propriétaire après commission (subtotal - service_fee_owner)
  -- Type: NUMERIC(10, 2) pour rester cohérent avec les autres montants
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'owner_payout_amount'
  ) THEN
    ALTER TABLE public.bookings 
    ADD COLUMN owner_payout_amount NUMERIC(10, 2);
    RAISE NOTICE 'Colonne owner_payout_amount ajoutée';
  END IF;

  -- platform_total_fee: commission totale de la plateforme (service_fee_renter + service_fee_owner)
  -- Type: NUMERIC(10, 2) pour rester cohérent avec les autres montants
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'platform_total_fee'
  ) THEN
    ALTER TABLE public.bookings 
    ADD COLUMN platform_total_fee NUMERIC(10, 2);
    RAISE NOTICE 'Colonne platform_total_fee ajoutée';
  END IF;

  -- currency: devise du paiement (par défaut EUR)
  -- Type: TEXT avec DEFAULT 'EUR' pour rester cohérent avec l'usage actuel
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bookings' 
    AND column_name = 'currency'
  ) THEN
    ALTER TABLE public.bookings 
    ADD COLUMN currency TEXT DEFAULT 'EUR';
    RAISE NOTICE 'Colonne currency ajoutée';
  END IF;

END $$;

-- Commentaires pour documentation
COMMENT ON COLUMN public.bookings.paid_at IS 'Timestamp du paiement (rempli par le webhook Stripe)';
COMMENT ON COLUMN public.bookings.stripe_payment_intent_id IS 'ID du PaymentIntent Stripe (rempli par le webhook Stripe)';
COMMENT ON COLUMN public.bookings.stripe_checkout_session_id IS 'ID de la session Checkout Stripe (rempli par le webhook Stripe)';
COMMENT ON COLUMN public.bookings.amount_total_paid IS 'Montant total payé par le locataire (subtotal + service_fee_renter)';
COMMENT ON COLUMN public.bookings.service_fee_renter IS 'Frais de service côté locataire (15% du subtotal)';
COMMENT ON COLUMN public.bookings.service_fee_owner IS 'Frais de service côté propriétaire (15% du subtotal, retenu du payout)';
COMMENT ON COLUMN public.bookings.owner_payout_amount IS 'Revenu du propriétaire après commission (subtotal - service_fee_owner)';
COMMENT ON COLUMN public.bookings.platform_total_fee IS 'Commission totale de la plateforme (service_fee_renter + service_fee_owner)';
COMMENT ON COLUMN public.bookings.currency IS 'Devise du paiement (par défaut EUR)';

