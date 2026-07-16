import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { full_name, business_name, phone_number, location, primary_crop, remote_fee_ugx, visit_fee_ugx } = body;

  if (!full_name?.trim()) {
    return NextResponse.json({ ok: false, error: 'Full name is required' }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    full_name:     full_name.trim(),
    business_name: business_name?.trim() || null,
    phone_number:  phone_number?.trim()  || null,
    location:      location?.trim()      || null,
    primary_crop:  primary_crop?.trim()  || null,
  };
  // Pathologist-set consultation rates — each crop doctor decides their own
  // price. Only touch these fields when explicitly provided.
  if (remote_fee_ugx !== undefined) {
    if (remote_fee_ugx !== null && Number(remote_fee_ugx) <= 0) {
      return NextResponse.json({ ok: false, error: 'Remote fee must be greater than 0' }, { status: 400 });
    }
    update.remote_fee_ugx = remote_fee_ugx === null ? null : Number(remote_fee_ugx);
  }
  if (visit_fee_ugx !== undefined) {
    if (visit_fee_ugx !== null && Number(visit_fee_ugx) <= 0) {
      return NextResponse.json({ ok: false, error: 'Farm visit fee must be greater than 0' }, { status: 400 });
    }
    update.visit_fee_ugx = visit_fee_ugx === null ? null : Number(visit_fee_ugx);
  }

  const { error } = await (supabase.from as any)('profiles').update(update).eq('user_id', user.id);

  if (error) {
    console.error('[/api/profile]', error);
    return NextResponse.json({ ok: false, error: 'Failed to update profile. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
