'use client';

import type { Database } from '@/lib/database.types';

type SoilReport = Database['public']['Tables']['soil_reports']['Row'];

interface SoilReportCardProps {
  report: SoilReport;
}

export function SoilReportCard({ report }: SoilReportCardProps) {
  const getHealthStatus = () => {
    if (report.ph_level >= 6 && report.ph_level <= 7) return 'Good';
    if (report.nitrogen >= 40 && report.phosphorus >= 30 && report.potassium >= 200) return 'Excellent';
    return 'Needs Attention';
  };

  return (
    <div className="rounded-lg shadow-sm p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>Soil Analysis</h3>
        <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ background: 'var(--color-primary-bg)', color: 'var(--color-accent)' }}>
          {getHealthStatus()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>pH Level</p>
          <p className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{report.ph_level}</p>
        </div>
        <div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Nitrogen</p>
          <p className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{report.nitrogen} mg/kg</p>
        </div>
        <div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Phosphorus</p>
          <p className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{report.phosphorus} mg/kg</p>
        </div>
        <div>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Potassium</p>
          <p className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>{report.potassium} mg/kg</p>
        </div>
      </div>

      {report.recommendations && (
        <div className="mt-4 p-3 rounded-md" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>Recommendations:</p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text)' }}>{report.recommendations}</p>
        </div>
      )}
    </div>
  );
}
