'use client';

import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AdminPricesClient() {
  const [crop, setCrop] = useState('maize');
  const [market, setMarket] = useState('');
  const [price, setPrice] = useState('');
  const [district, setDistrict] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cropType: crop, marketName: market, district, pricePerKg: parseFloat(price), source: 'admin' }),
    });
    if (res.ok) { setLoading(false); window.location.reload(); }
    else setLoading(false);
  }

  return (
    <div className="min-h-screen bg-soil">
      <main className="max-w-3xl mx-auto px-6 py-6 space-y-4">
        <Card>
          <CardHeader title="Upload Market Prices" subtitle="Add today's prices" />
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <select value={crop} onChange={e => setCrop(e.target.value)} className="px-3 py-2.5 rounded-xl bg-surface2 border border-surface2 text-cream text-sm">
                {['maize','beans','tomatoes','cassava','rice','coffee','groundnuts'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input value={market} onChange={e => setMarket(e.target.value)} placeholder="Market" required className="px-3 py-2.5 rounded-xl bg-surface2 border border-surface2 text-cream text-sm placeholder:text-cream/25" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input value={district} onChange={e => setDistrict(e.target.value)} placeholder="District" required className="px-3 py-2.5 rounded-xl bg-surface2 border border-surface2 text-cream text-sm placeholder:text-cream/25" />
              <input value={price} onChange={e => setPrice(e.target.value)} type="number" placeholder="Price UGX/kg" required className="px-3 py-2.5 rounded-xl bg-surface2 border border-surface2 text-cream text-sm" />
            </div>
            <Button type="submit" isLoading={loading} className="w-full">Upload Price</Button>
          </form>
        </Card>
      </main>
    </div>
  );
}