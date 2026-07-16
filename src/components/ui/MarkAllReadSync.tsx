'use client';

import { useEffect } from 'react';
import { UNREAD_COUNT_EVENT } from '@/components/layout/useLiveUnreadBadge';

// Drop this into any page that marks all of the user's notifications read as
// part of its server-side render (the /*/notifications list pages). Without
// it, the sidebar/mobile-nav badge and the TopBar bell — both of which cache
// the unread count client-side — would keep showing the old number until a
// full page reload, even though the database is already up to date.
export function MarkAllReadSync() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(UNREAD_COUNT_EVENT, { detail: { count: 0 } }));
  }, []);
  return null;
}
