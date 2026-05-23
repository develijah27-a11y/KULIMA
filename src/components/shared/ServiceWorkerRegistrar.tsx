'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function ServiceWorkerRegistrar() {
  const router = useRouter();
  const registered = useRef(false);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV === 'development' ||
      registered.current
    ) {
      return;
    }

    registered.current = true;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // SW registered
          if (registration.waiting && registration.waiting.postMessage) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        })
        .catch(() => {
          // SW registration failed in dev — silent
        });
    }
  }, [router]);

  return null;
}
