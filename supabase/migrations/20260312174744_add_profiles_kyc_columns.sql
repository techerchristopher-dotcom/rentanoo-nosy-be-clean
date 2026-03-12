-- Add KYC and address columns to profiles table
-- These columns are used by Profile.tsx and ProfileService for onboarding/profile completion
-- All columns nullable for backward compatibility with existing users

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS birthdate DATE NULL,
ADD COLUMN IF NOT EXISTS place_of_birth TEXT NULL,
ADD COLUMN IF NOT EXISTS address_line1 TEXT NULL,
ADD COLUMN IF NOT EXISTS postal_code TEXT NULL,
ADD COLUMN IF NOT EXISTS city TEXT NULL,
ADD COLUMN IF NOT EXISTS country TEXT NULL,
ADD COLUMN IF NOT EXISTS driver_license_number TEXT NULL,
ADD COLUMN IF NOT EXISTS driver_license_issue_date DATE NULL,
ADD COLUMN IF NOT EXISTS driver_license_expiration_date DATE NULL,
ADD COLUMN IF NOT EXISTS driver_license_category TEXT NULL,
ADD COLUMN IF NOT EXISTS driver_license_country TEXT NULL,
ADD COLUMN IF NOT EXISTS driver_license_file_path TEXT NULL;

COMMENT ON COLUMN public.profiles.birthdate IS 'Date de naissance (KYC)';
COMMENT ON COLUMN public.profiles.place_of_birth IS 'Lieu de naissance (KYC)';
COMMENT ON COLUMN public.profiles.address_line1 IS 'Adresse ligne 1';
COMMENT ON COLUMN public.profiles.driver_license_number IS 'Numéro de permis';
COMMENT ON COLUMN public.profiles.driver_license_file_path IS 'URL du fichier permis uploadé';
