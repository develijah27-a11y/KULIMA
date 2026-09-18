'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  BADGE_CONFIG, getLevelDetails, getRequiredDocs,
  type VerificationLevel,
} from '@/lib/trust';
import { Clock, CheckCircle2, Check, Diamond, Star, Paperclip, AlertTriangle, Camera, ShieldCheck, RefreshCw } from 'lucide-react';
import { SelfieCameraCapture } from './SelfieCameraCapture';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', green: 'var(--color-primary)', greenBright: 'var(--color-primary-muted)',
  cardShadow: 'var(--d-shadow-card)',
};

type TargetLevel = 'blue' | 'gold';

interface Props {
  userId: string;
  profileId: string;
  role: string;
  currentLevel: VerificationLevel;
  hasPending: boolean;
  existingDocs?: Record<string, string>;
  rejection?: { level: string; reason: string | null } | null;
}

export function VerifyWizard({
  userId,
  profileId,
  role,
  currentLevel,
  hasPending,
  existingDocs = {},
  rejection,
}: Props) {
  const isAlreadyBlue = currentLevel === 'blue';
  const defaultTarget: TargetLevel = isAlreadyBlue ? 'gold' : 'blue';

  const [step, setStep]                     = useState<'upload' | 'done'>(hasPending ? 'done' : 'upload');
  const [target, setTarget]                 = useState<TargetLevel>(defaultTarget);
  const [files, setFiles]                   = useState<Record<string, File | null>>({});
  const [retakeSelfie, setRetakeSelfie]     = useState(false);
  const [uploading, setUploading]           = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [error, setError]                   = useState('');
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cameraRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const supabase = createClient();
  const docs = getRequiredDocs(target, role);

  async function handleSubmit() {
    setError('');

    // Check which required documents are missing (not uploaded AND not already on file)
    const missing: string[] = [];
    for (const doc of docs) {
      const hasNewFile = !!files[doc.key];
      const hasExisting = !!existingDocs[doc.key];
      if (!hasNewFile && !hasExisting) {
        missing.push(doc.label);
      }
    }

    if (missing.length > 0) {
      setError(`Please provide: ${missing.join(', ')}`);
      return;
    }

    setUploading(true);

    // List of docs that actually need a new upload
    const docsToUpload = docs.filter(d => !!files[d.key]);
    setUploadProgress({ done: 0, total: docsToUpload.length });

    const urls: Record<string, string> = {};

    // 1. Carry forward any documents already verified on file
    for (const doc of docs) {
      if (!files[doc.key] && existingDocs[doc.key]) {
        urls[doc.key] = existingDocs[doc.key];
      }
    }

    try {
      if (docsToUpload.length > 0) {
        await supabase.auth.getSession();
        const results = await Promise.all(docsToUpload.map(async (doc) => {
          const file = files[doc.key]!;
          const ext = file.name.split('.').pop() ?? 'jpg';
          const path = `${userId}/${target}/${doc.key}.${ext}`;

          // Direct client storage upload
          const { error: upErr } = await supabase.storage
            .from('kyc-documents')
            .upload(path, file, { upsert: true });

          if (upErr) {
            // Fall back to server-side upload proxy if client storage had an issue
            const formData = new FormData();
            formData.append('file', file);
            formData.append('target', target);
            formData.append('docKey', doc.key);

            const serverRes = await fetch('/api/verify/upload', {
              method: 'POST',
              body: formData,
            });

            if (!serverRes.ok) {
              const errJson = await serverRes.json().catch(() => ({}));
              throw new Error(`Upload failed for ${doc.label}: ${errJson.error || upErr.message}`);
            }
          }

          setUploadProgress(p => ({ ...p, done: p.done + 1 }));
          return { key: doc.key, path };
        }));

        for (const { key, path } of results) {
          urls[key] = path;
        }
      }

      // Submit verification payload with all document references preserved
      const submitRes = await fetch('/api/verify/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: target,
          role,
          urls,
        }),
      });

      if (!submitRes.ok) {
        const errJson = await submitRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Verification submission failed. Please try again.');
      }

      setStep('done');
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress({ done: 0, total: 0 });
    }
  }

  /* ─── DONE / PENDING REVIEW STATE ─── */
  if (step === 'done') {
    return (
      <div style={{ background: C.cardBg, borderRadius: 16, padding: 32, textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--color-primary)' }}>
          <Clock size={48} />
        </div>
        <h2 style={{ color: C.text, fontWeight: 800, fontSize: 20, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Verification Under Review
        </h2>
        <p style={{ color: C.muted, fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
          Our verification team is reviewing your documents. Reviews are typically completed within{' '}
          <strong style={{ color: C.text }}>1 business day</strong>.
          You'll receive a notification the moment your account is approved.
        </p>
        <div style={{ background: 'var(--color-primary-bg)', borderRadius: 12, padding: '12px 16px', display: 'inline-block' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-success)', fontSize: 13, fontWeight: 700 }}>
            <CheckCircle2 size={15} /> All documents safely submitted
          </div>
        </div>
      </div>
    );
  }

  /* ─── UNIFIED ROLE KYC VERIFICATION FORM ─── */
  const roleCopy = getLevelDetails(target, role);

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      {rejection && (
        <div style={{ marginBottom: 20, padding: '14px 16px', background: 'var(--color-danger-bg)', borderRadius: 12, border: '1px solid var(--color-danger)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <AlertTriangle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ color: 'var(--color-danger)', fontWeight: 700, fontSize: 14, margin: 0 }}>
                Your last submission was not approved
              </p>
              <p style={{ color: C.text, fontSize: 13, margin: '4px 0 0' }}>
                {rejection.reason ?? 'Please double-check your documents are clear and match your legal name, then resubmit.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header & Role Context */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
          <h2 style={{ color: C.text, fontWeight: 800, fontSize: 20, margin: 0, letterSpacing: '-0.02em' }}>
            {roleCopy.title}
          </h2>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 999,
            background: target === 'gold' ? '#FEF3C7' : 'var(--color-sky-bg)',
            color: target === 'gold' ? '#D97706' : '#0284C7',
            fontSize: 11.5, fontWeight: 800,
          }}>
            {target === 'gold' ? <Star size={12} /> : <Diamond size={12} />}
            {target === 'gold' ? 'Enterprise Tier' : 'Official Verification'}
          </span>
        </div>
        <p style={{ color: C.muted, fontSize: 13.5, margin: '0 0 14px', lineHeight: 1.5 }}>
          {roleCopy.description}
        </p>

        {/* Benefits Pill Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {roleCopy.benefits.map(b => (
            <span key={b} style={{
              fontSize: 11.5,
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: 999,
              background: 'var(--color-surface-2)',
              color: 'var(--color-primary)',
              border: '1px solid var(--d-border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <Check size={11} /> {b}
            </span>
          ))}
        </div>
      </div>

      {/* Optional Enterprise Toggle (Only if account is already blue or for business roles) */}
      {(isAlreadyBlue || role === 'buyer' || role === 'supplier' || role === 'offtaker') && (
        <div style={{
          display: 'flex',
          background: 'var(--color-surface-2)',
          padding: 4,
          borderRadius: 12,
          marginBottom: 20,
          border: '1px solid var(--d-border)',
        }}>
          <button
            type="button"
            onClick={() => setTarget('blue')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 9,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 700,
              background: target === 'blue' ? C.cardBg : 'transparent',
              color: target === 'blue' ? C.text : C.muted,
              boxShadow: target === 'blue' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            Standard KYC
          </button>
          <button
            type="button"
            onClick={() => setTarget('gold')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 9,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12.5,
              fontWeight: 700,
              background: target === 'gold' ? C.cardBg : 'transparent',
              color: target === 'gold' ? '#D97706' : C.muted,
              boxShadow: target === 'gold' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            Enterprise Tier
          </button>
        </div>
      )}

      {/* Document Upload Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {docs.map((doc) => {
          const file = files[doc.key];
          const hasExisting = !!existingDocs[doc.key];
          const isSatisfied = !!file || (hasExisting && (!retakeSelfie || doc.key !== 'selfie'));

          // Live Selfie camera capture
          if (doc.key === 'selfie') {
            if (hasExisting && !retakeSelfie && !file) {
              return (
                <div
                  key={doc.key}
                  style={{
                    background: 'var(--color-primary-bg)',
                    border: '1.5px solid var(--color-primary-muted)',
                    borderRadius: 14,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <p style={{ color: C.text, fontWeight: 700, fontSize: 14, margin: 0 }}>
                        {doc.label}
                      </p>
                      <p style={{ color: 'var(--color-success)', fontSize: 12, fontWeight: 700, margin: '2px 0 0' }}>
                        Verified photo on file · No need to re-take
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRetakeSelfie(true)}
                    style={{
                      background: 'none',
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      padding: '6px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: C.muted,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <RefreshCw size={12} /> Re-take
                  </button>
                </div>
              );
            }

            return (
              <div
                key={doc.key}
                style={{
                  background: file ? 'var(--color-primary-bg)' : C.cardBg,
                  border: `2px dashed ${file ? 'var(--color-primary-muted)' : C.border}`,
                  borderRadius: 14,
                  padding: '16px 20px',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <p style={{ color: C.text, fontWeight: 700, fontSize: 14, margin: 0 }}>{doc.label}</p>
                    <p style={{ color: C.muted, fontSize: 12, margin: '2px 0 0' }}>Live front-camera photo confirming identity</p>
                  </div>
                  {file && <CheckCircle2 size={20} style={{ color: 'var(--color-success)' }} />}
                </div>
                <SelfieCameraCapture
                  capturedFile={file ?? null}
                  onCapture={(f) => {
                    setFiles(prev => ({ ...prev, selfie: f }));
                    setRetakeSelfie(false);
                  }}
                />
              </div>
            );
          }

          // File / document item
          const isPhoto = doc.accept.includes('image/');
          function onFile(e: React.ChangeEvent<HTMLInputElement>) {
            const f = e.target.files?.[0] ?? null;
            setFiles(prev => ({ ...prev, [doc.key]: f }));
          }

          return (
            <div
              key={doc.key}
              style={{
                background: isSatisfied ? 'var(--color-primary-bg)' : C.cardBg,
                border: `1.5px solid ${isSatisfied ? 'var(--color-primary-muted)' : C.border}`,
                borderRadius: 14,
                padding: '16px 20px',
                transition: 'all 0.15s',
              }}
            >
              {/* Hidden file & camera inputs */}
              <input
                ref={el => { fileRefs.current[doc.key] = el; }}
                type="file"
                accept={doc.accept}
                style={{ display: 'none' }}
                onChange={onFile}
              />
              {isPhoto && (
                <input
                  ref={el => { cameraRefs.current[doc.key] = el; }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={onFile}
                />
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <p style={{ color: C.text, fontWeight: 700, fontSize: 14, margin: 0 }}>{doc.label}</p>
                    {isSatisfied && (
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-success)', background: 'rgba(16,185,129,0.12)', padding: '1px 7px', borderRadius: 999 }}>
                        {file ? 'New file selected' : 'On file'}
                      </span>
                    )}
                  </div>
                  <p style={{ color: C.muted, fontSize: 12, margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file
                      ? file.name
                      : hasExisting
                      ? 'Previously verified · Kept automatically'
                      : doc.hint || 'JPG, PNG or PDF · max 10 MB'}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                  {isSatisfied && <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />}
                  {isPhoto && (
                    <button
                      type="button"
                      onClick={() => cameraRefs.current[doc.key]?.click()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px',
                        borderRadius: 8, border: `1.5px solid ${C.border}`,
                        background: C.cardBg, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.text,
                      }}
                    >
                      <Camera size={13} /> Camera
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileRefs.current[doc.key]?.click()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px',
                      borderRadius: 8, border: `1.5px solid ${C.border}`,
                      background: C.cardBg, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.text,
                    }}
                  >
                    <Paperclip size={13} /> {isSatisfied ? 'Change' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: 'var(--color-danger-bg)', borderRadius: 10, border: '1px solid var(--color-danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-danger)', fontSize: 13 }}>
            <AlertTriangle size={15} /> {error}
          </div>
        </div>
      )}

      {/* One-Click Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={uploading}
        style={{
          marginTop: 24, width: '100%', padding: '14px',
          background: uploading ? C.border : C.green,
          color: uploading ? C.muted : '#fff',
          border: 'none', borderRadius: 12,
          fontWeight: 800, fontSize: 15, cursor: uploading ? 'not-allowed' : 'pointer',
          boxShadow: uploading ? 'none' : '0 4px 14px rgba(22, 163, 74, 0.3)',
          transition: 'all 0.15s',
        }}
      >
        {uploading
          ? (uploadProgress.total > 0 ? `Submitting… ${uploadProgress.done}/${uploadProgress.total}` : 'Submitting documents…')
          : 'Submit Verification'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, margin: '14px 0 0' }}>
        Documents are encrypted and reviewed strictly for identity and compliance verification.
      </p>
    </div>
  );
}

