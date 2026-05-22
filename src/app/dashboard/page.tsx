import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { FarmList } from '@/features/farms/components/FarmList';
import { FarmForm } from '@/features/farms/components/FarmForm';
import { SoilReportForm } from '@/features/soil/components/SoilReportForm';
import { DiseaseScanForm } from '@/features/disease-detection/components/DiseaseScanForm';
import { WeatherLogForm } from '@/features/weather/components/WeatherLogForm';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Kulima Dashboard</h1>
          <form action="/api/auth/logout" method="post">
            <button className="px-4 py-2 text-red-600 hover:text-red-700">
              Sign Out
            </button>
          </form>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Farms</h2>
          <FarmList />
        </section>
      </main>
    </div>
  );
}