'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

export default function AdminAlertClient() {
  const [type, setType] = useState('rain');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function send() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase.from as any)('notifications').insert({ farmer_id: user.id, type, title: title ?? '', body: body ?? '', sent_at: new Date().toISOString(), read: false });
    setLoading(false); setTitle(''); setBody('');
  }

  return (
    <div className="min-h-screen bg-soil">
      <main className="max-w-2xl mx-auto px-6 py-6 space-y-4">
        <Card>
          <CardHeader title="Send Alert" subtitle="Broadcast to farmers" />
          <div className="mt-4 space-y-3">
            <select value={type} onChange={e => setType(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-surface2 border border-surface2 text-cream text-sm">
              <option value="rain">Rain</option><option value="price">Price</option><option value="pest">Pest</option><option value="system">System</option>
            </select>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" required className="w-full px-3 py-2.5 rounded-xl bg-surface2 border border-surface2 text-cream text-sm placeholder:text-cream/25" />
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Message…" rows={3} className="w-full px-3 py-2.5 rounded-xl bg-surface2 border border-surface2 text-cream text-sm placeholder:text-cream/25" />
            <Button onClick={send} isLoading={loading} className="w-full">Send Alert</Button>
          </div>
        </Card>
      </main>
    </div>
  );
}