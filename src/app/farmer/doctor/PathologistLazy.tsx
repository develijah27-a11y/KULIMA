'use client';

import dynamic from 'next/dynamic';

export const PathologistLazy = dynamic(
  () => import('./PathologistClient').then(m => m.PathologistClient),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: i === 1 ? 120 : 80, borderRadius: 14, background: 'var(--color-surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>
    ),
  }
);
