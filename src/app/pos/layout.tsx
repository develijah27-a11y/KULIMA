import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// /pos/* is a deliberately separate route tree from /supplier/* — it's
// meant to also serve pos_staff accounts from Phase 4, which must never be
// able to reach /supplier/* (catalogue management, wallet, analytics).
// Until Phase 4 ships, only the supplier owner can reach it.
export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase.from('profiles').select('role, roles').eq('user_id', user.id).single();
  const roles: string[] = (profile as any)?.roles ?? [];
  const isSupplier = (profile as any)?.role === 'supplier' || roles.includes('supplier');
  if (!profile || !isSupplier) redirect('/dashboard');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--d-page)' }}>
      {children}
    </div>
  );
}
