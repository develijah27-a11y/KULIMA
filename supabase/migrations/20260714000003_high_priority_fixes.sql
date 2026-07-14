-- ============================================================================
-- Second pass: the "High" severity findings from the 2026-07-14 audit that
-- were deferred during the same-day critical fix pass (wallets/KYC). Covers:
-- rate limiting, orders column-tampering, group_messages injection,
-- verifications self-approve, and atomic payment races on deliveries/pay
-- and consultations (same class of bug as the wallet withdraw/escrow races
-- fixed in 20260714000001).
-- ============================================================================

-- ── Rate limiting ────────────────────────────────────────────────────────────
-- Generic atomic fixed-window counter, callable by service_role only. Used
-- from application code as: SELECT check_rate_limit('withdraw:<user_id>', 5, 60)
-- Login/signup/OTP/reset already go straight to Supabase's own hosted auth
-- (no custom API route in front of them), so those are rate-limited via the
-- project's own auth config instead of this table — see PROVENANCE.md.
CREATE TABLE IF NOT EXISTS rate_limit_hits (
  key          TEXT PRIMARY KEY,
  count        INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE rate_limit_hits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION check_rate_limit(p_key TEXT, p_max INT, p_window_seconds INT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_row rate_limit_hits%ROWTYPE;
BEGIN
  INSERT INTO rate_limit_hits (key, count, window_start)
  VALUES (p_key, 1, NOW())
  ON CONFLICT (key) DO UPDATE SET
    count = CASE WHEN rate_limit_hits.window_start < NOW() - (p_window_seconds || ' seconds')::interval
                 THEN 1 ELSE rate_limit_hits.count + 1 END,
    window_start = CASE WHEN rate_limit_hits.window_start < NOW() - (p_window_seconds || ' seconds')::interval
                 THEN NOW() ELSE rate_limit_hits.window_start END
  RETURNING * INTO v_row;

  RETURN v_row.count <= p_max;
END; $$;

REVOKE ALL ON FUNCTION check_rate_limit(TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, INT, INT) TO service_role;

-- ── orders: pin identity/financial columns against direct user-session writes ──
-- orders_update (USING, no WITH CHECK) lets a buyer (status IN pending/
-- delivered) or the owning farmer update ANY column on their order, not just
-- the status/date/note fields the app actually intends — e.g. a buyer could
-- PATCH total_price or quantity_kg directly. RLS can't reference the
-- pre-update row inside WITH CHECK to pin individual columns, so this uses a
-- trigger instead, same pattern as the profiles admin-promotion fix. Columns
-- left mutable (status, *_at timestamps, notes) are exactly what
-- src/app/api/orders/[id]/route.ts's user-session client actually writes;
-- everything else (price, quantity, parties, escrow/delivery linkage) is
-- only ever set by service-role code (order creation, escrow funding).
CREATE OR REPLACE FUNCTION prevent_order_field_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    NEW.offer_id             := OLD.offer_id;
    NEW.listing_id           := OLD.listing_id;
    NEW.buyer_id              := OLD.buyer_id;
    NEW.seller_id             := OLD.seller_id;
    NEW.quantity_kg           := OLD.quantity_kg;
    NEW.total_price           := OLD.total_price;
    NEW.farmer_profile_id     := OLD.farmer_profile_id;
    NEW.escrow_id             := OLD.escrow_id;
    NEW.group_listing_id      := OLD.group_listing_id;
    NEW.invoice_number        := OLD.invoice_number;
    NEW.delivery_req_id       := OLD.delivery_req_id;
    NEW.delivery_request_id   := OLD.delivery_request_id;
    NEW.pickup_district       := OLD.pickup_district;
    NEW.dropoff_district      := OLD.dropoff_district;
    NEW.paid_at               := OLD.paid_at;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_prevent_order_field_tampering ON orders;
CREATE TRIGGER trg_prevent_order_field_tampering
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION prevent_order_field_tampering();

-- ── group_messages: require actual group membership to post ────────────────
-- group_messages_insert only checked `sender_id = auth.uid()`, trivially
-- satisfiable by anyone — there was no check that the sender is a member of
-- the group named by `admin_id` (discoverable from any active group
-- listing). Now requires either being the group's own admin_id, or an
-- existing row in group_members linking the caller's profile to that group.
DROP POLICY IF EXISTS "group_messages_insert" ON group_messages;
CREATE POLICY "group_messages_insert" ON group_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND (
    admin_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.admin_id = group_messages.admin_id
        AND gm.farmer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  )
);

-- ── verifications: block self-approval on insert ────────────────────────────
-- rls_insert only checked `user_id = auth.uid()` — a user could INSERT a row
-- with status='approved' directly. Not yet exploitable (the app only trusts
-- profiles.verification_level, updated exclusively by the admin-gated
-- /api/admin/verify-kyc route), but closing it now before anything ever
-- comes to trust this table's status column directly. status defaults to
-- 'pending', which is what VerifyWizard's insert already relies on.
DROP POLICY IF EXISTS "rls_insert" ON verifications;
CREATE POLICY "rls_insert" ON verifications FOR INSERT WITH CHECK (
  user_id = auth.uid() AND status = 'pending'
);

-- ── Atomic payment claims for deliveries/pay and consultations ─────────────
-- Same read-balance/compute/write-balance race as the wallet withdraw/
-- escrow fixes in 20260714000001 — a double-submitted request could double-
-- debit the payer and double-credit the payee. These follow the identical
-- pattern: claim the status transition atomically first (row lock via
-- UPDATE ... WHERE <not-yet-paid>), and only pay out if that claim succeeds.

CREATE OR REPLACE FUNCTION claim_delivery_payment(
  p_delivery_id UUID,
  p_requester_user_id UUID,
  p_driver_user_id UUID,
  p_total_fare NUMERIC,
  p_driver_earnings NUMERIC,
  p_commission_amount NUMERIC,
  p_platform_wallet_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_requester_wallet wallets%ROWTYPE;
  v_driver_wallet_id UUID;
  v_platform_wallet_id UUID;
BEGIN
  UPDATE delivery_requests SET payment_status = 'paid', updated_at = NOW()
  WHERE id = p_delivery_id AND payment_status <> 'paid';
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_requester_wallet FROM wallets WHERE user_id = p_requester_user_id FOR UPDATE;
  IF NOT FOUND OR v_requester_wallet.balance < p_total_fare THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  SELECT id INTO v_driver_wallet_id FROM wallets WHERE user_id = p_driver_user_id;
  IF v_driver_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Driver wallet not found';
  END IF;

  UPDATE wallets SET balance = balance - p_total_fare, updated_at = NOW() WHERE id = v_requester_wallet.id;
  UPDATE wallets SET balance = balance + p_driver_earnings, updated_at = NOW() WHERE id = v_driver_wallet_id;

  IF p_platform_wallet_user_id IS NOT NULL AND p_commission_amount > 0 THEN
    SELECT id INTO v_platform_wallet_id FROM wallets WHERE user_id = p_platform_wallet_user_id;
    IF v_platform_wallet_id IS NOT NULL THEN
      UPDATE wallets SET balance = balance + p_commission_amount, updated_at = NOW() WHERE id = v_platform_wallet_id;
    END IF;
  END IF;

  INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, status, description)
  VALUES (v_requester_wallet.id, p_requester_user_id, 'withdrawal', p_total_fare, 'completed', 'Delivery payment');
  INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, status, description)
  VALUES (v_driver_wallet_id, p_driver_user_id, 'deposit', p_driver_earnings, 'completed', 'Delivery earnings');

  RETURN TRUE;
END; $$;

-- p_pathologist_user_id may be NULL (no pathologist matched yet at booking
-- time) — matches the pre-existing app behavior of still charging the
-- farmer and leaving the consultation as 'pending' for later assignment;
-- this function just makes that existing behavior atomic, not changes it.
CREATE OR REPLACE FUNCTION claim_consultation_payment(
  p_farmer_user_id UUID,
  p_pathologist_user_id UUID,
  p_total_fee NUMERIC,
  p_pathologist_share NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_farmer_wallet wallets%ROWTYPE;
  v_path_wallet_id UUID;
BEGIN
  SELECT * INTO v_farmer_wallet FROM wallets WHERE user_id = p_farmer_user_id FOR UPDATE;
  IF NOT FOUND OR v_farmer_wallet.balance < p_total_fee THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE wallets SET balance = balance - p_total_fee, updated_at = NOW() WHERE id = v_farmer_wallet.id;
  INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, status, description)
  VALUES (v_farmer_wallet.id, p_farmer_user_id, 'withdrawal', p_total_fee, 'completed', 'Consultation fee');

  IF p_pathologist_user_id IS NOT NULL THEN
    SELECT id INTO v_path_wallet_id FROM wallets WHERE user_id = p_pathologist_user_id;
    IF v_path_wallet_id IS NOT NULL THEN
      UPDATE wallets SET balance = balance + p_pathologist_share, updated_at = NOW() WHERE id = v_path_wallet_id;
      INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, status, description)
      VALUES (v_path_wallet_id, p_pathologist_user_id, 'deposit', p_pathologist_share, 'completed', 'Consultation earnings');
    END IF;
  END IF;

  RETURN TRUE;
END; $$;

REVOKE ALL ON FUNCTION claim_delivery_payment(UUID, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_consultation_payment(UUID, UUID, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_delivery_payment(UUID, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION claim_consultation_payment(UUID, UUID, NUMERIC, NUMERIC) TO service_role;
