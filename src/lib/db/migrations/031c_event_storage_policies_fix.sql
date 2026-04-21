-- ============================================================
-- Event Storage Policies Fix
-- Fixes "schema invalid or incompatible" error by using a
-- SECURITY DEFINER function to cross the storage schema boundary.
--
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1. Create a helper function in public schema with SECURITY DEFINER
--    so storage policies can safely query public.admin_users
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

-- 2. Drop existing policies (idempotent)
DROP POLICY IF EXISTS "admin_upload_event_files"       ON storage.objects;
DROP POLICY IF EXISTS "admin_update_event_files"       ON storage.objects;
DROP POLICY IF EXISTS "admin_delete_event_files"       ON storage.objects;
DROP POLICY IF EXISTS "authenticated_read_event_files" ON storage.objects;
DROP POLICY IF EXISTS "public_read_event_files"        ON storage.objects;

-- 3. Recreate policies using the helper function
CREATE POLICY "admin_upload_event_files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-files'
    AND public.is_admin()
  );

CREATE POLICY "admin_update_event_files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'event-files'
    AND public.is_admin()
  );

CREATE POLICY "admin_delete_event_files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-files'
    AND public.is_admin()
  );

CREATE POLICY "authenticated_read_event_files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'event-files');

CREATE POLICY "public_read_event_files"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'event-files');
