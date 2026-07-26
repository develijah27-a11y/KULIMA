'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle, Plus, ChevronRight, Clock, CheckCircle2,
  AlertCircle, XCircle, RefreshCw, Send, X,
  Search,
} from 'lucide-react';

type TicketStatus = 'open' | 'in_progress' | 'pending_user' | 'resolved' | 'closed';
type TicketCategory = 'payments' | 'marketplace' | 'logistics' | 'kyc' | 'technical' | 'account' | 'other';
type TicketPriority = 'low' | 'medium' | 'high';

interface Ticket {
  id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
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

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'payments',     label: 'Payments' },
  { value: 'marketplace',  label: 'Marketplace' },
  { value: 'logistics',    label: 'Logistics' },
  { value: 'kyc',          label: 'KYC & Verification' },
  { value: 'technical',    label: 'Technical Issues' },
  { value: 'account',      label: 'Account' },
  { value: 'other',        label: 'Other' },
];

const STATUS_CFG: Record<TicketStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  open:          { label: 'Open',            color: 'var(--color-sky)',     bg: 'var(--color-sky-bg)',     icon: <Clock size={11} /> },
  in_progress:   { label: 'In Progress',     color: 'var(--color-harvest)', bg: 'var(--color-harvest-bg)', icon: <RefreshCw size={11} /> },
  pending_user:  { label: 'Reply Needed',    color: 'var(--color-warning)', bg: 'var(--color-warning-bg)', icon: <AlertCircle size={11} /> },
  resolved:      { label: 'Resolved',        color: 'var(--color-success)', bg: 'var(--color-success-bg)', icon: <CheckCircle2 size={11} /> },
  closed:        { label: 'Closed',          color: 'var(--color-text-muted)', bg: 'var(--color-surface-2)', icon: <XCircle size={11} /> },
};

const PRIORITY_CFG: Record<TicketPriority, { color: string; bg: string }> = {
  low:    { color: 'var(--color-text-muted)', bg: 'var(--color-surface-2)' },
  medium: { color: 'var(--color-harvest)',    bg: 'var(--color-harvest-bg)' },
  high:   { color: 'var(--color-danger)',     bg: 'var(--color-danger-bg)' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── New Ticket Form ──────────────────────────────────────────────────────────

function NewTicketForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('technical');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (description.length < 20) { setError('Please describe your issue in at least 20 characters.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, category, description, priority }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to create ticket');
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ background: 'var(--d-card)', borderRadius: 16, padding: 24, boxShadow: 'var(--d-shadow-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--d-text)', margin: 0, letterSpacing: '-0.02em' }}>New Support Ticket</h2>
          <p style={{ fontSize: 12, color: 'var(--d-muted)', margin: '4px 0 0' }}>Describe your issue and we'll get back to you as soon as possible.</p>
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--d-muted)', padding: 4, display: 'flex', minHeight: 'unset', minWidth: 'unset' }}>
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--d-text)', display: 'block', marginBottom: 6 }}>Subject *</label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Brief summary of your issue"
            required minLength={5} maxLength={200}
            className="app-input"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--d-text)', display: 'block', marginBottom: 6 }}>Category *</label>
            <select value={category} onChange={e => setCategory(e.target.value as TicketCategory)} className="app-input" style={{ cursor: 'pointer' }}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--d-text)', display: 'block', marginBottom: 6 }}>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value as TicketPriority)} className="app-input" style={{ cursor: 'pointer' }}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--d-text)', display: 'block', marginBottom: 6 }}>
            Description * <span style={{ fontWeight: 400, color: 'var(--d-muted)' }}>({description.length}/5000)</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe your issue in detail. Include any error messages, steps to reproduce, or transaction IDs."
            required minLength={20} maxLength={5000} rows={5}
            className="app-input"
            style={{ resize: 'vertical', minHeight: 120 }}
          />
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger)', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={loading} className="btn-primary" style={{ flex: 1 }}>
            {loading ? 'Submitting…' : 'Submit Ticket'}
          </button>
          <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ─── Ticket Detail View ───────────────────────────────────────────────────────

function TicketDetailView({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/support/${ticketId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setTicket(json.ticket);
      setReplies(json.replies ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  async function sendReply() {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setReplyText('');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div style={{ background: 'var(--d-card)', borderRadius: 16, padding: 24 }}>
        {[1, 2, 3].map(i => <div key={i} className="dash-skeleton" style={{ height: 40, borderRadius: 10, marginBottom: 12 }} />)}
      </div>
    );
  }

  if (!ticket) {
    return (
      <div style={{ background: 'var(--d-card)', borderRadius: 16, padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--d-muted)' }}>{error || 'Ticket not found'}</p>
        <button onClick={onBack} className="btn-ghost" style={{ marginTop: 12 }}>Back to tickets</button>
      </div>
    );
  }

  const statusCfg = STATUS_CFG[ticket.status];
  const priorityCfg = PRIORITY_CFG[ticket.priority];
  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ background: 'var(--d-card)', borderRadius: 16, padding: 20, boxShadow: 'var(--d-shadow-card)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontWeight: 700, fontSize: 13, padding: 0, minHeight: 'unset', minWidth: 'unset', whiteSpace: 'nowrap' }}>
            ← All tickets
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--d-text)', margin: 0, letterSpacing: '-0.02em' }}>{ticket.subject}</h2>
            <p style={{ fontSize: 11, color: 'var(--d-muted)', margin: '4px 0 0' }}>Opened {fmtDate(ticket.created_at)} · #{ticket.id.slice(0, 8)}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: statusCfg.bg, color: statusCfg.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {statusCfg.icon} {statusCfg.label}
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: priorityCfg.bg, color: priorityCfg.color, textTransform: 'capitalize' }}>
            {ticket.priority} priority
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'var(--color-surface-2)', color: 'var(--d-muted)', textTransform: 'capitalize' }}>
            {CATEGORIES.find(c => c.value === ticket.category)?.label ?? ticket.category}
          </span>
        </div>
        <div style={{ padding: '14px', borderRadius: 10, background: 'var(--color-surface-2)', fontSize: 13, color: 'var(--d-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {ticket.description}
        </div>
      </div>

      {/* Replies */}
      <div style={{ background: 'var(--d-card)', borderRadius: 16, boxShadow: 'var(--d-shadow-card)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--d-border)' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--d-text)', margin: 0 }}>Conversation ({replies.length})</p>
        </div>

        {replies.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center' }}>
            <MessageCircle size={28} style={{ margin: '0 auto 8px', color: 'var(--d-muted)' }} />
            <p style={{ fontSize: 13, color: 'var(--d-muted)', margin: 0 }}>No replies yet. Our team will respond soon.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {replies.map(reply => {
              const isAdmin = reply.sender_type === 'admin';
              return (
                <div key={reply.id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--d-border)', background: isAdmin ? 'var(--color-primary-bg)' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0, background: isAdmin ? 'var(--color-primary)' : 'var(--color-surface-2)', color: isAdmin ? '#fff' : 'var(--d-text)' }}>
                      {reply.sender_name?.[0]?.toUpperCase() ?? 'U'}
                    </div>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--d-text)' }}>
                        {isAdmin ? `${reply.sender_name} (Support)` : reply.sender_name}
                      </span>
                      {isAdmin && <span style={{ fontSize: 10, marginLeft: 6, padding: '1px 6px', borderRadius: 99, background: 'var(--color-primary)', color: '#fff', fontWeight: 700 }}>STAFF</span>}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--d-muted)', marginLeft: 'auto' }}>{fmtTime(reply.created_at)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--d-text)', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', paddingLeft: 36 }}>{reply.message}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Reply box */}
        {!isClosed && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--d-border)' }}>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Type your reply…"
              rows={3}
              className="app-input"
              style={{ resize: 'vertical', marginBottom: 10 }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply(); }}
            />
            {error && <p style={{ fontSize: 12, color: 'var(--color-danger)', marginBottom: 8 }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={sendReply} disabled={!replyText.trim() || sending} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px' }}>
                <Send size={14} /> {sending ? 'Sending…' : 'Send Reply'}
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--d-muted)', marginTop: 6 }}>Tip: Ctrl+Enter to send</p>
          </div>
        )}

        {isClosed && (
          <div style={{ padding: '14px 20px', textAlign: 'center', borderTop: '1px solid var(--d-border)' }}>
            <p style={{ fontSize: 12, color: 'var(--d-muted)', margin: 0 }}>
              {ticket.status === 'resolved' ? `Resolved on ${fmtDate(ticket.resolved_at!)}` : 'This ticket is closed.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SupportTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'new' | { ticketId: string }>('list');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/support?${params.toString()}`);
      const json = await res.json();
      setTickets(json.tickets ?? []);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  const filtered = search
    ? tickets.filter(t => t.subject.toLowerCase().includes(search.toLowerCase()))
    : tickets;

  if (view === 'new') {
    return <NewTicketForm onCreated={() => { setView('list'); loadTickets(); }} onCancel={() => setView('list')} />;
  }

  if (typeof view === 'object' && 'ticketId' in view) {
    return <TicketDetailView ticketId={view.ticketId} onBack={() => { setView('list'); loadTickets(); }} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--d-text)', margin: 0, letterSpacing: '-0.03em' }}>Support Tickets</h1>
          <p style={{ fontSize: 13, color: 'var(--d-muted)', margin: '4px 0 0' }}>Track and manage your support requests</p>
        </div>
        <button onClick={() => setView('new')} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px' }}>
          <Plus size={15} /> New Ticket
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--d-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets…"
            className="app-input"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="app-input"
          style={{ width: 'auto', cursor: 'pointer' }}
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="pending_user">Reply Needed</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Ticket list */}
      <div style={{ background: 'var(--d-card)', borderRadius: 16, boxShadow: 'var(--d-shadow-card)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => <div key={i} className="dash-skeleton" style={{ height: 60, borderRadius: 10 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center' }}>
            <MessageCircle size={36} style={{ margin: '0 auto 12px', color: 'var(--d-muted)' }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--d-text)', margin: '0 0 6px' }}>No tickets yet</p>
            <p style={{ fontSize: 13, color: 'var(--d-muted)', margin: '0 0 20px' }}>Having an issue? Create a support ticket and we'll help you.</p>
            <button onClick={() => setView('new')} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px' }}>
              <Plus size={15} /> Create First Ticket
            </button>
          </div>
        ) : (
          <div>
            {filtered.map((ticket, i) => {
              const st = STATUS_CFG[ticket.status];
              const pt = PRIORITY_CFG[ticket.priority];
              return (
                <button
                  key={ticket.id}
                  onClick={() => setView({ ticketId: ticket.id })}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 20px', borderBottom: i < filtered.length - 1 ? '1px solid var(--d-border)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--d-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>{ticket.subject}</span>
                      {ticket.status === 'pending_user' && (
                        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: 'var(--color-warning-bg)', color: 'var(--color-warning)', flexShrink: 0 }}>
                          Action needed
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: st.bg, color: st.color, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        {st.icon} {st.label}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: pt.bg, color: pt.color, textTransform: 'capitalize' }}>
                        {ticket.priority}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--d-muted)', fontWeight: 600 }}>
                        {CATEGORIES.find(c => c.value === ticket.category)?.label}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--d-muted)', marginLeft: 'auto' }}>{fmtDate(ticket.created_at)}</span>
                    </div>
                  </div>
                  <ChevronRight size={15} style={{ color: 'var(--d-muted)', flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
