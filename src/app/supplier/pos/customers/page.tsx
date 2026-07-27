import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getEffectiveTier } from '@/lib/subscriptions/getEffectiveTier';
import { CustomersClient } from './CustomersClient';
import { Lock } from 'lucide-react';

export default async function SupplierPosCustomersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase
    .from('profiles').select('role, subscription_tier, role_subscription_tiers').eq('user_id', user.id).single();
  const tier = getEffectiveTier(profile as any, 'supplier');

  if (tier !== 'enterprise') {
    return (
      <div className="max-w-lg mx-auto" style={{ padding: '60px 16px', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--color-purple-bg)', color: 'var(--color-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <Lock size={24} />
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 900, color: 'var(--d-text)', margin: '0 0 8px' }}>Customer records need Enterprise</h1>
        <p style={{ fontSize: 13.5, color: 'var(--d-muted)', margin: '0 0 20px', lineHeight: 1.6 }}>
          See your repeat customers and how much they've spent once you're on the Enterprise plan.
        </p>
        <Link href="/supplier/premium" style={{ display: 'inline-flex', padding: '11px 22px', borderRadius: 11, background: 'var(--color-purple)', color: '#fff', fontWeight: 800, fontSize: 13.5, textDecoration: 'none' }}>
          Contact sales
        </Link>
      </div>
    );
  }

  return <CustomersClient />;
}
