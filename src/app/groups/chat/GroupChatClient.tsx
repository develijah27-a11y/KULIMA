'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

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

const C = {
  text:       'var(--d-text)',
  muted:      'var(--d-muted)',
  border:     'var(--d-border)',
  cardBg:     'var(--d-card)',
  green:      'var(--color-primary)',
  greenBg:    'var(--color-primary-bg)',
  shadow:     'var(--d-shadow-card)',
};

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / 3600000;
  if (diffH < 24) return d.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: true });
  if (diffH < 48) return `Yesterday ${d.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
  return d.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function GroupChatClient({ adminId, currentUserId, currentUserName, memberCount }: Props) {
  const supabase = createClient();
  const [messages, setMessages]   = useState<Message[]>([]);
  const [draft, setDraft]         = useState('');
  const [sending, setSending]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  // Real-time subscription via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`group_chat:${adminId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'group_messages',
          filter: `admin_id=eq.${adminId}`,
        },
        (payload) => {
          setMessages(prev => {
            // Avoid duplicates (optimistic vs server)
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
          });
          setTimeout(scrollToBottom, 60);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [adminId, scrollToBottom]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setError(null);

    // Optimistic insert
    const tempId = `temp_${Date.now()}`;
    const optimistic: Message = {
      id:          tempId,
      admin_id:    adminId,
      sender_id:   currentUserId,
      sender_name: currentUserName,
      body:        text,
      created_at:  new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setDraft('');
    setTimeout(scrollToBottom, 60);

    const { error: insertError } = await (supabase.from as any)('group_messages').insert({
      admin_id:    adminId,
      sender_id:   currentUserId,
      sender_name: currentUserName,
      body:        text,
    });

    if (insertError) {
      // Roll back optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setError('Failed to send. Please try again.');
      setDraft(text);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', minHeight: 400 }}>
      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, background: C.cardBg, borderRadius: '14px 14px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 800, color: C.text, margin: 0 }}>Group Chat</p>
          <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{memberCount} members · messages visible to all</p>
        </div>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} title="Live" />
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--d-page)' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div className="dash-skeleton" style={{ height: 48, borderRadius: 10, marginBottom: 8 }} />
            <div className="dash-skeleton" style={{ height: 48, borderRadius: 10, marginBottom: 8, width: '70%' }} />
            <div className="dash-skeleton" style={{ height: 48, borderRadius: 10, width: '85%' }} />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: 'var(--d-muted)' }}><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
            <p style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 4 }}>No messages yet</p>
            <p style={{ fontSize: 13, color: C.muted }}>Start the conversation — your group members can see messages in real time.</p>
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUserId;
          const initials = (msg.sender_name ?? '?')[0].toUpperCase();
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
              {/* Avatar */}
              {!isOwn && (
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                  {initials}
                </div>
              )}
              {/* Bubble */}
              <div style={{ maxWidth: '70%' }}>
                {!isOwn && (
                  <p style={{ fontSize: 10, fontWeight: 600, color: C.muted, marginBottom: 3, marginLeft: 2 }}>{msg.sender_name ?? 'Member'}</p>
                )}
                <div style={{
                  padding: '9px 13px',
                  borderRadius: isOwn ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isOwn ? C.green : C.cardBg,
                  boxShadow: C.shadow,
                  opacity: msg.id.startsWith('temp_') ? 0.7 : 1,
                }}>
                  <p style={{ fontSize: 13, color: isOwn ? '#fff' : C.text, margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.body}</p>
                </div>
                <p style={{ fontSize: 10, color: C.muted, margin: '3px 4px 0', textAlign: isOwn ? 'right' : 'left' }}>{timeLabel(msg.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '8px 16px', background: 'var(--color-danger-bg)', borderTop: `1px solid var(--color-danger)` }}>
          <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${C.border}`, background: C.cardBg, borderRadius: '0 0 14px 14px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            border: `1.5px solid ${C.border}`,
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 13,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: C.text,
            background: 'var(--d-input-bg, var(--d-page))',
            outline: 'none',
            minHeight: 44,
            maxHeight: 120,
            lineHeight: 1.5,
          }}
          maxLength={2000}
          disabled={sending}
        />
        <button
          onClick={sendMessage}
          disabled={!draft.trim() || sending}
          style={{
            padding: '10px 18px',
            borderRadius: 12,
            background: draft.trim() && !sending ? C.green : 'var(--d-border)',
            color: '#fff',
            border: 'none',
            fontWeight: 700,
            fontSize: 13,
            cursor: draft.trim() && !sending ? 'pointer' : 'not-allowed',
            flexShrink: 0,
            minHeight: 44,
            transition: 'background 0.15s',
          }}
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
