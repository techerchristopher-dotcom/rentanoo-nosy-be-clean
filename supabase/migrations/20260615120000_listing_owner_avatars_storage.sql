-- Storage: avatars/logos des propriétaires affichés (listing_owners.avatar_url)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-owner-avatars',
  'listing-owner-avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Lecture publique (fiche annonce)
DROP POLICY IF EXISTS "listing_owner_avatars_public_read" ON storage.objects;
CREATE POLICY "listing_owner_avatars_public_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'listing-owner-avatars');

-- Upload : propriétaire du véhicule lié ou admin
DROP POLICY IF EXISTS "listing_owner_avatars_insert_owner" ON storage.objects;
CREATE POLICY "listing_owner_avatars_insert_owner"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-owner-avatars'
    AND (
      EXISTS (
        SELECT 1
        FROM public.vehicles v
        WHERE v.listing_owner_id = (storage.foldername(name))[1]::uuid
          AND v.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_admin IS TRUE
      )
    )
  );

DROP POLICY IF EXISTS "listing_owner_avatars_update_owner" ON storage.objects;
CREATE POLICY "listing_owner_avatars_update_owner"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listing-owner-avatars'
    AND (
      EXISTS (
        SELECT 1
        FROM public.vehicles v
        WHERE v.listing_owner_id = (storage.foldername(name))[1]::uuid
          AND v.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_admin IS TRUE
      )
    )
  )
  WITH CHECK (
    bucket_id = 'listing-owner-avatars'
    AND (
      EXISTS (
        SELECT 1
        FROM public.vehicles v
        WHERE v.listing_owner_id = (storage.foldername(name))[1]::uuid
          AND v.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_admin IS TRUE
      )
    )
  );

DROP POLICY IF EXISTS "listing_owner_avatars_delete_owner" ON storage.objects;
CREATE POLICY "listing_owner_avatars_delete_owner"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-owner-avatars'
    AND (
      EXISTS (
        SELECT 1
        FROM public.vehicles v
        WHERE v.listing_owner_id = (storage.foldername(name))[1]::uuid
          AND v.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.is_admin IS TRUE
      )
    )
  );
