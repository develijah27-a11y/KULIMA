/**
 * GET /api/admin/listings?approval=pending|approved|rejected
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, status: 401 as const };
  const { data: p } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if ((p as any)?.role !== 'admin') return { user: null, status: 403 as const };
  return { user, status: 200 as const };
}

export async function GET(req: Request) {
  const { user, status } = await requireAdmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status });

  const { searchParams } = new URL(req.url);
  const approval = searchParams.get('approval') ?? 'pending';

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await (db.from as any)('listings')
    .select('id, crop_type, quantity_kg, asking_price, district, status, approval_status, created_at, farmer:profiles!farmer_id(full_name, location)')
    .eq('approval_status', approval)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
