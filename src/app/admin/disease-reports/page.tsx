import { createClient } from '@/lib/supabase/server';
import { Microscope } from 'lucide-react';
import { ReportControls } from './ReportControls';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
};

const URGENCY_CFG: Record<string, { color: string; bg: string }> = {
  low:      { color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)' },
  medium:   { color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
  high:     { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  critical: { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)' },
};

export default async function AdminDiseaseReportsPage() {
  const supabase = await createClient();

  const [{ data: reports }, { data: pathologists }] = await Promise.all([
    (supabase.from as any)('disease_reports')
      .select('id, farmer_name, crop_type, symptoms, urgency, district, status, pathologist_id, reported_at')
      .order('reported_at', { ascending: false })
      .limit(100),
    (supabase.from as any)('profiles').select('id, full_name').eq('role', 'pathologist'),
  ]);

  const rows = (reports ?? []) as any[];
  const pathologistList = (pathologists ?? []) as any[];

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: 0, letterSpacing: '-0.03em' }}>Disease Reports</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>
          Farmer-submitted crop disease reports. Assign a pathologist or update status.
        </p>
      </div>

      {rows.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: C.muted }}><Microscope size={40} /></div>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>No disease reports yet</p>
        </div>
      ) : (
        <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, overflow: 'hidden' }}>
          <div className="divide-y" style={{ borderColor: C.border }}>
            {rows.map(r => {
              const urgency = URGENCY_CFG[r.urgency] ?? URGENCY_CFG.medium;
              return (
                <div key={r.id} className="px-5 py-4" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0, textTransform: 'capitalize' }}>
                        {r.crop_type} · {r.farmer_name ?? 'Unknown farmer'}
                      </p>
                      <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0' }}>{r.district} · {new Date(r.reported_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.04em', color: urgency.color, background: urgency.bg }}>
                      {r.urgency}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.5 }}>{r.symptoms}</p>
                  <ReportControls reportId={r.id} status={r.status} pathologistId={r.pathologist_id} pathologists={pathologistList} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
