'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, AlertCircle, MessageCircle, Phone, ArrowUpRight, HelpCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const C = {
  text: 'var(--d-text)',
  muted: 'var(--d-muted)',
  border: 'var(--d-border)',
  card: 'var(--d-card)',
  green: 'var(--color-primary)',
  shadow: 'var(--d-shadow-card)',
  inputBg: 'var(--d-input-bg)',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS: Record<string, string[]> = {
  transporter: [
    "What's my current assignment?",
    "Break down my payment for this delivery",
    "I have a complaint to raise",
    "What is the time right now?",
    "Who is the founder of Cropify?",
  ],
  farmer: [
    "What's the status of my last order?",
    "What's the current price for maize?",
    "My beans have yellow spots on the leaves",
    "I have a complaint to raise",
    "Who is the founder of Cropify?",
  ],
  buyer: [
    "Where is my order?",
    "Has my escrow been released?",
    "The delivery I received doesn't match the listing",
    "I have a complaint to raise",
    "Who is the founder of Cropify?",
  ],
  agro_dealer: [
    "What's the status of my listings?",
    "What are maize prices like right now?",
    "I have a complaint to raise",
    "Who is the founder of Cropify?",
  ],
};

function renderFormattedMessage(content: string) {
  const lines = content.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Check if line is a bullet point
        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-');
        const cleanLine = isBullet ? trimmed.replace(/^[•\-]\s*/, '') : trimmed;

        // Parse markdown bold (**text**) and links ([text](url)) and status badges
        const parts = parseLineElements(cleanLine);

        if (isBullet) {
          return (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '2px 0' }}>
              <span style={{ color: C.green, fontSize: 13, lineHeight: '1.4', flexShrink: 0 }}>•</span>
              <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.5 }}>{parts}</div>
            </div>
          );
        }

        return (
          <div key={idx} style={{ fontSize: 13.5, lineHeight: 1.5, margin: '2px 0' }}>
            {parts}
          </div>
        );
      })}
    </div>
  );
}

function parseLineElements(text: string): React.ReactNode[] {
  // Regex to match:
  // 1. Status tokens: \[Status:\s*([^\]]+)\]
  // 2. Links: \[([^\]]+)\]\(([^)]+)\)
  // 3. Bold: \*\*([^*]+)\*\*
  // 4. Code / ID: #?([0-9a-f]{8})
  const tokenRegex = /(\[Status:\s*[^\]]+\]|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g;
  const segments = text.split(tokenRegex);

  return segments.map((seg, i) => {
    if (!seg) return null;

    // Status Badge: [Status: delivered]
    if (seg.startsWith('[Status:') && seg.endsWith(']')) {
      const statusRaw = seg.slice(8, -1).trim().toLowerCase();
      let bg = 'rgba(156, 163, 175, 0.15)';
      let fg = '#9ca3af';
      let label = statusRaw;

      if (['delivered', 'completed', 'released', 'funded', 'active'].includes(statusRaw)) {
        bg = 'rgba(34, 197, 94, 0.18)';
        fg = '#22c55e';
      } else if (['in_transit', 'assigned', 'picked_up'].includes(statusRaw)) {
        bg = 'rgba(59, 130, 246, 0.18)';
        fg = '#3b82f6';
      } else if (['cancelled', 'disputed', 'rejected', 'failed'].includes(statusRaw)) {
        bg = 'rgba(239, 68, 68, 0.18)';
        fg = '#ef4444';
      } else if (['pending', 'awaiting_payment'].includes(statusRaw)) {
        bg = 'rgba(245, 158, 11, 0.18)';
        fg = '#f59e0b';
      }

      return (
        <span
          key={i}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '1px 7px',
            borderRadius: 6,
            background: bg,
            color: fg,
            fontSize: 11.5,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            margin: '0 4px',
            verticalAlign: 'middle',
          }}
        >
          {label}
        </span>
      );
    }

    // Link: [Text](url)
    const linkMatch = seg.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const linkText = linkMatch[1];
      const linkUrl = linkMatch[2];
      const isExternal = linkUrl.startsWith('http') || linkUrl.startsWith('tel:') || linkUrl.startsWith('mailto:');
      return (
        <a
          key={i}
          href={linkUrl}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          style={{
            color: C.green,
            fontWeight: 700,
            textDecoration: 'underline',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {linkText}
          {isExternal && <ArrowUpRight size={12} style={{ display: 'inline' }} />}
        </a>
      );
    }

    // Bold: **Text**
    if (seg.startsWith('**') && seg.endsWith('**')) {
      return (
        <strong key={i} style={{ fontWeight: 700, color: C.text }}>
          {seg.slice(2, -2)}
        </strong>
      );
    }

    return <span key={i}>{seg}</span>;
  });
}

export function CopilotChat({ role }: { role: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const [lastPrompt, setLastPrompt] = useState('');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError('');
    setLastPrompt(trimmed);
    const next = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages(next);
    setDraft('');
    setSending(true);

    try {
      const supabase = createClient();
      let { data: { session } } = await supabase.auth.getSession();
      if (!session || (session.expires_at && session.expires_at * 1000 < Date.now() + 30000)) {
        const { data: refData } = await supabase.auth.refreshSession();
        session = refData?.session ?? session;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ message: trimmed, history: next.slice(0, -1), role }),
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      if (!res.ok) {
        if (res.status === 401) {
          setError('Session expired or unauthorized. Please refresh the page or sign in again.');
        } else {
          setError(json?.error ?? 'Service is momentarily busy. Please tap retry.');
        }
        return;
      }

      if (json?.reply) {
        setMessages((m) => [...m, { role: 'assistant', content: json.reply }]);
      } else {
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: 'Lookup completed. Please check your dashboard for further details.' },
        ]);
      }
    } catch {
      setError('Connection interrupted. Please tap retry to send again.');
    } finally {
      setSending(false);
    }
  }

  const suggestions = SUGGESTIONS[role] ?? SUGGESTIONS.transporter;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '74vh',
        background: C.card,
        borderRadius: 16,
        boxShadow: C.shadow,
        border: `1px solid ${C.border}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '14px 18px',
          borderBottom: `1px solid ${C.border}`,
          background: 'rgba(0,0,0,0.12)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'rgba(74,222,128,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.green,
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <p style={{ fontSize: 14.5, fontWeight: 800, color: C.text, margin: 0 }}>Cropify Copilot</p>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: 'rgba(74,222,128,0.15)',
                  color: C.green,
                  letterSpacing: '0.04em',
                }}
              >
                {role}
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: C.muted, margin: '2px 0 0' }}>
              Order, escrow, price, route and delivery assistance — advisory only.
            </p>
          </div>
        </div>

        {/* Quick Contact buttons in Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <a
            href="https://wa.me/256758984224"
            target="_blank"
            rel="noopener noreferrer"
            title="Chat with Support on WhatsApp"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              background: C.inputBg,
              color: C.muted,
              fontSize: 11.5,
              fontWeight: 600,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <MessageCircle size={13} style={{ color: '#25D366' }} />
            <span>Support</span>
          </a>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {messages.length === 0 && (
          <div style={{ padding: '8px 0' }}>
            <p style={{ fontSize: 13.5, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>
              Welcome to your personal Cropify Copilot.
            </p>
            <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 14px', lineHeight: 1.5 }}>
              Tap any prompt below or type your question to get real-time account guidance, delivery tracking, payment breakdowns, or support:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{
                    textAlign: 'left',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    background: C.inputBg,
                    color: C.text,
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.green;
                    e.currentTarget.style.background = 'rgba(74,222,128,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.background = C.inputBg;
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                padding: '12px 16px',
                borderRadius: 14,
                borderTopRightRadius: m.role === 'user' ? 2 : 14,
                borderTopLeftRadius: m.role === 'assistant' ? 2 : 14,
                background: m.role === 'user' ? C.green : C.inputBg,
                color: m.role === 'user' ? '#06200e' : C.text,
                fontWeight: m.role === 'user' ? 600 : 400,
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                border: m.role === 'assistant' ? `1px solid ${C.border}` : 'none',
              }}
            >
              {m.role === 'user' ? (
                <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.content}</div>
              ) : (
                renderFormattedMessage(m.content)
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 12,
              background: C.inputBg,
              border: `1px solid ${C.border}`,
              width: 'fit-content',
              color: C.muted,
              fontSize: 12.5,
            }}
          >
            <Loader2 size={14} className="animate-spin" style={{ color: C.green }} /> Thinking…
          </div>
        )}

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--color-danger, #ef4444)',
              fontSize: 12.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
            {lastPrompt && (
              <button
                type="button"
                onClick={() => send(lastPrompt)}
                disabled={sending}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid currentColor',
                  background: 'transparent',
                  color: 'inherit',
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Retry
              </button>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested chips above input after messages start */}
      {messages.length > 0 && !sending && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            padding: '6px 14px',
            borderTop: `1px solid ${C.border}`,
            background: 'rgba(0,0,0,0.06)',
          }}
        >
          {suggestions.slice(0, 3).map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              style={{
                whiteSpace: 'nowrap',
                padding: '4px 10px',
                borderRadius: 20,
                border: `1px solid ${C.border}`,
                background: C.inputBg,
                color: C.muted,
                fontSize: 11.5,
                fontWeight: 500,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        style={{
          display: 'flex',
          gap: 8,
          padding: 12,
          borderTop: `1px solid ${C.border}`,
          background: 'rgba(0,0,0,0.1)',
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask a question (e.g., assignment, breakdown, complaint)…"
          disabled={sending}
          style={{
            flex: 1,
            padding: '11px 16px',
            borderRadius: 12,
            border: `1px solid ${C.border}`,
            background: C.inputBg,
            color: C.text,
            fontSize: 13.5,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            border: 'none',
            background: C.green,
            color: '#06200e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: sending || !draft.trim() ? 'not-allowed' : 'pointer',
            opacity: sending || !draft.trim() ? 0.6 : 1,
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
