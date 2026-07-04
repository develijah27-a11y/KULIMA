'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, ArrowRight, Clock, X } from 'lucide-react';
import { ICON_MAP } from '@/components/layout/Sidebar';

export interface CommandItem {
  href: string;
  label: string;
  icon: string;
  section?: string;
}

interface CommandPaletteProps {
  items: CommandItem[];
}

const RECENT_KEY = 'agrinova-cmd-recent';
const MAX_RECENT = 5;

function getRecent(): CommandItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}

function saveRecent(item: CommandItem) {
  try {
    const prev = getRecent().filter(r => r.href !== item.href);
    localStorage.setItem(RECENT_KEY, JSON.stringify([item, ...prev].slice(0, MAX_RECENT)));
  } catch {}
}

export function CommandPalette({ items }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const [recent, setRecent] = useState<CommandItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Close on navigation
  useEffect(() => { setOpen(false); }, [pathname]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => {
          if (!prev) setRecent(getRecent());
          return !prev;
        });
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const filtered = query.trim()
    ? items.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.section?.toLowerCase().includes(query.toLowerCase())
      )
    : recent;

  const navigate = useCallback((item: CommandItem) => {
    saveRecent(item);
    setRecent(getRecent());
    setOpen(false);
    router.push(item.href);
  }, [router]);

  // Arrow key navigation
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && filtered[cursor]) navigate(filtered[cursor]);
  };

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '80px 16px 16px',
      }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          background: 'var(--color-surface)',
          borderRadius: 16,
          border: '1px solid var(--color-border-mid)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.30), 0 4px 16px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <Search size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={handleKey}
            placeholder="Search pages…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--color-text)',
              fontFamily: 'var(--font-body)',
            }}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={() => setOpen(false)}
            style={{
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: 'var(--color-text-hint)', padding: 4, borderRadius: 6,
              minHeight: 'unset', minWidth: 'unset',
            }}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          style={{ maxHeight: 340, overflowY: 'auto', padding: '6px 8px 8px' }}
        >
          {filtered.length === 0 && (
            <p style={{ padding: '16px 8px', fontSize: 13, color: 'var(--color-text-hint)', textAlign: 'center' }}>
              {query ? 'No pages found' : 'Start typing to search…'}
            </p>
          )}

          {!query && recent.length > 0 && (
            <p style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: 'var(--color-text-hint)',
              padding: '6px 8px 4px',
            }}>
              Recent
            </p>
          )}

          {filtered.map((item, idx) => {
            const Icon = ICON_MAP[item.icon];
            const active = cursor === idx;
            return (
              <button
                key={item.href}
                data-idx={idx}
                onClick={() => navigate(item)}
                onMouseEnter={() => setCursor(idx)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 10px',
                  borderRadius: 10,
                  border: 'none',
                  background: active ? 'var(--color-surface-2)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 60ms ease',
                  minHeight: 'unset', minWidth: 'unset',
                }}
              >
                <span
                  style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: active ? 'var(--color-primary-bg)' : 'var(--color-surface-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {Icon
                    ? (
                      <span style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-muted)', display: 'flex' }}>
                        <Icon size={13} />
                      </span>
                    )
                    : (
                      <span style={{ color: 'var(--color-text-hint)', display: 'flex' }}>
                        <Clock size={13} />
                      </span>
                    )
                  }
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3 }}>
                    {item.label}
                  </p>
                  {item.section && (
                    <p style={{ fontSize: 10, color: 'var(--color-text-hint)', lineHeight: 1.3 }}>
                      {item.section}
                    </p>
                  )}
                </div>
                {active && <ArrowRight size={13} style={{ color: 'var(--color-text-hint)', flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            padding: '8px 16px',
            display: 'flex',
            gap: 14,
          }}
        >
          {[
            { key: '↑↓', label: 'navigate' },
            { key: '↵', label: 'open' },
            { key: 'esc', label: 'close' },
          ].map(({ key, label }) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd
                style={{
                  fontSize: 9, fontWeight: 700,
                  padding: '2px 5px', borderRadius: 4,
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border-mid)',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {key}
              </kbd>
              <span style={{ fontSize: 10, color: 'var(--color-text-hint)' }}>{label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
