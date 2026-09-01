'use client';

import { useState } from 'react';
import { FileText, X, ExternalLink, AlertTriangle, Loader2, RotateCw, ZoomIn, RefreshCw } from 'lucide-react';

const DOC_LABELS: Record<string, string> = {
  national_id_url: 'National ID Card',
  selfie_url: 'Live Front-Camera Selfie',
  business_reg_url: 'Business Registration',
  driving_permit_url: 'Driving Permit',
  vehicle_reg_url: 'Vehicle Registration',
  insurance_url: 'Insurance Certificate',
  vehicle_photo_url: 'Vehicle Photo',
  qualifications_url: 'Qualifications & Certifications',
};

function isImageUrl(url: string) {
  const path = url.split('?')[0].toLowerCase();
  return /\.(jpe?g|png|webp|gif|heic)$/.test(path);
}

export function ViewDocsButton({ verificationId }: { verificationId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [docs, setDocs] = useState<{ key: string; url: string }[] | null>(null);
  const [rotations, setRotations] = useState<Record<string, number>>({});
  const [zoomedKey, setZoomedKey] = useState<string | null>(null);

  async function fetchDocs() {
    setErr('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/kyc-signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { urls } = await res.json();
      const entries = Object.entries(urls ?? {}) as [string, string][];
      if (!entries.length) { setErr('No documents on file for this applicant'); return; }
      
      // Sort so National ID and Selfie appear first for immediate comparison
      entries.sort(([a], [b]) => {
        if (a === 'national_id_url') return -1;
        if (b === 'national_id_url') return 1;
        if (a === 'selfie_url') return -1;
        if (b === 'selfie_url') return 1;
        return 0;
      });

      setDocs(entries.map(([key, url]) => ({ key, url })));
    } catch {
      setErr('Failed to generate secure preview links. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    if (!docs) {
      fetchDocs();
    }
  }

  function rotateDoc(key: string, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setRotations(prev => ({
      ...prev,
      [key]: ((prev[key] ?? 0) + 90) % 360,
    }));
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--color-surface-2)', color: 'var(--d-text)', border: '1px solid var(--d-border)', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
      >
        <FileText size={13} /> View documents
      </button>

      {open && (
        <div
          onClick={() => { setOpen(false); setZoomedKey(null); }}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--color-surface)', borderRadius: 18, padding: 24, width: '100%', maxWidth: 840, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.35)', border: '1px solid var(--color-border)' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid var(--color-border)', paddingBottom: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--d-text)' }}>KYC Verification Review</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--d-muted)' }}>Compare National ID with live selfie for identity authenticity</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  type="button"
                  onClick={fetchDocs}
                  title="Refresh security URLs"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--d-border)', background: 'var(--color-surface-2)', color: 'var(--d-text)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh links
                </button>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setZoomedKey(null); }}
                  aria-label="Close"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--d-muted)', display: 'flex', padding: 4 }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '56px 0', color: 'var(--d-muted)', fontSize: 13 }}>
                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                <span>Loading secure document previews…</span>
              </div>
            )}

            {!loading && err && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '24px', color: 'var(--color-danger)', background: 'var(--color-danger-bg)', borderRadius: 10, fontSize: 13 }}>
                <AlertTriangle size={18} /> {err}
              </div>
            )}

            {!loading && !err && docs && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                {docs.map(d => {
                  const deg = rotations[d.key] ?? 0;
                  const isImage = isImageUrl(d.url);
                  const isZoomed = zoomedKey === d.key;

                  return (
                    <div
                      key={d.key}
                      style={{
                        display: 'flex', flexDirection: 'column', borderRadius: 14, overflow: 'hidden',
                        border: '1.5px solid var(--color-border)', background: 'var(--color-bg)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      }}
                    >
                      {/* Document Preview Canvas */}
                      <div
                        style={{
                          position: 'relative', height: isZoomed ? 400 : 220, background: '#0F172A',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                          transition: 'height 0.2s ease',
                        }}
                      >
                        {isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={d.url}
                            alt={DOC_LABELS[d.key] ?? d.key}
                            style={{
                              maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                              transform: `rotate(${deg}deg)`,
                              transition: 'transform 0.2s ease',
                            }}
                          />
                        ) : (
                          <div style={{ textAlign: 'center', color: '#FFFFFF' }}>
                            <FileText size={44} style={{ color: 'rgba(255,255,255,0.7)', margin: '0 auto 8px' }} />
                            <p style={{ fontSize: 12, margin: 0 }}>PDF / Document File</p>
                          </div>
                        )}

                        {/* Top action controls */}
                        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                          {isImage && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => rotateDoc(d.key, e)}
                                title="Rotate 90°"
                                style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(15,23,42,0.75)', border: 'none', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              >
                                <RotateCw size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setZoomedKey(isZoomed ? null : d.key)}
                                title={isZoomed ? 'Shrink' : 'Enlarge'}
                                style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(15,23,42,0.75)', border: 'none', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              >
                                <ZoomIn size={13} />
                              </button>
                            </>
                          )}
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open original in new tab"
                            style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(15,23,42,0.75)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div style={{ padding: '10px 14px', background: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--d-text)' }}>
                            {DOC_LABELS[d.key] ?? d.key}
                          </p>
                          <p style={{ margin: '1px 0 0', fontSize: 10.5, color: 'var(--d-muted)' }}>
                            {d.key === 'selfie_url' ? 'Live photo capture' : 'Identity proof'}
                          </p>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'var(--color-primary-bg)', color: 'var(--color-primary-dark)' }}>
                          Verified Upload
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
