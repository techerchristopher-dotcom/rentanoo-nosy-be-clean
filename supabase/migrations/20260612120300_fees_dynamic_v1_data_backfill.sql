-- =============================================================================
-- Fees Dynamic v1 — 4/4 : Backfill des bookings existants
-- =============================================================================
-- Objectif (P1.4) :
--   Remplir payment_method, service_fee_percent_applied et amount_total_expected
--   pour les bookings historiques, AVANT que le code applicatif ne soit modifié
--   (P2/P3). Idempotent : ne touche que les lignes dont la colonne cible est
--   encore NULL.
--
-- Règles métier (validées) :
--   - pricing_mode = 'web'  (ou NULL legacy) → payment_method = 'card_online',
--                                              service_fee_percent_applied = 0.1500
--     (historiquement 15 % a toujours été appliqué)
--   - pricing_mode = 'admin'                 → payment_method RESTE NULL en V1
--                                              (l'admin garde offline_payment_method)
--                                              service_fee_percent_applied = NULL
--                                              (les bookings admin n'appliquent pas
--                                              de frais client)
--   - amount_total_expected :
--       * web / legacy : = COALESCE(amount_total_paid, round(subtotal * 1.15, 2))
--       * admin        : = COALESCE(amount_total_paid, total_price, subtotal)
--
-- Sécurité :
--   - Tout dans une transaction unique.
--   - Filtre WHERE … IS NULL → relancer la migration n'a aucun effet.
--   - Aucune modification des colonnes legacy (service_fee, service_fee_renter,
--     service_fee_owner, owner_payout_amount, platform_total_fee, amount_total_paid).
--
-- Rollback :
--   BEGIN;
--     UPDATE public.bookings
--        SET payment_method = NULL,
--            service_fee_percent_applied = NULL,
--            amount_total_expected = NULL
--      WHERE …;  -- (à ajuster selon le besoin)
--   COMMIT;
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- ÉTAPE 1) Bookings web (pricing_mode = 'web')
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_count bigint;
BEGIN
  WITH updated AS (
    UPDATE public.bookings
    SET
      payment_method              = COALESCE(payment_method, 'card_online'),
      service_fee_percent_applied = COALESCE(service_fee_percent_applied, 0.1500),
      amount_total_expected       = COALESCE(
        amount_total_expected,
        amount_total_paid,
        CASE
          WHEN subtotal IS NOT NULL AND subtotal >= 0
            THEN round(subtotal * 1.15, 2)
          ELSE NULL
        END
      )
    WHERE pricing_mode = 'web'
      AND (
        payment_method IS NULL
        OR service_fee_percent_applied IS NULL
        OR amount_total_expected IS NULL
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated;
  RAISE NOTICE 'Étape 1 — bookings web backfilled : %', v_count;
END $$;

-- ---------------------------------------------------------------------------
-- ÉTAPE 2) Bookings legacy sans pricing_mode (avant la migration 03/2026)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_count bigint;
BEGIN
  WITH updated AS (
    UPDATE public.bookings
    SET
      payment_method              = COALESCE(payment_method, 'card_online'),
      service_fee_percent_applied = COALESCE(service_fee_percent_applied, 0.1500),
      amount_total_expected       = COALESCE(
        amount_total_expected,
        amount_total_paid,
        CASE
          WHEN subtotal IS NOT NULL AND subtotal >= 0
            THEN round(subtotal * 1.15, 2)
          ELSE NULL
        END
      )
    WHERE pricing_mode IS NULL
      AND (
        payment_method IS NULL
        OR service_fee_percent_applied IS NULL
        OR amount_total_expected IS NULL
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated;
  RAISE NOTICE 'Étape 2 — bookings legacy backfilled : %', v_count;
END $$;

-- ---------------------------------------------------------------------------
-- ÉTAPE 3) Bookings admin : amount_total_expected uniquement
--          payment_method et service_fee_percent_applied RESTENT NULL en V1.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_count bigint;
BEGIN
  WITH updated AS (
    UPDATE public.bookings
    SET amount_total_expected = COALESCE(
      amount_total_expected,
      amount_total_paid,
      total_price,
      subtotal
    )
    WHERE pricing_mode = 'admin'
      AND amount_total_expected IS NULL
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated;
  RAISE NOTICE 'Étape 3 — bookings admin backfilled : %', v_count;
END $$;

-- ---------------------------------------------------------------------------
-- ÉTAPE 4) Vérifications post-backfill
--          On exige 0 ligne web/legacy sans payment_method ni percent_applied.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_web_missing_pm        bigint;
  v_legacy_missing_pm     bigint;
  v_web_missing_pct       bigint;
  v_legacy_missing_pct    bigint;
  v_web_missing_expected  bigint;
  v_admin_missing_expect  bigint;
BEGIN
  SELECT count(*) INTO v_web_missing_pm
    FROM public.bookings
   WHERE pricing_mode = 'web'
     AND payment_method IS NULL;

  SELECT count(*) INTO v_legacy_missing_pm
    FROM public.bookings
   WHERE pricing_mode IS NULL
     AND payment_method IS NULL;

  SELECT count(*) INTO v_web_missing_pct
    FROM public.bookings
   WHERE pricing_mode = 'web'
     AND service_fee_percent_applied IS NULL;

  SELECT count(*) INTO v_legacy_missing_pct
    FROM public.bookings
   WHERE pricing_mode IS NULL
     AND service_fee_percent_applied IS NULL;

  SELECT count(*) INTO v_web_missing_expected
    FROM public.bookings
   WHERE pricing_mode = 'web'
     AND amount_total_expected IS NULL
     AND subtotal IS NOT NULL;

  SELECT count(*) INTO v_admin_missing_expect
    FROM public.bookings
   WHERE pricing_mode = 'admin'
     AND amount_total_expected IS NULL
     AND COALESCE(amount_total_paid, total_price, subtotal) IS NOT NULL;

  RAISE NOTICE 'Post-backfill checks:';
  RAISE NOTICE '  web    sans payment_method        : %', v_web_missing_pm;
  RAISE NOTICE '  legacy sans payment_method        : %', v_legacy_missing_pm;
  RAISE NOTICE '  web    sans service_fee_percent   : %', v_web_missing_pct;
  RAISE NOTICE '  legacy sans service_fee_percent   : %', v_legacy_missing_pct;
  RAISE NOTICE '  web    sans amount_total_expected : %', v_web_missing_expected;
  RAISE NOTICE '  admin  sans amount_total_expected : %', v_admin_missing_expect;

  IF v_web_missing_pm     > 0 THEN RAISE EXCEPTION 'Backfill incomplet : % bookings web    sans payment_method',        v_web_missing_pm;     END IF;
  IF v_legacy_missing_pm  > 0 THEN RAISE EXCEPTION 'Backfill incomplet : % bookings legacy sans payment_method',        v_legacy_missing_pm;  END IF;
  IF v_web_missing_pct    > 0 THEN RAISE EXCEPTION 'Backfill incomplet : % bookings web    sans service_fee_percent',   v_web_missing_pct;    END IF;
  IF v_legacy_missing_pct > 0 THEN RAISE EXCEPTION 'Backfill incomplet : % bookings legacy sans service_fee_percent',   v_legacy_missing_pct; END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- 5) Vérifications post-déploiement (à exécuter manuellement) :
--
--    SELECT pricing_mode,
--           count(*)                                                 AS nb,
--           count(*) FILTER (WHERE payment_method IS NULL)           AS nb_pm_null,
--           count(*) FILTER (WHERE service_fee_percent_applied IS NULL) AS nb_pct_null,
--           count(*) FILTER (WHERE amount_total_expected IS NULL)    AS nb_expected_null
--    FROM public.bookings
--    GROUP BY pricing_mode
--    ORDER BY pricing_mode NULLS FIRST;
--
--    -- Attendu :
--    --   web   : nb_pm_null = 0, nb_pct_null = 0, nb_expected_null = 0 (sauf subtotal NULL)
--    --   admin : nb_pm_null = nb (volontaire), nb_pct_null = nb (volontaire),
--    --           nb_expected_null = 0 (sauf si total_price/subtotal/amount_total_paid NULL)
--    --   NULL  : nb_pm_null = 0, nb_pct_null = 0, nb_expected_null = 0
-- ---------------------------------------------------------------------------
