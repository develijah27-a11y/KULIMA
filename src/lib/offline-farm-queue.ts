'use client';

// Lets a farmer save a new farm record (GPS-walked boundary + details)
// while offline or on a connection too weak to reach the server, instead
// of just failing the save — the record sits in localStorage until the
// device is back online, then this same module replays it to /api/farms.
// Deliberately not built on a service worker (background sync would
// normally use one) — this app removed its service worker earlier after
// it caused navigation-hijacking bugs, so this queue runs as plain page
// JS instead: a bit less resilient (it only flushes while the app is
// actually open), but correct and simple.

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
  localStorage.setItem(KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

export function getQueuedFarms(): QueuedFarm[] {
  return readQueue();
}

export function onFarmQueueChanged(handler: () => void): () => void {
  window.addEventListener(CHANGED_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(CHANGED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function queueFarm(payload: Record<string, unknown>): QueuedFarm {
  const entry: QueuedFarm = {
    localId: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    payload,
    createdAt: new Date().toISOString(),
  };
  writeQueue([...readQueue(), entry]);
  return entry;
}

function removeFromQueue(localId: string) {
  writeQueue(readQueue().filter(f => f.localId !== localId));
}

// True network-level failure (no connection, DNS, etc.) vs. a normal
// HTTP error response — fetch() only throws for the former; the latter
// still resolves and should surface as a real validation/server error
// instead of silently being queued as if it were just offline.
function isNetworkFailure(err: unknown): boolean {
  return err instanceof TypeError;
}

export { isNetworkFailure };

// Replays every queued farm to /api/farms in order, stopping at the
// first network failure (the rest will retry on the next sync attempt)
// but continuing past a server-rejected record (bad data left behind
// from an old app version, say) so one bad entry can't jam the queue
// forever.
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
      if (json.success) {
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
