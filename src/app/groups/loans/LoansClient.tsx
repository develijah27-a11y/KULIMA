'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, CheckCircle2, XCircle } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', cardBg: 'var(--d-card)',
  cardShadow: 'var(--d-shadow-card)', green: 'var(--color-primary)', greenMed: 'var(--color-primary-hover)',
  blue: 'var(--color-sky)',
};

const STATUS_CFG: Record<string, { label: string; c: string; bg: string }> = {
  pending:   { label: 'Pending Review', c: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
  active:    { label: 'Active',         c: 'var(--color-sky)',     bg: 'var(--color-sky-bg)'      },
  repaid:    { label: 'Repaid',         c: 'var(--color-success)', bg: 'var(--color-success-bg)'  },
  rejected:  { label: 'Rejected',       c: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'   },
  defaulted: { label: 'Defaulted',      c: 'var(--color-danger)',  bg: 'var(--color-danger-bg)'   },
};

interface Loan {
  id: string;
  borrower_id: string;
  amount: number;
  purpose: string | null;
  repayment_date: string | null;
  repaid_amount: number;
  status: string;
  created_at: string;
  borrower?: { full_name: string } | null;
}

export function LoansClient({ groupId, groupWalletBalance }: { groupId: string | null; groupWalletBalance: number }) {
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [busy, setBusy]   = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!groupId) return;
    fetch(`/api/groups/${groupId}/loans`).then(r => r.json()).then(json => setLoans(json.loans ?? [])).catch(() => setLoans([]));
  }, [groupId]);

  useEffect(load, [load]);

  async function decide(loanId: string, action: 'approve' | 'reject') {
    if (!groupId) return;
    setBusy(loanId); setError('');
    try {
      const res = await fetch(`/api/groups/${groupId}/loans/${loanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      load();
    } finally {
      setBusy(null);
    }
  }

  const rows = loans ?? [];
  const pending = rows.filter(l => l.status === 'pending');
  const active  = rows.filter(l => l.status === 'active');
  const history  = rows.filter(l => ['repaid', 'rejected', 'defaulted'].includes(l.status));
  const outstanding = active.reduce((s, l) => s + (l.amount - l.repaid_amount), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-black" style={{ color: C.text, letterSpacing: '-0.03em', fontFamily: "'Poppins', 'Inter', system-ui, sans-serif" }}>Group Loans</h1>
        <p className="text-sm mt-1" style={{ color: C.muted }}>Internal lending to help members bridge seasonal cash gaps</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--color-sky-bg)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.blue, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Outstanding Loans</p>
          <p style={{ fontSize: 20, fontWeight: 900, color: C.blue, margin: 0, letterSpacing: '-0.02em' }}>UGX {Math.round(outstanding).toLocaleString()}</p>
        </div>
        <div style={{ padding: '14px 18px', borderRadius: 12, background: 'var(--color-primary-bg)' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.greenMed, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Available to Lend</p>
          <p style={{ fontSize: 20, fontWeight: 900, color: C.greenMed, margin: 0, letterSpacing: '-0.02em' }}>UGX {Math.round(groupWalletBalance).toLocaleString()}</p>
        </div>
      </div>

      {error && (
        <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ color: 'var(--color-danger)', fontSize: 13, margin: 0 }}>{error}</p>
        </div>
      )}

      {loans === null ? (
        <p style={{ color: C.muted, fontSize: 13 }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-sky-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: C.blue }}><Users size={32} /></div>
          <p style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>No loan applications yet</p>
          <p style={{ fontSize: 13, color: C.muted, margin: 0, maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
            Members can apply for a loan from your group's pooled wallet under Farmer Groups → Submit.
          </p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <Section title={`Pending Review (${pending.length})`} highlight>
              {pending.map(l => (
                <LoanRow key={l.id} l={l}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                    <button disabled={busy === l.id} onClick={() => decide(l.id, 'reject')}
                      style={{ padding: '9px', borderRadius: 8, border: `1.5px solid ${C.border}`, background: 'transparent', color: C.muted, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <XCircle size={14} /> Reject
                    </button>
                    <button disabled={busy === l.id} onClick={() => decide(l.id, 'approve')}
                      style={{ padding: '9px', borderRadius: 8, border: 'none', background: busy === l.id ? 'var(--color-surface-2)' : C.greenMed, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <CheckCircle2 size={14} /> {busy === l.id ? '…' : 'Approve & Disburse'}
                    </button>
                  </div>
                </LoanRow>
              ))}
            </Section>
          )}
          {active.length > 0 && (
            <Section title={`Active (${active.length})`}>
              {active.map(l => <LoanRow key={l.id} l={l} />)}
            </Section>
          )}
          {history.length > 0 && (
            <Section title="History">
              {history.map(l => <LoanRow key={l.id} l={l} />)}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, highlight, children }: { title: string; highlight?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: highlight ? 'var(--color-harvest)' : C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{title}</p>
      <div style={{ background: C.cardBg, borderRadius: 16, boxShadow: C.cardShadow, overflow: 'hidden' }}>{children}</div>
    </div>
  );
}

function LoanRow({ l, children }: { l: Loan; children?: React.ReactNode }) {
  const st = STATUS_CFG[l.status] ?? STATUS_CFG.pending;
  const progress = l.status === 'active' || l.status === 'repaid' ? Math.round((l.repaid_amount / l.amount) * 100) : null;
  return (
    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-sky-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: C.blue, flexShrink: 0 }}>
          {l.borrower?.full_name?.[0]?.toUpperCase() ?? 'M'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: '0 0 2px' }}>{l.borrower?.full_name ?? 'Member'}</p>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
            {l.purpose || 'General'}{l.repayment_date ? ` · Due ${new Date(l.repayment_date).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}` : ''}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: C.blue, margin: '0 0 2px', letterSpacing: '-0.01em' }}>UGX {Math.round(l.amount).toLocaleString()}</p>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: st.bg, color: st.c }}>{st.label}</span>
        </div>
      </div>
      {progress !== null && (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 5, borderRadius: 3, background: 'var(--color-surface-2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: C.green }} />
          </div>
          <p style={{ fontSize: 10, color: C.muted, margin: '3px 0 0' }}>UGX {Math.round(l.repaid_amount).toLocaleString()} repaid of {Math.round(l.amount).toLocaleString()} ({progress}%)</p>
        </div>
      )}
      {children}
    </div>
  );
}
