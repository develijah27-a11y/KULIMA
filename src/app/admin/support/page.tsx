'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle, Search, ChevronRight, Clock,
  CheckCircle2, AlertCircle, XCircle, RefreshCw, Send,
  User, Shield, X, Phone, Mail, ExternalLink, Check, Copy, Sparkles,
} from 'lucide-react';
import { openPhoneDialer, getTelUri } from '@/lib/phone-dialer';

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

interface UserProfile {
  user_id: string;
  full_name: string | null;
  phone_number: string | null;
  location: string | null;
  role: string | null;
}

interface TicketDetail extends Ticket {
  description: string;
  screenshot_url?: string;
}

const CANNED_TEMPLATES = [
  {
    label: 'Issue Resolved',
    text: 'Hello, we have investigated and resolved this issue on your account. Please check and let us know if everything is working smoothly.',
    nextStatus: 'resolved',
  },
  {
    label: 'Request Details',
    text: 'Thank you for reaching out. Could you please share more details, transaction reference, or a screenshot so we can assist you quickly?',
    nextStatus: 'pending_user',
  },
  {
    label: 'Under Investigation',
    text: 'Our team is actively investigating this matter with our operations and engineering team. We will provide an update shortly.',
    nextStatus: 'in_progress',
  },
  {
    label: 'Payment Reconciled',
    text: 'We have reconciled your payment with the mobile money network. Your wallet balance has been credited accordingly.',
    nextStatus: 'resolved',
  },
];

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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [copiedPhone, setCopiedPhone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/support/${ticketId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to load ticket');
      setTicket(json.ticket);
      setUserProfile(json.userProfile ?? null);
      setReplies(json.replies ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally { setLoading(false); }
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  async function updateTicket(patch: Partial<{ status: string; priority: string }>) {
    setUpdating(true);
    try {
      const res = await fetch('/api/admin/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, ...patch }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Failed to update ticket');
      }
      await load();
      onUpdated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to update ticket');
    } finally { setUpdating(false); }
  }

  async function sendReply(overrideText?: string, nextStatus?: string) {
    const textToSend = (overrideText ?? replyText).trim();
    if (!textToSend || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/support/${ticketId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Failed to send reply');
      }

      if (nextStatus && nextStatus !== ticket?.status) {
        await fetch('/api/admin/support', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketId, status: nextStatus }),
        });
      }

      setReplyText('');
      await load();
      onUpdated();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send');
    } finally { setSending(false); }
  }

  function handleCopyPhone(phone: string) {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  }

  const C = { text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', card: 'var(--d-card)', shadow: 'var(--d-shadow-card)' };

  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: C.card, borderRadius: 16, padding: 32, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', boxShadow: 'var(--shadow-modal)' }}>
        {[1,2,3,4].map(i => <div key={i} className="dash-skeleton" style={{ height: 40, borderRadius: 10, marginBottom: 12 }} />)}
      </div>
    </div>
  );

  if (!ticket) return null;

  const st = STATUS_CFG[ticket.status] ?? STATUS_CFG.open;
  const pt = PRIORITY_CFG[ticket.priority] ?? PRIORITY_CFG.medium;
  const role = ROLE_CFG[ticket.user_role] ?? ROLE_CFG.farmer;
  const phone = userProfile?.phone_number ?? '';
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hello ${ticket.user_name}, this is Cropify Support regarding ticket #${ticket.id.slice(0,8)}: "${ticket.subject}".`)}` : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div style={{ background: C.card, width: '100%', maxWidth: 680, height: '100vh', overflow: 'auto', boxShadow: '-8px 0 40px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', gap: 12, flexShrink: 0, background: 'var(--color-surface-2)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: '0 0 6px', letterSpacing: '-0.02em' }}>{ticket.subject}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: role.bg, color: role.color, textTransform: 'capitalize' }}>{ticket.user_name} · {ticket.user_role}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: st.bg, color: st.color, display: 'inline-flex', alignItems: 'center', gap: 3 }}>{st.icon}{st.label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: pt.bg, color: pt.color, textTransform: 'capitalize' }}>{ticket.priority}</span>
              <span style={{ fontSize: 11, color: C.muted }}>{CAT_LABELS[ticket.category] ?? ticket.category}</span>
              <span style={{ fontSize: 11, color: C.muted }}>· #{ticket.id.slice(0,8)}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 4, display: 'flex' }}><X size={20}/></button>
        </div>

        {/* User Contact Card & Quick Outreach */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
              <User size={16} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: C.text, margin: 0 }}>
                {userProfile?.full_name ?? ticket.user_name}
                {userProfile?.location && <span style={{ fontSize: 11, fontWeight: 500, color: C.muted, marginLeft: 6 }}>({userProfile.location})</span>}
              </p>
              <p style={{ fontSize: 11, color: C.muted, margin: '1px 0 0' }}>
                {phone ? phone : 'No phone recorded'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {phone && (
              <>
                {waUrl && (
                  <a href={waUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, background: '#25D366', color: '#fff', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                    <ExternalLink size={11}/> WhatsApp
                  </a>
                )}
                <a
                  href={getTelUri(phone)}
                  onClick={(e) => openPhoneDialer(phone, e)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, background: 'var(--color-surface-2)', border: `1px solid ${C.border}`, color: C.text, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}
                >
                  <Phone size={11}/> Call
                </a>
                <button onClick={() => handleCopyPhone(phone)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted, fontSize: 11, cursor: 'pointer' }}>
                  {copiedPhone ? <Check size={11} style={{ color: 'var(--color-success)' }}/> : <Copy size={11}/>}
                  {copiedPhone ? 'Copied' : 'Copy'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick Resolution Buttons & Admin Controls */}
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                onClick={() => updateTicket({ status: 'resolved' })}
                disabled={updating || ticket.status === 'resolved'}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8,
                  background: ticket.status === 'resolved' ? 'var(--color-success-bg)' : 'var(--color-success)',
                  color: ticket.status === 'resolved' ? 'var(--color-success)' : '#fff',
                  border: `1px solid var(--color-success)`, fontSize: 12, fontWeight: 700, cursor: updating ? 'not-allowed' : 'pointer',
                }}>
                <CheckCircle2 size={12} /> {ticket.status === 'resolved' ? 'Resolved ✓' : 'Mark Resolved'}
              </button>
              <button
                onClick={() => updateTicket({ status: 'in_progress' })}
                disabled={updating || ticket.status === 'in_progress'}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8,
                  background: ticket.status === 'in_progress' ? 'var(--color-harvest-bg)' : 'var(--color-surface-2)',
                  color: ticket.status === 'in_progress' ? 'var(--color-harvest)' : C.text,
                  border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700, cursor: updating ? 'not-allowed' : 'pointer',
                }}>
                <RefreshCw size={12} /> In Progress
              </button>
              <button
                onClick={() => updateTicket({ status: 'pending_user' })}
                disabled={updating || ticket.status === 'pending_user'}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8,
                  background: ticket.status === 'pending_user' ? 'var(--color-warning-bg)' : 'var(--color-surface-2)',
                  color: ticket.status === 'pending_user' ? 'var(--color-warning)' : C.text,
                  border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 700, cursor: updating ? 'not-allowed' : 'pointer',
                }}>
                <AlertCircle size={12} /> Request Info
              </button>
              {ticket.status !== 'closed' ? (
                <button
                  onClick={() => updateTicket({ status: 'closed' })}
                  disabled={updating}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8,
                    background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600, cursor: updating ? 'not-allowed' : 'pointer',
                  }}>
                  <XCircle size={12} /> Close
                </button>
              ) : (
                <button
                  onClick={() => updateTicket({ status: 'open' })}
                  disabled={updating}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8,
                    background: 'var(--color-sky-bg)', color: 'var(--color-sky)', border: `1px solid var(--color-sky)`, fontSize: 12, fontWeight: 700, cursor: updating ? 'not-allowed' : 'pointer',
                  }}>
                  Reopen Ticket
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>Priority:</span>
              <select value={ticket.priority} onChange={e => updateTicket({ priority: e.target.value })} disabled={updating} className="app-input" style={{ width: 'auto', fontSize: 11, padding: '4px 8px', minHeight: 'unset', cursor: 'pointer' }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Description</p>
          <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{ticket.description}</p>
        </div>

        {/* Conversation Replies Feed */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 0' }}>
          {replies.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <MessageCircle size={32} style={{ margin: '0 auto 8px', color: C.muted }} />
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>No replies in this thread yet.</p>
              <p style={{ fontSize: 11, color: C.muted, margin: '4px 0 0' }}>Send an official message to the user below.</p>
            </div>
          ) : (
            replies.map(r => {
              const isAdmin = r.sender_type === 'admin';
              return (
                <div key={r.id} style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}`, background: isAdmin ? 'var(--color-primary-bg)' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0, background: isAdmin ? 'var(--color-primary)' : 'var(--color-surface-2)', color: isAdmin ? '#fff' : C.text }}>
                      {isAdmin ? <Shield size={12}/> : <User size={12}/>}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{r.sender_name}</span>
                    {isAdmin && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: 'var(--color-primary)', color: '#fff', fontWeight: 800, letterSpacing: '0.04em' }}>SUPPORT STAFF</span>}
                    <span style={{ fontSize: 11, color: C.muted, marginLeft: 'auto' }}>{fmtTime(r.created_at)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: C.text, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap', paddingLeft: 32 }}>{r.message}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Reply & Communication Section */}
        {ticket.status !== 'closed' ? (
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, background: 'var(--color-surface-2)', flexShrink: 0 }}>
            {error && <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: '0 0 8px' }}>{error}</p>}

            {/* Canned Templates */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <Sparkles size={11} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Quick Response Templates:</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CANNED_TEMPLATES.map(t => (
                  <button
                    key={t.label}
                    onClick={() => setReplyText(t.text)}
                    type="button"
                    style={{
                      padding: '4px 9px', borderRadius: 7, border: `1px solid ${C.border}`,
                      background: 'var(--d-card)', color: C.text, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Type your official response to the user…"
              rows={3}
              className="app-input"
              style={{ resize: 'vertical', marginBottom: 8, background: 'var(--d-card)' }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply(); }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: C.muted }}>Ctrl+Enter to send</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => sendReply(replyText, 'resolved')}
                  disabled={!replyText.trim() || sending}
                  className="btn-ghost"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', fontSize: 12, fontWeight: 700 }}>
                  <CheckCircle2 size={12}/> Reply & Resolve
                </button>
                <button
                  onClick={() => sendReply()}
                  disabled={!replyText.trim() || sending}
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 12, fontWeight: 700 }}>
                  <Send size={12}/> {sending ? 'Sending…' : 'Send Reply'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, background: 'var(--color-surface-2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>This ticket is marked as closed.</p>
            <button onClick={() => updateTicket({ status: 'open' })} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}>
              Reopen to Reply
            </button>
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
