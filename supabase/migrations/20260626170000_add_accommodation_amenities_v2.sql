ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS has_equipped_kitchen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_solar_panel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_housekeeper boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_laundry boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_remote_work boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_canal_plus boolean NOT NULL DEFAULT false;
