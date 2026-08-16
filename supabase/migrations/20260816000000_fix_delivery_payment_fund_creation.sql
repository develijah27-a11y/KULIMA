-- ============================================================================
-- KULIMA -- close a fund-creation hole in claim_delivery_payment()
--
-- Exploit: delivery_requests has no WITH CHECK / field-tampering trigger, and
-- its rls_update policy lets EITHER the requester OR the assigned transporter
-- update the row (see pg_policies: qual = requester_id = auth.uid() OR
-- transporter_id = auth.uid(), no column restriction). estimated_fare,
-- commission_amount and driver_earnings are only ever meant to be set once,
-- server-side, at delivery-request creation time (POST /api/deliveries) --
-- but nothing stops a transporter from directly PATCHing their own row via
-- the Supabase REST API (valid session JWT + the public anon key is all it
-- takes) and setting driver_earnings to an arbitrary large number while
-- leaving estimated_fare untouched.
--
-- /api/deliveries/pay/route.ts then calls this function with those two
-- values read straight from the (tamperable) row:
--   p_total_fare:      delivery.estimated_fare   (debited from requester)
--   p_driver_earnings: delivery.driver_earnings  (credited to driver)
-- The function moved money using them completely independently -- it never
-- checked that driver_earnings + commission_amount <= total_fare. A
-- requester+transporter pair (or one attacker operating both accounts) could
-- create a cheap delivery, accept it, tamper driver_earnings to something
-- huge, then call /api/deliveries/pay: the requester's wallet is correctly
-- debited the small real fare, but the driver's wallet is credited the
-- fabricated large amount -- money created from nothing, withdrawable via
-- mobile money payout for real cash out of the platform.
--
-- Fix: enforce the invariant server-side, at the last point before money
-- moves, regardless of what the delivery_requests row says elsewhere.
-- Verified every legitimate caller already satisfies this (estimated_fare/
-- commission_amount/driver_earnings are only ever set from the server-
-- computed fare at creation in POST /api/deliveries, and driver_earnings is
-- always fare minus commission), so this cannot reject a real payment.
-- Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.claim_delivery_payment(
  p_delivery_id uuid,
  p_requester_user_id uuid,
  p_driver_user_id uuid,
  p_total_fare numeric,
  p_driver_earnings numeric,
  p_commission_amount numeric,
  p_platform_wallet_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_requester_wallet wallets%ROWTYPE;
  v_driver_wallet_id UUID;
  v_platform_wallet_id UUID;
BEGIN
  -- Never let more leave the requester's grip than actually enters it: the
  -- driver's payout plus the platform's cut must not exceed what the
  -- requester is being charged, no matter what the delivery_requests row
  -- (client-writable per its RLS policy) currently claims those figures are.
  IF p_total_fare IS NULL OR p_total_fare <= 0
     OR p_driver_earnings IS NULL OR p_driver_earnings < 0
     OR p_commission_amount IS NULL OR p_commission_amount < 0
     OR (p_driver_earnings + p_commission_amount) > p_total_fare THEN
    RAISE EXCEPTION 'Invalid payment amounts';
  END IF;

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
