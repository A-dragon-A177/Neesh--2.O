-- ============================================================
-- SECURITY FIX: Scope storage policies to user-owned paths
-- and restrict allowed MIME types
-- ============================================================

-- ============================================================
-- pitch-videos bucket: restrict MIME types + owner-scoped writes
-- ============================================================

-- Update MIME type restrictions
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'audio/mpeg', 'audio/wav', 'audio/ogg'
]
WHERE id = 'pitch-videos';

-- Drop existing overly-permissive policies
DROP POLICY IF EXISTS "pitch_videos_insert" ON storage.objects;
DROP POLICY IF EXISTS "pitch_videos_update" ON storage.objects;
DROP POLICY IF EXISTS "pitch_videos_delete" ON storage.objects;

-- Recreate with owner-scoped path restrictions
-- Users can only upload to their own folder: {user_id}/...
CREATE POLICY "pitch_videos_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'pitch-videos'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only update their own files
CREATE POLICY "pitch_videos_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'pitch-videos'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can only delete their own files
CREATE POLICY "pitch_videos_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'pitch-videos'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- blog-media bucket: restrict MIME types + owner-scoped writes
-- ============================================================

-- Update MIME type restrictions
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml',
  'video/mp4', 'video/webm',
  'application/pdf'
]
WHERE id = 'blog-media';

-- Drop existing overly-permissive policies
DROP POLICY IF EXISTS "blog_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "blog_media_update" ON storage.objects;
DROP POLICY IF EXISTS "blog_media_delete" ON storage.objects;

-- Recreate with owner-scoped path restrictions
CREATE POLICY "blog_media_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blog-media'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "blog_media_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'blog-media'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "blog_media_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blog-media'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
