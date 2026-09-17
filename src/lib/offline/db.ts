import { type IDBPDatabase, type DBSchema } from 'idb';
import { getDB } from '@/lib/db';

export interface CropifyOfflineDB extends DBSchema {
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
      id: string;
      farmerId: string;
      type: string;
      title: string;
      body: string;
      read: boolean;
      sentAt: number;
    };
    indexes: { 'by-farmer': string };
  };
  listings: {
    key: string;
    value: { id: string; data: unknown; cachedAt: number };
    indexes: { 'by-status': string };
  };
}

export async function getOfflineDB(): Promise<IDBPDatabase<CropifyOfflineDB>> {
  const db = await getDB();
  return db as unknown as IDBPDatabase<CropifyOfflineDB>;
}
