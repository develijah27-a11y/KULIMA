-- The kyc-documents bucket enforced a 5 MB file_size_limit while the
-- VerifyWizard UI told users "max 10 MB" right on the upload button — a
-- scanned business-registration certificate is exactly the kind of file
-- likely to land in that 5-10 MB gap and get silently rejected by Supabase
-- Storage. allowed_mime_types also omitted image/heic and image/heif, the
-- default photo format on iPhone, despite the file input accepting
-- "image/*" — an iPhone user picking a camera-roll photo could easily
-- select a HEIC file the bucket would then reject.
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']
WHERE id = 'kyc-documents';
