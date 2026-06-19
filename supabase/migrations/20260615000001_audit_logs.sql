-- ============================================================================
-- KULIMA — Audit Logs
-- Creates audit_logs table + trigger function that auto-fires on key tables.
-- Safe to re-run.
-- ============================================================================

-- ── table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action        TEXT        NOT NULL,          -- create | update | delete | approve | reject | login | suspend
  resource_type TEXT        NOT NULL,          -- profiles | listings | offers | verifications | …
  resource_id   UUID,
  metadata      JSONB,
  ip_address    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_audit" ON audit_logs;
CREATE POLICY "admin_read_audit" ON audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE user_id = (SELECT auth.uid()) AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_audit_logs_created   ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action    ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource  ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user      ON audit_logs(user_id);

GRANT ALL ON audit_logs TO service_role;

-- ── trigger function ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _action       TEXT;
  _resource_id  UUID;
  _meta         JSONB := '{}';
BEGIN
  -- Determine action
  IF    TG_OP = 'INSERT' THEN _action := 'create';
  ELSIF TG_OP = 'DELETE' THEN _action := 'delete';
  ELSE
    -- UPDATE: detect semantic action from status column changes
    _action := 'update';
    IF TG_TABLE_NAME = 'verifications' THEN
      IF NEW.status = 'approved' AND OLD.status != 'approved' THEN _action := 'approve'; END IF;
      IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN _action := 'reject';  END IF;
    END IF;
    IF TG_TABLE_NAME = 'fraud_flags' THEN
      IF NEW.status = 'resolved'  THEN _action := 'resolve';  END IF;
      IF NEW.status = 'dismissed' THEN _action := 'dismiss';  END IF;
    END IF;
    IF TG_TABLE_NAME = 'disputes' THEN
      IF NEW.status = 'resolved' THEN _action := 'resolve'; END IF;
    END IF;
    IF TG_TABLE_NAME = 'profiles' AND OLD.role IS DISTINCT FROM NEW.role THEN
      _action := 'update';
      _meta   := jsonb_build_object('role_from', OLD.role, 'role_to', NEW.role);
    END IF;
  END IF;

  -- Resource ID
  IF TG_OP = 'DELETE' THEN
    _resource_id := OLD.id;
  ELSE
    _resource_id := NEW.id;
  END IF;

  -- Build metadata for key fields
  IF _meta = '{}' THEN
    IF TG_TABLE_NAME = 'listings' AND TG_OP != 'DELETE' THEN
      _meta := jsonb_build_object('crop_type', NEW.crop_type, 'status', NEW.status);
    END IF;
    IF TG_TABLE_NAME = 'offers' AND TG_OP != 'DELETE' THEN
      _meta := jsonb_build_object('status', NEW.status, 'offered_price', NEW.offered_price);
    END IF;
    IF TG_TABLE_NAME = 'verifications' AND TG_OP != 'DELETE' THEN
      _meta := jsonb_build_object('level', NEW.level, 'status', NEW.status);
    END IF;
    IF TG_TABLE_NAME = 'delivery_requests' AND TG_OP = 'UPDATE' THEN
      _meta := jsonb_build_object('status_from', OLD.status, 'status_to', NEW.status);
    END IF;
  END IF;

  INSERT INTO audit_logs (action, resource_type, resource_id, metadata)
  VALUES (_action, TG_TABLE_NAME, _resource_id, _meta);

  RETURN NULL; -- AFTER trigger, return value ignored
END;
$$;

-- ── attach triggers to key tables ────────────────────────────────────────────

-- profiles (role changes only — avoid noise from every profile update)
DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION fn_audit_log();

-- listings
DROP TRIGGER IF EXISTS audit_listings ON listings;
CREATE TRIGGER audit_listings
  AFTER INSERT OR UPDATE OR DELETE ON listings
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- offers
DROP TRIGGER IF EXISTS audit_offers ON offers;
CREATE TRIGGER audit_offers
  AFTER INSERT OR UPDATE ON offers
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR TG_OP = 'INSERT')
  EXECUTE FUNCTION fn_audit_log();

-- verifications
DROP TRIGGER IF EXISTS audit_verifications ON verifications;
CREATE TRIGGER audit_verifications
  AFTER INSERT OR UPDATE ON verifications
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- delivery_requests (status transitions only)
DROP TRIGGER IF EXISTS audit_delivery_requests ON delivery_requests;
CREATE TRIGGER audit_delivery_requests
  AFTER UPDATE ON delivery_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION fn_audit_log();

-- fraud_flags
DROP TRIGGER IF EXISTS audit_fraud_flags ON fraud_flags;
CREATE TRIGGER audit_fraud_flags
  AFTER INSERT OR UPDATE ON fraud_flags
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();

-- disputes
DROP TRIGGER IF EXISTS audit_disputes ON disputes;
CREATE TRIGGER audit_disputes
  AFTER INSERT OR UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
