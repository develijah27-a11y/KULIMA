'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export function useNotificationsRealtime(farmerId: string, onNew: (n: any) => void) {
  useEffect(() => {
    if (!farmerId) return;
    const channel = supabase
      .channel('notifications-' + farmerId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `farmer_id=eq.${farmerId}` }, (payload: any) => onNew(payload.new))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [farmerId, onNew]);
}
