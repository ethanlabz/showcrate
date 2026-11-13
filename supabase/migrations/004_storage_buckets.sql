-- ============================================================
-- 004_storage_buckets.sql
-- Showcrate — Supabase Storage bucket configuration
-- Run after 001_initial_schema.sql
-- ============================================================

-- avatars bucket: user profile pictures
-- Public read, authenticated users can upload to their own folder
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,  -- public read
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- covers bucket: project cover images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers',
  'covers',
  TRUE,  -- public read
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- assets bucket: project documentation assets (images embedded in docs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  TRUE,  -- public read
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE RLS POLICIES
-- Folder convention:
--   avatars/{user_id}/avatar.*
--   covers/{project_id}/cover.*
--   assets/{project_id}/{filename}
-- ============================================================

-- avatars: authenticated users upload to their own folder only
CREATE POLICY "avatars: owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars: owner update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "avatars: owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- covers: only project owner can upload
CREATE POLICY "covers: owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'covers'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "covers: owner update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'covers'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "covers: owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'covers'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.owner_id = auth.uid()
    )
  );

-- assets: only project owner can upload
CREATE POLICY "assets: owner upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'assets'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "assets: writer delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'assets'
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND p.owner_id = auth.uid()
    )
  );
