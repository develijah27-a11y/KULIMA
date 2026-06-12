'use client';

interface SignOutButtonProps {
  borderTop?: boolean;
}

export function SignOutButton({ borderTop = true }: SignOutButtonProps) {
  async function handleSignOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.replace('/auth/signin');
  }

  return (
    <button
      onClick={handleSignOut}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 20px', width: '100%', textAlign: 'left',
        background: 'var(--d-card)', border: 'none', cursor: 'pointer',
        borderTop: borderTop ? '1px solid var(--d-border)' : 'none',
      }}
    >
      <span style={{ fontSize: 20, width: 36, textAlign: 'center', flexShrink: 0 }}>🚪</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-danger)', marginBottom: 1 }}>Sign Out</p>
        <p style={{ fontSize: 12, color: 'var(--d-muted)' }}>Log out of your Kulima account</p>
      </div>
      <span style={{ color: 'var(--d-muted)', fontSize: 16 }}>›</span>
    </button>
  );
}
