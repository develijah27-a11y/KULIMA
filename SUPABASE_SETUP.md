# Supabase Project Setup Documentation

## Overview

This document provides comprehensive information about the Supabase project configuration for the Kulima AgriTech platform.

## Project Details

### Supabase Project Information

- **Project URL**: `https://hjvnkintvjogwljchwcq.supabase.co`
- **Project Reference**: `hjvnkintvjogwljchwcq`
- **Region**: Auto-selected by Supabase
- **Database**: PostgreSQL 15+
- **Authentication**: Supabase Auth enabled

### Environment Variables

The following environment variables are configured in `.env.local`:

#### Client-Safe Variables (Can be exposed to browser)
```env
NEXT_PUBLIC_SUPABASE_URL=https://hjvnkintvjogwljchwcq.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Server-Only Variables (NEVER expose to client)
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Security Note**: The service role key bypasses Row Level Security (RLS) and should ONLY be used in server-side code. Never expose it to the client or commit it to version control.

## Installed Dependencies

### Production Dependencies

```json
{
  "@supabase/supabase-js": "^2.106.1",
  "@supabase/ssr": "^0.10.3"
}
```

#### @supabase/supabase-js
- **Purpose**: Core Supabase JavaScript client library
- **Version**: 2.106.1
- **Usage**: Provides methods for authentication, database queries, real-time subscriptions, and storage
- **Documentation**: https://supabase.com/docs/reference/javascript

#### @supabase/ssr
- **Purpose**: Server-Side Rendering utilities for Supabase
- **Version**: 0.10.3
- **Usage**: Provides cookie-based session management for Next.js App Router
- **Documentation**: https://supabase.com/docs/guides/auth/server-side/nextjs

## Supabase Client Configuration

### Client-Side Client (`src/lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../database.types';

export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
};
```

**Usage**: Use this client in React components and client-side code.

**Features**:
- Uses publishable (anon) key
- Respects Row Level Security (RLS)
- Persists session in browser storage
- Automatically refreshes tokens

### Server-Side Client (`src/lib/supabase/server.ts`)

```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '../database.types';

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle cookie setting errors
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Handle cookie removal errors
          }
        },
      },
    }
  );
};
```

**Usage**: Use this client in Server Components, API Routes, and Server Actions.

**Features**:
- Uses publishable key (respects RLS)
- Reads/writes session from/to cookies
- Works with Next.js App Router
- Supports server-side authentication

### Middleware Client (`src/lib/supabase/middleware.ts`)

Used in Next.js middleware for route protection and session management.

**Features**:
- Validates sessions on route access
- Refreshes expired tokens
- Redirects unauthenticated users

## Database Schema

### Tables

The following tables are defined in the initial migration (`supabase/migrations/20240101000000_initial_schema.sql`):

1. **profiles** - User profile information
2. **farms** - Farm records owned by users
3. **crops** - Crop records associated with farms
4. **soil_reports** - Soil analysis reports for farms
5. **disease_scans** - Disease detection scans for crops
6. **weather_logs** - Weather data logs for farms

### Row Level Security (RLS)

All user-facing tables have RLS enabled with policies that:
- Allow users to view only their own data
- Allow users to insert data only for their own records
- Allow users to update only their own data
- Allow users to delete only their own data

### Foreign Key Relationships

```
auth.users (Supabase Auth)
    ↓
profiles (user_id)
    ↓
farms (user_id)
    ↓
├── crops (farm_id)
├── soil_reports (farm_id)
├── disease_scans (farm_id)
└── weather_logs (farm_id)
```

## Environment Configuration Validation

The project includes environment variable validation in `src/config/env.ts`:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const env = validateEnv();
```

**Benefits**:
- Validates required environment variables at startup
- Provides clear error messages for missing/invalid variables
- Type-safe access to environment variables
- Prevents runtime errors due to misconfiguration

## Connection Verification

### Running Tests

To verify the Supabase connection is working correctly:

```bash
npm test -- src/lib/supabase/__tests__/connection.test.ts
```

### What the Tests Verify

1. ✅ Dependencies are installed (`@supabase/supabase-js`, `@supabase/ssr`)
2. ✅ Environment variables are configured correctly
3. ✅ Supabase client files exist and are properly structured
4. ✅ Connection to Supabase project is successful
5. ✅ Database tables are accessible
6. ✅ Migration files are present

## Database Type Generation

### Current Types

Database types are defined in `src/lib/database.types.ts` and provide TypeScript interfaces for all database tables.

### Regenerating Types

When the database schema changes, regenerate types using:

```bash
npx supabase gen types typescript --project-id hjvnkintvjogwljchwcq > src/lib/database.types.ts
```

**Note**: You'll need the Supabase CLI installed and authenticated.

### Installing Supabase CLI

```bash
npm install -g supabase
supabase login
```

## Security Best Practices

### ✅ DO

- Use the **publishable key** for client-side operations
- Use the **service role key** ONLY in server-side code (API routes, Server Actions)
- Always enable and test RLS policies
- Validate user input before database operations
- Use TypeScript types for type safety
- Keep `.env.local` in `.gitignore`

### ❌ DON'T

- Never expose the service role key to the client
- Never commit `.env.local` to version control
- Never bypass RLS unless absolutely necessary
- Never trust client-side data without validation
- Never use `SELECT *` in production (specify columns)

## Troubleshooting

### Connection Issues

If you encounter connection issues:

1. **Verify environment variables**:
   ```bash
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   ```

2. **Check Supabase project status**:
   - Visit https://supabase.com/dashboard
   - Ensure project is active and not paused

3. **Test connection manually**:
   ```typescript
   const { data, error } = await supabase.auth.getSession();
   console.log('Connection test:', { data, error });
   ```

### RLS Policy Issues

If queries return empty results unexpectedly:

1. **Check if user is authenticated**:
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('Current user:', user);
   ```

2. **Verify RLS policies in Supabase Dashboard**:
   - Go to Database → Tables → [table_name] → Policies
   - Ensure policies allow the operation you're attempting

3. **Test with service role key** (server-side only):
   - If it works with service role key, it's an RLS policy issue

### Type Errors

If you encounter TypeScript errors:

1. **Regenerate database types**:
   ```bash
   npx supabase gen types typescript --project-id hjvnkintvjogwljchwcq > src/lib/database.types.ts
   ```

2. **Restart TypeScript server** in your IDE

3. **Clear Next.js cache**:
   ```bash
   rm -rf .next
   npm run dev
   ```

## Additional Resources

- **Supabase Documentation**: https://supabase.com/docs
- **Next.js + Supabase Guide**: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- **Supabase Auth**: https://supabase.com/docs/guides/auth
- **Row Level Security**: https://supabase.com/docs/guides/auth/row-level-security
- **Supabase CLI**: https://supabase.com/docs/guides/cli

## Support

For issues specific to this project:
1. Check this documentation
2. Review the test results
3. Check Supabase Dashboard for project status
4. Review application logs

For Supabase-specific issues:
- Supabase Discord: https://discord.supabase.com
- Supabase GitHub: https://github.com/supabase/supabase
