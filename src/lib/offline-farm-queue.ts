'use client';

// Lets a farmer save a new farm record (GPS-walked boundary + details)
// while offline or on a connection too weak to reach the server, instead
// of just failing the save.
// Records are backed in IndexedDB ('farms' & 'offline_queue') and mirrored
// in localStorage for instant backwards compatibility.

import { queueRecord, registerBackgroundSync } from '@/lib/db';

export interface QueuedFarm {
  localId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

const KEY = 'cropify-offline-farm-queue';
const CHANGED_EVENT = 'cropify:farm-queue-changed';

function readQueue(): QueuedFarm[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedFarm[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

export function getQueuedFarms(): QueuedFarm[] {
  return readQueue();
}

export function onFarmQueueChanged(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGED_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(CHANGED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function queueFarm(payload: Record<string, unknown>): QueuedFarm {
  const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const entry: QueuedFarm = {
    localId,
    payload,
    createdAt: new Date().toISOString(),
  };

  // 1. Mirror in localStorage for instant synchronous read
  writeQueue([...readQueue(), entry]);

  // 2. Queue in unified IndexedDB offline_queue
  queueRecord('farms', payload, 'insert').catch(() => {});

  // 3. Register background sync with Service Worker
  registerBackgroundSync();

  return entry;
}

function removeFromQueue(localId: string) {
  writeQueue(readQueue().filter(f => f.localId !== localId));
}

function isNetworkFailure(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof Error && err.message.toLowerCase().includes('failed to fetch'));
}

export { isNetworkFailure };

// Replays queued farms to /api/farms in order
export async function syncQueuedFarms(): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  for (const entry of readQueue()) {
    try {
      const res = await fetch('/api/farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry.payload),
      });
      const json = await res.json().catch(() => ({ success: false }));
      if (json.success || res.ok) {
        removeFromQueue(entry.localId);
        synced++;
      } else {
        failed++;
      }
    } catch (err) {
      if (isNetworkFailure(err)) break;
      failed++;
    }
  }

  return { synced, failed };
}
