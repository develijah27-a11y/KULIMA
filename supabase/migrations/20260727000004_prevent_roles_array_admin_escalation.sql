-- ============================================================================
-- KULIMA -- close a privilege-escalation gap in profiles.roles[]
-- prevent_self_admin_promotion() (added 2026-07-14) only ever guarded the
-- flat `role` column. Multi-role support added `roles text[]` later, and
-- the app's own /api/profile/add-role route correctly restricts
-- self-service additions to a fixed non-admin allowlist -- but nothing at
-- the database layer stopped a direct REST call (PATCH /rest/v1/profiles
-- with a valid user JWT) from adding 'admin' to their own roles[] array,
-- since the UPDATE RLS policy on profiles has no WITH CHECK restricting
-- column values. Several dashboard layouts (admin included) now treat
-- roles[].includes('admin') as equivalent to role = 'admin' for multi-role
-- access, which made this a real path to the full admin panel, not just a
-- theoretical one.
-- Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_self_admin_promotion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog' AS $$
BEGIN
  IF NEW.role = 'admin' AND OLD.role IS DISTINCT FROM 'admin' AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Cannot self-assign admin role';
  END IF;

  IF NEW.roles @> ARRAY['admin']::text[]
     AND NOT (COALESCE(OLD.roles, ARRAY[]::text[]) @> ARRAY['admin']::text[])
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Cannot self-assign admin role';
  END IF;

  RETURN NEW;
END; $$;
