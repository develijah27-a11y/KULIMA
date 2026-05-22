# Supabase Directory

This directory contains all Supabase-related configuration and database migrations for the Kulima AgriTech platform.

## Directory Structure

```
supabase/
├── config.toml                    # Supabase project configuration
├── migrations/                    # Database migration files
│   ├── 20240101000000_initial_schema.sql
│   ├── 20240101000001_create_schema_migrations.sql
│   └── ...
├── MIGRATIONS.md                  # Migration guide and documentation
├── README.md                      # This file
└── seed.sql                       # (Optional) Seed data for development
```

## Files Overview

### config.toml

The main Supabase configuration file that defines:
- **Project ID**: Links to your Supabase project
- **API Settings**: Port, schemas, and API configuration
- **Database Settings**: PostgreSQL version and port
- **Studio Settings**: Supabase Studio UI configuration
- **Auth Settings**: Authentication configuration

**Important**: This file is committed to version control. Do not store secrets here.

### migrations/

Contains versioned SQL migration files that define the database schema. All schema changes must go through migrations.

**Key Points**:
- Migrations are applied in chronological order based on filename timestamp
- Never edit existing migration files - create new ones to modify schema
- Each migration should be focused on a single logical change
- See `MIGRATIONS.md` for detailed migration workflow

### MIGRATIONS.md

Comprehensive guide covering:
- Migration naming conventions
- How to create, apply, and rollback migrations
- Migration best practices
- Rollback plans for each migration
- Common migration patterns
- Troubleshooting guide

**Read this before creating your first migration!**

## Quick Start

### Prerequisites

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Ensure you have the required environment variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Local Development Setup

1. **Start Supabase locally**:
```bash
supabase start
```

This starts:
- PostgreSQL database (port 54322)
- Supabase Studio (http://localhost:54323)
- API Gateway (port 54321)

2. **Apply migrations**:
```bash
# Apply all pending migrations
supabase migration up

# Or reset database and reapply all migrations
supabase db reset
```

3. **Access Supabase Studio**:
Open http://localhost:54323 in your browser to:
- View tables and data
- Test SQL queries
- Manage RLS policies
- View API documentation

### Creating a New Migration

1. **Generate migration file**:
```bash
supabase migration new your_migration_description
```

2. **Edit the generated file** in `supabase/migrations/`

3. **Apply the migration locally**:
```bash
supabase migration up
```

4. **Test thoroughly** before committing

5. **Document rollback plan** in `MIGRATIONS.md`

See `MIGRATIONS.md` for detailed instructions.

## Database Schema

The Kulima platform uses the following core tables:

### Core Tables

1. **profiles**: User profile information
   - Links to `auth.users` via `user_id`
   - Stores full name, phone, location

2. **farms**: Farm records owned by users
   - Links to `auth.users` via `user_id`
   - Stores farm name, location, size, type

3. **crops**: Crop records associated with farms
   - Links to `farms` via `farm_id`
   - Stores crop details, planting dates, status

4. **soil_reports**: Soil analysis reports
   - Links to `farms` via `farm_id`
   - Stores pH, NPK values, recommendations

5. **disease_scans**: Disease detection scans
   - Links to `farms` via `farm_id`
   - Stores crop images, detection results

6. **weather_logs**: Weather data logs
   - Links to `farms` via `farm_id`
   - Stores temperature, humidity, rainfall

### System Tables

- **schema_migrations**: Tracks applied migrations

### Security

All user-facing tables have:
- **Row Level Security (RLS)** enabled
- **RLS Policies** that restrict access to user's own data
- **Foreign key constraints** for referential integrity
- **CHECK constraints** for data validation

## Common Commands

### Local Development

```bash
# Start Supabase services
supabase start

# Stop Supabase services
supabase stop

# View service status
supabase status

# Reset database (destroys all data)
supabase db reset

# Apply pending migrations
supabase migration up

# Generate TypeScript types from schema
supabase gen types typescript --local > ../src/lib/database.types.ts
```

### Production

```bash
# Link to production project
supabase link --project-ref your-project-ref

# Push migrations to production
supabase db push

# Generate types from production schema
supabase gen types typescript --project-id your-project-id > ../src/lib/database.types.ts
```

## Migration Workflow

### Development Workflow

1. **Create migration** locally
2. **Test migration** with `supabase db reset`
3. **Verify schema changes** in Supabase Studio
4. **Test application** with new schema
5. **Document rollback plan** in `MIGRATIONS.md`
6. **Commit migration** to version control
7. **Apply to staging** environment
8. **Test in staging** thoroughly
9. **Apply to production** with backup

### Production Deployment

**CRITICAL**: Never apply untested migrations to production!

1. **Backup database** before applying migrations
2. **Test in staging** environment first
3. **Review rollback plan** before applying
4. **Apply during maintenance window** if possible
5. **Monitor application** after deployment
6. **Be ready to rollback** if issues occur

## Troubleshooting

### Supabase won't start

```bash
# Stop all services
supabase stop

# Remove volumes and restart
supabase stop --no-backup
supabase start
```

### Migration fails to apply

1. Check SQL syntax in migration file
2. Verify dependencies (tables, columns) exist
3. Check for constraint violations with existing data
4. Review error message carefully

### RLS policies not working

1. Verify RLS is enabled: Check in Supabase Studio
2. Test policies with different users
3. Check `auth.uid()` returns correct value
4. Review policy definitions for logic errors

### Type generation fails

```bash
# Ensure Supabase is running
supabase status

# Try generating types again
supabase gen types typescript --local > ../src/lib/database.types.ts
```

## Best Practices

### Migrations

- ✅ Keep migrations focused and atomic
- ✅ Test locally before committing
- ✅ Document rollback plans
- ✅ Use descriptive migration names
- ✅ Include comments in SQL
- ❌ Never edit existing migrations
- ❌ Never drop tables without backup
- ❌ Never disable RLS on user tables

### Security

- ✅ Always enable RLS on user-facing tables
- ✅ Define explicit policies for all operations
- ✅ Test policies with different user contexts
- ✅ Use `auth.uid()` for user identification
- ❌ Never bypass RLS in client-side code
- ❌ Never expose service role key to client

### Performance

- ✅ Create indexes on foreign keys
- ✅ Create indexes on frequently queried columns
- ✅ Use `CREATE INDEX CONCURRENTLY` in production
- ✅ Monitor query performance
- ❌ Don't over-index (impacts write performance)

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Migration Guide](./MIGRATIONS.md)

## Support

For issues or questions:

1. Check this README and `MIGRATIONS.md`
2. Review Supabase documentation
3. Check application logs
4. Ask the development team

---

**Last Updated**: 2024-01-01
**Maintained By**: Kulima Development Team
