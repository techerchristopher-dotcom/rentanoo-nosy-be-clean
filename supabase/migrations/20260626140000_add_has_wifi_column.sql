-- Add has_wifi column to vehicles table for accommodation amenities
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS has_wifi boolean NOT NULL DEFAULT false;
