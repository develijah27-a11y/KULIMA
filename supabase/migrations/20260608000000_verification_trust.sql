-- ============================================================================
-- VERIFICATION & TRUST SYSTEM
-- Run in Supabase SQL Editor
-- ============================================================================

-- 1. Extend profiles with verification + trust columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verification_level TEXT NOT NULL DEFAULT 'grey'
    CHECK (verification_level IN ('grey', 'green', 'blue', 'gold')),
  ADD COLUMN IF NOT EXISTS trust_score INTEGER NOT NULL DEFAULT 50
    CHECK (trust_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS reliability_score INTEGER NOT NULL DEFAULT 50
    CHECK (reliability_score BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS completed_deals INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispute_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_verification_level ON profiles(verification_level);

-- 2. Verifications table
CREATE TABLE IF NOT EXISTS verifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  level           TEXT NOT NULL CHECK (level IN ('green', 'blue', 'gold')),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  role            TEXT NOT NULL,
  national_id_url TEXT,
  selfie_url      TEXT,
  business_reg_url TEXT,
  driving_permit_url TEXT,
  vehicle_reg_url TEXT,
  qualifications_url TEXT,
  rejection_reason TEXT,
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

-- Users see their own verifications
CREATE POLICY "users_view_own_verifications"
  ON verifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users_insert_own_verifications"
  ON verifications FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins see and update all
CREATE POLICY "admins_view_all_verifications"
  ON verifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "admins_update_verifications"
  ON verifications FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE INDEX IF NOT EXISTS idx_verifications_user_id  ON verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status   ON verifications(status);
CREATE INDEX IF NOT EXISTS idx_verifications_level    ON verifications(level);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_verifications_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_verifications_updated_at ON verifications;
CREATE TRIGGER trg_verifications_updated_at
  BEFORE UPDATE ON verifications
  FOR EACH ROW EXECUTE FUNCTION update_verifications_updated_at();

-- 3. Storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to their own folder
CREATE POLICY "kyc_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Authenticated users can view their own documents
CREATE POLICY "kyc_read_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admins can read all KYC documents
CREATE POLICY "kyc_admin_read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
