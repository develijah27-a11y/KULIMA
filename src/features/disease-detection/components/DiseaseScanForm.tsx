'use client';

import { useState } from 'react';

interface DiseaseScanFormProps {
  farmId: string;
  onSubmit: (data: {
    farm_id: string;
    crop_type: string;
    image_url: string;
    disease_detected?: string;
    confidence_score?: number;
    treatment_recommendations?: string;
  }) => Promise<void>;
  loading?: boolean;
}

export function DiseaseScanForm({ farmId, onSubmit, loading }: DiseaseScanFormProps) {
  const [cropType, setCropType] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [diseaseDetected, setDiseaseDetected] = useState('');
  const [confidenceScore, setConfidenceScore] = useState('');
  const [treatmentRecommendations, setTreatmentRecommendations] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      farm_id: farmId,
      crop_type: cropType,
      image_url: imageUrl,
      disease_detected: diseaseDetected || undefined,
      confidence_score: confidenceScore ? parseFloat(confidenceScore) : undefined,
      treatment_recommendations: treatmentRecommendations || undefined,
    });
    setCropType('');
    setImageUrl('');
    setDiseaseDetected('');
    setConfidenceScore('');
    setTreatmentRecommendations('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="cropType" className="block text-sm font-medium mb-1">
          Crop Type *
        </label>
        <input
          id="cropType"
          type="text"
          value={cropType}
          onChange={(e) => setCropType(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium mb-1">
          Image URL *
        </label>
        <input
          id="imageUrl"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          required
          placeholder="https://example.com/image.jpg"
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label htmlFor="disease" className="block text-sm font-medium mb-1">
          Disease Detected
        </label>
        <input
          id="disease"
          type="text"
          value={diseaseDetected}
          onChange={(e) => setDiseaseDetected(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label htmlFor="confidence" className="block text-sm font-medium mb-1">
          Confidence Score (%)
        </label>
        <input
          id="confidence"
          type="number"
          value={confidenceScore}
          onChange={(e) => setConfidenceScore(e.target.value)}
          min="0"
          max="100"
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label htmlFor="treatment" className="block text-sm font-medium mb-1">
          Treatment Recommendations
        </label>
        <textarea
          id="treatment"
          value={treatmentRecommendations}
          onChange={(e) => setTreatmentRecommendations(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Disease Scan'}
      </button>
    </form>
  );
}