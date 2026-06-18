-- preview_renter_fee n'avait jamais été mis à jour pour accepter vehicle_type
-- lors du passage aux frais par catégorie (get_fee_percent/create_web_booking
-- l'ont déjà). Résultat : la modale de confirmation client (qui appelle ce
-- RPC pour afficher le prix avant booking) retombe toujours sur le %
-- global de platform_settings, alors que create_web_booking applique le %
-- par catégorie au moment réel de la création — deux montants différents
-- pour la même réservation.
--
-- Seul appelant de ce RPC : src/services/supabase/renterFeePreview.ts
-- (confirmé par grep avant ce DROP).

DROP FUNCTION IF EXISTS public.preview_renter_fee(numeric, text);

CREATE OR REPLACE FUNCTION public.preview_renter_fee(
  p_subtotal       numeric,
  p_payment_method text,
  p_vehicle_type   text DEFAULT NULL
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
  v_subtotal := COALESCE(p_subtotal, 0);
  IF v_subtotal < 0 THEN
    v_subtotal := 0;
  END IF;
  v_subtotal := round(v_subtotal, 2);

  v_percent := public.get_fee_percent(p_payment_method, p_vehicle_type);
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

COMMENT ON FUNCTION public.preview_renter_fee(numeric, text, text) IS
  'RPC publique pour le frontend (anon/authenticated). PREVIEW d''affichage uniquement, ne persiste rien en DB. p_vehicle_type optionnel : si fourni, lit service_fee_rules (panel admin) en priorité, sinon retombe sur platform_settings (comportement global historique).';

REVOKE ALL ON FUNCTION public.preview_renter_fee(numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_renter_fee(numeric, text, text) TO anon, authenticated, service_role;
