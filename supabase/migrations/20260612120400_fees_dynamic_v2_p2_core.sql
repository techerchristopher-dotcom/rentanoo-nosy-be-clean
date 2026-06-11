-- =============================================================================
-- Fees Dynamic v2 — P2 Core : Source de vérité unique côté SQL
-- =============================================================================
-- Objectif P2 :
--   Faire des fonctions SQL P1 (get_fee_percent, compute_renter_fee,
--   compute_renter_total) la SOURCE DE VÉRITÉ UNIQUE du calcul des frais
--   client, en branchant create_web_booking dessus.
--
-- Contenu (1 migration atomique = M5 + M6 + M7) :
--   M5. create_web_booking — 9-arg : implémentation complète, lit
--       compute_renter_fee/total/get_fee_percent ; écrit payment_method,
--       amount_total_expected, service_fee_percent_applied ; ne touche
--       PLUS aux colonnes owner-related (service_fee_owner,
--       owner_payout_amount, platform_total_fee) — laissées NULL pour
--       les nouveaux bookings (déprécation gracieuse).
--   M6. create_web_booking — 8-arg : wrapper de compatibilité 72h qui
--       délègue vers le 9-arg avec p_payment_method = 'card_online'.
--   M7. bookings_guard_pricing_update : verrouille en plus les 3
--       colonnes P2 (payment_method, amount_total_expected,
--       service_fee_percent_applied) + service_fee_renter contre les
--       UPDATE locataire/propriétaire.
--
-- Anti-ambiguïté Postgres / PostgREST :
--   - 9-arg : p_payment_method SANS DEFAULT → requis → un client qui
--             envoie 8 clés JSON ne matche QUE le 8-arg.
--   - 8-arg : tous les params trailing DEFAULT NULL → wrapper "legacy",
--             matche QUAND ET SEULEMENT QUAND p_payment_method est absent.
--   Résultat : aucun "function ... is not unique" possible.
--
-- Source de vérité fees :
--   v_fee_percent       := public.get_fee_percent(p_payment_method)
--   v_renter_fee        := public.compute_renter_fee(subtotal, p_payment_method)
--   v_amount_total_exp  := public.compute_renter_total(subtotal, p_payment_method)
--
-- Colonnes écrites (nouveau booking web) :
--   subtotal                       ← sanitize_booking_selected_options
--   service_fee   (LEGACY NOT NULL) ← v_renter_fee (mirroir P2 = SFR)
--   service_fee_renter (NOUVEAU)    ← v_renter_fee
--   total_price                     ← v_pricing.total_price (== subtotal,
--                                     historique : pas le TTC Stripe)
--   payment_method                  ← p_payment_method
--   amount_total_expected           ← v_amount_total_exp
--   service_fee_percent_applied     ← v_fee_percent
--
-- Colonnes LAISSÉES NULL (déprécation P2) :
--   service_fee_owner, owner_payout_amount, platform_total_fee
--
-- sanitize_booking_selected_options : INCHANGÉE.
--   Sa colonne service_fee (hardcode 0.15) est désormais ignorée par
--   create_web_booking. Conservée pour ne casser aucun appelant externe.
--
-- Rollback :
--   BEGIN;
--     -- restaure le trigger guard pré-P2 (cf. 20260531140000)
--     -- restaure les fonctions create_web_booking pré-P2 (cf. 20260531150000
--     -- pour le 8-arg, et DROP du 9-arg)
--     DROP FUNCTION IF EXISTS public.create_web_booking(
--       uuid, date, date, text, text, text, jsonb, text, text);
--     CREATE OR REPLACE FUNCTION public.create_web_booking(
--       uuid, date, date, text, text, text, jsonb, text) ... -- ancien corps
--     -- + recréer bookings_guard_pricing_update sans verrous P2.
--   COMMIT;
--
-- Pré-requis (vérifiés avant exécution) :
--   - public.bookings.payment_method, amount_total_expected,
--     service_fee_percent_applied existent (P1 v1_schema)
--   - public.get_fee_percent / compute_renter_fee / compute_renter_total
--     existent (P1 v1_functions)
--   - public.platform_settings contient fee_card_online_percent et
--     fee_cash_on_site_percent (P1 v1_config)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- M5 : 9-arg create_web_booking (implémentation complète, source de vérité)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_web_booking(
  p_vehicle_id uuid,
  p_start_date date,
  p_end_date date,
  p_start_time text,
  p_end_time text,
  p_pickup_location text,
  p_selected_options jsonb,
  p_hotel_name text,
  p_payment_method text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_phone text;
  v_vehicle record;
  v_base record;
  v_pricing record;
  v_locations record;
  v_fee_percent numeric;
  v_renter_fee  numeric;
  v_amount_total_expected numeric;
  v_row public.bookings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  IF p_payment_method IS NULL
     OR p_payment_method NOT IN ('card_online', 'cash_on_site') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_METHOD: %', COALESCE(p_payment_method, '(null)')
      USING ERRCODE = '22023';
  END IF;

  SELECT p.phone INTO v_phone
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_phone IS NULL OR length(trim(v_phone)) = 0 THEN
    RAISE EXCEPTION 'PHONE_REQUIRED';
  END IF;

  SELECT v.id, v.price_per_day, v.available
  INTO v_vehicle
  FROM public.vehicles v
  WHERE v.id = p_vehicle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'VEHICLE_NOT_FOUND';
  END IF;

  IF v_vehicle.available IS FALSE THEN
    RAISE EXCEPTION 'VEHICLE_UNAVAILABLE';
  END IF;

  IF v_vehicle.price_per_day IS NULL OR v_vehicle.price_per_day <= 0 THEN
    RAISE EXCEPTION 'INVALID_PRICE_PER_DAY';
  END IF;

  SELECT * INTO v_base
  FROM public.compute_booking_base_price(
    v_vehicle.price_per_day,
    p_start_date,
    p_end_date,
    p_start_time,
    p_end_time
  );

  SELECT * INTO v_pricing
  FROM public.sanitize_booking_selected_options(p_selected_options, v_base.base_price);

  SELECT * INTO v_locations
  FROM public.derive_booking_locations(v_pricing.selected_options, p_hotel_name);

  -- Source de vérité unique : les 3 fonctions P1 sont les seules autorisées
  -- à décider du taux et des montants client.
  v_fee_percent           := public.get_fee_percent(p_payment_method);
  v_renter_fee            := public.compute_renter_fee(v_pricing.subtotal, p_payment_method);
  v_amount_total_expected := public.compute_renter_total(v_pricing.subtotal, p_payment_method);

  INSERT INTO public.bookings (
    user_id,
    vehicle_id,
    start_date,
    end_date,
    start_time,
    end_time,
    pickup_location,
    return_location,
    status,
    pricing_mode,
    selected_options,
    base_price,
    options_total,
    subtotal,
    service_fee,
    service_fee_renter,
    total_price,
    price_per_day,
    rental_days,
    payment_method,
    amount_total_expected,
    service_fee_percent_applied
  ) VALUES (
    v_user_id,
    p_vehicle_id,
    p_start_date,
    p_end_date,
    NULLIF(trim(p_start_time), ''),
    NULLIF(trim(p_end_time), ''),
    v_locations.pickup_location,
    v_locations.return_location,
    'pending',
    'web',
    CASE WHEN jsonb_array_length(v_pricing.selected_options) > 0
         THEN v_pricing.selected_options
         ELSE NULL
    END,
    v_base.base_price,
    v_pricing.options_total,
    v_pricing.subtotal,
    v_renter_fee,           -- service_fee LEGACY NOT NULL : miroir SFR
    v_renter_fee,            -- service_fee_renter (nouveau)
    v_pricing.total_price,   -- conservé : == subtotal (historique)
    round(v_vehicle.price_per_day, 2),
    v_base.rental_days,
    p_payment_method,
    v_amount_total_expected,
    v_fee_percent
  )
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id',                          v_row.id,
    'reference_number',            v_row.reference_number,
    'status',                      v_row.status,
    'created_at',                  v_row.created_at,
    'base_price',                  v_row.base_price,
    'options_total',               v_row.options_total,
    'subtotal',                    v_row.subtotal,
    'service_fee',                 v_row.service_fee,
    'service_fee_renter',          v_row.service_fee_renter,
    'total_price',                 v_row.total_price,
    'pickup_location',             v_row.pickup_location,
    'return_location',             v_row.return_location,
    'payment_method',              v_row.payment_method,
    'amount_total_expected',       v_row.amount_total_expected,
    'service_fee_percent_applied', v_row.service_fee_percent_applied
  );
END;
$$;

COMMENT ON FUNCTION public.create_web_booking(uuid, date, date, text, text, text, jsonb, text, text) IS
  'P2 : crée une réservation web avec recalcul serveur des montants et choix de payment_method (card_online | cash_on_site). Les frais client sont calculés via get_fee_percent / compute_renter_fee / compute_renter_total (source de vérité unique côté SQL).';

REVOKE ALL ON FUNCTION public.create_web_booking(uuid, date, date, text, text, text, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_web_booking(uuid, date, date, text, text, text, jsonb, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- M6 : 8-arg create_web_booking — WRAPPER DE COMPATIBILITÉ 72H
-- ---------------------------------------------------------------------------
-- Conservé tant que le frontend n'est pas redéployé avec p_payment_method.
-- Délègue vers le 9-arg avec card_online par défaut.
-- Sera SUPPRIMÉ dans une migration ultérieure (P2.cleanup) ≥72h après
-- le déploiement frontend P3.
CREATE OR REPLACE FUNCTION public.create_web_booking(
  p_vehicle_id uuid,
  p_start_date date,
  p_end_date date,
  p_start_time text DEFAULT NULL,
  p_end_time text DEFAULT NULL,
  p_pickup_location text DEFAULT NULL,
  p_selected_options jsonb DEFAULT '[]'::jsonb,
  p_hotel_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.create_web_booking(
    p_vehicle_id,
    p_start_date,
    p_end_date,
    p_start_time,
    p_end_time,
    p_pickup_location,
    p_selected_options,
    p_hotel_name,
    'card_online'::text
  );
END;
$$;

COMMENT ON FUNCTION public.create_web_booking(uuid, date, date, text, text, text, jsonb, text) IS
  'P2 wrapper compat 72h : délègue vers la signature 9-arg avec payment_method=card_online. À supprimer dans P2.cleanup une fois le frontend P3 stabilisé.';

REVOKE ALL ON FUNCTION public.create_web_booking(uuid, date, date, text, text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_web_booking(uuid, date, date, text, text, text, jsonb, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- M7 : bookings_guard_pricing_update — verrouille les colonnes P2
-- ---------------------------------------------------------------------------
-- Ajoute le verrou sur :
--   - service_fee_renter
--   - payment_method
--   - amount_total_expected
--   - service_fee_percent_applied
-- contre les UPDATE locataire/propriétaire (auth.uid()).
-- service_role / postgres / supabase_admin / session sans JWT : pas
-- de restriction (webhooks Stripe, RPC interne, admin API).
CREATE OR REPLACE FUNCTION public.bookings_guard_pricing_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt_role text := coalesce(auth.jwt() ->> 'role', '');
BEGIN
  -- Bypass : service role, postgres, ou session sans JWT utilisateur
  IF v_jwt_role = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin')
     OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Locataire : verrouille les colonnes pricing legacy + P2 ; autorise
  -- annulation (status + selected_options.cancellation).
  IF auth.uid() = OLD.user_id THEN
    NEW.user_id                    := OLD.user_id;
    NEW.vehicle_id                 := OLD.vehicle_id;
    NEW.base_price                 := OLD.base_price;
    NEW.options_total              := OLD.options_total;
    NEW.subtotal                   := OLD.subtotal;
    NEW.service_fee                := OLD.service_fee;
    NEW.total_price                := OLD.total_price;
    NEW.price_per_day              := OLD.price_per_day;
    NEW.rental_days                := OLD.rental_days;
    NEW.pricing_mode               := OLD.pricing_mode;
    -- P2 verrous additionnels
    NEW.service_fee_renter         := OLD.service_fee_renter;
    NEW.payment_method             := OLD.payment_method;
    NEW.amount_total_expected      := OLD.amount_total_expected;
    NEW.service_fee_percent_applied := OLD.service_fee_percent_applied;

    IF NOT (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status) THEN
      NEW.selected_options := OLD.selected_options;
    END IF;

    RETURN NEW;
  END IF;

  -- Propriétaire du véhicule : peut changer statut/caution, pas le pricing
  IF EXISTS (
    SELECT 1 FROM public.vehicles v
    WHERE v.id = OLD.vehicle_id AND v.owner_id = auth.uid()
  ) THEN
    NEW.user_id                    := OLD.user_id;
    NEW.vehicle_id                 := OLD.vehicle_id;
    NEW.base_price                 := OLD.base_price;
    NEW.options_total              := OLD.options_total;
    NEW.subtotal                   := OLD.subtotal;
    NEW.service_fee                := OLD.service_fee;
    NEW.total_price                := OLD.total_price;
    NEW.price_per_day              := OLD.price_per_day;
    NEW.rental_days                := OLD.rental_days;
    NEW.pricing_mode               := OLD.pricing_mode;
    NEW.selected_options           := OLD.selected_options;
    -- P2 verrous additionnels
    NEW.service_fee_renter         := OLD.service_fee_renter;
    NEW.payment_method             := OLD.payment_method;
    NEW.amount_total_expected      := OLD.amount_total_expected;
    NEW.service_fee_percent_applied := OLD.service_fee_percent_applied;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.bookings_guard_pricing_update() IS
  'P2 : empêche locataire/propriétaire de modifier les colonnes pricing legacy + P2 (service_fee_renter, payment_method, amount_total_expected, service_fee_percent_applied). service_role/postgres : pas de restriction.';

-- Le trigger lui-même est déjà attaché à la table (cf. 20260531140000).
-- CREATE OR REPLACE FUNCTION suffit à mettre à jour la logique appelée.

COMMIT;

-- ---------------------------------------------------------------------------
-- Vérifications post-migration (à exécuter manuellement / via runbook P2) :
--
--   -- 1. Les deux signatures coexistent
--   SELECT proname, pg_get_function_identity_arguments(oid)
--     FROM pg_proc
--    WHERE proname = 'create_web_booking'
--      AND pronamespace = 'public'::regnamespace
--    ORDER BY pronargs;
--   -- Attendu : 2 lignes (8 args + 9 args)
--
--   -- 2. Source de vérité : la nouvelle fonction renvoie bien 10/110 pour 100/card_online
--   SELECT public.preview_renter_fee(100, 'card_online');
--   -- {"subtotal":100,"payment_method":"card_online","fee_percent":0.10,
--   --  "service_fee_renter":10,"amount_total_expected":110}
--
--   SELECT public.preview_renter_fee(100, 'cash_on_site');
--   -- {"subtotal":100,"payment_method":"cash_on_site","fee_percent":0.15,
--   --  "service_fee_renter":15,"amount_total_expected":115}
--
--   -- 3. Trigger inchangé en surface
--   SELECT tgname, tgrelid::regclass, proname
--     FROM pg_trigger tr
--     JOIN pg_proc p ON p.oid = tr.tgfoid
--    WHERE tgname = 'trg_bookings_guard_pricing_update';
--   -- Attendu : 1 ligne pointant vers bookings_guard_pricing_update()
-- ---------------------------------------------------------------------------
