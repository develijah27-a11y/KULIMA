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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold">Soil Analysis</h3>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
          {getHealthStatus()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">pH Level</p>
          <p className="text-xl font-bold">{report.ph_level}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Nitrogen</p>
          <p className="text-xl font-bold">{report.nitrogen} mg/kg</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Phosphorus</p>
          <p className="text-xl font-bold">{report.phosphorus} mg/kg</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Potassium</p>
          <p className="text-xl font-bold">{report.potassium} mg/kg</p>
        </div>
      </div>

      {report.recommendations && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-md">
          <p className="text-sm font-medium text-yellow-800">Recommendations:</p>
          <p className="text-sm text-yellow-700">{report.recommendations}</p>
        </div>
      )}
    </div>
  );
}