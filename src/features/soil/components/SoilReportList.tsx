'use client';

import { SoilReportCard } from './SoilReportCard';
import { useSoilReports } from '../hooks/useSoilReports';

export function SoilReportList({ farmId }: { farmId?: string }) {
  const { reports, loading } = useSoilReports(farmId);

  if (loading) {
    return <div className="text-center py-8">Loading soil reports...</div>;
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No soil reports available. Add your first soil analysis!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <SoilReportCard key={report.id} report={report} />
      ))}
    </div>
  );
}