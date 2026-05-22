'use client';

import Link from 'next/link';
import type { Database } from '@/lib/database.types';

type Farm = Database['public']['Tables']['farms']['Row'];

interface FarmCardProps {
  farm: Farm;
  onDelete?: (id: string) => void;
}

export function FarmCard({ farm, onDelete }: FarmCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{farm.name}</h3>
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
          className="flex-1 text-center bg-green-600 text-white py-2 rounded-md hover:bg-green-700"
        >
          View Details
        </Link>
        {onDelete && (
          <button
            onClick={() => onDelete(farm.id)}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}