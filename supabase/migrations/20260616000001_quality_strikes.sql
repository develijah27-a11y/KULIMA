-- ============================================================================
-- Cropify — Quality Strikes, Farmer Suspension & Support Escalation Enhancements
-- Safe to re-run (IF NOT EXISTS / IF EXISTS guards throughout)
-- ============================================================================

-- 1. Add suspension & quality strike tracking to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS quality_strikes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_suspended ON profiles(is_suspended) WHERE is_suspended = TRUE;

-- 2. Update fraud_flags reason constraint to include 'poor_quality_produce'
DO $$
BEGIN
  -- Drop existing reason check constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fraud_flags_reason_check' AND conrelid = 'fraud_flags'::regclass
  ) THEN
    ALTER TABLE fraud_flags DROP CONSTRAINT fraud_flags_reason_check;
  END IF;

  -- Add updated check constraint with poor_quality_produce
  ALTER TABLE fraud_flags ADD CONSTRAINT fraud_flags_reason_check
    CHECK (reason IN ('fake_listing','price_manipulation','identity_fraud','payment_fraud','spam','poor_quality_produce','other'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3. Add order_id to support_tickets if missing
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS respondent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_order ON support_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_respondent ON support_tickets(respondent_id);
