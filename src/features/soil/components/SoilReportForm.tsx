'use client';

import { useState } from 'react';

interface SoilReportFormProps {
  farmId: string;
  onSubmit: (data: {
    farm_id: string;
    ph_level: number;
    nitrogen: number;
    phosphorus: number;
    potassium: number;
    organic_matter?: number;
    recommendations?: string;
  }) => Promise<void>;
  loading?: boolean;
}

export function SoilReportForm({ farmId, onSubmit, loading }: SoilReportFormProps) {
  const [phLevel, setPhLevel] = useState('');
  const [nitrogen, setNitrogen] = useState('');
  const [phosphorus, setPhosphorus] = useState('');
  const [potassium, setPotassium] = useState('');
  const [organicMatter, setOrganicMatter] = useState('');
  const [recommendations, setRecommendations] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      farm_id: farmId,
      ph_level: parseFloat(phLevel),
      nitrogen: parseFloat(nitrogen),
      phosphorus: parseFloat(phosphorus),
      potassium: parseFloat(potassium),
      organic_matter: organicMatter ? parseFloat(organicMatter) : undefined,
      recommendations: recommendations || undefined,
    });
    setPhLevel('');
    setNitrogen('');
    setPhosphorus('');
    setPotassium('');
    setOrganicMatter('');
    setRecommendations('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="ph" className="block text-sm font-medium mb-1">
            pH Level
          </label>
          <input
            id="ph"
            type="number"
            value={phLevel}
            onChange={(e) => setPhLevel(e.target.value)}
            min="0"
            max="14"
            step="0.1"
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label htmlFor="nitrogen" className="block text-sm font-medium mb-1">
            Nitrogen (mg/kg)
          </label>
          <input
            id="nitrogen"
            type="number"
            value={nitrogen}
            onChange={(e) => setNitrogen(e.target.value)}
            min="0"
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label htmlFor="phosphorus" className="block text-sm font-medium mb-1">
            Phosphorus (mg/kg)
          </label>
          <input
            id="phosphorus"
            type="number"
            value={phosphorus}
            onChange={(e) => setPhosphorus(e.target.value)}
            min="0"
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label htmlFor="potassium" className="block text-sm font-medium mb-1">
            Potassium (mg/kg)
          </label>
          <input
            id="potassium"
            type="number"
            value={potassium}
            onChange={(e) => setPotassium(e.target.value)}
            min="0"
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="organicMatter" className="block text-sm font-medium mb-1">
          Organic Matter (%)
        </label>
        <input
          id="organicMatter"
          type="number"
          value={organicMatter}
          onChange={(e) => setOrganicMatter(e.target.value)}
          min="0"
          step="0.1"
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label htmlFor="recommendations" className="block text-sm font-medium mb-1">
          Recommendations
        </label>
        <textarea
          id="recommendations"
          value={recommendations}
          onChange={(e) => setRecommendations(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Soil Report'}
      </button>
    </form>
  );
}