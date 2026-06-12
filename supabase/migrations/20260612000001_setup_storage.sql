-- =====================================================
-- Supabase Storage Configuration for Disease Images
-- =====================================================
-- This migration sets up storage bucket for disease detection images
-- with proper RLS policies for security
-- =====================================================

-- Create storage bucket for disease images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'disease-images', 
  'disease-images', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Users can upload disease images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view disease images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;

-- =====================================================
-- RLS Policies for Disease Images Bucket
-- =====================================================

-- Policy 1: Authenticated users can upload images
CREATE POLICY "Users can upload disease images" 
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'disease-images'
);

-- Policy 2: Public can view all images (needed for disease detection UI)
CREATE POLICY "Public can view disease images" 
ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'disease-images');

-- Policy 3: Users can delete their own images
-- Images are organized by farm_id, so we check the path
CREATE POLICY "Users can delete own images" 
ON storage.objects
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'disease-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Users can update their own images
CREATE POLICY "Users can update own images" 
ON storage.objects
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'disease-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to get file size in MB
CREATE OR REPLACE FUNCTION storage.get_file_size_mb(file_path text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  file_size bigint;
BEGIN
  SELECT metadata->>'size' INTO file_size
  FROM storage.objects
  WHERE name = file_path;
  
  RETURN ROUND((file_size / 1024.0 / 1024.0)::numeric, 2);
END;
$$;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE storage.buckets IS 'Storage buckets for uploaded files';
COMMENT ON COLUMN storage.buckets.file_size_limit IS 'Maximum file size in bytes (10MB for disease images)';
COMMENT ON COLUMN storage.buckets.allowed_mime_types IS 'Allowed file types for upload';

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the bucket was created:
-- SELECT * FROM storage.buckets WHERE id = 'disease-images';

-- =====================================================
-- Rollback Instructions
-- =====================================================
-- To rollback this migration, run:
-- DELETE FROM storage.buckets WHERE id = 'disease-images';
-- DROP POLICY IF EXISTS "Users can upload disease images" ON storage.objects;
-- DROP POLICY IF EXISTS "Public can view disease images" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
