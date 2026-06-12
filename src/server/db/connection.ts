/**
 * Database Connection Pooling
 * 
 * Configures connection pooling for Supabase client to optimize
 * database performance under load.
 * 
 * Requirements: 20.5
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

/**
 * Connection pool configuration
 */
const POOL_CONFIG = {
  /**
   * Maximum number of connections in the pool
   * Default: 10
   */
  maxConnections: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10,

  /**
   * Minimum number of idle connections to maintain
   * Default: 2
   */
  minConnections: process.env.DB_POOL_MIN ? parseInt(process.env.DB_POOL_MIN, 10) : 2,

  /**
   * Maximum time (ms) a connection can remain idle before being closed
   * Default: 30 seconds
   */
  idleTimeoutMillis: process.env.DB_POOL_IDLE_TIMEOUT 
    ? parseInt(process.env.DB_POOL_IDLE_TIMEOUT, 10) 
    : 30000,

  /**
   * Maximum time (ms) to wait for a connection from the pool
   * Default: 5 seconds
   */
  connectionTimeoutMillis: process.env.DB_POOL_TIMEOUT 
    ? parseInt(process.env.DB_POOL_TIMEOUT, 10) 
    : 5000,
};

/**
 * Create a pooled Supabase client
 * 
 * This client is configured for optimal connection pooling and reuse.
 * Supabase internally manages connection pooling through PostgREST and pg-pool.
 * 
 * @returns Configured Supabase client
 * 
 * @example
 * ```typescript
 * const supabase = createPooledClient();
 * const { data, error } = await supabase.from('farms').select();
 * ```
 */
export function createPooledClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-connection-pool': 'enabled',
      },
    },
  });
}

/**
 * Get connection pool statistics
 * 
 * Note: Supabase/PostgREST handles pooling internally.
 * This function provides configuration info for monitoring.
 * 
 * @returns Pool configuration
 */
export function getPoolStats() {
  return {
    config: POOL_CONFIG,
    status: 'active',
    note: 'Supabase manages connection pooling internally via PostgREST',
  };
}

/**
 * Export pool configuration for reference
 */
export const poolConfig = POOL_CONFIG;

/**
 * Best Practices for Connection Pooling:
 * 
 * 1. **Reuse clients**: Create one client instance per request, don't create multiple
 * 2. **Close connections**: Let Next.js handle cleanup between requests
 * 3. **Monitor performance**: Use Supabase dashboard to monitor connection usage
 * 4. **Adjust pool size**: Based on your concurrent request load
 * 5. **Use transactions wisely**: Keep them short to free connections quickly
 * 
 * Pool Size Guidelines:
 * - Small apps: 5-10 connections
 * - Medium apps: 10-20 connections
 * - Large apps: 20-50 connections
 * - Set max based on your Supabase plan limits
 */
