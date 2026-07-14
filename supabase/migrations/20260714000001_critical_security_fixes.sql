-- ============================================================================
-- Critical pre-launch fixes: wallet-balance RLS holes + payment race conditions
-- + public KYC document bucket. See audit dated 2026-07-14.
-- ============================================================================

-- ── 1. wallets — close the direct-balance-write hole ────────────────────────
-- "users_own_wallet" was FOR ALL with no WITH CHECK, so any authenticated
-- user could PATCH their own wallet's balance to any value via the Supabase
-- REST API directly. Every legitimate balance write in the app already goes
-- through a service-role client (withdraw/escrow/webhook routes) or the
-- transfer_between_wallets() RPC, both of which bypass RLS — so regular
-- users never needed write access here at all. Read-only from now on.
DROP POLICY IF EXISTS "users_own_wallet" ON wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON wallets;
DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
DROP POLICY IF EXISTS "users_read_own_wallet" ON wallets;
CREATE POLICY "users_read_own_wallet" ON wallets FOR SELECT USING (user_id = auth.uid());

-- ── 2. wallet_transactions — close the forgeable-ledger hole ────────────────
-- Both policies used USING/WITH CHECK (true) with no role restriction, so any
-- user could insert or edit ledger rows for any wallet. Scope to service_role,
-- which is how every route already writes this table.
DROP POLICY IF EXISTS "service_insert_transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "service_update_transactions" ON wallet_transactions;
CREATE POLICY "service_insert_transactions" ON wallet_transactions
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "service_update_transactions" ON wallet_transactions
  FOR UPDATE TO service_role USING (true);

-- ── 3. mobile_money_requests — close the tamper-before-webhook hole ─────────
-- "users_own_momo" was FOR ALL with no WITH CHECK: a user could submit a
-- deposit request, pay a small real amount, then PATCH their own pending
-- request's `amount` field upward via the REST API before the Flutterwave
-- webhook lands (which used to trust the stored amount) and get credited
-- far more than they paid. All requests are created/updated by service-role
-- API routes already, so users only need read access.
DROP POLICY IF EXISTS "users_own_momo" ON mobile_money_requests;
DROP POLICY IF EXISTS "users_read_own_momo" ON mobile_money_requests;
CREATE POLICY "users_read_own_momo" ON mobile_money_requests FOR SELECT USING (user_id = auth.uid());

-- ── 4. loan_profiles — close the world-readable/writable credit-data hole ───
-- "Service manages loan profiles" was WITH CHECK(true) and no USING clause,
-- which Postgres also applies as USING(true) — i.e. open to every role,
-- including anonymous. Scope writes to service_role (matches how both
-- /api/loans/apply and the weekly scores cron already write this table)
-- and let a farmer read their own score.
DROP POLICY IF EXISTS "Service manages loan profiles" ON loan_profiles;
DROP POLICY IF EXISTS "service_manages_loan_profiles" ON loan_profiles;
CREATE POLICY "service_manages_loan_profiles" ON loan_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "farmers_read_own_loan_profile" ON loan_profiles;
CREATE POLICY "farmers_read_own_loan_profile" ON loan_profiles
  FOR SELECT USING (farmer_id = auth.uid()::text);

-- ── 5. profiles — close the world-readable PII hole ──────────────────────────
-- A leftover "Public profiles viewable" USING(true) SELECT policy exposed
-- phone_number, lat/lng, trust_score, dispute_count, district, etc. to
-- anonymous callers. RLS SELECT policies are OR'd, so this stayed in effect
-- even after a properly-scoped admin policy was added later. The app's own
-- "Admins can view all profiles" (own-row OR admin) policy remains and
-- covers every legitimate read path used by the codebase.
DROP POLICY IF EXISTS "Public profiles viewable" ON profiles;

-- ── 6. kyc-documents bucket — stop serving government ID docs publicly ──────
-- The bucket was created `public = true` so getPublicUrl() would work for
-- admin review links, but public-bucket objects are served via a URL that
-- bypasses storage.objects RLS entirely — anyone who knew a user's UUID
-- (visible in ordinary order/offer/delivery payloads) could fetch their
-- national ID / driving licence / selfie with zero authentication.
UPDATE storage.buckets SET public = false WHERE id = 'kyc-documents';

-- ============================================================================
-- Atomic money-movement primitives. All four are SECURITY DEFINER, callable
-- by service_role only — never by authenticated/anon — because they take a
-- raw wallet_id/user_id parameter with no ownership check of their own; the
-- caller (a server-side API route already using the service-role client) is
-- the trust boundary, same pattern as the rest of this migration.
-- ============================================================================

-- Atomic conditional debit — replaces the withdraw route's read-balance,
-- compute-in-app-code, write-balance pattern, which let two concurrent
-- withdrawal requests both pass the sufficiency check and both fire a real
-- mobile-money payout against a single deduction.
CREATE OR REPLACE FUNCTION claim_wallet_debit(p_wallet_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  UPDATE wallets SET balance = balance - p_amount, updated_at = NOW()
  WHERE id = p_wallet_id AND balance >= p_amount;

  RETURN FOUND;
END; $$;

-- Atomic credit — used for deposit crediting and for refunding a wallet on a
-- failed withdrawal (additive, so it can't clobber a concurrent legitimate
-- change the way overwriting with a stale pre-debit balance snapshot could).
CREATE OR REPLACE FUNCTION credit_wallet(p_wallet_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  UPDATE wallets SET balance = balance + p_amount, updated_at = NOW()
  WHERE id = p_wallet_id;
END; $$;

-- Atomically claims a mobile-money deposit request and credits the wallet in
-- one transaction. The UPDATE ... WHERE status <> 'completed' takes a row
-- lock, so a retried/duplicated Flutterwave webhook delivery for the same
-- request loses the race and gets FALSE back instead of double-crediting.
CREATE OR REPLACE FUNCTION claim_deposit(
  p_request_id UUID,
  p_wallet_user_id UUID,
  p_amount NUMERIC,
  p_reference TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  UPDATE mobile_money_requests SET status = 'completed', updated_at = NOW()
  WHERE id = p_request_id AND status <> 'completed';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  SELECT id INTO v_wallet_id FROM wallets WHERE user_id = p_wallet_user_id;
  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_wallet_user_id;
  END IF;

  UPDATE wallets SET balance = balance + p_amount, updated_at = NOW() WHERE id = v_wallet_id;

  INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, status, reference, description, metadata)
  VALUES (v_wallet_id, p_wallet_user_id, 'deposit', p_amount, 'completed', p_reference, p_description, p_metadata);

  RETURN TRUE;
END; $$;

-- Atomically funds order-based escrow: locks the buyer's wallet row, inserts
-- the escrow row (protected by the unique index below), and only then debits
-- — so if a concurrent duplicate "fund" call already inserted the escrow row
-- for this order, the insert's unique-violation aborts the whole function
-- (including the not-yet-committed debit) before any money moves twice.
CREATE OR REPLACE FUNCTION claim_escrow_fund(
  p_order_id UUID,
  p_buyer_user_id UUID,
  p_seller_user_id UUID,
  p_amount NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_wallet wallets%ROWTYPE;
  v_escrow_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_buyer_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Buyer wallet not found';
  END IF;
  IF v_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  BEGIN
    INSERT INTO escrow_accounts (order_id, buyer_user_id, seller_user_id, amount, status)
    VALUES (p_order_id, p_buyer_user_id, p_seller_user_id, p_amount, 'funded')
    RETURNING id INTO v_escrow_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Escrow already funded for this order';
  END;

  UPDATE wallets SET balance = balance - p_amount, updated_at = NOW() WHERE id = v_wallet.id;

  INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, status, order_id, description)
  VALUES (v_wallet.id, p_buyer_user_id, 'escrow_lock', p_amount, 'completed', p_order_id, 'Escrow funded for order');

  RETURN v_escrow_id;
END; $$;

REVOKE ALL ON FUNCTION claim_wallet_debit(UUID, NUMERIC)               FROM PUBLIC;
REVOKE ALL ON FUNCTION credit_wallet(UUID, NUMERIC)                    FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_deposit(UUID, UUID, NUMERIC, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_escrow_fund(UUID, UUID, UUID, NUMERIC)    FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_wallet_debit(UUID, NUMERIC)               TO service_role;
GRANT EXECUTE ON FUNCTION credit_wallet(UUID, NUMERIC)                    TO service_role;
GRANT EXECUTE ON FUNCTION claim_deposit(UUID, UUID, NUMERIC, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION claim_escrow_fund(UUID, UUID, UUID, NUMERIC)    TO service_role;

-- Backstop at the data layer even if a call site is ever added that doesn't
-- go through claim_escrow_fund — a duplicate order/offer can't get a second
-- escrow row regardless of how it's inserted.
CREATE UNIQUE INDEX IF NOT EXISTS escrow_accounts_order_id_uniq
  ON escrow_accounts(order_id) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS escrow_accounts_offer_id_uniq
  ON escrow_accounts(offer_id) WHERE offer_id IS NOT NULL;

-- ============================================================================
-- Round 2 — an undocumented `rls_*` policy set exists on the live database
-- (applied directly, never captured in a migration file — same class of gap
-- as the delivery_locations/group_listing_contributions tables found in the
-- 2026-07-14 audit) that independently re-opened two of the holes above and
-- contained one more of its own. Discovered by inspecting pg_policies after
-- applying the fixes above and finding they hadn't actually closed anything
-- on wallets/mobile_money_requests — those tables had a *second*, separate
-- owner-writable policy under a different name.
-- ============================================================================

-- wallets.rls_update allowed the OWNER to update their own row with no
-- WITH CHECK — i.e. the exact direct-balance-write hole this migration
-- opened with, just under a different policy name. Replace with admin-only;
-- every legitimate write already goes through a service-role client or the
-- new claim_wallet_debit/credit_wallet/claim_deposit/claim_escrow_fund RPCs.
DROP POLICY IF EXISTS "rls_update" ON wallets;
CREATE POLICY "admin_update_wallets" ON wallets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- mobile_money_requests.rls_insert/update/delete let the owner write their
-- own row (including `amount`) with no WITH CHECK restricting which fields
-- could change — a user could submit a deposit request, pay a small real
-- amount, then PATCH `amount` upward via the REST API before the webhook
-- confirmed it. /api/wallet/deposit now does every write through the
-- service-role client, so these are no longer needed for any legitimate flow.
DROP POLICY IF EXISTS "rls_insert" ON mobile_money_requests;
DROP POLICY IF EXISTS "rls_update" ON mobile_money_requests;
DROP POLICY IF EXISTS "rls_delete" ON mobile_money_requests;

-- profiles: "Users can update own profile" has no WITH CHECK, so a user can
-- PATCH their own `role` column directly via the REST API — full admin
-- self-promotion, not caught by the earlier audit because it only checked
-- application code, not the RLS layer. RLS policies can't reference the
-- pre-update row to pin a single column, so this is enforced with a trigger
-- instead: any UPDATE that changes role to 'admin' is rejected unless the
-- connection is service_role. Onboarding (self-selecting farmer/buyer/etc.
-- via /api/onboarding/set-role, which runs as the user) is unaffected since
-- 'admin' is never one of its allowed values.
CREATE OR REPLACE FUNCTION prevent_self_admin_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF NEW.role = 'admin' AND OLD.role IS DISTINCT FROM 'admin' AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Cannot self-assign admin role';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_prevent_self_admin_promotion ON profiles;
CREATE TRIGGER trg_prevent_self_admin_promotion
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_self_admin_promotion();
