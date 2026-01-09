-- Script pour ajouter les colonnes de frais de service manquantes à la table bookings
-- Ces colonnes sont utilisées par les webhooks Stripe pour stocker les calculs de frais

-- Ajouter les colonnes si elles n'existent pas déjà
DO $$ 
BEGIN
  -- service_fee_renter: frais de service côté locataire (15% du subtotal)
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

  -- amount_total_paid: montant total payé par le locataire (subtotal + service_fee_renter)
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

  -- currency: devise du paiement (par défaut EUR)
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
COMMENT ON COLUMN public.bookings.service_fee_renter IS 'Frais de service côté locataire (15% du subtotal)';
COMMENT ON COLUMN public.bookings.service_fee_owner IS 'Frais de service côté propriétaire (15% du subtotal, retenu du payout)';
COMMENT ON COLUMN public.bookings.owner_payout_amount IS 'Revenu du propriétaire après commission (subtotal - service_fee_owner)';
COMMENT ON COLUMN public.bookings.platform_total_fee IS 'Commission totale de la plateforme (service_fee_renter + service_fee_owner)';
COMMENT ON COLUMN public.bookings.amount_total_paid IS 'Montant total payé par le locataire (subtotal + service_fee_renter)';
COMMENT ON COLUMN public.bookings.stripe_payment_intent_id IS 'ID du PaymentIntent Stripe';
COMMENT ON COLUMN public.bookings.stripe_checkout_session_id IS 'ID de la session Checkout Stripe';
COMMENT ON COLUMN public.bookings.paid_at IS 'Timestamp du paiement';
COMMENT ON COLUMN public.bookings.currency IS 'Devise du paiement (par défaut EUR)';

