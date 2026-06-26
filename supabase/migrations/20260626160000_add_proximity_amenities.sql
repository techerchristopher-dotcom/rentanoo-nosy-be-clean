ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS near_shopping_center boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS near_nightlife boolean NOT NULL DEFAULT false;
