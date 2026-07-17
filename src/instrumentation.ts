import type { Instrumentation } from 'next';

/**
 * Global safety net: catches uncaught errors from any route/server component
 * that isn't individually wrapped by withApiLogging (src/lib/system-log.ts),
 * and writes them to system_logs so a production break is visible on
 * /admin/logs instead of only in Vercel's own function logs. Runs in the
 * Node runtime only — the Supabase service-role client isn't edge-safe.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    const { logSystemEvent } = await import('@/lib/system-log');
    const message = err instanceof Error ? err.message : String(err);
    logSystemEvent({
      category: 'error',
      level: 'error',
      route: request.path,
      method: request.method,
      message,
      metadata: err instanceof Error && err.stack ? { stack: err.stack.slice(0, 2000) } : undefined,
    });
  } catch (loggingErr) {
    console.error('[instrumentation] failed to record request error:', loggingErr);
  }
};
