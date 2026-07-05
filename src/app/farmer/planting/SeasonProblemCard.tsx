import Link from 'next/link';
import { AlertTriangle, Microscope, CloudRain } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  cardBg: 'var(--d-card)', cardShadow: 'var(--d-shadow-card)',
};

export function SeasonProblemCard({ farmerCrops, seasonName }: { farmerCrops: string[]; seasonName: string }) {
  return (
    <div style={{ background: C.cardBg, borderRadius: '12px', boxShadow: C.cardShadow, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ display: 'flex', flexShrink: 0, color: 'var(--color-warning)' }}><AlertTriangle size={22} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: C.text, margin: '0 0 4px' }}>
            Is {seasonName} not going as expected?
          </p>
          <p style={{ fontSize: '13px', color: C.muted, margin: '0 0 14px', lineHeight: 1.5 }}>
            {farmerCrops.length > 0
              ? `Delayed rain, pests, or disease on your ${farmerCrops.join(', ')}? Get help below.`
              : 'Delayed rain, pests, or disease affecting your crops? Get help below.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link
              href="/farmer/doctor"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                background: 'var(--color-warning-bg)', color: 'var(--color-warning)', textDecoration: 'none',
              }}
            >
              <Microscope size={15} /> Scan for disease
            </Link>
            <Link
              href="/farmer/weather"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                background: 'var(--color-sky-bg)', color: 'var(--color-sky)', textDecoration: 'none',
              }}
            >
              <CloudRain size={15} /> Check rainfall outlook
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
