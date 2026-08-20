'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';

interface SignOutButtonProps {
  borderTop?: boolean;
}

export function SignOutButton({ borderTop = true }: SignOutButtonProps) {
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    // No feedback during a slow logout request used to read as a frozen
    // button; the timeout means a hung request on a weak connection
    // still lets the user out instead of trapping them here.
    try {
      await Promise.race([
        fetch('/api/auth/logout', { method: 'POST' }),
        new Promise(resolve => setTimeout(resolve, 4000)),
      ]);
    } finally {
      window.location.replace('/auth/signin');
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={signingOut}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 20px', width: '100%', textAlign: 'left',
        background: 'var(--d-card)', border: 'none', cursor: signingOut ? 'default' : 'pointer',
        borderTop: borderTop ? '1px solid var(--d-border)' : 'none',
        opacity: signingOut ? 0.6 : 1,
      }}
    >
      <span style={{ width: 36, display: 'flex', justifyContent: 'center', flexShrink: 0, color: 'var(--color-danger)' }}><LogOut size={20} className={signingOut ? 'animate-spin' : ''} /></span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-danger)', marginBottom: 1 }}>{signingOut ? 'Signing out…' : 'Sign Out'}</p>
        <p style={{ fontSize: 12, color: 'var(--d-muted)' }}>Log out of your Cropify account</p>
      </div>
      <span style={{ color: 'var(--d-muted)', fontSize: 16 }}>›</span>
    </button>
  );
}
