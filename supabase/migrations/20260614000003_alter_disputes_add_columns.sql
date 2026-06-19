-- ============================================================================
-- KULIMA — Add missing columns to existing disputes table
-- The disputes table was created earlier with a different schema.
-- This migration adds the columns the admin pages expect.
-- Safe to re-run (ADD COLUMN IF NOT EXISTS throughout).
-- ============================================================================

-- Add columns the admin page queries for
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS complainant_id  UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS respondent_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS reason          TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS description     TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolution      TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS admin_notes     TEXT;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolved_at     TIMESTAMPTZ;

-- Ensure status column exists with correct constraint
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
ALTER TABLE disputes DROP CONSTRAINT IF EXISTS disputes_status_check;
ALTER TABLE disputes ADD CONSTRAINT disputes_status_check
  CHECK (status IN ('open','under_review','resolved','closed'));

-- RLS (add if not already present)
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_create_dispute"   ON disputes;
DROP POLICY IF EXISTS "complainant_view_own"  ON disputes;
DROP POLICY IF EXISTS "respondent_view_own"   ON disputes;
DROP POLICY IF EXISTS "admin_all_disputes"    ON disputes;

CREATE POLICY "user_create_dispute" ON disputes FOR INSERT
  WITH CHECK (complainant_id = (SELECT auth.uid()));

CREATE POLICY "complainant_view_own" ON disputes FOR SELECT
  USING (complainant_id = (SELECT auth.uid()));

CREATE POLICY "respondent_view_own" ON disputes FOR SELECT
  USING (respondent_id  = (SELECT auth.uid()));

CREATE POLICY "admin_all_disputes" ON disputes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_disputes_status      ON disputes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_complainant ON disputes(complainant_id);
CREATE INDEX IF NOT EXISTS idx_disputes_respondent  ON disputes(respondent_id);

GRANT ALL ON disputes TO service_role;
