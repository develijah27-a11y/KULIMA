import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!(await rateLimit(`transfer:${user.id}`, 10, 60))) {
    return NextResponse.json({ error: 'Too many transfer attempts. Please wait a minute and try again.' }, { status: 429 });
  }

  const { accountNumber, amount, note } = await req.json();

  if (!accountNumber || typeof accountNumber !== 'string') {
    return NextResponse.json({ error: 'Recipient account number required' }, { status: 400 });
  }
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 });
  }

  const { data, error } = await (supabase.rpc as any)('transfer_between_wallets', {
    p_to_account_number: accountNumber.trim(),
    p_amount: amount,
    p_note: note ?? null,
  });

  if (error) {
    // Postgres RAISE EXCEPTION messages from the function surface here —
    // they're already written to be shown to the sender (no internal ids/etc).
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ success: true, ...result });
}
