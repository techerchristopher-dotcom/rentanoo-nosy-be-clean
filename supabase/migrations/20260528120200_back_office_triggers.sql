-- Back-office Nosy Be: business triggers

-- ---------------------------------------------------------------------------
-- Recalculate repairs.parts_cost when repair_parts change
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION recalc_repair_parts_cost()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_repair_id uuid;
BEGIN
  v_repair_id := COALESCE(NEW.repair_id, OLD.repair_id);

  UPDATE repairs
  SET parts_cost = COALESCE((
    SELECT SUM(line_total) FROM repair_parts WHERE repair_id = v_repair_id
  ), 0),
  updated_at = now()
  WHERE id = v_repair_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_repair_parts_recalc_cost ON repair_parts;
CREATE TRIGGER trg_repair_parts_recalc_cost
  AFTER INSERT OR UPDATE OR DELETE ON repair_parts
  FOR EACH ROW EXECUTE FUNCTION recalc_repair_parts_cost();

-- ---------------------------------------------------------------------------
-- Set closed_at when repair is done
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_repair_closed_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS DISTINCT FROM 'done') THEN
    NEW.closed_at := COALESCE(NEW.closed_at, now());
  END IF;
  IF NEW.status IN ('open', 'in_progress') THEN
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_repairs_closed_at ON repairs;
CREATE TRIGGER trg_repairs_closed_at
  BEFORE UPDATE ON repairs
  FOR EACH ROW EXECUTE FUNCTION set_repair_closed_at();

-- ---------------------------------------------------------------------------
-- Sync vehicles.available from operational_status
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_vehicle_available_from_operational_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.available := (NEW.operational_status = 'available');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vehicles_sync_available ON vehicles;
CREATE TRIGGER trg_vehicles_sync_available
  BEFORE INSERT OR UPDATE OF operational_status ON vehicles
  FOR EACH ROW EXECUTE FUNCTION sync_vehicle_available_from_operational_status();

-- ---------------------------------------------------------------------------
-- Update vehicle operational_status when repair status changes
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_vehicle_status_from_repair()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_vehicle_id uuid;
  v_has_active_repair boolean;
BEGIN
  v_vehicle_id := COALESCE(NEW.vehicle_id, OLD.vehicle_id);

  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('open', 'in_progress') THEN
    UPDATE vehicles
    SET operational_status = 'maintenance', updated_at = now()
    WHERE id = v_vehicle_id
      AND operational_status IN ('available', 'reserved');
    RETURN NEW;
  END IF;

  IF NEW.status IN ('done', 'cancelled') THEN
    SELECT EXISTS (
      SELECT 1 FROM repairs
      WHERE vehicle_id = v_vehicle_id
        AND status IN ('open', 'in_progress')
        AND id <> NEW.id
    ) INTO v_has_active_repair;

    IF NOT v_has_active_repair THEN
      UPDATE vehicles
      SET operational_status = 'available', updated_at = now()
      WHERE id = v_vehicle_id
        AND operational_status = 'maintenance';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_repairs_sync_vehicle_status ON repairs;
CREATE TRIGGER trg_repairs_sync_vehicle_status
  AFTER INSERT OR UPDATE OF status ON repairs
  FOR EACH ROW EXECUTE FUNCTION sync_vehicle_status_from_repair();
