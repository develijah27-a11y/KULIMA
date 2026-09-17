'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import './whatsapp-chat.css';
import {
  Send,
  CheckCheck,
  Palette,
  Package,
  ClipboardList,
  X,
  Leaf,
  Users,
  RotateCcw,
  Crown,
  Paperclip,
  Mic,
  Search,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  BarChart2,
  Trash2,
  Copy,
  CornerUpLeft,
  Play,
  Pause,
  Info,
  Clock,
  CheckCircle2,
  ArrowLeft,
  Camera,
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
const LISTING_PREFIX = 'LISTING · ';

// Preset Themes for Group Chat (Cropify Themes)
const CHAT_THEMES = [
  {
    id: 'cropify-emerald',
    name: 'Cropify Emerald',
    gradient: 'linear-gradient(135deg, #008069 0%, #005C4B 100%)',
    bubbleOwn: '#D9FDD3',
    bubbleOwnDark: '#005C4B',
    accent: '#008069',
    headerBg: '#008069',
    headerText: '#FFFFFF',
    shadow: 'rgba(0, 128, 105, 0.25)',
  },
  {
    id: 'forest',
    name: 'Agri Green',
    gradient: 'linear-gradient(135deg, #16A34A 0%, #14532D 100%)',
    bubbleOwn: '#DCFCE7',
    bubbleOwnDark: '#14532D',
    accent: '#16A34A',
    headerBg: '#15803D',
    headerText: '#FFFFFF',
    shadow: 'rgba(22, 163, 74, 0.25)',
  },
  {
    id: 'ocean',
    name: 'Victoria Blue',
    gradient: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
    bubbleOwn: '#E0F2FE',
    bubbleOwnDark: '#075985',
    accent: '#0284C7',
    headerBg: '#0284C7',
    headerText: '#FFFFFF',
    shadow: 'rgba(2, 132, 199, 0.25)',
  },
  {
    id: 'harvest',
    name: 'Savanna Gold',
    gradient: 'linear-gradient(135deg, #D97706 0%, #92400E 100%)',
    bubbleOwn: '#FEF3C7',
    bubbleOwnDark: '#78350F',
    accent: '#D97706',
    headerBg: '#B45309',
    headerText: '#FFFFFF',
    shadow: 'rgba(217, 119, 6, 0.25)',
  },
] as const;

type ChatTheme = typeof CHAT_THEMES[number];
const THEME_STORAGE_KEY = 'cropify-group-chat-theme';

export interface Message {
  id: string;
  admin_id: string;
  sender_id: string;
  sender_name: string | null;
  body: string;
  created_at: string;
  failed?: boolean;
}

export interface GroupMemberItem {
  id?: string;
  name: string;
  phone_number?: string;
  role?: string;
  status?: string;
}

interface Props {
  adminId: string;
  currentUserId: string;
  currentUserName: string;
  memberCount: number;
  initialMessages?: Message[];
  groupName?: string;
  membersList?: GroupMemberItem[];
}

// Cropify Member Identifiable Colors
const MEMBER_COLORS = [
  '#1FA855', // Cropify Emerald
  '#0284C7', // Sky Blue
  '#7C3AED', // Purple
  '#D97706', // Warm Amber
  '#E11D48', // Rose
  '#0D9488', // Teal
  '#EAB308', // Gold
  '#6366F1', // Indigo
];

function getMemberColor(name: string) {
  let hash = 0;
  for (let i = 0; i < (name || 'Member').length; i++) {
    hash = (hash + (name || 'Member').charCodeAt(i)) % MEMBER_COLORS.length;
  }
  return MEMBER_COLORS[hash];
}

function formatChatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

function dateSeparatorLabel(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'TODAY';
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'YESTERDAY';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
  } catch {
    return 'RECENT';
  }
}

const QUICK_REACTIONS = ['Agree', 'Noted', 'Done', 'Review'];

export function GroupChatClient({
  adminId,
  currentUserId,
  currentUserName,
  memberCount,
  initialMessages = [],
  groupName = 'Farmer Community Group',
  membersList = [],
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

  // In-Chat Search State
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);

  // Quoted Replying State
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Attachments Popover
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);

  // Modals & Panels
  const [listingOpen, setListingOpen] = useState(false);
  const [listingCrop, setListingCrop] = useState('');
  const [listingQty, setListingQty] = useState('');
  const [listingNotes, setListingNotes] = useState('');
  const [listingSending, setListingSending] = useState(false);
  const [listingError, setListingError] = useState('');
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  // Voice Note Simulation State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reaction state: messageId -> { [emoji: string]: string[] (userIds) }
  const [reactions, setReactions] = useState<Record<string, Record<string, string[]>>>({});

  // Audio Playback state: messageId -> boolean
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  // Scroll to bottom FAB
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);

  // Copy toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Poll votes: messageId -> { [optionIndex: number]: string[] (userIds) }
  const [pollVotes, setPollVotes] = useState<Record<string, Record<number, string[]>>>({});

  const streamRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isAdmin = currentUserId === adminId;

  // Restore saved theme
  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    const match = CHAT_THEMES.find((t) => t.id === saved) ?? CHAT_THEMES[0];
    setTheme(match);
  }, []);

  // Lock outer dashboard main padding & scroll so chat header and bottom toolbar stay pinned
  useEffect(() => {
    document.body.classList.add('wa-chat-active');
    return () => {
      document.body.classList.remove('wa-chat-active');
    };
  }, []);

  function pickTheme(t: ChatTheme) {
    setTheme(t);
    setThemePickerOpen(false);
    localStorage.setItem(THEME_STORAGE_KEY, t.id);
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    setUnreadBelowCount(0);
  }, []);

  const autoGrow = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  // Track stream scroll to toggle "Scroll to Bottom" button
  const handleScroll = () => {
    if (!streamRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = streamRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isUp);
    if (!isUp) setUnreadBelowCount(0);
  };

  // Jump to specific message by ID (used by quoting)
  const jumpToMessage = (id: string) => {
    const el = document.getElementById(`wa-msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'background-color 0.4s ease';
      const originalBg = el.style.backgroundColor;
      el.style.backgroundColor = 'rgba(34, 197, 94, 0.25)';
      setTimeout(() => {
        el.style.backgroundColor = originalBg;
      }, 1200);
    }
  };

  // Fetch latest messages via service API to bypass RLS barriers, with client fallback
  const fetchMessages = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/groups/messages?adminId=${encodeURIComponent(adminId)}`);
      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json.success && Array.isArray(json.messages)) {
          setMessages((prev) => {
            const pendingMap = new Map(
              prev.filter((m) => m.id.startsWith('temp_') || m.failed).map((m) => [m.id, m])
            );
            const merged = [...json.messages];
            for (const pending of pendingMap.values()) {
              if (
                !merged.some(
                  (m) =>
                    m.body === pending.body &&
                    Math.abs(new Date(m.created_at).getTime() - new Date(pending.created_at).getTime()) < 30000
                )
              ) {
                merged.push(pending);
              }
            }
            return merged;
          });
          return true;
        }
      }

      // Fallback to direct client query if endpoint fails
      const { data, error: fetchErr } = await (supabase.from as any)('group_messages')
        .select('id, admin_id, sender_id, sender_name, body, created_at')
        .eq('admin_id', adminId)
        .order('created_at', { ascending: true })
        .limit(120);

      if (fetchErr) return false;

      setMessages((prev) => {
        const pendingMap = new Map(
          prev.filter((m) => m.id.startsWith('temp_') || m.failed).map((m) => [m.id, m])
        );
        const merged = [...(data ?? [])];
        for (const pending of pendingMap.values()) {
          if (
            !merged.some(
              (m) =>
                m.body === pending.body &&
                Math.abs(new Date(m.created_at).getTime() - new Date(pending.created_at).getTime()) < 30000
            )
          ) {
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

  // Initial load
  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setLoading(false);
      setTimeout(() => scrollToBottom(false), 40);
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
        setTimeout(() => scrollToBottom(false), 40);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [adminId, fetchMessages, initialMessages, scrollToBottom]);

  // Real-time listener: Broadcast + Postgres Changes + 3s Fast Polling
  useEffect(() => {
    let closedByEffect = false;

    const connect = () => {
      const ch = supabase.channel(`group_chat_room:${adminId}`, {
        config: { broadcast: { self: false } },
      });

      // 1. Peer broadcast delivery for instant message sync
      ch.on('broadcast', { event: 'new_group_message' }, (payload) => {
        if (payload && payload.payload) {
          const newMsg = payload.payload as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev.filter((m) => !(m.id.startsWith('temp_') && m.body === newMsg.body)), newMsg];
          });
          if (streamRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = streamRef.current;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
            if (isNearBottom) {
              setTimeout(() => scrollToBottom(true), 40);
            } else {
              setUnreadBelowCount((c) => c + 1);
            }
          }
        }
      });

      // 2. Peer reaction sync
      ch.on('broadcast', { event: 'group_chat_reaction' }, (payload) => {
        if (payload?.payload) {
          const { messageId, emoji, userId } = payload.payload;
          setReactions((prev) => {
            const msgReactions = { ...(prev[messageId] || {}) };
            const currentUsers = msgReactions[emoji] || [];
            if (currentUsers.includes(userId)) {
              msgReactions[emoji] = currentUsers.filter((u) => u !== userId);
              if (msgReactions[emoji].length === 0) delete msgReactions[emoji];
            } else {
              msgReactions[emoji] = [...currentUsers, userId];
            }
            return { ...prev, [messageId]: msgReactions };
          });
        }
      });

      // 3. Peer poll vote sync
      ch.on('broadcast', { event: 'group_poll_vote' }, (payload) => {
        if (payload?.payload) {
          const { messageId, optionIndex, userId } = payload.payload;
          setPollVotes((prev) => {
            const msgVotes = { ...(prev[messageId] || {}) };
            // Clear prior vote by this user for this poll
            for (const key of Object.keys(msgVotes)) {
              const numKey = Number(key);
              msgVotes[numKey] = (msgVotes[numKey] || []).filter((u) => u !== userId);
            }
            msgVotes[optionIndex] = [...(msgVotes[optionIndex] || []), userId];
            return { ...prev, [messageId]: msgVotes };
          });
        }
      });

      // 4. Database postgres changes
      ch.on(
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
            return [...prev.filter((m) => !(m.id.startsWith('temp_') && m.body === newMsg.body)), newMsg];
          });
          setTimeout(() => scrollToBottom(true), 40);
        }
      );

      ch.subscribe((status) => {
        if (closedByEffect) return;
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          supabase.removeChannel(ch);
          setTimeout(() => {
            if (!closedByEffect) connect();
          }, 2000);
        }
      });

      channelRef.current = ch;
    };

    connect();

    // Fast 3s polling fallback
    const pollId = setInterval(() => {
      fetchMessages();
    }, 3000);

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
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [adminId, fetchMessages, scrollToBottom, supabase]);

  // Voice note timer effect
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  // Handle message send
  const sendMessage = async (customPayload?: string, retryTempId?: string) => {
    let textToSend = '';

    if (customPayload) {
      textToSend = customPayload.trim();
    } else {
      const rawText = draft.trim();
      if (!rawText || (sending && !retryTempId)) return;

      // If user is replying, pack quote metadata in body in backwards-compatible JSON
      if (replyingTo) {
        textToSend = JSON.stringify({
          type: 'reply',
          replyTo: {
            id: replyingTo.id,
            name: replyingTo.sender_name || 'Member',
            snippet: replyingTo.body.startsWith('{')
              ? 'Attachment'
              : replyingTo.body.slice(0, 70),
          },
          text: rawText,
        });
      } else {
        textToSend = rawText;
      }
    }

    if (!textToSend) return;

    if (!retryTempId && !customPayload) {
      setSending(true);
      setDraft('');
      setReplyingTo(null);
      if (inputRef.current) inputRef.current.style.height = '42px';
    }
    setError(null);

    const tempId = retryTempId || `temp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const optimistic: Message = {
      id: tempId,
      admin_id: adminId,
      sender_id: currentUserId,
      sender_name: currentUserName,
      body: textToSend,
      created_at: new Date().toISOString(),
      failed: false,
    };

    if (!retryTempId) {
      setMessages((prev) => [...prev, optimistic]);
      setTimeout(() => scrollToBottom(true), 40);
    } else {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, failed: false } : m))
      );
    }

    try {
      const res = await fetch('/api/groups/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, body: textToSend }),
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success && json.message) {
        const confirmed: Message = json.message;
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? confirmed : m))
        );

        // Instant peer broadcast
        try {
          channelRef.current?.send({
            type: 'broadcast',
            event: 'new_group_message',
            payload: confirmed,
          });
        } catch {}
      } else {
        // Direct client fallback
        const { data: directData, error: directErr } = await (supabase.from as any)('group_messages')
          .insert({
            admin_id: adminId,
            sender_id: currentUserId,
            sender_name: currentUserName,
            body: textToSend,
          })
          .select('id, admin_id, sender_id, sender_name, body, created_at')
          .single();

        if (!directErr && directData) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? directData : m))
          );
          try {
            channelRef.current?.send({
              type: 'broadcast',
              event: 'new_group_message',
              payload: directData,
            });
          } catch {}
        } else {
          throw new Error(json.error || directErr?.message || 'Failed to deliver message');
        }
      }
    } catch (err: any) {
      console.error('[GroupChat] Send error:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, failed: true } : m))
      );
      setError('Message could not be sent. Tap retry.');
    } finally {
      if (!retryTempId && !customPayload) setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else if (e.key === 'Escape') {
      setReplyingTo(null);
      setAttachmentMenuOpen(false);
    }
  };

  // Toggle emoji reaction on a message
  const handleToggleReaction = (messageId: string, emoji: string) => {
    setReactions((prev) => {
      const msgReactions = { ...(prev[messageId] || {}) };
      const currentUsers = msgReactions[emoji] || [];
      if (currentUsers.includes(currentUserId)) {
        msgReactions[emoji] = currentUsers.filter((u) => u !== currentUserId);
        if (msgReactions[emoji].length === 0) delete msgReactions[emoji];
      } else {
        msgReactions[emoji] = [...currentUsers, currentUserId];
      }
      return { ...prev, [messageId]: msgReactions };
    });

    // Broadcast reaction
    try {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'group_chat_reaction',
        payload: { messageId, emoji, userId: currentUserId },
      });
    } catch {}
  };

  // Cast vote on poll
  const handleVotePoll = (messageId: string, optionIndex: number) => {
    setPollVotes((prev) => {
      const msgVotes = { ...(prev[messageId] || {}) };
      for (const key of Object.keys(msgVotes)) {
        const numKey = Number(key);
        msgVotes[numKey] = (msgVotes[numKey] || []).filter((u) => u !== currentUserId);
      }
      msgVotes[optionIndex] = [...(msgVotes[optionIndex] || []), currentUserId];
      return { ...prev, [messageId]: msgVotes };
    });

    try {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'group_poll_vote',
        payload: { messageId, optionIndex, userId: currentUserId },
      });
    } catch {}
    showToast('Vote counted!');
  };

  // Delete message (local and DB if admin or own message)
  const handleDeleteMessage = async (msg: Message) => {
    if (msg.sender_id !== currentUserId && !isAdmin) return;
    if (!confirm('Delete this message for everyone in the group?')) return;

    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    try {
      await (supabase.from as any)('group_messages').delete().eq('id', msg.id);
      showToast('Message deleted');
    } catch {}
  };

  // Copy message text
  const handleCopyMessage = (text: string) => {
    let clean = text;
    try {
      if (text.startsWith('{')) {
        const parsed = JSON.parse(text);
        clean = parsed.text || parsed.question || parsed.caption || text;
      }
    } catch {}
    navigator.clipboard.writeText(clean);
    showToast('Copied to clipboard');
  };

  // Send Crop Listing
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
        try {
          channelRef.current?.send({
            type: 'broadcast',
            event: 'new_group_message',
            payload: json.message,
          });
        } catch {}
      }
      setTimeout(() => scrollToBottom(true), 60);
      setListingCrop('');
      setListingQty('');
      setListingNotes('');
      setListingOpen(false);
      showToast('Crop lot posted to group chat');
    } catch {
      setListingError('Failed to send listing. Please verify connection.');
    } finally {
      setListingSending(false);
    }
  };

  // Send Voice Note (simulation)
  const finishVoiceRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    const duration = Math.max(recordingSeconds, 1);
    const durationStr = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
    const payload = JSON.stringify({
      type: 'voice',
      duration: durationStr,
      seconds: duration,
      waveform: [6, 12, 18, 8, 14, 20, 10, 16, 22, 12, 18, 9, 15, 7],
    });
    sendMessage(payload);
    showToast('Voice note sent');
  };

  // Send Poll
  const handleSendPoll = (question: string, options: string[]) => {
    const payload = JSON.stringify({
      type: 'poll',
      question,
      options,
    });
    sendMessage(payload);
    setPollModalOpen(false);
    showToast('Poll created');
  };

  // Send Photo Attachment
  const handleSendPhoto = (photoUrl: string, caption: string) => {
    const payload = JSON.stringify({
      type: 'photo',
      url: photoUrl,
      caption: caption.trim(),
    });
    sendMessage(payload);
    setPhotoModalOpen(false);
    showToast('Photo shared');
  };

  // In-Chat Search Matches
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return messages
      .map((m, idx) => ({ id: m.id, idx, body: m.body.toLowerCase() }))
      .filter((m) => m.body.includes(q));
  }, [messages, searchQuery]);

  const jumpToSearchMatch = (direction: 'next' | 'prev') => {
    if (searchMatches.length === 0) return;
    let nextIndex = direction === 'next' ? searchMatchIndex + 1 : searchMatchIndex - 1;
    if (nextIndex >= searchMatches.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = searchMatches.length - 1;
    setSearchMatchIndex(nextIndex);
    const targetMatch = searchMatches[nextIndex];
    if (targetMatch) jumpToMessage(targetMatch.id);
  };

  // Group messages by date
  const grouped: Array<{ date: string; msgs: Message[] }> = [];
  for (const msg of messages) {
    const dateKey = new Date(msg.created_at).toDateString();
    const last = grouped[grouped.length - 1];
    if (last && last.date === dateKey) last.msgs.push(msg);
    else grouped.push({ date: dateKey, msgs: [msg] });
  }

  // Active member names list for header subtitle
  const memberSubtitle = useMemo(() => {
    if (membersList.length > 0) {
      const names = membersList.map((m) => m.name.split(' ')[0]);
      if (names.length <= 3) return names.join(', ');
      return `${names.slice(0, 3).join(', ')} and ${names.length - 3} others`;
    }
    return `${memberCount} active member${memberCount === 1 ? '' : 's'}`;
  }, [membersList, memberCount]);

  const canSend = !!draft.trim() && !sending;

  return (
    <div className="wa-chat-container">
      {/* ── Cropify Chat Toast ── */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: 70,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 40,
            background: 'rgba(17, 27, 33, 0.92)',
            color: '#FFFFFF',
            fontSize: 12.5,
            fontWeight: 700,
            padding: '7px 16px',
            borderRadius: 999,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            backdropFilter: 'blur(6px)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <CheckCircle2 size={15} color="#22C55E" />
          {toastMessage}
        </div>
      )}

      {/* ── Cropify Chat Topbar / Header ── */}
      <div
        className="wa-chat-header"
        style={{
          height: 60,
          background: 'var(--d-card)',
          borderBottom: '1px solid var(--d-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Left: Mobile Back Button + Group Avatar & Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.location.href = isAdmin ? '/groups/dashboard' : '/farmer/dashboard';
                }
              }
            }}
            aria-label="Back"
            className="md:hidden"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: 'var(--d-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={19} />
          </button>

          <div
            onClick={() => setGroupInfoOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              userSelect: 'none',
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
            }}
            title="Click to view Group Info & Roster"
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: theme.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: `0 2px 8px ${theme.shadow}`,
                }}
              >
                <Users size={18} />
              </div>
              {/* Online indicator dot */}
              <span
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: '#22C55E',
                  border: '2px solid var(--d-card)',
                }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, maxWidth: '100%' }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 800,
                    color: 'var(--d-text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    letterSpacing: '-0.02em',
                    flex: '1 1 auto',
                    minWidth: 0,
                  }}
                >
                  {groupName}
                </h2>
                {isAdmin && (
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(234, 179, 8, 0.15)',
                      color: '#B45309',
                      border: '1px solid rgba(234, 179, 8, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Crown size={10} /> Admin
                  </span>
                )}
              </div>
              <p
                style={{
                  margin: '1px 0 0',
                  fontSize: 11,
                  color: 'var(--d-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {memberSubtitle} · <span style={{ color: theme.accent, fontWeight: 600 }}>tap for info</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right: Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 10, position: 'relative', zIndex: 10 }}>
          {/* In-Chat Search Button */}
          <button
            onClick={() => {
              setSearchOpen((v) => !v);
              setSearchQuery('');
            }}
            aria-label="Search Messages"
            title="Search in this chat"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: searchOpen ? 'rgba(0,0,0,0.08)' : 'transparent',
              color: 'var(--d-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Search size={18} />
          </button>

          {/* Group Listings Aggregation shortcut - hidden on mobile to avoid overcrowding */}
          {isAdmin && (
            <button
              onClick={() => setOrganizeOpen(true)}
              aria-label="Group Crop Aggregations"
              title="Organize Group Crop Lots"
              className="hidden md:flex"
              style={{
                height: 32,
                padding: '0 10px',
                borderRadius: 16,
                border: '1px solid var(--d-border)',
                cursor: 'pointer',
                background: 'var(--color-surface-2)',
                color: 'var(--d-text)',
                alignItems: 'center',
                gap: 5,
                fontSize: 11.5,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              <ClipboardList size={13} color="#16A34A" />
              <span>Aggregate Lots</span>
            </button>
          )}

          {/* Group Info Drawer Toggle (hidden on mobile since tapping header opens it) */}
          <button
            onClick={() => setGroupInfoOpen(true)}
            aria-label="Group Info"
            title="Group Information"
            className="hidden sm:flex"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: 'var(--d-text)',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Info size={18} />
          </button>

          {/* Theme Switcher */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setThemePickerOpen((v) => !v)}
              aria-label="Customize Theme"
              title="Chat Wallpaper & Accent"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                background: 'transparent',
                color: 'var(--d-text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Palette size={18} />
            </button>

            {themePickerOpen && (
              <>
                <div
                  onClick={() => setThemePickerOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 25 }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 44,
                    right: 0,
                    zIndex: 30,
                    background: 'var(--d-card)',
                    borderRadius: 14,
                    padding: 10,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.2), 0 0 0 1px var(--d-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    minWidth: 160,
                  }}
                >
                  <p style={{ margin: '2px 4px 6px', fontSize: 11, fontWeight: 800, color: 'var(--d-muted)', textTransform: 'uppercase' }}>
                    Chat Themes
                  </p>
                  {CHAT_THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => pickTheme(t)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '6px 8px',
                        borderRadius: 8,
                        background: theme.id === t.id ? 'var(--color-surface-2)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                      }}
                    >
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: t.gradient,
                          boxShadow: `0 2px 6px ${t.shadow}`,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--d-text)' }}>
                        {t.name}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Cropify In-Chat Search Bar Overlay ── */}
      {searchOpen && (
        <div
          style={{
            padding: '8px 16px',
            background: 'var(--d-card)',
            borderBottom: '1px solid var(--d-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            zIndex: 9,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <Search size={16} color="var(--d-muted)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchMatchIndex(0);
            }}
            placeholder="Search messages in this group..."
            autoFocus
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              color: 'var(--d-text)',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--d-muted)' }}>
              {searchMatches.length > 0
                ? `${searchMatchIndex + 1} of ${searchMatches.length}`
                : 'No matches'}
            </span>
          )}
          {searchMatches.length > 0 && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => jumpToSearchMatch('prev')}
                style={{
                  border: 'none',
                  background: 'var(--color-surface-2)',
                  borderRadius: 6,
                  padding: '4px 6px',
                  cursor: 'pointer',
                  color: 'var(--d-text)',
                }}
                title="Previous match"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => jumpToSearchMatch('next')}
                style={{
                  border: 'none',
                  background: 'var(--color-surface-2)',
                  borderRadius: 6,
                  padding: '4px 6px',
                  cursor: 'pointer',
                  color: 'var(--d-text)',
                }}
                title="Next match"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          )}
          <button
            onClick={() => setSearchOpen(false)}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--d-muted)',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Cropify Message Stream Wallpaper ── */}
      <div
        ref={streamRef}
        onScroll={handleScroll}
        className="wa-wallpaper wa-scroll-stream"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          position: 'relative',
        }}
      >
        {/* Realistic Skeleton Loading matching actual chat anatomy */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 10 }}>
            {/* Date separator skeleton */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 10px' }}>
              <div className="dash-skeleton" style={{ width: 72, height: 22, borderRadius: 8 }} />
            </div>

            {/* Incoming message skeleton */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div className="dash-skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
              <div
                style={{
                  background: 'var(--d-card)',
                  borderRadius: '12px 12px 12px 2px',
                  padding: '10px 14px',
                  width: '68%',
                  maxWidth: 320,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  border: '1px solid var(--d-border)',
                }}
              >
                <div className="dash-skeleton" style={{ width: 80, height: 11, borderRadius: 4, marginBottom: 8 }} />
                <div className="dash-skeleton" style={{ width: '92%', height: 13, borderRadius: 4, marginBottom: 6 }} />
                <div className="dash-skeleton" style={{ width: '60%', height: 13, borderRadius: 4, marginBottom: 6 }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div className="dash-skeleton" style={{ width: 42, height: 10, borderRadius: 3 }} />
                </div>
              </div>
            </div>

            {/* Outgoing harvest lot card skeleton */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div
                style={{
                  background: 'var(--color-surface-2)',
                  borderRadius: '12px 12px 2px 12px',
                  padding: '12px 14px',
                  width: '74%',
                  maxWidth: 340,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  border: '1.5px solid var(--color-primary-muted)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div className="dash-skeleton" style={{ width: 110, height: 13, borderRadius: 4 }} />
                  <div className="dash-skeleton" style={{ width: 48, height: 16, borderRadius: 10 }} />
                </div>
                <div className="dash-skeleton" style={{ width: '85%', height: 15, borderRadius: 4, marginBottom: 10 }} />
                <div className="dash-skeleton" style={{ width: '100%', height: 32, borderRadius: 8, marginBottom: 6 }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                  <div className="dash-skeleton" style={{ width: 44, height: 10, borderRadius: 3 }} />
                </div>
              </div>
            </div>

            {/* Outgoing short message skeleton */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div
                style={{
                  background: 'var(--color-surface-2)',
                  borderRadius: '12px 12px 2px 12px',
                  padding: '8px 12px',
                  width: '45%',
                  maxWidth: 220,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  border: '1px solid var(--d-border)',
                }}
              >
                <div className="dash-skeleton" style={{ width: '80%', height: 13, borderRadius: 4, marginBottom: 6 }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div className="dash-skeleton" style={{ width: 40, height: 10, borderRadius: 3 }} />
                </div>
              </div>
            </div>
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
              Your messages are safely stored. Tap retry to reconnect.
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
                background: theme.accent,
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
                width: 60,
                height: 60,
                borderRadius: 20,
                marginBottom: 14,
                background: 'rgba(34, 197, 94, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={28} color="#16A34A" />
            </div>
            <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--d-text)', marginBottom: 4 }}>
              Welcome to {groupName}!
            </p>
            <p style={{ fontSize: 13, color: 'var(--d-muted)', maxWidth: 300, lineHeight: 1.5 }}>
              Share updates, ask questions, post harvest crop lots, or vote on group sales.
            </p>
          </div>
        )}

        {/* ── Cropify Message Stream ── */}
        {grouped.map(({ date, msgs }) => (
          <div key={date}>
            {/* Sticky/Centered Date Pill */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 10px' }}>
              <span className="wa-date-pill">{dateSeparatorLabel(msgs[0].created_at)}</span>
            </div>

            {/* Message items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {msgs.map((msg) => {
                const isOwn = msg.sender_id === currentUserId;
                const isSenderAdmin = msg.sender_id === adminId;
                const name = msg.sender_name ?? 'Member';
                const memberColor = getMemberColor(name);
                const isPending = msg.id.startsWith('temp_');
                const isFailed = !!msg.failed;

                // Parse message payload (Rich JSON vs Legacy Text)
                const isListing = msg.body.startsWith(LISTING_PREFIX);
                let parsedPayload: any = null;
                if (msg.body.startsWith('{')) {
                  try {
                    parsedPayload = JSON.parse(msg.body);
                  } catch {}
                }

                // Check search match
                const isCurrentSearchMatch =
                  searchMatches.length > 0 &&
                  searchMatches[searchMatchIndex]?.id === msg.id;

                const msgReactions = reactions[msg.id] || {};

                return (
                  <div
                    key={msg.id}
                    id={`wa-msg-${msg.id}`}
                    className="wa-message-row"
                    style={{
                      display: 'flex',
                      flexDirection: isOwn ? 'row-reverse' : 'row',
                      gap: 8,
                      alignItems: 'flex-end',
                      position: 'relative',
                      margin: '1px 0',
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
                          background: memberColor,
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 800,
                          boxShadow: `0 2px 6px ${memberColor}44`,
                        }}
                      >
                        {(name[0] || 'M').toUpperCase()}
                      </div>
                    )}

                    {/* Bubble Content Container */}
                    <div
                      style={{
                        maxWidth: 'min(82%, 560px)',
                        minWidth: 80,
                        width: 'fit-content',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* Sender Name for Others */}
                      {!isOwn && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            marginBottom: 2,
                            marginLeft: 4,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 800,
                              color: memberColor,
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

                      {/* Cropify Bubble Surface */}
                      <div
                        className={isOwn ? 'wa-bubble-outgoing' : 'wa-bubble-incoming'}
                        style={{
                          padding: isListing ? '10px 12px' : '7px 11px',
                          outline: isCurrentSearchMatch ? '2px solid #EAB308' : 'none',
                          opacity: isPending ? 0.8 : 1,
                          position: 'relative',
                        }}
                      >
                        {/* 1. Quoted Message Preview (if reply) */}
                        {parsedPayload?.type === 'reply' && parsedPayload.replyTo && (
                          <div
                            className="wa-quote-block"
                            onClick={() => jumpToMessage(parsedPayload.replyTo.id)}
                            title="Click to jump to quoted message"
                          >
                            <p
                              style={{
                                margin: 0,
                                fontSize: 11,
                                fontWeight: 800,
                                color: '#00A884',
                              }}
                            >
                              {parsedPayload.replyTo.name}
                            </p>
                            <p
                              style={{
                                margin: '2px 0 0',
                                fontSize: 11.5,
                                color: 'var(--d-muted)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: 260,
                              }}
                            >
                              {parsedPayload.replyTo.snippet}
                            </p>
                          </div>
                        )}

                        {/* 2. Crop Listing Message */}
                        {isListing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                                    fontSize: 11.5,
                                    fontWeight: 800,
                                    color: '#16A34A',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  HARVEST LOT OFFER
                                </span>
                              </div>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: 'rgba(34, 197, 94, 0.15)',
                                  color: '#16A34A',
                                }}
                              >
                                Verified
                              </span>
                            </div>

                            <p
                              style={{
                                fontSize: 13.5,
                                fontWeight: 700,
                                margin: 0,
                                color: 'var(--d-text)',
                              }}
                            >
                              {msg.body.slice(LISTING_PREFIX.length)}
                            </p>

                            {isAdmin && (
                              <button
                                onClick={() => setOrganizeOpen(true)}
                                style={{
                                  alignSelf: 'flex-start',
                                  marginTop: 4,
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  border: '1px solid rgba(22, 163, 74, 0.3)',
                                  background: 'rgba(22, 163, 74, 0.1)',
                                  color: '#16A34A',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                View in Aggregation Desk →
                              </button>
                            )}
                          </div>
                        ) : parsedPayload?.type === 'photo' ? (
                          /* 3. Photo Card */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <img
                              src={parsedPayload.url}
                              alt="Shared crop photograph"
                              style={{
                                width: '100%',
                                maxHeight: 260,
                                objectFit: 'cover',
                                borderRadius: 8,
                                border: '1px solid rgba(0,0,0,0.06)',
                              }}
                            />
                            {parsedPayload.caption && (
                              <p style={{ margin: '2px 0 0', fontSize: 13, lineHeight: 1.45 }}>
                                {parsedPayload.caption}
                              </p>
                            )}
                          </div>
                        ) : parsedPayload?.type === 'voice' ? (
                          /* 4. Voice Note Player */
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200, padding: '4px 2px' }}>
                            <button
                              onClick={() =>
                                setPlayingAudioId(playingAudioId === msg.id ? null : msg.id)
                              }
                              aria-label={playingAudioId === msg.id ? 'Pause Voice Note' : 'Play Voice Note'}
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                border: 'none',
                                background: isOwn ? '#008069' : '#16A34A',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}
                            >
                              {playingAudioId === msg.id ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: 2 }} />}
                            </button>

                            {/* Waveform visualizer */}
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2.5, height: 24 }}>
                              {[8, 14, 20, 10, 16, 22, 12, 18, 9, 15, 7, 14, 18, 11].map((barH, bi) => (
                                <span
                                  key={bi}
                                  className={playingAudioId === msg.id ? 'wa-waveform-bar-active' : ''}
                                  style={{
                                    width: 3,
                                    height: playingAudioId === msg.id ? undefined : barH,
                                    background: isOwn ? 'rgba(0, 92, 75, 0.7)' : 'rgba(0, 0, 0, 0.45)',
                                    borderRadius: 2,
                                  }}
                                />
                              ))}
                            </div>

                            <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.8, flexShrink: 0 }}>
                              {parsedPayload.duration || '0:14'}
                            </span>
                          </div>
                        ) : parsedPayload?.type === 'poll' ? (
                          /* 5. Interactive Poll */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <BarChart2 size={15} color="#008069" />
                              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#008069' }}>
                                Community Poll
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800 }}>
                              {parsedPayload.question}
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {(parsedPayload.options || []).map((opt: string, optIdx: number) => {
                                const votes = pollVotes[msg.id]?.[optIdx] || [];
                                const totalVotes = Object.values(pollVotes[msg.id] || {}).reduce(
                                  (acc, cur) => acc + cur.length,
                                  0
                                );
                                const percentage =
                                  totalVotes > 0 ? Math.round((votes.length / totalVotes) * 100) : 0;
                                const hasVoted = votes.includes(currentUserId);

                                return (
                                  <div
                                    key={optIdx}
                                    onClick={() => handleVotePoll(msg.id, optIdx)}
                                    style={{
                                      padding: '8px 10px',
                                      borderRadius: 8,
                                      border: hasVoted
                                        ? '1.5px solid #008069'
                                        : '1px solid rgba(0,0,0,0.1)',
                                      background: hasVoted
                                        ? 'rgba(0, 128, 105, 0.08)'
                                        : 'rgba(0,0,0,0.03)',
                                      cursor: 'pointer',
                                      position: 'relative',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <div
                                      style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: `${percentage}%`,
                                        background: 'rgba(0, 128, 105, 0.14)',
                                        zIndex: 0,
                                        transition: 'width 0.3s ease',
                                      }}
                                    />
                                    <div
                                      style={{
                                        position: 'relative',
                                        zIndex: 1,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>
                                        {opt}
                                      </span>
                                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--d-muted)' }}>
                                        {percentage}% ({votes.length})
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          /* 6. Standard Text Body (or Reply text) */
                          <p
                            style={{
                              fontSize: 13.5,
                              lineHeight: 1.48,
                              margin: 0,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {parsedPayload?.text || msg.body}
                          </p>
                        )}

                        {/* Bubble Timestamp and Read Receipt Footer */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            alignItems: 'center',
                            gap: 3.5,
                            marginTop: 4,
                            marginLeft: 'auto',
                            alignSelf: 'flex-end',
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10.5,
                              color: 'rgba(100, 116, 139, 0.85)',
                              userSelect: 'none',
                            }}
                          >
                            {isPending
                              ? 'sending…'
                              : isFailed
                              ? 'failed'
                              : formatChatTime(msg.created_at)}
                          </span>

                          {/* Read Receipt Checks */}
                          {isOwn && !isFailed && !isPending && (
                            <span title="Delivered & Read" style={{ display: 'inline-flex', color: '#53BDEB' }}>
                              <CheckCheck size={14} strokeWidth={2.4} />
                            </span>
                          )}
                          {isOwn && isPending && (
                            <span title="Sending" style={{ display: 'inline-flex', color: 'rgba(100, 116, 139, 0.6)' }}>
                              <Clock size={11} />
                            </span>
                          )}
                          {isFailed && (
                            <button
                              onClick={() => sendMessage(msg.body, msg.id)}
                              title="Tap to retry delivery"
                              style={{
                                border: 'none',
                                background: 'transparent',
                                padding: 0,
                                cursor: 'pointer',
                                display: 'flex',
                                color: '#EF4444',
                              }}
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Reaction Badges Attached under Bubble */}
                      {Object.keys(msgReactions).length > 0 && (
                        <div
                          className="wa-reaction-badge"
                          style={{ right: isOwn ? 6 : 'auto', left: isOwn ? 'auto' : 6 }}
                          onClick={() => handleToggleReaction(msg.id, Object.keys(msgReactions)[0])}
                        >
                          {Object.entries(msgReactions).map(([emoji, users]) => (
                            <span key={emoji} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                              <span>{emoji}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--d-muted)' }}>
                                {users.length}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Hover Pill (Reactions, Reply, Copy, Delete) */}
                    <div
                      className="wa-action-trigger"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        background: 'var(--d-card)',
                        borderRadius: 20,
                        padding: '3px 8px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.14)',
                        border: '1px solid var(--d-border)',
                        marginBottom: 4,
                      }}
                    >
                      {/* Quick Reaction Pill Buttons */}
                      {QUICK_REACTIONS.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleToggleReaction(msg.id, tag)}
                          title={`React with ${tag}`}
                          style={{
                            border: '1px solid var(--d-border)',
                            background: 'var(--color-surface-2)',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 10.5,
                            fontWeight: 700,
                            color: 'var(--d-text)',
                            padding: '2px 5px',
                          }}
                        >
                          {tag}
                        </button>
                      ))}

                      <div style={{ width: 1, height: 14, background: 'var(--d-border)', margin: '0 2px' }} />

                      {/* Reply Button */}
                      <button
                        onClick={() => {
                          setReplyingTo(msg);
                          inputRef.current?.focus();
                        }}
                        title="Quote / Reply"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: 'var(--d-muted)',
                          padding: 2,
                          display: 'flex',
                        }}
                      >
                        <CornerUpLeft size={14} />
                      </button>

                      {/* Copy Button */}
                      <button
                        onClick={() => handleCopyMessage(msg.body)}
                        title="Copy text"
                        style={{
                          border: 'none',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: 'var(--d-muted)',
                          padding: 2,
                          display: 'flex',
                        }}
                      >
                        <Copy size={13} />
                      </button>

                      {/* Delete Button (if own message or admin) */}
                      {(isOwn || isAdmin) && (
                        <button
                          onClick={() => handleDeleteMessage(msg)}
                          title="Delete message"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#EF4444',
                            padding: 2,
                            display: 'flex',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Scroll To Bottom Floating Action Button ── */}
      {showScrollBottom && (
        <button
          onClick={() => scrollToBottom(true)}
          aria-label="Scroll to newest messages"
          style={{
            position: 'absolute',
            bottom: 80,
            right: 18,
            zIndex: 15,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--d-card)',
            border: '1px solid var(--d-border)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--d-text)',
            transition: 'all 0.2s ease',
          }}
        >
          <ChevronDown size={20} />
          {unreadBelowCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                background: '#22C55E',
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: 800,
                borderRadius: 99,
                padding: '1px 5px',
                border: '1.5px solid var(--d-card)',
              }}
            >
              {unreadBelowCount}
            </span>
          )}
        </button>
      )}

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
            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 0 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Quoted Replying Preview Docked Bar ── */}
      {replyingTo && (
        <div
          style={{
            padding: '8px 14px',
            background: 'var(--color-surface-2)',
            borderTop: '1px solid var(--d-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: `4px solid ${theme.accent}`,
            animation: 'fadeIn 0.18s ease',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 11.5, fontWeight: 800, color: theme.accent }}>
              Replying to {replyingTo.sender_name ?? 'Member'}
            </p>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 12,
                color: 'var(--d-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 400,
              }}
            >
              {replyingTo.body.startsWith('{') ? 'Rich Media' : replyingTo.body}
            </p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--d-muted)',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Quoted Replying Preview Docked Bar */}

      {/* ── Cropify Attachments Tray Popover ── */}
      {attachmentMenuOpen && (
        <div
          style={{
            borderTop: '1px solid var(--d-border)',
            background: 'var(--d-card)',
            padding: '14px 18px',
            display: 'flex',
            gap: 20,
            justifyContent: 'space-around',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {/* Post Crop Lot */}
          <button
            onClick={() => {
              setAttachmentMenuOpen(false);
              setListingOpen(true);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
              }}
            >
              <Package size={20} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--d-text)' }}>
              Crop Lot
            </span>
          </button>

          {/* Share Harvest Photo */}
          <button
            onClick={() => {
              setAttachmentMenuOpen(false);
              setPhotoModalOpen(true);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
              }}
            >
              <ImageIcon size={20} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--d-text)' }}>
              Photo
            </span>
          </button>

          {/* Group Poll */}
          <button
            onClick={() => {
              setAttachmentMenuOpen(false);
              setPollModalOpen(true);
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
              }}
            >
              <BarChart2 size={20} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--d-text)' }}>
              Vote / Poll
            </span>
          </button>
        </div>
      )}

      {/* ── Cropify Modern Input Toolbar ── */}
      <div
        className="wa-bottom-bar"
        style={{
          padding: '8px 10px 10px',
          background: 'var(--d-card)',
          borderTop: '1px solid var(--d-border)',
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}
      >
        {/* Text Input Capsule or Voice Recording Bar */}
        {isRecording ? (
          <div
            style={{
              flex: 1,
              minHeight: 46,
              borderRadius: 24,
              background: 'var(--color-surface-2)',
              border: '1px solid #EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: '#EF4444',
                  boxShadow: '0 0 8px #EF4444',
                  animation: 'pulse 1s infinite',
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#EF4444' }}>
                Recording… 0:{(recordingSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => setIsRecording(false)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--d-muted)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={finishVoiceRecording}
                style={{
                  padding: '6px 14px',
                  borderRadius: 16,
                  border: 'none',
                  background: '#16A34A',
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Send Audio
              </button>
            </div>
          </div>
        ) : (
          <div className="wa-input-pill">
            {/* Auto-growing Textarea (inside capsule) */}
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                autoGrow();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Message"
              rows={1}
              className="wa-pill-textarea"
              maxLength={3000}
              disabled={sending}
            />

            {/* Paperclip Attachment Trigger (inside capsule) */}
            <button
              type="button"
              onClick={() => {
                setAttachmentMenuOpen((v) => !v);
              }}
              aria-label="Attachments"
              title="Share crop lots, photos or polls"
              className="wa-pill-btn"
              style={{
                color: attachmentMenuOpen ? theme.accent : undefined,
              }}
            >
              <Paperclip size={20} />
            </button>

            {/* Camera Photo Trigger (inside capsule) */}
            <button
              type="button"
              onClick={() => setPhotoModalOpen(true)}
              aria-label="Share Photo"
              title="Take or upload photo"
              className="wa-pill-btn"
            >
              <Camera size={20} />
            </button>
          </div>
        )}

        {/* Standalone Circular Mic or Send Button */}
        {isRecording ? null : canSend ? (
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={sending}
            aria-label="Send Message"
            className="wa-circle-btn"
            style={{ background: theme.accent }}
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
              <Send size={18} strokeWidth={2.4} style={{ marginLeft: 2 }} />
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsRecording(true)}
            aria-label="Record Voice Note"
            title="Press to record voice note"
            className="wa-circle-btn"
            style={{ background: theme.accent }}
          >
            <Mic size={21} />
          </button>
        )}
      </div>

      {/* ── Cropify Group Info Side Sheet Drawer ── */}
      {groupInfoOpen && (
        <GroupInfoDrawer
          groupName={groupName}
          memberCount={memberCount}
          adminId={adminId}
          currentUserId={currentUserId}
          membersList={membersList}
          onClose={() => setGroupInfoOpen(false)}
          onOpenAggregations={() => {
            setGroupInfoOpen(false);
            setOrganizeOpen(true);
          }}
        />
      )}

      {/* ── Crop Listing Modal ── */}
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

      {/* ── Group Poll Modal ── */}
      {pollModalOpen && (
        <CreatePollModal
          onSend={handleSendPoll}
          onClose={() => setPollModalOpen(false)}
        />
      )}

      {/* ── Share Photo Modal ── */}
      {photoModalOpen && (
        <SharePhotoModal
          onSend={handleSendPhoto}
          onClose={() => setPhotoModalOpen(false)}
        />
      )}

      {/* ── Organize Panel Modal for Admin ── */}
      {organizeOpen && <OrganizePanel onClose={() => setOrganizeOpen(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Cropify Group Info Side Sheet Drawer
// ─────────────────────────────────────────────────────────────
function GroupInfoDrawer({
  groupName,
  memberCount,
  adminId,
  currentUserId,
  membersList,
  onClose,
  onOpenAggregations,
}: {
  groupName: string;
  memberCount: number;
  adminId: string;
  currentUserId: string;
  membersList: GroupMemberItem[];
  onClose: () => void;
  onOpenAggregations: () => void;
}) {
  const isAdmin = currentUserId === adminId;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 380,
          height: '100%',
          background: 'var(--d-card)',
          borderLeft: '1px solid var(--d-border)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          animation: 'slideInRight 0.25s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 18px',
            borderBottom: '1px solid var(--d-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--d-text)' }}>
            Group Details
          </h3>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--d-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Group Profile Hero */}
        <div
          style={{
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            borderBottom: '1px solid var(--d-border)',
            background: 'var(--color-surface-2)',
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #008069 0%, #005C4B 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0, 128, 105, 0.3)',
              marginBottom: 12,
            }}
          >
            <Users size={36} />
          </div>
          <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 800, color: 'var(--d-text)' }}>
            {groupName}
          </h2>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--d-muted)' }}>
            Group · {memberCount} verified member{memberCount === 1 ? '' : 's'}
          </p>
        </div>

        {/* Group Description & Mission */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--d-border)' }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 800, color: 'var(--d-muted)', textTransform: 'uppercase' }}>
            Description
          </p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--d-text)' }}>
            Official agricultural collective group on Cropify. Farmers coordinate harvest cycles, submit lot quantities, and negotiate direct collective off-taker contracts.
          </p>
        </div>

        {/* Collective Selling Shortcuts */}
        {isAdmin && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--d-border)' }}>
            <button
              onClick={onOpenAggregations}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: 12,
                border: 'none',
                background: '#16A34A',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 3px 12px rgba(22, 163, 74, 0.25)',
              }}
            >
              <ClipboardList size={16} /> Open Crop Aggregations Desk
            </button>
          </div>
        )}

        {/* Participant Roster */}
        <div style={{ padding: '16px 20px', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'var(--d-muted)', textTransform: 'uppercase' }}>
              {memberCount} Participants
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {membersList.length > 0 ? (
              membersList.map((m, idx) => {
                const color = getMemberColor(m.name);
                const isMemberAdmin = m.role === 'admin' || m.id === adminId;
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: 8,
                      background: 'var(--color-surface-2)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: color,
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {(m.name[0] || 'M').toUpperCase()}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--d-text)' }}>
                          {m.name}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--d-muted)' }}>
                          {m.phone_number || 'Active Member'}
                        </p>
                      </div>
                    </div>
                    {isMemberAdmin && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(234, 179, 8, 0.15)',
                          color: '#CA8A04',
                          border: '1px solid rgba(234, 179, 8, 0.3)',
                        }}
                      >
                        Group Admin
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <p style={{ fontSize: 12.5, color: 'var(--d-muted)' }}>
                {memberCount} active farmer participants.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Post Crop Lot Modal
// ─────────────────────────────────────────────────────────────
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
        zIndex: 60,
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
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
              Post Harvest Crop Lot
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--d-muted)', display: 'flex' }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 12.5, color: 'var(--d-muted)', margin: '0 0 16px', lineHeight: 1.45 }}>
          Share your harvest quantity with the group for collective bulk aggregation and marketplace sale.
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
              placeholder="e.g. Cleaned and dried, ready for pickup next Tuesday"
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

          {error && <p style={{ margin: 0, fontSize: 12, color: '#EF4444', fontWeight: 600 }}>{error}</p>}

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
            {sending ? 'Broadcasting…' : 'Publish Crop Lot to Chat'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Create Quick Poll Modal
// ─────────────────────────────────────────────────────────────
function CreatePollModal({
  onSend,
  onClose,
}: {
  onSend: (question: string, options: string[]) => void;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');

  const submit = () => {
    if (!question.trim()) return;
    const opts = [opt1.trim(), opt2.trim(), opt3.trim()].filter(Boolean);
    if (opts.length < 2) return;
    onSend(question.trim(), opts);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={18} color="#7C3AED" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--d-text)' }}>
              Create Group Poll
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--d-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--d-text)', display: 'block', marginBottom: 4 }}>
              Question
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Agree on Maize floor price at 1,200 UGX/kg?"
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
            <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--d-text)', display: 'block', marginBottom: 4 }}>
              Options
            </label>
            <input
              type="text"
              value={opt1}
              onChange={(e) => setOpt1(e.target.value)}
              placeholder="Option 1 (e.g. Yes, agree)"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--d-border)',
                fontSize: 12.5,
                background: 'var(--d-input-bg)',
                color: 'var(--d-input-text)',
                boxSizing: 'border-box',
                outline: 'none',
                marginBottom: 6,
              }}
            />
            <input
              type="text"
              value={opt2}
              onChange={(e) => setOpt2(e.target.value)}
              placeholder="Option 2 (e.g. No, wait for 1,350 UGX)"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--d-border)',
                fontSize: 12.5,
                background: 'var(--d-input-bg)',
                color: 'var(--d-input-text)',
                boxSizing: 'border-box',
                outline: 'none',
                marginBottom: 6,
              }}
            />
            <input
              type="text"
              value={opt3}
              onChange={(e) => setOpt3(e.target.value)}
              placeholder="Option 3 (Optional)"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--d-border)',
                fontSize: 12.5,
                background: 'var(--d-input-bg)',
                color: 'var(--d-input-text)',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <button
            onClick={submit}
            disabled={!question.trim() || !opt1.trim() || !opt2.trim()}
            style={{
              marginTop: 6,
              padding: '12px',
              borderRadius: 12,
              border: 'none',
              background: '#7C3AED',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Broadcast Poll to Group
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Share Photo Modal
// ─────────────────────────────────────────────────────────────
function SharePhotoModal({
  onSend,
  onClose,
}: {
  onSend: (url: string, caption: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');

  const SAMPLE_PHOTOS = [
    { label: 'Maize Harvest', url: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=600&q=80' },
    { label: 'Coffee Beans', url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80' },
    { label: 'Fresh Tomatoes', url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&q=80' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
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
          maxWidth: 420,
          border: '1px solid var(--d-border)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ImageIcon size={18} color="#0284C7" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--d-text)' }}>
              Share Harvest Photo
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--d-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--d-text)', display: 'block', marginBottom: 5 }}>
              Choose Sample Crop Photo or Paste Image URL
            </label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              {SAMPLE_PHOTOS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setUrl(p.url)}
                  style={{
                    flex: 1,
                    padding: '6px',
                    borderRadius: 8,
                    border: url === p.url ? '2px solid #0284C7' : '1px solid var(--d-border)',
                    background: 'var(--color-surface-2)',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--d-border)',
                fontSize: 12.5,
                background: 'var(--d-input-bg)',
                color: 'var(--d-input-text)',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--d-text)', display: 'block', marginBottom: 5 }}>
              Caption
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. First harvest from North Field ready for inspection"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid var(--d-border)',
                fontSize: 12.5,
                background: 'var(--d-input-bg)',
                color: 'var(--d-input-text)',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <button
            onClick={() => onSend(url, caption)}
            disabled={!url.trim()}
            style={{
              marginTop: 6,
              padding: '12px',
              borderRadius: 12,
              border: 'none',
              background: '#0284C7',
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Send Photo to Chat
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Organize Panel for Admin (Group Aggregation)
// ─────────────────────────────────────────────────────────────
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
        zIndex: 60,
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={18} color="#16A34A" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--d-text)' }}>
              Group Crop Aggregations
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--d-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 12.5, color: 'var(--d-muted)', margin: '0 0 16px', lineHeight: 1.45 }}>
          Member lots posted in group chat organized by crop type. Group leaders aggregate quantities into bulk listings for high-volume offtakers.
        </p>

        {error && <p style={{ fontSize: 12, color: '#EF4444', margin: '0 0 10px', fontWeight: 600 }}>{error}</p>}

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--d-text)', textTransform: 'capitalize' }}>
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
                    {publishing === c.cropType ? 'Publishing…' : 'Publish Bulk Lot'}
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
