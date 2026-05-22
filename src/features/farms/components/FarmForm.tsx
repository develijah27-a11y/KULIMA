'use client';

import { useState } from 'react';

interface FarmFormProps {
  onSubmit: (data: {
    name: string;
    location: string;
    size_hectares?: number;
    farm_type?: string;
  }) => Promise<void>;
  loading?: boolean;
}

export function FarmForm({ onSubmit, loading }: FarmFormProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [sizeHectares, setSizeHectares] = useState('');
  const [farmType, setFarmType] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      location,
      size_hectares: sizeHectares ? parseFloat(sizeHectares) : undefined,
      farm_type: farmType || undefined,
    });
    setName('');
    setLocation('');
    setSizeHectares('');
    setFarmType('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Farm Name *
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium mb-1">
          Location *
        </label>
        <input
          id="location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label htmlFor="size" className="block text-sm font-medium mb-1">
          Size (hectares)
        </label>
        <input
          id="size"
          type="number"
          value={sizeHectares}
          onChange={(e) => setSizeHectares(e.target.value)}
          min="0"
          step="0.01"
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label htmlFor="type" className="block text-sm font-medium mb-1">
          Farm Type
        </label>
        <select
          id="type"
          value={farmType}
          onChange={(e) => setFarmType(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Select type</option>
          <option value="crop">Crop Farm</option>
          <option value="livestock">Livestock Farm</option>
          <option value="mixed">Mixed Farm</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Farm'}
      </button>
    </form>
  );
}