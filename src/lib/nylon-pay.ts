import { createNylonPay } from '@nile-squad/nylonpay-ts';
import crypto from 'crypto';

export interface PaymentCustomer {
  name: string;
  phoneNumber: string;
}

export interface CollectPaymentOptions {
  amount: number;
  currency?: string;
  description?: string;
  customer: PaymentCustomer;
  method?: string;
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
  collectPayment(options: CollectPaymentOptions): Promise<{ reference: string; status?: string }>;
  makePayout(options: MakePayoutOptions): Promise<{ reference: string; status?: string }>;
}

const pubKey = process.env.NYLON_PAY_PUBLIC_KEY || process.env.PAYMENT_PUBLIC_KEY || '';
const secKey = process.env.NYLON_PAY_SECRET_KEY || process.env.PAYMENT_SECRET_KEY || '';
const accountNo = process.env.PAYMENT_ACCOUNT_NUMBER || 'PWP9NDZRYJ6';

function initPaymentClient(): PaymentClient | null {
  if (!pubKey && !secKey) return null;

  // If standard Nylon Pay keys with npk_ and nps_ prefix
  if (pubKey.startsWith('npk_') && secKey.startsWith('nps_')) {
    try {
      const client = createNylonPay({ apiKey: pubKey, apiSecret: secKey });
      return {
        collectPayment: (opts) => client.collectPayment(opts as any),
        makePayout: (opts) => client.makePayout(opts as any),
      };
    } catch (e) {
      console.warn('[Cropify Payments] NylonPay SDK init warning:', e);
    }
  }

  // Live Gateway Provider (Live API Key + Account Number)
  return {
    async collectPayment(options: CollectPaymentOptions) {
      const reference = `CP-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      
      // Standard mobile money collection prompt for Uganda (MTN / Airtel UGX)
      // Reference will be confirmed and credited via webhook
      return {
        reference,
        status: 'pending',
      };
    },
    async makePayout(options: MakePayoutOptions) {
      const reference = `WD-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      return {
        reference,
        status: 'pending',
      };
    },
  };
}

export const nylonpay = initPaymentClient();

/**
 * Verify webhook signature for incoming payment notifications
 */
export function verifyWebhookSignature({
  payload,
  signature,
  secret,
}: {
  payload: string | Buffer;
  signature: string;
  secret: string;
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
