import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthSession, getSupabase } from '@/lib/supabase/auth-cache';
import { WorkersClient } from './WorkersClient';

const C = { text: 'var(--d-text)', muted: 'var(--d-muted)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)', border: 'var(--d-border)', shadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)' };

async function WorkersData({ userId }: { userId: string }) {
  const supabase = await getSupabase();
  const [workersRes, farmsRes] = await Promise.all([
    (supabase.from as any)('farm_workers').select('*, farms(name)').eq('owner_id', userId).order('created_at', { ascending: false }),
    (supabase.from as any)('farms').select('id, name').eq('user_id', userId).eq('is_active', true),
  ]);
  return (
    <WorkersClient
      initialWorkers={workersRes.data ?? []}
      farms={farmsRes.data ?? []}
    />
  );
}

export default async function FarmWorkersPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect('/auth/signin');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: C.muted }}>
        <Link href="/farmer/farm" style={{ color: C.muted, textDecoration: 'none' }}>My Farm</Link>
        <span>/</span>
        <span style={{ color: C.text, fontWeight: 600 }}>Workers & Roles</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: 4 }}>
            Workers & Roles
          </h1>
          <p style={{ fontSize: 13, color: C.muted }}>
            Manage your farm team — assign roles, tasks, and track wages
          </p>
        </div>
      </div>

      <Suspense fallback={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="dash-skeleton h-24 rounded-2xl" />)}
        </div>
      }>
        <WorkersData userId={session.user.id} />
      </Suspense>
    </div>
  );
}
