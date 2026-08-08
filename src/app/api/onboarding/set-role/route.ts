import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_ROLES = ['farmer', 'buyer', 'transporter', 'supplier', 'pathologist', 'offtaker', 'groups'];

const ROLE_DASHBOARD: Record<string, string> = {
  farmer:      '/farmer/dashboard',
  buyer:       '/buyer/dashboard',
  transporter: '/transporter/dashboard',
  supplier:    '/supplier/dashboard',
  pathologist: '/pathologist/dashboard',
  offtaker:    '/offtaker/dashboard',
  groups:      '/groups/dashboard',
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  // Accept either a single role (legacy) or an array of roles
  const rawRoles: string[] = Array.isArray(body.roles)
    ? body.roles
    : body.role ? [body.role] : [];

  if (rawRoles.length === 0) {
    return NextResponse.json({ error: 'At least one role is required' }, { status: 400 });
  }

  const invalid = rawRoles.filter(r => !VALID_ROLES.includes(r));
  if (invalid.length > 0) {
    return NextResponse.json({ error: `Invalid roles: ${invalid.join(', ')}` }, { status: 400 });
  }

  // First role in the array is the primary role (determines default dashboard)
  const primaryRole = rawRoles[0];

  // Agro-dealers pick a business name here — it's what farmers see when
  // browsing registered businesses to buy from, so it's required up front
  // rather than left to an optional later profile edit.
  const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : '';
  if (rawRoles.includes('supplier') && !businessName) {
    return NextResponse.json({ error: 'Business name is required for input suppliers' }, { status: 400 });
  }

  const update: Record<string, unknown> = { role: primaryRole, roles: rawRoles };
  if (businessName) update.business_name = businessName;

  const { error } = await (supabase.from as any)('profiles')
    .update(update)
    .eq('user_id', user.id);

  if (error) {
    console.error('[/api/onboarding/set-role]', error);
    return NextResponse.json({ error: 'Failed to set your role. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, redirect: ROLE_DASHBOARD[primaryRole] });
}
