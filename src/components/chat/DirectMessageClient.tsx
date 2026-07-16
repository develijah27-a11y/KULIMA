'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface DmMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read: boolean;
  created_at: string;
}

interface Props {
  meId: string;
  meName: string;
  themId: string;
  themName: string;
  /** Optional label shown below header e.g. "Plant Pathologist · Kampala" */
  themSubtitle?: string;
}

/** Stable, deterministic conversation ID for any two user IDs */
export function conversationId(a: string, b: string): string {
  return [a, b].sort().join(':');
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const diffH = (Date.now() - d.getTime()) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (diffH < 48) return `Yesterday`;
  return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short' });
}

const C = {
  text:    'var(--d-text)',
  muted:   'var(--d-muted)',
  border:  'var(--d-border)',
  card:    'var(--d-card)',
  green:   'var(--color-primary)',
  shadow:  'var(--d-shadow-card)',
};

export function DirectMessageClient({ meId, meName, themId, themName, themSubtitle }: Props) {
  const supabase = createClient();
  const convId   = conversationId(meId, themId);

  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [draft, setDraft]       = useState('');
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLTextAreaElement>(null);

  const scrollBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Initial load + mark messages as read
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await (supabase.from as any)('direct_messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (!cancelled) {
        setMessages(data ?? []);
        setLoading(false);
        setTimeout(scrollBottom, 80);

        // Mark unread messages from the other person as read
        await (supabase.from as any)('direct_messages')
          .update({ read: true })
          .eq('conversation_id', convId)
          .eq('recipient_id', meId)
          .eq('read', false);
      }
    })();
    return () => { cancelled = true; };
  }, [convId, meId, scrollBottom]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`dm:${convId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'direct_messages',
          filter: `conversation_id=eq.${convId}`,
        },
        (payload) => {
          setMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as DmMessage];
          });
          setTimeout(scrollBottom, 60);

          // Auto-mark as read if the new message is for me
          if ((payload.new as DmMessage).recipient_id === meId) {
            (supabase.from as any)('direct_messages')
              .update({ read: true })
              .eq('id', (payload.new as DmMessage).id)
              .then(() => {});
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [convId, meId, scrollBottom]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);

    const tempId = `temp_${Date.now()}`;
    const optimistic: DmMessage = {
      id: tempId, conversation_id: convId,
      sender_id: meId, recipient_id: themId,
      body: text, read: false, created_at: new Date().toISOString(),
    };
    setMessages(p => [...p, optimistic]);
    setDraft('');
    setTimeout(scrollBottom, 60);

    const { data: insertedRows, error: err } = await (supabase.from as any)('direct_messages')
      .insert({
        conversation_id: convId,
        sender_id:       meId,
        recipient_id:    themId,
        body:            text,
      })
      .select('id, conversation_id, sender_id, recipient_id, body, read, created_at');

    if (err) {
      setMessages(p => p.filter(m => m.id !== tempId));
      setError('Failed to send. Check your connection.');
      setDraft(text);
    } else {
      // Swap the optimistic placeholder for the confirmed row so the bubble
      // stops looking like it's still sending — otherwise this exact message
      // stays stuck at 65% opacity forever, since its temp_ id never matches
      // the row the realtime channel delivers.
      const confirmed = insertedRows?.[0];
      if (confirmed) {
        setMessages(p => p.map(m => (m.id === tempId ? confirmed : m)));
      }
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 150px)', minHeight: 400, borderRadius: 14, overflow: 'hidden', boxShadow: C.shadow, background: C.card }}>
      {/* Header */}
      <div style={{ padding: '13px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.card }}>
        <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: C.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
            {themName[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>{themName}</p>
            {themSubtitle && <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{themSubtitle}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
          <span style={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>Live</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--d-page)' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div className="dash-skeleton" style={{ height: 44, borderRadius: 10, marginBottom: 8 }} />
            <div className="dash-skeleton" style={{ height: 44, borderRadius: 10, width: '60%', marginBottom: 8 }} />
            <div className="dash-skeleton" style={{ height: 44, borderRadius: 10, width: '80%' }} />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <p style={{ fontSize: 40, marginBottom: 10 }}>💬</p>
            <p style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 4 }}>Start the conversation</p>
            <p style={{ fontSize: 13, color: C.muted }}>Messages are private and end-to-end delivered securely.</p>
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_id === meId;
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
              {!isOwn && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                  {themName[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <div style={{ maxWidth: '72%' }}>
                <div style={{
                  padding: '9px 13px',
                  borderRadius: isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isOwn ? C.green : C.card,
                  boxShadow: C.shadow,
                  opacity: msg.id.startsWith('temp_') ? 0.65 : 1,
                }}>
                  <p style={{ fontSize: 13, color: isOwn ? '#fff' : C.text, margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.body}
                  </p>
                </div>
                <p style={{ fontSize: 10, color: C.muted, margin: '3px 4px 0', textAlign: isOwn ? 'right' : 'left' }}>
                  {timeLabel(msg.created_at)}
                  {isOwn && (
                    <span style={{ marginLeft: 4, color: msg.read ? C.green : C.muted, display: 'inline-flex', verticalAlign: 'middle' }}>
                      {msg.read ? <CheckCheck size={10} /> : <Check size={10} />}
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div style={{ padding: '7px 16px', background: 'var(--color-danger-bg)', borderTop: `1px solid var(--color-danger)` }}>
          <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '10px 13px', borderTop: `1px solid ${C.border}`, background: C.card, display: 'flex', gap: 9, alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder="Type a message… (Enter to send)"
          rows={1}
          maxLength={2000}
          disabled={sending}
          style={{
            flex: 1, resize: 'none', border: `1.5px solid ${C.border}`,
            borderRadius: 12, padding: '10px 13px', fontSize: 13,
            fontFamily: "'Poppins', 'Inter', system-ui, sans-serif", color: C.text,
            background: 'var(--d-page)', outline: 'none',
            minHeight: 44, maxHeight: 120, lineHeight: 1.5,
          }}
        />
        <button
          onClick={send}
          disabled={!draft.trim() || sending}
          style={{
            padding: '10px 18px', borderRadius: 12, minHeight: 44,
            background: draft.trim() && !sending ? C.green : 'var(--d-border)',
            color: '#fff', border: 'none', fontWeight: 700, fontSize: 13,
            cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed',
            flexShrink: 0, transition: 'background 0.15s',
          }}
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
