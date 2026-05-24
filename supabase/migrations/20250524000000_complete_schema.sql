-- ============================================================================
-- COMPLETE SCHEMA MIGRATION — Kulima AgriTech Platform
-- Run this in Supabase SQL Editor to bring live DB up to date
-- Date: 2025-05-24
-- ============================================================================

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO PROFILES
-- ============================================================================
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'farmer',
    ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7),
    ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7),
    ADD COLUMN IF NOT EXISTS primary_crop TEXT;

ALTER TABLE profiles
    DROP CONSTRAINT IF EXISTS valid_profile_role;

ALTER TABLE profiles
    ADD CONSTRAINT valid_profile_role
    CHECK (role IN ('farmer', 'buyer', 'supplier', 'admin'));

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);

-- ============================================================================
-- 2. LISTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    crop_type TEXT NOT NULL,
    quantity_kg DECIMAL(10, 2) NOT NULL,
    asking_price DECIMAL(10, 2) NOT NULL,
    available_from DATE NOT NULL,
    district TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_listing_status CHECK (status IN ('active', 'sold', 'expired', 'pending_sync')),
    CONSTRAINT valid_quantity CHECK (quantity_kg > 0),
    CONSTRAINT valid_price CHECK (asking_price > 0)
);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can manage own listings"
    ON listings FOR ALL
    USING (farmer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Everyone can view active listings"
    ON listings FOR SELECT
    USING (status = 'active');

CREATE INDEX IF NOT EXISTS idx_listings_farmer_id ON listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_district ON listings(district);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);

CREATE OR REPLACE TRIGGER update_listings_updated_at
    BEFORE UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. OFFERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    offered_price DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_offer_status CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
    CONSTRAINT valid_offered_price CHECK (offered_price > 0)
);

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can create and view own offers"
    ON offers FOR ALL
    USING (buyer_id = auth.uid());

CREATE POLICY "Farmers can view offers on their listings"
    ON offers FOR SELECT
    USING (
        listing_id IN (
            SELECT id FROM listings
            WHERE farmer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    );

CREATE POLICY "Farmers can update offer status"
    ON offers FOR UPDATE
    USING (
        listing_id IN (
            SELECT id FROM listings
            WHERE farmer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    );

CREATE INDEX IF NOT EXISTS idx_offers_listing_id ON offers(listing_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer_id ON offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_created_at ON offers(created_at DESC);

-- ============================================================================
-- 4. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_notification_type CHECK (type IN ('rain', 'price', 'pest', 'offer', 'loan', 'system'))
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (farmer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (farmer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_notifications_farmer_id ON notifications(farmer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- 5. MARKET_PRICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS market_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop_type TEXT NOT NULL,
    price_per_kg DECIMAL(10, 2) NOT NULL,
    market_name TEXT NOT NULL,
    district TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_percent DECIMAL(5, 2),
    CONSTRAINT valid_market_price CHECK (price_per_kg > 0)
);

ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view market prices"
    ON market_prices FOR SELECT
    USING (TRUE);

CREATE POLICY "Admins can manage market prices"
    ON market_prices FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE INDEX IF NOT EXISTS idx_market_prices_crop_type ON market_prices(crop_type);
CREATE INDEX IF NOT EXISTS idx_market_prices_district ON market_prices(district);
CREATE INDEX IF NOT EXISTS idx_market_prices_recorded_at ON market_prices(recorded_at DESC);

-- ============================================================================
-- 6. WEATHER_CACHE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS weather_cache (
    location_key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read weather cache"
    ON weather_cache FOR SELECT
    USING (TRUE);

CREATE POLICY "Service role can manage weather cache"
    ON weather_cache FOR ALL
    USING (TRUE);

-- ============================================================================
-- 7. LOAN_PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS loan_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending_review',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(farmer_id),
    CONSTRAINT valid_loan_status CHECK (status IN ('pending_review', 'approved', 'rejected')),
    CONSTRAINT valid_score CHECK (score >= 0)
);

ALTER TABLE loan_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view own loan profile"
    ON loan_profiles FOR SELECT
    USING (farmer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage loan profiles"
    ON loan_profiles FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
    );

CREATE INDEX IF NOT EXISTS idx_loan_profiles_farmer_id ON loan_profiles(farmer_id);
CREATE INDEX IF NOT EXISTS idx_loan_profiles_status ON loan_profiles(status);

-- ============================================================================
-- 8. DIAGNOSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS diagnoses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    disease_name TEXT NOT NULL,
    severity TEXT NOT NULL,
    treatment TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high'))
);

ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can view own diagnoses"
    ON diagnoses FOR SELECT
    USING (farmer_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Service role can insert diagnoses"
    ON diagnoses FOR INSERT
    WITH CHECK (TRUE);

CREATE INDEX IF NOT EXISTS idx_diagnoses_farmer_id ON diagnoses(farmer_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_created_at ON diagnoses(created_at DESC);

-- ============================================================================
-- 9. AUTO-CREATE PROFILE ON SIGNUP (Auth trigger)
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'farmer')
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
