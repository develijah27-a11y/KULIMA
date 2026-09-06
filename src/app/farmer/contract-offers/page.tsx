import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ContractOffersClient } from './ContractOffersClient';

export default async function FarmerContractOffersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
  if (!myProfile) redirect('/auth/signin');

  const { data: offers } = await (supabase.from as any)('offtaker_contract_offers')
    .select(`
      id, status, created_at,
      contract:offtaker_contracts(id, crop_type, district, quantity_kg, price_ugx, delivery_date, notes, offtaker_id)
    `)
    .eq('farmer_id', myProfile.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (offers ?? []) as any[];

  // Look up each offtaker's display name — offtaker_id is a raw auth uid.
  const offtakerIds = [...new Set(rows.map(r => r.contract?.offtaker_id).filter(Boolean))];
  const offtakerNames: Record<string, string> = {};
  if (offtakerIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, business_name').in('user_id', offtakerIds);
    (profiles ?? []).forEach((p: any) => { offtakerNames[p.user_id] = p.business_name || p.full_name || 'Bulk Buyer'; });
  }

  return <ContractOffersClient offers={rows} offtakerNames={offtakerNames} />;
}
