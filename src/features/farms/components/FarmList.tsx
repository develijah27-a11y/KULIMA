'use client';

import { FarmCard } from './FarmCard';
import { useFarms } from '../hooks/useFarms';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function FarmList() {
  const { farms, loading, deleteFarm } = useFarms();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded mb-4 w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded mb-4"></div>
            <div className="flex gap-2">
              <div className="flex-1 h-10 bg-gray-200 rounded"></div>
              <div className="w-20 h-10 bg-gray-200 rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (farms.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">No farms found. Create your first farm!</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {farms.map((farm) => (
        <FarmCard key={farm.id} farm={farm} onDelete={deleteFarm} />
      ))}
    </div>
  );
}