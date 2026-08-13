'use client';

import { SettingsRoleSwitcher } from '@/components/ui/SettingsRoleSwitcher';
import { User, CreditCard, Bell, Leaf, Package, Tractor, CalendarDays, Banknote, ShieldCheck, LogOut } from 'lucide-react';
import { DeleteAccountButton } from '@/components/settings/DeleteAccountButton';
import { PasskeySettings } from '@/components/settings/PasskeySettings';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)', cardBg: 'var(--d-card)',
};

const SECTIONS = [
  {
    title: 'Account',
    items: [
      { label: 'Profile', desc: 'View and edit your name, phone, and location', icon: <User size={20} />, href: '/farmer/profile' },
      { label: 'Wallet & Finance', desc: 'Manage your balance, deposits, and withdrawals', icon: <CreditCard size={20} />, href: '/farmer/wallet' },
      { label: 'Notifications', desc: 'Price alerts, offer updates, and farm reminders', icon: <Bell size={20} />, href: '/farmer/notifications' },
    ],
  },
  {
    title: 'Farm & Market',
    items: [
      { label: 'Listings', desc: 'Manage crops you have listed for sale', icon: <Leaf size={20} />, href: '/farmer/marketplace' },
      { label: 'Orders', desc: 'Track orders from buyers', icon: <Package size={20} />, href: '/farmer/orders' },
      { label: 'Farm', desc: 'Update farm details, size, and crop history', icon: <Tractor size={20} />, href: '/farmer/farm' },
      { label: 'Planting Calendar', desc: 'Record planting and expected harvest dates', icon: <CalendarDays size={20} />, href: '/farmer/planting' },
      { label: 'Finance & Loans', desc: 'View loans, repayments, and financial history', icon: <Banknote size={20} />, href: '/farmer/finance' },
    ],
  },
  {
    title: 'Trust & Verification',
    items: [
      { label: 'Get Verified', desc: 'Upload your ID and farm documents to unlock better deals', icon: <ShieldCheck size={20} />, href: '/farmer/verify' },
    ],
  },
];

function SignOutInline() {
  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.replace('/auth/signin');
  }
  return (
    <button
      onClick={handleSignOut}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', width: '100%', textAlign: 'left', background: 'var(--d-card)', border: 'none', cursor: 'pointer' }}
    >
      <span style={{ width: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LogOut size={20} style={{ color: 'var(--color-danger)' }} />
      </span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-danger)', marginBottom: 1 }}>Sign Out</p>
        <p style={{ fontSize: 12, color: C.muted }}>Log out of your Cropify account</p>
      </div>
      <span style={{ color: C.muted, fontSize: 16 }}>›</span>
    </button>
  );
}

export default function FarmerSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 13, color: C.muted }}>Manage your farmer account and preferences</p>
      </div>

      <SettingsRoleSwitcher />

      <PasskeySettings />

      {SECTIONS.map(section => (
        <div key={section.title}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{section.title}</p>
          <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.shadow, overflow: 'hidden' }}>
            {section.items.map((item, i) => (
              <a key={item.label} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', textDecoration: 'none', borderBottom: i < section.items.length - 1 ? `1px solid ${C.border}` : 'none', background: C.cardBg }}>
                <span style={{ width: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 1 }}>{item.label}</p>
                  <p style={{ fontSize: 12, color: C.muted }}>{item.desc}</p>
                </div>
                <span style={{ color: C.muted, fontSize: 16 }}>›</span>
              </a>
            ))}
          </div>
        </div>
      ))}

      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Danger Zone</p>
        <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.shadow, overflow: 'hidden' }}>
          <SignOutInline />
          <div style={{ borderTop: '1px solid var(--d-border)' }}>
            <DeleteAccountButton />
          </div>
        </div>
      </div>
    </div>
  );
}
