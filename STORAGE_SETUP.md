# Supabase Storage Setup Instructions

## Quick Setup (2 minutes)

### ⚠️ Use Supabase Dashboard (CLI won't work for storage)

Storage policies require dashboard access due to permission restrictions.

1. Go to your Supabase project: https://supabase.com/dashboard/project/YOUR_PROJECT_ID

2. Navigate to **SQL Editor** in the left sidebar

3. Copy and paste this SQL:

```sql
-- Create storage bucket for disease images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'disease-images', 
  'disease-images', 
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload images
CREATE POLICY "Users can upload disease images" 
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'disease-images');

-- Policy: Public can view images
CREATE POLICY "Public can view disease images" 
ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'disease-images');

-- Policy: Users can delete own images
CREATE POLICY "Users can delete own images" 
ON storage.objects
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'disease-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

4. Click **RUN** button

5. Verify by going to **Storage** in sidebar - you should see `disease-images` bucket

## Verification

After running the migration, verify it worked:

### Check in Supabase Dashboard:
1. Go to **Storage** in left sidebar
2. You should see `disease-images` bucket
3. Click on it - it should be empty but accessible

### Test Upload:
```bash
# Run your app
npm run dev

# Go to disease detection page
# Try uploading an image
# Should work without errors
```

## Troubleshooting

### Error: "Bucket already exists"
This is fine - it means the bucket was already created. The migration uses `ON CONFLICT DO NOTHING` to handle this.

### Error: "Permission denied for storage.objects"
Run this SQL to fix:
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

### Error: "Could not upload file"
Check your .env.local file has:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Storage Limits

- **File Size**: 10MB per image (configurable)
- **File Types**: JPEG, PNG, WebP only
- **Organization**: Files stored as `{userId}/{timestamp}-{random}.{ext}`

## Security

- ✅ Public read access (anyone can view images)
- ✅ Authenticated write (only logged-in users can upload)
- ✅ Owner-only delete (users can only delete their own images)
- ✅ File size limits enforced
- ✅ MIME type restrictions enforced

## Next Steps

After storage is configured:
1. ✅ Test image upload on disease detection page
2. ✅ Verify images appear in Supabase Storage dashboard
3. ✅ Test image display in the UI
4. ✅ Ready for production!
