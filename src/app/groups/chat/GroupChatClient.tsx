'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Send } from 'lucide-react';

interface Message {
  id: string;
  admin_id: string;
  sender_id: string;
  sender_name: string | null;
  body: string;
  created_at: string;
}

interface Props {
  adminId: string;
  currentUserId: string;
  currentUserName: string;
  memberCount: number;
}

// Distinct hues cycling per sender name — visual variety without randomness
const AVATAR_HUES = ['#166B3A','#0EA5E9','#7C3AED','#FFA726','#0891B2','#65A30D','#EF4444'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i)) % AVATAR_HUES.length;
  return AVATAR_HUES[h];
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const diffH = (Date.now() - d.getTime()) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (diffH < 48) return `Yesterday · ${d.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function dateSeparatorLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function GroupChatClient({ adminId, currentUserId, currentUserName, memberCount }: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft]       = useState('');
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const autoGrow = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase.from as any)('group_messages')
        .select('id, admin_id, sender_id, sender_name, body, created_at')
        .eq('admin_id', adminId)
        .order('created_at', { ascending: true })
        .limit(100);
      if (!cancelled) {
        if (!error) setMessages(data ?? []);
        setLoading(false);
        setTimeout(scrollToBottom, 100);
      }
    })();
    return () => { cancelled = true; };
  }, [adminId, scrollToBottom]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`group_chat:${adminId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'group_messages', filter: `admin_id=eq.${adminId}`,
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new as Message];
        });
        setTimeout(scrollToBottom, 60);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [adminId, scrollToBottom]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);

    const tempId = `temp_${Date.now()}`;
    const optimistic: Message = {
      id: tempId, admin_id: adminId,
      sender_id: currentUserId, sender_name: currentUserName,
      body: text, created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setDraft('');
    if (inputRef.current) inputRef.current.style.height = '44px';
    setTimeout(scrollToBottom, 60);

    const { data: insertedRows, error: insertError } = await (supabase.from as any)('group_messages')
      .insert({ admin_id: adminId, sender_id: currentUserId, sender_name: currentUserName, body: text })
      .select('id, admin_id, sender_id, sender_name, body, created_at');

    if (insertError) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setError('Message not sent. Please try again.');
      setDraft(text);
    } else {
      // Swap the optimistic placeholder for the confirmed row (real id +
      // server timestamp) so the "Sending…" label clears immediately instead
      // of waiting on the realtime channel — which would otherwise leave this
      // exact bubble stuck since its temp_ id never matches an incoming row.
      const confirmed = insertedRows?.[0];
      if (confirmed) {
        setMessages(prev => prev.map(m => (m.id === tempId ? confirmed : m)));
      }
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Group messages by calendar date for date separators
  const grouped: Array<{ date: string; msgs: Message[] }> = [];
  for (const msg of messages) {
    const dateKey = new Date(msg.created_at).toDateString();
    const last = grouped[grouped.length - 1];
    if (last && last.date === dateKey) last.msgs.push(msg);
    else grouped.push({ date: dateKey, msgs: [msg] });
  }

  const canSend = !!draft.trim() && !sending;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 140px)', minHeight: 400,
      borderRadius: 16, overflow: 'hidden',
      background: 'var(--d-card)',
      boxShadow: '0 0 0 1px var(--d-border), 0 4px 24px rgba(0,0,0,0.10)',
    }}>
      {/* ── Header ── */}
      <div style={{
        padding: '14px 18px', flexShrink: 0,
        borderBottom: '1px solid var(--d-border)',
        background: 'var(--d-card)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: 'var(--color-primary-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--d-text)', margin: 0, letterSpacing: '-0.02em' }}>
              Group Chat
            </p>
            <p style={{ fontSize: 11, color: 'var(--d-muted)', margin: 0 }}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'} · visible to everyone
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e99' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-success)' }}>Live</span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 14px',
        display: 'flex', flexDirection: 'column', gap: 2,
        background: 'var(--color-bg)',
        backgroundImage: 'radial-gradient(circle, var(--color-surface-2) 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}>

        {/* Loading skeletons — proper bubble shapes */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }} className="animate-pulse">
            {[{w:'52%',own:false,h:44},{w:'40%',own:true,h:44},{w:'68%',own:false,h:60},{w:'38%',own:true,h:44},{w:'56%',own:false,h:44}].map((s,i) => (
              <div key={i} style={{ display: 'flex', flexDirection: s.own ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                {!s.own && <div className="dash-skeleton" style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0 }} />}
                <div className="dash-skeleton" style={{ width: s.w, height: s.h, borderRadius: s.own ? '14px 14px 4px 14px' : '14px 14px 14px 4px' }} />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, marginBottom: 16, background: 'var(--color-primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--d-text)', marginBottom: 6 }}>Be the first to say something</p>
            <p style={{ fontSize: 13, color: 'var(--d-muted)', maxWidth: 240, lineHeight: 1.55 }}>
              Your group members see messages here in real time.
            </p>
          </div>
        )}

        {/* Grouped messages with date separators */}
        {grouped.map(({ date, msgs }) => (
          <div key={date}>
            {/* Date separator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 10px' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--d-border)' }} />
              <span style={{
                fontSize: 10, fontWeight: 700, color: 'var(--d-muted)',
                whiteSpace: 'nowrap', letterSpacing: '0.06em',
                padding: '3px 10px', borderRadius: 99,
                background: 'var(--d-card)',
                border: '1px solid var(--d-border)',
              }}>
                {dateSeparatorLabel(msgs[0].created_at)}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--d-border)' }} />
            </div>

            {/* Bubbles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {msgs.map(msg => {
                const isOwn = msg.sender_id === currentUserId;
                const name = msg.sender_name ?? 'Member';
                const avatarBg = avatarColor(name);

                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                    {/* Avatar (others only) */}
                    {!isOwn && (
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: avatarBg, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800,
                        boxShadow: `0 2px 8px ${avatarBg}55`,
                      }}>
                        {name[0].toUpperCase()}
                      </div>
                    )}

                    <div style={{ maxWidth: '72%' }}>
                      {/* Sender name (others only) */}
                      {!isOwn && (
                        <p style={{ fontSize: 10, fontWeight: 700, color: avatarBg, marginBottom: 3, marginLeft: 4 }}>
                          {name}
                        </p>
                      )}

                      {/* Bubble */}
                      <div style={{
                        padding: '9px 14px',
                        borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isOwn
                          ? 'linear-gradient(135deg, #1A7A43 0%, #0C3D22 100%)'
                          : 'var(--d-card)',
                        boxShadow: isOwn
                          ? '0 4px 14px rgba(12,61,34,0.45)'
                          : '0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px var(--d-border)',
                        opacity: msg.id.startsWith('temp_') ? 0.6 : 1,
                        transition: 'opacity 0.25s',
                      }}>
                        <p style={{
                          fontSize: 13, lineHeight: 1.55,
                          color: isOwn ? '#fff' : 'var(--d-text)',
                          margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>
                          {msg.body}
                        </p>
                      </div>

                      {/* Timestamp */}
                      <p style={{ fontSize: 10, color: 'var(--d-muted)', margin: '3px 5px 0', textAlign: isOwn ? 'right' : 'left' }}>
                        {msg.id.startsWith('temp_') ? 'Sending…' : timeLabel(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{ padding: '8px 16px', background: 'var(--color-danger-bg)', borderTop: '1px solid var(--color-danger-border)', flexShrink: 0 }}>
          <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* ── Input bar ── */}
      <div style={{
        padding: '10px 12px', flexShrink: 0,
        borderTop: '1px solid var(--d-border)',
        background: 'var(--d-card)',
        display: 'flex', gap: 8, alignItems: 'flex-end',
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={e => { setDraft(e.target.value); autoGrow(); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={1}
            style={{
              width: '100%', boxSizing: 'border-box',
              resize: 'none', outline: 'none',
              border: `1.5px solid ${draft ? 'var(--color-primary-muted)' : 'var(--d-border)'}`,
              borderRadius: 14,
              padding: '10px 14px',
              fontSize: 13,
              fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
              color: 'var(--d-text)',
              background: 'var(--d-input-bg, var(--color-surface))',
              minHeight: 44, maxHeight: 120,
              lineHeight: 1.5,
              transition: 'border-color 0.15s',
            }}
            maxLength={2000}
            disabled={sending}
          />
          {draft.length > 1600 && (
            <span style={{
              position: 'absolute', right: 10, bottom: 8,
              fontSize: 9, fontWeight: 700, pointerEvents: 'none',
              color: draft.length > 1900 ? 'var(--color-danger)' : 'var(--d-muted)',
            }}>
              {2000 - draft.length}
            </span>
          )}
        </div>

        <button
          onClick={sendMessage}
          disabled={!canSend}
          aria-label="Send message"
          style={{
            width: 44, height: 44, flexShrink: 0,
            borderRadius: 14, border: 'none',
            cursor: canSend ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: canSend
              ? 'linear-gradient(135deg, #1A7A43 0%, #0C3D22 100%)'
              : 'var(--color-surface-2)',
            color: canSend ? '#fff' : 'var(--d-muted)',
            boxShadow: canSend ? '0 4px 14px rgba(12,61,34,0.40)' : 'none',
            transition: 'all 0.18s',
          }}
        >
          {sending
            ? <div className="animate-spin" style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
            : <Send size={18} strokeWidth={2.2} />
          }
        </button>
      </div>
    </div>
  );
}
