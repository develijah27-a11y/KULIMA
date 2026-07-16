/**
 * PATCH /api/admin/listings/[id]  — approve or reject a listing
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: p } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
  if ((p as any)?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  let body: { action: string; reason?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, reason } = body;
  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const isApprove = action === 'approve';

  const { data: listing } = await (db.from as any)('listings')
    .select('id, farmer_id, crop_type, status')
    .eq('id', id).single();

  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  const now = new Date().toISOString();
  const { error: updateErr } = await (db.from as any)('listings').update({
    approval_status: isApprove ? 'approved' : 'rejected',
    status:          isApprove ? 'active' : 'inactive',
    approved_at:     isApprove ? now : null,
    updated_at:      now,
  }).eq('id', id);

  if (updateErr) {
    console.error('[/api/admin/listings/[id]]', updateErr);
    return NextResponse.json({ error: 'Failed to update listing status. Please try again.' }, { status: 500 });
  }

  // Notify farmer
  const { data: fp } = await (db.from as any)('profiles').select('user_id').eq('id', listing.farmer_id).single();
  if (fp) {
    await (db.from as any)('notifications').insert({
      user_id:  (fp as any).user_id,
      role:     'farmer',
      type:     'order',
      title:    isApprove ? `Listing approved — ${listing.crop_type}` : `Listing not approved — ${listing.crop_type}`,
      body:     isApprove
                  ? 'Your listing is now live on the marketplace.'
                  : `Your listing was not approved. ${reason ?? 'Please review and resubmit.'}`,
      data:     { listing_id: id },
    });
  }

  return NextResponse.json({ success: true });
}
