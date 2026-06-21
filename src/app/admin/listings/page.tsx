'use client';

import { useState, useEffect, useTransition } from 'react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
  green: 'var(--color-primary)', greenBg: 'var(--color-primary-bg)',
  amber: 'var(--color-harvest)', amberBg: 'var(--color-harvest-bg)',
  red: 'var(--color-danger)', redBg: 'var(--color-danger-bg)',
};

const CROP_EMOJI: Record<string, string> = {
  maize: '🌽', beans: '🫘', coffee: '☕', rice: '🌾', banana: '🍌',
  cassava: '🥔', tomato: '🍅', sorghum: '🌾', groundnuts: '🥜',
  sweet_potatoes: '🍠', sunflower: '🌻', cotton: '🏵️',
};

type Listing = {
  id: string;
  crop_type: string;
  quantity_kg: number;
  asking_price: number;
  district: string;
  status: string;
  approval_status: string | null;
  created_at: string;
  farmer: { full_name: string; location: string } | null;
};

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{
      position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
      zIndex: 1000, minWidth: 260, background: ok ? '#065F46' : '#991B1B',
      color: '#fff', borderRadius: 14, padding: '14px 20px',
    }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{ok ? '✅ ' : '❌ '}{msg}</p>
    </div>
  );
}

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [pending, start]        = useTransition();

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/listings?approval=${tab}`);
      const json = await res.json();
      setListings(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tab]);

  async function approve(id: string) {
    start(async () => {
      const res  = await fetch(`/api/admin/listings/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const json = await res.json();
      if (json.success) { showToast('Listing approved', true); load(); }
      else showToast(json.error ?? 'Failed', false);
    });
  }

  async function reject(id: string) {
    start(async () => {
      const res  = await fetch(`/api/admin/listings/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
      const json = await res.json();
      if (json.success) { showToast('Listing rejected', true); load(); }
      else showToast(json.error ?? 'Failed', false);
    });
  }

  const TABS: Array<{ key: typeof tab; label: string }> = [
    { key: 'pending',  label: 'Pending Review' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.text, margin: 0, letterSpacing: '-0.03em' }}>Listing Approvals</h1>
        <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>Review and approve marketplace listings before they go live</p>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 18px', borderRadius: 999, border: 'none',
            background: tab === t.key ? C.green : 'var(--color-surface-2)',
            color: tab === t.key ? '#fff' : C.muted,
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: C.cardBg, borderRadius: 16, height: 100, boxShadow: C.cardShadow }} className="dash-skeleton" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 18, boxShadow: C.cardShadow, padding: '48px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>✅</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
            {tab === 'pending' ? 'No listings awaiting review' : `No ${tab} listings`}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {listings.map(l => {
            const emoji = CROP_EMOJI[l.crop_type?.toLowerCase()] ?? '🌿';
            return (
              <div key={l.id} style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ fontSize: 26, flexShrink: 0, marginTop: 2 }}>{emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0, textTransform: 'capitalize' }}>{l.crop_type}</p>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                      background: l.approval_status === 'pending' ? C.amberBg :
                                  l.approval_status === 'approved' ? C.greenBg : C.redBg,
                      color: l.approval_status === 'pending' ? C.amber :
                             l.approval_status === 'approved' ? C.green : C.red,
                    }}>
                      {l.approval_status ?? 'pending'}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: C.muted, margin: '0 0 2px' }}>
                    {l.quantity_kg.toLocaleString()} kg · UGX {Math.round(l.asking_price).toLocaleString()}/kg · {l.district}
                  </p>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
                    Farmer: {(l.farmer as any)?.full_name ?? 'Unknown'} · {new Date(l.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                {tab === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => approve(l.id)}
                      disabled={pending}
                      style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: C.green, color: '#fff', fontSize: 12, fontWeight: 700, cursor: pending ? 'wait' : 'pointer' }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => reject(l.id)}
                      disabled={pending}
                      style={{ padding: '8px 16px', borderRadius: 10, border: `1px solid ${C.red}`, background: 'transparent', color: C.red, fontSize: 12, fontWeight: 700, cursor: pending ? 'wait' : 'pointer' }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
