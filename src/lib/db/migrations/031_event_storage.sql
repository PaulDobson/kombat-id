-- Migration 031: Event Storage
-- Adds cover_image_path and attachments columns to martial_events
-- Creates RLS policies for the event-files storage bucket

-- 1. Extend martial_events with storage fields
ALTER TABLE martial_events
  ADD COLUMN IF NOT EXISTS cover_image_path  TEXT,
  ADD COLUMN IF NOT EXISTS attachments       JSONB NOT NULL DEFAULT '[]';

-- 2. Storage bucket RLS policies for event-files
-- Note: The bucket itself must be created via the setup script or Supabase dashboard.
-- These policies control access to objects inside the bucket.

-- Admins can upload files (INSERT)
CREATE POLICY "admin_upload_event_files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-files'
    AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Admins can update files (UPDATE)
CREATE POLICY "admin_update_event_files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'event-files'
    AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Admins can delete files (DELETE)
CREATE POLICY "admin_delete_event_files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-files'
    AND EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
  );

-- Authenticated users can read event files (for viewing events)
CREATE POLICY "authenticated_read_event_files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'event-files');

-- Public can read event files (for public event pages)
CREATE POLICY "public_read_event_files"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'event-files');
