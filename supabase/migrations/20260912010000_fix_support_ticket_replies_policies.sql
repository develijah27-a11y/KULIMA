-- ============================================================================
-- KULIMA — Consolidate support_ticket_replies RLS policies
-- Resolves Supabase Performance Advisor warning:
--   multiple_permissive_policies on public.support_ticket_replies (12 findings)
--
-- BEFORE:
--   • admins_all_replies (FOR ALL) applied to SELECT, INSERT, UPDATE, DELETE
--   • users_own_ticket_replies_read applied to SELECT
--   • users_own_ticket_replies_insert applied to INSERT
--   Both applied to PUBLIC (anon, authenticated, etc.), causing multiple
--   permissive policies evaluated with OR for every SELECT/INSERT query.
--
-- AFTER:
--   • Exactly one policy per action (SELECT, INSERT, UPDATE, DELETE)
--   • Scoped TO authenticated (support tickets require authentication)
--   • Wrapped (SELECT auth.uid()) for InitPlan query caching
-- ============================================================================

BEGIN;

-- Drop previous fragmented policies
DROP POLICY IF EXISTS "admins_all_replies" ON public.support_ticket_replies;
DROP POLICY IF EXISTS "users_own_ticket_replies_read" ON public.support_ticket_replies;
DROP POLICY IF EXISTS "users_own_ticket_replies_insert" ON public.support_ticket_replies;

-- Also drop new names if previously created (idempotent)
DROP POLICY IF EXISTS "support_ticket_replies_select" ON public.support_ticket_replies;
DROP POLICY IF EXISTS "support_ticket_replies_insert" ON public.support_ticket_replies;
DROP POLICY IF EXISTS "support_ticket_replies_update" ON public.support_ticket_replies;
DROP POLICY IF EXISTS "support_ticket_replies_delete" ON public.support_ticket_replies;

-- 1. Consolidated SELECT policy (Admins OR Ticket Owners)
CREATE POLICY "support_ticket_replies_select" ON public.support_ticket_replies
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE support_tickets.id = support_ticket_replies.ticket_id
        AND support_tickets.user_id = (SELECT auth.uid())
    )
  );

-- 2. Consolidated INSERT policy (Admins OR Ticket Owners)
CREATE POLICY "support_ticket_replies_insert" ON public.support_ticket_replies
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = (SELECT auth.uid()) AND profiles.role = 'admin'
      )
      OR
      EXISTS (
        SELECT 1 FROM public.support_tickets
        WHERE support_tickets.id = support_ticket_replies.ticket_id
          AND support_tickets.user_id = (SELECT auth.uid())
      )
    )
  );

-- 3. Admin UPDATE policy
CREATE POLICY "support_ticket_replies_update" ON public.support_ticket_replies
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  );

-- 4. Admin DELETE policy
CREATE POLICY "support_ticket_replies_delete" ON public.support_ticket_replies
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = (SELECT auth.uid()) AND profiles.role = 'admin'
    )
  );

COMMIT;
