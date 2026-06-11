-- =============================================================================
-- Fees Dynamic v1 — 3/4 : Fonctions SQL (source de vérité du calcul)
-- =============================================================================
-- Objectif (P1.3) :
--   Créer les 4 fonctions qui constituent la SOURCE DE VÉRITÉ UNIQUE pour
--   le calcul des frais de service client :
--
--   1. get_fee_percent(payment_method)
--      → lit platform_settings.value.percent pour la clé correspondante.
--      → leve une exception si NULL / inconnu / valeur invalide.
--      → STABLE, SECURITY DEFINER.
--
--   2. compute_renter_fee(subtotal, payment_method)
--      → round(subtotal * get_fee_percent, 2)
--      → STABLE, SECURITY DEFINER.
--
--   3. compute_renter_total(subtotal, payment_method)
--      → subtotal + compute_renter_fee
--      → STABLE, SECURITY DEFINER.
--
--   4. preview_renter_fee(subtotal, payment_method)
--      → RPC publique retournant un jsonb { subtotal, payment_method,
--         fee_percent, service_fee_renter, amount_total_expected }.
--      → STABLE, SECURITY DEFINER, EXECUTE TO anon, authenticated.
--
-- Aucune fonction existante n'est modifiée en P1 :
--   - sanitize_booking_selected_options : inchangée (hardcode 0.15 jusqu'à P2)
--   - create_web_booking                : inchangée
--   - bookings_guard_pricing_update     : inchangée
--
-- Rollback :
--   DROP FUNCTION IF EXISTS public.preview_renter_fee(numeric, text);
--   DROP FUNCTION IF EXISTS public.compute_renter_total(numeric, text);
--   DROP FUNCTION IF EXISTS public.compute_renter_fee(numeric, text);
--   DROP FUNCTION IF EXISTS public.get_fee_percent(text);
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) get_fee_percent(payment_method)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_fee_percent(
  p_payment_method text
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_key     text;
  v_value   jsonb;
  v_percent numeric;
BEGIN
  IF p_payment_method IS NULL THEN
    RAISE EXCEPTION 'payment_method_required'
      USING ERRCODE = '22023';  -- invalid_parameter_value
  END IF;

  IF p_payment_method = 'card_online' THEN
    v_key := 'fee_card_online_percent';
  ELSIF p_payment_method = 'cash_on_site' THEN
    v_key := 'fee_cash_on_site_percent';
  ELSE
    RAISE EXCEPTION 'payment_method_unsupported: %', p_payment_method
      USING ERRCODE = '22023';
  END IF;

  SELECT value
    INTO v_value
  FROM public.platform_settings
  WHERE key = v_key;

  IF v_value IS NULL THEN
    RAISE EXCEPTION 'fee_config_missing: %', v_key
      USING ERRCODE = 'P0002';  -- no_data_found
  END IF;

  BEGIN
    v_percent := (v_value->>'percent')::numeric;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'fee_config_invalid: % = %', v_key, v_value
      USING ERRCODE = '22023';
  END;

  IF v_percent IS NULL OR v_percent < 0 OR v_percent > 1 THEN
    RAISE EXCEPTION 'fee_config_out_of_range: % = %', v_key, v_percent
      USING ERRCODE = '22023';
  END IF;

  RETURN v_percent;
END;
$$;

COMMENT ON FUNCTION public.get_fee_percent(text) IS
  'Source de vérité unique du taux de frais client. Lit platform_settings.value->>''percent'' pour la clé associée au payment_method. Lève une exception en cas de valeur manquante ou invalide (aucun fallback silencieux).';

-- ---------------------------------------------------------------------------
-- 2) compute_renter_fee(subtotal, payment_method)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_renter_fee(
  p_subtotal       numeric,
  p_payment_method text
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_percent numeric;
BEGIN
  IF p_subtotal IS NULL OR p_subtotal < 0 THEN
    RETURN 0;
  END IF;

  v_percent := public.get_fee_percent(p_payment_method);
  RETURN round(p_subtotal * v_percent, 2);
END;
$$;

COMMENT ON FUNCTION public.compute_renter_fee(numeric, text) IS
  'Calcule round(subtotal * get_fee_percent(payment_method), 2). Retourne 0 si subtotal NULL/négatif. Lève une exception via get_fee_percent si payment_method invalide.';

-- ---------------------------------------------------------------------------
-- 3) compute_renter_total(subtotal, payment_method)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_renter_total(
  p_subtotal       numeric,
  p_payment_method text
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_fee numeric;
BEGIN
  IF p_subtotal IS NULL OR p_subtotal < 0 THEN
    RETURN 0;
  END IF;

  v_fee := public.compute_renter_fee(p_subtotal, p_payment_method);
  RETURN round(p_subtotal + v_fee, 2);
END;
$$;

COMMENT ON FUNCTION public.compute_renter_total(numeric, text) IS
  'Calcule round(subtotal + compute_renter_fee, 2). Source officielle du montant TTC attendu pour amount_total_expected.';

-- ---------------------------------------------------------------------------
-- 4) preview_renter_fee(subtotal, payment_method) — RPC publique
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.preview_renter_fee(
  p_subtotal       numeric,
  p_payment_method text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_subtotal numeric;
  v_percent  numeric;
  v_fee      numeric;
  v_total    numeric;
BEGIN
  -- normaliser subtotal
  v_subtotal := COALESCE(p_subtotal, 0);
  IF v_subtotal < 0 THEN
    v_subtotal := 0;
  END IF;
  v_subtotal := round(v_subtotal, 2);

  v_percent := public.get_fee_percent(p_payment_method);
  v_fee     := round(v_subtotal * v_percent, 2);
  v_total   := round(v_subtotal + v_fee, 2);

  RETURN jsonb_build_object(
    'subtotal',              v_subtotal,
    'payment_method',        p_payment_method,
    'fee_percent',           v_percent,
    'service_fee_renter',    v_fee,
    'amount_total_expected', v_total
  );
END;
$$;

COMMENT ON FUNCTION public.preview_renter_fee(numeric, text) IS
  'RPC publique pour le frontend (anon/authenticated). Retourne un jsonb avec subtotal, payment_method, fee_percent, service_fee_renter, amount_total_expected. À utiliser exclusivement pour PREVIEW d''affichage : ne persiste rien en DB.';

-- ---------------------------------------------------------------------------
-- 5) Permissions
--    get_fee_percent / compute_* : on garde SECURITY DEFINER mais
--    EXECUTE accessible aux mêmes rôles. preview_renter_fee est l'API publique.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_fee_percent(text)                FROM PUBLIC;
REVOKE ALL ON FUNCTION public.compute_renter_fee(numeric, text)    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.compute_renter_total(numeric, text)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.preview_renter_fee(numeric, text)    FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_fee_percent(text)               TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_renter_fee(numeric, text)   TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.compute_renter_total(numeric, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.preview_renter_fee(numeric, text)   TO anon, authenticated, service_role;

COMMIT;

-- ---------------------------------------------------------------------------
-- 6) Vérifications post-déploiement (à exécuter manuellement) :
--
--    SELECT public.get_fee_percent('card_online');   -- attendu : 0.1000
--    SELECT public.get_fee_percent('cash_on_site');  -- attendu : 0.1500
--    SELECT public.get_fee_percent('xxx');           -- attendu : ERROR payment_method_unsupported
--    SELECT public.get_fee_percent(NULL);            -- attendu : ERROR payment_method_required
--
--    SELECT public.compute_renter_fee(100, 'card_online');    -- 10.00
--    SELECT public.compute_renter_fee(100, 'cash_on_site');   -- 15.00
--    SELECT public.compute_renter_total(100, 'card_online');  -- 110.00
--    SELECT public.compute_renter_total(100, 'cash_on_site'); -- 115.00
--
--    SELECT public.preview_renter_fee(100, 'card_online');
--    -- attendu : {"subtotal": 100, "payment_method": "card_online",
--    --           "fee_percent": 0.10, "service_fee_renter": 10,
--    --           "amount_total_expected": 110}
-- ---------------------------------------------------------------------------
