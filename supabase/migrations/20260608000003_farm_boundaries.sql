-- Add boundary and additional fields to farms table
ALTER TABLE farms ADD COLUMN IF NOT EXISTS boundary     JSONB;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS district     TEXT;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS description  TEXT;
ALTER TABLE farms ADD COLUMN IF NOT EXISTS crop_types   TEXT[];
ALTER TABLE farms ADD COLUMN IF NOT EXISTS is_active    BOOLEAN NOT NULL DEFAULT true;

-- Index for spatial queries
CREATE INDEX IF NOT EXISTS idx_farms_user_id ON farms(user_id);
CREATE INDEX IF NOT EXISTS idx_farms_district ON farms(district);

-- Public read policy for admin
CREATE POLICY "admins_view_all_farms" ON farms FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin')
);
