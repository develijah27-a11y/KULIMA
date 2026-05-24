import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DiseaseScanList } from '@/features/disease-detection/components/DiseaseScanList';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default async function DiseaseDetectionDashboardPage() {
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
          <h1 className="text-2xl font-semibold text-gray-900">Disease Detection</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <DiseaseScanCardForm />
          </div>
          <div className="lg:col-span-2">
<Card>
               <CardHeader
                 title="Disease Scans"
                 subtitle="View and analyze crop disease detection results"
               />
              <div className="mt-4">
                <DiseaseScanList />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

async function DiseaseScanCardForm() {
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

    const cropType = formData.get('crop_type');
    const imageUrl = formData.get('image_url');
    const diseaseDetected = formData.get('disease_detected');
    const confidenceScore = formData.get('confidence_score');
    const treatmentRecommendations = formData.get('treatment_recommendations');

    await supabase.from('disease_scans').insert({
      farm_id: farmId,
      crop_type: cropType ? cropType.toString() : '',
      image_url: imageUrl ? imageUrl.toString() : '',
      disease_detected: diseaseDetected ? diseaseDetected.toString() : null,
      confidence_score: confidenceScore
        ? parseFloat(confidenceScore as string)
        : null,
      treatment_recommendations: treatmentRecommendations ? treatmentRecommendations.toString() : null,
    });
  }

  return (
<Card>
       <CardHeader
         title="New Disease Scan"
         subtitle="Record a new crop disease scan"
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
        <div className="space-y-1">
          <label htmlFor="crop_type" className="block text-sm font-medium text-gray-700">
            Crop Type *
          </label>
          <input
            id="crop_type"
            name="crop_type"
            type="text"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="image_url" className="block text-sm font-medium text-gray-700">
            Image URL *
          </label>
          <input
            id="image_url"
            name="image_url"
            type="url"
            required
            placeholder="https://example.com/image.jpg"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="disease_detected" className="block text-sm font-medium text-gray-700">
            Disease Detected
          </label>
          <input
            id="disease_detected"
            name="disease_detected"
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="confidence_score" className="block text-sm font-medium text-gray-700">
            Confidence Score (%)
          </label>
          <input
            id="confidence_score"
            name="confidence_score"
            type="number"
            min="0"
            max="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="treatment_recommendations" className="block text-sm font-medium text-gray-700">
            Treatment Recommendations
          </label>
          <textarea
            id="treatment_recommendations"
            name="treatment_recommendations"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
          />
        </div>
        <Button type="submit" className="w-full">
          Submit Scan
        </Button>
      </form>
    </Card>
  );
}
