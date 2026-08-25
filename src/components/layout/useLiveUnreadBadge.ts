'use client';

import { useEffect, useState } from 'react';

export const UNREAD_COUNT_EVENT = 'cropify:unread-count';

export function useLiveUnreadBadge(initial: number | undefined) {
  const [count, setCount] = useState(initial ?? 0);

  useEffect(() => {
    if (initial !== undefined) {
      setCount(initial);
    }
  }, [initial]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ count: number; source?: string }>).detail;
      if (detail && typeof detail.count === 'number') {
        setCount(detail.count);
      }
    };
    window.addEventListener(UNREAD_COUNT_EVENT, handler);
    return () => window.removeEventListener(UNREAD_COUNT_EVENT, handler);
  }, []);

  return count;
}
