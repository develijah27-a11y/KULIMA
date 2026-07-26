import { createNylonPay } from '@nile-squad/nylonpay-ts';

export const nylonpay = process.env.NYLON_PAY_SECRET_KEY
  ? createNylonPay({
      apiKey: process.env.NYLON_PAY_PUBLIC_KEY!,
      apiSecret: process.env.NYLON_PAY_SECRET_KEY!,
    })
  : null;
