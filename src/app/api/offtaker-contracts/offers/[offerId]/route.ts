import { NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { notifyUser } from '@/lib/notify';

type Ctx = { params: Promise<{ offerId: string }> };

// PATCH /api/offtaker-contracts/offers/[offerId] — { action: 'accept' | 'decline' }
// First farmer to accept claims the contract; every other outstanding offer
// for the same contract is marked expired so it stops showing up for them.
export async function PATCH(req: Request, { params }: Ctx) {
  const { offerId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { action } = await req.json().catch(() => ({}) as any);
  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const admin = createServiceRoleClient();

  const { data: offer } = await (admin.from as any)('offtaker_contract_offers')
    .select('id, contract_id, farmer_id, status').eq('id', offerId).single();
  if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
  if (offer.farmer_id !== myProfile.id) return NextResponse.json({ error: 'This offer is not yours' }, { status: 403 });
  if (offer.status !== 'notified') return NextResponse.json({ error: 'You have already responded to this offer' }, { status: 400 });

  const now = new Date().toISOString();

  if (action === 'decline') {
    await (admin.from as any)('offtaker_contract_offers').update({ status: 'declined', responded_at: now }).eq('id', offerId);
    return NextResponse.json({ success: true, status: 'declined' });
  }

  // Accept — atomically claim the contract only if it's still unclaimed
  // (status='offered', farmer_id still null), so two farmers accepting at
  // the same moment can't both "win" it.
  const { data: claimed } = await (admin.from as any)('offtaker_contracts')
    .update({ farmer_id: myProfile.id, status: 'active', updated_at: now })
    .eq('id', offer.contract_id)
    .eq('status', 'offered')
    .is('farmer_id', null)
    .select('id, offtaker_id, crop_type, quantity_kg, price_ugx')
    .single();

  if (!claimed) {
    await (admin.from as any)('offtaker_contract_offers').update({ status: 'expired', responded_at: now }).eq('id', offerId);
    return NextResponse.json({ error: 'Another farmer already accepted this contract' }, { status: 409 });
  }

  await Promise.all([
    (admin.from as any)('offtaker_contract_offers').update({ status: 'accepted', responded_at: now }).eq('id', offerId),
    (admin.from as any)('offtaker_contract_offers')
      .update({ status: 'expired', responded_at: now })
      .eq('contract_id', offer.contract_id)
      .eq('status', 'notified')
      .neq('id', offerId),
  ]);

  try {
    const { data: offtakerProfile } = await admin.from('profiles').select('user_id, full_name').eq('user_id', claimed.offtaker_id).single();
    const { data: farmerProfile } = await admin.from('profiles').select('full_name').eq('id', myProfile.id).single();
    if (offtakerProfile) {
      await notifyUser(admin, {
        userId: claimed.offtaker_id,
        role: 'offtaker',
        type: 'offer',
        title: 'Contract accepted!',
        body: `${(farmerProfile as any)?.full_name ?? 'A farmer'} accepted your contract for ${claimed.quantity_kg}kg of ${claimed.crop_type}.`,
        data: { contract_id: claimed.id },
        url: '/offtaker/contracts',
      });
    }
  } catch { /* non-critical */ }

  return NextResponse.json({ success: true, status: 'accepted' });
}
