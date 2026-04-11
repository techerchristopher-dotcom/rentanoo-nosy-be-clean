-- =============================================================================
-- bookings_check: allow same-calendar-day rentals (end_date >= start_date)
-- =============================================================================
--
-- Context:
--   - start_date / end_date are DATE columns (calendar day).
--   - Fine-grained pickup/return uses start_time / end_time (HH:mm).
--   - Application logic validates full datetimes: end instant > start instant.
--
-- Previous rule:
--   CHECK (end_date > start_date)
--   Rejected valid rows when end_dt > start_dt but both fell on the same
--   calendar day (e.g. 10:00–18:00 same day).
--
-- New rule:
--   CHECK (end_date >= start_date)
--   Still rejects inverted ranges (end_date < start_date).
--
-- Other constraints on public.bookings are unchanged:
--   bookings_status_check, bookings_pricing_mode_check,
--   bookings_deposit_status_check, time format checks, etc.
--
-- =============================================================================

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_check CHECK (end_date >= start_date);
