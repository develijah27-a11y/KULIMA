import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', greenMed: 'var(--color-primary-hover)',
};

export default async function SupplierFlashDealsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Flash Deals ⚡</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Create time-limited discounts to move stock fast</p>
      </div>

      <div style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)', borderRadius: 16, padding: '32px 28px', textAlign: 'center' }}>
        <p style={{ fontSize: 48, marginBottom: 12 }}>⚡</p>
        <p style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Flash Deals Coming Soon</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 20, lineHeight: 1.6, maxWidth: 360, margin: '0 auto 20px' }}>
          Create limited-time offers on fertilisers, seeds, and tools — visible to farmers near you for up to 48 hours.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 280, margin: '0 auto' }}>
          {[
            'Set discount % or fixed price reduction',
            'Choose active duration (6h / 24h / 48h)',
            'Target farmers by crop type or district',
            'Track views and orders in real-time',
          ].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left' }}>
              <span style={{ fontSize: 14, color: 'var(--color-primary-muted)' }}>✓</span>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', margin: 0 }}>{f}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.cardShadow, padding: '20px' }}>
        <p className="text-sm font-bold mb-2" style={{ color: C.text }}>While you wait</p>
        <p className="text-xs mb-4" style={{ color: C.muted }}>Promote your products by keeping your catalogue up to date with accurate stock and pricing.</p>
        <Link href="/supplier/catalogue" style={{ display: 'inline-block', padding: '10px 20px', background: C.greenMed, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          Manage Catalogue →
        </Link>
      </div>
    </div>
  );
}
