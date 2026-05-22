'use client';

import { FarmCard } from './FarmCard';
import { useFarms } from '../hooks/useFarms';

export function FarmList() {
  const { farms, loading, deleteFarm } = useFarms();

  if (loading) {
    return <div className="text-center py-8">Loading farms...</div>;
  }

  if (farms.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 mb-4">No farms found. Create your first farm!</p>
      </div>
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