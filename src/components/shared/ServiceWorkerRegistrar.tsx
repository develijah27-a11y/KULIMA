'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV === 'development'
    ) return;

    // Purge any stale navigation caches from previous builds
    if ('caches' in window) {
      caches.keys().then(keys => {
        for (const k of keys) {
          if (k.includes('pages') || k.includes('rsc') || k.includes('offline') || k === 'cropify-pages') {
            caches.delete(k);
          }
        }
      }).catch(() => {});
    }

    // Register after load so SW registration never blocks the critical path
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          reg.addEventListener('updatefound', () => {
            const incoming = reg.installing;
            if (!incoming) return;
            incoming.addEventListener('statechange', () => {
              if (incoming.state === 'installed' && navigator.serviceWorker.controller) {
                incoming.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          });
        })
        .catch(() => { /* SW not supported or blocked — silent */ });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
