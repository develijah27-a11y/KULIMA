-- Web Push subscriptions — one row per browser/device a user has enabled
-- notifications on. Lets the server send real OS-level push notifications
-- (delivery jobs, low stock, etc.) that reach a user even when the app
-- isn't open, unlike the existing in-app `notifications` table which only
-- surfaces while the tab/PWA is active.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint     text NOT NULL,
  p256dh       text NOT NULL,
  auth         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_select ON public.push_subscriptions;
CREATE POLICY push_subscriptions_select ON public.push_subscriptions
  FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS push_subscriptions_insert ON public.push_subscriptions;
CREATE POLICY push_subscriptions_insert ON public.push_subscriptions
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS push_subscriptions_delete ON public.push_subscriptions;
CREATE POLICY push_subscriptions_delete ON public.push_subscriptions
  FOR DELETE USING (user_id = (select auth.uid()));
