-- Facturation par jours calendaires (règle loueur : 9h / 12h sur le jour de retour)
-- Aligné sur src/utils/rentalPriceFromDates.ts

-- ---------------------------------------------------------------------------
-- rental_days : support des demi-journées (ex. 3.5)
-- ---------------------------------------------------------------------------
ALTER TABLE public.bookings
  ALTER COLUMN rental_days TYPE numeric(5,1)
  USING rental_days::numeric(5,1);

-- ---------------------------------------------------------------------------
-- Fraction facturable du jour de retour
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._return_day_fraction(p_end_time text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_time time;
  v_minutes integer;
BEGIN
  v_time := COALESCE(NULLIF(trim(p_end_time), ''), '00:00')::time;
  v_minutes := EXTRACT(HOUR FROM v_time)::integer * 60 + EXTRACT(MINUTE FROM v_time)::integer;

  IF v_minutes < 9 * 60 THEN
    RETURN 0;
  ELSIF v_minutes <= 12 * 60 THEN
    RETURN 0.5;
  ELSE
    RETURN 1;
  END IF;
END;
$$;

COMMENT ON FUNCTION public._return_day_fraction(text) IS
  'Fraction jour de retour : <9h=0, 9h-12h=0.5, >12h=1.';

-- ---------------------------------------------------------------------------
-- Prix de base location (jours calendaires)
-- DROP required: OUT parameter rental_days integer -> numeric
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.compute_booking_base_price(numeric, date, date, text, text);

CREATE OR REPLACE FUNCTION public.compute_booking_base_price(
  p_price_per_day numeric,
  p_start_date date,
  p_end_date date,
  p_start_time text DEFAULT NULL,
  p_end_time text DEFAULT NULL
)
RETURNS TABLE (
  base_price numeric,
  rental_days numeric,
  rental_hours numeric
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_start_ts timestamp;
  v_end_ts timestamp;
  v_rental_hours numeric;
  v_return_fraction numeric;
  v_middle_days integer;
  v_billable_days numeric;
  v_total numeric;
BEGIN
  IF p_price_per_day IS NULL OR p_price_per_day < 0 THEN
    RAISE EXCEPTION 'INVALID_PRICE_PER_DAY';
  END IF;

  v_start_ts := public._booking_combine_datetime(p_start_date, p_start_time);
  v_end_ts := public._booking_combine_datetime(p_end_date, p_end_time);

  IF v_end_ts <= v_start_ts THEN
    RAISE EXCEPTION 'INVALID_DATETIME_RANGE';
  END IF;

  v_rental_hours := EXTRACT(EPOCH FROM (v_end_ts - v_start_ts)) / 3600.0;
  v_return_fraction := public._return_day_fraction(p_end_time);

  IF p_start_date = p_end_date THEN
    v_billable_days := GREATEST(1, v_return_fraction);
  ELSE
    v_middle_days := GREATEST(0, (p_end_date - p_start_date) - 1);
    v_billable_days := 1 + v_middle_days + v_return_fraction;
  END IF;

  v_total := round(v_billable_days * p_price_per_day, 2);

  base_price := v_total;
  rental_days := v_billable_days;
  rental_hours := round(v_rental_hours, 4);
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.compute_booking_base_price(numeric, date, date, text, text) IS
  'Prix location de base (jours calendaires + règle 9h/12h retour), aligné computeBaseRentalPrice côté app.';
