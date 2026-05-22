-- Migration: 20250522000000_add_role_to_profiles
-- Created: 2025-05-22
-- Purpose: Add `role` column to profiles to support shared role-based dashboard system
--
-- Roles:
--   'farmer'   — Farmer dashboard  (default)
--   'buyer'    — Buyer dashboard
--   'supplier' — Supplier dashboard
--   'admin'    — Admin dashboard

-- Add role column with default
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'farmer';

-- Validate allowed role values
ALTER TABLE profiles
    ADD CONSTRAINT IF NOT EXISTS valid_profile_role
    CHECK (role IN ('farmer', 'buyer', 'supplier', 'admin'));

-- Add index for fast role lookups (used by dashboard router)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id_role
    ON profiles (user_id);

COMMENT ON COLUMN profiles.role IS 'User role for dashboard routing: farmer | buyer | supplier | admin';
