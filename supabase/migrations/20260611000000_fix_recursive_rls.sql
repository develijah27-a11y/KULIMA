-- ============================================================================
-- KULIMA — Fix recursive RLS policy (500 error on profiles query)
--
-- ROOT CAUSE: The "Admins can view all profiles" policy on the profiles table
-- contains a subquery that SELECTs from profiles itself, causing infinite
-- recursion → HTTP 500 from Supabase REST API.
--
-- FIX: Replace the recursive check with a SECURITY DEFINER helper function
-- that runs as postgres (bypasses RLS) so it doesn't trigger the policy again.
--
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

-- ============================================================================
-- 1. Create a SECURITY DEFINER helper — reads profiles as postgres, no RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- ============================================================================
-- 2. Drop the recursive admin policy and replace with safe version
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() = user_id        -- own row: always allowed (non-recursive)
    OR public.is_admin()        -- admin: checked via SECURITY DEFINER function
  );

-- ============================================================================
-- 3. Fix the same recursion pattern in listings and offers if present
-- ============================================================================
DROP POLICY IF EXISTS "Admins can view all listings" ON listings;
CREATE POLICY "Admins can view all listings"
  ON listings FOR SELECT
  USING (
    farmer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can view all offers" ON offers;
CREATE POLICY "Admins can view all offers"
  ON offers FOR SELECT
  USING (
    public.is_admin()
  );

-- ============================================================================
-- 4. Also ensure the base "Users can view own profile" policy exists
--    (safe to re-run — IF NOT EXISTS equivalent via DROP + CREATE)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. Ensure UPDATE policy is present
-- ============================================================================
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);
