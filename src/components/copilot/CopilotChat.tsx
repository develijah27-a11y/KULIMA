'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  AlertCircle,
  MessageCircle,
  ArrowUpRight,
  HelpCircle,
  SquarePen,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  ThumbsUp,
  ThumbsDown,
  ArrowUp,
  Square,
  ChevronDown,
  ShieldCheck,
  TrendingUp,
  Truck,
  Sprout,
  Receipt,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const C = {
  text: 'var(--d-text)',
  muted: 'var(--d-muted)',
  border: 'var(--d-border)',
  card: 'var(--d-card)',
  green: 'var(--color-primary)',
  greenBright: 'var(--color-primary-muted, #22c55e)',
  shadow: 'var(--d-shadow-card)',
  inputBg: 'var(--d-input-bg)',
  subtle: 'var(--d-subtle, rgba(0,0,0,0.04))',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PromptCard {
  title: string;
  description: string;
  prompt: string;
  icon: React.ReactNode;
}

const ROLE_PROMPT_CARDS: Record<string, PromptCard[]> = {
  farmer: [
    {
      title: 'Wholesale Market Prices',
      description: 'Check today’s maize, beans, and sorghum rates across regional hubs',
      prompt: "What's the current market price for maize and beans?",
      icon: <TrendingUp size={17} className="text-emerald-500" />,
    },
    {
      title: 'Crop Doctor & Pest Advice',
      description: 'Diagnose leaf discoloration, stem rot, pests, and soil treatment',
      prompt: 'My beans have yellow spots on the leaves. What should I do?',
      icon: <Sprout size={17} className="text-emerald-500" />,
    },
    {
      title: 'Orders & Escrow Payout',
      description: 'Review my recent harvest sales, buyer acceptance, and payout release',
      prompt: "What's the status of my last order and escrow payment?",
      icon: <Receipt size={17} className="text-emerald-500" />,
    },
    {
      title: 'Quality Rules & 3-Strikes',
      description: 'Grading parameters, moisture limits, and quality protection rules',
      prompt: 'Explain produce quality standards and the 3-strike policy.',
      icon: <ShieldCheck size={17} className="text-emerald-500" />,
    },
  ],
  buyer: [
    {
      title: 'Track Active Deliveries',
      description: 'Real-time transit updates, assigned drivers, and arrival ETA',
      prompt: 'Where is my order and what is the current delivery status?',
      icon: <Truck size={17} className="text-sky-500" />,
    },
    {
      title: 'Escrow Protection Status',
      description: 'Verify held funds, payment safety, and inspection release steps',
      prompt: 'Has my escrow payment been received and how does release work?',
      icon: <ShieldCheck size={17} className="text-emerald-500" />,
    },
    {
      title: 'Report Quality Discrepancy',
      description: 'Draft a formal complaint if delivered produce is under-grade',
      prompt: "The delivery I received doesn't match the listing grade. How do I raise a dispute?",
      icon: <AlertTriangle size={17} className="text-amber-500" />,
    },
    {
      title: 'Commodity Price Benchmarks',
      description: 'Compare wholesale prices before placing high-volume crop orders',
      prompt: 'What are current recorded wholesale prices for maize and beans?',
      icon: <TrendingUp size={17} className="text-sky-500" />,
    },
  ],
  transporter: [
    {
      title: 'Current Assignment Status',
      description: 'View cargo pickup coordinates, route directions, and drop-off contact',
      prompt: "What's my current delivery assignment?",
      icon: <Truck size={17} className="text-purple-500" />,
    },
    {
      title: 'Itemized Payment Breakdown',
      description: 'See base fare, distance rate, deductions, and net wallet payout',
      prompt: 'Break down my itemized payment for this delivery trip.',
      icon: <Receipt size={17} className="text-emerald-500" />,
    },
    {
      title: 'Report Road or Trip Delay',
      description: 'Log mechanical issues, weather delays, or dispatch blockers',
      prompt: 'I have a delivery complaint or transit delay to raise.',
      icon: <AlertTriangle size={17} className="text-amber-500" />,
    },
    {
      title: 'Wallet Payouts & Escrow',
      description: 'Understand driver release conditions and withdrawal timelines',
      prompt: 'How do wallet payouts and escrow work for transporters?',
      icon: <DollarSign size={17} className="text-emerald-500" />,
    },
  ],
  agro_dealer: [
    {
      title: 'Active Product Listings',
      description: 'Check stock levels, catalog pricing, and farmer reach',
      prompt: "What's the status of my product listings?",
      icon: <ShoppingBag size={17} className="text-amber-500" />,
    },
    {
      title: 'Market Price Intelligence',
      description: 'Compare market rates for seeds, fertilizer, and agricultural inputs',
      prompt: 'What are current market prices for maize, fertilizer and seeds?',
      icon: <TrendingUp size={17} className="text-emerald-500" />,
    },
    {
      title: 'Buyer Order Fulfillment',
      description: 'Review pending orders and logistics dispatch for your supplies',
      prompt: 'Show my recent buyer input orders and fulfillment status.',
      icon: <FileText size={17} className="text-sky-500" />,
    },
    {
      title: 'Support & Escalations',
      description: 'Contact admin support regarding catalog approval or payments',
      prompt: 'I have a question or complaint regarding my supplier account.',
      icon: <HelpCircle size={17} className="text-purple-500" />,
    },
  ],
};

const ROLE_DISPLAY: Record<string, { label: string; badge: string }> = {
  farmer: { label: 'Farmer Copilot', badge: 'Farmer Portal' },
  buyer: { label: 'Procurement Copilot', badge: 'Buyer Portal' },
  transporter: { label: 'Logistics Copilot', badge: 'Transporter Portal' },
  agro_dealer: { label: 'Supplier Copilot', badge: 'Agro Supplier' },
};

function renderFormattedMessage(content: string) {
  const lines = content.split('\n');

  return (
    <div className="space-y-2.5 text-[14.5px] leading-[1.65]">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Check if line is a numbered step (e.g. "1. Step description")
        const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numberMatch) {
          const num = numberMatch[1];
          const rest = numberMatch[2];
          const parts = parseLineElements(rest);
          return (
            <div key={idx} className="flex items-start gap-2.5 my-1">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center mt-0.5">
                {num}
              </span>
              <div className="flex-1">{parts}</div>
            </div>
          );
        }

        // Check if line is a bullet point
        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('* ');
        const cleanLine = isBullet ? trimmed.replace(/^[•\-*]\s*/, '') : trimmed;

        // Check if line is a subheader (### or ##)
        const isSubhead = trimmed.startsWith('###') || trimmed.startsWith('##');
        if (isSubhead) {
          const subheadText = trimmed.replace(/^#+\s*/, '');
          return (
            <h4 key={idx} className="font-bold text-[15px] text-[var(--d-text)] mt-3 mb-1">
              {subheadText}
            </h4>
          );
        }

        const parts = parseLineElements(cleanLine);

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2.5 my-1 pl-1">
              <span className="text-emerald-600 dark:text-emerald-400 text-base leading-none mt-1 select-none flex-shrink-0">
                •
              </span>
              <div className="flex-1">{parts}</div>
            </div>
          );
        }

        return (
          <div key={idx} className="my-1">
            {parts}
          </div>
        );
      })}
    </div>
  );
}

function parseLineElements(text: string): React.ReactNode[] {
  const tokenRegex = /(\[Status:\s*[^\]]+\]|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|`[^`]+`)/g;
  const segments = text.split(tokenRegex);

  return segments.map((seg, i) => {
    if (!seg) return null;

    // Status Badge: [Status: delivered]
    if (seg.startsWith('[Status:') && seg.endsWith(']')) {
      const statusRaw = seg.slice(8, -1).trim().toLowerCase();
      let bg = 'rgba(156, 163, 175, 0.15)';
      let fg = '#9ca3af';
      const label = statusRaw.replace(/_/g, ' ');

      if (['delivered', 'completed', 'released', 'funded', 'active'].includes(statusRaw)) {
        bg = 'rgba(34, 197, 94, 0.16)';
        fg = '#22c55e';
      } else if (['in_transit', 'assigned', 'picked_up'].includes(statusRaw)) {
        bg = 'rgba(59, 130, 246, 0.16)';
        fg = '#3b82f6';
      } else if (['cancelled', 'disputed', 'rejected', 'failed'].includes(statusRaw)) {
        bg = 'rgba(239, 68, 68, 0.16)';
        fg = '#ef4444';
      } else if (['pending', 'awaiting_payment', 'notified'].includes(statusRaw)) {
        bg = 'rgba(245, 158, 11, 0.16)';
        fg = '#f59e0b';
      }

      return (
        <span
          key={i}
          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider mx-1 align-middle border border-current/20"
          style={{ background: bg, color: fg }}
        >
          {label}
        </span>
      );
    }

    // Markdown inline code: `code`
    if (seg.startsWith('`') && seg.endsWith('`') && seg.length > 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[13px] font-mono text-[var(--d-text)] mx-0.5"
        >
          {seg.slice(1, -1)}
        </code>
      );
    }

    // Markdown Link: [Text](url)
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
          className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 hover:underline mx-0.5"
        >
          <span>{linkText}</span>
          {isExternal && <ArrowUpRight size={12} className="opacity-80" />}
        </a>
      );
    }

    // Bold: **Text**
    if (seg.startsWith('**') && seg.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-[var(--d-text)]">
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
  const [lastPrompt, setLastPrompt] = useState('');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<number, 'up' | 'down'>>({});

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages or thinking state
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Dynamic textarea height expansion (ChatGPT signature behavior)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [draft]);

  // Click outside to close model info popover
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
    }
    if (showModelMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModelMenu]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    // Cancel any active speech
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
    }

    setError('');
    setLastPrompt(trimmed);
    const next = [...messages, { role: 'user' as const, content: trimmed }];
    setMessages(next);
    setDraft('');
    setSending(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

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
        signal: controller.signal,
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
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        // Request cancelled by user
        return;
      }
      setError('Connection interrupted. Please tap retry to send again.');
    } finally {
      setSending(false);
      abortControllerRef.current = null;
      // Refocus textarea
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }

  function handleStop() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setSending(false);
    }
  }

  function handleNewChat() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
    }
    setMessages([]);
    setDraft('');
    setError('');
    setLastPrompt('');
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function handleCopy(text: string, index: number) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedIdx(index);
      setTimeout(() => setCopiedIdx(null), 2000);
    }
  }

  function handleSpeak(text: string, index: number) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (speakingIdx === index) {
      window.speechSynthesis.cancel();
      setSpeakingIdx(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Clean text for clean acoustic playback
    const speechText = text
      .replace(/\[Status:[^\]]+\]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/[#*•\-_`]/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setSpeakingIdx(null);
    utterance.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(index);
    window.speechSynthesis.speak(utterance);
  }

  function handleFeedback(index: number, type: 'up' | 'down') {
    setFeedbackMap((prev) => ({
      ...prev,
      [index]: prev[index] === type ? (undefined as any) : type,
    }));
  }

  const promptCards = ROLE_PROMPT_CARDS[role] ?? ROLE_PROMPT_CARDS.farmer;
  const roleMeta = ROLE_DISPLAY[role] ?? { label: 'Cropify Copilot', badge: 'Verified Portal' };

  return (
    <div
      className="flex flex-col h-full w-full relative overflow-hidden rounded-2xl md:rounded-3xl border border-[var(--d-border)] bg-[var(--d-card)] shadow-lg"
      style={{ minHeight: '620px' }}
    >
      {/* ─── ChatGPT Top Navigation Bar ─── */}
      <div className="h-14 px-4 md:px-6 flex items-center justify-between border-b border-[var(--d-border)] bg-[var(--d-card)]/90 backdrop-blur-md z-30 flex-shrink-0">
        {/* Model Selector Pill (ChatGPT signature) */}
        <div className="relative" ref={modelMenuRef}>
          <button
            type="button"
            onClick={() => setShowModelMenu(!showModelMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-left group"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Sparkles size={14} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-[var(--d-text)] tracking-tight">Kilimo Copilot 4.0</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Agro-LLM
              </span>
              <ChevronDown
                size={14}
                className={`text-[var(--d-muted)] transition-transform duration-200 ${
                  showModelMenu ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {/* Model Popover Details */}
          {showModelMenu && (
            <div className="absolute left-0 top-full mt-2 w-80 p-4 rounded-2xl bg-[var(--d-card)] border border-[var(--d-border)] shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between pb-3 mb-3 border-b border-[var(--d-border)]">
                <div>
                  <p className="font-bold text-sm text-[var(--d-text)]">Kilimo 4.0 · Agro-Intelligence</p>
                  <p className="text-xs text-[var(--d-muted)]">Real-time Agricultural & Escrow Engine</p>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse mt-1" title="Operational" />
              </div>

              <div className="space-y-2.5 text-xs text-[var(--d-muted)] leading-relaxed">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                  <span>Real-time market commodity prices across East Africa</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                  <span>Live order escrow, payment milestones & dispute rules</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                  <span>Crop pathology, pest prevention & yield guidelines</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[var(--d-border)] flex items-center justify-between text-[11px]">
                <span className="text-[var(--d-muted)]">Role Mode:</span>
                <span className="font-semibold text-[var(--d-text)]">{roleMeta.badge}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {/* New Chat Reset Button */}
          <button
            type="button"
            onClick={handleNewChat}
            title="Start new conversation"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--d-border)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold text-[var(--d-text)] transition-colors cursor-pointer"
          >
            <SquarePen size={14} className="text-[var(--d-muted)]" />
            <span className="hidden sm:inline">New chat</span>
          </button>

          {/* In-App Support Ticket Desk */}
          <Link
            href={`/${role === 'agro_dealer' ? 'supplier' : role}/support`}
            title="Open Support Ticket"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--d-border)] bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition-colors cursor-pointer"
          >
            <MessageCircle size={14} />
            <span className="hidden sm:inline">Support</span>
          </Link>
        </div>
      </div>

      {/* ─── Main Chat Conversation Canvas ─── */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 scroll-smooth">
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
          {/* ── Empty Hero State (ChatGPT Welcome Experience) ── */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 md:py-10 text-center animate-in fade-in duration-300">
              {/* Emblem */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-600/15 to-transparent border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xl shadow-emerald-500/10 mb-4">
                <Sparkles size={28} />
              </div>

              {/* Greeting */}
              <h2 className="text-2xl md:text-3xl font-extrabold text-[var(--d-text)] tracking-tight mb-2">
                What can I help with today?
              </h2>
              <p className="text-sm text-[var(--d-muted)] max-w-md mb-6 leading-relaxed">
                I&apos;m <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Kilimo</strong>, your Cropify AI Copilot. Ask me about live commodity prices, escrow protection, transport logistics, and crop care.
              </p>

              {/* Context Tag */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-[var(--d-border)] text-xs text-[var(--d-muted)] mb-8 font-medium">
                <ShieldCheck size={13} className="text-emerald-500" />
                <span>Operating in {roleMeta.badge} context</span>
              </div>

              {/* 4 Interactive ChatGPT-style Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                {promptCards.map((card, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => send(card.prompt)}
                    className="group relative p-4 rounded-2xl border border-[var(--d-border)] bg-[var(--d-card)] hover:border-emerald-500/50 hover:bg-emerald-500/[0.03] transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 text-left shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-8 h-8 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                        {card.icon}
                      </div>
                      <ArrowUpRight
                        size={15}
                        className="text-[var(--d-muted)] opacity-0 group-hover:opacity-100 group-hover:text-emerald-500 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-[var(--d-text)] mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {card.title}
                      </h4>
                      <p className="text-xs text-[var(--d-muted)] leading-relaxed line-clamp-2">
                        {card.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Active Conversation Stream ── */}
          {messages.map((msg, idx) => {
            const isUser = msg.role === 'user';
            const isSpeaking = speakingIdx === idx;
            const isCopied = copiedIdx === idx;
            const feedback = feedbackMap[idx];

            return (
              <div
                key={idx}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full animate-in fade-in duration-200`}
              >
                {/* User Message Capsule */}
                {isUser ? (
                  <div className="max-w-[85%] md:max-w-[75%] rounded-3xl rounded-br-md px-5 py-3.5 bg-neutral-900 text-white dark:bg-neutral-800 dark:text-neutral-100 shadow-sm">
                    <p className="text-[14.5px] leading-relaxed whitespace-pre-wrap font-normal">
                      {msg.content}
                    </p>
                  </div>
                ) : (
                  /* Assistant Unboxed ChatGPT Message */
                  <div className="w-full flex items-start gap-3.5 group">
                    {/* Copilot Avatar */}
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ring-2 ring-emerald-500/20">
                      <Sparkles size={14} />
                    </div>

                    {/* Content & Action Footer */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-semibold text-xs text-[var(--d-text)]">Kilimo</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Copilot</span>
                      </div>

                      {/* Rendered Markdown Body */}
                      <div className="text-[var(--d-text)]">
                        {renderFormattedMessage(msg.content)}
                      </div>

                      {/* ChatGPT Micro-Action Toolbar */}
                      <div className="flex items-center gap-1.5 mt-3 pt-2 text-[var(--d-muted)]">
                        {/* Copy Button */}
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.content, idx)}
                          title="Copy response"
                          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--d-text)] transition-colors cursor-pointer flex items-center gap-1 text-xs"
                        >
                          {isCopied ? (
                            <>
                              <Check size={13} className="text-emerald-500" />
                              <span className="text-[11px] text-emerald-500 font-medium">Copied</span>
                            </>
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>

                        {/* Read Aloud (Browser Speech Synthesis) */}
                        <button
                          type="button"
                          onClick={() => handleSpeak(msg.content, idx)}
                          title={isSpeaking ? 'Stop reading aloud' : 'Read aloud'}
                          className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1 text-xs ${
                            isSpeaking ? 'text-emerald-500 bg-emerald-500/10' : 'hover:text-[var(--d-text)]'
                          }`}
                        >
                          {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
                        </button>

                        {/* Thumbs Up Rating */}
                        <button
                          type="button"
                          onClick={() => handleFeedback(idx, 'up')}
                          title="Good response"
                          className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-xs ${
                            feedback === 'up' ? 'text-emerald-500' : 'hover:text-[var(--d-text)]'
                          }`}
                        >
                          <ThumbsUp size={13} />
                        </button>

                        {/* Thumbs Down Rating */}
                        <button
                          type="button"
                          onClick={() => handleFeedback(idx, 'down')}
                          title="Poor response"
                          className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-xs ${
                            feedback === 'down' ? 'text-rose-500' : 'hover:text-[var(--d-text)]'
                          }`}
                        >
                          <ThumbsDown size={13} />
                        </button>

                        {/* Regenerate Button (if latest assistant message) */}
                        {idx === messages.length - 1 && !sending && lastPrompt && (
                          <button
                            type="button"
                            onClick={() => send(lastPrompt)}
                            title="Regenerate response"
                            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--d-text)] transition-colors cursor-pointer ml-1 text-xs flex items-center gap-1"
                          >
                            <RotateCcw size={12} />
                            <span className="text-[11px] hidden sm:inline">Regenerate</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Thinking / Generating State (ChatGPT Style) ── */}
          {sending && (
            <div className="flex items-start gap-3.5 w-full animate-in fade-in duration-200">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-sm animate-pulse ring-4 ring-emerald-500/20">
                <Sparkles size={14} />
              </div>
              <div className="flex-1 py-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-xs text-[var(--d-text)]">Kilimo</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Thinking</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--d-muted)]">
                  <span className="inline-flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                  <span className="text-xs">Consulting Cropify agricultural records…</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Error Banner ── */}
          {error && (
            <div className="w-full p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-between gap-3 text-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertCircle size={17} className="flex-shrink-0 text-rose-500" />
                <span className="truncate">{error}</span>
              </div>
              {lastPrompt && (
                <button
                  type="button"
                  onClick={() => send(lastPrompt)}
                  disabled={sending}
                  className="px-3 py-1 rounded-lg border border-rose-500/40 hover:bg-rose-500/10 text-xs font-bold transition-colors cursor-pointer flex-shrink-0"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          <div ref={bottomRef} className="h-2" />
        </div>
      </div>

      {/* ─── ChatGPT Floating Pill Input Bar ─── */}
      <div className="p-3 md:p-4 bg-gradient-to-t from-[var(--d-card)] via-[var(--d-card)] to-transparent z-20 flex-shrink-0">
        <div className="max-w-3xl mx-auto w-full space-y-2">
          {/* Quick prompt chips above input when in conversation */}
          {messages.length > 0 && !sending && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
              {promptCards.map((card, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => send(card.prompt)}
                  className="flex-shrink-0 px-3 py-1 rounded-full border border-[var(--d-border)] bg-[var(--d-card)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--d-muted)] hover:text-[var(--d-text)] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{card.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* The Iconic ChatGPT Capsule Container */}
          <div className="relative flex flex-col rounded-2xl md:rounded-3xl border border-[var(--d-border)] bg-[var(--d-input-bg)] shadow-xl transition-all duration-200 focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-500/60 p-2 md:p-2.5">
            <textarea
              ref={textareaRef}
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (draft.trim() && !sending) {
                    send(draft);
                  }
                }
              }}
              placeholder={`Message Kilimo (${roleMeta.badge})…`}
              disabled={sending}
              className="w-full bg-transparent text-[var(--d-text)] placeholder-[var(--d-muted)] text-[14.5px] leading-relaxed resize-none outline-none px-2.5 py-1.5 max-h-40 min-h-[40px]"
            />

            {/* Bottom Actions Row Inside Capsule */}
            <div className="flex items-center justify-between pt-1 px-1">
              {/* Left Context Chip */}
              <div className="flex items-center gap-1.5 text-xs text-[var(--d-muted)]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 text-[11px] font-medium">
                  <Info size={11} className="text-emerald-500" />
                  <span>Enter to send · Shift+Enter for newline</span>
                </span>
              </div>

              {/* Right Send / Stop Action Button */}
              {sending ? (
                <button
                  type="button"
                  onClick={handleStop}
                  title="Stop generating"
                  className="w-8 h-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center hover:opacity-85 transition-opacity cursor-pointer shadow-sm flex-shrink-0"
                >
                  <Square size={12} fill="currentColor" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => send(draft)}
                  disabled={!draft.trim()}
                  title="Send message"
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 flex-shrink-0 cursor-pointer ${
                    draft.trim()
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-md hover:scale-105 active:scale-95'
                      : 'bg-black/10 dark:bg-white/10 text-[var(--d-muted)] opacity-50 cursor-not-allowed'
                  }`}
                >
                  <ArrowUp size={16} strokeWidth={2.5} />
                </button>
              )}
            </div>
          </div>

          {/* ChatGPT Disclaimer Caption */}
          <p className="text-[11px] text-center text-[var(--d-muted)] select-none px-4">
            Kilimo can make mistakes. Verify agricultural recommendations, market prices, and contract decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
