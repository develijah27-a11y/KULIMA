'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, AlertCircle } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  card: 'var(--d-card)', green: 'var(--color-primary)', shadow: 'var(--d-shadow-card)',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS: Record<string, string[]> = {
  farmer: ['What\'s the status of my last order?', 'What\'s the current price for maize?', 'My beans have yellow spots on the leaves — what could it be?'],
  buyer: ['Where is my order?', 'Has my escrow been released?', 'The delivery I received doesn\'t match the listing'],
  transporter: ['What\'s my current assignment?', 'Break down my payment for this delivery'],
  agro_dealer: ['What\'s the status of my listings?', 'What are maize prices like right now?'],
};

export function CopilotChat({ role }: { role: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError('');
    const next = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages(next);
    setDraft('');
    setSending(true);
    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history: next.slice(0, -1) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Something went wrong. Please try again.');
        setMessages(messages);
        return;
      }
      setMessages(m => [...m, { role: 'assistant', content: json.reply ?? '...' }]);
    } catch {
      setError('Could not reach the Copilot. Check your connection and try again.');
      setMessages(messages);
    } finally {
      setSending(false);
    }
  }

  const suggestions = SUGGESTIONS[role] ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '70vh', background: C.card, borderRadius: 16, boxShadow: C.shadow, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
        <span style={{ display: 'flex', color: C.green }}><Sparkles size={18} /></span>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>Cropify Copilot</p>
          <p style={{ fontSize: 11.5, color: C.muted, margin: 0 }}>Order, escrow, price and delivery status — advisory only, never moves money.</p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>Ask about your orders, escrow, prices, or deliveries.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{ textAlign: 'left', padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'var(--d-input-bg)', color: C.text, fontSize: 12.5, cursor: 'pointer' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div
              style={{
                maxWidth: '80%', padding: '10px 14px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                background: m.role === 'user' ? C.green : 'var(--d-input-bg)',
                color: m.role === 'user' ? '#fff' : C.text,
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.muted, fontSize: 12.5 }}>
            <Loader2 size={13} className="animate-spin" /> Thinking…
          </div>
        )}
        {error && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, color: 'var(--color-danger)', fontSize: 12.5 }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={e => { e.preventDefault(); send(draft); }}
        style={{ display: 'flex', gap: 8, padding: 14, borderTop: `1px solid ${C.border}` }}
      >
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Ask a question…"
          disabled={sending}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'var(--d-input-bg)', color: C.text, fontSize: 13.5, outline: 'none' }}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: C.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: sending ? 'not-allowed' : 'pointer', flexShrink: 0 }}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
