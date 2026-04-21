-- ============================================================
-- Event Storage Policies
-- Run this directly in the Supabase SQL Editor
-- Safe to re-run (drops existing policies before recreating)
-- ============================================================

DO $$
BEGIN

  -- Drop existing policies if they exist (idempotent)
  DROP POLICY IF EXISTS "admin_upload_event_files"          ON storage.objects;
  DROP POLICY IF EXISTS "admin_update_event_files"          ON storage.objects;
  DROP POLICY IF EXISTS "admin_delete_event_files"          ON storage.objects;
  DROP POLICY IF EXISTS "authenticated_read_event_files"    ON storage.objects;
  DROP POLICY IF EXISTS "public_read_event_files"           ON storage.objects;

  -- Admins can upload files
  CREATE POLICY "admin_upload_event_files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'event-files'
      AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
    );

  -- Admins can update files
  CREATE POLICY "admin_update_event_files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'event-files'
      AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
    );

  -- Admins can delete files
  CREATE POLICY "admin_delete_event_files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'event-files'
      AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
    );

  -- Authenticated users can read event files
  CREATE POLICY "authenticated_read_event_files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'event-files');

  -- Public (anon) can read event files
  CREATE POLICY "public_read_event_files"
    ON storage.objects FOR SELECT
    TO anon
    USING (bucket_id = 'event-files');

END $$;
