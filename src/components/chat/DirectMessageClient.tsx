'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, CheckCheck, Clock, AlertCircle, RotateCcw, Send, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface DmMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read: boolean;
  created_at: string;
  failed?: boolean;
}

interface Props {
  meId: string;
  meName: string;
  themId: string;
  themName: string;
  /** Optional label shown below header e.g. "Plant Pathologist · Kampala" */
  themSubtitle?: string;
  isVerified?: boolean;
}

/** Stable, deterministic conversation ID for any two user IDs */
export function conversationId(a: string, b: string): string {
  return [a, b].sort().join(':');
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const diffH = (Date.now() - d.getTime()) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (diffH < 48) return 'Yesterday';
  return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short' });
}

const C = {
  text:    'var(--d-text)',
  muted:   'var(--d-muted)',
  border:  'var(--d-border)',
  card:    'var(--d-card)',
  green:   'var(--color-primary)',
  greenDark: 'var(--color-primary-dark)',
  shadow:  'var(--d-shadow-card)',
};

export function DirectMessageClient({ meId, meName, themId, themName, themSubtitle, isVerified }: Props) {
  const supabase = createClient();
  const convId   = conversationId(meId, themId);

  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [draft, setDraft]       = useState('');
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLTextAreaElement>(null);

  const scrollBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
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
        setTimeout(() => scrollBottom('auto'), 50);

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
          setTimeout(() => scrollBottom('smooth'), 60);

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

  const sendMessageText = async (text: string, existingTempId?: string) => {
    if (!text.trim()) return;
    const tempId = existingTempId ?? `temp_${Date.now()}`;

    if (!existingTempId) {
      const optimistic: DmMessage = {
        id: tempId, conversation_id: convId,
        sender_id: meId, recipient_id: themId,
        body: text, read: false, created_at: new Date().toISOString(),
        failed: false,
      };
      setMessages(p => [...p, optimistic]);
      setDraft('');
      setTimeout(() => scrollBottom('smooth'), 60);
    } else {
      setMessages(p => p.map(m => m.id === tempId ? { ...m, failed: false } : m));
    }

    setSending(true);

    const { data: insertedRows, error: err } = await (supabase.from as any)('direct_messages')
      .insert({
        conversation_id: convId,
        sender_id:       meId,
        recipient_id:    themId,
        body:            text,
      })
      .select('id, conversation_id, sender_id, recipient_id, body, read, created_at');

    if (err) {
      setMessages(p => p.map(m => m.id === tempId ? { ...m, failed: true } : m));
    } else {
      const confirmed = insertedRows?.[0];
      if (confirmed) {
        setMessages(p => p.map(m => (m.id === tempId ? confirmed : m)));
      }
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleSend = () => {
    sendMessageText(draft);
  };

  const retryMessage = (msg: DmMessage) => {
    sendMessageText(msg.body, msg.id);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', minHeight: 480, maxHeight: 720, borderRadius: 16, overflow: 'hidden', boxShadow: C.shadow, background: C.card, border: `1px solid ${C.border}` }}>
      
      {/* Header */}
      <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: C.card, zIndex: 10 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #166B3A 0%, #2FA34F 100%)', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, flexShrink: 0 }}>
              {themName[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 11, height: 11, borderRadius: '50%', background: '#22C55E', border: '2px solid #FFFFFF' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <p style={{ fontSize: 14.5, fontWeight: 800, color: C.text, margin: 0 }}>{themName}</p>
              {isVerified && <ShieldCheck size={14} style={{ color: 'var(--color-primary)' }} />}
            </div>
            {themSubtitle && <p style={{ fontSize: 11.5, color: C.muted, margin: '1px 0 0' }}>{themSubtitle}</p>}
          </div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: 'var(--color-success-bg)' }}>
          Direct Chat
        </span>
      </div>

      {/* Messages Feed */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--color-bg)' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div className="dash-skeleton" style={{ height: 42, borderRadius: 12, marginBottom: 10, maxWidth: '60%' }} />
            <div className="dash-skeleton" style={{ height: 42, borderRadius: 12, width: '45%', alignSelf: 'flex-end', marginBottom: 10 }} />
            <div className="dash-skeleton" style={{ height: 42, borderRadius: 12, width: '70%' }} />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '56px 20px', maxWidth: 320, margin: 'auto' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-primary-bg)', color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Send size={22} />
            </div>
            <p style={{ fontWeight: 800, fontSize: 15, color: C.text, margin: '0 0 4px' }}>Start the conversation</p>
            <p style={{ fontSize: 12.5, color: C.muted, margin: 0, lineHeight: 1.5 }}>
              Messages with {themName} are private and delivered in real time.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.sender_id === meId;
          const isTemp = msg.id.startsWith('temp_') && !msg.failed;
          const isFailed = Boolean(msg.failed);

          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: isOwn ? 'row-reverse' : 'row',
                gap: 8,
                alignItems: 'flex-end',
              }}
            >
              {!isOwn && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-primary-bg)', color: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                  {themName[0]?.toUpperCase() ?? '?'}
                </div>
              )}

              <div style={{ maxWidth: '75%', minWidth: 100 }}>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isOwn ? (isFailed ? 'var(--color-danger-bg)' : C.green) : C.card,
                    color: isOwn ? (isFailed ? 'var(--color-danger)' : '#FFFFFF') : C.text,
                    border: isOwn ? (isFailed ? '1px solid var(--color-danger)' : 'none') : `1px solid ${C.border}`,
                    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                  }}
                >
                  <p style={{ fontSize: 13.5, margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.body}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, padding: '0 4px', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                  <span style={{ fontSize: 10, color: C.muted }}>
                    {timeLabel(msg.created_at)}
                  </span>

                  {isOwn && (
                    <span>
                      {isFailed ? (
                        <button
                          type="button"
                          onClick={() => retryMessage(msg)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 3, border: 'none', background: 'none', color: 'var(--color-danger)', fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                        >
                          <AlertCircle size={11} /> Failed · Tap to retry
                        </button>
                      ) : isTemp ? (
                        <Clock size={11} style={{ color: C.muted, display: 'inline-block' }} />
                      ) : msg.read ? (
                        <CheckCheck size={12} style={{ color: '#22C55E', display: 'inline-block' }} />
                      ) : (
                        <Check size={12} style={{ color: C.muted, display: 'inline-block' }} />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Message Composer */}
      <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.card, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder="Type your message… (Press Enter to send)"
          rows={1}
          maxLength={2000}
          disabled={sending}
          style={{
            flex: 1, resize: 'none', border: `1.5px solid ${C.border}`,
            borderRadius: 12, padding: '10px 14px', fontSize: 13.5,
            fontFamily: "'Inter', system-ui, sans-serif", color: C.text,
            background: 'var(--color-bg)', outline: 'none',
            minHeight: 44, maxHeight: 110, lineHeight: 1.45,
          }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          style={{
            padding: '10px 18px', borderRadius: 12, minHeight: 44,
            background: draft.trim() && !sending ? C.green : 'var(--color-border)',
            color: '#FFFFFF', border: 'none', fontWeight: 700, fontSize: 13,
            cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed',
            flexShrink: 0, transition: 'background 0.15s, transform 0.1s',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <Send size={15} /> Send
        </button>
      </div>
    </div>
  );
}
