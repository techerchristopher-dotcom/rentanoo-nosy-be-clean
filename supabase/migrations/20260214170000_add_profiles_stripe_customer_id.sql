-- Add stripe_customer_id column to profiles table
-- Phase 3.2.1: Stripe Customer ID for SetupIntent (deposit/caution flow)

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

COMMENT ON COLUMN public.profiles.stripe_customer_id IS 'ID Stripe Customer (cus_xxx) pour paiements off_session et SetupIntent caution.';
