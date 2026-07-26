/**
 * Sliding-window in-process rate limiter.
 *
 * Exports two APIs:
 *
 * 1. Legacy API (used by existing route handlers):
 *      rateLimit(key, limit, windowSecs) → Promise<boolean>
 *    Returns true if allowed, false if rate limited.
 *
 * 2. Middleware API (used by src/proxy.ts):
 *      checkRateLimit(key, options) → RateLimitResult
 *      rateLimitedResponse(resetAt)  → Response
 *
 * Both share the same underlying bucket store so limits are coherent
 * across the two call sites within a single process.
 *
 * Limitations:
 * - Per-process only — state is not shared across multiple serverless
 *   instances. Acceptable for MVP launch; swap for Upstash Redis before
 *   horizontal scale-out.
 */

interface Bucket {
  timestamps: number[];
  lastAccess: number;
}

const store = new Map<string, Bucket>();

// Prune stale buckets every 5 minutes to prevent unbounded growth.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - 5 * 60 * 1000;
    for (const [key, bucket] of store.entries()) {
      if (bucket.lastAccess < cutoff) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

// ── Core sliding-window logic ─────────────────────────────────────────────────

function slidingWindow(
  bucketKey: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let bucket = store.get(bucketKey);
  if (!bucket) {
    bucket = { timestamps: [], lastAccess: now };
    store.set(bucketKey, bucket);
  }

  bucket.timestamps = bucket.timestamps.filter(ts => ts > windowStart);
  bucket.lastAccess = now;

  const resetAt = (bucket.timestamps[0] ?? now) + windowMs;

  if (bucket.timestamps.length >= limit) {
    return { allowed: false, remaining: 0, resetAt };
  }

  bucket.timestamps.push(now);
  return { allowed: true, remaining: limit - bucket.timestamps.length, resetAt };
}

// ── Legacy API ────────────────────────────────────────────────────────────────
// Used by: wallet/deposit, wallet/withdraw, wallet/transfer, wallet/pin,
//          consultations, deliveries/pay, and any other existing route.
// Signature: rateLimit(key, limit, windowSecs) → Promise<boolean>

export async function rateLimit(
  key: string,
  limit: number,
  windowSecs: number,
): Promise<boolean> {
  const { allowed } = slidingWindow(key, limit, windowSecs * 1000);
  return allowed;
}

// ── Middleware API ────────────────────────────────────────────────────────────
// Used by src/proxy.ts to check limits before session auth.

export interface RateLimitOptions {
  windowMs?: number;
  limit?: number;
  prefix?: string;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions = {},
): RateLimitResult {
  const { windowMs = 60_000, limit = 60, prefix = 'mw' } = options;
  const { allowed, remaining, resetAt } = slidingWindow(`${prefix}:${key}`, limit, windowMs);
  return { success: allowed, remaining, resetAt };
}

export function rateLimitedResponse(resetAt: number): Response {
  const retryAfterSecs = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please slow down and try again shortly.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSecs),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      },
    },
  );
}

// ── Convenience helper (optional, for new routes) ────────────────────────────
// Usage: const limited = rateLimitRequest(request, { limit: 20 });
//        if (limited) return limited;

export function getClientIp(request: Request): string {
  const h = request.headers as Headers;
  return (
    h.get('cf-connecting-ip') ??
    h.get('x-real-ip') ??
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '127.0.0.1'
  );
}

export function rateLimitRequest(
  request: Request,
  options: RateLimitOptions = {},
): Response | null {
  const ip = getClientIp(request);
  const result = checkRateLimit(ip, options);
  if (!result.success) return rateLimitedResponse(result.resetAt);
  return null;
}
