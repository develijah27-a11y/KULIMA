-- ============================================================================
-- KULIMA — RLS Performance Fix
-- Resolves three categories of Supabase advisor warnings:
--
--   1. auth_rls_initplan   — auth.uid() re-evaluated per row in policies
--   2. multiple_permissive_policies — redundant overlapping SELECT/UPDATE policies
--   3. duplicate_index     — identical indexes on market_prices
--
-- Safe to run multiple times (all ops are idempotent).
-- NO table structure, data, or user-visible access is changed.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. UPDATE is_admin() — wrap auth.uid() in SELECT so Postgres evaluates it
--    once per query instead of once per row.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = (SELECT auth.uid())   -- (SELECT ...) evaluated once per query
      AND role = 'admin'
  );
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. PROFILES — consolidate SELECT policies and fix per-row auth.uid()
--
--    BEFORE: three SELECT policies all checked via OR
--      • "Admins can view all profiles"  → auth.uid() = user_id OR is_admin()
--      • "Users can view own profile"    → auth.uid() = user_id   (redundant)
--      • rls_select                      → unknown origin, likely redundant
--
--    AFTER: single SELECT policy covering both own-row and admin access.
--    No user loses access: regular users still see their own row (first OR);
--    admins still see all rows (second OR via is_admin()).
-- ────────────────────────────────────────────────────────────────────────────

-- Drop the redundant "own profile" policy (covered by the admin policy below)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Drop any auto-generated catch-all policies (safe; IF EXISTS is a no-op if absent)
DROP POLICY IF EXISTS rls_select ON public.profiles;
DROP POLICY IF EXISTS rls_update ON public.profiles;

-- Recreate the admin-view policy with (SELECT auth.uid()) — evaluated once
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    (SELECT auth.uid()) = user_id    -- own row: any authenticated user
    OR public.is_admin()             -- all rows: admin only
  );

-- Fix the UPDATE policy to use (SELECT auth.uid())
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. LISTINGS — drop unknown permissive policy and fix auth.uid() in admin policy
--
--    The "Admins can view all listings" policy already covers own-row access
--    via the farmer_id check, so rls_select (if it exists) is redundant.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS rls_select ON public.listings;

DROP POLICY IF EXISTS "Admins can view all listings" ON public.listings;
CREATE POLICY "Admins can view all listings"
  ON public.listings FOR SELECT
  USING (
    farmer_id IN (
      SELECT id FROM public.profiles WHERE user_id = (SELECT auth.uid())
    )
    OR public.is_admin()
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 4. OFFERS — drop unknown permissive policy
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS rls_select ON public.offers;

-- Rewrite to keep consistent style (no functional change)
DROP POLICY IF EXISTS "Admins can view all offers" ON public.offers;
CREATE POLICY "Admins can view all offers"
  ON public.offers FOR SELECT
  USING (public.is_admin());

-- ────────────────────────────────────────────────────────────────────────────
-- 5. DROP DUPLICATE INDEXES on market_prices
--
--    20260608000005_market_intel.sql created:
--      idx_prices_crop_district   (crop_type, district)
--      idx_prices_recorded        (recorded_at DESC)
--
--    20260612000000_perf_indexes.sql created identical indexes with
--    better names that already exist:
--      idx_market_prices_crop_district  ← keep this one
--      idx_market_prices_recorded_at    ← keep this one
--
--    Dropping the older duplicates reduces index maintenance overhead.
-- ────────────────────────────────────────────────────────────────────────────
DROP INDEX IF EXISTS public.idx_prices_crop_district;   -- dup of idx_market_prices_crop_district
DROP INDEX IF EXISTS public.idx_prices_recorded;        -- dup of idx_market_prices_recorded_at
