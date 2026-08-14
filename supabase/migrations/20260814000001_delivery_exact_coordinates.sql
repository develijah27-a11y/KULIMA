-- Exact pickup/drop-off pins, captured by the requester at request time
-- (LocationPinPicker) instead of relying only on district centroids or a
-- free-text address handed to an external map. Nullable/backward-compatible
-- — older rows and any request flow that skips pin confirmation keep
-- falling back to the district centroid exactly as before.
ALTER TABLE delivery_requests ADD COLUMN IF NOT EXISTS pickup_lat DOUBLE PRECISION;
ALTER TABLE delivery_requests ADD COLUMN IF NOT EXISTS pickup_lng DOUBLE PRECISION;
ALTER TABLE delivery_requests ADD COLUMN IF NOT EXISTS dropoff_lat DOUBLE PRECISION;
ALTER TABLE delivery_requests ADD COLUMN IF NOT EXISTS dropoff_lng DOUBLE PRECISION;
