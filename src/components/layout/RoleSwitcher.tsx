'use client';

import { useState, useEffect, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Leaf, ShoppingCart, Truck, Store, Microscope, Package, Users, Loader2 } from 'lucide-react';

const SIDEBAR_LIGHT = '#1C3D2A';
const SIDEBAR_DARK  = '#0C1A11';

function getSidebarBg() {
  if (typeof window === 'undefined') return SIDEBAR_LIGHT;
  return document.documentElement.classList.contains('dark') ? SIDEBAR_DARK : SIDEBAR_LIGHT;
}

export const ROLE_META: Record<string, { icon: JSX.Element; label: string; href: string }> = {
  admin:       { icon: <Settings size={14} />,    label: 'Admin',          href: '/admin/dashboard' },
  farmer:      { icon: <Leaf size={14} />,         label: 'Farmer',         href: '/farmer/dashboard' },
  buyer:       { icon: <ShoppingCart size={14} />, label: 'Buyer',          href: '/buyer/dashboard' },
  transporter: { icon: <Truck size={14} />,        label: 'Transporter',    href: '/transporter/dashboard' },
  supplier:    { icon: <Store size={14} />,         label: 'Input Supplier', href: '/supplier/dashboard' },
  pathologist: { icon: <Microscope size={14} />,   label: 'Pathologist',    href: '/pathologist/dashboard' },
  offtaker:    { icon: <Package size={14} />,      label: 'Offtaker',       href: '/offtaker/dashboard' },
  groups:      { icon: <Users size={14} />,         label: 'Groups',         href: '/groups/dashboard' },
};

const SELF_ADD_ROLES = ['farmer', 'buyer', 'transporter', 'supplier', 'pathologist', 'offtaker', 'groups'];

interface RoleSwitcherProps {
  currentRole: string;
  allRoles: string[];
}

export function RoleSwitcher({ currentRole, allRoles }: RoleSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [dropdownBg, setDropdownBg] = useState(SIDEBAR_LIGHT);

  useEffect(() => {
    setDropdownBg(getSidebarBg());
    const obs = new MutationObserver(() => setDropdownBg(getSidebarBg()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const current = ROLE_META[currentRole];

  const switchableRoles = SELF_ADD_ROLES.filter(r => r !== currentRole);
  if (currentRole !== 'admin' && allRoles.includes('admin')) {
    switchableRoles.unshift('admin');
  }

  const handleRoleClick = async (role: string) => {
    const meta = ROLE_META[role];
    if (!meta || loading) return;

    const hasRole = allRoles.includes(role);

    if (!hasRole) {
      setLoading(role);
      try {
        const res = await fetch('/api/profile/add-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });
        if (!res.ok) { setLoading(null); return; }
      } catch {
        setLoading(null);
        return;
      }
      setLoading(null);
    }

    setOpen(false);
    router.push(meta.href);
  };

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
          background: open ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.10)',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.12s',
          outline: 'none',
          minHeight: 'unset', minWidth: 'unset',
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.14)'; }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)'; }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-sidebar-text)' }}>
            {current?.icon}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-sidebar-text)' }}>
            {current?.label}
          </span>
          <span
            style={{
              fontSize: 8, fontWeight: 800, color: 'var(--color-sidebar-muted)',
              background: 'rgba(255,255,255,0.14)', padding: '1px 5px',
              borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}
          >
            Active
          </span>
        </span>
        <span
          style={{
            fontSize: 9, color: 'var(--color-sidebar-muted)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        >
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
              background: dropdownBg,
              border: '1px solid var(--color-sidebar-divider)',
              borderRadius: 10,
              padding: 5,
              zIndex: 50,
              boxShadow: '0 8px 28px rgba(0,0,0,0.40)',
            }}
          >
            <p style={{
              fontSize: 9, color: 'var(--color-sidebar-muted)', fontWeight: 800,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              padding: '3px 8px 5px',
            }}>
              Switch role
            </p>
            {switchableRoles.map(role => {
              const meta = ROLE_META[role];
              const hasRole = allRoles.includes(role);
              const isLoading = loading === role;
              return (
                <button
                  key={role}
                  onClick={() => handleRoleClick(role)}
                  disabled={!!loading}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 8px',
                    borderRadius: 7,
                    background: 'transparent',
                    border: 'none',
                    cursor: loading ? 'wait' : 'pointer',
                    transition: 'background 0.1s',
                    textAlign: 'left',
                    minHeight: 'unset', minWidth: 'unset',
                    opacity: isLoading ? 0.6 : 1,
                  }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)'; }}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-sidebar-text)' }}>
                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : meta.icon}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-sidebar-text)', flex: 1 }}>
                    {meta.label}
                  </span>
                  {!hasRole && (
                    <span style={{
                      fontSize: 8, fontWeight: 800,
                      color: 'rgba(74, 222, 128, 0.95)',
                      background: 'rgba(74, 222, 128, 0.15)',
                      padding: '2px 6px', borderRadius: 99,
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      whiteSpace: 'nowrap',
                    }}>
                      + Add
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
