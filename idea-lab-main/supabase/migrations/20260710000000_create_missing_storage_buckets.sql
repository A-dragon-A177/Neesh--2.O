-- ============================================================
-- Create and configure pitch-videos storage bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pitch-videos',
  'pitch-videos',
  true,
  5368709120, -- 5 GB limit
  NULL        -- NULL = allow all file types (no MIME restriction)
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5368709120,
  allowed_mime_types = NULL; -- Remove any MIME type restrictions

-- Drop ALL existing policies for pitch-videos to avoid conflicts
DROP POLICY IF EXISTS "Pitch videos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload pitch videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update pitch videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete pitch videos" ON storage.objects;
DROP POLICY IF EXISTS "pitch_videos_select" ON storage.objects;
DROP POLICY IF EXISTS "pitch_videos_insert" ON storage.objects;
DROP POLICY IF EXISTS "pitch_videos_update" ON storage.objects;
DROP POLICY IF EXISTS "pitch_videos_delete" ON storage.objects;

-- Allow anyone to read pitch videos (public)
CREATE POLICY "pitch_videos_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'pitch-videos');

-- Allow authenticated users to upload
CREATE POLICY "pitch_videos_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pitch-videos' AND auth.role() = 'authenticated');

-- Allow authenticated users to update
CREATE POLICY "pitch_videos_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pitch-videos' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete
CREATE POLICY "pitch_videos_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'pitch-videos' AND auth.role() = 'authenticated');

-- ============================================================
-- Create and configure blog-media storage bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-media',
  'blog-media',
  true,
  524288000, -- 500 MB limit
  NULL       -- NULL = allow all file types
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 524288000,
  allowed_mime_types = NULL;

-- Drop ALL existing policies for blog-media
DROP POLICY IF EXISTS "Blog media are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload blog media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update blog media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete blog media" ON storage.objects;
DROP POLICY IF EXISTS "blog_media_select" ON storage.objects;
DROP POLICY IF EXISTS "blog_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "blog_media_update" ON storage.objects;
DROP POLICY IF EXISTS "blog_media_delete" ON storage.objects;

-- Allow anyone to read blog media
CREATE POLICY "blog_media_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-media');

-- Allow authenticated users to upload
CREATE POLICY "blog_media_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'blog-media' AND auth.role() = 'authenticated');

-- Allow authenticated users to update
CREATE POLICY "blog_media_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'blog-media' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete
CREATE POLICY "blog_media_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'blog-media' AND auth.role() = 'authenticated');
