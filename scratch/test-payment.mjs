import { createNylonPay } from '@nile-squad/nylonpay-ts';

const apiKey = 'pk_live_786028a9aac2861505c54054d9d51212964730b09df0c714';
const apiSecret = '3dddf1cafb39c06eba4b9460582a2cb8fb8881d5863fe4667910ef2d76175f52';

console.log('Testing createNylonPay...');
try {
  const client = createNylonPay({ apiKey, apiSecret, timeoutMs: 5000 });
  console.log('Client created successfully:', Object.keys(client));
  
  console.log('Testing verifyPhone...');
  const res = await client.verifyPhone({ phoneNumber: '+256772000000' });
  console.log('VerifyPhone result:', res);
} catch (e) {
  console.error('Error:', e);
}
