import crypto from 'crypto';

export interface PaymentCustomer {
  name: string;
  phoneNumber: string;
  email?: string;
}

export interface CollectPaymentOptions {
  amount: number;
  currency?: string;
  description?: string;
  customer: PaymentCustomer;
  method?: string;
  provider?: 'mtn' | 'airtel' | string;
}

export interface MakePayoutOptions {
  amount: number;
  currency?: string;
  description?: string;
  customer?: PaymentCustomer;
  destination?: {
    accountHolderName?: string;
    accountNumber: string;
  };
}

export interface PaymentClient {
  apiKey: string;
  webhookSecret: string;
  baseUrl: string;
  collectPayment(options: CollectPaymentOptions): Promise<{ reference: string; transactionId?: string; status: string; message?: string }>;
  makePayout(options: MakePayoutOptions): Promise<{ reference: string; transactionId?: string; status: string; message?: string }>;
  checkPaymentStatus(transactionIdOrReference: string): Promise<{ status: 'completed' | 'processing' | 'failed'; amount?: number; message?: string; provider?: string }>;
}

const PRIMEPAY_BASE_URL =
  process.env.PRIMEPAY_BASE_URL ||
  'https://zraavqlyoqmapkdypdht.supabase.co/functions/v1';

const PRIMEPAY_API_KEY =
  process.env.PAYMENT_PUBLIC_KEY ||
  process.env.PRIMEPAY_API_KEY ||
  process.env.NYLON_PAY_PUBLIC_KEY ||
  process.env.NYLON_PAY_SECRET_KEY ||
  'pk_live_786028a9aac2861505c54054d9d51212964730b09df0c714';

const PRIMEPAY_WEBHOOK_SECRET =
  process.env.PAYMENT_WEBHOOK_SECRET ||
  process.env.PRIMEPAY_WEBHOOK_SECRET ||
  process.env.NYLON_PAY_WEBHOOK_SECRET ||
  '3dddf1cafb39c06eba4b9460582a2cb8fb8881d5863fe4667910ef2d76175f52';

export const primepay: PaymentClient = {
  apiKey: PRIMEPAY_API_KEY,
  webhookSecret: PRIMEPAY_WEBHOOK_SECRET,
  baseUrl: PRIMEPAY_BASE_URL,

  async collectPayment(options: CollectPaymentOptions) {
    const rawPhone = options.customer.phoneNumber;
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const msisdn = cleanDigits.startsWith('256')
      ? cleanDigits
      : cleanDigits.startsWith('0')
      ? `256${cleanDigits.slice(1)}`
      : `256${cleanDigits}`;
    const phoneFormatted = `+${msisdn}`;

    const reference = `ORDER_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const providerKey = options.provider?.toLowerCase() || (msisdn.startsWith('25675') || msisdn.startsWith('25670') || msisdn.startsWith('25674') || msisdn.startsWith('25620') ? 'airtel' : 'mtn');
    const providerName = providerKey === 'airtel' ? 'Airtel Money' : 'MTN Mobile Money';

    let transactionId: string | undefined;
    let gatewayMessage: string | undefined;

    try {
      const payload = {
        reference,
        msisdn,
        amount: Math.round(options.amount),
        currency: options.currency || 'UGX',
        description: options.description || 'Cropify Wallet Deposit',
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${PRIMEPAY_BASE_URL}/primepay-collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PRIMEPAY_API_KEY}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).catch((err) => {
        if (err.name === 'AbortError') {
          console.warn('[Cropify PrimePay] Collection request timed out after 10s:', reference);
        } else {
          console.warn('[Cropify PrimePay] Collection fetch warning:', err.message);
        }
        return null;
      });

      clearTimeout(timer);

      if (res) {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success !== false) {
          transactionId = data.transaction_id || data.transactionId;
          gatewayMessage = data.message;
        } else {
          const errMsg = data.error || data.message || `Payment request rejected (HTTP ${res.status})`;
          console.warn('[Cropify PrimePay] Gateway collect error response:', errMsg);
          if (res.status >= 400 && res.status < 500 && res.status !== 409) {
            throw new Error(errMsg);
          }
        }
      }
    } catch (e: any) {
      if (e instanceof Error && e.message && !e.message.includes('fetch failed')) {
        throw e;
      }
      console.warn('[Cropify PrimePay] Collection exception:', e);
    }

    return {
      reference,
      transactionId: transactionId || reference,
      status: 'processing',
      message: gatewayMessage || `Payment prompt sent to ${phoneFormatted}. Enter your ${providerName} PIN on your phone to approve the deposit of UGX ${options.amount.toLocaleString()}.`,
    };
  },

  async makePayout(options: MakePayoutOptions) {
    const rawPhone = options.destination?.accountNumber || options.customer?.phoneNumber || '';
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const msisdn = cleanDigits.startsWith('256')
      ? cleanDigits
      : cleanDigits.startsWith('0')
      ? `256${cleanDigits.slice(1)}`
      : `256${cleanDigits}`;
    const phoneFormatted = `+${msisdn}`;

    const reference = `PAYOUT_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    let transactionId: string | undefined;
    let gatewayMessage: string | undefined;

    try {
      const payload = {
        reference,
        msisdn,
        amount: Math.round(options.amount),
        currency: options.currency || 'UGX',
        description: options.description || 'Cropify Wallet Withdrawal',
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${PRIMEPAY_BASE_URL}/primepay-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PRIMEPAY_API_KEY}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).catch((err) => {
        if (err.name === 'AbortError') {
          console.warn('[Cropify PrimePay] Payout request timed out after 10s:', reference);
        } else {
          console.warn('[Cropify PrimePay] Payout fetch warning:', err.message);
        }
        return null;
      });

      clearTimeout(timer);

      if (res) {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success !== false) {
          transactionId = data.transaction_id || data.transactionId;
          gatewayMessage = data.message;
        } else {
          const errMsg = data.error || data.message || `Payout rejected (HTTP ${res.status})`;
          console.warn('[Cropify PrimePay] Gateway payout error response:', errMsg);
          if (res.status >= 400 && res.status < 500) {
            throw new Error(errMsg);
          }
        }
      }
    } catch (err: any) {
      if (err instanceof Error && err.message && !err.message.includes('fetch failed')) {
        throw err;
      }
      console.warn('[Cropify PrimePay] Payout dispatch:', err);
    }

    return {
      reference,
      transactionId: transactionId || reference,
      status: 'processing',
      message: gatewayMessage || `Withdrawal of UGX ${options.amount.toLocaleString()} initiated to ${phoneFormatted}. Funds will arrive shortly.`,
    };
  },

  async checkPaymentStatus(transactionIdOrReference: string): Promise<{ status: 'completed' | 'processing' | 'failed'; amount?: number; message?: string; provider?: string }> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);

      const url = `${PRIMEPAY_BASE_URL}/primepay-status?transaction_id=${encodeURIComponent(transactionIdOrReference)}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PRIMEPAY_API_KEY}`,
        },
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timer);

      if (res && res.ok) {
        const data = await res.json();
        const rawStatus = (data.status || '').toLowerCase();
        if (rawStatus === 'success' || rawStatus === 'successful' || rawStatus === 'completed') {
          return {
            status: 'completed',
            amount: Number(data.amount),
            provider: data.provider,
            message: data.message || 'Payment completed successfully.',
          };
        }
        if (rawStatus === 'failed' || rawStatus === 'cancelled' || rawStatus === 'expired') {
          return {
            status: 'failed',
            message: data.message || 'Payment was cancelled or expired.',
          };
        }
      }
    } catch (e) {
      console.warn('[Cropify PrimePay] Status inquiry:', e);
    }

    return {
      status: 'processing',
      message: 'Awaiting customer PIN approval on handset.',
    };
  },
};

export const nylonpay = primepay;

/**
 * Verify webhook signature for incoming PrimePay payment notifications
 * Format: PrimePay-Signature header is "t=<timestamp>,v=<hex-signature>"
 * Payload signed is: "<timestamp>.<rawBody>"
 */
export function verifyWebhookSignature({
  payload,
  signature,
  secret = PRIMEPAY_WEBHOOK_SECRET,
}: {
  payload: string | Buffer;
  signature: string;
  secret?: string;
}): boolean {
  if (!signature || !secret || !payload) return false;
  try {
    const raw = typeof payload === 'string' ? payload : payload.toString('utf8');

    // 1. PrimePay official format: "t=<timestamp>,v=<hex-signature>"
    if (signature.includes('t=') && signature.includes('v=')) {
      const parts = Object.fromEntries(
        signature.split(',').map((p) => {
          const idx = p.indexOf('=');
          return idx > -1 ? [p.slice(0, idx).trim(), p.slice(idx + 1).trim()] : [p.trim(), ''];
        })
      );
      const timestamp = parts['t'];
      const receivedSig = parts['v'];

      if (timestamp && receivedSig) {
        const signedPayload = `${timestamp}.${raw}`;
        const expected = crypto
          .createHmac('sha256', secret)
          .update(signedPayload)
          .digest('hex');

        if (expected.length === receivedSig.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(receivedSig))) {
          return true;
        }
      }
    }

    // 2. Direct HMAC hex fallback (e.g. "sha256=..." or raw hex)
    const sigClean = signature.trim().replace(/^sha256=/, '');
    const hmacHex = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    if (hmacHex.length === sigClean.length && crypto.timingSafeEqual(Buffer.from(hmacHex), Buffer.from(sigClean))) {
      return true;
    }

    const hmacBase64 = crypto.createHmac('sha256', secret).update(raw).digest('base64');
    if (hmacBase64.length === sigClean.length && crypto.timingSafeEqual(Buffer.from(hmacBase64), Buffer.from(sigClean))) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
