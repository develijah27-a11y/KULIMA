'use client';

import Image from 'next/image';
import type { Database } from '@/lib/database.types';

type DiseaseScan = Database['public']['Tables']['disease_scans']['Row'];

interface DiseaseScanCardProps {
  scan: DiseaseScan;
}

export function DiseaseScanCard({ scan }: DiseaseScanCardProps) {
  const getSeverityLabel = () => {
    if (!scan.confidence_score) return 'Unknown';
    if (scan.confidence_score >= 80) return 'High';
    if (scan.confidence_score >= 50) return 'Medium';
    return 'Low';
  };

  return (
    <div className="rounded-lg overflow-hidden shadow-sm border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {scan.image_url && (
        <div className="relative h-48">
          <Image
            src={scan.image_url}
            alt={scan.crop_type}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 400px"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold" style={{ color: 'var(--color-text)' }}>{scan.crop_type}</h3>
          {scan.disease_detected && (
            <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text)' }}>
              {scan.disease_detected} · {getSeverityLabel()}
            </span>
          )}
        </div>

        {scan.confidence_score && (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Confidence: {scan.confidence_score}%
          </p>
        )}

        {scan.treatment_recommendations && (
          <div className="mt-3 p-3 rounded-md" style={{ background: 'var(--color-primary-bg)', border: '1px solid var(--color-border)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>Treatment:</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text)' }}>{scan.treatment_recommendations}</p>
          </div>
        )}
      </div>
    </div>
  );
}
