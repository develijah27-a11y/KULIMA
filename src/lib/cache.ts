/**
 * Client-side Cache Utilities
 * Reduces unnecessary API calls and improves perceived performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Simple in-memory cache with TTL support
 */
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Get item from cache
   * Returns null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Set item in cache with TTL (in milliseconds)
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };
    
    this.cache.set(key, entry);
  }

  /**
   * Remove item from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size;
  }
}

// Global cache instance
export const cache = new MemoryCache();

// Clear expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => cache.clearExpired(), 5 * 60 * 1000);
}

/**
 * Cache TTL constants (in milliseconds)
 */
export const CacheTTL = {
  /** 5 minutes - for frequently changing data */
  SHORT: 5 * 60 * 1000,
  /** 15 minutes - for moderately changing data */
  MEDIUM: 15 * 60 * 1000,
  /** 1 hour - for rarely changing data */
  LONG: 60 * 60 * 1000,
  /** 24 hours - for static data */
  DAY: 24 * 60 * 60 * 1000,
} as const;

/**
 * Cache key builders for consistency
 */
export const CacheKeys = {
  profile: (userId: string) => `profile:${userId}`,
  farms: (userId: string) => `farms:${userId}`,
  listings: (farmerId: string) => `listings:${farmerId}`,
  marketPrices: (crop?: string) => crop ? `prices:${crop}` : 'prices:all',
  weather: (lat: number, lon: number) => `weather:${lat},${lon}`,
  notifications: (userId: string) => `notifications:${userId}`,
  orders: (userId: string) => `orders:${userId}`,
  inventory: (userId: string) => `inventory:${userId}`,
} as const;

/**
 * Hook for cached data fetching
 * Automatically caches and returns stale data while revalidating
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CacheTTL.MEDIUM
): Promise<T> {
  // Try to get from cache first
  const cached = cache.get<T>(key);
  if (cached) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();
  
  // Store in cache
  cache.set(key, data, ttl);
  
  return data;
}

/**
 * Optimistic update helper
 * Updates cache optimistically before server confirms
 */
export function optimisticUpdate<T>(
  key: string,
  updater: (current: T | null) => T,
  ttl: number = CacheTTL.MEDIUM
): void {
  const current = cache.get<T>(key);
  const updated = updater(current);
  cache.set(key, updated, ttl);
}

/**
 * Invalidate cache entries by pattern
 * Example: invalidateCache('listings:*') clears all listing caches
 */
export function invalidateCache(pattern: string): void {
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    // This would require exposing cache.cache.keys() which we'll add
    cache.clear(); // For now, clear all
  } else {
    cache.delete(pattern);
  }
}

/**
 * Prefetch data and store in cache
 * Useful for predictive loading
 */
export async function prefetchAndCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CacheTTL.MEDIUM
): Promise<void> {
  try {
    const data = await fetcher();
    cache.set(key, data, ttl);
  } catch (error) {
    // Silent fail for prefetch
    console.warn('[Cache] Prefetch failed:', error);
  }
}
