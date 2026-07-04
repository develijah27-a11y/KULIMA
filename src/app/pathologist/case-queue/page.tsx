import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Leaf, CheckCircle2 } from 'lucide-react';
import { getCropColor } from '@/lib/crop-photos';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  red: 'var(--color-danger)', amber: 'var(--color-harvest)',
};

const URGENCY: Record<string, { label: string; color: string; bg: string }> = {
  high:   { label: 'URGENT', color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'  },
  medium: { label: 'MEDIUM', color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
  low:    { label: 'LOW',    color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
};


function timeAgo(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}

export default async function CaseQueuePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: cases } = await (supabase.from as any)('disease_reports')
    .select('id, crop_type, symptoms, district, urgency, farmer_name, created_at, status')
    .eq('status', 'reported')
    .order('urgency', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(50);

  const rows = (cases ?? []) as any[];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>New Cases</h1>
          <p className="text-sm mt-1" style={{ color: C.muted }}>{rows.length} pending case{rows.length !== 1 ? 's' : ''} awaiting triage</p>
        </div>
        <Link href="/pathologist/my-cases/new" style={{ padding: '8px 16px', background: C.red, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          + File Report
        </Link>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><CheckCircle2 size={40} style={{ color: C.green }} /></div>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Queue is clear</p>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>No pending disease cases to triage right now.</p>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          {rows.map((c: any, i: number) => {
            const urg = URGENCY[c.urgency] ?? URGENCY.low;
            return (
              <Link key={c.id} href={`/pathologist/cases/${c.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
                borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : 'none',
                textDecoration: 'none', background: C.cardBg,
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: urg.bg, border: `1px solid ${urg.color}` }}>
                  <Leaf size={18} style={{ color: getCropColor(c.crop_type) }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0, textTransform: 'capitalize' }}>{c.crop_type} · {c.district}</p>
                    <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: urg.bg, color: urg.color, flexShrink: 0 }}>{urg.label}</span>
                  </div>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.symptoms ?? 'No symptoms described'}</p>
                  {c.farmer_name && <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>Farmer: {c.farmer_name}</p>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{timeAgo(c.created_at)}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: C.greenMed, margin: '4px 0 0' }}>Triage →</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
