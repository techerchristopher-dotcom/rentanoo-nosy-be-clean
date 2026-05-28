-- Back-office Nosy Be: schema (vehicles extensions + fleet/workshop/stock tables + Phase 2 tables)

-- ---------------------------------------------------------------------------
-- 1. Extend vehicles for fleet management
-- ---------------------------------------------------------------------------

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS vehicle_type text NOT NULL DEFAULT 'car'
    CHECK (vehicle_type IN ('car', 'moto', 'scooter')),
  ADD COLUMN IF NOT EXISTS internal_code text,
  ADD COLUMN IF NOT EXISTS vin text,
  ADD COLUMN IF NOT EXISTS purchase_date date,
  ADD COLUMN IF NOT EXISTS purchase_price numeric(10, 2),
  ADD COLUMN IF NOT EXISTS operational_status text NOT NULL DEFAULT 'available'
    CHECK (operational_status IN (
      'available', 'rented', 'reserved', 'maintenance', 'broken', 'accident', 'retired'
    )),
  ADD COLUMN IF NOT EXISTS internal_notes text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'fuel_type'
  ) THEN
    ALTER TABLE vehicles ALTER COLUMN fuel_type DROP NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'transmission'
  ) THEN
    ALTER TABLE vehicles ALTER COLUMN transmission DROP NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'vehicles' AND column_name = 'seats'
  ) THEN
    ALTER TABLE vehicles ALTER COLUMN seats DROP NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_internal_code
  ON vehicles (internal_code) WHERE internal_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_type ON vehicles (vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_operational_status ON vehicles (operational_status);

CREATE OR REPLACE VIEW scooters AS
  SELECT * FROM vehicles WHERE vehicle_type = 'scooter';

-- ---------------------------------------------------------------------------
-- 2. Phase 2: suppliers (created before parts FK)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  city text,
  country text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. Repairs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS repairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles (id) ON DELETE RESTRICT,
  intervention_type text NOT NULL CHECK (intervention_type IN (
    'vidange', 'pneus', 'freins', 'batterie', 'moteur', 'courroie',
    'carrosserie', 'accident', 'diagnostic', 'autre'
  )),
  title text NOT NULL,
  description text,
  mileage_at_repair integer,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
  labor_cost numeric(10, 2) NOT NULL DEFAULT 0,
  parts_cost numeric(10, 2) NOT NULL DEFAULT 0,
  total_cost numeric(10, 2) GENERATED ALWAYS AS (COALESCE(labor_cost, 0) + COALESCE(parts_cost, 0)) STORED,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  notes text,
  created_by uuid REFERENCES profiles (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_repairs_vehicle_id ON repairs (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_repairs_status ON repairs (status);
CREATE INDEX IF NOT EXISTS idx_repairs_opened_at ON repairs (opened_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Parts catalog
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  category text,
  description text,
  unit text NOT NULL DEFAULT 'unité',
  quantity_on_hand integer NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  quantity_min integer NOT NULL DEFAULT 0,
  purchase_price numeric(10, 2),
  sale_price numeric(10, 2),
  location text,
  compatible_models text[] DEFAULT '{}',
  supplier_id uuid REFERENCES suppliers (id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parts_sku ON parts (sku);
CREATE INDEX IF NOT EXISTS idx_parts_category ON parts (category);
CREATE INDEX IF NOT EXISTS idx_parts_low_stock ON parts (quantity_on_hand, quantity_min)
  WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- 5. Phase 2: sales
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES profiles (id) ON DELETE SET NULL,
  customer_name text,
  sale_date timestamptz NOT NULL DEFAULT now(),
  subtotal numeric(10, 2) NOT NULL DEFAULT 0,
  discount numeric(10, 2) NOT NULL DEFAULT 0,
  total_amount numeric(10, 2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  payment_method text CHECK (payment_method IN ('cash', 'mobile_money', 'card', 'transfer')),
  amount_paid numeric(10, 2) NOT NULL DEFAULT 0,
  margin_total numeric(10, 2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES profiles (id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales (sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales (customer_id);

-- ---------------------------------------------------------------------------
-- 6. Stock movements (append-only ledger)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id uuid NOT NULL REFERENCES parts (id) ON DELETE RESTRICT,
  movement_type text NOT NULL CHECK (movement_type IN (
    'stock_in', 'internal_use', 'customer_sale', 'adjustment', 'return'
  )),
  quantity integer NOT NULL,
  unit_cost numeric(10, 2),
  unit_sale_price numeric(10, 2),
  reason text,
  repair_id uuid REFERENCES repairs (id) ON DELETE SET NULL,
  sale_id uuid REFERENCES sales (id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES suppliers (id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_part_created
  ON stock_movements (part_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_repair_id ON stock_movements (repair_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_sale_id ON stock_movements (sale_id);

-- ---------------------------------------------------------------------------
-- 7. Repair parts (lines consumed on repairs)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS repair_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id uuid NOT NULL REFERENCES repairs (id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES parts (id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_cost numeric(10, 2) NOT NULL,
  line_total numeric(10, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  stock_movement_id uuid REFERENCES stock_movements (id) ON DELETE SET NULL,
  client_request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (repair_id, part_id, client_request_id)
);

CREATE INDEX IF NOT EXISTS idx_repair_parts_repair_id ON repair_parts (repair_id);
CREATE INDEX IF NOT EXISTS idx_repair_parts_part_id ON repair_parts (part_id);

-- ---------------------------------------------------------------------------
-- 8. Vehicle states (inspection history)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS vehicle_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles (id) ON DELETE CASCADE,
  state_type text NOT NULL CHECK (state_type IN (
    'checkin', 'checkout', 'inspection', 'accident', 'repair_before', 'repair_after'
  )),
  state_date timestamptz NOT NULL DEFAULT now(),
  mileage integer,
  fuel_level numeric(5, 2),
  general_condition text,
  damages jsonb NOT NULL DEFAULT '[]'::jsonb,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  booking_id uuid REFERENCES bookings (id) ON DELETE SET NULL,
  repair_id uuid REFERENCES repairs (id) ON DELETE SET NULL,
  created_by uuid REFERENCES profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_states_vehicle_id ON vehicle_states (vehicle_id, state_date DESC);

-- ---------------------------------------------------------------------------
-- 9. Phase 2: sale lines
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sale_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES sales (id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES parts (id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_purchase_price numeric(10, 2) NOT NULL,
  unit_sale_price numeric(10, 2) NOT NULL,
  line_total numeric(10, 2) GENERATED ALWAYS AS (quantity * unit_sale_price) STORED,
  line_margin numeric(10, 2) GENERATED ALWAYS AS (
    (quantity * unit_sale_price) - (quantity * unit_purchase_price)
  ) STORED,
  stock_movement_id uuid REFERENCES stock_movements (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_lines_sale_id ON sale_lines (sale_id);

-- ---------------------------------------------------------------------------
-- 10. Phase 2: maintenance rules
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS maintenance_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles (id) ON DELETE CASCADE,
  model_filter text,
  maintenance_type text NOT NULL CHECK (maintenance_type IN (
    'vidange', 'pneus', 'freins', 'batterie', 'moteur', 'courroie',
    'carrosserie', 'accident', 'diagnostic', 'autre', 'assurance', 'documents'
  )),
  interval_km integer,
  interval_days integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_rules_vehicle_id ON maintenance_rules (vehicle_id);

-- ---------------------------------------------------------------------------
-- 11. updated_at triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_back_office_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_parts_updated_at ON parts;
CREATE TRIGGER trg_parts_updated_at
  BEFORE UPDATE ON parts
  FOR EACH ROW EXECUTE FUNCTION update_back_office_updated_at();

DROP TRIGGER IF EXISTS trg_repairs_updated_at ON repairs;
CREATE TRIGGER trg_repairs_updated_at
  BEFORE UPDATE ON repairs
  FOR EACH ROW EXECUTE FUNCTION update_back_office_updated_at();

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;
CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_back_office_updated_at();

DROP TRIGGER IF EXISTS trg_sales_updated_at ON sales;
CREATE TRIGGER trg_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_back_office_updated_at();

DROP TRIGGER IF EXISTS trg_maintenance_rules_updated_at ON maintenance_rules;
CREATE TRIGGER trg_maintenance_rules_updated_at
  BEFORE UPDATE ON maintenance_rules
  FOR EACH ROW EXECUTE FUNCTION update_back_office_updated_at();

-- ---------------------------------------------------------------------------
-- 12. Phase 2: staff_role on profiles
-- ---------------------------------------------------------------------------

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS staff_role text DEFAULT 'none'
    CHECK (staff_role IN ('none', 'admin', 'manager', 'mechanic', 'sales'));
