import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Leaf } from 'lucide-react';
import { getCropColor } from '@/lib/crop-photos';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
};


export default async function GroupListingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: listings } = await (supabase.from as any)('group_listings')
    .select('id, crop_type, total_quantity_kg, asking_price, district, status, created_at, member_count, notes')
    .eq('admin_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (listings ?? []) as any[];
  const active = rows.filter((l: any) => l.status === 'active');
  const other = rows.filter((l: any) => l.status !== 'active');

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Group Listings</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>{active.length} active · {rows.length} total</p>
        </div>
        <Link href="/groups/listings/create" style={{ padding: '8px 16px', background: C.greenMed, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          + New Listing
        </Link>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><Leaf size={40} style={{ color: C.muted }} /></div>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>No group listings yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Pool your members' produce into consolidated listings to attract better-paying buyers.</p>
          <Link href="/groups/listings/create" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', background: C.greenMed, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Create First Listing →
          </Link>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Active</p>
              <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
                {active.map((l: any, i: number) => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < active.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Leaf size={20} style={{ color: getCropColor(l.crop_type) }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px', textTransform: 'capitalize' }}>{l.crop_type}</p>
                      <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{(l.total_quantity_kg ?? 0).toLocaleString()} kg · {l.district} · {l.member_count ?? 1} farmer{(l.member_count ?? 1) !== 1 ? 's' : ''}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: C.greenMed, margin: '0 0 2px', letterSpacing: '-0.01em' }}>UGX {Math.round(l.asking_price ?? 0).toLocaleString()}</p>
                      <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>per kg</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {other.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Closed</p>
              <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden', opacity: 0.7 }}>
                {other.map((l: any, i: number) => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderBottom: i < other.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '0 0 2px', textTransform: 'capitalize' }}>{l.crop_type} · {l.district}</p>
                      <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{new Date(l.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'var(--d-bg)', color: C.muted, textTransform: 'capitalize' }}>{l.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
