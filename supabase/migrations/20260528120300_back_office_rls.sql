-- Back-office Nosy Be: RLS policies

-- Enable RLS on all back-office tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_rules ENABLE ROW LEVEL SECURITY;

-- MVP: admin full access
CREATE POLICY suppliers_admin_all ON suppliers
  FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY parts_admin_all ON parts
  FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY stock_movements_admin_all ON stock_movements
  FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY repairs_admin_all ON repairs
  FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY repair_parts_admin_all ON repair_parts
  FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY vehicle_states_admin_all ON vehicle_states
  FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY sales_admin_all ON sales
  FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY sale_lines_admin_all ON sale_lines
  FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY maintenance_rules_admin_all ON maintenance_rules
  FOR ALL TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

-- Phase 2: staff_role based policies (additive read for non-admin staff)
CREATE OR REPLACE FUNCTION has_staff_role(roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_admin_user()
    OR COALESCE(
      (SELECT staff_role = ANY(roles) FROM profiles WHERE id = auth.uid()),
      false
    );
$$;

-- Mechanic: read scooters, create/update repairs and vehicle states
CREATE POLICY repairs_mechanic_select ON repairs
  FOR SELECT TO authenticated
  USING (has_staff_role(ARRAY['manager', 'mechanic']));

CREATE POLICY repairs_mechanic_insert ON repairs
  FOR INSERT TO authenticated
  WITH CHECK (has_staff_role(ARRAY['manager', 'mechanic']));

CREATE POLICY repairs_mechanic_update ON repairs
  FOR UPDATE TO authenticated
  USING (has_staff_role(ARRAY['manager', 'mechanic']))
  WITH CHECK (has_staff_role(ARRAY['manager', 'mechanic']));

CREATE POLICY vehicle_states_mechanic_all ON vehicle_states
  FOR ALL TO authenticated
  USING (has_staff_role(ARRAY['manager', 'mechanic']))
  WITH CHECK (has_staff_role(ARRAY['manager', 'mechanic']));

CREATE POLICY parts_mechanic_select ON parts
  FOR SELECT TO authenticated
  USING (has_staff_role(ARRAY['manager', 'mechanic', 'sales']));

-- Sales: read parts, manage sales
CREATE POLICY sales_staff_select ON sales
  FOR SELECT TO authenticated
  USING (has_staff_role(ARRAY['manager', 'sales']));

CREATE POLICY sales_staff_insert ON sales
  FOR INSERT TO authenticated
  WITH CHECK (has_staff_role(ARRAY['manager', 'sales']));

CREATE POLICY sales_staff_update ON sales
  FOR UPDATE TO authenticated
  USING (has_staff_role(ARRAY['manager', 'sales']))
  WITH CHECK (has_staff_role(ARRAY['manager', 'sales']));

CREATE POLICY sale_lines_staff_all ON sale_lines
  FOR ALL TO authenticated
  USING (has_staff_role(ARRAY['manager', 'sales']))
  WITH CHECK (has_staff_role(ARRAY['manager', 'sales']));

GRANT EXECUTE ON FUNCTION has_staff_role(text[]) TO authenticated;
