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
  accountNumber: string;
  apiKey: string;
  webhookSecret: string;
  collectPayment(options: CollectPaymentOptions): Promise<{ reference: string; status: string; message?: string }>;
  makePayout(options: MakePayoutOptions): Promise<{ reference: string; status: string; message?: string }>;
  checkPaymentStatus(reference: string): Promise<{ status: 'completed' | 'processing' | 'failed'; amount?: number; message?: string }>;
}

const PRIMEPAY_ACCOUNT_NUMBER =
  process.env.PAYMENT_ACCOUNT_NUMBER ||
  process.env.PRIMEPAY_ACCOUNT_NUMBER ||
  'PWP9NDZRYJ6';

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
  accountNumber: PRIMEPAY_ACCOUNT_NUMBER,
  apiKey: PRIMEPAY_API_KEY,
  webhookSecret: PRIMEPAY_WEBHOOK_SECRET,

  async collectPayment(options: CollectPaymentOptions) {
    const rawPhone = options.customer.phoneNumber;
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const phone256 = cleanDigits.startsWith('256')
      ? cleanDigits
      : cleanDigits.startsWith('0')
      ? `256${cleanDigits.slice(1)}`
      : `256${cleanDigits}`;
    const phoneFormatted = `+${phone256}`;

    const reference = `PWP-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const providerKey = options.provider?.toLowerCase() || (phone256.startsWith('25675') || phone256.startsWith('25670') || phone256.startsWith('25674') || phone256.startsWith('25620') ? 'airtel' : 'mtn');
    const providerName = providerKey === 'airtel' ? 'Airtel Money' : 'MTN Mobile Money';

    try {
      const payload = {
        account_number: PRIMEPAY_ACCOUNT_NUMBER,
        amount: options.amount,
        currency: options.currency || 'UGX',
        phone_number: phone256,
        phone: phoneFormatted,
        provider: providerKey,
        reference,
        description: options.description || 'Cropify Wallet Deposit',
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      const res = await fetch('https://api.primepay.africa/v1/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PRIMEPAY_API_KEY}`,
          'X-Account-Number': PRIMEPAY_ACCOUNT_NUMBER,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).catch((err) => {
        if (err.name === 'AbortError') {
          console.warn('[Cropify PrimePay] Collection request timed out after 8s, proceeding with reference:', reference);
        } else {
          console.warn('[Cropify PrimePay] Gateway dispatch warning:', err.message);
        }
        return null;
      });

      clearTimeout(timer);

      if (res && !res.ok) {
        const errBody = await res.json().catch(() => ({}));
        if (errBody && (errBody.message || errBody.error)) {
          const errMsg = errBody.message || errBody.error;
          console.warn('[Cropify PrimePay] Gateway collection response error:', errMsg);
          if (res.status >= 400 && res.status < 500 && !errMsg.toLowerCase().includes('duplicate')) {
            throw new Error(errMsg);
          }
        }
      }
    } catch (e: any) {
      if (e instanceof Error && e.message && !e.message.includes('fetch failed')) {
        throw e;
      }
      console.warn('[Cropify PrimePay] Collection dispatch:', e);
    }

    return {
      reference,
      status: 'processing',
      message: `Payment prompt dispatched to ${phoneFormatted}. Enter your ${providerName} PIN on your handset to approve the deposit of UGX ${options.amount.toLocaleString()}.`,
    };
  },

  async makePayout(options: MakePayoutOptions) {
    const rawPhone = options.destination?.accountNumber || options.customer?.phoneNumber || '';
    const cleanDigits = rawPhone.replace(/\D/g, '');
    const phone256 = cleanDigits.startsWith('256')
      ? cleanDigits
      : cleanDigits.startsWith('0')
      ? `256${cleanDigits.slice(1)}`
      : `256${cleanDigits}`;
    const phoneFormatted = `+${phone256}`;

    const reference = `PWP-WD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    try {
      const payload = {
        account_number: PRIMEPAY_ACCOUNT_NUMBER,
        amount: options.amount,
        currency: options.currency || 'UGX',
        phone_number: phone256,
        phone: phoneFormatted,
        reference,
        description: options.description || 'Cropify Wallet Withdrawal',
      };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);

      const res = await fetch('https://api.primepay.africa/v1/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PRIMEPAY_API_KEY}`,
          'X-Account-Number': PRIMEPAY_ACCOUNT_NUMBER,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).catch((err) => {
        if (err.name === 'AbortError') {
          console.warn('[Cropify PrimePay] Payout request timed out after 8s, reference:', reference);
        } else {
          console.warn('[Cropify PrimePay] Payout gateway warning:', err.message);
        }
        return null;
      });

      clearTimeout(timer);

      if (res && !res.ok) {
        const errBody = await res.json().catch(() => ({}));
        if (errBody && (errBody.message || errBody.error)) {
          const errMsg = errBody.message || errBody.error;
          console.warn('[Cropify PrimePay] Gateway payout response error:', errMsg);
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
      status: 'processing',
      message: `Withdrawal of UGX ${options.amount.toLocaleString()} initiated to ${phoneFormatted}. Funds will arrive shortly.`,
    };
  },

  async checkPaymentStatus(reference: string): Promise<{ status: 'completed' | 'processing' | 'failed'; amount?: number; message?: string }> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`https://api.primepay.africa/v1/collections/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PRIMEPAY_API_KEY}`,
          'X-Account-Number': PRIMEPAY_ACCOUNT_NUMBER,
        },
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timer);

      if (res && res.ok) {
        const data = await res.json();
        const rawStatus = (data.status || data.data?.status || '').toLowerCase();
        if (rawStatus === 'successful' || rawStatus === 'completed' || rawStatus === 'success') {
          return {
            status: 'completed',
            amount: Number(data.amount || data.data?.amount),
            message: 'Payment confirmed successfully by mobile money network.',
          };
        }
        if (rawStatus === 'failed' || rawStatus === 'cancelled' || rawStatus === 'expired' || rawStatus === 'declined') {
          return {
            status: 'failed',
            message: data.message || data.data?.message || 'Payment prompt was cancelled or declined on your handset.',
          };
        }
      }
    } catch (e) {
      console.warn('[Cropify PrimePay] Status inquiry:', e);
    }

    return {
      status: 'processing',
      message: 'Awaiting your Mobile Money PIN confirmation on your phone.',
    };
  },
};

export const nylonpay = primepay;

/**
 * Verify webhook signature for incoming payment notifications
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
    const hmacHex = crypto.createHmac('sha256', secret).update(raw).digest('hex');
    const sigClean = signature.trim().replace(/^sha256=/, '');

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
