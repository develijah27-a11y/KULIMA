-- ============================================================================
-- KULIMA TRANSPORT & LOGISTICS
-- ============================================================================

-- 1. Vehicles registered by transporters
CREATE TABLE IF NOT EXISTS vehicles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plate_number     TEXT NOT NULL,
  vehicle_type     TEXT NOT NULL CHECK (vehicle_type IN ('pickup','truck','lorry','tractor','motorcycle','minivan')),
  capacity_kg      DECIMAL(10,2) NOT NULL CHECK (capacity_kg > 0),
  make_model       TEXT,
  year             INT,
  districts        TEXT[],
  is_available     BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_vehicle" ON vehicles FOR ALL USING (user_id = auth.uid());
CREATE POLICY "public_view_vehicles" ON vehicles FOR SELECT USING (is_available = true);
CREATE POLICY "admin_vehicle" ON vehicles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 2. Delivery requests (created by buyer/farmer after deal accepted)
CREATE TABLE IF NOT EXISTS delivery_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id          UUID REFERENCES offers(id) ON DELETE SET NULL,
  requester_id      UUID NOT NULL REFERENCES auth.users(id),
  pickup_district   TEXT NOT NULL,
  pickup_location   TEXT NOT NULL,
  dropoff_district  TEXT NOT NULL,
  dropoff_location  TEXT NOT NULL,
  cargo_kg          DECIMAL(10,2) NOT NULL CHECK (cargo_kg > 0),
  cargo_type        TEXT,
  pickup_date       DATE NOT NULL,
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','assigned','in_transit','delivered','cancelled')),
  assigned_vehicle_id UUID REFERENCES vehicles(id),
  transporter_id    UUID REFERENCES auth.users(id),
  agreed_price      DECIMAL(14,2),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE delivery_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requester_view_delivery" ON delivery_requests FOR ALL USING (requester_id = auth.uid());
CREATE POLICY "transporter_view_delivery" ON delivery_requests FOR SELECT USING (
  transporter_id = auth.uid() OR status = 'open'
);
CREATE POLICY "transporter_update_delivery" ON delivery_requests FOR UPDATE USING (transporter_id = auth.uid());
CREATE POLICY "admin_delivery" ON delivery_requests FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE INDEX IF NOT EXISTS idx_delivery_requester ON delivery_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_delivery_status ON delivery_requests(status);
CREATE INDEX IF NOT EXISTS idx_delivery_transporter ON delivery_requests(transporter_id);
CREATE INDEX IF NOT EXISTS idx_delivery_pickup_district ON delivery_requests(pickup_district);

-- 3. Delivery bids from transporters
CREATE TABLE IF NOT EXISTS delivery_bids (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id       UUID NOT NULL REFERENCES delivery_requests(id) ON DELETE CASCADE,
  transporter_id    UUID NOT NULL REFERENCES auth.users(id),
  vehicle_id        UUID NOT NULL REFERENCES vehicles(id),
  price             DECIMAL(14,2) NOT NULL CHECK (price > 0),
  message           TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(delivery_id, transporter_id)
);

ALTER TABLE delivery_bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transporter_own_bids" ON delivery_bids FOR ALL USING (transporter_id = auth.uid());
CREATE POLICY "requester_view_bids" ON delivery_bids FOR SELECT USING (
  EXISTS (SELECT 1 FROM delivery_requests WHERE id = delivery_id AND requester_id = auth.uid())
);
CREATE POLICY "requester_update_bids" ON delivery_bids FOR UPDATE USING (
  EXISTS (SELECT 1 FROM delivery_requests WHERE id = delivery_id AND requester_id = auth.uid())
);
