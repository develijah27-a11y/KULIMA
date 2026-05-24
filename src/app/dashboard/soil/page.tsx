import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SoilReportList } from '@/features/soil/components/SoilReportList';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default async function SoilDashboardPage() {
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
          <h1 className="text-2xl font-semibold text-gray-900">Soil Health Monitoring</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <SoilReportCardForm />
          </div>
          <div className="lg:col-span-2">
            <Card>
           <CardHeader
             title="Soil Reports"
             subtitle="View and analyze soil health data"
           />
              <div className="mt-4">
                <SoilReportList />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

async function SoilReportCardForm() {
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

    // Get farm ID from form or use user's first farm as default
    let farmId = formData.get('farm_id')?.toString();
    if (!farmId) {
      // If no farm_id provided, get the user's first farm
      const { data: farms, error } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (error) {
        console.error('Error fetching user farms:', error);
        return;
      }

      if (farms && farms.length > 0) {
        farmId = farms[0].id;
      } else {
        // User has no farms, redirect to create one or show error
        console.error('User has no farms');
        return;
      }
    }

    await supabase.from('soil_reports').insert({
      farm_id: farmId,
      ph_level: parseFloat(formData.get('ph_level') as string),
      nitrogen: parseFloat(formData.get('nitrogen') as string),
      phosphorus: parseFloat(formData.get('phosphorus') as string),
      potassium: parseFloat(formData.get('potassium') as string),
      organic_matter: formData.get('organic_matter')
        ? parseFloat(formData.get('organic_matter') as string)
        : null,
      recommendations: (formData.get('recommendations') as string) || null,
    });
  }

  return (
    <Card>
         <CardHeader
           title="New Soil Report"
           subtitle="Enter soil analysis data"
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
            <label htmlFor="ph_level" className="block text-sm font-medium text-gray-700">
              pH Level *
            </label>
            <input
              id="ph_level"
              name="ph_level"
              type="number"
              min="0"
              max="14"
              step="0.1"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="nitrogen" className="block text-sm font-medium text-gray-700">
              Nitrogen (mg/kg) *
            </label>
            <input
              id="nitrogen"
              name="nitrogen"
              type="number"
              min="0"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="phosphorus" className="block text-sm font-medium text-gray-700">
              Phosphorus (mg/kg) *
            </label>
            <input
              id="phosphorus"
              name="phosphorus"
              type="number"
              min="0"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="potassium" className="block text-sm font-medium text-gray-700">
              Potassium (mg/kg) *
            </label>
            <input
              id="potassium"
              name="potassium"
              type="number"
              min="0"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="organic_matter" className="block text-sm font-medium text-gray-700">
            Organic Matter (%)
          </label>
          <input
            id="organic_matter"
            name="organic_matter"
            type="number"
            min="0"
            step="0.1"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="recommendations" className="block text-sm font-medium text-gray-700">
            Recommendations
          </label>
          <textarea
            id="recommendations"
            name="recommendations"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <Button type="submit" className="w-full">
          Submit Report
        </Button>
      </form>
    </Card>
  );
}
