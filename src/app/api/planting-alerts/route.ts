import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { generatePlantingAlerts } from '@/lib/planting-calendar';

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get farmer's crops from farms + profile
  const [farmsRes, profileRes] = await Promise.all([
    (supabase.from as any)('farms').select('crop_types').eq('user_id', user.id).eq('is_active', true),
    supabase.from('profiles').select('primary_crop').eq('user_id', user.id).single(),
  ]);

  const farmCrops = (farmsRes.data ?? []).flatMap((f: any) => f.crop_types ?? []) as string[];
  if (profileRes.data?.primary_crop) farmCrops.push(profileRes.data.primary_crop);
  const uniqueCrops = [...new Set(farmCrops)];

  const now = new Date();
  const alerts = generatePlantingAlerts(now.getMonth(), now.getDate(), uniqueCrops);

  return NextResponse.json({ alerts, farmerCrops: uniqueCrops });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, alertId } = body;

  if (action === 'mark_read') {
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await (admin.from as any)('planting_alerts').update({ is_read: true }).eq('id', alertId).eq('user_id', user.id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
