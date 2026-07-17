import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

// A 4-digit PIN only has 10,000 possible values — scrypt's cost factor buys
// nothing against an offline guesser once the hash leaks, so the real
// defense is the rate limit applied at the call site (see /api/wallet/pin
// and the withdraw/transfer routes), not hash strength. This still avoids
// storing the PIN in a comparable plaintext-equivalent form at rest.
const KEYLEN = 32;

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, KEYLEN);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPin(pin: string, stored: string | null): boolean {
  if (!stored) return false;
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(pin, salt, KEYLEN);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}
