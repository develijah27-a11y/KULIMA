# Supabase Setup Guide

This guide walks you through setting up Supabase for the Kulima AgriTech platform.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- A Supabase account (https://supabase.com)

## Installation

### 1. Install Supabase CLI

The Supabase CLI is required for local development and managing migrations.

**Option A: Install globally via npm**
```bash
npm install -g supabase
```

**Option B: Install globally via Homebrew (macOS/Linux)**
```bash
brew install supabase/tap/supabase
```

**Option C: Install via Scoop (Windows)**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Verify installation:**
```bash
supabase --version
```

### 2. Install Project Dependencies

From the project root:
```bash
npm install
```

This installs the Supabase JavaScript client and other dependencies.

## Local Development Setup

### 1. Start Supabase Locally

From the project root:
```bash
supabase start
```

This command:
- Starts PostgreSQL database (port 54322)
- Starts Supabase Studio UI (http://localhost:54323)
- Starts API Gateway (port 54321)
- Applies all migrations from `supabase/migrations/`

**First time setup**: This may take a few minutes to download Docker images.

### 2. Get Local Credentials

After starting Supabase, you'll see output like:
```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
anon key: eyJhbGc...
service_role key: eyJhbGc...
```

### 3. Configure Environment Variables

Create `.env.local` in the project root:
```bash
# Supabase Local Development
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key_from_supabase_start
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_supabase_start
```

**Important**: Use the keys from `supabase start` output for local development.

### 4. Verify Setup

1. **Check Supabase Studio**: Open http://localhost:54323
2. **View Tables**: Navigate to Table Editor - you should see all tables
3. **Run Tests**: `npm test` - all tests should pass
4. **Start Dev Server**: `npm run dev` - app should start without errors

## Production Setup

### 1. Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details:
   - Name: kulima-production (or your choice)
   - Database Password: Generate a strong password
   - Region: Choose closest to your users
4. Wait for project to be created (~2 minutes)

### 2. Get Production Credentials

From your Supabase project dashboard:

1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL**: Your API URL
   - **anon/public key**: For client-side use
   - **service_role key**: For server-side use (keep secret!)

### 3. Configure Production Environment

Set environment variables in your hosting platform (Vercel, Netlify, etc.):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Security**: Never commit these values to version control!

### 4. Link Local Project to Production

```bash
# Link to your production project
supabase link --project-ref your-project-ref

# Your project ref is in the URL: https://app.supabase.com/project/[project-ref]
```

### 5. Apply Migrations to Production

**IMPORTANT**: Always test in staging first!

```bash
# Push migrations to production
supabase db push
```

This applies all migrations from `supabase/migrations/` to production.

## Migration Management

### Checking Migration Status

**Local:**
```bash
# View applied migrations
supabase migration list
```

**Production:**
```sql
-- Connect to production database and run:
SELECT version, applied_at, description 
FROM schema_migrations 
ORDER BY version;
```

### Creating New Migrations

1. **Generate migration file:**
```bash
supabase migration new your_description
```

2. **Edit the generated file** in `supabase/migrations/`

3. **Test locally:**
```bash
# Reset and reapply all migrations
supabase db reset

# Or apply just the new migration
supabase migration up
```

4. **Verify in Supabase Studio**: Check tables, policies, indexes

5. **Document rollback plan** in `MIGRATIONS.md`

6. **Commit to version control**

7. **Apply to production:**
```bash
supabase db push
```

See `MIGRATIONS.md` for detailed migration workflow.

## Database Type Generation

Generate TypeScript types from your database schema:

**Local:**
```bash
supabase gen types typescript --local > src/lib/database.types.ts
```

**Production:**
```bash
supabase gen types typescript --project-id your-project-id > src/lib/database.types.ts
```

**Add to package.json:**
```json
{
  "scripts": {
    "generate:types": "supabase gen types typescript --local > src/lib/database.types.ts"
  }
}
```

Then run: `npm run generate:types`

## Common Issues

### Supabase CLI not found

**Solution**: Install Supabase CLI globally (see Installation section)

### Port already in use

**Solution**: Stop Supabase and restart
```bash
supabase stop
supabase start
```

### Migrations not applying

**Solution**: Reset database and reapply
```bash
supabase db reset
```

**Warning**: This destroys all local data!

### Docker not running

**Solution**: Supabase CLI requires Docker. Install Docker Desktop and ensure it's running.

### Connection refused errors

**Solution**: Ensure Supabase is running
```bash
supabase status
```

If not running:
```bash
supabase start
```

## Development Workflow

### Daily Development

1. **Start Supabase** (if not running):
```bash
supabase start
```

2. **Start dev server**:
```bash
npm run dev
```

3. **Make changes** to code

4. **Run tests**:
```bash
npm test
```

5. **Stop Supabase** when done:
```bash
supabase stop
```

### When Schema Changes

1. **Create migration**:
```bash
supabase migration new add_feature_x
```

2. **Edit migration file** in `supabase/migrations/`

3. **Apply migration**:
```bash
supabase db reset
```

4. **Regenerate types**:
```bash
npm run generate:types
```

5. **Update code** to use new schema

6. **Test thoroughly**

7. **Commit migration** and code changes

## Useful Commands

### Supabase CLI

```bash
# Start services
supabase start

# Stop services
supabase stop

# View status
supabase status

# Reset database (destroys data)
supabase db reset

# Create migration
supabase migration new description

# Apply migrations
supabase migration up

# Generate types
supabase gen types typescript --local > src/lib/database.types.ts

# Link to production
supabase link --project-ref your-ref

# Push to production
supabase db push
```

### Database Access

**Local Database:**
```bash
# Connection string
postgresql://postgres:postgres@localhost:54322/postgres

# Connect with psql
psql postgresql://postgres:postgres@localhost:54322/postgres
```

**Supabase Studio:**
- Local: http://localhost:54323
- Production: https://app.supabase.com/project/your-project-ref

## Security Best Practices

### Environment Variables

- ✅ Use `.env.local` for local development
- ✅ Use environment variables in production
- ✅ Never commit `.env.local` to version control
- ✅ Keep service role key secret (server-side only)
- ❌ Never expose service role key to client

### Row Level Security

- ✅ Always enable RLS on user-facing tables
- ✅ Test RLS policies with different users
- ✅ Use `auth.uid()` for user identification
- ❌ Never bypass RLS in client-side code

### Migrations

- ✅ Test migrations locally first
- ✅ Backup production before applying migrations
- ✅ Document rollback plans
- ❌ Never edit existing migration files

## Next Steps

1. ✅ Install Supabase CLI
2. ✅ Start Supabase locally
3. ✅ Configure `.env.local`
4. ✅ Verify setup (Studio, tests, dev server)
5. ✅ Read `MIGRATIONS.md` for migration workflow
6. ✅ Read `README.md` for directory overview
7. ✅ Start developing!

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Local Development Guide](https://supabase.com/docs/guides/cli/local-development)
- [Migration Guide](./MIGRATIONS.md)
- [Supabase Directory README](./README.md)

## Support

For issues or questions:

1. Check this guide and other documentation
2. Review Supabase documentation
3. Check GitHub issues
4. Ask the development team

---

**Last Updated**: 2024-01-01
**Maintained By**: Kulima Development Team
