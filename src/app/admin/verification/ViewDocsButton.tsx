'use client';

import { useState } from 'react';
import { FileText, X, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';

const DOC_LABELS: Record<string, string> = {
  national_id_url: 'National ID',
  selfie_url: 'Selfie',
  business_reg_url: 'Business registration',
  driving_permit_url: 'Driving permit',
  vehicle_reg_url: 'Vehicle registration',
  insurance_url: 'Insurance certificate',
  vehicle_photo_url: 'Vehicle photo',
  qualifications_url: 'Qualifications',
};

function isImageUrl(url: string) {
  const path = url.split('?')[0].toLowerCase();
  return /\.(jpe?g|png|webp|gif|heic)$/.test(path);
}

// The kyc-documents bucket is private, so there's no permanent link to show
// here — each open mints fresh 5-minute signed URLs. Shown inline as a
// thumbnail gallery instead of the old behavior of firing window.open() once
// per document (routinely eaten by popup blockers, and gave the reviewer no
// way to tell which tab was which document without opening every one).
export function ViewDocsButton({ verificationId }: { verificationId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [docs, setDocs] = useState<{ key: string; url: string }[] | null>(null);

  async function view() {
    setOpen(true);
    if (docs) return; // already fetched this session — signed URLs are still fresh for a modal that's just been (re)opened
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
      if (!entries.length) { setErr('No documents on file'); return; }
      setDocs(entries.map(([key, url]) => ({ key, url })));
    } catch {
      setErr('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={view}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--color-surface-2)', color: 'var(--d-text)', border: '1px solid var(--d-border)', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
      >
        <FileText size={13} /> View documents
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--d-card)', borderRadius: 18, padding: 20, width: '100%', maxWidth: 640, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--d-text)' }}>Submitted documents</p>
              <button onClick={() => setOpen(false)} aria-label="Close"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--d-muted)', display: 'flex', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '48px 0', color: 'var(--d-muted)', fontSize: 13 }}>
                <Loader2 size={16} className="animate-spin" /> Loading documents…
              </div>
            )}

            {!loading && err && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 0', color: 'var(--color-danger)', fontSize: 13 }}>
                <AlertTriangle size={16} /> {err}
              </div>
            )}

            {!loading && !err && docs && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
                {docs.map(d => (
                  <a
                    key={d.key}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden',
                      border: '1px solid var(--d-border)', textDecoration: 'none', background: 'var(--color-surface-2)',
                    }}
                  >
                    <div style={{ position: 'relative', aspectRatio: '4/3', background: '#00000010', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isImageUrl(d.url) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.url} alt={DOC_LABELS[d.key] ?? d.key} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <FileText size={32} style={{ color: 'var(--d-muted)' }} />
                      )}
                      <div style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ExternalLink size={11} style={{ color: '#fff' }} />
                      </div>
                    </div>
                    <p style={{ margin: 0, padding: '8px 10px', fontSize: 12, fontWeight: 700, color: 'var(--d-text)' }}>
                      {DOC_LABELS[d.key] ?? d.key}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
