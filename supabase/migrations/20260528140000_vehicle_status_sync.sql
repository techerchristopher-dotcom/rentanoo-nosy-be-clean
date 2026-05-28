-- Sync operational_status (admin fleet) with bookings/EDL and available (site publication)

-- ---------------------------------------------------------------------------
-- Core: recalculate vehicle operational_status from repairs + bookings + EDL
-- Preserves manual admin states: broken, accident, retired
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION recalc_vehicle_operational_status(p_vehicle_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current text;
  v_new text;
  v_has_active_repair boolean;
  v_is_rented boolean;
  v_is_reserved boolean;
BEGIN
  SELECT operational_status INTO v_current
  FROM vehicles
  WHERE id = p_vehicle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Owner/admin manual states: do not override automatically
  IF v_current IN ('broken', 'accident', 'retired') THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM repairs
    WHERE vehicle_id = p_vehicle_id
      AND status IN ('open', 'in_progress')
  ) INTO v_has_active_repair;

  IF v_has_active_repair THEN
    v_new := 'maintenance';
  ELSE
    -- Rented: EDL départ signé, retour pas encore signé
    SELECT EXISTS (
      SELECT 1
      FROM checkin_depart cd
      JOIN bookings b ON b.id = cd.booking_id
      WHERE b.vehicle_id = p_vehicle_id
        AND cd.status = 'completed'
        AND NOT EXISTS (
          SELECT 1 FROM checkin_return cr
          WHERE cr.booking_id = b.id
            AND cr.status = 'completed'
        )
    ) INTO v_is_rented;

    IF v_is_rented THEN
      v_new := 'rented';
    ELSE
      -- Reserved: réservation confirmée, pas encore parti
      SELECT EXISTS (
        SELECT 1
        FROM bookings b
        WHERE b.vehicle_id = p_vehicle_id
          AND b.status IN ('confirmed', 'active', 'accepted')
          AND b.end_date::date >= CURRENT_DATE
          AND NOT EXISTS (
            SELECT 1 FROM checkin_depart cd
            WHERE cd.booking_id = b.id
              AND cd.status = 'completed'
          )
      ) INTO v_is_reserved;

      IF v_is_reserved THEN
        v_new := 'reserved';
      ELSE
        v_new := 'available';
      END IF;
    END IF;
  END IF;

  IF v_new IS DISTINCT FROM v_current THEN
    UPDATE vehicles
    SET operational_status = v_new, updated_at = now()
    WHERE id = p_vehicle_id;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- Owner toggle: available boolean → operational_status (retired / available)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_operational_status_from_available_toggle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.available IS DISTINCT FROM OLD.available
     AND NEW.operational_status IS NOT DISTINCT FROM OLD.operational_status THEN
    IF NEW.available = false THEN
      NEW.operational_status := 'retired';
    ELSE
      NEW.operational_status := 'available';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vehicles_available_toggle ON vehicles;
CREATE TRIGGER trg_vehicles_available_toggle
  BEFORE UPDATE OF available ON vehicles
  FOR EACH ROW EXECUTE FUNCTION sync_operational_status_from_available_toggle();

-- When owner republishes (retired → available), recheck bookings
CREATE OR REPLACE FUNCTION trg_after_vehicle_republished_recalc()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.operational_status = 'retired'
     AND NEW.operational_status = 'available' THEN
    PERFORM recalc_vehicle_operational_status(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vehicles_republished_recalc ON vehicles;
CREATE TRIGGER trg_vehicles_republished_recalc
  AFTER UPDATE OF operational_status ON vehicles
  FOR EACH ROW EXECUTE FUNCTION trg_after_vehicle_republished_recalc();

-- ---------------------------------------------------------------------------
-- Bookings → recalc vehicle status
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_bookings_recalc_vehicle_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalc_vehicle_operational_status(OLD.vehicle_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id THEN
    PERFORM recalc_vehicle_operational_status(OLD.vehicle_id);
  END IF;

  PERFORM recalc_vehicle_operational_status(NEW.vehicle_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_vehicle_status ON bookings;
CREATE TRIGGER trg_bookings_vehicle_status
  AFTER INSERT OR UPDATE OF status, vehicle_id, start_date, end_date OR DELETE ON bookings
  FOR EACH ROW EXECUTE FUNCTION trg_bookings_recalc_vehicle_status();

-- ---------------------------------------------------------------------------
-- EDL départ / retour → recalc vehicle status
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trg_checkin_depart_recalc_vehicle_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_vehicle_id uuid;
BEGIN
  SELECT b.vehicle_id INTO v_vehicle_id
  FROM bookings b
  WHERE b.id = COALESCE(NEW.booking_id, OLD.booking_id);

  IF v_vehicle_id IS NOT NULL THEN
    PERFORM recalc_vehicle_operational_status(v_vehicle_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_checkin_depart_vehicle_status ON checkin_depart;
CREATE TRIGGER trg_checkin_depart_vehicle_status
  AFTER INSERT OR UPDATE OF status ON checkin_depart
  FOR EACH ROW EXECUTE FUNCTION trg_checkin_depart_recalc_vehicle_status();

CREATE OR REPLACE FUNCTION trg_checkin_return_recalc_vehicle_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_vehicle_id uuid;
BEGIN
  SELECT b.vehicle_id INTO v_vehicle_id
  FROM bookings b
  WHERE b.id = COALESCE(NEW.booking_id, OLD.booking_id);

  IF v_vehicle_id IS NOT NULL THEN
    PERFORM recalc_vehicle_operational_status(v_vehicle_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_checkin_return_vehicle_status ON checkin_return;
CREATE TRIGGER trg_checkin_return_vehicle_status
  AFTER INSERT OR UPDATE OF status ON checkin_return
  FOR EACH ROW EXECUTE FUNCTION trg_checkin_return_recalc_vehicle_status();

-- ---------------------------------------------------------------------------
-- Repairs: use recalc instead of hardcoded available
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_vehicle_status_from_repair()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_vehicle_id uuid;
BEGIN
  v_vehicle_id := COALESCE(NEW.vehicle_id, OLD.vehicle_id);

  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  PERFORM recalc_vehicle_operational_status(v_vehicle_id);
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- One-time realign: recalc all scooters + sync available
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM vehicles WHERE vehicle_type = 'scooter' LOOP
    PERFORM recalc_vehicle_operational_status(r.id);
  END LOOP;
END $$;

UPDATE vehicles
SET available = (operational_status = 'available')
WHERE vehicle_type = 'scooter';

GRANT EXECUTE ON FUNCTION recalc_vehicle_operational_status(uuid) TO authenticated;
