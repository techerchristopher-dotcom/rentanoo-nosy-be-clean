-- MVP: propriétaire affiché publiquement (distinct de vehicles.owner_id / profiles)

CREATE TABLE IF NOT EXISTS public.listing_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  owner_type TEXT NOT NULL DEFAULT 'individual'
    CHECK (owner_type IN ('individual', 'agency', 'residence', 'platform_managed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS listing_owner_id UUID
  REFERENCES public.listing_owners(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_listing_owner_id
  ON public.vehicles (listing_owner_id)
  WHERE listing_owner_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_listing_owners_updated_at ON public.listing_owners;
CREATE TRIGGER trg_listing_owners_updated_at
  BEFORE UPDATE ON public.listing_owners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.listing_owners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listing_owners_select_public ON public.listing_owners;
CREATE POLICY listing_owners_select_public
  ON public.listing_owners
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS listing_owners_insert_authenticated ON public.listing_owners;
CREATE POLICY listing_owners_insert_authenticated
  ON public.listing_owners
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS listing_owners_update_owner ON public.listing_owners;
CREATE POLICY listing_owners_update_owner
  ON public.listing_owners
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.vehicles v
      WHERE v.listing_owner_id = listing_owners.id
        AND v.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_admin IS TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.vehicles v
      WHERE v.listing_owner_id = listing_owners.id
        AND v.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.is_admin IS TRUE
    )
  );

COMMENT ON TABLE public.listing_owners IS 'Identité publique affichée sur une annonce (distinct du compte vehicles.owner_id).';
COMMENT ON COLUMN public.vehicles.listing_owner_id IS 'Propriétaire affiché sur la fiche publique ; NULL = fallback profiles via owner_id.';
