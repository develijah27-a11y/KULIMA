import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { VerificationStatusCard } from '@/components/trust/VerificationStatusCard';
import Link from 'next/link';
import { Settings, ShieldCheck, Wallet, Bell, User } from 'lucide-react';

type Role = 'farmer' | 'buyer' | 'supplier' | 'transporter' | 'pathologist' | 'offtaker';

interface AccountPageProps {
  role: Role;
  roleLabel: string;
  links?: { label: string; href: string; icon: React.ReactNode }[];
}

const DEFAULT_LINKS: Record<Role, { label: string; href: string; icon: React.ReactNode }[]> = {
  farmer:      [
    { label: 'Edit Profile',  href: '/farmer/profile',       icon: <User size={18}/> },
    { label: 'Wallet',        href: '/farmer/wallet',        icon: <Wallet size={18}/> },
    { label: 'Notifications', href: '/farmer/notifications', icon: <Bell size={18}/> },
    { label: 'Get Verified',  href: '/farmer/verify',        icon: <ShieldCheck size={18}/> },
    { label: 'All Settings',  href: '/farmer/settings',      icon: <Settings size={18}/> },
  ],
  buyer: [
    { label: 'Edit Profile',  href: '/buyer/settings',       icon: <User size={18}/> },
    { label: 'Wallet',        href: '/buyer/wallet',         icon: <Wallet size={18}/> },
    { label: 'Notifications', href: '/buyer/notifications',  icon: <Bell size={18}/> },
    { label: 'Get Verified',  href: '/buyer/verify',         icon: <ShieldCheck size={18}/> },
    { label: 'All Settings',  href: '/buyer/settings',       icon: <Settings size={18}/> },
  ],
  supplier: [
    { label: 'Edit Profile',  href: '/supplier/settings',      icon: <User size={18}/> },
    { label: 'Wallet',        href: '/supplier/wallet',        icon: <Wallet size={18}/> },
    { label: 'Notifications', href: '/supplier/notifications', icon: <Bell size={18}/> },
    { label: 'Get Verified',  href: '/supplier/verify',        icon: <ShieldCheck size={18}/> },
    { label: 'All Settings',  href: '/supplier/settings',      icon: <Settings size={18}/> },
  ],
  transporter: [
    { label: 'Edit Profile',  href: '/transporter/settings',      icon: <User size={18}/> },
    { label: 'Wallet',        href: '/transporter/wallet',        icon: <Wallet size={18}/> },
    { label: 'Notifications', href: '/transporter/notifications', icon: <Bell size={18}/> },
    { label: 'Get Verified',  href: '/transporter/verify',        icon: <ShieldCheck size={18}/> },
    { label: 'All Settings',  href: '/transporter/settings',      icon: <Settings size={18}/> },
  ],
  pathologist: [
    { label: 'Settings',      href: '/pathologist/settings',      icon: <Settings size={18}/> },
    { label: 'Get Verified',  href: '/pathologist/verify',        icon: <ShieldCheck size={18}/> },
  ],
  offtaker: [
    { label: 'Settings',      href: '/offtaker/settings',         icon: <Settings size={18}/> },
    { label: 'Get Verified',  href: '/offtaker/verify',           icon: <ShieldCheck size={18}/> },
  ],
};

export async function AccountPage({ role, roleLabel }: AccountPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, location, phone_number')
    .eq('user_id', user.id)
    .single();

  const C = { text: 'var(--d-text)', muted: 'var(--d-muted)', border: 'var(--d-border)', card: 'var(--d-card)', shadow: 'var(--d-shadow-card)' };
  const links = DEFAULT_LINKS[role] ?? [];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-0.03em', margin: 0, fontFamily: "'Poppins','Inter',system-ui,sans-serif" }}>
          My Account
        </h1>
        <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>
          {(profile as any)?.full_name ?? user.email} · {roleLabel}
        </p>
      </div>

      {/* Core: Verification Status */}
      <VerificationStatusCard role={role} />

      {/* Quick links */}
      <div style={{ background: C.card, borderRadius: 16, boxShadow: C.shadow, overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.muted, margin: 0 }}>Quick Links</p>
        </div>
        {links.map((l, i) => (
          <Link key={l.label} href={l.href} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 20px', textDecoration: 'none', borderBottom: i < links.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <span style={{ color: C.muted }}>{l.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{l.label}</span>
            <span style={{ marginLeft: 'auto', color: C.muted, fontSize: 16 }}>›</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
