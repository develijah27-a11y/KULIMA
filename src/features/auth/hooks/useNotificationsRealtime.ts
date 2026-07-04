'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export function useNotificationsRealtime(userId: string, onNew: (n: any) => void) {
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('notifications-' + userId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload: any) => onNew(payload.new))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, onNew]);
}
