'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  BADGE_CONFIG, LEVEL_DETAILS, getRequiredDocs, canUpgradeTo,
  type VerificationLevel,
} from '@/lib/trust';

const C = {
  text: '#1A1A1A', muted: '#6B7280', border: '#E5E7EB',
  cardBg: '#FFFFFF', green: '#1B4332', greenBright: '#52B788',
  cardShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
};

type TargetLevel = 'green' | 'blue' | 'gold';

interface Props {
  userId: string;
  profileId: string;
  role: string;
  currentLevel: VerificationLevel;
  hasPending: boolean;
}

export function VerifyWizard({ userId, profileId, role, currentLevel, hasPending }: Props) {
  const [step, setStep]           = useState<'choose' | 'upload' | 'done'>(hasPending ? 'done' : 'choose');
  const [target, setTarget]       = useState<TargetLevel | null>(null);
  const [files, setFiles]         = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState('');
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const supabase = createClient();
  const levels: TargetLevel[] = ['green', 'blue', 'gold'];

  async function handleSubmit() {
    if (!target) return;
    const docs = getRequiredDocs(target, role);
    for (const doc of docs) {
      if (!files[doc.key]) { setError(`Please upload: ${doc.label}`); return; }
    }
    setUploading(true);
    setError('');

    const urls: Record<string, string> = {};
    try {
      for (const doc of docs) {
        const file = files[doc.key]!;
        const ext = file.name.split('.').pop() ?? 'jpg';
        const path = `${userId}/${target}/${doc.key}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('kyc-documents')
          .upload(path, file, { upsert: true });
        if (upErr) throw new Error(`Upload failed for ${doc.label}: ${upErr.message}`);
        const { data: urlData } = supabase.storage.from('kyc-documents').getPublicUrl(path);
        urls[doc.key] = urlData.publicUrl;
      }

      const { error: dbErr } = await supabase.from('verifications' as any).insert({
        user_id:            userId,
        profile_id:         profileId,
        level:              target,
        role,
        national_id_url:    urls.national_id    ?? null,
        selfie_url:         urls.selfie         ?? null,
        business_reg_url:   urls.business_reg   ?? null,
        driving_permit_url: urls.driving_permit ?? null,
        vehicle_reg_url:    urls.vehicle_reg    ?? null,
        qualifications_url: urls.qualifications ?? null,
      });
      if (dbErr) throw new Error(dbErr.message);
      setStep('done');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  /* ─── DONE / PENDING STATE ─── */
  if (step === 'done') {
    return (
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: 32, textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h2 style={{ color: C.text, fontWeight: 800, fontSize: 20, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Verification Under Review
        </h2>
        <p style={{ color: C.muted, fontSize: 14, margin: '0 0 24px' }}>
          Our team will review your documents and respond within{' '}
          <strong style={{ color: C.text }}>1–3 business days</strong>.
          You'll receive a notification once approved.
        </p>
        <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '12px 16px', display: 'inline-block' }}>
          <p style={{ color: '#059669', fontSize: 13, fontWeight: 600, margin: 0 }}>
            ✓ Documents submitted successfully
          </p>
        </div>
      </div>
    );
  }

  /* ─── STEP 1: CHOOSE LEVEL ─── */
  if (step === 'choose') {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h2 style={{ color: C.text, fontWeight: 800, fontSize: 20, marginBottom: 6, letterSpacing: '-0.02em' }}>
          Choose Verification Level
        </h2>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>
          Higher verification unlocks more features, better trust scores, and access to financing.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {levels.map((lvl) => {
            const cfg    = BADGE_CONFIG[lvl];
            const detail = LEVEL_DETAILS[lvl];
            const locked = !canUpgradeTo(currentLevel, lvl);
            const sel    = target === lvl;
            return (
              <button
                key={lvl}
                onClick={() => !locked && setTarget(lvl)}
                disabled={locked}
                style={{
                  background:  locked ? '#F9FAFB' : sel ? cfg.bg : C.cardBg,
                  border:      `2px solid ${sel ? cfg.border : locked ? C.border : C.border}`,
                  borderRadius: 14,
                  padding:     '16px 20px',
                  textAlign:   'left',
                  cursor:      locked ? 'not-allowed' : 'pointer',
                  opacity:     locked ? 0.5 : 1,
                  boxShadow:   sel ? `0 0 0 3px ${cfg.border}` : 'none',
                  transition:  'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', borderRadius: 999,
                    background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {lvl === 'green' ? '✓' : lvl === 'blue' ? '◆' : '★'} {cfg.label}
                  </span>
                  {locked && (
                    <span style={{ fontSize: 11, color: C.muted }}>
                      Already at this level or above
                    </span>
                  )}
                </div>
                <p style={{ color: C.text, fontWeight: 700, fontSize: 15, margin: '0 0 4px' }}>{detail.title}</p>
                <p style={{ color: C.muted, fontSize: 13, margin: '0 0 8px' }}>{detail.description}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {detail.benefits.map(b => (
                    <span key={b} style={{ fontSize: 11, color: cfg.color, background: cfg.bg, padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>
                      {b}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: C.muted, margin: '8px 0 0' }}>Review time: {detail.time}</p>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => target && setStep('upload')}
          disabled={!target}
          style={{
            marginTop: 24, width: '100%', padding: '14px',
            background: target ? C.green : C.border,
            color: target ? '#fff' : C.muted,
            border: 'none', borderRadius: 12,
            fontWeight: 700, fontSize: 15, cursor: target ? 'pointer' : 'not-allowed',
          }}
        >
          Continue →
        </button>
      </div>
    );
  }

  /* ─── STEP 2: UPLOAD DOCUMENTS ─── */
  const docs = target ? getRequiredDocs(target, role) : [];
  return (
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <button
        onClick={() => setStep('choose')}
        style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 16 }}
      >
        ← Back
      </button>
      <h2 style={{ color: C.text, fontWeight: 800, fontSize: 20, marginBottom: 6, letterSpacing: '-0.02em' }}>
        Upload Documents
      </h2>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>
        Upload clear photos or PDFs. Files must be under 5 MB each.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {docs.map((doc) => {
          const file = files[doc.key];
          return (
            <div
              key={doc.key}
              onClick={() => fileRefs.current[doc.key]?.click()}
              style={{
                background: file ? '#F0FDF4' : C.cardBg,
                border: `2px dashed ${file ? '#A7F3D0' : C.border}`,
                borderRadius: 12, padding: '16px 20px',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <input
                ref={el => { fileRefs.current[doc.key] = el; }}
                type="file"
                accept={doc.accept}
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0] ?? null;
                  setFiles(prev => ({ ...prev, [doc.key]: f }));
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ color: C.text, fontWeight: 600, fontSize: 14, margin: 0 }}>{doc.label}</p>
                  <p style={{ color: C.muted, fontSize: 12, margin: '2px 0 0' }}>
                    {file ? file.name : 'Tap to upload • JPG, PNG or PDF'}
                  </p>
                </div>
                <span style={{ fontSize: 22 }}>{file ? '✅' : '📎'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: '#FEF2F2', borderRadius: 10, border: '1px solid #FECACA' }}>
          <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>⚠ {error}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={uploading}
        style={{
          marginTop: 24, width: '100%', padding: '14px',
          background: uploading ? C.border : C.green,
          color: uploading ? C.muted : '#fff',
          border: 'none', borderRadius: 12,
          fontWeight: 700, fontSize: 15, cursor: uploading ? 'not-allowed' : 'pointer',
        }}
      >
        {uploading ? 'Uploading...' : 'Submit for Review'}
      </button>
    </div>
  );
}
