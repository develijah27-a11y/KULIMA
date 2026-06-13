import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', red: 'var(--color-danger)', greenMed: 'var(--color-primary-hover)',
};

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  const { data: c } = await (supabase.from as any)('disease_reports')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!c) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/pathologist/case-queue" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>← Back to Queue</Link>
        <span style={{ color: C.muted }}>·</span>
        <p style={{ fontSize: 13, color: C.muted, textTransform: 'capitalize' }}>Case #{params.id.slice(0, 8)}</p>
      </div>

      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '20px' }}>
        <h1 className="text-lg font-black mb-1 capitalize" style={{ color: C.text }}>{c.crop_type} Disease Case</h1>
        <p style={{ fontSize: 12, color: C.muted }}>{c.district} · Reported {new Date(c.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

        <div className="space-y-4 mt-5">
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 4 }}>Reported Symptoms</p>
            <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>{c.symptoms ?? 'Not specified'}</p>
          </div>

          {c.farmer_name && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 4 }}>Farmer</p>
              <p style={{ fontSize: 14, color: C.text }}>{c.farmer_name}</p>
            </div>
          )}

          {c.urgency && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 4 }}>Severity</p>
              <span style={{
                display: 'inline-block', padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                background: c.urgency === 'high' ? 'var(--color-danger-bg)' : c.urgency === 'medium' ? 'var(--color-harvest-bg)' : 'var(--color-success-bg)',
                color: c.urgency === 'high' ? 'var(--color-danger)' : c.urgency === 'medium' ? 'var(--color-harvest)' : 'var(--color-success)',
              }}>
                {c.urgency}
              </span>
            </div>
          )}

          {c.diagnosis && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 4 }}>Current Diagnosis</p>
              <p style={{ fontSize: 14, color: C.text }}>{c.diagnosis}</p>
            </div>
          )}
          {c.treatment && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', marginBottom: 4 }}>Treatment Plan</p>
              <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>{c.treatment}</p>
            </div>
          )}
        </div>
      </div>

      {c.status === 'reported' && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '20px' }}>
          <p className="text-sm font-bold mb-4" style={{ color: C.text }}>Submit Diagnosis & Treatment</p>
          <p style={{ fontSize: 12, color: C.muted }}>
            Full diagnosis submission is available through the case management system.
            Use the disease reports API endpoint to update this case.
          </p>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <Link href="/pathologist/case-queue" style={{ flex: 1, padding: '10px', background: 'var(--color-surface-2)', color: C.muted, borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
              Back to Queue
            </Link>
            <Link href="/pathologist/my-cases" style={{ flex: 1, padding: '10px', background: C.red, color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
              My Cases →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
