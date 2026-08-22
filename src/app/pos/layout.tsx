import '../dashboard.css';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// /pos/* is a deliberately separate route tree from /supplier/* — reachable
// by the store owner ('supplier' role) OR an active 'pos_staff' account,
// which must never be able to reach /supplier/* (catalogue management,
// wallet, analytics — owner-only).
export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: profile } = await supabase.from('profiles').select('role, roles').eq('user_id', user.id).single();
  const roles: string[] = (profile as any)?.roles ?? [];
  const isSupplier = (profile as any)?.role === 'supplier' || roles.includes('supplier');

  if (isSupplier) {
    return <div style={{ minHeight: '100vh', background: 'var(--d-page)' }}>{children}</div>;
  }

  if ((profile as any)?.role === 'pos_staff') {
    // must_change_password is deliberately NOT enforced here — this layout
    // also wraps /pos/change-password itself, so a blanket redirect here
    // would loop. Pages that do real work (till, reports, etc.) check it
    // individually and redirect if needed.
    const { data: staff } = await (supabase.from as any)('pos_staff')
      .select('is_active').eq('user_id', user.id).maybeSingle();
    if (!staff || !staff.is_active) redirect('/auth/signin');
    return <div style={{ minHeight: '100vh', background: 'var(--d-page)' }}>{children}</div>;
  }

  redirect('/dashboard');
}
