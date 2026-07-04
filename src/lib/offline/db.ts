import { openDB, DBSchema, type IDBPDatabase } from 'idb';

interface AgriNovaOfflineDB extends DBSchema {
  outbox: {
    key: string;
    value: {
      id: string;
      type: string;
      payload: unknown;
      createdAt: number;
      retries: number;
    };
    indexes: { 'by-type': string };
  };
  farmer: {
    key: string;
    value: { id: string; data: unknown; cachedAt: number };
  };
  prices: {
    key: string;
    value: { cropType: string; prices: unknown[]; cachedAt: number };
    indexes: { 'by-crop': string };
  };
  weather: {
    key: string;
    value: { locationKey: string; data: unknown; cachedAt: number };
  };
  notifications: {
    key: string;
    value: {
      id: string; farmerId: string; type: string;
      title: string; body: string; read: boolean; sentAt: number;
    };
    indexes: { 'by-farmer': string };
  };
  listings: {
    key: string;
    value: { id: string; data: unknown; cachedAt: number };
    indexes: { 'by-status': string };
  };
}

let dbInstance: IDBPDatabase<AgriNovaOfflineDB> | null = null;

export async function getOfflineDB(): Promise<IDBPDatabase<AgriNovaOfflineDB>> {
  if (dbInstance) return dbInstance;
  // NOTE: keep the physical IndexedDB name 'kulima-offline' unchanged — renaming it
  // would orphan any farmer's already-queued offline outbox actions (unsynced data).
  dbInstance = await openDB<AgriNovaOfflineDB>('kulima-offline', 1, {
    upgrade(db) {
      const outbox = db.createObjectStore('outbox', { keyPath: 'id' });
      outbox.createIndex('by-type', 'type');
      db.createObjectStore('farmer', { keyPath: 'id' });
      const prices = db.createObjectStore('prices', { keyPath: 'cropType' });
      prices.createIndex('by-crop', 'cropType');
      db.createObjectStore('weather', { keyPath: 'locationKey' });
      const notifs = db.createObjectStore('notifications', { keyPath: 'id' });
      notifs.createIndex('by-farmer', 'farmerId');
      const listings = db.createObjectStore('listings', { keyPath: 'id' });
      listings.createIndex('by-status', 'data.status');
    },
  });
  return dbInstance;
}
