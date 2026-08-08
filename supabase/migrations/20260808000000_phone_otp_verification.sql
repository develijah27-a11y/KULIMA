-- Real phone-number verification via a 6-digit OTP. profiles.phone_verified
-- already existed as a column (read by VerificationStatusCard.tsx and the
-- "Phone" step of the verify wizard's level stepper) but nothing ever set
-- it — there was no OTP mechanism at all, so it silently stayed false for
-- every account. Confirmed phone numbers also make the group auto-sync
-- match (see create-profile/route.ts, matches a pre-registered
-- group_members row by phone_number) far more reliable — an unverified,
-- possibly-mistyped number can silently fail to link someone into a group
-- they were already added to.

-- profiles.phone_verified is read by VerificationStatusCard.tsx and (as of
-- this migration) written by /api/verify/phone/confirm, but no migration in
-- this repo's history actually defines it — it may only exist because
-- someone added it by hand in the Supabase dashboard, or not at all.
-- IF NOT EXISTS makes this safe either way.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.phone_verification_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  code_hash    TEXT NOT NULL,
  attempts     INT NOT NULL DEFAULT 0,
  expires_at   TIMESTAMPTZ NOT NULL,
  verified_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_verification_codes_user
  ON public.phone_verification_codes(user_id, created_at DESC);

-- Service-role only (the send/confirm API routes use the admin client) —
-- no client-side reads or writes are ever legitimate for this table, so no
-- policies are added and RLS defaults to deny-all for anon/authenticated.
ALTER TABLE public.phone_verification_codes ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.phone_verification_codes IS
  'Short-lived OTP codes for phone verification. Rows are hashed (scrypt, see lib/wallet-pin.ts hashPin/verifyPin, reused here) and single-use — a row is either consumed (verified_at set) or left to expire.';
