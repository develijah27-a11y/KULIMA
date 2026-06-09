import { openDB, type IDBPDatabase } from 'idb';

export interface QueuedRecord {
  id?: number;
  table: string;
  method: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  retries: number;
}

export interface CacheEntry {
  key: string;
  data: unknown;
  updatedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB('kulima-offline', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('offline_queue')) {
          const queue = db.createObjectStore('offline_queue', {
            keyPath: 'id',
            autoIncrement: true,
          });
          queue.createIndex('by-timestamp', 'timestamp');
          queue.createIndex('by-table', 'table');
          queue.createIndex('by-status', 'status');
        }
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function queueRecord(
  table: string,
  payload: Record<string, unknown>,
  method: QueuedRecord['method'] = 'insert',
) {
  const db = await getDB();
  await db.add('offline_queue', {
    table,
    method,
    payload,
    timestamp: Date.now(),
    status: 'pending',
    retries: 0,
  } satisfies Omit<QueuedRecord, 'id'>);
}

export async function getPendingCount(): Promise<number> {
  try {
    const db = await getDB();
    return await db.countFromIndex('offline_queue', 'by-status', 'pending');
  } catch {
    return 0;
  }
}

export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;
  try {
    const db = await getDB();
    const pending = await db.getAllFromIndex('offline_queue', 'by-status', 'pending');

    for (const record of pending) {
      try {
        const res = await fetch(`/api/offline-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ table: record.table, method: record.method, payload: record.payload }),
        });
        if (res.ok) {
          await db.delete('offline_queue', record.id!);
          synced++;
        } else {
          await db.put('offline_queue', { ...record, status: 'failed', retries: record.retries + 1 });
          failed++;
        }
      } catch {
        await db.put('offline_queue', { ...record, status: 'failed', retries: record.retries + 1 });
        failed++;
      }
    }
  } catch {
    // IndexedDB not available (SSR or private mode)
  }
  return { synced, failed };
}

export async function setCache(key: string, data: unknown): Promise<void> {
  try {
    const db = await getDB();
    await db.put('cache', { key, data, updatedAt: Date.now() } satisfies CacheEntry);
  } catch {
    // ignore
  }
}

export async function getCache<T>(key: string): Promise<{ data: T; updatedAt: number } | null> {
  try {
    const db = await getDB();
    const entry = await db.get('cache', key) as CacheEntry | undefined;
    if (!entry) return null;
    return { data: entry.data as T, updatedAt: entry.updatedAt };
  } catch {
    return null;
  }
}
