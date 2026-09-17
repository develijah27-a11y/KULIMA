'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf, Stethoscope, MessageSquare, Phone, ExternalLink, User, Copy, Check, Sparkles } from 'lucide-react';

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
  low:      { color: 'var(--color-success)', bg: 'var(--color-success-bg)', label: 'Low' },
  medium:   { color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)', label: 'Medium' },
  high:     { color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)',  label: 'High' },
  critical: { color: '#7F1D1D',              bg: 'var(--color-danger-bg)',  label: 'Critical' },
  unknown:  { color: 'var(--d-muted)',       bg: 'var(--color-surface-2)',  label: 'Unknown' },
};

const TREATMENT_TEMPLATES: Record<string, string> = {
  'Fall Armyworm':   'Spray emamectin benzoate (Escort) 0.4 g/L. Repeat after 7 days if reinfestation occurs. Early morning or evening application is best.',
  'Late Blight':     'Apply Mancozeb 2.5 kg/ha or Metalaxyl+Mancozeb. Remove and destroy infected plant parts. Avoid overhead irrigation.',
  'Banana Xanthomonas Wilt': 'Remove and destroy all infected mats. Disinfect tools with 10% bleach or 70% alcohol between plants. Plant resistant varieties.',
  'Coffee Berry Disease': 'Spray copper oxychloride or Mancozeb at berry formation (BB stage). Ensure full canopy coverage.',
  'Cassava Mosaic':  'Use clean, certified disease-free planting material. Remove and destroy infected plants. Control whitefly vectors with neonicotinoids.',
};

interface FarmerProfile {
  id?: string;
  user_id?: string;
  full_name?: string | null;
  phone_number?: string | null;
  location?: string | null;
}

interface Case {
  id: string;
  crop_type: string;
  symptoms: string;
  urgency: string;
  district: string;
  status: string;
  reported_at: string;
  created_at: string;
  pathologist_id?: string;
  diagnosis?: string;
  treatment?: string;
  image_urls?: string[];
  farmer_id?: string;
  farmer_name?: string;
  farmer?: FarmerProfile | null;
}

interface ConsultationInfo {
  id: string;
  type: string;
  status: string;
  fee_ugx: number;
}

export function CaseDetailClient({
  c,
  profileId,
  consultation,
}: {
  c: Case;
  profileId: string;
  consultation?: ConsultationInfo | null;
}) {
  const router = useRouter();
  const [caseData, setCaseData] = useState<Case>(c);
  const [diagnosis, setDx]   = useState(c.diagnosis ?? '');
  const [treatment, setTx]   = useState(c.treatment ?? '');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]    = useState('');
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    setCaseData(c);
    if (c.diagnosis) setDx(c.diagnosis);
    if (c.treatment) setTx(c.treatment);
  }, [c]);

  const isAssigned   = caseData.pathologist_id === profileId;
  const canDiagnose  = (caseData.status === 'assigned' || caseData.status === 'diagnosed') && isAssigned;
  const canClaim     = caseData.status === 'reported' && !caseData.pathologist_id;
  const canClose     = caseData.status === 'diagnosed' && isAssigned;

  const sev = SEV_CFG[caseData.urgency] ?? SEV_CFG.unknown;
  const farmer = caseData.farmer;
  const phone = farmer?.phone_number ?? '';
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${farmer?.full_name ?? caseData.farmer_name ?? 'Farmer'}, I am the plant pathologist assigned to your ${caseData.crop_type} case on Cropify.`)}`
    : null;

  async function action(act: string, extra?: object) {
    setLoading(act); setError('');
    try {
      const res = await fetch('/api/disease-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: caseData.id, action: act, diagnosis, treatment, ...extra }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }

      // Optimistic update of local state so the UI transitions instantly
      if (act === 'claim') {
        setCaseData(prev => ({
          ...prev,
          status: 'assigned',
          pathologist_id: profileId,
        }));
      } else if (act === 'diagnose') {
        setCaseData(prev => ({
          ...prev,
          status: 'diagnosed',
          diagnosis,
          treatment,
        }));
      } else if (act === 'close') {
        setCaseData(prev => ({
          ...prev,
          status: 'closed',
        }));
      }

      router.refresh();
    } finally { setLoading(null); }
  }

  function handleCopyPhone(p: string) {
    navigator.clipboard.writeText(p);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link href="/pathologist/cases" style={{ color: C.muted, fontSize: 13, textDecoration: 'none' }}>← Back to New Cases</Link>

      {/* Case summary */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: sev.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: sev.color }}>
            <Leaf size={26} />
          </div>
          <div>
            <h1 className="text-lg font-black" style={{ color: C.text, letterSpacing: '-0.02em', margin: '0 0 4px', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif", textTransform: 'capitalize' }}>
              {caseData.crop_type} Disease Report
            </h1>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: sev.bg, color: sev.color }}>{sev.label} severity</span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--d-subtle)', color: C.muted, textTransform: 'capitalize' }}>
                {caseData.status === 'assigned' && isAssigned ? 'Assigned to you' : caseData.status}
              </span>
              {isAssigned && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
                  Active Case
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'District', value: caseData.district },
            { label: 'Reported', value: new Date(caseData.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' }) },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '10px 14px', background: 'var(--d-subtle)', borderRadius: 10 }}>
              <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 3px' }}>{label}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, padding: '14px 16px', background: 'var(--d-subtle)', borderRadius: 10 }}>
          <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 6px' }}>Symptoms</p>
          <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.6 }}>{caseData.symptoms ?? 'None described'}</p>
        </div>

        {caseData.image_urls && caseData.image_urls.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 8px' }}>Photos</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {caseData.image_urls.map((url: string, i: number) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', flexShrink: 0 }}>
                  <Image
                    src={url}
                    alt={`Photo ${i + 1}`}
                    width={80}
                    height={80}
                    style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid var(--d-border)', display: 'block' }}
                    loading="lazy"
                    unoptimized={!url.includes('supabase.co')}
                  />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Farmer Contact & Consultation Communication */}
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--color-primary-bg)', color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>
                {farmer?.full_name ?? caseData.farmer_name ?? 'Farmer'}
              </p>
              <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>
                {caseData.district}{phone ? ` · ${phone}` : ''}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {consultation && (
              <Link
                href={`/pathologist/chat/${consultation.id}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9,
                  background: C.green, color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none',
                }}>
                <MessageSquare size={13} /> Open In-App Chat
              </Link>
            )}
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 9,
                  background: '#25D366', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none',
                }}>
                <ExternalLink size={13} /> WhatsApp
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 9,
                  background: 'var(--d-subtle)', border: `1px solid ${C.border}`, color: C.text, fontSize: 12, fontWeight: 600, textDecoration: 'none',
                }}>
                <Phone size={13} /> Call
              </a>
            )}
          </div>
        </div>

        <p style={{ fontSize: 11, color: C.muted, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
          <Sparkles size={11} style={{ color: C.green }} />
          Zero airtime cost: farmers can exchange text messages, crop photos, and audio voice notes directly inside the app.
        </p>
      </div>

      {/* Diagnosis section */}
      {(canDiagnose || caseData.diagnosis) && (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 24 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 16px', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Diagnosis & Treatment</p>

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
            {loading === 'claim' ? 'Claiming…' : <><Stethoscope size={14} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 5 }} />Claim This Case</>}
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
            {caseData.status === 'closed' ? 'This case is closed.' : isAssigned ? 'Diagnosis submitted.' : 'This case is assigned to another pathologist.'}
          </p>
        )}
      </div>
    </div>
  );
}
