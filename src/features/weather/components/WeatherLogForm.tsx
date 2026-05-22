'use client';

import { useState } from 'react';

interface WeatherLogFormProps {
  farmId: string;
  onSubmit: (data: {
    farm_id: string;
    temperature: number;
    humidity: number;
    rainfall: number;
    wind_speed?: number;
    conditions?: string;
    recorded_at: string;
  }) => Promise<void>;
  loading?: boolean;
}

export function WeatherLogForm({ farmId, onSubmit, loading }: WeatherLogFormProps) {
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');
  const [rainfall, setRainfall] = useState('0');
  const [windSpeed, setWindSpeed] = useState('');
  const [conditions, setConditions] = useState('');
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().slice(0, 16));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      farm_id: farmId,
      temperature: parseFloat(temperature),
      humidity: parseFloat(humidity),
      rainfall: parseFloat(rainfall),
      wind_speed: windSpeed ? parseFloat(windSpeed) : undefined,
      conditions: conditions || undefined,
      recorded_at: new Date(recordedAt).toISOString(),
    });
    setTemperature('');
    setHumidity('');
    setRainfall('0');
    setWindSpeed('');
    setConditions('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="temperature" className="block text-sm font-medium mb-1">
            Temperature (°C) *
          </label>
          <input
            id="temperature"
            type="number"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            min="-50"
            max="60"
            step="0.1"
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label htmlFor="humidity" className="block text-sm font-medium mb-1">
            Humidity (%) *
          </label>
          <input
            id="humidity"
            type="number"
            value={humidity}
            onChange={(e) => setHumidity(e.target.value)}
            min="0"
            max="100"
            required
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="rainfall" className="block text-sm font-medium mb-1">
            Rainfall (mm)
          </label>
          <input
            id="rainfall"
            type="number"
            value={rainfall}
            onChange={(e) => setRainfall(e.target.value)}
            min="0"
            step="0.1"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label htmlFor="windSpeed" className="block text-sm font-medium mb-1">
            Wind Speed (km/h)
          </label>
          <input
            id="windSpeed"
            type="number"
            value={windSpeed}
            onChange={(e) => setWindSpeed(e.target.value)}
            min="0"
            step="0.1"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="conditions" className="block text-sm font-medium mb-1">
          Conditions
        </label>
        <select
          id="conditions"
          value={conditions}
          onChange={(e) => setConditions(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Select conditions</option>
          <option value="sunny">Sunny</option>
          <option value="cloudy">Cloudy</option>
          <option value="rainy">Rainy</option>
          <option value="stormy">Stormy</option>
          <option value="foggy">Foggy</option>
          <option value="windy">Windy</option>
          <option value="partly_cloudy">Partly Cloudy</option>
        </select>
      </div>

      <div>
        <label htmlFor="recordedAt" className="block text-sm font-medium mb-1">
          Recorded At
        </label>
        <input
          id="recordedAt"
          type="datetime-local"
          value={recordedAt}
          onChange={(e) => setRecordedAt(e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Weather Log'}
      </button>
    </form>
  );
}