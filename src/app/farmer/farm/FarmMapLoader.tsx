'use client';

import dynamic from 'next/dynamic';

const FarmMapClient = dynamic(
  () => import('./FarmMapClient').then(m => m.FarmMapClient),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F0FDF4', borderRadius: 12 }}>
        <p style={{ color: '#40916C', fontSize: 13, fontWeight: 600 }}>Loading map...</p>
      </div>
    ),
  }
);

export function FarmMapLoader({ farms }: { farms: any[] }) {
  return <FarmMapClient farms={farms} />;
}
