-- Script SQL pour dupliquer les buckets de storage et leurs policies
-- À exécuter dans le NOUVEAU projet Supabase (SQL Editor)
-- 
-- ⚠️ ATTENTION : Adaptez ce script selon vos buckets réels
-- Ce script est un template basé sur les buckets identifiés dans votre projet

-- ============================================
-- 1. CRÉER LES BUCKETS
-- ============================================

-- Bucket: avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,  -- Public bucket
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Bucket: driver-licenses
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-licenses',
  'driver-licenses',
  true,  -- Public bucket
  10485760,  -- 10MB
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

-- Bucket: checkin-photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'checkin-photos',
  'checkin-photos',
  true,  -- Public bucket (à vérifier selon votre config)
  10485760,  -- 10MB (à adapter)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- ============================================
-- 2. SUPPRIMER LES ANCIENNES POLICIES (si elles existent)
-- ============================================

-- Policies pour avatars
DROP POLICY IF EXISTS "avatars_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "avatars_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_policy" ON storage.objects;

-- Policies pour driver-licenses
DROP POLICY IF EXISTS "driver_licenses_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "driver_licenses_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "driver_licenses_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "driver_licenses_delete_policy" ON storage.objects;

-- Policies pour checkin-photos
DROP POLICY IF EXISTS "checkin_photos_upload_policy" ON storage.objects;
DROP POLICY IF EXISTS "checkin_photos_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "checkin_photos_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "checkin_photos_delete_policy" ON storage.objects;

-- ============================================
-- 3. CRÉER LES POLICIES POUR AVATARS
-- ============================================

-- Upload (INSERT) - Seuls les utilisateurs authentifiés peuvent uploader
CREATE POLICY "avatars_upload_policy" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND 
    auth.role() = 'authenticated'
  );

-- Lecture (SELECT) - Lecture publique des avatars
CREATE POLICY "avatars_select_policy" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Mise à jour (UPDATE) - Les utilisateurs peuvent modifier leurs propres avatars
CREATE POLICY "avatars_update_policy" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Suppression (DELETE) - Les utilisateurs peuvent supprimer leurs propres avatars
CREATE POLICY "avatars_delete_policy" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- 4. CRÉER LES POLICIES POUR DRIVER-LICENSES
-- ============================================

-- Upload (INSERT)
CREATE POLICY "driver_licenses_upload_policy" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'driver-licenses' AND 
    auth.role() = 'authenticated'
  );

-- Lecture (SELECT) - Lecture publique
CREATE POLICY "driver_licenses_select_policy" ON storage.objects
  FOR SELECT USING (bucket_id = 'driver-licenses');

-- Mise à jour (UPDATE)
CREATE POLICY "driver_licenses_update_policy" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'driver-licenses' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Suppression (DELETE)
CREATE POLICY "driver_licenses_delete_policy" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'driver-licenses' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- 5. CRÉER LES POLICIES POUR CHECKIN-PHOTOS
-- ============================================

-- Upload (INSERT) - Authentifiés uniquement
CREATE POLICY "checkin_photos_upload_policy" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'checkin-photos' AND 
    auth.role() = 'authenticated'
  );

-- Lecture (SELECT) - Lecture publique (à adapter si vous voulez restreindre)
CREATE POLICY "checkin_photos_select_policy" ON storage.objects
  FOR SELECT USING (bucket_id = 'checkin-photos');

-- Mise à jour (UPDATE) - Propriétaire uniquement
CREATE POLICY "checkin_photos_update_policy" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'checkin-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Suppression (DELETE) - Propriétaire uniquement
CREATE POLICY "checkin_photos_delete_policy" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'checkin-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================
-- 6. VÉRIFICATION
-- ============================================

-- Vérifier que les buckets sont créés
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('avatars', 'driver-licenses', 'checkin-photos')
ORDER BY id;

-- Vérifier que les policies sont créées
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%avatars%' 
     OR policyname LIKE '%driver_licenses%'
     OR policyname LIKE '%checkin_photos%'
ORDER BY policyname;
