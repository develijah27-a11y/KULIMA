import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PathologistClient } from './PathologistClient';

export default async function PathologistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/signin');

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.03em', margin: 0 }}>
              Plant Pathologist
            </h1>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
              background: '#D1FAE5', color: '#059669',
            }}>
              AI-Powered
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
            Upload a photo of your affected plant for expert disease diagnosis and treatment advice
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px',
          background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px',
          fontSize: '12px', color: '#92400E', fontWeight: 600,
        }}>
          🌿 Covers 6 major Uganda crop diseases
        </div>
      </div>

      <PathologistClient />
    </div>
  );
}
