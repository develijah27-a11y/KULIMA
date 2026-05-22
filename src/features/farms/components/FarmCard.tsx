'use client';

import Link from 'next/link';
import type { Database } from '@/lib/database.types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type Farm = Database['public']['Tables']['farms']['Row'];

interface FarmCardProps {
  farm: Farm;
  onDelete?: (id: string) => void;
}

export function FarmCard({ farm, onDelete }: FarmCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{farm.name}</h3>
          <p className="text-gray-600">{farm.location}</p>
        </div>
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
          {farm.farm_type || 'Mixed'}
        </span>
      </div>

      {farm.size_hectares && (
        <p className="text-sm text-gray-600 mb-4">
          Size: {farm.size_hectares} hectares
        </p>
      )}

      <div className="flex gap-2">
        <Link
          href={`/farms/${farm.id}`}
          className="flex-1 text-center bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          View Details
        </Link>
        {onDelete && (
          <Button variant="ghost" onClick={() => onDelete(farm.id)}>
            Delete
          </Button>
        )}
      </div>
    </Card>
  );
}