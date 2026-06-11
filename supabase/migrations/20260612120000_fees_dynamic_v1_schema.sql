-- =============================================================================
-- Fees Dynamic v1 — 1/4 : Schéma
-- =============================================================================
-- Objectif (P1.1) :
--   Ajouter 3 colonnes "client fees" à public.bookings, sans casser l'existant.
--
--   - payment_method              TEXT       NULL (CHECK card_online | cash_on_site)
--   - amount_total_expected       NUMERIC    NULL ( >= 0 )
--   - service_fee_percent_applied NUMERIC    NULL ( 0..1 )
--
--   Toutes les colonnes sont NULLables : aucun INSERT existant ne se casse.
--   Aucune colonne existante (service_fee, service_fee_renter, service_fee_owner,
--   owner_payout_amount, platform_total_fee, amount_total_paid, offline_payment_method,
--   pricing_mode) n'est modifiée.
--
-- Rollback :
--   ALTER TABLE public.bookings
--     DROP CONSTRAINT IF EXISTS bookings_payment_method_v1_check,
--     DROP CONSTRAINT IF EXISTS bookings_amount_total_expected_check,
--     DROP CONSTRAINT IF EXISTS bookings_service_fee_percent_applied_check;
--   DROP INDEX IF EXISTS public.idx_bookings_status_payment_method;
--   DROP INDEX IF EXISTS public.idx_bookings_payment_method;
--   ALTER TABLE public.bookings
--     DROP COLUMN IF EXISTS service_fee_percent_applied,
--     DROP COLUMN IF EXISTS amount_total_expected,
--     DROP COLUMN IF EXISTS payment_method;
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Colonnes (ajout idempotent)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'bookings'
      AND column_name  = 'payment_method'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN payment_method TEXT;
    RAISE NOTICE 'Colonne bookings.payment_method ajoutée';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'bookings'
      AND column_name  = 'amount_total_expected'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN amount_total_expected NUMERIC(10, 2);
    RAISE NOTICE 'Colonne bookings.amount_total_expected ajoutée';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'bookings'
      AND column_name  = 'service_fee_percent_applied'
  ) THEN
    ALTER TABLE public.bookings ADD COLUMN service_fee_percent_applied NUMERIC(5, 4);
    RAISE NOTICE 'Colonne bookings.service_fee_percent_applied ajoutée';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Contraintes CHECK (drop/add idempotent)
-- ---------------------------------------------------------------------------
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_payment_method_v1_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_method_v1_check
  CHECK (
    payment_method IS NULL
    OR payment_method IN ('card_online', 'cash_on_site')
  );

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_amount_total_expected_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_amount_total_expected_check
  CHECK (amount_total_expected IS NULL OR amount_total_expected >= 0);

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_service_fee_percent_applied_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_service_fee_percent_applied_check
  CHECK (
    service_fee_percent_applied IS NULL
    OR (service_fee_percent_applied >= 0 AND service_fee_percent_applied <= 1)
  );

-- ---------------------------------------------------------------------------
-- 3) Index pour dashboards / filtres
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_payment_method
  ON public.bookings (payment_method)
  WHERE payment_method IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_status_payment_method
  ON public.bookings (status, payment_method);

-- ---------------------------------------------------------------------------
-- 4) Documentation
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN public.bookings.payment_method IS
  'V1 : mode de paiement client (card_online = Stripe en ligne, cash_on_site = espèces à la remise des clés). NULL pour les bookings legacy et les bookings pricing_mode=admin (qui utilisent offline_payment_method).';

COMMENT ON COLUMN public.bookings.amount_total_expected IS
  'Montant TTC théorique attendu (subtotal + service_fee_renter). Rempli dès la création du booking. Ne reflète PAS l''encaissement réel — utiliser amount_total_paid pour cela.';

COMMENT ON COLUMN public.bookings.service_fee_percent_applied IS
  'Audit trail : taux exact du frais client appliqué au moment de la création (ex 0.1000 pour 10%, 0.1500 pour 15%). Sert à figer l''historique en cas de changement futur des taux dans platform_settings.';

COMMIT;
