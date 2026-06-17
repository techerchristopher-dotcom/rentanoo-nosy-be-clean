-- Multi-booking cart feature
-- Adds a grouping id on bookings so several independent reservations submitted
-- together (different vehicles/accommodations, different date ranges) can be
-- traced back to a single client cart submission.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cart_group_id uuid;
CREATE INDEX IF NOT EXISTS idx_bookings_cart_group_id ON bookings(cart_group_id);

CREATE TABLE IF NOT EXISTS cart_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_group_id uuid NOT NULL,
  client_user_id uuid REFERENCES auth.users(id),
  client_name text,
  client_email text,
  client_phone text,
  items_count int NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cart_submissions_cart_group_id ON cart_submissions(cart_group_id);
CREATE INDEX IF NOT EXISTS idx_cart_submissions_client_user_id ON cart_submissions(client_user_id);

ALTER TABLE cart_submissions ENABLE ROW LEVEL SECURITY;

-- Client can read their own cart submissions
CREATE POLICY "users_can_view_own_cart_submissions" ON cart_submissions
  FOR SELECT USING (auth.uid() = client_user_id);

-- Service role (server-side insert via RPC/edge function) has full access
CREATE POLICY "service_role_full_access_cart_submissions" ON cart_submissions
  FOR ALL USING (auth.role() = 'service_role');
