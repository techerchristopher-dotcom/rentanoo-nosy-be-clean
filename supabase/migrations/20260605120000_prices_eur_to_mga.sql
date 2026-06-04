-- Migration : tarifs stockés en EUR → ariary (MGA), arrondi au millier.
-- Heuristique : price_per_day < 10 000 = encore en EUR (typ. 10–200 €/jour).

DO $$
DECLARE
  r numeric := 5000;
  j jsonb;
BEGIN
  SELECT value INTO j FROM public.platform_settings WHERE key = 'eur_mga_exchange' LIMIT 1;
  IF j IS NOT NULL AND (j->>'rate') IS NOT NULL THEN
    r := (j->>'rate')::numeric;
  END IF;

  IF r <= 0 THEN
    r := 5000;
  END IF;

  UPDATE public.vehicles
  SET
    price_per_day = round((price_per_day * r) / 1000) * 1000,
    price_per_day_agency = CASE
      WHEN price_per_day_agency IS NOT NULL AND price_per_day_agency > 0 AND price_per_day_agency < 10000
      THEN round((price_per_day_agency * r) / 1000) * 1000
      ELSE price_per_day_agency
    END,
    deposit_amount = CASE
      WHEN deposit_amount IS NOT NULL AND deposit_amount > 0 AND deposit_amount < 10000
      THEN round((deposit_amount * r) / 1000) * 1000
      ELSE deposit_amount
    END
  WHERE price_per_day > 0 AND price_per_day < 10000;

  UPDATE public.bookings
  SET
    price_per_day = CASE WHEN price_per_day > 0 AND price_per_day < 10000 THEN round((price_per_day * r) / 1000) * 1000 ELSE price_per_day END,
    base_price = CASE WHEN base_price > 0 AND base_price < 100000 THEN round((base_price * r) / 1000) * 1000 ELSE base_price END,
    options_total = CASE WHEN options_total > 0 AND options_total < 100000 THEN round((options_total * r) / 1000) * 1000 ELSE options_total END,
    subtotal = CASE WHEN subtotal > 0 AND subtotal < 100000 THEN round((subtotal * r) / 1000) * 1000 ELSE subtotal END,
    service_fee = CASE WHEN service_fee > 0 AND service_fee < 100000 THEN round((service_fee * r) / 1000) * 1000 ELSE service_fee END,
    total_price = CASE WHEN total_price > 0 AND total_price < 100000 THEN round((total_price * r) / 1000) * 1000 ELSE total_price END,
    deposit_amount_snapshot = CASE
      WHEN deposit_amount_snapshot IS NOT NULL AND deposit_amount_snapshot > 0 AND deposit_amount_snapshot < 10000
      THEN round((deposit_amount_snapshot * r) / 1000) * 1000
      ELSE deposit_amount_snapshot
    END,
    amount_total_paid = CASE
      WHEN amount_total_paid IS NOT NULL AND amount_total_paid > 0 AND amount_total_paid < 100000
      THEN round((amount_total_paid * r) / 1000) * 1000
      ELSE amount_total_paid
    END
  WHERE price_per_day > 0 AND price_per_day < 10000;
END $$;
