'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PriceTag } from '@/components/ui/PriceTag';

const CROP_TYPES = [
  'maize', 'beans', 'tomatoes', 'cassava', 'rice',
  'coffee', 'groundnuts', 'sweet_potatoes', 'bananas', 'sunflower',
] as const;

export function CreateListingForm({ farmerDistrict }: { farmerDistrict?: string }) {
  const router = useRouter();
  const [crop, setCrop] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [availableFrom, setAvailableFrom] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cropType: crop,
        quantityKg: parseFloat(qty),
        askingPrice: parseFloat(price),
        availableFrom,
        district: farmerDistrict ?? '',
        notes,
      }),
    });

    if (res.ok) {
      router.push('/farmer/marketplace');
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <Card variant="surface">
      <CardHeader title="Post a Listing" subtitle="List your produce for buyers to find" />

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold text-cream/60 mb-1">Crop *</label>
          <select
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-xl bg-surface2 border border-surface2 text-cream text-sm focus:ring-2 focus:ring-sprout"
          >
            <option value="" disabled>Select crop</option>
            {CROP_TYPES.map((c) => (
              <option key={c} value={c}>
                {String.fromCodePoint(0x1F300 + c.charCodeAt(0) * 13)} {c.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-cream/60 mb-1">Quantity (kg) *</label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
              min="1"
              placeholder="100"
              className="w-full px-3 py-2.5 rounded-xl bg-surface2 border border-surface2 text-cream text-sm focus:ring-2 focus:ring-sprout placeholder:text-cream/25"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-cream/60 mb-1">Asking price/kg (UGX) *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min="0"
              placeholder="1400"
              className="w-full px-3 py-2.5 rounded-xl bg-surface2 border border-surface2 text-cream text-sm focus:ring-2 focus:ring-sprout placeholder:text-cream/25"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-cream/60 mb-1">Available from</label>
          <input
            type="date"
            value={availableFrom}
            onChange={(e) => setAvailableFrom(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-surface2 border border-surface2 text-cream text-sm focus:ring-2 focus:ring-sprout"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-cream/60 mb-1">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 rounded-xl bg-surface2 border border-surface2 text-cream text-sm focus:ring-2 focus:ring-sprout resize-none placeholder:text-cream/25"
            placeholder="Quality, organic, delivery options…"
          />
        </div>

        <Button type="submit" className="w-full mt-2" isLoading={loading}>
          Post Listing
        </Button>
      </form>
    </Card>
  );
}
