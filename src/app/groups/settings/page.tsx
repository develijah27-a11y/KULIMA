'use client';

import { SettingsRoleSwitcher } from '@/components/ui/SettingsRoleSwitcher';

const C = { text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', shadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)', cardBg: 'var(--d-card)' };

const SECTIONS = [
  {
    title: 'Account',
    items: [
      { label: 'Leader Profile', desc: 'Update your name, phone, and contact details', icon: '👤', href: '/farmer/profile' },
      { label: 'Group Wallet', desc: 'Manage group savings and transaction history', icon: '💰', href: '/groups/wallet' },
      { label: 'Notifications', desc: 'Member alerts and market updates', icon: '🔔', href: '/groups/notifications' },
    ],
  },
  {
    title: 'Group Management',
    items: [
      { label: 'Members', desc: 'View and manage group members', icon: '👥', href: '/groups/members' },
      { label: 'Announcements', desc: 'Post updates and notices to your group', icon: '📢', href: '/groups/announcements' },
      { label: 'Group Chat', desc: 'Send messages and updates to members', icon: '💬', href: '/groups/chat' },
    ],
  },
  {
    title: 'Finance & Planning',
    items: [
      { label: 'Group Finance', desc: 'Track savings, loans, and contributions', icon: '📊', href: '/groups/finance' },
      { label: 'Season Planning', desc: 'Coordinate planting and harvest schedules', icon: '📅', href: '/groups/season' },
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

export default function GroupsSettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 13, color: C.muted }}>Manage your group and account settings</p>
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
