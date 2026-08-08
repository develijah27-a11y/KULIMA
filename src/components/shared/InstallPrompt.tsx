'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Download, Share } from 'lucide-react';

const DISMISS_KEY = 'cropify-install-dismissed-at';
const SNOOZE_DAYS = 7;

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

function isIos() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
}

function wasRecentlyDismissed() {
  try {
    const at = localStorage.getItem(DISMISS_KEY);
    if (!at) return false;
    return Date.now() - Number(at) < SNOOZE_DAYS * 86400000;
  } catch { return false; }
}

// Prompts any first-time web visitor to install Cropify as an app — this is
// a PWA (manifest.json + service worker already registered), but Chrome/Edge
// only offer the native install banner if a site calls event.prompt() itself
// after capturing `beforeinstallprompt`; without this component the browser
// fires the event and just silently drops it since nothing was listening.
// iOS Safari never fires that event at all, so it gets a manual "Add to
// Home Screen" instruction banner instead.
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasRecentlyDismissed()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS never fires beforeinstallprompt — show the manual-steps banner
    // instead, after a short delay so it doesn't compete with first paint.
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIos()) {
      iosTimer = setTimeout(() => { setShowIosHint(true); setVisible(true); }, 2500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }, [deferredPrompt, dismiss]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install Cropify"
      style={{
        position: 'fixed', left: 12, right: 12, bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        zIndex: 9997, maxWidth: 420, margin: '0 auto',
        background: 'var(--color-surface)', border: '1px solid var(--color-border-mid)',
        borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
        padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 900, fontSize: 16, fontFamily: 'Georgia, serif',
      }}>A</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>Install Cropify</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
          {showIosHint
            ? <>Tap <Share size={11} style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 2px' }} /> then "Add to Home Screen" for the full app experience.</>
            : 'Add it to your home screen for faster access, offline support, and push alerts.'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        {!showIosHint && (
          <button
            onClick={install}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9,
              border: 'none', background: 'var(--color-primary)', color: '#fff',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <Download size={13} /> Install
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            padding: showIosHint ? '7px 14px' : '4px', borderRadius: 9,
            border: showIosHint ? '1px solid var(--color-border-mid)' : 'none',
            background: 'transparent', color: 'var(--color-text-muted)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {showIosHint ? 'Not now' : <X size={14} />}
        </button>
      </div>
    </div>
  );
}
