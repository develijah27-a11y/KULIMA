'use client';

import { Card } from '@/components/ui/Card';
import { PriceTag } from '@/components/ui/PriceTag';
import type { MarketPrice } from '@/types/domain';

export function PriceTicker({
  prices,
  loading,
}: {
  prices: MarketPrice[];
  loading?: boolean;
}) {
  if (loading) {
    return <div className="space-y-2">{[1, 2, 3, 4].map((i) => (
      <div key={i} className="h-12 rounded-xl skeleton" />
    ))}</div>;
  }

  const sorted = [...prices].sort(
    (a, b) => Math.abs(b.changePercent ?? 0) - Math.abs(a.changePercent ?? 0)
  );

  return (
    <Card>
      <p className="text-xs text-cream/40 font-semibold tracking-wider uppercase mb-3">
        Live Price Changes
      </p>
      <div className="space-y-1.5">
        {sorted.slice(0, 4).map((p) => (
          <div
            key={p.cropType}
            className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-soil/40 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-cream">{p.cropType}</p>
              <p className="text-[10px] text-cream/35">{p.marketName}</p>
            </div>
            <PriceTag
              value={p.pricePerKg}
              changePercent={p.changePercent}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
