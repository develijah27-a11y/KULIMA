'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Send, Check, CheckCheck, Palette, Package, ClipboardList, X, Leaf } from 'lucide-react';

const LISTING_CROPS = ['maize','beans','coffee','rice','banana','cassava','tomato','sorghum','groundnuts','cotton'];
const LISTING_PREFIX = '📦 LISTING · ';

// Chat theme presets — each is just a bubble gradient + accent color, so
// switching is instant and never touches message data. Persisted per
// device (localStorage) rather than per-group, matching how a real chat
// app's theme is a personal display preference, not shared state.
const CHAT_THEMES = [
  { id: 'forest', name: 'Forest', gradient: 'linear-gradient(135deg, #1A7A43 0%, #0C3D22 100%)', shadow: 'rgba(12,61,34,0.45)', accent: '#1A7A43' },
  { id: 'ocean',  name: 'Ocean',  gradient: 'linear-gradient(135deg, #0EA5E9 0%, #075985 100%)', shadow: 'rgba(7,89,133,0.45)',  accent: '#0EA5E9' },
  { id: 'sunset', name: 'Sunset', gradient: 'linear-gradient(135deg, #F59E0B 0%, #9A3412 100%)', shadow: 'rgba(154,52,18,0.45)', accent: '#F59E0B' },
  { id: 'plum',   name: 'Plum',   gradient: 'linear-gradient(135deg, #A78BFA 0%, #5B21B6 100%)', shadow: 'rgba(91,33,182,0.45)', accent: '#A78BFA' },
] as const;
type ChatTheme = typeof CHAT_THEMES[number];
const THEME_STORAGE_KEY = 'cropify-group-chat-theme';

// WhatsApp-style wallpaper — a faint repeating agri-themed doodle (leaves,
// sprouts, seed pods) instead of a flat color, encoded inline so it needs
// no external asset request. A fixed tint rather than currentColor: this
// renders as a CSS background-image data URI, which has no DOM context to
// inherit color from, so currentColor would always resolve to the SVG's
// own default (black) regardless of light/dark mode. Kept low-opacity so
// it reads as texture, never competes with bubbles.
const WALLPAPER_SVG = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <g fill="#4ADE80" fill-opacity="0.07">
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

// Time-only, no date prefix — sits inline inside the bubble now, and the
// date separators already give date context, so repeating "Yesterday ·"
// on every bubble like the old below-bubble label did would be redundant.
function shortTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit', hour12: true });
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
  const [theme, setTheme]       = useState<ChatTheme>(CHAT_THEMES[0]);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [listingOpen, setListingOpen] = useState(false);
  const [listingCrop, setListingCrop] = useState('');
  const [listingQty, setListingQty]   = useState('');
  const [listingNotes, setListingNotes] = useState('');
  const [listingSending, setListingSending] = useState(false);
  const [listingError, setListingError] = useState('');
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLTextAreaElement>(null);
  const isAdmin                 = currentUserId === adminId;

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const match = CHAT_THEMES.find(t => t.id === saved);
    if (match) setTheme(match);
  }, []);

  function pickTheme(t: ChatTheme) {
    setTheme(t);
    setThemePickerOpen(false);
    localStorage.setItem(THEME_STORAGE_KEY, t.id);
  }

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
      // Best-effort — the message itself already sent regardless of whether
      // this succeeds. Realtime only reaches whoever already has this exact
      // chat screen open; this is what tells everyone else a message
      // actually arrived.
      fetch('/api/groups/notify-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, senderName: currentUserName, body: text }),
      }).catch(() => {});
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

  const sendListing = async () => {
    if (!listingCrop) { setListingError('Select a crop'); return; }
    if (!listingQty || Number(listingQty) <= 0) { setListingError('Enter a valid quantity'); return; }
    setListingSending(true);
    setListingError('');
    try {
      const res = await fetch('/api/groups/chat-listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, cropType: listingCrop, quantityKg: Number(listingQty), notes: listingNotes || undefined }),
      });
      const json = await res.json();
      if (json.error) { setListingError(json.error); return; }
      setMessages(prev => (prev.find(m => m.id === json.message.id) ? prev : [...prev, json.message]));
      setTimeout(scrollToBottom, 60);
      setListingCrop(''); setListingQty(''); setListingNotes(''); setListingOpen(false);
    } catch {
      setListingError('Failed to send listing. Please try again.');
    } finally {
      setListingSending(false);
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e99' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-success)' }}>Live</span>
          </div>
          {isAdmin && (
            <button
              onClick={() => setOrganizeOpen(true)}
              aria-label="Sort listings by crop"
              title="Sort listings by crop"
              style={{
                width: 30, height: 30, borderRadius: 9, border: 'none', cursor: 'pointer',
                background: 'var(--color-surface-2)', color: theme.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <ClipboardList size={15} />
            </button>
          )}
          <button
            onClick={() => setThemePickerOpen(v => !v)}
            aria-label="Change chat theme"
            style={{
              width: 30, height: 30, borderRadius: 9, border: 'none', cursor: 'pointer',
              background: 'var(--color-surface-2)', color: theme.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Palette size={15} />
          </button>
          {themePickerOpen && (
            <>
              <div onClick={() => setThemePickerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9 }} />
              <div style={{
                position: 'absolute', top: 36, right: 0, zIndex: 10,
                background: 'var(--d-card)', borderRadius: 12, padding: 8,
                boxShadow: '0 8px 28px rgba(0,0,0,0.18), 0 0 0 1px var(--d-border)',
                display: 'flex', gap: 8,
              }}>
                {CHAT_THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => pickTheme(t)}
                    title={t.name}
                    aria-label={`${t.name} theme`}
                    style={{
                      width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
                      background: t.gradient,
                      border: theme.id === t.id ? '2.5px solid var(--d-text)' : '2.5px solid transparent',
                      boxShadow: `0 2px 6px ${t.shadow}`,
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 14px',
        display: 'flex', flexDirection: 'column', gap: 2,
        background: 'var(--color-bg)',
        backgroundImage: `url("${WALLPAPER_SVG}")`,
        backgroundSize: '80px 80px',
        color: 'var(--d-text)',
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
                const isListing = msg.body.startsWith(LISTING_PREFIX);

                return (
                  <div key={msg.id} className="chat-bubble-pop-in" style={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
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

                      {/* Bubble — timestamp (+ sent tick for own messages)
                          sits inside the bubble's own bottom-right corner,
                          same as WhatsApp/Telegram, rather than as a
                          separate line outside it. */}
                      <div style={{
                        padding: '9px 14px',
                        borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isListing ? 'var(--color-harvest-bg)' : (isOwn ? theme.gradient : 'var(--d-card)'),
                        boxShadow: isListing
                          ? '0 2px 8px rgba(0,0,0,0.08), 0 0 0 1.5px var(--color-harvest)'
                          : isOwn
                          ? `0 4px 14px ${theme.shadow}`
                          : '0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px var(--d-border)',
                        opacity: msg.id.startsWith('temp_') ? 0.6 : 1,
                        transition: 'opacity 0.25s',
                      }}>
                        {isListing ? (
                          <p style={{
                            fontSize: 13, lineHeight: 1.55, fontWeight: 700,
                            color: 'var(--color-harvest)',
                            margin: 0, display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                            <Leaf size={13} /> {msg.body.slice(LISTING_PREFIX.length)}
                          </p>
                        ) : (
                          <p style={{
                            fontSize: 13, lineHeight: 1.55,
                            color: isOwn ? '#fff' : 'var(--d-text)',
                            margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                          }}>
                            {msg.body}
                          </p>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 3, marginTop: 3 }}>
                          <span style={{ fontSize: 10, color: isListing ? 'var(--color-harvest)' : isOwn ? 'rgba(255,255,255,0.65)' : 'var(--d-muted)' }}>
                            {msg.id.startsWith('temp_') ? 'Sending…' : shortTime(msg.created_at)}
                          </span>
                          {isOwn && !isListing && !msg.id.startsWith('temp_') && (
                            <CheckCheck size={13} style={{ color: 'rgba(255,255,255,0.75)' }} />
                          )}
                          {isOwn && !isListing && msg.id.startsWith('temp_') && (
                            <Check size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
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
        <button
          onClick={() => setListingOpen(true)}
          aria-label="Send listing"
          title="Send listing"
          style={{
            width: 44, height: 44, flexShrink: 0,
            borderRadius: 14, border: '1.5px solid var(--d-border)',
            cursor: 'pointer', background: 'var(--color-surface-2)', color: theme.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Package size={18} />
        </button>
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
            background: canSend ? theme.gradient : 'var(--color-surface-2)',
            color: canSend ? '#fff' : 'var(--d-muted)',
            boxShadow: canSend ? `0 4px 14px ${theme.shadow}` : 'none',
            transition: 'all 0.18s',
          }}
        >
          {sending
            ? <div className="animate-spin" style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
            : <Send size={18} strokeWidth={2.2} />
          }
        </button>
      </div>

      {listingOpen && (
        <SendListingModal
          crop={listingCrop} setCrop={setListingCrop}
          qty={listingQty} setQty={setListingQty}
          notes={listingNotes} setNotes={setListingNotes}
          sending={listingSending} error={listingError}
          onSend={sendListing}
          onClose={() => { setListingOpen(false); setListingError(''); }}
        />
      )}

      {organizeOpen && (
        <OrganizePanel onClose={() => setOrganizeOpen(false)} />
      )}
    </div>
  );
}

function SendListingModal({
  crop, setCrop, qty, setQty, notes, setNotes, sending, error, onSend, onClose,
}: {
  crop: string; setCrop: (v: string) => void;
  qty: string; setQty: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  sending: boolean; error: string;
  onSend: () => void; onClose: () => void;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--d-card)', borderRadius: 16, padding: 20, width: '100%', maxWidth: 380, boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--d-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Package size={16} /> Send a Listing
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--d-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--d-muted)', margin: '0 0 14px' }}>
          Posts to the chat and lands in your group leader's crop-sorted queue for publishing.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <select value={crop} onChange={e => setCrop(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--d-border)', fontSize: 13, background: 'var(--d-input-bg)', color: 'var(--d-input-text)' }}>
            <option value="">Select crop…</option>
            {LISTING_CROPS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <input
            type="number" min="0" value={qty} onChange={e => setQty(e.target.value)}
            placeholder="Quantity (kg)"
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--d-border)', fontSize: 13, background: 'var(--d-input-bg)', color: 'var(--d-input-text)', boxSizing: 'border-box' }}
          />
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Notes (optional)"
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--d-border)', fontSize: 13, resize: 'vertical', fontFamily: 'inherit', background: 'var(--d-input-bg)', color: 'var(--d-input-text)', boxSizing: 'border-box' }}
          />
          {error && <p style={{ margin: 0, fontSize: 12, color: 'var(--color-danger)' }}>{error}</p>}
          <button onClick={onSend} disabled={sending}
            style={{ padding: '11px', borderRadius: 10, border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: sending ? 0.7 : 1 }}>
            {sending ? 'Sending…' : 'Send Listing'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface Cluster { cropType: string; totalKg: number; memberCount: number; listings: any[]; }

function OrganizePanel({ onClose }: { onClose: () => void }) {
  const [clusters, setClusters] = useState<Cluster[] | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [publishing, setPublishing] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/groups/chat-listings/organize');
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      setClusters(json.clusters);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function publish(cropType: string) {
    const price = priceInput[cropType];
    if (!price || Number(price) <= 0) { setError('Enter a valid asking price per kg'); return; }
    setPublishing(cropType); setError('');
    try {
      const res  = await fetch('/api/groups/chat-listings/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cropType, askingPrice: Number(price) }),
      });
      const json = await res.json();
      if (json.error) { setError(json.error); return; }
      load();
    } finally { setPublishing(null); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--d-card)', borderRadius: 16, padding: 20, width: '100%', maxWidth: 440, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--d-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ClipboardList size={16} /> Listings by Crop
          </p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--d-muted)', display: 'flex' }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--d-muted)', margin: '0 0 14px' }}>
          Listings members sent in chat, grouped by crop. Publish a crop as one lot when you're ready.
        </p>
        {error && <p style={{ fontSize: 12, color: 'var(--color-danger)', margin: '0 0 10px' }}>{error}</p>}
        {loading ? (
          <p style={{ fontSize: 13, color: 'var(--d-muted)', textAlign: 'center', padding: '20px 0' }}>Loading…</p>
        ) : !clusters || clusters.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--d-muted)', textAlign: 'center', padding: '20px 0' }}>No pending listings yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {clusters.map(c => (
              <div key={c.cropType} style={{ border: '1px solid var(--d-border)', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--d-text)', textTransform: 'capitalize' }}>{c.cropType}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--d-muted)' }}>{c.totalKg}kg · {c.memberCount} member{c.memberCount === 1 ? '' : 's'}</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number" min="0"
                    value={priceInput[c.cropType] ?? ''}
                    onChange={e => setPriceInput(prev => ({ ...prev, [c.cropType]: e.target.value }))}
                    placeholder="Price per kg (UGX)"
                    style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--d-border)', fontSize: 12, background: 'var(--d-input-bg)', color: 'var(--d-input-text)', boxSizing: 'border-box' }}
                  />
                  <button
                    disabled={publishing === c.cropType}
                    onClick={() => publish(c.cropType)}
                    style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {publishing === c.cropType ? '…' : 'Publish'}
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
