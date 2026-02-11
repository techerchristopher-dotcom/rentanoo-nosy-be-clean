-- Add welcome_email_sent_at column to profiles table
-- This column tracks when the welcome email was sent to prevent duplicates

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.profiles.welcome_email_sent_at IS 'Timestamp when the welcome email was sent (anti-doublon)';
