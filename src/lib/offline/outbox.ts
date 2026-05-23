import { getOfflineDB } from './db';
import { nanoid } from 'nanoid';

type OutboxAction = { type: string; payload: unknown };

export async function queueAction(action: OutboxAction) {
  const db = await getOfflineDB();
  await db.add('outbox', { id: nanoid(), ...action, createdAt: Date.now(), retries: 0 });
}

export async function syncOutbox(): Promise<{ success: number; failed: number }> {
  const db = await getOfflineDB();
  const pending = await db.getAll('outbox');
  if (!pending.length) return { success: 0, failed: 0 };

  let success = 0, failed = 0;
 await Promise.allSettled(
    pending.map(async (item) => {
      try {
        await executeAction(item);
        await db.delete('outbox', item.id);
        success++;
      } catch {
        await db.put('outbox', { ...item, retries: (item.retries ?? 0) + 1 });
        failed++;
      }
    })
  );
  return { success, failed };
}

async function executeAction(item: any) {
  const { type, payload } = item;
  const methodMap: Record<string, string> = {
    CREATE_LISTING: 'POST /api/listings',
    ACCEPT_OFFER: 'PATCH /api/offers',
    POST_OFFER: 'POST /api/offers',
  };
  const [method, path] = (methodMap[type] ?? '').split(' ') as [string, string];
  const res = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`${type} failed: ${res.status}`);
}
