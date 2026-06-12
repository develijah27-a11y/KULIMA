'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ROLE_META: Record<string, { icon: string; label: string; href: string }> = {
  farmer:      { icon: '🌾', label: 'Farmer',         href: '/farmer/dashboard' },
  buyer:       { icon: '🛒', label: 'Buyer',          href: '/buyer/dashboard' },
  transporter: { icon: '🚚', label: 'Transporter',    href: '/transporter/dashboard' },
  supplier:    { icon: '🏪', label: 'Input Supplier', href: '/supplier/dashboard' },
  pathologist: { icon: '🔬', label: 'Pathologist',    href: '/pathologist/dashboard' },
  offtaker:    { icon: '📦', label: 'Offtaker',       href: '/offtaker/dashboard' },
  groups:      { icon: '👥', label: 'Groups',         href: '/groups/dashboard' },
};

interface RoleSwitcherProps {
  currentRole: string;
  allRoles: string[];
}

export function RoleSwitcher({ currentRole, allRoles }: RoleSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const otherRoles = allRoles.filter(r => r !== currentRole && ROLE_META[r]);
  if (otherRoles.length === 0) return null;

  const current = ROLE_META[currentRole];

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 10px',
          borderRadius: 8,
          background: open ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.10)',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.12s',
          outline: 'none',
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.15)'; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.10)'; }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 14 }}>{current?.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#000' }}>
            {current?.label}
          </span>
          <span
            style={{
              fontSize: 8, fontWeight: 800, color: 'rgba(0,0,0,0.60)',
              background: 'rgba(0,0,0,0.12)', padding: '1px 5px',
              borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}
          >
            Active
          </span>
        </span>
        <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.50)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          ▼
        </span>
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0, right: 0,
              background: 'var(--color-sidebar)',
              border: '1px solid rgba(0,0,0,0.20)',
              borderRadius: 10,
              padding: 5,
              zIndex: 50,
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            }}
          >
            <p style={{
              fontSize: 9, color: 'rgba(0,0,0,0.45)', fontWeight: 800,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              padding: '3px 8px 5px',
            }}>
              Switch role
            </p>
            {otherRoles.map(role => {
              const meta = ROLE_META[role];
              return (
                <button
                  key={role}
                  onClick={() => { setOpen(false); router.push(meta.href); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 8px',
                    borderRadius: 7,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.12)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 14 }}>{meta.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#000' }}>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
