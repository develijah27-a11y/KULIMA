'use client';

import { SettingsRoleSwitcher } from '@/components/ui/SettingsRoleSwitcher';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)', cardBg: 'var(--d-card)',
};

const SECTIONS = [
  {
    title: 'Account',
    items: [
      { label: 'My Profile', desc: 'View and edit your name, phone, and location', icon: '👤', href: '/farmer/profile' },
      { label: 'Wallet & Finance', desc: 'Manage your balance, deposits, and withdrawals', icon: '💳', href: '/farmer/wallet' },
      { label: 'Notifications', desc: 'Price alerts, offer updates, and farm reminders', icon: '🔔', href: '/farmer/notifications' },
    ],
  },
  {
    title: 'Farm & Market',
    items: [
      { label: 'My Listings', desc: 'Manage crops you have listed for sale', icon: '🌾', href: '/farmer/marketplace' },
      { label: 'My Orders', desc: 'Track orders from buyers', icon: '📦', href: '/farmer/orders' },
      { label: 'My Farm', desc: 'Update farm details, size, and crop history', icon: '🚜', href: '/farmer/farm' },
      { label: 'Planting Calendar', desc: 'Record planting and expected harvest dates', icon: '📅', href: '/farmer/planting' },
      { label: 'Finance & Loans', desc: 'View loans, repayments, and financial history', icon: '💰', href: '/farmer/finance' },
    ],
  },
  {
    title: 'Trust & Verification',
    items: [
      { label: 'Get Verified', desc: 'Upload your ID and farm documents to unlock better deals', icon: '✅', href: '/farmer/verify' },
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
      <span style={{ fontSize: 20, width: 36, textAlign: 'center', flexShrink: 0 }}>🚪</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-danger)', marginBottom: 1 }}>Sign Out</p>
        <p style={{ fontSize: 12, color: C.muted }}>Log out of your Kulima account</p>
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

      {SECTIONS.map(section => (
        <div key={section.title}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{section.title}</p>
          <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.shadow, overflow: 'hidden' }}>
            {section.items.map((item, i) => (
              <a key={item.label} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', textDecoration: 'none', borderBottom: i < section.items.length - 1 ? `1px solid ${C.border}` : 'none', background: C.cardBg }}>
                <span style={{ fontSize: 20, width: 36, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
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
        </div>
      </div>
    </div>
  );
}
