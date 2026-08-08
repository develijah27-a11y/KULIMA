// No-ops silently if SMS isn't configured yet (UGSMS_API_KEY not set) —
// same degrade pattern as lib/email.ts, so the rest of the app never
// depends on SMS actually having been wired up.
//
// Provider: UgSMS (https://ugsms.com), base URL https://ugsms.com/v1.
// POST /sms/send takes { numbers, message_body } — numbers is a
// comma-separated list, no leading '+' (Uganda local 0XXXXXXXXX or
// 256XXXXXXXXX both accepted per their docs). Auth: UgSMS supports both
// username/password and an API key as "the preferred alternative... for
// better rotation and scoping" (their integration docs), but the exact
// header/param name for key-based auth isn't published anywhere public —
// sent as a Bearer token (the standard convention for a prefixed key like
// this one) AND as an `api_key` form field, so it works either way the
// provider actually expects it. If sends still fail, check the logged
// response body (UgSMS returns a JSON error) rather than guessing again.
const apiKey = process.env.UGSMS_API_KEY;
const BASE_URL = 'https://ugsms.com/v1/sms/send';

function toLocalUg(raw: string): string {
  const digits = raw.replace(/\s+/g, '');
  if (digits.startsWith('+256')) return `0${digits.slice(4)}`;
  if (digits.startsWith('256')) return `0${digits.slice(3)}`;
  return digits;
}

export async function sendSms(to: string, message: string) {
  if (!apiKey) {
    console.warn('[sendSms] Not configured (UGSMS_API_KEY missing) — skipped:', message);
    return { skipped: true as const };
  }
  try {
    const body = new URLSearchParams({
      numbers: toLocalUg(to),
      message_body: message,
      api_key: apiKey,
    });
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    });
    const text = await res.text();
    if (!res.ok) {
      console.error('[sendSms] UgSMS returned', res.status, text.slice(0, 500));
      return { skipped: false as const, error: new Error(`UgSMS ${res.status}: ${text.slice(0, 200)}`) };
    }
    return { skipped: false as const };
  } catch (err) {
    console.error('[sendSms]', err);
    return { skipped: false as const, error: err };
  }
}
