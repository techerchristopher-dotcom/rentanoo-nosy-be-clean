-- Admin panel: per-category service fees, configurable booking options
-- (catalog + category linking), and per-category deposit (caution) toggle.
--
-- Existing global values (platform_settings fee_*_percent, booking_transport_options)
-- are migrated into these new tables as the seed/default. The SQL functions
-- (get_fee_percent, sanitize_booking_selected_options) are NOT touched yet —
-- that's the next migration, once the admin UI can populate these tables.

CREATE TABLE IF NOT EXISTS service_fee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type text NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('card_online', 'cash_on_site')),
  fee_percent numeric NOT NULL CHECK (fee_percent BETWEEN 0 AND 1),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (vehicle_type, payment_method)
);

CREATE TABLE IF NOT EXISTS booking_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  price_mga numeric NOT NULL DEFAULT 0,
  pricing_mode text NOT NULL DEFAULT 'flat' CHECK (pricing_mode IN ('flat', 'per_day')),
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS booking_option_categories (
  option_id uuid NOT NULL REFERENCES booking_options(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL,
  PRIMARY KEY (option_id, vehicle_type)
);

CREATE TABLE IF NOT EXISTS deposit_category_rules (
  vehicle_type text PRIMARY KEY,
  deposit_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_fee_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_option_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_category_rules ENABLE ROW LEVEL SECURITY;

-- Lecture publique (le client doit voir options/frais/caution actifs),
-- écriture réservée au service_role (routes admin Express avec service key).
CREATE POLICY "public_read_service_fee_rules" ON service_fee_rules FOR SELECT USING (true);
CREATE POLICY "service_role_write_service_fee_rules" ON service_fee_rules FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "public_read_booking_options" ON booking_options FOR SELECT USING (true);
CREATE POLICY "service_role_write_booking_options" ON booking_options FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "public_read_booking_option_categories" ON booking_option_categories FOR SELECT USING (true);
CREATE POLICY "service_role_write_booking_option_categories" ON booking_option_categories FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "public_read_deposit_category_rules" ON deposit_category_rules FOR SELECT USING (true);
CREATE POLICY "service_role_write_deposit_category_rules" ON deposit_category_rules FOR ALL USING (auth.role() = 'service_role');

-- Seed: migre les valeurs globales actuelles vers chaque catégorie (même % partout pour l'instant)
INSERT INTO service_fee_rules (vehicle_type, payment_method, fee_percent)
SELECT vt, pm, pct
FROM (VALUES ('car'), ('moto'), ('scooter'), ('quad'), ('accommodation')) AS v(vt)
CROSS JOIN (VALUES ('card_online', 0.10), ('cash_on_site', 0.15)) AS p(pm, pct)
ON CONFLICT (vehicle_type, payment_method) DO NOTHING;

-- Seed: les 4 options plateforme existantes, prix actuels, liées aux catégories véhicules
-- (pas hébergement — transport aéroport/hôtel n'a pas de sens pour un logement)
INSERT INTO booking_options (option_key, name, description, price_mga, pricing_mode) VALUES
  ('platform-airport-pickup', 'Prise en charge à l''aéroport', 'Le véhicule vous est remis à l''aéroport de Nosy Be (Fascène)', 80000, 'flat'),
  ('platform-airport-return', 'Restitution à l''aéroport', 'Vous restituez le véhicule directement à l''aéroport de Nosy Be (Fascène)', 80000, 'flat'),
  ('platform-hotel-pickup', 'Prise en charge à l''hôtel', 'Le véhicule vous est livré directement à votre hôtel', 50000, 'flat'),
  ('platform-hotel-return', 'Restitution à l''hôtel', 'Vous restituez le véhicule directement à votre hôtel', 50000, 'flat')
ON CONFLICT (option_key) DO NOTHING;

INSERT INTO booking_option_categories (option_id, vehicle_type)
SELECT o.id, vt.vehicle_type
FROM booking_options o
CROSS JOIN (VALUES ('car'), ('moto'), ('scooter'), ('quad')) AS vt(vehicle_type)
WHERE o.option_key IN ('platform-airport-pickup', 'platform-airport-return', 'platform-hotel-pickup', 'platform-hotel-return')
ON CONFLICT DO NOTHING;

-- Seed: caution activée par défaut pour toutes les catégories (comportement actuel inchangé)
INSERT INTO deposit_category_rules (vehicle_type, deposit_enabled)
VALUES ('car', true), ('moto', true), ('scooter', true), ('quad', true), ('accommodation', true)
ON CONFLICT (vehicle_type) DO NOTHING;
