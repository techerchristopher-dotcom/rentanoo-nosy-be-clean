-- Prélèvements admin sur la caution (traçabilité + plafond contractuel côté app)
-- RLS activé sans policy : accès direct client refusé ; service_role (API Express) bypass.

CREATE TABLE IF NOT EXISTS public.booking_claim_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings (id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'eur',
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  failure_code TEXT,
  failure_message TEXT,
  created_by_profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  receipt_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS booking_claim_charges_booking_id_idx
  ON public.booking_claim_charges (booking_id);

CREATE UNIQUE INDEX IF NOT EXISTS booking_claim_charges_stripe_pi_unique
  ON public.booking_claim_charges (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

COMMENT ON TABLE public.booking_claim_charges IS 'Historique des prélèvements sur caution initiés par admin (Stripe off_session).';

ALTER TABLE public.booking_claim_charges ENABLE ROW LEVEL SECURITY;
