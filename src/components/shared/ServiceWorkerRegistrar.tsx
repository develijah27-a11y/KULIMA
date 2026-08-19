'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Purge all legacy cache storage
    if ('caches' in window) {
      caches.keys().then(keys => {
        for (const k of keys) {
          caches.delete(k);
        }
      }).catch(() => {});
    }

    // Unregister legacy Service Workers to prevent navigation hijacking & 'page couldn't load' crashes
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const reg of registrations) {
          reg.unregister();
        }
      }).catch(() => {});
    }
  }, []);

  return null;
}
