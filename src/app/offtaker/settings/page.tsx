'use client';

import { SettingsRoleSwitcher } from '@/components/ui/SettingsRoleSwitcher';

const C = { text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', shadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)', cardBg: 'var(--d-card)' };

const SECTIONS = [
  {
    title: 'Account',
    items: [
      { label: 'Company Profile', desc: 'Update your name, phone, and contact details', icon: '🏢', href: '/farmer/profile' },
      { label: 'Wallet & Payments', desc: 'Manage your balance and payment history', icon: '💳', href: '/offtaker/wallet' },
      { label: 'Notifications', desc: 'Contract alerts and delivery updates', icon: '🔔', href: '/offtaker/notifications' },
    ],
  },
  {
    title: 'Procurement',
    items: [
      { label: 'My Contracts', desc: 'View and manage forward purchase agreements', icon: '📄', href: '/offtaker/contracts' },
      { label: 'Supply Pipeline', desc: 'Track committed volumes from farmers', icon: '🌾', href: '/offtaker/pipeline' },
      { label: 'Supplier Scorecard', desc: 'Rate and review your farmer suppliers', icon: '⭐', href: '/offtaker/scorecard' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { label: 'Spend Analytics', desc: 'Breakdown of spend by crop and time period', icon: '📊', href: '/offtaker/spend' },
      { label: 'Quality & Compliance', desc: 'Fulfilment rates and quality standards tracking', icon: '✅', href: '/offtaker/quality' },
      { label: 'Risk Alerts', desc: 'Supply risk flags and early warnings', icon: '⚠️', href: '/offtaker/risk' },
    ],
  },
];

function SignOutInline() {
  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.replace('/auth/signin');
  }
  return (
    <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', width: '100%', textAlign: 'left', background: 'var(--d-card)', border: 'none', cursor: 'pointer' }}>
      <span style={{ fontSize: 20, width: 36, textAlign: 'center', flexShrink: 0 }}>🚪</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-danger)', marginBottom: 1 }}>Sign Out</p>
        <p style={{ fontSize: 12, color: C.muted }}>Log out of your Kulima account</p>
      </div>
      <span style={{ color: C.muted, fontSize: 16 }}>›</span>
    </button>
  );
}

export default function OfftakerSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 13, color: C.muted }}>Manage your offtaker account and preferences</p>
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
