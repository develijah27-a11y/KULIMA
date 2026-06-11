'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  text:       'var(--d-text)',
  muted:      'var(--d-muted)',
  border:     'var(--d-border)',
  cardBg:     'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)',
  green:      'var(--color-primary)',
  greenMed:   'var(--color-primary-hover)',
  red:        'var(--color-danger)',
  amber:      'var(--color-harvest)',
};

const SEV_CFG: Record<string, { color: string; bg: string; label: string }> = {
  low:      { color: '#059669', bg: '#D1FAE5', label: 'Low' },
  medium:   { color: '#D97706', bg: '#FEF3C7', label: 'Medium' },
  high:     { color: '#DC2626', bg: '#FEE2E2', label: 'High' },
  critical: { color: '#7F1D1D', bg: '#FEE2E2', label: 'Critical' },
  unknown:  { color: '#6B7280', bg: '#F3F4F6', label: 'Unknown' },
};

const TREATMENT_TEMPLATES: Record<string, string> = {
  'Fall Armyworm':   'Spray emamectin benzoate (Escort) 0.4 g/L. Repeat after 7 days if reinfestation occurs. Early morning or evening application is best.',
  'Late Blight':     'Apply Mancozeb 2.5 kg/ha or Metalaxyl+Mancozeb. Remove and destroy infected plant parts. Avoid overhead irrigation.',
  'Banana Xanthomonas Wilt': 'Remove and destroy all infected mats. Disinfect tools with 10% bleach or 70% alcohol between plants. Plant resistant varieties.',
  'Coffee Berry Disease': 'Spray copper oxychloride or Mancozeb at berry formation (BB stage). Ensure full canopy coverage.',
  'Cassava Mosaic':  'Use clean, certified disease-free planting material. Remove and destroy infected plants. Control whitefly vectors with neonicotinoids.',
};

interface Case {
  id: string;
  crop_type: string;
  symptoms: string;
  severity: string;
  district: string;
  status: string;
  reported_at: string;
  created_at: string;
  pathologist_id?: string;
  diagnosis?: string;
  treatment?: string;
  image_urls?: string[];
}

export function CaseDetailClient({ c, profileId }: { c: Case; profileId: string }) {
  const router = useRouter();
  const [diagnosis, setDx]   = useState(c.diagnosis ?? '');
  const [treatment, setTx]   = useState(c.treatment ?? '');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]    = useState('');

  const isAssigned   = c.pathologist_id === profileId;
  const canDiagnose  = c.status === 'assigned' && isAssigned;
  const canClaim     = c.status === 'open';
  const canClose     = c.status === 'diagnosed' && isAssigned;

  const sev = SEV_CFG[c.severity] ?? SEV_CFG.unknown;

  async function action(act: string, extra?: object) {
    setLoading(act); setError('');
    try {
      const res = await fetch('/api/disease-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: c.id, action: act, diagnosis, treatment, ...extra }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      router.refresh();
    } finally { setLoading(null); }
  }

  const CROP_EMOJI: Record<string, string> = {
    maize:'🌽', coffee:'☕', beans:'🫘', banana:'🍌', cassava:'🥔', tomato:'🍅', rice:'🌾', sunflower:'🌻',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link href="/pathologist/cases" style={{ color: C.muted, fontSize: 13, textDecoration: 'none' }}>← Back to Case Queue</Link>

      {/* Case summary */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: sev.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
            {CROP_EMOJI[c.crop_type?.toLowerCase()] ?? '🌱'}
          </div>
          <div>
            <h1 className="text-lg font-black" style={{ color: C.text, letterSpacing: '-0.02em', margin: '0 0 4px', fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: 'capitalize' }}>
              {c.crop_type} Disease Report
            </h1>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: sev.bg, color: sev.color }}>{sev.label} severity</span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--d-subtle)', color: C.muted, textTransform: 'capitalize' }}>{c.status}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'District', value: c.district },
            { label: 'Reported', value: new Date(c.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' }) },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '10px 14px', background: 'var(--d-subtle)', borderRadius: 10 }}>
              <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 3px' }}>{label}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, padding: '14px 16px', background: 'var(--d-subtle)', borderRadius: 10 }}>
          <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 6px' }}>Symptoms</p>
          <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.6 }}>{c.symptoms ?? 'None described'}</p>
        </div>

        {c.image_urls && c.image_urls.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 8px' }}>Photos</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {c.image_urls.map((url: string, i: number) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={`Photo ${i + 1}`} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--d-border)' }} />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Diagnosis section */}
      {(canDiagnose || c.diagnosis) && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 24 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 16px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Diagnosis & Treatment</p>

          {canDiagnose && (
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 11, color: C.muted, margin: '0 0 8px' }}>Quick templates:</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.keys(TREATMENT_TEMPLATES).map(name => (
                  <button key={name} onClick={() => setTx(TREATMENT_TEMPLATES[name])}
                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--d-border)', background: 'transparent', color: C.muted, fontSize: 11, cursor: 'pointer' }}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>Diagnosis *</label>
              <input value={diagnosis} onChange={e => setDx(e.target.value)} disabled={!canDiagnose}
                placeholder="Identify the disease or pathogen…"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13, boxSizing: 'border-box', opacity: canDiagnose ? 1 : 0.7 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, display: 'block', marginBottom: 5 }}>Treatment Recommendation</label>
              <textarea value={treatment} onChange={e => setTx(e.target.value)} disabled={!canDiagnose}
                placeholder="Recommended treatment protocol…"
                rows={4}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--d-border)', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', opacity: canDiagnose ? 1 : 0.7 }} />
            </div>
          </div>

          {error && <p style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{error}</p>}

          {canDiagnose && (
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button disabled={!diagnosis || loading === 'diagnose'} onClick={() => action('diagnose')}
                style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !diagnosis || loading === 'diagnose' ? 0.6 : 1 }}>
                {loading === 'diagnose' ? 'Saving…' : 'Submit Diagnosis'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        {canClaim && (
          <button disabled={loading === 'claim'} onClick={() => action('claim')}
            style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: C.green, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            {loading === 'claim' ? 'Claiming…' : '🩺 Claim This Case'}
          </button>
        )}
        {canClose && (
          <button disabled={loading === 'close'} onClick={() => action('close')}
            style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            {loading === 'close' ? 'Closing…' : 'Mark as Closed'}
          </button>
        )}
        {!canClaim && !canDiagnose && !canClose && (
          <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', width: '100%' }}>
            {c.status === 'closed' ? 'This case is closed.' : isAssigned ? 'Diagnosis already submitted.' : 'This case is assigned to another pathologist.'}
          </p>
        )}
      </div>
    </div>
  );
}
