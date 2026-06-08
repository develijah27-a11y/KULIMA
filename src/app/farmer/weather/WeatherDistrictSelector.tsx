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
        background: '#FFFFFF',
        border: '1.5px solid #E5E7EB',
        borderRadius: '10px',
        padding: '8px 12px',
        fontSize: '14px',
        fontWeight: 600,
        color: '#1A1A1A',
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
