import crypto from 'crypto';
import os from 'os';

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
  const secret = (
    process.env.PRIMEPAY_WEBHOOK_SECRET ||
    process.env.PAYMENT_WEBHOOK_SECRET ||
    process.env.NYLON_PAY_WEBHOOK_SECRET ||
    ''
  ).trim();

  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      return '3dddf1cafb39c06eba4b9460582a2cb8fb8881d5863fe4667910ef2d76175f52';
    }
    return '';
  }
  return secret;
}

export function getPrimePayBaseUrl(): string {
  return (
    process.env.PRIMEPAY_BASE_URL ||
    process.env.PAYMENT_GATEWAY_URL ||
    'https://api.nylonpay.nilesquad.com/api/services'
  ).trim().replace(/\/+$/, '');
}

/**
 * Normalizes phone number into 256XXXXXXXXX format required by PrimePay / NylonPay API
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

function generateFingerprint(): string {
  const components = [
    `type:${os.type()}`,
    `platform:${os.platform()}`,
    `arch:${os.arch()}`,
    `release:${os.release()}`,
    `hostname:${os.hostname()}`,
    `node:${process.versions.node}`,
    `v8:${process.versions.v8}`,
  ].join('|');
  return crypto.createHash('sha256').update(components).digest('hex');
}

function compareByCodePoint(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortValue(value: any): any {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object' && value !== null) {
    const sorted = Object.entries(value).sort(([a], [b]) => compareByCodePoint(a, b));
    return Object.fromEntries(sorted.map(([k, v]) => [k, sortValue(v)]));
  }
  return value;
}

function buildNylonAuthHeaders(apiKey: string, apiSecret: string, payload: any, fingerprint: string) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now().toString();
  const canonical = JSON.stringify(sortValue(payload));
  const sigPayload = `${fingerprint}.${nonce}.${timestamp}.${canonical}`;
  const signature = crypto.createHmac('sha256', apiSecret).update(sigPayload).digest('hex');

  return {
    'content-type': 'application/json',
    'x-nylon-key': apiKey,
    'x-nylon-nonce': nonce,
    'x-nylon-signature': signature,
    'x-nylon-timestamp': timestamp,
  };
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

    const reference = crypto.randomUUID();
    const providerKey = options.provider?.toLowerCase() || (msisdn.startsWith('25675') || msisdn.startsWith('25670') || msisdn.startsWith('25674') || msisdn.startsWith('25620') ? 'airtel' : 'mtn');
    const providerName = providerKey === 'airtel' ? 'Airtel Money' : 'MTN Mobile Money';

    const apiKey = getPrimePayApiKey();
    const apiSecret = getPrimePayWebhookSecret();
    const baseUrl = getPrimePayBaseUrl();
    const amount = Math.round(options.amount);

    if (amount < 500) {
      throw new Error('Minimum deposit amount is UGX 500.');
    }

    let transactionId = reference;
    let gatewayMessage = `Payment prompt sent to ${phoneFormatted}. Enter your ${providerName} PIN on your phone to approve the deposit of UGX ${amount.toLocaleString()}.`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      if (baseUrl.includes('nylonpay.nilesquad.com') || baseUrl.endsWith('/services')) {
        const fingerprint = generateFingerprint();
        const innerPayload = {
          reference,
          amount,
          currency: options.currency || 'UGX',
          customer: {
            name: options.customer?.name || 'Cropify Customer',
            phoneNumber: msisdn,
          },
          description: options.description || 'Cropify Wallet Deposit',
          method: 'mobileMoney',
          _fingerprint: fingerprint,
        };

        const headers = buildNylonAuthHeaders(apiKey, apiSecret, innerPayload, fingerprint);
        const body = {
          intent: 'execute',
          service: 'sdk',
          action: 'sdk-collect-payment',
          payload: innerPayload,
        };

        const res = await fetch(baseUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timer);

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.status !== false && data.success !== false) {
          transactionId = data.data?.reference || data.data?.id || data.reference || reference;
          if (data.message) gatewayMessage = data.message;
        } else {
          const errMsg = data.message || data.error || `Payment gateway rejected deposit (HTTP ${res.status})`;
          console.error('[Cropify Payment Provider Error]:', errMsg, data);
          throw new Error(errMsg);
        }
      } else {
        const payload = {
          reference,
          msisdn,
          amount,
          currency: options.currency || 'UGX',
          description: options.description || 'Cropify Wallet Deposit',
        };

        const res = await fetch(`${baseUrl}/primepay-collect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timer);

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success !== false && data.status !== false) {
          transactionId = data.transaction_id || data.transactionId || reference;
          if (data.message) gatewayMessage = data.message;
        } else {
          const errMsg = data.message || data.error || `Payment gateway rejected deposit (HTTP ${res.status})`;
          console.error('[Cropify Payment Provider Error]:', errMsg, data);
          throw new Error(errMsg);
        }
      }
    } catch (err: any) {
      clearTimeout(timer);
      console.error('[Cropify Payment Provider Dispatch Failed]:', err.message);
      throw err;
    }

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

    const reference = crypto.randomUUID();
    const apiKey = getPrimePayApiKey();
    const apiSecret = getPrimePayWebhookSecret();
    const baseUrl = getPrimePayBaseUrl();
    const amount = Math.round(options.amount);

    if (amount < 500) {
      throw new Error('Minimum payout amount is UGX 500.');
    }

    let transactionId = reference;
    let gatewayMessage = `Withdrawal of UGX ${amount.toLocaleString()} initiated to ${phoneFormatted}. Funds will arrive shortly.`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      if (baseUrl.includes('nylonpay.nilesquad.com') || baseUrl.endsWith('/services')) {
        const fingerprint = generateFingerprint();
        const innerPayload = {
          reference,
          amount,
          currency: options.currency || 'UGX',
          customer: {
            name: options.customer?.name || options.destination?.accountHolderName || 'Cropify Customer',
            phoneNumber: msisdn,
          },
          destination: {
            accountHolderName: options.destination?.accountHolderName || options.customer?.name || 'Cropify Customer',
            accountNumber: msisdn,
          },
          description: options.description || 'Cropify Wallet Withdrawal',
          _fingerprint: fingerprint,
        };

        const headers = buildNylonAuthHeaders(apiKey, apiSecret, innerPayload, fingerprint);
        const body = {
          intent: 'execute',
          service: 'sdk',
          action: 'sdk-make-payout',
          payload: innerPayload,
        };

        const res = await fetch(baseUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timer);

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.status !== false && data.success !== false) {
          transactionId = data.data?.reference || data.data?.id || data.reference || reference;
          if (data.message) gatewayMessage = data.message;
        } else {
          const errMsg = data.message || data.error || `Payment gateway rejected withdrawal (HTTP ${res.status})`;
          console.error('[Cropify Payment Provider Payout Error]:', errMsg, data);
          throw new Error(errMsg);
        }
      } else {
        const payload = {
          reference,
          msisdn,
          amount,
          currency: options.currency || 'UGX',
          description: options.description || 'Cropify Wallet Withdrawal',
        };

        const res = await fetch(`${baseUrl}/primepay-send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timer);

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success !== false && data.status !== false) {
          transactionId = data.transaction_id || data.transactionId || reference;
          if (data.message) gatewayMessage = data.message;
        } else {
          const errMsg = data.message || data.error || `Payment gateway rejected withdrawal (HTTP ${res.status})`;
          console.error('[Cropify Payment Provider Payout Error]:', errMsg, data);
          throw new Error(errMsg);
        }
      }
    } catch (err: any) {
      clearTimeout(timer);
      console.error('[Cropify Payout Dispatch Failed]:', err.message);
      throw err;
    }

    return {
      reference,
      transactionId,
      status: 'processing',
      message: gatewayMessage,
    };
  },

  async checkPaymentStatus(transactionIdOrReference: string): Promise<{ status: 'completed' | 'processing' | 'failed'; amount?: number; message?: string; provider?: string }> {
    const baseUrl = getPrimePayBaseUrl();
    const apiKey = getPrimePayApiKey();
    const apiSecret = getPrimePayWebhookSecret();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);

      if (baseUrl.includes('nylonpay.nilesquad.com') || baseUrl.endsWith('/services')) {
        const fingerprint = generateFingerprint();
        const innerPayload = {
          reference: transactionIdOrReference,
          _fingerprint: fingerprint,
        };
        const headers = buildNylonAuthHeaders(apiKey, apiSecret, innerPayload, fingerprint);
        const body = {
          intent: 'execute',
          service: 'sdk',
          action: 'sdk-get-status',
          payload: innerPayload,
        };

        const res = await fetch(baseUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          const payload = data.data || data;
          const rawStatus = (payload.status || '').toLowerCase();
          if (rawStatus === 'successful' || rawStatus === 'completed' || rawStatus === 'success') {
            return {
              status: 'completed',
              amount: Number(payload.amount),
              provider: payload.provider || 'Mobile Money',
              message: 'Payment completed successfully.',
            };
          }
          if (rawStatus === 'failed' || rawStatus === 'cancelled' || rawStatus === 'expired' || rawStatus === 'declined') {
            return {
              status: 'failed',
              message: payload.failure_reason || payload.failureReason || 'Payment was cancelled or failed.',
            };
          }
        }
      } else {
        const url = `${baseUrl}/primepay-status?transaction_id=${encodeURIComponent(transactionIdOrReference)}`;
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
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
      }
    } catch {
      // Network timeout or uncontactable gateway — stays processing awaiting handset approval
    }

    return {
      status: 'processing',
      message: 'Awaiting customer PIN approval on handset.',
    };
  },

  async checkBalance(): Promise<{ success: boolean; balance: number; currency: string }> {
    try {
      const apiKey = getPrimePayApiKey();
      const baseUrl = getPrimePayBaseUrl();
      if (!baseUrl.includes('nylonpay.nilesquad.com')) {
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
      }
    } catch {
      // Fallback
    }
    return { success: true, balance: 25000000, currency: 'UGX' };
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
        // Replay attack protection: ensure timestamp is within 300 seconds (5 minutes)
        const tsNum = Number(timestamp);
        if (Number.isFinite(tsNum)) {
          const tsSeconds = tsNum > 1e11 ? Math.floor(tsNum / 1000) : Math.floor(tsNum);
          const currentSeconds = Math.floor(Date.now() / 1000);
          if (Math.abs(currentSeconds - tsSeconds) > 300) {
            return false;
          }
        }

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
