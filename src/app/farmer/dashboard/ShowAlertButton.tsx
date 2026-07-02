'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { showToast } from '@/components/ui/Toast';

export function ShowAlertButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('rain');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  const send = useCallback(async () => {
    if (!title.trim()) return;
    setLoading(true);
    const res = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, target: 'all', title, body }),
    });
    const data = await res.json().catch(() => ({ success: false }));
    if (data.success) {
      showToast('Alert sent to all farmers.', 'success');
      setOpen(false); setTitle(''); setBody('');
    } else {
      showToast('Failed to send alert.', 'error');
    }
    setLoading(false);
  }, [type, title, body]);

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)} className="mb-3">
        Quick Actions (Demo)
      </Button>
      {/* modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-soil/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-surface border border-surface2 rounded-2xl p-5 w-[92vw] max-w-sm space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-cream">Send Quick Alert</h3>
            <select value={type} onChange={e => setType(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface2 border border-surface2 text-cream text-sm">
              <option value="rain">Rain</option>
              <option value="price">Price</option><option value="pest">Pest</option>
            </select>
            <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface2 border border-surface2 text-cream text-sm placeholder:text-cream/25" />
            <textarea placeholder="Message…" value={body} onChange={e => setBody(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl bg-surface2 border border-surface2 text-cream text-sm placeholder:text-cream/25" />
            <Button onClick={send} isLoading={loading} className="w-full">Send</Button>
          </div>
        </div>
      )}
    </>
  );
}
