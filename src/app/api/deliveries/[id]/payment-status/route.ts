import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: dr } = await (supabase.from as any)('delivery_requests')
    .select('id, status, payment_status, accepted_at, transporter_id, requester_id')
    .eq('id', id)
    .single();

  if (!dr) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only the transporter or requester may poll
  if (dr.transporter_id !== user.id && dr.requester_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    id: dr.id,
    status: dr.status,
    payment_status: dr.payment_status ?? 'pending',
    accepted_at: dr.accepted_at,
  });
}
