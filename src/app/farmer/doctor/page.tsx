import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/supabase/auth-cache';
import { PathologistLazy as PathologistClient } from './PathologistLazy';

export default async function PathologistPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect('/auth/signin');

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--d-text)', letterSpacing: '-0.03em', margin: 0 }}>
              Plant Pathologist
            </h1>
            <span style={{
              fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
              background: 'var(--color-success-bg)', color: 'var(--color-success)',
            }}>
              AI-Powered
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--d-muted)', margin: 0 }}>
            Upload a photo of your affected plant for expert disease diagnosis and treatment advice
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px',
          background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: '10px',
          fontSize: '12px', color: 'var(--color-warning)', fontWeight: 600,
        }}>
          🌿 Covers 6 major Uganda crop diseases
        </div>
      </div>

      <PathologistClient />
    </div>
  );
}
