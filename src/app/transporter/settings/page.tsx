'use client';

import { SettingsRoleSwitcher } from '@/components/ui/SettingsRoleSwitcher';
import { Truck, Banknote, Bell, Snowflake, Inbox, Map, CheckCircle2, LogOut } from 'lucide-react';

const C = {
  text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)',
  shadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)', cardBg: 'var(--d-card)',
};

const SECTIONS = [
  {
    title: 'Account',
    items: [
      { label: 'Driver Profile', desc: 'Update your name, photo and contact details', icon: <Truck size={20} />, href: '/farmer/profile' },
      { label: 'Wallet & Earnings', desc: 'Manage your mobile money and withdraw earnings', icon: <Banknote size={20} />, href: '/transporter/wallet' },
      { label: 'Notifications', desc: 'Job alerts, payment notifications and updates', icon: <Bell size={20} />, href: '/transporter/notifications' },
    ],
  },
  {
    title: 'My Vehicle',
    items: [
      { label: 'Vehicle', desc: 'Update truck type, plate, capacity and cold chain status', icon: <Truck size={20} />, href: '/transporter/vehicle' },
      { label: 'Cool Transport Logs', desc: 'Temperature compliance records for perishable loads', icon: <Snowflake size={20} />, href: '/transporter/cold-chain' },
    ],
  },
  {
    title: 'Jobs',
    items: [
      { label: 'Available Jobs', desc: 'Browse and filter open delivery requests', icon: <Inbox size={20} />, href: '/transporter/job-queue' },
      { label: 'Active Jobs', desc: 'Manage current assignments and update status', icon: <Map size={20} />, href: '/transporter/active' },
      { label: 'Completed Deliveries', desc: 'View your full delivery history', icon: <CheckCircle2 size={20} />, href: '/transporter/deliveries' },
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
        <p style={{ fontSize: 12, color: C.muted }}>Log out of your AgriNova account</p>
      </div>
      <span style={{ color: C.muted, fontSize: 16 }}>›</span>
    </button>
  );
}

export default function TransporterSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 13, color: C.muted }}>Manage your driver account and preferences</p>
      </div>
      <SettingsRoleSwitcher />
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
        </div>
      </div>
    </div>
  );
}
