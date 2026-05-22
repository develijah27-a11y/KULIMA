# Database Migration Guide

## Overview

This document describes the database migration system for the Kulima AgriTech platform. All database schema changes must go through versioned migrations to ensure safety, traceability, and the ability to rollback changes if needed.

## Migration System Architecture

The migration system uses Supabase's built-in migration functionality with the following components:

- **Migration Files**: SQL files in `supabase/migrations/` directory
- **Migration Tracking**: `schema_migrations` table tracks applied migrations
- **Naming Convention**: `YYYYMMDDHHMMSS_description.sql` format
- **Rollback Plans**: Documented procedures to reverse each migration

## Migration Naming Convention

All migration files must follow this naming pattern:

```
YYYYMMDDHHMMSS_description.sql
```

**Components:**
- `YYYY`: 4-digit year (e.g., 2024)
- `MM`: 2-digit month (01-12)
- `DD`: 2-digit day (01-31)
- `HH`: 2-digit hour in 24-hour format (00-23)
- `MM`: 2-digit minute (00-59)
- `SS`: 2-digit second (00-59)
- `description`: Lowercase with underscores, describes the change

**Examples:**
- `20240101000000_initial_schema.sql`
- `20240102000000_add_indexes.sql`
- `20240115143000_add_crop_status_enum.sql`
- `20240120091500_add_user_preferences_table.sql`

## Migration File Structure

Each migration file should follow this structure:

```sql
-- Migration: [Brief description]
-- Created: [Date]
-- Author: [Your name]
-- Requirements: [Reference to requirements document]

-- ============================================================================
-- DESCRIPTION
-- ============================================================================
-- [Detailed description of what this migration does and why]

-- ============================================================================
-- CHANGES
-- ============================================================================

-- [Your SQL statements here]

-- Example:
CREATE TABLE example_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE example_table ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own records"
    ON example_table FOR SELECT
    USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_example_table_user_id ON example_table(user_id);
```

## Creating a New Migration

### Step 1: Generate Migration File

Use the Supabase CLI to create a new migration:

```bash
# Generate a new migration file with timestamp
supabase migration new description_of_change

# Example:
supabase migration new add_user_preferences
```

This creates a file like: `supabase/migrations/20240115143000_add_user_preferences.sql`

### Step 2: Write Migration SQL

Edit the generated file and add your SQL statements:

```sql
-- Add your schema changes
-- Include comments explaining the purpose
-- Follow the file structure template above
```

### Step 3: Document Rollback Plan

In this document (MIGRATIONS.md), add a rollback section for your migration:

```markdown
### Migration: 20240115143000_add_user_preferences.sql

**Purpose**: Add user preferences table for storing user settings

**Rollback Plan**:
```sql
DROP TABLE IF EXISTS user_preferences CASCADE;
```

**Verification**:
- Verify table exists: `SELECT * FROM user_preferences LIMIT 1;`
- Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'user_preferences';`
```

### Step 4: Test Migration Locally

```bash
# Reset local database (WARNING: Destroys all local data)
supabase db reset

# Or apply migrations incrementally
supabase migration up
```

### Step 5: Verify Migration

After applying the migration, verify:

1. **Schema Changes**: Check that tables, columns, indexes were created
2. **RLS Policies**: Verify Row Level Security is enabled and policies work
3. **Foreign Keys**: Test that relationships are enforced
4. **Constraints**: Verify CHECK constraints reject invalid data
5. **Triggers**: Test that triggers fire correctly

## Applying Migrations

### Local Development

```bash
# Apply all pending migrations
supabase migration up

# Reset database and reapply all migrations (destroys data)
supabase db reset
```

### Production

**IMPORTANT**: Never apply migrations directly to production without testing!

1. **Test in Staging**: Apply migration to staging environment first
2. **Backup Database**: Create a backup before applying migrations
3. **Apply Migration**: Use Supabase dashboard or CLI
4. **Verify**: Check that migration applied successfully
5. **Monitor**: Watch for errors or performance issues

```bash
# Link to production project
supabase link --project-ref your-project-ref

# Apply migrations to production
supabase db push
```

## Rolling Back Migrations

### When to Rollback

Rollback a migration if:
- Migration causes errors or data corruption
- Migration breaks application functionality
- Migration causes severe performance degradation
- Migration was applied to wrong environment

### Rollback Procedure

1. **Identify the Migration**: Find the migration version to rollback
2. **Find Rollback Plan**: Locate the rollback SQL in this document
3. **Create Rollback Migration**: Create a new migration with rollback SQL
4. **Test Rollback**: Test in local/staging environment first
5. **Apply Rollback**: Apply to production if needed

**Example Rollback Migration**:

```bash
# Create rollback migration
supabase migration new rollback_add_user_preferences
```

```sql
-- Rollback Migration: Revert 20240115143000_add_user_preferences.sql
-- This migration removes the user_preferences table

DROP TABLE IF EXISTS user_preferences CASCADE;
```

### Important Rollback Notes

- **Never edit existing migration files** - Always create a new migration to rollback
- **Test rollbacks** - Always test rollback procedures in staging first
- **Data loss** - Some rollbacks may cause data loss (e.g., dropping tables)
- **Dependencies** - Consider dependencies when rolling back (foreign keys, views, etc.)

## Migration Tracking

The `schema_migrations` table tracks which migrations have been applied:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT
);
```

**Query Applied Migrations**:

```sql
-- View all applied migrations
SELECT version, applied_at, description 
FROM schema_migrations 
ORDER BY version;

-- Check if specific migration is applied
SELECT EXISTS (
    SELECT 1 FROM schema_migrations 
    WHERE version = '20240101000000'
);
```

## Migration Best Practices

### Safety First

1. **Never drop tables** without explicit user approval and backup
2. **Never truncate data** in production migrations
3. **Never disable RLS** on user-facing tables
4. **Always use transactions** for complex migrations
5. **Always test locally** before applying to production

### Performance

1. **Use `CREATE INDEX CONCURRENTLY`** to avoid locking tables in production
2. **Add indexes in separate migrations** from table creation for large tables
3. **Batch large data migrations** to avoid long-running transactions
4. **Monitor query performance** after adding indexes

### Maintainability

1. **Keep migrations focused** - One logical change per migration
2. **Document thoroughly** - Explain why, not just what
3. **Reference requirements** - Link migrations to requirements document
4. **Version control** - Commit migrations with related code changes

### RLS and Security

1. **Always enable RLS** on tables containing user data
2. **Define explicit policies** for SELECT, INSERT, UPDATE, DELETE
3. **Test RLS policies** by attempting unauthorized access
4. **Use `auth.uid()`** to match authenticated user in policies

### Foreign Keys and Constraints

1. **Define ON DELETE behavior** explicitly (CASCADE or RESTRICT)
2. **Add CHECK constraints** for data validation
3. **Use NOT NULL** where appropriate
4. **Create indexes on foreign keys** for query performance

## Common Migration Patterns

### Adding a New Table

```sql
-- Create table
CREATE TABLE table_name (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own records"
    ON table_name FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
    ON table_name FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_table_name_user_id ON table_name(user_id);

-- Create updated_at trigger
CREATE TRIGGER update_table_name_updated_at
    BEFORE UPDATE ON table_name
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Adding a Column

```sql
-- Add column with default value
ALTER TABLE table_name 
ADD COLUMN new_column TEXT DEFAULT 'default_value';

-- Add NOT NULL constraint after backfilling data
ALTER TABLE table_name 
ALTER COLUMN new_column SET NOT NULL;
```

### Adding an Index

```sql
-- For production, use CONCURRENTLY to avoid locking
CREATE INDEX CONCURRENTLY idx_table_name_column 
ON table_name(column_name);

-- For local development, regular index is fine
CREATE INDEX idx_table_name_column 
ON table_name(column_name);
```

### Modifying RLS Policies

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "old_policy_name" ON table_name;

-- Create new policy
CREATE POLICY "new_policy_name"
    ON table_name FOR SELECT
    USING (auth.uid() = user_id);
```

### Adding Foreign Key

```sql
-- Add foreign key constraint
ALTER TABLE child_table
ADD CONSTRAINT fk_child_parent
FOREIGN KEY (parent_id)
REFERENCES parent_table(id)
ON DELETE CASCADE;

-- Create index on foreign key
CREATE INDEX idx_child_table_parent_id 
ON child_table(parent_id);
```

## Troubleshooting

### Migration Fails to Apply

1. **Check syntax errors**: Review SQL for typos or syntax issues
2. **Check dependencies**: Ensure referenced tables/columns exist
3. **Check constraints**: Verify existing data satisfies new constraints
4. **Check permissions**: Ensure database user has required permissions

### RLS Policies Not Working

1. **Verify RLS is enabled**: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'your_table';`
2. **Check policy definitions**: Ensure policies cover all operations (SELECT, INSERT, UPDATE, DELETE)
3. **Test with different users**: Verify policies work for different user contexts
4. **Check auth.uid()**: Ensure user is authenticated and auth.uid() returns correct value

### Performance Issues After Migration

1. **Check query plans**: Use `EXPLAIN ANALYZE` to identify slow queries
2. **Verify indexes**: Ensure indexes were created successfully
3. **Monitor table locks**: Check for long-running locks blocking queries
4. **Review RLS policies**: Complex RLS policies can impact performance

## Migration History and Rollback Plans

### 20240101000000_initial_schema.sql

**Purpose**: Create initial database schema with all core tables (profiles, farms, crops, soil_reports, disease_scans, weather_logs)

**Tables Created**:
- `profiles`: User profile information
- `farms`: Farm records owned by users
- `crops`: Crop records associated with farms
- `soil_reports`: Soil analysis reports for farms
- `disease_scans`: Disease detection scans for crops
- `weather_logs`: Weather data logs for farms

**Indexes Created**:
- All foreign key columns (user_id, farm_id) for efficient JOIN operations
- All timestamp columns (created_at, recorded_at, planting_date) for time-based queries
- Total of 12 indexes across all tables for optimal query performance

**Note**: All required performance indexes (Requirements R5.1-R5.6) are included in this initial migration. No separate index migration is needed. See `TASK_2.4_INDEX_VERIFICATION.md` for detailed index documentation.

**Rollback Plan**:
```sql
-- WARNING: This will destroy all data in these tables
DROP TABLE IF EXISTS weather_logs CASCADE;
DROP TABLE IF EXISTS disease_scans CASCADE;
DROP TABLE IF EXISTS soil_reports CASCADE;
DROP TABLE IF EXISTS crops CASCADE;
DROP TABLE IF EXISTS farms CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

**Verification**:
```sql
-- Verify all tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'farms', 'crops', 'soil_reports', 'disease_scans', 'weather_logs');

-- Verify RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'farms', 'crops', 'soil_reports', 'disease_scans', 'weather_logs');

-- Verify foreign keys exist
SELECT
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

---

## Additional Resources

- [Supabase Migration Documentation](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL ALTER TABLE Documentation](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)

## Questions or Issues?

If you encounter issues with migrations or need help:

1. Check this documentation first
2. Review the Supabase CLI documentation
3. Test in local environment before production
4. Create a backup before applying risky migrations
5. Ask for help from the team if unsure

---

**Last Updated**: 2024-01-01
**Maintained By**: Kulima Development Team
