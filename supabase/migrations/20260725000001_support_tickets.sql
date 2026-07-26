-- ============================================================
-- Support Ticket System
-- ============================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name       TEXT,
  user_role       TEXT,
  subject         TEXT NOT NULL,
  category        TEXT NOT NULL CHECK (category IN ('payments','marketplace','logistics','kyc','technical','account','other')),
  description     TEXT NOT NULL,
  priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','pending_user','resolved','closed')),
  screenshot_url  TEXT,
  assigned_to     UUID REFERENCES auth.users(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_replies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id    UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type  TEXT NOT NULL CHECK (sender_type IN ('user','admin')),
  sender_id    UUID NOT NULL REFERENCES auth.users(id),
  sender_name  TEXT,
  message      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id    ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status     ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category   ON public.support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority   ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created    ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id   ON public.support_ticket_replies(ticket_id);

-- Enable RLS
ALTER TABLE public.support_tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_replies  ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own tickets
CREATE POLICY "users_own_tickets" ON public.support_tickets
  FOR ALL USING (auth.uid() = user_id);

-- Admins see everything
CREATE POLICY "admins_all_tickets" ON public.support_tickets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Replies: users can read/insert on their own ticket's replies
CREATE POLICY "users_own_ticket_replies_read" ON public.support_ticket_replies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
  );

CREATE POLICY "users_own_ticket_replies_insert" ON public.support_ticket_replies
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
  );

-- Admins can read/insert all replies
CREATE POLICY "admins_all_replies" ON public.support_ticket_replies
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
