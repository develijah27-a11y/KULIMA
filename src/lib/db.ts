import { openDB, type IDBPDatabase } from 'idb';

export interface QueuedRecord {
  id?: number;
  table: string;
  method: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  retries: number;
  error?: string;
}

export interface CacheEntry {
  key: string;
  data: unknown;
  updatedAt: number;
}

export interface CachedFarm {
  id: string;
  name: string;
  location?: string | null;
  district?: string | null;
  size_hectares?: number | null;
  farm_type?: string | null;
  crop_types?: string[] | null;
  boundary?: { coordinates: number[][][] } | null;
  is_active?: boolean;
  is_offline_pending?: boolean;
  updatedAt: number;
}

export interface CachedExpense {
  id: string;
  category: string;
  description: string;
  amount_ugx: number;
  quantity?: number | null;
  unit?: string | null;
  crop_type?: string | null;
  season: string;
  expense_date: string;
  notes?: string | null;
  farm_id?: string | null;
  is_offline_pending?: boolean;
  updatedAt: number;
}

export interface CachedDiseaseScan {
  id: string;
  diseaseName: string;
  confidence: number;
  severity: 'high' | 'medium' | 'low';
  affectedPart: string;
  symptoms: string[];
  treatment: string[];
  prevention: string[];
  urgency?: string;
  cropType: string;
  imageUrl?: string;
  createdAt: number;
  is_offline_pending?: boolean;
}

const DB_NAME = 'kulima-offline';
const DB_VERSION = 3;
const QUEUE_CHANGED_EVENT = 'cropify:queue-changed';

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Queue for offline mutations
        if (!db.objectStoreNames.contains('offline_queue')) {
          const queue = db.createObjectStore('offline_queue', {
            keyPath: 'id',
            autoIncrement: true,
          });
          queue.createIndex('by-timestamp', 'timestamp');
          queue.createIndex('by-table', 'table');
          queue.createIndex('by-status', 'status');
        }

        // Generic key-value cache
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'key' });
        }

        // Dedicated offline stores added in v3
        if (!db.objectStoreNames.contains('farms')) {
          const farms = db.createObjectStore('farms', { keyPath: 'id' });
          farms.createIndex('by-updated', 'updatedAt');
        }

        if (!db.objectStoreNames.contains('expenses')) {
          const expenses = db.createObjectStore('expenses', { keyPath: 'id' });
          expenses.createIndex('by-date', 'expense_date');
          expenses.createIndex('by-season', 'season');
        }

        if (!db.objectStoreNames.contains('disease_history')) {
          const disease = db.createObjectStore('disease_history', { keyPath: 'id' });
          disease.createIndex('by-created', 'createdAt');
          disease.createIndex('by-crop', 'cropType');
        }

        // Legacy compatibility stores (from src/lib/offline/db.ts)
        if (!db.objectStoreNames.contains('outbox')) {
          const outbox = db.createObjectStore('outbox', { keyPath: 'id' });
          outbox.createIndex('by-type', 'type');
        }
        if (!db.objectStoreNames.contains('farmer')) {
          db.createObjectStore('farmer', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('prices')) {
          const prices = db.createObjectStore('prices', { keyPath: 'cropType' });
          prices.createIndex('by-crop', 'cropType');
        }
        if (!db.objectStoreNames.contains('weather')) {
          db.createObjectStore('weather', { keyPath: 'locationKey' });
        }
        if (!db.objectStoreNames.contains('notifications')) {
          const notifs = db.createObjectStore('notifications', { keyPath: 'id' });
          notifs.createIndex('by-farmer', 'farmerId');
        }
        if (!db.objectStoreNames.contains('listings')) {
          const listings = db.createObjectStore('listings', { keyPath: 'id' });
          listings.createIndex('by-status', 'data.status');
        }
      },
    });
  }
  return dbPromise;
}

function notifyQueueChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(QUEUE_CHANGED_EVENT));
  }
}

export function onQueueChanged(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(QUEUE_CHANGED_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(QUEUE_CHANGED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export async function queueRecord(
  table: string,
  payload: Record<string, unknown>,
  method: QueuedRecord['method'] = 'insert',
): Promise<number | undefined> {
  try {
    const db = await getDB();
    const id = await db.add('offline_queue', {
      table,
      method,
      payload,
      timestamp: Date.now(),
      status: 'pending',
      retries: 0,
    } satisfies Omit<QueuedRecord, 'id'>);

    notifyQueueChanged();
    registerBackgroundSync();
    return id as number;
  } catch (err) {
    console.error('[offline-queue] Failed to queue record:', err);
    return undefined;
  }
}

export async function getPendingCount(): Promise<number> {
  try {
    const db = await getDB();
    const queuePending = await db.countFromIndex('offline_queue', 'by-status', 'pending');
    return queuePending;
  } catch {
    return 0;
  }
}

export async function getPendingRecords(): Promise<QueuedRecord[]> {
  try {
    const db = await getDB();
    return await db.getAllFromIndex('offline_queue', 'by-status', 'pending');
  } catch {
    return [];
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
        let res: Response;

        // Dedicated routing for farm creations
        if (record.table === 'farms') {
          res = await fetch('/api/farms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record.payload),
          });
        } else {
          // Standard /api/offline-sync endpoint
          res = await fetch('/api/offline-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table: record.table,
              method: record.method,
              payload: record.payload,
            }),
          });
        }

        if (res.ok) {
          await db.delete('offline_queue', record.id!);
          synced++;
        } else {
          const errText = await res.text().catch(() => 'Sync rejected');
          await db.put('offline_queue', {
            ...record,
            status: 'failed',
            retries: record.retries + 1,
            error: errText.slice(0, 200),
          });
          failed++;
        }
      } catch (err) {
        // True network drop
        await db.put('offline_queue', {
          ...record,
          status: 'failed',
          retries: record.retries + 1,
          error: err instanceof Error ? err.message : 'Network failure',
        });
        failed++;
      }
    }

    if (synced > 0 || failed > 0) {
      notifyQueueChanged();
    }
  } catch (e) {
    console.warn('[flushQueue] IndexedDB error:', e);
  }

  return { synced, failed };
}

// ── Generic Cache ──────────────────────────────────────────────────────────

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
    const entry = (await db.get('cache', key)) as CacheEntry | undefined;
    if (!entry) return null;
    return { data: entry.data as T, updatedAt: entry.updatedAt };
  } catch {
    return null;
  }
}

// ── Farms Offline Cache ───────────────────────────────────────────────────

export async function cacheFarms(farms: any[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('farms', 'readwrite');
    for (const farm of farms) {
      if (!farm?.id) continue;
      await tx.store.put({
        ...farm,
        updatedAt: Date.now(),
      });
    }
    await tx.done;
  } catch (e) {
    console.warn('[cacheFarms] Failed to cache farms:', e);
  }
}

export async function getCachedFarms(): Promise<CachedFarm[]> {
  try {
    const db = await getDB();
    return await db.getAll('farms');
  } catch {
    return [];
  }
}

// ── Farm Expenses Offline Cache ───────────────────────────────────────────

export async function cacheExpenses(expenses: any[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('expenses', 'readwrite');
    for (const exp of expenses) {
      if (!exp?.id) continue;
      await tx.store.put({
        ...exp,
        updatedAt: Date.now(),
      });
    }
    await tx.done;
  } catch (e) {
    console.warn('[cacheExpenses] Failed to cache expenses:', e);
  }
}

export async function getCachedExpenses(): Promise<CachedExpense[]> {
  try {
    const db = await getDB();
    return await db.getAll('expenses');
  } catch {
    return [];
  }
}

export async function saveLocalExpense(expense: CachedExpense): Promise<void> {
  try {
    const db = await getDB();
    await db.put('expenses', {
      ...expense,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.warn('[saveLocalExpense] Failed to save local expense:', e);
  }
}

// ── Plant Disease History Offline Cache ───────────────────────────────────

export async function cacheDiseaseScan(scan: CachedDiseaseScan): Promise<void> {
  try {
    const db = await getDB();
    await db.put('disease_history', scan);
  } catch (e) {
    console.warn('[cacheDiseaseScan] Failed to cache scan:', e);
  }
}

export async function getCachedDiseaseScans(): Promise<CachedDiseaseScan[]> {
  try {
    const db = await getDB();
    const scans = await db.getAll('disease_history');
    return scans.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

// ── Service Worker Background Sync Registration ──────────────────────────

export function registerBackgroundSync() {
  if (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'SyncManager' in window
  ) {
    navigator.serviceWorker.ready
      .then((reg) => {
        return (reg as any).sync?.register('cropify-sync');
      })
      .catch(() => {
        // Background sync not allowed or unsupported
      });
  }
}
