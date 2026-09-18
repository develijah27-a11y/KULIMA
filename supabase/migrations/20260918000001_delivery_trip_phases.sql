-- ============================================================================
-- KULIMA / CROPIFY — Driver Trip Progression & Live Tracking Sub-phases
-- Adds: trip_phase, started_pickup_at, arrived_pickup_at, arrived_delivery_at
-- ============================================================================

ALTER TABLE public.delivery_requests
  ADD COLUMN IF NOT EXISTS trip_phase           TEXT DEFAULT 'assigned',
  ADD COLUMN IF NOT EXISTS started_pickup_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arrived_pickup_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS arrived_delivery_at  TIMESTAMPTZ;
