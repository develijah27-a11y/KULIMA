import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/supabase/auth-cache';

const C = { text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', green: '#1B4332', greenMed: '#40916C', shadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.05)', cardBg: 'var(--d-card)' };

const SECTIONS = [
  {
    title: 'Account',
    items: [
      { label: 'Edit Profile', desc: 'Update your name, photo, and location', icon: '👤', href: '/farmer/profile' },
      { label: 'Change Phone / MoMo', desc: 'Update your linked mobile money number', icon: '📱', href: '#' },
      { label: 'Change Password', desc: 'Update your login password', icon: '🔑', href: '#' },
    ],
  },
  {
    title: 'Notifications',
    items: [
      { label: 'Push Notifications', desc: 'Market alerts, order updates, planting reminders', icon: '🔔', href: '#' },
      { label: 'SMS Alerts', desc: 'Receive critical alerts via SMS', icon: '💬', href: '#' },
    ],
  },
  {
    title: 'Verification',
    items: [
      { label: 'Get Verified', desc: 'Upload ID and farm documents to unlock higher trust', icon: '✅', href: '/farmer/verify' },
    ],
  },
  {
    title: 'Language & Region',
    items: [
      { label: 'Language', desc: 'English / Luganda / Runyankole', icon: '🌍', href: '#' },
      { label: 'Currency & Units', desc: 'UGX · Hectares · Kilograms', icon: '⚖️', href: '#' },
    ],
  },
  {
    title: 'Danger Zone',
    items: [
      { label: 'Sign Out', desc: 'Log out of your Kulima account', icon: '🚪', href: '/auth/signout', danger: true },
    ],
  },
];

export default async function SettingsPage() {
  const session = await getAuthSession();
  if (!session?.user) redirect('/auth/signin');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', marginBottom: 4 }}>Settings</h1>
        <p style={{ fontSize: 13, color: C.muted }}>Manage your account, notifications, and preferences</p>
      </div>

      {SECTIONS.map(section => (
        <div key={section.title}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            {section.title}
          </p>
          <div style={{ background: C.cardBg, borderRadius: 14, boxShadow: C.shadow, overflow: 'hidden' }}>
            {section.items.map((item: any, i: number) => (
              <a
                key={item.label}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px', textDecoration: 'none',
                  borderBottom: i < section.items.length - 1 ? `1px solid ${C.border}` : 'none',
                  background: C.cardBg,
                }}
              >
                <span style={{ fontSize: 20, width: 36, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: item.danger ? '#DC2626' : C.text, marginBottom: 1 }}>{item.label}</p>
                  <p style={{ fontSize: 12, color: C.muted }}>{item.desc}</p>
                </div>
                <span style={{ color: C.muted, fontSize: 16 }}>›</span>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
