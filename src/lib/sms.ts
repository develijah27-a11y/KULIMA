// No-ops silently if SMS isn't configured yet (AFRICASTALKING_API_KEY /
// AFRICASTALKING_USERNAME not set) — same degrade pattern as email
// (lib/email.ts) and web push, so the rest of the app never depends on SMS
// actually having been wired up. Africa's Talking is the standard SMS
// gateway for Uganda numbers; swap the fetch call below if a different
// provider gets picked instead — everything that calls sendSms() only
// needs { skipped, error? } back, not anything provider-specific.
const apiKey   = process.env.AFRICASTALKING_API_KEY;
const username = process.env.AFRICASTALKING_USERNAME;
const senderId = process.env.AFRICASTALKING_SENDER_ID; // optional, alphanumeric sender name

export async function sendSms(to: string, message: string) {
  if (!apiKey || !username) {
    console.warn('[sendSms] Not configured (AFRICASTALKING_API_KEY/AFRICASTALKING_USERNAME missing) — skipped:', message);
    return { skipped: true as const };
  }
  try {
    const body = new URLSearchParams({
      username,
      to,
      message,
      ...(senderId ? { from: senderId } : {}),
    });
    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    });
    if (!res.ok) throw new Error(`SMS provider returned ${res.status}`);
    return { skipped: false as const };
  } catch (err) {
    console.error('[sendSms]', err);
    return { skipped: false as const, error: err };
  }
}
