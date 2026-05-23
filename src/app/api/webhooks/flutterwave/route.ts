import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export async function POST(req: Request) {
  const signature = req.headers.get('verif-hash') ?? '';
  const secret = process.env.FLUTTERWAVE_WEBHOOK_SECRET;
  if (!secret || signature !== secret) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });

  const body = await req.json();
  const event = body.event;

  if (event === 'charge.completed') {
    // update subscription
  }
  if (event === 'transfer.completed') {
    // log payout
  }

  return NextResponse.json({ received: true });
}
