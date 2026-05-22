'use client';

import { DiseaseScanCard } from './DiseaseScanCard';
import { useDiseaseScans } from '../hooks/useDiseaseScans';

export function DiseaseScanList({ farmId }: { farmId?: string }) {
  const { scans, loading } = useDiseaseScans(farmId);

  if (loading) {
    return <div className="text-center py-8">Loading disease scans...</div>;
  }

  if (scans.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No disease scans yet. Upload your first crop image!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {scans.map((scan) => (
        <DiseaseScanCard key={scan.id} scan={scan} />
      ))}
    </div>
  );
}