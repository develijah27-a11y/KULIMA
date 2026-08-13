-- Self-serve delivery cancellation (requester side). Mirrors the existing
-- accepted_at/picked_up_at/delivered_at lifecycle columns.
ALTER TABLE delivery_requests ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
