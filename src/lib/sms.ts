// No-ops silently if SMS isn't configured yet (UGSMS_API_KEY not set) —
// same degrade pattern as lib/email.ts, so the rest of the app never
// depends on SMS actually having been wired up.
//
// Provider: UgSMS (https://ugsms.com). There are two send endpoints and
// they are NOT interchangeable:
//   - v1 (/v1/sms/send) authenticates with a `username`+`password` pair —
//     confirmed directly against their API: sending an API key as a Bearer
//     token or `api_key` field there gets "Credentials are required...
//     Provide username and password", even though the key is valid.
//   - v2 (/api/v2/sms/send) authenticates with an API key via the
//     `X-API-Key` header — this is the one that actually matches the
//     UGSMS_API_KEY this app was given, confirmed working directly against
//     their API (reached "Insufficient balance", not an auth error).
// If sends still fail, check the logged response body — UgSMS returns a
// specific JSON error for every failure mode (bad number, no balance, etc).
const apiKey = process.env.UGSMS_API_KEY;
const BASE_URL = 'https://ugsms.com/api/v2/sms/send';

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
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        numbers: toLocalUg(to),
        message_body: message,
      }),
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
