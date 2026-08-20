-- ============================================================
-- Fix support_tickets live schema drift
-- The live table predates 20260725000001_support_tickets.sql and was
-- never actually altered to match it (that migration's CREATE TABLE
-- IF NOT EXISTS silently no-opped against the pre-existing table), so
-- every ticket submission failed with "could not find the user_name
-- column of 'support_tickets' in the schema cache." This adds the
-- missing columns app code already relies on and creates the missing
-- replies table, then forces PostgREST to pick up the new schema.
-- ============================================================

ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS user_name      TEXT,
  ADD COLUMN IF NOT EXISTS user_role      TEXT,
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

CREATE TABLE IF NOT EXISTS public.support_ticket_replies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type  TEXT NOT NULL CHECK (sender_type IN ('user','admin')),
  sender_id    UUID NOT NULL REFERENCES auth.users(id),
  sender_name  TEXT,
  message      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id ON public.support_ticket_replies(ticket_id);

ALTER TABLE public.support_ticket_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_ticket_replies_read" ON public.support_ticket_replies;
CREATE POLICY "users_own_ticket_replies_read" ON public.support_ticket_replies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "users_own_ticket_replies_insert" ON public.support_ticket_replies;
CREATE POLICY "users_own_ticket_replies_insert" ON public.support_ticket_replies
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admins_all_replies" ON public.support_ticket_replies;
CREATE POLICY "admins_all_replies" ON public.support_ticket_replies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Force PostgREST to reload its schema cache immediately instead of
-- waiting for its next periodic refresh — this is the step that was
-- missing when the original table was created outside the CLI.
NOTIFY pgrst, 'reload schema';
