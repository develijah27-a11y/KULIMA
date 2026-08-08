-- group_listings never had a photo column, so pooled listings could never
-- show buyers what the produce actually looks like — unlike individual
-- farmer/supplier listings, which already capture one at creation.
ALTER TABLE group_listings ADD COLUMN IF NOT EXISTS image_url TEXT;
