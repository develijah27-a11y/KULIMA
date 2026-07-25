'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle, Search, ChevronRight, Clock,
  CheckCircle2, AlertCircle, XCircle, RefreshCw, Send,
  User, Shield, X,
} from 'lucide-react';

type TicketStatus = 'open' | 'in_progress' | 'pending_user' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  user_name: string;
  user_role: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface Reply {
  id: string;
  message: string;
  sender_type: 'user' | 'admin';
  sender_name: string;
  created_at: string;
}

interface TicketDetail extends Ticket {
  description: string;
  screenshot_url?: string;
}

const CATEGORIES = ['payments','marketplace','logistics','kyc','technical','account','other'];
const CAT_LABELS: Record<string, string> = {
  payments: 'Payments', marketplace: 'Marketplace', logistics: 'Logistics',
  kyc: 'KYC', technical: 'Technical', account: 'Account', other: 'Other',
};

const STATUS_CFG: Record<TicketStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  open:         { label: 'Open',         color: 'var(--color-sky)',         bg: 'var(--color-sky-bg)',         icon: <Clock size={11}/> },
  in_progress:  { label: 'In Progress',  color: 'var(--color-harvest)',     bg: 'var(--color-harvest-bg)',     icon: <RefreshCw size={11}/> },
  pending_user: { label: 'Pending User', color: 'var(--color-warning)',     bg: 'var(--color-warning-bg)',     icon: <AlertCircle size={11}/> },
  resolved:     { label: 'Resolved',     color: 'var(--color-success)',     bg: 'var(--color-success-bg)',     icon: <CheckCircle2 size={11}/> },
  closed:       { label: 'Closed',       color: 'var(--color-text-muted)',  bg: 'var(--color-surface-2)',      icon: <XCircle size={11}/> },
};

const PRIORITY_CFG: Record<TicketPriority, { color: string; bg: string }> = {
  low:    { color: 'var(--color-text-muted)', bg: 'var(--color-surface-2)' },
  medium: { color: 'var(--color-harvest)',    bg: 'var(--color-harvest-bg)' },
  high:   { color: 'var(--color-danger)',     bg: 'var(--color-danger-bg)' },
  urgent: { color: '#fff',                    bg: 'var(--color-danger)' },
};

const ROLE_CFG: Record<string, { color: string; bg: string }> = {
  farmer:      { color: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  buyer:       { color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
  supplier:    { color: 'var(--color-purple)',  bg: 'var(--color-purple-bg)' },
  transporter: { color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)' },
  admin:       { color: 'var(--d-muted)',        bg: 'var(--color-surface-2)' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function timeAgo(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
}

// ─── Ticket Detail Panel ──────────────────────────────────────────────────────
function TicketPanel({ ticketId, onClose, onUpdated }: { ticketId: string; onClose: () => void; onUpdated: () => void }) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/support/${ticketId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTicket(json.ticket);
      setReplies(json.replies ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally { setLoading(false); }
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  async function updateTicket(patch: Partial<{ status: string; priority: string }>) {
    setUpdating(true);
    try {
      await fetch('/api/admin/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, ...patch }),
      });
      await load();
      onUpdated();
    } finally { setUpdating(false); }
  }

  async function sendReply() {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setReplyText('');
      await load();
      onUpdated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send');
    } finally { setSending(false); }
  }

  const C = { text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', card: 'var(--d-card)', shadow: 'var(--d-shadow-card)' };

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: C.card, borderRadius: 16, padding: 32, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-modal)' }}>
        {[1,2,3].map(i => <div key={i} className="dash-skeleton" style={{ height: 40, borderRadius: 10, marginBottom: 12 }} />)}
      </div>
    </div>
  );

  if (!ticket) return null;

  const st = STATUS_CFG[ticket.status];
  const pt = PRIORITY_CFG[ticket.priority];
  const role = ROLE_CFG[ticket.user_role] ?? ROLE_CFG.farmer;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: C.card, width: '100%', maxWidth: 640, height: '100vh', overflow: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: '0 0 6px', letterSpacing: '-0.02em' }}>{ticket.subject}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: role.bg, color: role.color, textTransform: 'capitalize' }}>{ticket.user_name} · {ticket.user_role}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: st.bg, color: st.color, display: 'inline-flex', alignItems: 'center', gap: 3 }}>{st.icon}{st.label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: pt.bg, color: pt.color, textTransform: 'capitalize' }}>{ticket.priority}</span>
              <span style={{ fontSize: 10, color: C.muted }}>{CAT_LABELS[ticket.category] ?? ticket.category}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4, display: 'flex', minHeight: 'unset', minWidth: 'unset' }}><X size={18}/></button>
        </div>

        {/* Admin controls */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          <select defaultValue={ticket.status} onChange={e => updateTicket({ status: e.target.value })} disabled={updating} className="app-input" style={{ width: 'auto', fontSize: 12, padding: '6px 10px', minHeight: 'unset', cursor: 'pointer' }}>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="pending_user">Pending User</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select defaultValue={ticket.priority} onChange={e => updateTicket({ priority: e.target.value })} disabled={updating} className="app-input" style={{ width: 'auto', fontSize: 12, padding: '6px 10px', minHeight: 'unset', cursor: 'pointer' }}>
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
            <option value="urgent">Urgent</option>
          </select>
          <span style={{ fontSize: 11, color: C.muted, alignSelf: 'center' }}>Opened {fmtDate(ticket.created_at)} · #{ticket.id.slice(0,8)}</span>
        </div>

        {/* Description */}
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>Description</p>
          <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{ticket.description}</p>
        </div>

        {/* Replies */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {replies.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <MessageCircle size={28} style={{ margin: '0 auto 8px', color: C.muted }} />
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>No replies yet.</p>
            </div>
          ) : replies.map(r => {
            const isAdmin = r.sender_type === 'admin';
            return (
              <div key={r.id} style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, background: isAdmin ? 'var(--color-primary-bg)' : 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0, background: isAdmin ? 'var(--color-primary)' : 'var(--color-surface-2)', color: isAdmin ? '#fff' : C.text }}>
                    {isAdmin ? <Shield size={12}/> : <User size={12}/>}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{r.sender_name}</span>
                  {isAdmin && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 99, background: 'var(--color-primary)', color: '#fff', fontWeight: 700 }}>STAFF</span>}
                  <span style={{ fontSize: 11, color: C.muted, marginLeft: 'auto' }}>{fmtTime(r.created_at)}</span>
                </div>
                <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', paddingLeft: 34 }}>{r.message}</p>
              </div>
            );
          })}
        </div>

        {/* Reply box */}
        {ticket.status !== 'closed' && (
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
            {error && <p style={{ fontSize: 12, color: 'var(--color-danger)', marginBottom: 8 }}>{error}</p>}
            <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply to the user…" rows={3} className="app-input" style={{ resize: 'vertical', marginBottom: 8 }} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply(); }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={sendReply} disabled={!replyText.trim() || sending} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13 }}>
                <Send size={13}/>{sending ? 'Sending…' : 'Send Reply'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Admin Support Page ──────────────────────────────────────────────────
export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const C = { text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', card: 'var(--d-card)', shadow: 'var(--d-shadow-card)' };
  const PER_PAGE = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (filterStatus)   params.set('status',   filterStatus);
      if (filterCategory) params.set('category', filterCategory);
      if (filterPriority) params.set('priority', filterPriority);
      if (search)         params.set('search',   search);
      const res = await fetch(`/api/admin/support?${params.toString()}`);
      const json = await res.json();
      setTickets(json.tickets ?? []);
      setTotal(json.count ?? 0);
    } finally { setLoading(false); }
  }, [page, filterStatus, filterCategory, filterPriority, search]);

  useEffect(() => { load(); }, [load]);

  // Summary counts
  const counts = tickets.reduce((acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc; }, {} as Record<string, number>);
  const urgentCount = tickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1200, margin: '0 auto' }}>
      {selectedId && <TicketPanel ticketId={selectedId} onClose={() => setSelectedId(null)} onUpdated={load} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: 0, letterSpacing: '-0.03em', fontFamily: "'Poppins','Inter',system-ui,sans-serif" }}>Support Tickets</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>{total} total · manage and respond to user requests</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Open',        value: counts['open']         ?? 0, color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)' },
            { label: 'In Progress', value: counts['in_progress']  ?? 0, color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)' },
            { label: 'Pending User',value: counts['pending_user'] ?? 0, color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
            { label: 'Urgent/High', value: urgentCount,                 color: 'var(--color-danger)',  bg: 'var(--color-danger-bg)' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: bg, borderRadius: 10, padding: '8px 14px', textAlign: 'center', minWidth: 70 }}>
              <p style={{ fontSize: 18, fontWeight: 900, color, margin: 0, letterSpacing: '-0.03em' }}>{value}</p>
              <p style={{ fontSize: 10, fontWeight: 700, color, margin: '2px 0 0' }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by subject…" className="app-input" style={{ paddingLeft: 32, fontSize: 13 }} />
        </div>
        {[
          { val: filterStatus,   set: (v: string) => { setFilterStatus(v); setPage(1); },   opts: [['','All Statuses'],['open','Open'],['in_progress','In Progress'],['pending_user','Pending User'],['resolved','Resolved'],['closed','Closed']] },
          { val: filterCategory, set: (v: string) => { setFilterCategory(v); setPage(1); }, opts: [['','All Categories'], ...CATEGORIES.map(c => [c, CAT_LABELS[c]])] },
          { val: filterPriority, set: (v: string) => { setFilterPriority(v); setPage(1); }, opts: [['','All Priorities'],['urgent','Urgent'],['high','High'],['medium','Medium'],['low','Low']] },
        ].map((s, i) => (
          <select key={i} value={s.val} onChange={e => s.set(e.target.value)} className="app-input" style={{ width: 'auto', fontSize: 13, cursor: 'pointer' }}>
            {s.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="dash-skeleton" style={{ height: 52, borderRadius: 10 }} />)}
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <MessageCircle size={36} style={{ margin: '0 auto 12px', color: C.muted }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: '0 0 6px' }}>No tickets found</p>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Adjust your filters or wait for users to submit requests</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 100px 90px 90px 80px', gap: 12, padding: '10px 20px', borderBottom: `1px solid ${C.border}`, background: 'var(--color-surface-2)' }}>
              {['Subject & User','Category','Status','Priority','Opened',''].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</span>
              ))}
            </div>
            {tickets.map((t, i) => {
              const st = STATUS_CFG[t.status];
              const pt = PRIORITY_CFG[t.priority];
              const role = ROLE_CFG[t.user_role] ?? ROLE_CFG.farmer;
              return (
                <div key={t.id} onClick={() => setSelectedId(t.id)} style={{ display: 'grid', gridTemplateColumns: '1fr 110px 100px 90px 90px 80px', gap: 12, padding: '12px 20px', borderBottom: i < tickets.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer', alignItems: 'center' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--d-row-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: role.bg, color: role.color, textTransform: 'capitalize' }}>{t.user_name} · {t.user_role}</span>
                  </div>
                  <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{CAT_LABELS[t.category] ?? t.category}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: st.bg, color: st.color, display: 'inline-flex', alignItems: 'center', gap: 3, width: 'fit-content' }}>{st.icon}{st.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: pt.bg, color: pt.color, textTransform: 'capitalize', width: 'fit-content' }}>{t.priority}</span>
                  <span style={{ fontSize: 11, color: C.muted }}>{timeAgo(t.created_at)}</span>
                  <ChevronRight size={14} style={{ color: C.muted }} />
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Pagination */}
      {total > PER_PAGE && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 13 }}>← Prev</button>
          <span style={{ padding: '8px 14px', fontSize: 13, color: C.muted, alignSelf: 'center' }}>Page {page} of {Math.ceil(total / PER_PAGE)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / PER_PAGE)} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 13 }}>Next →</button>
        </div>
      )}
    </div>
  );
}
