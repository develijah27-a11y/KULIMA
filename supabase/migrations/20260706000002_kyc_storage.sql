-- Create the kyc-documents bucket that VerifyWizard uploads to.
-- The bucket is public so getPublicUrl() works for admin review links.
-- Uploads are gated by RLS: authenticated users may only write inside their
-- own user-id folder (the path starts with their auth.uid()).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Upload: user may only write to their own folder
DROP POLICY IF EXISTS "KYC upload own folder" ON storage.objects;
CREATE POLICY "KYC upload own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Upsert (replace existing file)
DROP POLICY IF EXISTS "KYC update own folder" ON storage.objects;
CREATE POLICY "KYC update own folder"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users may view their own docs; admins (service_role) can see all
DROP POLICY IF EXISTS "KYC read own folder" ON storage.objects;
CREATE POLICY "KYC read own folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
