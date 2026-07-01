'use client';

import { Leaf } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PriceTag } from '@/components/ui/PriceTag';
import { getCropColor } from '@/lib/crop-photos';
import type { Listing, Offer, Farmer } from '@/types/domain';

export function ListingCard({
  listing,
  onViewOffers,
  isFarmer = false,
}: {
  listing: Listing & { farmerName?: string; offerCount?: number };
  onViewOffers?: () => void;
  isFarmer?: boolean;
}) {
  const statusVariant: Record<string, 'green' | 'gold' | 'neutral'> = {
    active: 'green',
    pending_sync: 'gold',
    sold: 'neutral',
    expired: 'neutral',
  };

  const statusLabel: Record<string, string> = {
    active: 'Available',
    pending_sync: 'Pending',
    sold: 'Sold',
    expired: 'Expired',
  };

  return (
    <Card key={listing.id} variant="elevated">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <Leaf size={20} style={{ color: getCropColor(listing.cropType), flexShrink: 0 }} />
          <div>
            <p className="text-sm font-semibold text-cream capitalize">{listing.cropType}</p>
            {listing.farmerName && (
              <p className="text-[11px] text-cream/35">{listing.farmerName}</p>
            )}
          </div>
        </div>
        <Badge variant={statusVariant[listing.status] ?? 'neutral'}>
          {listing.offerCount
            ? `${listing.offerCount} offers`
            : statusLabel[listing.status] ?? listing.status}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-cream/40">Quantity</p>
          <p className="text-cream font-semibold">{listing.quantityKg} kg</p>
        </div>
        <div className="text-right">
          <p className="text-cream/40">Available</p>
          <p className="text-cream font-semibold">
            {new Date(listing.availableFrom).toLocaleDateString('en-UG', {
              month: 'short', day: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <PriceTag value={listing.askingPrice} size="md" />
        {isFarmer && listing.offerCount && listing.offerCount > 0 && (
          <Button size="sm" variant="outline" onClick={onViewOffers}>
            View Offers
          </Button>
        )}
      </div>
    </Card>
  );
}
