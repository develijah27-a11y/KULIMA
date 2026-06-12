# Database Migrations Guide

## Overview

All database schema changes must go through versioned migrations. This ensures consistency across environments and provides rollback capabilities.

## Migration Naming Convention

Format: `YYYYMMDDHHMMSS_description.sql`

Example: `20240115103000_add_email_verification.sql`

## Creating Migrations

```bash
# Create new migration file
supabase migration new add_email_verification

# This creates: supabase/migrations/[timestamp]_add_email_verification.sql
```

## Migration Template

```sql
-- Migration: [Brief description]
-- Created: [Date]
-- Author: [Your name]
--
-- Description:
-- [Detailed description of changes]
--
-- Rollback Plan:
-- [SQL commands to undo this migration]

-- Your migration SQL here
ALTER TABLE profiles ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;

-- Indexes (use CONCURRENTLY for production)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email_verified 
ON profiles(email_verified);
```

## Running Migrations

### Locally

```bash
# Apply all pending migrations
supabase db push

# Reset database and reapply all migrations
supabase db reset

# Generate TypeScript types after migration
npm run generate:types
```

### Production

```bash
# Connect to production
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push

# Verify migration applied
supabase migration list
```

## Rollback Procedures

If a migration causes issues:

### 1. Immediate Rollback

```sql
-- Run the rollback SQL from migration comments
-- Example from above:
ALTER TABLE profiles DROP COLUMN email_verified;
```

### 2. Create Rollback Migration

```bash
# Create new migration to undo changes
supabase migration new rollback_email_verification
```

```sql
-- Migration: Rollback email verification feature
-- Rollback of: 20240115103000_add_email_verification.sql

DROP INDEX IF EXISTS idx_profiles_email_verified;
ALTER TABLE profiles DROP COLUMN IF EXISTS email_verified;
```

## Best Practices

### 1. Atomic Changes
✅ **DO**: One logical change per migration
❌ **DON'T**: Bundle unrelated changes

### 2. Safety Checks
```sql
-- Always use IF EXISTS / IF NOT EXISTS
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN;
CREATE INDEX IF NOT EXISTS idx_name ON table(column);
DROP TABLE IF EXISTS old_table;
```

### 3. Non-Breaking Changes
When possible, make changes backward compatible:

```sql
-- ✅ Add nullable column (non-breaking)
ALTER TABLE profiles ADD COLUMN phone_verified BOOLEAN;

-- ✅ Add column with default (non-breaking)
ALTER TABLE profiles ADD COLUMN status TEXT DEFAULT 'active';

-- ❌ Add NOT NULL column without default (BREAKING)
-- ALTER TABLE profiles ADD COLUMN required_field TEXT NOT NULL;

-- ✅ Instead, do it in steps:
ALTER TABLE profiles ADD COLUMN required_field TEXT DEFAULT 'default_value';
-- Wait for app deployment
ALTER TABLE profiles ALTER COLUMN required_field SET NOT NULL;
```

### 4. Production-Safe Indexes

```sql
-- ❌ Don't use blocking index creation
-- CREATE INDEX idx_name ON table(column);

-- ✅ Use CONCURRENTLY (doesn't lock table)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_name ON table(column);
```

### 5. Data Migrations

For data transformations:

```sql
-- Wrap in transaction
BEGIN;

-- Update data
UPDATE profiles SET status = 'active' WHERE status IS NULL;

-- Verify
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count FROM profiles WHERE status IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Data migration failed: % rows still null', null_count;
  END IF;
END $$;

COMMIT;
```

## RLS Policy Migrations

### Adding Policies

```sql
-- Enable RLS if not already enabled
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can view own farms"
ON farms FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Rollback:
-- DROP POLICY IF EXISTS "Users can view own farms" ON farms;
```

### Modifying Policies

```sql
-- Drop old policy
DROP POLICY IF EXISTS "old_policy_name" ON table_name;

-- Create new policy
CREATE POLICY "new_policy_name"
ON table_name FOR SELECT
TO authenticated
USING (new_condition);
```

## Testing Migrations

### Checklist

- [ ] Migration runs without errors
- [ ] Rollback SQL tested and works
- [ ] No data loss occurs
- [ ] Application still works after migration
- [ ] RLS policies still enforce security
- [ ] Indexes created successfully
- [ ] Foreign keys maintained
- [ ] Types regenerated: `npm run generate:types`

### Testing Locally

```bash
# 1. Backup current state
supabase db dump -f backup.sql

# 2. Apply migration
supabase db push

# 3. Test application
npm run dev
# Manually test affected features

# 4. Test rollback
# Run rollback SQL from migration

# 5. Verify rollback worked
# Check database state

# 6. Reapply migration
supabase db push

# 7. Generate types
npm run generate:types
```

## Common Migration Patterns

### Add Column

```sql
-- Add nullable column
ALTER TABLE profiles ADD COLUMN bio TEXT;

-- Add column with default
ALTER TABLE profiles ADD COLUMN created_by TEXT DEFAULT 'system';

-- Add NOT NULL column (two-step process)
-- Step 1: Add with default
ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
-- Step 2: After deployment, make NOT NULL
ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;
```

### Rename Column

```sql
-- Rename column
ALTER TABLE profiles RENAME COLUMN full_name TO display_name;

-- Update dependent objects (views, functions, etc.)
-- Add them here
```

### Add Foreign Key

```sql
-- Add foreign key
ALTER TABLE crops 
ADD CONSTRAINT fk_crops_farm 
FOREIGN KEY (farm_id) 
REFERENCES farms(id) 
ON DELETE CASCADE;
```

### Create Table

```sql
CREATE TABLE IF NOT EXISTS email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_email_verifications_token ON email_verifications(token);
CREATE INDEX idx_email_verifications_user_id ON email_verifications(user_id);

-- Enable RLS
ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view own verifications"
ON email_verifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());
```

## Migration History

Track applied migrations:

```bash
# List all migrations
supabase migration list

# Check migration status
supabase migration list --database postgres://...
```

## Troubleshooting

### Migration Failed

1. Check error message for specific issue
2. Fix SQL in migration file
3. Reset local database: `supabase db reset`
4. Reapply: `supabase db push`

### Type Generation Fails

```bash
# Manually regenerate types
supabase gen types typescript --local > src/lib/database.types.ts
```

### RLS Policy Errors

```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';

-- Drop all policies on table
DROP POLICY IF EXISTS "policy_name" ON table_name;
```

## Emergency Procedures

### Critical Production Issue

1. **Assess impact** - How many users affected?
2. **Rollback immediately** if data integrity at risk
3. **Communicate** with team
4. **Execute rollback** SQL
5. **Verify** application works
6. **Post-mortem** - Document what happened

### Rollback Steps

```bash
# 1. Connect to production
supabase link --project-ref your-project-ref

# 2. Run rollback SQL via SQL Editor or CLI
supabase db execute "ALTER TABLE profiles DROP COLUMN problematic_column;"

# 3. Verify
supabase db execute "SELECT * FROM profiles LIMIT 1;"

# 4. Document incident
```

## Resources

- [Supabase Migration Docs](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
