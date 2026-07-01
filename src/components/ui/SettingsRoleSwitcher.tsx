'use client';

import { useEffect, useState, type JSX } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Settings, Leaf, ShoppingCart, Truck, Store, Microscope, Package, Users } from 'lucide-react';

const ROLE_META: Record<string, { icon: JSX.Element; label: string; href: string; accent: string }> = {
  farmer:      { icon: <Leaf size={24} />,         label: 'Farmer',         href: '/farmer/dashboard',      accent: '#2D6A4F' },
  buyer:       { icon: <ShoppingCart size={24} />, label: 'Buyer',          href: '/buyer/dashboard',       accent: '#1A56DB' },
  supplier:    { icon: <Store size={24} />,         label: 'Input Supplier', href: '/supplier/dashboard',    accent: '#FF6B00' },
  transporter: { icon: <Truck size={24} />,         label: 'Transporter',    href: '/transporter/dashboard', accent: '#6366F1' },
  pathologist: { icon: <Microscope size={24} />,   label: 'Pathologist',    href: '/pathologist/dashboard', accent: '#E11D48' },
  offtaker:    { icon: <Package size={24} />,      label: 'Offtaker',       href: '/offtaker/dashboard',    accent: '#0891B2' },
  groups:      { icon: <Users size={24} />,         label: 'Groups',         href: '/groups/dashboard',      accent: '#7C3AED' },
  admin:       { icon: <Settings size={24} />,      label: 'Admin',          href: '/admin/dashboard',       accent: '#374151' },
};

export function SettingsRoleSwitcher() {
  const router   = useRouter();
  const pathname = usePathname();
  const [allRoles, setAllRoles] = useState<string[]>([]);
  const [loaded,   setLoaded]   = useState(false);

  const currentRole = pathname.split('/')[1] ?? '';

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoaded(true); return; }
      const { data } = await supabase
        .from('profiles')
        .select('role, roles')
        .eq('user_id', user.id)
        .single();
      if (data) {
        const primary = (data as any).role as string | null;
        const extra   = ((data as any).roles ?? []) as string[];
        const combined = [primary, ...extra].filter((r, i, a): r is string => !!r && a.indexOf(r) === i);
        setAllRoles(combined);
      }
      setLoaded(true);
    })();
  }, []);

  const knownRoles = allRoles.filter(r => ROLE_META[r]);
  if (!loaded || knownRoles.length <= 1) return null;

  return (
    <div>
      <p style={{
        fontSize: 11, fontWeight: 700, color: 'var(--d-muted)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
      }}>
        Switch Role
      </p>
      <div style={{
        background: 'var(--d-card)',
        borderRadius: 14,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)',
        padding: 12,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gap: 8,
      }}>
        {knownRoles.map(role => {
          const meta     = ROLE_META[role];
          const isActive = role === currentRole;
          return (
            <button
              key={role}
              onClick={() => !isActive && router.push(meta.href)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 6, padding: '14px 10px', borderRadius: 12,
                border: isActive ? `2px solid ${meta.accent}` : '2px solid transparent',
                cursor: isActive ? 'default' : 'pointer',
                background: isActive ? `${meta.accent}12` : 'var(--color-surface-2)',
                transition: 'all 0.15s',
                outline: 'none',
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = `${meta.accent}10`;
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-2)';
              }}
            >
              <div style={{ color: meta.accent, display: 'flex', alignItems: 'center' }}>
                {meta.icon}
              </div>
              <span style={{
                fontSize: 12, fontWeight: 700, textAlign: 'center', lineHeight: 1.3,
                color: isActive ? meta.accent : 'var(--d-text)',
              }}>
                {meta.label}
              </span>
              {isActive && (
                <span style={{
                  fontSize: 9, fontWeight: 800, color: meta.accent,
                  background: `${meta.accent}20`, padding: '1px 6px',
                  borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  Current
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
