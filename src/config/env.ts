import { z } from 'zod';

/**
 * Environment variable schema with validation rules
 * Validates all required environment variables at application startup
 * 
 * Client-safe variables (NEXT_PUBLIC_*):
 * - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL
 * - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Supabase publishable (anon) key
 * 
 * Server-only variables (NEVER exposed to client):
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key (bypasses RLS)
 * - DATABASE_URL: Direct PostgreSQL connection string
 * 
 * Application variables:
 * - NODE_ENV: Application environment (development, production, test)
 * - LOG_LEVEL: Logging level (debug, info, warn, error)
 */
const envSchema = z.object({
  // Supabase (Client-Safe)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'Supabase publishable key is required'),

  // Supabase (Server-Only)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  DATABASE_URL: z.string().url('Invalid DATABASE_URL').optional(),

  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

/**
 * Validated environment variables
 * Type-safe access to all environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables against the schema
 * Throws descriptive error if validation fails
 * 
 * @throws {Error} When required environment variables are missing or invalid
 * @returns {Env} Validated environment variables
 */
function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:');
    if (error instanceof z.ZodError) {
      error.issues.forEach((err) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Environment validation failed. Please check your .env.local file against .env.example');
  }
}

/**
 * Validated and type-safe environment variables
 * Automatically validated at module import time
 * 
 * Usage:
 * ```typescript
 * import { env } from '@/config/env';
 * 
 * const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
 * const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY; // Server-only!
 * ```
 */
export const env = validateEnv();
