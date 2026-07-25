-- ============================================================
-- Premium Subscription Tiers
-- ============================================================

-- Add subscription_tier column to profiles if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN subscription_tier TEXT NOT NULL DEFAULT 'free'
      CHECK (subscription_tier IN ('free','farmer_pro','business','enterprise'));
  END IF;
END $$;

-- Subscriptions tracking table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan             TEXT NOT NULL CHECK (plan IN ('farmer_pro','business','enterprise')),
  billing_cycle    TEXT NOT NULL CHECK (billing_cycle IN ('monthly','yearly')),
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','past_due')),
  amount_ugx       INTEGER NOT NULL,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status  ON public.subscriptions(status);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscriptions
CREATE POLICY "users_own_subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Only admins can insert/update/delete subscriptions (managed server-side)
CREATE POLICY "admins_manage_subscriptions" ON public.subscriptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin')
  );
