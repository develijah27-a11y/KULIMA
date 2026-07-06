'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthLayout } from '@/features/auth/components/AuthLayout';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // /auth/confirm already verified the recovery token and set the session
  // cookie before redirecting here — just confirm a session actually exists
  // (e.g. guards against someone opening this URL directly with no token).
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/auth/forgot-password');
        return;
      }
      setReady(true);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match. Please re-type them.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <AuthLayout title="Set a new password">
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(240,253,244,0.55)', fontSize: 14 }}>
          Verifying your reset link…
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a password you haven't used before">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm mb-1.5" style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
            New password
          </label>
          <input
            id="password" type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            required minLength={6} disabled={loading}
            className="auth-input"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm mb-1.5" style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
            Confirm new password
          </label>
          <input
            id="confirmPassword" type="password" value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
            required minLength={6} disabled={loading}
            className="auth-input"
          />
        </div>

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm whitespace-pre-line"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#FCA5A5' }}
            role="alert"
          >
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="auth-btn" style={{ marginTop: 8 }}>
          {loading ? 'Saving…' : 'Save new password'}
        </button>
      </form>
    </AuthLayout>
  );
}
