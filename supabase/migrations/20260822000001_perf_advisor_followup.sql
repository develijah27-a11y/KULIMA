-- Follow-up to the earlier session-wide auth_rls_initplan/unindexed_fkey
-- pass: support_tickets/support_ticket_replies and supplier_demand_insights
-- were added afterward (2026-08-20) and re-introduced the same two lint
-- classes. Same fix as before: wrap auth.uid() as (select auth.uid()) so
-- Postgres evaluates it once per query instead of once per row, and add
-- the missing covering index for the FK join.

DROP POLICY IF EXISTS "demand_insights_read" ON public.supplier_demand_insights;
CREATE POLICY "demand_insights_read" ON public.supplier_demand_insights
  FOR SELECT USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "admins_all_replies" ON public.support_ticket_replies;
CREATE POLICY "admins_all_replies" ON public.support_ticket_replies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.user_id = (select auth.uid()) AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "users_own_ticket_replies_insert" ON public.support_ticket_replies;
CREATE POLICY "users_own_ticket_replies_insert" ON public.support_ticket_replies
  FOR INSERT WITH CHECK (
    sender_id = (select auth.uid())
    AND EXISTS (SELECT 1 FROM public.support_tickets WHERE support_tickets.id = support_ticket_replies.ticket_id AND support_tickets.user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "users_own_ticket_replies_read" ON public.support_ticket_replies;
CREATE POLICY "users_own_ticket_replies_read" ON public.support_ticket_replies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE support_tickets.id = support_ticket_replies.ticket_id AND support_tickets.user_id = (select auth.uid()))
  );

CREATE INDEX IF NOT EXISTS idx_support_ticket_replies_sender_id ON public.support_ticket_replies(sender_id);
