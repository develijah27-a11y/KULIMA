-- Migration: Create schema_migrations tracking table
-- Created: 2024-01-01
-- Requirements: R2.6 - Migration history tracking

-- ============================================================================
-- DESCRIPTION
-- ============================================================================
-- This migration creates the schema_migrations table to track which migrations
-- have been applied to the database. This provides an audit trail and helps
-- prevent duplicate migration applications.

-- ============================================================================
-- SCHEMA_MIGRATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT
);

-- Create index on applied_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_schema_migrations_applied_at 
ON schema_migrations(applied_at DESC);

-- Insert record for the initial schema migration
INSERT INTO schema_migrations (version, description)
VALUES 
    ('20240101000000', 'Initial schema with all core tables')
ON CONFLICT (version) DO NOTHING;

-- Insert record for this migration
INSERT INTO schema_migrations (version, description)
VALUES 
    ('20240101000001', 'Create schema_migrations tracking table')
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Uncomment to verify the migration was successful:

-- SELECT version, applied_at, description 
-- FROM schema_migrations 
-- ORDER BY version;
