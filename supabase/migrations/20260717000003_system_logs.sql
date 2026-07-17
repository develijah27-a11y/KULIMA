-- ============================================================================
-- KULIMA — System Logs (operational observability)
-- Distinct from audit_logs (business action trail: who approved/rejected what).
-- This table is for *system health after launch*: uncaught errors, API
-- request/latency traces on critical routes, failed payment attempts, and
-- authentication failures — so a break in production shows up here instead
-- of only in Vercel's own logs. Insert-only from the service-role client
-- (see src/lib/system-log.ts); admins can read it from /admin/logs.
-- Safe to re-run.
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_logs (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category    TEXT        NOT NULL,   -- api_request | error | failed_payment | auth_failure | performance
  level       TEXT        NOT NULL DEFAULT 'info', -- info | warn | error
  route       TEXT,                   -- e.g. /api/wallet/withdraw
  method      TEXT,                   -- GET | POST | ...
  status_code INTEGER,
  duration_ms INTEGER,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  message     TEXT        NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_system_logs" ON system_logs;
CREATE POLICY "admin_read_system_logs" ON system_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
  ));

CREATE INDEX IF NOT EXISTS idx_system_logs_created  ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level    ON system_logs(level) WHERE level = 'error';
CREATE INDEX IF NOT EXISTS idx_system_logs_route    ON system_logs(route);
CREATE INDEX IF NOT EXISTS idx_system_logs_user      ON system_logs(user_id);

GRANT ALL ON system_logs TO service_role;

-- Keep this table from growing unbounded — 30-day retention, callable by the
-- daily cron (add a call to this from an existing cron route rather than
-- provisioning a new pg_cron job the project doesn't otherwise use).
CREATE OR REPLACE FUNCTION prune_system_logs()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM system_logs WHERE created_at < NOW() - INTERVAL '30 days';
$$;

GRANT EXECUTE ON FUNCTION prune_system_logs() TO service_role;
