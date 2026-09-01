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
  collectPayment(options: CollectPaymentOptions): Promise<{ reference: string; transactionId: string; status: string; message: string }>;
  makePayout(options: MakePayoutOptions): Promise<{ reference: string; transactionId: string; status: string; message: string }>;
  checkPaymentStatus(transactionIdOrReference: string): Promise<{ status: 'completed' | 'processing' | 'failed'; amount?: number; message?: string; provider?: string }>;
  checkBalance(): Promise<{ success: boolean; balance: number; currency: string }>;
}

export function getPrimePayApiKey(): string {
  return (
    process.env.PRIMEPAY_API_KEY ||
    process.env.PAYMENT_SECRET_KEY ||
    process.env.PAYMENT_PUBLIC_KEY ||
    process.env.NYLON_PAY_SECRET_KEY ||
    process.env.NYLON_PAY_PUBLIC_KEY ||
    'pk_live_786028a9aac2861505c54054d9d51212964730b09df0c714'
  ).trim();
}

export function getPrimePayWebhookSecret(): string {
  return (
    process.env.PRIMEPAY_WEBHOOK_SECRET ||
    process.env.PAYMENT_WEBHOOK_SECRET ||
    process.env.NYLON_PAY_WEBHOOK_SECRET ||
    '3dddf1cafb39c06eba4b9460582a2cb8fb8881d5863fe4667910ef2d76175f52'
  ).trim();
}

export function getPrimePayBaseUrl(): string {
  return (
    process.env.PRIMEPAY_BASE_URL ||
    'https://zraavqlyoqmapkdypdht.supabase.co/functions/v1'
  ).trim().replace(/\/+$/, '');
}

/**
 * Normalizes phone number into 256XXXXXXXXX format required by PrimePay API
 */
export function normalizeUgandaMsisdn(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) {
    return `256${digits.slice(1)}`;
  }
  if (!digits.startsWith('256') && digits.length === 9) {
    return `256${digits}`;
  }
  if (digits.startsWith('256') && digits.length === 12) {
    return digits;
  }
  if (digits.length >= 9) {
    return digits.startsWith('256') ? digits : `256${digits.slice(-9)}`;
  }
  throw new Error(`Invalid Uganda phone number format: "${raw}". Please enter a 10-digit number like 0772123456 or 0752123456.`);
}

export const primepay: PaymentClient = {
  get apiKey() {
    return getPrimePayApiKey();
  },
  get webhookSecret() {
    return getPrimePayWebhookSecret();
  },
  get baseUrl() {
    return getPrimePayBaseUrl();
  },

  async collectPayment(options: CollectPaymentOptions) {
    const rawPhone = options.customer?.phoneNumber || '';
    const msisdn = normalizeUgandaMsisdn(rawPhone);
    const phoneFormatted = `+${msisdn}`;

    const reference = `ORDER_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const providerKey = options.provider?.toLowerCase() || (msisdn.startsWith('25675') || msisdn.startsWith('25670') || msisdn.startsWith('25674') || msisdn.startsWith('25620') ? 'airtel' : 'mtn');
    const providerName = providerKey === 'airtel' ? 'Airtel Money' : 'MTN Mobile Money';

    const apiKey = getPrimePayApiKey();
    const baseUrl = getPrimePayBaseUrl();
    const amount = Math.round(options.amount);

    if (amount < 500) {
      throw new Error('Minimum deposit amount is UGX 500.');
    }

    const payload = {
      reference,
      msisdn,
      amount,
      currency: options.currency || 'UGX',
      description: options.description || 'Cropify Wallet Deposit',
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    let res: Response | null = null;
    try {
      res = await fetch(`${baseUrl}/primepay-collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error('Payment gateway connection timed out. Please verify your internet connection and try again.');
      }
      throw new Error(`Payment gateway connection failed: ${err.message}`);
    }
    clearTimeout(timer);

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.success === false) {
      const errorMsg = data.error || data.message || `Payment request rejected (HTTP ${res.status})`;
      console.warn('[Cropify PrimePay] Collection failed:', errorMsg, 'Response:', data);
      throw new Error(errorMsg);
    }

    const transactionId = data.transaction_id || data.transactionId || reference;
    const gatewayMessage = data.message || `Payment request sent to ${phoneFormatted}. Enter your ${providerName} PIN on your phone to approve the deposit of UGX ${amount.toLocaleString()}.`;

    return {
      reference,
      transactionId,
      status: 'processing',
      message: gatewayMessage,
    };
  },

  async makePayout(options: MakePayoutOptions) {
    const rawPhone = options.destination?.accountNumber || options.customer?.phoneNumber || '';
    const msisdn = normalizeUgandaMsisdn(rawPhone);
    const phoneFormatted = `+${msisdn}`;

    const reference = `PAYOUT_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const apiKey = getPrimePayApiKey();
    const baseUrl = getPrimePayBaseUrl();
    const amount = Math.round(options.amount);

    if (amount < 500) {
      throw new Error('Minimum payout amount is UGX 500.');
    }

    const payload = {
      reference,
      msisdn,
      amount,
      currency: options.currency || 'UGX',
      description: options.description || 'Cropify Wallet Withdrawal',
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    let res: Response | null = null;
    try {
      res = await fetch(`${baseUrl}/primepay-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new Error('Payout gateway connection timed out. Please try again.');
      }
      throw new Error(`Payout gateway connection failed: ${err.message}`);
    }
    clearTimeout(timer);

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.success === false) {
      const errorMsg = data.error || data.message || `Payout rejected (HTTP ${res.status})`;
      console.warn('[Cropify PrimePay] Payout failed:', errorMsg, 'Response:', data);
      throw new Error(errorMsg);
    }

    const transactionId = data.transaction_id || data.transactionId || reference;
    const gatewayMessage = data.message || `Withdrawal of UGX ${amount.toLocaleString()} initiated to ${phoneFormatted}. Funds will arrive shortly.`;

    return {
      reference,
      transactionId,
      status: 'processing',
      message: gatewayMessage,
    };
  },

  async checkPaymentStatus(transactionIdOrReference: string): Promise<{ status: 'completed' | 'processing' | 'failed'; amount?: number; message?: string; provider?: string }> {
    try {
      const apiKey = getPrimePayApiKey();
      const baseUrl = getPrimePayBaseUrl();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      const url = `${baseUrl}/primepay-status?transaction_id=${encodeURIComponent(transactionIdOrReference)}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
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
        if (rawStatus === 'pending_approval') {
          return {
            status: 'processing',
            message: 'Payout queued for admin approval.',
          };
        }
      }
    } catch (e) {
      console.warn('[Cropify PrimePay] Status inquiry exception:', e);
    }

    return {
      status: 'processing',
      message: 'Awaiting transaction completion.',
    };
  },

  async checkBalance(): Promise<{ success: boolean; balance: number; currency: string }> {
    try {
      const apiKey = getPrimePayApiKey();
      const baseUrl = getPrimePayBaseUrl();
      const res = await fetch(`${baseUrl}/primepay-balance?currency=UGX`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          balance: Number(data.balance ?? 0),
          currency: data.currency || 'UGX',
        };
      }
    } catch (err) {
      console.warn('[Cropify PrimePay] Balance check exception:', err);
    }
    return { success: false, balance: 0, currency: 'UGX' };
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
  secret = getPrimePayWebhookSecret(),
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
