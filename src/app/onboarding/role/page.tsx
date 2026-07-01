'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Leaf, ShoppingCart, Truck, Store, Microscope, Package, Globe } from 'lucide-react';

type RoleId = 'farmer' | 'buyer' | 'transporter' | 'supplier' | 'pathologist' | 'offtaker';

const ROLES: { id: RoleId; icon: React.ReactNode; title: string; desc: string; color: string; border: string; bg: string }[] = [
  {
    id: 'farmer',
    icon: <Leaf size={28} />,
    title: 'Farmer',
    desc: 'Manage your farm, access weather, sell directly to buyers.',
    color: '#F97316',
    border: 'rgba(249,115,22,0.30)',
    bg: 'rgba(249,115,22,0.08)',
  },
  {
    id: 'buyer',
    icon: <ShoppingCart size={28} />,
    title: 'Buyer',
    desc: 'Browse listings, make offers, and track crop orders.',
    color: '#FBBF24',
    border: 'rgba(251,191,36,0.30)',
    bg: 'rgba(251,191,36,0.08)',
  },
  {
    id: 'transporter',
    icon: <Truck size={28} />,
    title: 'Transporter',
    desc: 'Offer delivery services and bid on transport jobs.',
    color: '#38BDF8',
    border: 'rgba(56,189,248,0.30)',
    bg: 'rgba(56,189,248,0.08)',
  },
  {
    id: 'supplier',
    icon: <Store size={28} />,
    title: 'Input Supplier',
    desc: 'Sell seeds, fertiliser, and farming inputs to farmers.',
    color: '#4ADE80',
    border: 'rgba(74,222,128,0.30)',
    bg: 'rgba(74,222,128,0.08)',
  },
  {
    id: 'pathologist',
    icon: <Microscope size={28} />,
    title: 'Pathologist',
    desc: 'Diagnose crop diseases and support farm health.',
    color: '#F472B6',
    border: 'rgba(244,114,182,0.30)',
    bg: 'rgba(244,114,182,0.08)',
  },
  {
    id: 'offtaker',
    icon: <Package size={28} />,
    title: 'Offtaker',
    desc: 'Purchase large volumes, manage processing and supply chains.',
    color: '#A78BFA',
    border: 'rgba(167,139,250,0.30)',
    bg: 'rgba(167,139,250,0.08)',
  },
];

export default function RoleSelectionPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<RoleId[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  function toggle(id: RoleId) {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(r => r !== id)
        : [...prev, id]
    );
  }

  const primaryRole = selected[0];

  async function handleConfirm() {
    if (selected.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/onboarding/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: selected }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? 'Failed to save roles');
      router.replace(json.redirect);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#1A0800' }}
    >
      {/* Header */}
      <div className="text-center mb-10 max-w-xl">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5 text-xs font-bold tracking-widest uppercase"
          style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.28)', color: '#F97316' }}
        >
          <Globe size={12} /> Welcome to Kulima
        </div>
        <h1
          className="font-black mb-3"
          style={{ fontSize: 'clamp(1.75rem,5vw,2.75rem)', color: '#FFF7ED', letterSpacing: '-0.04em' }}
        >
          What are your roles?
        </h1>
        <p style={{ color: 'rgba(255,247,237,0.55)', fontSize: 15 }}>
          Select all that apply. Your <span style={{ color: '#F97316', fontWeight: 700 }}>first selection</span> becomes your primary dashboard.
        </p>
      </div>

      {/* Role grid */}
      <div
        className="w-full grid gap-3"
        style={{ maxWidth: 720, gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}
      >
        {ROLES.map(({ id, icon, title, desc, color, border, bg }) => {
          const isSelected = selected.includes(id);
          const isPrimary  = selected[0] === id;

          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              style={{
                textAlign: 'left',
                padding: '18px 20px',
                borderRadius: 16,
                background: isSelected ? bg : 'rgba(255,247,237,0.04)',
                border: `2px solid ${isSelected ? color : 'rgba(255,247,237,0.10)'}`,
                cursor: 'pointer',
                transition: 'all 0.15s',
                outline: 'none',
                position: 'relative',
              }}
              onMouseEnter={e => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.background = bg;
                  (e.currentTarget as HTMLElement).style.borderColor = border;
                }
              }}
              onMouseLeave={e => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,247,237,0.04)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,247,237,0.10)';
                }
              }}
            >
              {/* Primary badge */}
              {isPrimary && (
                <span
                  style={{
                    position: 'absolute', top: 10, right: 36,
                    fontSize: 9, fontWeight: 800,
                    color: color, background: `${color}22`,
                    padding: '2px 6px', borderRadius: 99,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}
                >
                  Primary
                </span>
              )}

              {/* Checkmark */}
              {isSelected && (
                <span
                  style={{
                    position: 'absolute', top: 10, right: 12,
                    width: 20, height: 20, borderRadius: 99,
                    background: color, color: '#000',
                    fontSize: 11, fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ✓
                </span>
              )}

              <span style={{ display: 'flex', marginBottom: 8, color }}>{icon}</span>
              <p style={{ fontSize: 15, fontWeight: 800, color: isSelected ? color : '#FFF7ED', marginBottom: 4, letterSpacing: '-0.02em' }}>
                {title}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,247,237,0.50)', lineHeight: 1.5 }}>
                {desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Selection summary */}
      {selected.length > 1 && (
        <div
          style={{
            marginTop: 20, padding: '10px 18px', borderRadius: 12,
            background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.20)',
            color: 'rgba(255,247,237,0.70)', fontSize: 13, maxWidth: 720, width: '100%',
          }}
        >
          <span style={{ color: '#F97316', fontWeight: 700 }}>
            {ROLES.find(r => r.id === primaryRole)?.title}
          </span>
          {' '}is your primary dashboard. You can switch to your other {selected.length - 1} role{selected.length > 2 ? 's' : ''} anytime from the sidebar.
        </div>
      )}

      {/* Error */}
      {error && (
        <p style={{ color: '#FCA5A5', fontSize: 13, marginTop: 16 }}>{error}</p>
      )}

      {/* Confirm button */}
      <button
        onClick={handleConfirm}
        disabled={selected.length === 0 || loading}
        style={{
          marginTop: 28,
          padding: '14px 40px',
          borderRadius: 14,
          background: selected.length > 0 ? '#F97316' : 'rgba(255,247,237,0.10)',
          color: selected.length > 0 ? '#fff' : 'rgba(255,247,237,0.35)',
          border: 'none',
          fontWeight: 800,
          fontSize: 16,
          cursor: selected.length > 0 && !loading ? 'pointer' : 'not-allowed',
          letterSpacing: '-0.02em',
          transition: 'all 0.15s',
          boxShadow: selected.length > 0 ? '0 4px 24px rgba(249,115,22,0.40)' : 'none',
          minWidth: 240,
        }}
      >
        {loading
          ? 'Setting up your account…'
          : selected.length === 0
          ? 'Select at least one role'
          : selected.length === 1
          ? `Continue as ${ROLES.find(r => r.id === selected[0])?.title}`
          : `Continue with ${selected.length} roles`}
      </button>
    </div>
  );
}
