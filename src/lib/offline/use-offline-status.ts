'use client';

import { useState, useSyncExternalStore } from 'react';

interface OfflineState {
  isOffline: boolean;
  isStale: boolean;
}
const emptyState: OfflineState = { isOffline: false, isStale: false };
const listeners = new Set<() => void>();

function getSnapshot(): OfflineState {
  return {
    isOffline: !navigator.onLine,
    isStale: false,
  };
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener('offline', () => { listeners.forEach(l => l()); });
  window.addEventListener('online', () => { listeners.forEach(l => l()); });
  return () => {
    listeners.delete(cb);
    window.removeEventListener('offline', () => {});
    window.removeEventListener('online', () => {});
  };
}

export function useOfflineStatus(): OfflineState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
