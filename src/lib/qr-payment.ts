import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

// Signed, short-lived, single-use tokens that identify WHICH delivery a
// "pay nearby" QR code is for — nothing more. The token itself carries no
// payment authority: scanning it only ever reaches a confirm screen, and
// the actual charge always runs through the existing claim_delivery_payment
// RPC via /api/deliveries/pay, which recomputes the amount fresh from
// delivery_requests and never trusts anything client-supplied. Keeping the
// payload minimal (just enough to look the delivery back up) means a
// tampered/replayed token can't smuggle in a different amount or party —
// there's nothing sensitive in the payload to tamper with in the first
// place, everything that matters is re-verified server-side against the
// live DB row at scan time.

interface QrPayload {
  deliveryId: string;
  nonce: string;
  exp: number; // unix ms
}

function secret(): string {
  const s = process.env.QR_PAYMENT_SECRET;
  if (!s) throw new Error('QR_PAYMENT_SECRET is not configured');
  return s;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export function signQrToken(deliveryId: string, ttlMs: number): { token: string; nonce: string; expiresAt: Date } {
  const nonce = randomBytes(16).toString('hex');
  const exp = Date.now() + ttlMs;
  const payload: QrPayload = { deliveryId, nonce, exp };
  const payloadB64 = base64url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret()).update(payloadB64).digest('base64url');
  return { token: `${payloadB64}.${sig}`, nonce, expiresAt: new Date(exp) };
}

// Returns the payload only if the signature is valid and it hasn't expired
// — never throws on a bad token, since "invalid" is an expected, common
// outcome (stale screenshot, tampered value, genuine attack attempt), not
// an exceptional one.
export function verifyQrToken(token: string): QrPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;

  let expectedSig: string;
  try {
    expectedSig = createHmac('sha256', secret()).update(payloadB64).digest('base64url');
  } catch {
    return null;
  }

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;

  let payload: QrPayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (typeof payload.deliveryId !== 'string' || typeof payload.nonce !== 'string' || typeof payload.exp !== 'number') return null;
  if (Date.now() > payload.exp) return null;

  return payload;
}
