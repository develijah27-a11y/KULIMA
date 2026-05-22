'use client';

import Image from 'next/image';
import type { Database } from '@/lib/database.types';

type DiseaseScan = Database['public']['Tables']['disease_scans']['Row'];

interface DiseaseScanCardProps {
  scan: DiseaseScan;
}

export function DiseaseScanCard({ scan }: DiseaseScanCardProps) {
  const getSeverityColor = () => {
    if (!scan.confidence_score) return 'gray';
    if (scan.confidence_score >= 80) return 'red';
    if (scan.confidence_score >= 50) return 'orange';
    return 'yellow';
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {scan.image_url && (
        <div className="relative h-48">
          <Image
            src={scan.image_url}
            alt={scan.crop_type}
            fill
            className="object-cover"
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-gray-900">{scan.crop_type}</h3>
          {scan.disease_detected && (
            <span className={`px-2 py-1 bg-${getSeverityColor()}-100 text-${getSeverityColor()}-800 rounded text-xs`}>
              {scan.disease_detected}
            </span>
          )}
        </div>

        {scan.confidence_score && (
          <p className="text-sm text-gray-600">
            Confidence: {scan.confidence_score}%
          </p>
        )}

        {scan.treatment_recommendations && (
          <div className="mt-3 p-3 bg-blue-50 rounded-md">
            <p className="text-sm font-medium text-blue-800">Treatment:</p>
            <p className="text-sm text-blue-700">{scan.treatment_recommendations}</p>
          </div>
        )}
      </div>
    </div>
  );
}