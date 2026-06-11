-- =============================================================================
-- Audit pré-migration "Fees Dynamic v1" (P0)
-- =============================================================================
-- Objectif : produire un snapshot baseline de la donnée AVANT l'application des
-- migrations 20260612120000..20260612120300 (P1).
--
-- Mode      : LECTURE SEULE — aucune modification.
-- Usage     :
--   psql "$DATABASE_URL" -f scripts/audit-fees-before-migration.sql > audit.txt
--   (ou via Supabase Studio → SQL Editor, en exécutant chaque bloc séparément)
--
-- Chaque bloc affiche un titre puis le résultat. Les compteurs servent de
-- référence pour le contrôle post-migration (P1 étape 15).
-- =============================================================================

\echo '============================================================'
\echo 'AUDIT 1/10 — Volume total de bookings'
\echo '============================================================'
SELECT count(*) AS total_bookings FROM public.bookings;

\echo '============================================================'
\echo 'AUDIT 2/10 — Distribution par status'
\echo '============================================================'
SELECT
  COALESCE(status, '(null)') AS status,
  count(*) AS nb
FROM public.bookings
GROUP BY status
ORDER BY nb DESC;

\echo '============================================================'
\echo 'AUDIT 3/10 — Distribution par pricing_mode'
\echo '============================================================'
SELECT
  COALESCE(pricing_mode, '(null)') AS pricing_mode,
  count(*) AS nb
FROM public.bookings
GROUP BY pricing_mode
ORDER BY nb DESC;

\echo '============================================================'
\echo 'AUDIT 4/10 — Distribution par offline_payment_method'
\echo '============================================================'
SELECT
  COALESCE(offline_payment_method, '(null)') AS offline_payment_method,
  count(*) AS nb
FROM public.bookings
GROUP BY offline_payment_method
ORDER BY nb DESC;

\echo '============================================================'
\echo 'AUDIT 5/10 — Sommes financières actuelles (référence)'
\echo '============================================================'
SELECT
  count(*) FILTER (WHERE service_fee_renter IS NOT NULL)   AS rows_with_service_fee_renter,
  count(*) FILTER (WHERE service_fee_owner  IS NOT NULL)   AS rows_with_service_fee_owner,
  count(*) FILTER (WHERE owner_payout_amount IS NOT NULL)  AS rows_with_owner_payout_amount,
  count(*) FILTER (WHERE platform_total_fee IS NOT NULL)   AS rows_with_platform_total_fee,
  count(*) FILTER (WHERE amount_total_paid  IS NOT NULL)   AS rows_with_amount_total_paid,
  ROUND(COALESCE(SUM(service_fee_renter),   0)::numeric, 2) AS sum_service_fee_renter,
  ROUND(COALESCE(SUM(service_fee_owner),    0)::numeric, 2) AS sum_service_fee_owner,
  ROUND(COALESCE(SUM(owner_payout_amount),  0)::numeric, 2) AS sum_owner_payout_amount,
  ROUND(COALESCE(SUM(platform_total_fee),   0)::numeric, 2) AS sum_platform_total_fee,
  ROUND(COALESCE(SUM(amount_total_paid),    0)::numeric, 2) AS sum_amount_total_paid,
  ROUND(COALESCE(SUM(subtotal),             0)::numeric, 2) AS sum_subtotal,
  ROUND(COALESCE(SUM(total_price),          0)::numeric, 2) AS sum_total_price,
  ROUND(COALESCE(SUM(service_fee),          0)::numeric, 2) AS sum_service_fee
FROM public.bookings;

\echo '============================================================'
\echo 'AUDIT 6/10 — Croisement status × pricing_mode (matrice)'
\echo '============================================================'
SELECT
  COALESCE(pricing_mode, '(null)') AS pricing_mode,
  COALESCE(status, '(null)')        AS status,
  count(*) AS nb,
  ROUND(COALESCE(SUM(subtotal),         0)::numeric, 2) AS sum_subtotal,
  ROUND(COALESCE(SUM(amount_total_paid),0)::numeric, 2) AS sum_paid
FROM public.bookings
GROUP BY pricing_mode, status
ORDER BY pricing_mode NULLS FIRST, nb DESC;

\echo '============================================================'
\echo 'AUDIT 7/10 — Anomalies détectées (à investiguer si > 0)'
\echo '============================================================'
SELECT
  count(*) FILTER (WHERE subtotal IS NULL)               AS rows_subtotal_null,
  count(*) FILTER (WHERE subtotal < 0)                   AS rows_subtotal_negative,
  count(*) FILTER (WHERE service_fee IS NULL)            AS rows_service_fee_null,
  count(*) FILTER (WHERE service_fee < 0)                AS rows_service_fee_negative,
  count(*) FILTER (WHERE total_price IS NULL)            AS rows_total_price_null,
  count(*) FILTER (WHERE base_price IS NULL)             AS rows_base_price_null,
  count(*) FILTER (WHERE pricing_mode IS NULL
                   AND status IS NOT NULL)               AS rows_pricing_mode_null_with_status,
  count(*) FILTER (WHERE status = 'confirmed'
                   AND amount_total_paid IS NULL)        AS rows_confirmed_without_amount_paid,
  count(*) FILTER (WHERE status = 'accepted'
                   AND amount_total_paid IS NULL)        AS rows_accepted_without_amount_paid
FROM public.bookings;

\echo '============================================================'
\echo 'AUDIT 8/10 — Bookings web payés : ratio service_fee_renter / subtotal'
\echo '(vérifie que historiquement 15 % a bien été appliqué)'
\echo '============================================================'
SELECT
  ROUND(
    AVG(
      CASE
        WHEN subtotal > 0 AND service_fee_renter IS NOT NULL
          THEN (service_fee_renter / subtotal)
      END
    )::numeric,
    4
  ) AS avg_ratio_renter_fee_on_subtotal,
  MIN(
    CASE
      WHEN subtotal > 0 AND service_fee_renter IS NOT NULL
        THEN (service_fee_renter / subtotal)
    END
  )::numeric(10,4) AS min_ratio,
  MAX(
    CASE
      WHEN subtotal > 0 AND service_fee_renter IS NOT NULL
        THEN (service_fee_renter / subtotal)
    END
  )::numeric(10,4) AS max_ratio,
  count(*) FILTER (
    WHERE subtotal > 0
      AND service_fee_renter IS NOT NULL
  ) AS sample_size
FROM public.bookings
WHERE COALESCE(pricing_mode, 'web') = 'web';

\echo '============================================================'
\echo 'AUDIT 9/10 — Configuration platform_settings existante'
\echo '============================================================'
SELECT key, value, updated_at
FROM public.platform_settings
ORDER BY key;

\echo '============================================================'
\echo 'AUDIT 10/10 — Schéma actuel : colonnes ciblées par P1'
\echo '(toutes les colonnes ci-dessous doivent être ABSENTES avant P1)'
\echo '============================================================'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'bookings'
  AND column_name IN (
    'payment_method',
    'amount_total_expected',
    'service_fee_percent_applied'
  )
ORDER BY column_name;

\echo '============================================================'
\echo 'AUDIT — FIN'
\echo 'Stocker ce fichier de sortie comme baseline pour comparaison post-P1.'
\echo '============================================================'
