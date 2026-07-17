import { createServiceRoleClient } from '@/lib/supabase/server';

export type LogCategory = 'api_request' | 'error' | 'failed_payment' | 'auth_failure' | 'performance';
export type LogLevel = 'info' | 'warn' | 'error';

export interface SystemLogEntry {
  category: LogCategory;
  level?: LogLevel;
  route?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  userId?: string | null;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget write to system_logs. Logging must never be able to break
 * the request it's observing, so failures here are swallowed (and reported
 * to the server console, which Vercel already captures) rather than thrown.
 */
export function logSystemEvent(entry: SystemLogEntry): void {
  const admin = createServiceRoleClient();
  (admin.from as any)('system_logs')
    .insert({
      category: entry.category,
      level: entry.level ?? (entry.category === 'error' ? 'error' : 'info'),
      route: entry.route ?? null,
      method: entry.method ?? null,
      status_code: entry.statusCode ?? null,
      duration_ms: entry.durationMs ?? null,
      user_id: entry.userId ?? null,
      message: entry.message.slice(0, 500),
      metadata: entry.metadata ?? null,
    })
    .then(({ error }: { error: unknown }) => {
      if (error) console.error('[system-log] insert failed:', error);
    })
    .catch((err: unknown) => console.error('[system-log] insert threw:', err));
}

const SLOW_REQUEST_MS = 3000;

/**
 * Wraps an API route handler with request/error/performance logging to
 * system_logs, without changing what the handler returns. On a thrown error
 * it logs then re-throws — Next.js's own route machinery still produces the
 * same response it always would have, this just adds an observability side
 * effect around it.
 */
export function withApiLogging<Req extends Request, Args extends unknown[]>(
  route: string,
  handler: (req: Req, ...args: Args) => Promise<Response>
) {
  return async (req: Req, ...args: Args): Promise<Response> => {
    const start = Date.now();
    try {
      const res = await handler(req, ...args);
      const durationMs = Date.now() - start;

      logSystemEvent({
        category: 'api_request',
        level: res.status >= 500 ? 'error' : res.status >= 400 ? 'warn' : 'info',
        route,
        method: req.method,
        statusCode: res.status,
        durationMs,
        message: `${req.method} ${route} → ${res.status}`,
      });

      if (durationMs > SLOW_REQUEST_MS) {
        logSystemEvent({
          category: 'performance',
          level: 'warn',
          route,
          method: req.method,
          durationMs,
          message: `Slow request: ${durationMs}ms`,
        });
      }

      return res;
    } catch (err) {
      const durationMs = Date.now() - start;
      logSystemEvent({
        category: 'error',
        level: 'error',
        route,
        method: req.method,
        durationMs,
        message: err instanceof Error ? err.message : 'Unhandled error',
        metadata: err instanceof Error && err.stack ? { stack: err.stack.slice(0, 2000) } : undefined,
      });
      throw err;
    }
  };
}
