'use client';

import { useRouter } from 'next/navigation';

interface Props {
  current: string;
  districts: string[];
}

export function WeatherDistrictSelector({ current, districts }: Props) {
  const router = useRouter();
  return (
    <select
      value={current}
      onChange={(e) => router.push(`/farmer/weather?district=${encodeURIComponent(e.target.value)}`)}
      style={{
        background: 'var(--d-input-bg)',
        border: '1.5px solid var(--d-border)',
        borderRadius: '10px',
        padding: '8px 12px',
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--d-text)',
        cursor: 'pointer',
        outline: 'none',
        minWidth: '160px',
      }}
    >
      {districts.map((d) => (
        <option key={d} value={d}>{d}</option>
      ))}
    </select>
  );
}
