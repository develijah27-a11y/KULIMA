import crypto from 'crypto';

/**
 * Validates that an incoming HTTP request to a Cron endpoint
 * is authorized with the correct server-side CRON_SECRET.
 *
 * Prevents timing attacks and prevents bypass if CRON_SECRET is unconfigured.
 */
export function verifyCronAuth(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return false;
  }

  const authHeader = (
    req.headers.get('x-vercel-secret') ??
    req.headers.get('authorization') ??
    ''
  ).trim();

  const expected = `Bearer ${cronSecret}`;

  if (authHeader.length !== expected.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}
