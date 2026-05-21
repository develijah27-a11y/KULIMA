-- Initial Schema Migration for Kulima AgriTech Platform
-- This migration creates all core tables with RLS policies, foreign keys, and triggers

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- Trigger
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FARMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS farms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    size_hectares DECIMAL(10, 2),
    farm_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_size CHECK (size_hectares IS NULL OR size_hectares > 0)
);

-- Enable RLS
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own farms"
    ON farms FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own farms"
    ON farms FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own farms"
    ON farms FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own farms"
    ON farms FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_farms_user_id ON farms(user_id);
CREATE INDEX idx_farms_created_at ON farms(created_at DESC);

-- Trigger
CREATE TRIGGER update_farms_updated_at
    BEFORE UPDATE ON farms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- CROPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS crops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    crop_name TEXT NOT NULL,
    variety TEXT,
    planting_date DATE,
    expected_harvest_date DATE,
    status TEXT DEFAULT 'planted',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_harvest_date CHECK (expected_harvest_date IS NULL OR planting_date IS NULL OR expected_harvest_date >= planting_date)
);

-- Enable RLS
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view crops from own farms"
    ON crops FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM farms
            WHERE farms.id = crops.farm_id
            AND farms.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert crops to own farms"
    ON crops FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM farms
            WHERE farms.id = crops.farm_id
            AND farms.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update crops in own farms"
    ON crops FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM farms
            WHERE farms.id = crops.farm_id
            AND farms.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete crops from own farms"
    ON crops FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM farms
            WHERE farms.id = crops.farm_id
            AND farms.user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_crops_farm_id ON crops(farm_id);
CREATE INDEX idx_crops_planting_date ON crops(planting_date DESC);

-- Trigger
CREATE TRIGGER update_crops_updated_at
    BEFORE UPDATE ON crops
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SOIL_REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS soil_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    ph_level DECIMAL(3, 1) NOT NULL,
    nitrogen DECIMAL(5, 2) NOT NULL,
    phosphorus DECIMAL(5, 2) NOT NULL,
    potassium DECIMAL(5, 2) NOT NULL,
    organic_matter DECIMAL(5, 2),
    recommendations TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_ph CHECK (ph_level >= 0 AND ph_level <= 14),
    CONSTRAINT valid_nitrogen CHECK (nitrogen >= 0),
    CONSTRAINT valid_phosphorus CHECK (phosphorus >= 0),
    CONSTRAINT valid_potassium CHECK (potassium >= 0)
);

-- Enable RLS
ALTER TABLE soil_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view soil reports from own farms"
    ON soil_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM farms
            WHERE farms.id = soil_reports.farm_id
            AND farms.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert soil reports to own farms"
    ON soil_reports FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM farms
            WHERE farms.id = soil_reports.farm_id
            AND farms.user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_soil_reports_farm_id ON soil_reports(farm_id);
CREATE INDEX idx_soil_reports_created_at ON soil_reports(created_at DESC);

-- ============================================================================
-- DISEASE_SCANS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS disease_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    crop_type TEXT NOT NULL,
    image_url TEXT NOT NULL,
    disease_detected TEXT,
    confidence_score DECIMAL(5, 2),
    treatment_recommendations TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_confidence CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100))
);

-- Enable RLS
ALTER TABLE disease_scans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view disease scans from own farms"
    ON disease_scans FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM farms
            WHERE farms.id = disease_scans.farm_id
            AND farms.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert disease scans to own farms"
    ON disease_scans FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM farms
            WHERE farms.id = disease_scans.farm_id
            AND farms.user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_disease_scans_farm_id ON disease_scans(farm_id);
CREATE INDEX idx_disease_scans_created_at ON disease_scans(created_at DESC);

-- ============================================================================
-- WEATHER_LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS weather_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    temperature DECIMAL(5, 2) NOT NULL,
    humidity DECIMAL(5, 2) NOT NULL,
    rainfall DECIMAL(6, 2) NOT NULL DEFAULT 0,
    wind_speed DECIMAL(5, 2),
    conditions TEXT,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_humidity CHECK (humidity >= 0 AND humidity <= 100),
    CONSTRAINT valid_rainfall CHECK (rainfall >= 0)
);

-- Enable RLS
ALTER TABLE weather_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view weather logs from own farms"
    ON weather_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM farms
            WHERE farms.id = weather_logs.farm_id
            AND farms.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert weather logs to own farms"
    ON weather_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM farms
            WHERE farms.id = weather_logs.farm_id
            AND farms.user_id = auth.uid()
        )
    );

-- Indexes
CREATE INDEX idx_weather_logs_farm_id ON weather_logs(farm_id);
CREATE INDEX idx_weather_logs_recorded_at ON weather_logs(recorded_at DESC);
CREATE INDEX idx_weather_logs_created_at ON weather_logs(created_at DESC);
