-- ============================================================================
-- MARKETPLACE ENHANCEMENTS
-- Run in Supabase SQL Editor
-- ============================================================================

-- 1. Extend offers table
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS counter_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS farmer_note   TEXT;

-- Add 'countered' to allowed status values
ALTER TABLE offers DROP CONSTRAINT IF EXISTS valid_offer_status;
ALTER TABLE offers ADD CONSTRAINT valid_offer_status
  CHECK (status IN ('pending','accepted','rejected','countered','completed'));

-- 2. Allow any authenticated user to view public profile info (needed for marketplace)
DROP POLICY IF EXISTS "Public profiles viewable" ON profiles;
CREATE POLICY "Public profiles viewable"
  ON profiles FOR SELECT
  USING (true);

-- 3. Allow buyers to view listings regardless of their own farmer_id
DROP POLICY IF EXISTS "Everyone can view active listings" ON listings;
CREATE POLICY "Everyone can view active listings"
  ON listings FOR SELECT
  USING (status = 'active' OR farmer_id IN (
    SELECT id FROM profiles WHERE user_id = auth.uid()
  ));
