'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Send,
  Check,
  CheckCheck,
  Palette,
  Package,
  ClipboardList,
  X,
  Leaf,
  Users,
  Sparkles,
  RotateCcw,
  Crown,
  ShieldCheck,
} from 'lucide-react';

const LISTING_CROPS = [
  'maize',
  'beans',
  'coffee',
  'rice',
  'banana',
  'cassava',
  'tomato',
  'sorghum',
  'groundnuts',
  'cotton',
];
const LISTING_PREFIX = '📦 LISTING · ';

// Preset Themes for Group Chat
const CHAT_THEMES = [
  {
    id: 'forest',
    name: 'Forest Green',
    gradient: 'linear-gradient(135deg, #15803D 0%, #064E3B 100%)',
    bubbleOwn: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
    shadow: 'rgba(22, 163, 74, 0.35)',
    accent: '#16A34A',
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    gradient: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
    bubbleOwn: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
    shadow: 'rgba(14, 165, 233, 0.35)',
    accent: '#0EA5E9',
  },
  {
    id: 'harvest',
    name: 'Warm Harvest',
    gradient: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
    bubbleOwn: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    shadow: 'rgba(245, 158, 11, 0.35)',
    accent: '#F59E0B',
  },
  {
    id: 'violet',
    name: 'Royal Plum',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
    bubbleOwn: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    shadow: 'rgba(139, 92, 246, 0.35)',
    accent: '#8B5CF6',
  },
] as const;
type ChatTheme = typeof CHAT_THEMES[number];
const THEME_STORAGE_KEY = 'cropify-group-chat-theme';

const WALLPAPER_SVG = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <g fill="#16A34A" fill-opacity="0.045">
    <path d="M24 14c6 0 10 4 10 10s-4 10-10 10-10-4-10-10 4-10 10-10zm0 4c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6z"/>
    <circle cx="92" cy="20" r="2.5"/>
    <circle cx="99" cy="26" r="2.5"/>
    <circle cx="92" cy="32" r="2.5"/>
    <path d="M118 50c4-4 10-4 14 0s4 10 0 14-10 4-14 0 4-10 0-14z"/>
    <path d="M20 78c0-10 6-16 16-16 0 10-6 16-16 16zm0 0c0-10-6-16-16-16 0 10 6 16 16 16z"/>
    <path d="M70 100c5.5 0 10 4.5 10 10s-4.5 10-10 10-10-4.5-10-10 4.5-10 10-10zm0 3.6c-3.5 0-6.4 2.9-6.4 6.4s2.9 6.4 6.4 6.4 6.4-2.9 6.4-6.4-2.9-6.4-6.4-6.4z"/>
    <path d="M132 96c0-8 5-13 13-13 0 8-5 13-13 13zm0 0c0-8-5-13-13-13 0 8 5 13 13 13z"/>
    <circle cx="45" cy="135" r="2.5"/>
    <circle cx="52" cy="141" r="2.5"/>
    <circle cx="45" cy="147" r="2.5"/>
    <path d="M110 132c5 0 9 4 9 9s-4 9-9 9-9-4-9-9 4-9 9-9zm0 3.2c-3.2 0-5.8 2.6-5.8 5.8s2.6 5.8 5.8 5.8 5.8-2.6 5.8-5.8-2.6-5.8-5.8-5.8z"/>
  </g>
</svg>`)}`;

export interface Message {
  id: string;
  admin_id: string;
  sender_id: string;
  sender_name: string | null;
  body: string;
  created_at: string;
  failed?: boolean;
}

interface Props {
  adminId: string;
  currentUserId: string;
  currentUserName: string;
  memberCount: number;
  initialMessages?: Message[];
}

// Deterministic pastel avatar background colors
const AVATAR_COLORS = [
  { bg: '#15803D', text: '#FFFFFF' },
  { bg: '#0284C7', text: '#FFFFFF' },
  { bg: '#7C3AED', text: '#FFFFFF' },
  { bg: '#D97706', text: '#FFFFFF' },
  { bg: '#0D9488', text: '#FFFFFF' },
  { bg: '#E11D48', text: '#FFFFFF' },
  { bg: '#4F46E5', text: '#FFFFFF' },
];

function getAvatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < (name || 'M').length; i++) h = (h + (name || 'M').charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

function shortTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

function dateSeparatorLabel(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return 'Recent';
  }
}

export function GroupChatClient({
  adminId,
  currentUserId,
  currentUserName,
  memberCount,
  initialMessages = [],
}: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(initialMessages.length === 0);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ChatTheme>(CHAT_THEMES[0]);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [listingOpen, setListingOpen] = useState(false);
  const [listingCrop, setListingCrop] = useState('');
  const [listingQty, setListingQty] = useState('');
  const [listingNotes, setListingNotes] = useState('');
  const [listingSending, setListingSending] = useState(false);
  const [listingError, setListingError] = useState('');
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isAdmin = currentUserId === adminId;

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const match = CHAT_THEMES.find((t) => t.id === saved);
    if (match) setTheme(match);
  }, []);

  function pickTheme(t: ChatTheme) {
    setTheme(t);
    setThemePickerOpen(false);
    localStorage.setItem(THEME_STORAGE_KEY, t.id);
  }

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  const autoGrow = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  // Fetch latest messages from API/Supabase
  const fetchMessages = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error: fetchErr } = await (supabase.from as any)('group_messages')
        .select('id, admin_id, sender_id, sender_name, body, created_at')
        .eq('admin_id', adminId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (fetchErr) {
        console.warn('[GroupChat] Polling fetch notice:', fetchErr);
        return false;
      }

      setMessages((prev) => {
        const pendingMap = new Map(
          prev.filter((m) => m.id.startsWith('temp_') || m.failed).map((m) => [m.id, m])
        );
        const merged = [...(data ?? [])];
        for (const pending of pendingMap.values()) {
          // Only re-append if not already in data by body and recent timestamp
          if (!merged.some((m) => m.body === pending.body && Math.abs(new Date(m.created_at).getTime() - new Date(pending.created_at).getTime()) < 30000)) {
            merged.push(pending);
          }
        }
        return merged;
      });
      return true;
    } catch {
      return false;
    }
  }, [adminId, supabase]);

  // Initial load if no server initialMessages were provided
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setLoading(false);
      setTimeout(() => scrollToBottom(false), 50);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    (async () => {
      const ok = await fetchMessages();
      if (!cancelled) {
        setLoadError(!ok);
        setLoading(false);
        setTimeout(() => scrollToBottom(false), 50);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adminId, fetchMessages, initialMessages, scrollToBottom]);

  // Real-time listener
  useEffect(() => {
    let closedByEffect = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const connect = () => {
      channel = supabase
        .channel(`group_chat_room:${adminId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'group_messages',
            filter: `admin_id=eq.${adminId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              // If replacing a temp optimistic message
              const filtered = prev.filter(
                (m) =>
                  !(
                    m.id.startsWith('temp_') &&
                    m.sender_id === newMsg.sender_id &&
                    m.body === newMsg.body
                  )
              );
              return [...filtered, newMsg];
            });
            setTimeout(() => scrollToBottom(true), 60);
          }
        )
        .subscribe((status) => {
          if (closedByEffect) return;
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (channel) supabase.removeChannel(channel);
            setTimeout(() => {
              if (!closedByEffect) connect();
            }, 3000);
          }
        });
    };

    connect();

    const pollId = setInterval(() => {
      fetchMessages();
    }, 12000);

    const onOnline = () => fetchMessages();
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchMessages();
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      closedByEffect = true;
      clearInterval(pollId);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      if (channel) supabase.removeChannel(channel);
    };
  }, [adminId, fetchMessages, scrollToBottom, supabase]);

  const sendMessage = async (retryText?: string, retryTempId?: string) => {
    const text = (retryText || draft).trim();
    if (!text || (sending && !retryText)) return;

    if (!retryText) {
      setSending(true);
      setDraft('');
      if (inputRef.current) inputRef.current.style.height = '44px';
    }
    setError(null);

    const tempId = retryTempId || `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const optimistic: Message = {
      id: tempId,
      admin_id: adminId,
      sender_id: currentUserId,
      sender_name: currentUserName,
      body: text,
      created_at: new Date().toISOString(),
      failed: false,
    };

    if (!retryTempId) {
      setMessages((prev) => [...prev, optimistic]);
      setTimeout(() => scrollToBottom(true), 50);
    } else {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, failed: false } : m))
      );
    }

    try {
      // 1. Primary path: Server route with service role reliability and push notifications
      const res = await fetch('/api/groups/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, body: text }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success && json.message) {
        const confirmed: Message = json.message;
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? confirmed : m))
        );
      } else {
        // 2. Fallback: Direct client supabase insert
        const { data: directData, error: directErr } = await (supabase.from as any)('group_messages')
          .insert({
            admin_id: adminId,
            sender_id: currentUserId,
            sender_name: currentUserName,
            body: text,
          })
          .select('id, admin_id, sender_id, sender_name, body, created_at')
          .single();

        if (!directErr && directData) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? directData : m))
          );
        } else {
          throw new Error(json.error || directErr?.message || 'Failed to deliver message');
        }
      }
    } catch (err: any) {
      console.error('[GroupChat] Send failed:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, failed: true } : m))
      );
      setError('Message failed to send. Tap the retry icon on the message.');
    } finally {
      if (!retryText) setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendListing = async () => {
    if (!listingCrop) {
      setListingError('Select a crop');
      return;
    }
    if (!listingQty || Number(listingQty) <= 0) {
      setListingError('Enter a valid quantity in kg');
      return;
    }
    setListingSending(true);
    setListingError('');

    try {
      const res = await fetch('/api/groups/chat-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId,
          cropType: listingCrop,
          quantityKg: Number(listingQty),
          notes: listingNotes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setListingError(json.error || 'Failed to send listing');
        return;
      }
      if (json.message) {
        setMessages((prev) =>
          prev.some((m) => m.id === json.message.id) ? prev : [...prev, json.message]
        );
      }
      setTimeout(() => scrollToBottom(true), 60);
      setListingCrop('');
      setListingQty('');
      setListingNotes('');
      setListingOpen(false);
    } catch {
      setListingError('Failed to send listing. Please verify connection.');
    } finally {
      setListingSending(false);
    }
  };

  // Group messages by date for separators
  const grouped: Array<{ date: string; msgs: Message[] }> = [];
  for (const msg of messages) {
    const dateKey = new Date(msg.created_at).toDateString();
    const last = grouped[grouped.length - 1];
    if (last && last.date === dateKey) last.msgs.push(msg);
    else grouped.push({ date: dateKey, msgs: [msg] });
  }

  const canSend = !!draft.trim() && !sending;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 150px)',
        minHeight: 520,
        borderRadius: 20,
        overflow: 'hidden',
        background: 'var(--d-card)',
        border: '1px solid var(--d-border)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* ── Modern Header ── */}
      <div
        style={{
          padding: '14px 18px',
          flexShrink: 0,
          borderBottom: '1px solid var(--d-border)',
          background: 'var(--d-card)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: theme.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${theme.shadow}`,
            }}
          >
            <Users size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: 'var(--d-text)',
                  margin: 0,
                  letterSpacing: '-0.02em',
                }}
              >
                Group Community Chat
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'rgba(34, 197, 94, 0.12)',
                  color: '#16A34A',
                  border: '1px solid rgba(34, 197, 94, 0.25)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#22C55E',
                    boxShadow: '0 0 6px #22C55E',
                  }}
                />
                Live
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: 'var(--d-muted)', margin: '2px 0 0' }}>
              {memberCount} verified member{memberCount === 1 ? '' : 's'} · Instant broadcasts
            </p>
          </div>
        </div>

        {/* Header Tools */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          {isAdmin && (
            <button
              onClick={() => setOrganizeOpen(true)}
              aria-label="Organize Group Crop Listings"
              title="Organize Group Crop Listings"
              style={{
                height: 36,
                padding: '0 12px',
                borderRadius: 10,
                border: '1px solid var(--d-border)',
                cursor: 'pointer',
                background: 'var(--color-surface-2)',
                color: 'var(--d-text)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <ClipboardList size={15} color={theme.accent} />
              <span className="hidden sm:inline">Group Listings</span>
            </button>
          )}

          <button
            onClick={() => setThemePickerOpen((v) => !v)}
            aria-label="Customize Theme"
            title="Customize Theme"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: '1px solid var(--d-border)',
              cursor: 'pointer',
              background: 'var(--color-surface-2)',
              color: theme.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Palette size={16} />
          </button>

          {themePickerOpen && (
            <>
              <div
                onClick={() => setThemePickerOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 19 }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 42,
                  right: 0,
                  zIndex: 20,
                  background: 'var(--d-card)',
                  borderRadius: 14,
                  padding: 10,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2), 0 0 0 1px var(--d-border)',
                  display: 'flex',
                  gap: 10,
                }}
              >
                {CHAT_THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => pickTheme(t)}
                    title={t.name}
                    aria-label={`${t.name} theme`}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      background: t.gradient,
                      border: theme.id === t.id ? '2.5px solid var(--d-text)' : '2.5px solid transparent',
                      boxShadow: `0 2px 8px ${t.shadow}`,
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Message Stream ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          background: 'var(--d-input-bg, var(--color-bg))',
          backgroundImage: `url("${WALLPAPER_SVG}")`,
          backgroundSize: '80px 80px',
        }}
      >
        {/* Skeleton loading when waiting for first load */}
        {loading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              paddingTop: 8,
            }}
          >
            {[
              { w: '48%', own: false, h: 48 },
              { w: '40%', own: true, h: 44 },
              { w: '64%', own: false, h: 56 },
              { w: '35%', own: true, h: 42 },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: s.own ? 'row-reverse' : 'row',
                  gap: 8,
                  alignItems: 'flex-end',
                }}
              >
                {!s.own && (
                  <div
                    className="dash-skeleton"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      flexShrink: 0,
                    }}
                  />
                )}
                <div
                  className="dash-skeleton"
                  style={{
                    width: s.w,
                    height: s.h,
                    borderRadius: s.own
                      ? '16px 16px 4px 16px'
                      : '16px 16px 16px 4px',
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Failed to load notice */}
        {!loading && loadError && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--d-text)', marginBottom: 6 }}>
              Couldn't connect to group stream
            </p>
            <p style={{ fontSize: 13, color: 'var(--d-muted)', maxWidth: 280, lineHeight: 1.5, marginBottom: 14 }}>
              Your messages are safely stored. Reconnect to refresh the room.
            </p>
            <button
              onClick={() => {
                setLoading(true);
                setLoadError(false);
                fetchMessages().then((ok) => {
                  setLoadError(!ok);
                  setLoading(false);
                });
              }}
              style={{
                padding: '9px 18px',
                borderRadius: 10,
                border: 'none',
                background: 'var(--color-primary)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !loadError && messages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 18,
                marginBottom: 14,
                background: 'var(--color-primary-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={28} color="var(--color-primary)" />
            </div>
            <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--d-text)', marginBottom: 4 }}>
              Welcome to the Group Chat!
            </p>
            <p style={{ fontSize: 12.5, color: 'var(--d-muted)', maxWidth: 280, lineHeight: 1.5 }}>
              Send updates, ask questions, or share crop lots for combined collective sales.
            </p>
          </div>
        )}

        {/* Message Groups */}
        {grouped.map(({ date, msgs }) => (
          <div key={date}>
            {/* Date Pill Separator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 8px' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--d-border)' }} />
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: 'var(--d-muted)',
                  letterSpacing: '0.04em',
                  padding: '3px 12px',
                  borderRadius: 999,
                  background: 'var(--d-card)',
                  border: '1px solid var(--d-border)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                {dateSeparatorLabel(msgs[0].created_at)}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--d-border)' }} />
            </div>

            {/* Message Bubbles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {msgs.map((msg) => {
                const isOwn = msg.sender_id === currentUserId;
                const isSenderAdmin = msg.sender_id === adminId;
                const name = msg.sender_name ?? 'Member';
                const avatar = getAvatarColor(name);
                const isListing = msg.body.startsWith(LISTING_PREFIX);
                const isPending = msg.id.startsWith('temp_');
                const isFailed = !!msg.failed;

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
                    {/* Others Avatar */}
                    {!isOwn && (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          flexShrink: 0,
                          background: avatar.bg,
                          color: avatar.text,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 800,
                          boxShadow: `0 2px 8px ${avatar.bg}44`,
                        }}
                      >
                        {(name[0] || 'M').toUpperCase()}
                      </div>
                    )}

                    <div style={{ maxWidth: '78%', position: 'relative' }}>
                      {/* Sender Name & Role Label for Others */}
                      {!isOwn && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            marginBottom: 3,
                            marginLeft: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: avatar.bg,
                            }}
                          >
                            {name}
                          </span>
                          {isSenderAdmin && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 2,
                                fontSize: 9.5,
                                fontWeight: 800,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background: 'rgba(234, 179, 8, 0.15)',
                                color: '#CA8A04',
                                border: '1px solid rgba(234, 179, 8, 0.3)',
                              }}
                            >
                              <Crown size={10} /> Lead
                            </span>
                          )}
                        </div>
                      )}

                      {/* Bubble Surface */}
                      <div
                        style={{
                          padding: isListing ? '12px 14px' : '10px 14px',
                          borderRadius: isOwn
                            ? '18px 18px 4px 18px'
                            : '18px 18px 18px 4px',
                          background: isListing
                            ? 'var(--color-surface, var(--d-card))'
                            : isOwn
                            ? theme.bubbleOwn
                            : 'var(--d-card)',
                          color: isListing
                            ? 'var(--d-text)'
                            : isOwn
                            ? '#FFFFFF'
                            : 'var(--d-text)',
                          border: isListing
                            ? '1.5px solid #16A34A'
                            : isOwn
                            ? 'none'
                            : '1px solid var(--d-border)',
                          boxShadow: isOwn
                            ? `0 4px 14px ${theme.shadow}`
                            : '0 2px 8px rgba(0,0,0,0.06)',
                          opacity: isPending ? 0.75 : 1,
                        }}
                      >
                        {/* Rich Crop Listing Render */}
                        {isListing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 6,
                                  background: 'rgba(22, 163, 74, 0.15)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Leaf size={14} color="#16A34A" />
                              </div>
                              <span
                                style={{
                                  fontSize: 12.5,
                                  fontWeight: 800,
                                  color: '#16A34A',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.03em',
                                }}
                              >
                                Member Crop Lot
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: 13.5,
                                fontWeight: 700,
                                color: 'var(--d-text)',
                                margin: 0,
                              }}
                            >
                              {msg.body.slice(LISTING_PREFIX.length)}
                            </p>
                          </div>
                        ) : (
                          <p
                            style={{
                              fontSize: 13.5,
                              lineHeight: 1.5,
                              margin: 0,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {msg.body}
                          </p>
                        )}

                        {/* Status Footer */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              color: isOwn
                                ? 'rgba(255,255,255,0.75)'
                                : 'var(--d-muted)',
                            }}
                          >
                            {isPending
                              ? 'Sending…'
                              : isFailed
                              ? 'Failed'
                              : shortTime(msg.created_at)}
                          </span>

                          {isOwn && !isFailed && !isPending && (
                            <CheckCheck size={13} color="rgba(255,255,255,0.9)" />
                          )}
                          {isOwn && isPending && (
                            <Check size={13} color="rgba(255,255,255,0.6)" />
                          )}
                          {isFailed && (
                            <button
                              onClick={() => sendMessage(msg.body, msg.id)}
                              title="Tap to retry"
                              style={{
                                border: 'none',
                                background: 'transparent',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                color: '#EF4444',
                              }}
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div
          style={{
            padding: '8px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderTop: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <p style={{ fontSize: 12, color: '#EF4444', margin: 0, fontWeight: 600 }}>{error}</p>
          <button
            onClick={() => setError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#EF4444',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Modern Input Toolbar ── */}
      <div
        style={{
          padding: '12px 14px',
          flexShrink: 0,
          borderTop: '1px solid var(--d-border)',
          background: 'var(--d-card)',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
        }}
      >
        {/* Post Crop Listing Button */}
        <button
          onClick={() => setListingOpen(true)}
          aria-label="Post Group Crop Listing"
          title="Post Group Crop Listing"
          style={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: 12,
            border: '1px solid var(--d-border)',
            cursor: 'pointer',
            background: 'var(--color-surface-2)',
            color: '#16A34A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.15s ease',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Package size={20} />
        </button>

        {/* Textarea */}
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              autoGrow();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type your message to the group (Enter to send)..."
            rows={1}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              resize: 'none',
              outline: 'none',
              border: `1.5px solid ${draft ? theme.accent : 'var(--d-border)'}`,
              borderRadius: 14,
              padding: '11px 14px',
              fontSize: 13.5,
              fontFamily: 'inherit',
              color: 'var(--d-text)',
              background: 'var(--d-input-bg, var(--color-surface))',
              minHeight: 44,
              maxHeight: 120,
              lineHeight: 1.45,
              transition: 'border-color 0.15s',
            }}
            maxLength={3000}
            disabled={sending}
          />
          {draft.length > 2500 && (
            <span
              style={{
                position: 'absolute',
                right: 10,
                bottom: 8,
                fontSize: 9.5,
                fontWeight: 700,
                color: draft.length > 2900 ? '#EF4444' : 'var(--d-muted)',
              }}
            >
              {3000 - draft.length}
            </span>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={() => sendMessage()}
          disabled={!canSend}
          aria-label="Send Message"
          style={{
            width: 44,
            height: 44,
            flexShrink: 0,
            borderRadius: 12,
            border: 'none',
            cursor: canSend ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: canSend ? theme.gradient : 'var(--color-surface-2)',
            color: canSend ? '#FFFFFF' : 'var(--d-muted)',
            boxShadow: canSend ? `0 4px 14px ${theme.shadow}` : 'none',
            transition: 'all 0.18s ease',
          }}
        >
          {sending ? (
            <div
              className="animate-spin"
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#FFFFFF',
              }}
            />
          ) : (
            <Send size={18} strokeWidth={2.3} />
          )}
        </button>
      </div>

      {/* Listing Modal */}
      {listingOpen && (
        <SendListingModal
          crop={listingCrop}
          setCrop={setListingCrop}
          qty={listingQty}
          setQty={setListingQty}
          notes={listingNotes}
          setNotes={setListingNotes}
          sending={listingSending}
          error={listingError}
          onSend={sendListing}
          onClose={() => {
            setListingOpen(false);
            setListingError('');
          }}
        />
      )}

      {/* Organize Panel Modal for Admin */}
      {organizeOpen && <OrganizePanel onClose={() => setOrganizeOpen(false)} />}
    </div>
  );
}

function SendListingModal({
  crop,
  setCrop,
  qty,
  setQty,
  notes,
  setNotes,
  sending,
  error,
  onSend,
  onClose,
}: {
  crop: string;
  setCrop: (v: string) => void;
  qty: string;
  setQty: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  sending: boolean;
  error: string;
  onSend: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--d-card)',
          borderRadius: 20,
          padding: 22,
          width: '100%',
          maxWidth: 400,
          border: '1px solid var(--d-border)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(22, 163, 74, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={18} color="#16A34A" />
            </div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--d-text)' }}>
              Post Crop Lot
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--d-muted)',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 12.5, color: 'var(--d-muted)', margin: '0 0 16px', lineHeight: 1.45 }}>
          Share your harvest quantity with the group leader for bulk collective marketplace aggregation.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--d-text)', display: 'block', marginBottom: 5 }}>
              Crop Type
            </label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--d-border)',
                fontSize: 13,
                background: 'var(--d-input-bg)',
                color: 'var(--d-input-text)',
                outline: 'none',
              }}
            >
              <option value="">Select crop…</option>
              {LISTING_CROPS.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--d-text)', display: 'block', marginBottom: 5 }}>
              Available Quantity (KG)
            </label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="e.g. 500"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--d-border)',
                fontSize: 13,
                background: 'var(--d-input-bg)',
                color: 'var(--d-input-text)',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--d-text)', display: 'block', marginBottom: 5 }}>
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Ready for pickup this weekend"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--d-border)',
                fontSize: 13,
                resize: 'none',
                fontFamily: 'inherit',
                background: 'var(--d-input-bg)',
                color: 'var(--d-input-text)',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: 12, color: '#EF4444', fontWeight: 600 }}>{error}</p>
          )}

          <button
            onClick={onSend}
            disabled={sending}
            style={{
              padding: '12px',
              borderRadius: 12,
              border: 'none',
              background: '#16A34A',
              color: '#FFFFFF',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
              opacity: sending ? 0.7 : 1,
            }}
          >
            {sending ? 'Broadcasting…' : 'Publish Crop Lot to Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface Cluster {
  cropType: string;
  totalKg: number;
  memberCount: number;
  listings: any[];
}

function OrganizePanel({ onClose }: { onClose: () => void }) {
  const [clusters, setClusters] = useState<Cluster[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/groups/chat-listings/organize');
      const json = await res.json();
      if (json.error) {
        setError(json.error);
        return;
      }
      setClusters(json.clusters);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function publish(cropType: string) {
    const price = priceInput[cropType];
    if (!price || Number(price) <= 0) {
      setError('Enter a valid asking price per kg in UGX');
      return;
    }
    setPublishing(cropType);
    setError('');
    try {
      const res = await fetch('/api/groups/chat-listings/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cropType, askingPrice: Number(price) }),
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error);
        return;
      }
      load();
    } finally {
      setPublishing(null);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--d-card)',
          borderRadius: 20,
          padding: 22,
          width: '100%',
          maxWidth: 480,
          maxHeight: '80vh',
          overflowY: 'auto',
          border: '1px solid var(--d-border)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={18} color="#16A34A" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--d-text)' }}>
              Group Crop Aggregations
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--d-muted)',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 12.5, color: 'var(--d-muted)', margin: '0 0 16px', lineHeight: 1.45 }}>
          Member lots shared in chat grouped by crop type. Aggregate into a bulk listing to sell collectively.
        </p>

        {error && (
          <p style={{ fontSize: 12, color: '#EF4444', margin: '0 0 10px', fontWeight: 600 }}>
            {error}
          </p>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--d-muted)' }}>
            Loading group lots…
          </div>
        ) : !clusters || clusters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--d-muted)' }}>
            No pending crop lots posted yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {clusters.map((c) => (
              <div
                key={c.cropType}
                style={{
                  border: '1px solid var(--d-border)',
                  borderRadius: 14,
                  padding: 14,
                  background: 'var(--color-surface-2)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 10,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 800,
                      color: 'var(--d-text)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {c.cropType}
                  </p>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#16A34A',
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: 'rgba(22, 163, 74, 0.12)',
                    }}
                  >
                    {c.totalKg.toLocaleString()} KG · {c.memberCount} member
                    {c.memberCount === 1 ? '' : 's'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    min="1"
                    value={priceInput[c.cropType] ?? ''}
                    onChange={(e) =>
                      setPriceInput((prev) => ({ ...prev, [c.cropType]: e.target.value }))
                    }
                    placeholder="Asking price/KG (UGX)"
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      borderRadius: 10,
                      border: '1px solid var(--d-border)',
                      fontSize: 12.5,
                      background: 'var(--d-card)',
                      color: 'var(--d-text)',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                  <button
                    disabled={publishing === c.cropType}
                    onClick={() => publish(c.cropType)}
                    style={{
                      padding: '9px 16px',
                      borderRadius: 10,
                      border: 'none',
                      background: '#16A34A',
                      color: '#FFFFFF',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      opacity: publishing === c.cropType ? 0.7 : 1,
                    }}
                  >
                    {publishing === c.cropType ? 'Publishing…' : 'Publish Lot'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
