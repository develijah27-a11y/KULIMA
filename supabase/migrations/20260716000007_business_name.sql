-- Lets a registered business (mostly agro dealers, but open to any role)
-- set a trading name distinct from the owner's personal full_name, so
-- receipts and buyer-facing listings can show "Kaggwa Agro Supplies" rather
-- than the individual account holder's own name.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
