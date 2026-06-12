import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', blue: 'var(--color-sky)',
};

const FEATURES = [
  { icon: '💬', title: 'Farmer Chat', desc: 'Message individual farmers about contract terms, delivery logistics, and quality specs.' },
  { icon: '📢', title: 'Broadcast', desc: 'Send price updates and procurement notices to all contracted farmers at once.' },
  { icon: '🤝', title: 'Negotiation Thread', desc: 'Structured back-and-forth negotiation with audit trail for compliance.' },
  { icon: '📎', title: 'Document Sharing', desc: 'Share contract PDFs, grading guides, and delivery instructions securely.' },
];

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Messages 💬</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Direct communication with your farmer suppliers</p>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-sky-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' }}>💬</div>
        <p style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>Messaging Coming Soon</p>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 24px', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
          We're building a direct communication channel between offtakers and farmers. No more phone tag about delivery logistics.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderRadius: 12, background: 'var(--d-bg)' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{f.title}</p>
                <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
