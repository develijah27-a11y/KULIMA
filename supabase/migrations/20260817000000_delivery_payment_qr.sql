-- ============================================================================
-- KULIMA -- "pay nearby" QR flow for delivery-fee payment.
--
-- Deliberately scoped to what actually moves money: this table only tracks
-- one-time-use tokens that identify WHICH delivery the QR is for and
-- enforce it can't be scanned twice. It carries no payment authority of its
-- own -- the real charge still runs entirely through the existing, already
-- atomic claim_delivery_payment() RPC via /api/deliveries/pay, which
-- recomputes everything fresh from delivery_requests at the moment of
-- payment and never trusts a client-supplied amount. This table's only job
-- is turning a QR scan into "you're now looking at the right confirm
-- screen for the right delivery", not into money movement.
--
-- RLS: no policies at all (deny-by-default) -- every access goes through
-- server-side API routes using the service-role client, matching how the
-- rest of this session's fixes handle cross-user server-side lookups.
-- ============================================================================

CREATE TABLE IF NOT EXISTS delivery_payment_qr_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id   uuid NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
  payee_user_id uuid NOT NULL,
  nonce         text NOT NULL UNIQUE,
  amount        numeric NOT NULL,
  issued_at     timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  consumed_at   timestamptz,
  consumed_by   uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_delivery ON delivery_payment_qr_tokens(delivery_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_nonce ON delivery_payment_qr_tokens(nonce);

ALTER TABLE delivery_payment_qr_tokens ENABLE ROW LEVEL SECURITY;

-- Prune expired/consumed tokens older than a day, keeping the table small.
-- Run opportunistically from the token-issue route rather than a separate
-- cron -- this table only ever holds a few live rows per active delivery.
