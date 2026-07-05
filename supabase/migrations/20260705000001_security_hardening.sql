-- Security hardening — fixes Supabase linter warnings
-- No data is changed; this is purely grants, RLS, and function config.

-- ── 1. schema_migrations: enable RLS ─────────────────────────────────────────
-- The table is in the public schema so PostgREST exposes it. Enabling RLS with
-- no policies blocks all anonymous/authenticated reads via the API; service_role
-- bypasses RLS by default so internal tooling is unaffected.
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

-- ── 2. Fix mutable search_path on all affected functions ─────────────────────
-- A mutable search_path lets a malicious schema shadowing pg_catalog functions
-- intercept calls inside these functions. Pinning it removes that attack surface.
ALTER FUNCTION generate_wallet_account_number()            SET search_path = public, pg_catalog;
ALTER FUNCTION set_wallet_account_number()                 SET search_path = public, pg_catalog;
ALTER FUNCTION generate_group_account_number()             SET search_path = public, pg_catalog;
ALTER FUNCTION set_group_account_number()                  SET search_path = public, pg_catalog;
ALTER FUNCTION transfer_between_wallets(TEXT, NUMERIC, TEXT) SET search_path = public, pg_catalog;

-- ── 3. Tighten group_wallet_transactions policy ───────────────────────────────
-- The "Service manages group wallet transactions" policy used USING(true) +
-- WITH CHECK(true) for ALL, which the linter flags as bypassing RLS for any role.
-- service_role bypasses RLS by definition so it does not need this policy.
-- Dropping it means only the explicit SELECT policy for group leaders remains,
-- and service_role writes continue to work unaffected.
DROP POLICY IF EXISTS "Service manages group wallet transactions" ON group_wallet_transactions;

-- ── 4. Revoke anon EXECUTE on transfer_between_wallets ───────────────────────
-- The function already checks auth.uid() internally, but the linter flags that
-- anon can reach it at all. Explicitly deny anon and re-assert authenticated only.
REVOKE ALL ON FUNCTION transfer_between_wallets(TEXT, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION transfer_between_wallets(TEXT, NUMERIC, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION transfer_between_wallets(TEXT, NUMERIC, TEXT) TO authenticated;
