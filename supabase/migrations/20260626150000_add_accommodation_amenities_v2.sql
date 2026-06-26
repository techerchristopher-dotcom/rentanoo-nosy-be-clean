-- Add has_private_bathroom and has_security_guard columns to vehicles table
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS has_private_bathroom boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_security_guard boolean NOT NULL DEFAULT false;
