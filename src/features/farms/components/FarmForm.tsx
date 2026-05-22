'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
      <Input
        label="Farm Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        label="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        required
      />
      <Input
        label="Size (hectares)"
        type="number"
        value={sizeHectares}
        onChange={(e) => setSizeHectares(e.target.value)}
        min="0"
        step="0.01"
      />
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">Farm Type</label>
        <select
          value={farmType}
          onChange={(e) => setFarmType(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
        >
          <option value="">Select type</option>
          <option value="crop">Crop Farm</option>
          <option value="livestock">Livestock Farm</option>
          <option value="mixed">Mixed Farm</option>
        </select>
      </div>
      <Button type="submit" isLoading={loading} className="w-full">
        Create Farm
      </Button>
    </form>
  );
}