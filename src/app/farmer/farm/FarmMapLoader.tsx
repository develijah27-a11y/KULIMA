'use client';

import dynamic from 'next/dynamic';

const FarmMapClient = dynamic(
  () => import('./FarmMapClient').then(m => m.FarmMapClient),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-primary-bg)', borderRadius: 12 }}>
        <p style={{ color: 'var(--color-primary-hover)', fontSize: 13, fontWeight: 600 }}>Loading map...</p>
      </div>
    ),
  }
);

export function FarmMapLoader({ farms }: { farms: any[] }) {
  return <FarmMapClient farms={farms} />;
}
