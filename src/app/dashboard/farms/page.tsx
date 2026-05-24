import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FarmList } from '@/features/farms/components/FarmList';
import { FarmForm } from '@/features/farms/components/FarmForm';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default async function FarmsDashboardPage() {
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
          <h1 className="text-2xl font-semibold text-gray-900">Farm Management</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NewFarmForm />
          <Card>
            <CardHeader
              title="Your Farms"
              subtitle="Manage and monitor your farm operations"
            />
            <div className="mt-4">
              <FarmList />
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

async function NewFarmForm() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  async function handleCreateFarm(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const name = formData.get('name') as string;
    const location = formData.get('location') as string;
    const sizeHectares = formData.get('size_hectares') as string;
    const farmType = formData.get('farm_type') as string;

    await supabase.from('farms').insert({
      name,
      location,
      size_hectares: sizeHectares ? parseFloat(sizeHectares) : null,
      farm_type: farmType || null,
      user_id: user.id,
    });
  }

  return (
    <Card>
      <CardHeader
        title="Create Farm"
        subtitle="Register a new farm to get started"
      />
      <div className="mt-4">
        <form action={handleCreateFarm} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Farm Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="location" className="block text-sm font-medium text-gray-700">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="size_hectares" className="block text-sm font-medium text-gray-700">
              Size (hectares)
            </label>
            <input
              id="size_hectares"
              name="size_hectares"
              type="number"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="farm_type" className="block text-sm font-medium text-gray-700">
              Farm Type
            </label>
            <select
              id="farm_type"
              name="farm_type"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select type</option>
              <option value="crop">Crop Farm</option>
              <option value="livestock">Livestock Farm</option>
              <option value="mixed">Mixed Farm</option>
            </select>
            <Button type="submit" className="w-full mt-2">
              Create Farm
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}
