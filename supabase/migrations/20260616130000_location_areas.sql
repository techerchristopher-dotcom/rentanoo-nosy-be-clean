-- Entité LocationArea : quartiers Nosy Be réutilisables (hébergements, SEO, filtres)

CREATE TABLE IF NOT EXISTS public.location_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT location_areas_name_unique UNIQUE (name),
  CONSTRAINT location_areas_slug_unique UNIQUE (slug)
);

COMMENT ON TABLE public.location_areas IS
  'Quartiers / zones géographiques Nosy Be. Source de vérité pour hébergements, SEO et filtres.';

ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS location_area_id UUID NULL
  REFERENCES public.location_areas(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_location_area_id
  ON public.vehicles (location_area_id)
  WHERE location_area_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_location_areas_active_slug
  ON public.location_areas (slug)
  WHERE active = true;

DROP TRIGGER IF EXISTS trg_location_areas_updated_at ON public.location_areas;
CREATE TRIGGER trg_location_areas_updated_at
  BEFORE UPDATE ON public.location_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed quartiers initiaux
INSERT INTO public.location_areas (name, slug) VALUES
  ('Ambatoloaka', 'ambatoloaka'),
  ('Madirokely', 'madirokely'),
  ('Andilana', 'andilana'),
  ('Ambondrona', 'ambondrona'),
  ('Hell-Ville', 'hell-ville'),
  ('Dzamandzar', 'dzamandzar'),
  ('Fascène', 'fascene'),
  ('Palm Beach', 'palm-beach'),
  ('Dar Es Salam', 'dar-es-salam')
ON CONFLICT (slug) DO NOTHING;

-- Backfill hébergements Ambatoloaka (model / description)
UPDATE public.vehicles v
SET location_area_id = la.id
FROM public.location_areas la
WHERE la.slug = 'ambatoloaka'
  AND v.location_area_id IS NULL
  AND v.vehicle_type = 'accommodation'
  AND (
    v.model ILIKE '%ambatoloaka%'
    OR v.description ILIKE '%ambatoloaka%'
  );

UPDATE public.vehicles v
SET location_area_id = la.id
FROM public.location_areas la
WHERE la.slug = 'ambatoloaka'
  AND v.location_area_id IS NULL
  AND v.id IN (
    '285a520f-7f23-448b-9558-c37d7fe2a889',
    '54b3eae6-d4d6-43f7-8e8f-12e411f4f168'
  );

-- Hébergement publié : quartier obligatoire
ALTER TABLE public.vehicles
  DROP CONSTRAINT IF EXISTS vehicles_accommodation_location_area_required;

ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_accommodation_location_area_required
  CHECK (
    vehicle_type IS DISTINCT FROM 'accommodation'
    OR available IS NOT TRUE
    OR location_area_id IS NOT NULL
  );

ALTER TABLE public.location_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS location_areas_select_active ON public.location_areas;
CREATE POLICY location_areas_select_active
  ON public.location_areas
  FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS location_areas_insert_authenticated ON public.location_areas;
CREATE POLICY location_areas_insert_authenticated
  ON public.location_areas
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS location_areas_update_admin ON public.location_areas;
CREATE POLICY location_areas_update_admin
  ON public.location_areas
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin IS TRUE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin IS TRUE
    )
  );

COMMENT ON COLUMN public.vehicles.location_area_id IS
  'Quartier Nosy Be (FK location_areas). Obligatoire pour hébergements disponibles.';
