'use client';

import { useEffect, useState } from 'react';

// The nav badge for "Notifications" is baked into server-rendered navItems at
// layout-load time and never changes again during the session (Next.js does
// not re-run the layout on client-side navigation between sibling pages). The
// bell in TopBar and the various /*/notifications pages dispatch this event
// whenever the true unread count changes so the sidebar/mobile-nav badge for
// that one item can stay in sync without a full page reload.
export const UNREAD_COUNT_EVENT = 'agrinova:unread-count';

export function useLiveUnreadBadge(initial: number | undefined) {
  const [count, setCount] = useState(initial ?? 0);

  useEffect(() => {
    const handler = (e: Event) => setCount((e as CustomEvent<{ count: number; source?: string }>).detail.count);
    window.addEventListener(UNREAD_COUNT_EVENT, handler);
    return () => window.removeEventListener(UNREAD_COUNT_EVENT, handler);
  }, []);

  return count;
}
