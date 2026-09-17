import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SupportTickets } from '@/components/support/SupportTickets';
import Link from 'next/link';
import { LifeBuoy, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Customer Support & Complaints | Cropify',
  description: 'Submit and track support tickets, report quality disputes, and get assistance from the Cropify operations team.',
};

export default async function GenericSupportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin?next=/support');

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('user_id', user.id).single();
  const role = (profile as any)?.role ?? 'user';
  const roleDashboard = role === 'admin' ? '/admin/support' : `/${role}/dashboard`;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--d-bg)', padding: '24px 16px 64px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <Link
            href={roleDashboard}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', textDecoration: 'none',
            }}
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--d-muted)', fontSize: 12, fontWeight: 600 }}>
            <LifeBuoy size={14} style={{ color: 'var(--color-primary)' }} />
            Cropify 24/7 Support Desk
          </div>
        </div>

        {/* Support Component */}
        <SupportTickets />
      </div>
    </div>
  );
}
