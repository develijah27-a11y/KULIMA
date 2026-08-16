-- ============================================================================
-- KULIMA -- close an order-timestamp backdating hole used to defeat the
-- 48-hour dispute window.
--
-- orders_update's RLS policy lets a farmer update their own order
-- (farmer_profile_id IN own profile ids) with NO status restriction at all
-- -- unlike the buyer branch, which is scoped to
-- status = ANY('pending','delivered'). trg_prevent_order_field_tampering
-- already locks the identity/money columns (buyer_id, escrow_id,
-- total_price, quantity_kg, etc.) against non-service-role writers, but
-- never touched the lifecycle timestamps -- so a farmer can currently PATCH
-- their own order directly via the Supabase REST API and set
-- delivered_at to an arbitrary past timestamp. /api/orders/[id]'s 'dispute'
-- action measures the 48-hour return window from delivered_at
-- (Date.now() - deliveredMs > 48h -> reject the dispute), so backdating it
-- lets a farmer who marks (or has a colluding transporter mark) an order
-- delivered pre-emptively shrink or entirely close the buyer's window to
-- dispute a shipment that was late, damaged, or never arrived -- before the
-- buyer even gets the "delivered" notification.
--
-- Fix: for non-service-role callers, force every order lifecycle timestamp
-- to the actual current time rather than trusting whatever value the
-- caller supplies, whenever it's being changed. Verified every legitimate
-- write in the app already sets these to `new Date().toISOString()` /
-- `now` at the moment of the call (grepped every write site in
-- src/app/api) -- never a caller-chosen value -- so this cannot reject a
-- real transition, it just removes the ability to lie about when one
-- happened.
-- Safe to re-run.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prevent_order_field_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
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

    -- Lifecycle timestamps: allow them to move, but only ever to "now" —
    -- never to a caller-chosen value — so status history can't be
    -- backdated (or postdated) to manipulate time-based rules like the
    -- 48-hour dispute window.
    IF NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at THEN
      NEW.confirmed_at := NOW();
    END IF;
    IF NEW.dispatched_at IS DISTINCT FROM OLD.dispatched_at THEN
      NEW.dispatched_at := NOW();
    END IF;
    IF NEW.in_transit_at IS DISTINCT FROM OLD.in_transit_at THEN
      NEW.in_transit_at := NOW();
    END IF;
    IF NEW.delivered_at IS DISTINCT FROM OLD.delivered_at THEN
      NEW.delivered_at := NOW();
    END IF;
    IF NEW.completed_at IS DISTINCT FROM OLD.completed_at THEN
      NEW.completed_at := NOW();
    END IF;
    IF NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at THEN
      NEW.cancelled_at := NOW();
    END IF;
    IF NEW.disputed_at IS DISTINCT FROM OLD.disputed_at THEN
      NEW.disputed_at := NOW();
    END IF;
    IF NEW.return_requested_at IS DISTINCT FROM OLD.return_requested_at THEN
      NEW.return_requested_at := NOW();
    END IF;
    IF NEW.awaiting_payment_at IS DISTINCT FROM OLD.awaiting_payment_at THEN
      NEW.awaiting_payment_at := NOW();
    END IF;
  END IF;
  RETURN NEW;
END; $function$;
