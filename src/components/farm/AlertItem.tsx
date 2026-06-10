'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types/domain';

const dotColors: Record<string, string> = {
  rain: 'bg-green-400', price: 'bg-green-600', pest: 'bg-green-900', offer: 'bg-green-500', loan: 'bg-green-700',
};

const timeAgo = (epochMs: number) => {
  const diff = Date.now() - epochMs;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

export function AlertItem({ alert }: { alert: Notification }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-surface2/60 last:border-none">
      <span className={cn('mt-1.5 h-2 w-2 rounded-full flex-shrink-0', dotColors[alert.type] ?? 'bg-cream/40')} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-cream truncate">{alert.title}</p>
        <p className="text-xs text-cream/40 mt-0.5 line-clamp-1">{alert.body}</p>
      </div>
      <span className="text-[10px] text-cream/25 flex-shrink-0">{timeAgo(new Date(alert.sentAt).getTime())}</span>
    </div>
  );
}

export function AlertList({ alerts }: { alerts: Notification[] }) {
  if (alerts.length === 0) {
    return <p className="text-sm text-cream/30 py-6 text-center">No notifications yet</p>;
  }
  return (
    <Card>
      <p className="text-xs text-cream/40 font-semibold tracking-wider uppercase mb-2">Smart Alerts</p>
      <div role="list" aria-label="Notifications">
        {alerts.map((a) => <AlertItem key={a.id} alert={a} />)}
      </div>
    </Card>
  );
}
