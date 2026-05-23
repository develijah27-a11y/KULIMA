'use client';

import type { Notification } from '@/types/domain';

export function useNotifications(farmerId?: string) {
  // Placeholder — swap with real fetch in production
  // const [notifications, setNotifications] = useState<Notification[]>([])
  // useEffect(() => { if (farmerId) fetch(...) }, [farmerId])
  // return { notifications, unreadCount: ... }

  return {
    notifications: [] as Notification[],
    unreadCount: 0,
    markAllRead: async () => {},
  };
}
