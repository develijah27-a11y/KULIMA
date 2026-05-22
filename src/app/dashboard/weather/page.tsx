import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { WeatherLogList } from '@/features/weather/components/WeatherLogList';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default async function WeatherDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Weather Tracking</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <WeatherLogCardForm />
          </div>
          <div className="lg:col-span-2">
            <Card>
              <CardHeader
                title="Weather Logs"
                description="Track and analyze weather conditions for your farms"
              />
              <div className="mt-4">
                <WeatherLogList />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

async function WeatherLogCardForm() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  async function handleSubmit(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const farmId = formData.get('farm_id') as string;

    await supabase.from('weather_logs').insert({
      farm_id: farmId || null,
      temperature: parseFloat(formData.get('temperature') as string),
      humidity: parseFloat(formData.get('humidity') as string),
      rainfall: parseFloat(formData.get('rainfall') as string),
      wind_speed: formData.get('wind_speed')
        ? parseFloat(formData.get('wind_speed') as string)
        : null,
      conditions: (formData.get('conditions') as string) || null,
      recorded_at: new Date(formData.get('recorded_at') as string).toISOString(),
    });
  }

  const nowStr = new Date().toISOString().slice(0, 16);

  return (
    <Card>
      <CardHeader
        title="New Weather Log"
        description="Record current weather conditions"
      />
      <form action={handleSubmit} className="mt-4 space-y-4">
        <div className="space-y-1">
          <label htmlFor="farm_id" className="block text-sm font-medium text-gray-700">
            Farm ID
          </label>
          <input
            id="farm_id"
            name="farm_id"
            type="text"
            placeholder="Optional farm ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="temperature" className="block text-sm font-medium text-gray-700">
              Temperature (°C) *
            </label>
            <input
              id="temperature"
              name="temperature"
              type="number"
              min="-50"
              max="60"
              step="0.1"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="humidity" className="block text-sm font-medium text-gray-700">
              Humidity (%) *
            </label>
            <input
              id="humidity"
              name="humidity"
              type="number"
              min="0"
              max="100"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="rainfall" className="block text-sm font-medium text-gray-700">
              Rainfall (mm)
            </label>
            <input
              id="rainfall"
              name="rainfall"
              type="number"
              min="0"
              step="0.1"
              defaultValue="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="wind_speed" className="block text-sm font-medium text-gray-700">
              Wind Speed (km/h)
            </label>
            <input
              id="wind_speed"
              name="wind_speed"
              type="number"
              min="0"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="conditions" className="block text-sm font-medium text-gray-700">
            Conditions
          </label>
          <select
            id="conditions"
            name="conditions"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
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
        <div className="space-y-1">
          <label htmlFor="recorded_at" className="block text-sm font-medium text-gray-700">
            Recorded At
          </label>
          <input
            id="recorded_at"
            name="recorded_at"
            type="datetime-local"
            defaultValue={nowStr}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <Button type="submit" className="w-full">
          Submit Weather Log
        </Button>
      </form>
    </Card>
  );
}
