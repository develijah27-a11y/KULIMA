import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({ farmerId: z.string(), cropType: z.string(), action: z.enum(['diagnose','recommend']) });

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: { message: 'Invalid JSON' } }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: { message: 'Invalid body' } }, { status: 400 });

  const { farmerId, cropType } = parsed.data;

  // Build contextual response
  const reply = `I can help you with ${cropType}. For common diseases and treatments in Uganda, visit the Crop Doctor page.`;

  return NextResponse.json({ success: true, data: { reply, cropType } });
}
