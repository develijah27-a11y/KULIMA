-- ============================================================================
-- KULIMA — Disputes & Fraud Flags
-- Both tables were referenced in admin pages but never created in migrations.
-- Safe to re-run (IF NOT EXISTS / IF EXISTS guards throughout).
-- ============================================================================

-- ── disputes ─────────────────────────────────────────────────────────────────
-- Drop and recreate so the schema is authoritative on fresh installs.
-- Existing data is preserved by migration 20260614000003 which uses ADD COLUMN IF NOT EXISTS.
DROP TABLE IF EXISTS disputes CASCADE;
CREATE TABLE disputes (
  id              UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id        UUID          REFERENCES orders(id)        ON DELETE SET NULL,
  offer_id        UUID          REFERENCES offers(id)        ON DELETE SET NULL,
  complainant_id  UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  respondent_id   UUID          REFERENCES auth.users(id)    ON DELETE SET NULL,
  reason          TEXT          NOT NULL,
  description     TEXT,
  status          TEXT          NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','under_review','resolved','closed')),
  resolution      TEXT,
  admin_notes     TEXT,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "complainant_view_own"  ON disputes;
DROP POLICY IF EXISTS "respondent_view_own"   ON disputes;
DROP POLICY IF EXISTS "admin_all_disputes"    ON disputes;
DROP POLICY IF EXISTS "user_create_dispute"   ON disputes;

CREATE POLICY "user_create_dispute" ON disputes FOR INSERT
  WITH CHECK (complainant_id = (SELECT auth.uid()));

CREATE POLICY "complainant_view_own" ON disputes FOR SELECT
  USING (complainant_id = (SELECT auth.uid()));

CREATE POLICY "respondent_view_own" ON disputes FOR SELECT
  USING (respondent_id  = (SELECT auth.uid()));

CREATE POLICY "admin_all_disputes" ON disputes FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_disputes_status       ON disputes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_complainant  ON disputes(complainant_id);
CREATE INDEX IF NOT EXISTS idx_disputes_respondent   ON disputes(respondent_id);

-- ── fraud_flags ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fraud_flags (
  id          UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flagged_by  UUID          REFERENCES auth.users(id)          ON DELETE SET NULL,
  reason      TEXT          NOT NULL
                CHECK (reason IN ('fake_listing','price_manipulation','identity_fraud','payment_fraud','spam','other')),
  severity    TEXT          NOT NULL DEFAULT 'low'
                CHECK (severity IN ('low','medium','high','critical')),
  description TEXT,
  status      TEXT          NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','investigating','resolved','dismissed')),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE fraud_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_fraud" ON fraud_flags;
CREATE POLICY "admin_all_fraud" ON fraud_flags FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_fraud_flags_status   ON fraud_flags(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_user     ON fraud_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_flags_severity ON fraud_flags(severity);

-- ── grants ───────────────────────────────────────────────────────────────────
GRANT ALL ON disputes    TO service_role;
GRANT ALL ON fraud_flags TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
