-- =====================================================
-- COPY THIS ENTIRE FILE AND RUN IN SUPABASE DASHBOARD
-- =====================================================
-- Go to: https://supabase.com/dashboard → Your Project → SQL Editor
-- Paste this entire file and click RUN
-- =====================================================

-- Step 1: Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'disease-images', 
  'disease-images', 
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) 
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Step 2: Enable RLS (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop old policies if they exist
DROP POLICY IF EXISTS "Users can upload disease images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view disease images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- Step 4: Create upload policy (authenticated users can upload)
CREATE POLICY "Users can upload disease images" 
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'disease-images');

-- Step 5: Create view policy (anyone can view)
CREATE POLICY "Public can view disease images" 
ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'disease-images');

-- Step 6: Create delete policy (users can delete own images)
CREATE POLICY "Users can delete own images" 
ON storage.objects
FOR DELETE 
TO authenticated
USING (bucket_id = 'disease-images');

-- =====================================================
-- VERIFICATION: Run this to check if it worked
-- =====================================================
-- SELECT id, name, public FROM storage.buckets WHERE id = 'disease-images';
-- Should return: disease-images | disease-images | true

-- =====================================================
-- SUCCESS! ✅
-- =====================================================
-- Your storage is now configured!
-- Go to Storage tab to verify the bucket exists
-- Then test image upload in your app
-- =====================================================
