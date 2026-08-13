-- Live "nearby available drivers" map (Bolt/Uber-style) shown to requesters
-- before/while requesting a delivery — distinct from delivery_locations,
-- which only tracks position for a specific already-created delivery
-- between its two matched parties. This is general presence: any available
-- vehicle broadcasts roughly where it is so requesters can see the pool of
-- drivers around them, the same way vehicles.is_available already lets
-- anyone browse which vehicles are open for work.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_lat DOUBLE PRECISION;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_lng DOUBLE PRECISION;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- Nearby-driver lookups filter on is_available and freshness; existing
-- public_view_vehicles policy already covers read access for is_available
-- rows, this just makes that filtered scan cheap at volume.
CREATE INDEX IF NOT EXISTS idx_vehicles_live_location ON vehicles(location_updated_at) WHERE is_available = true;
