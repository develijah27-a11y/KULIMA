'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AuthLayout } from '@/features/auth/components/AuthLayout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Clear any existing session so requesting a password reset is strictly isolated
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.auth.signOut().catch(() => {});
        fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Goes through our own API route (generates the recovery link via the
      // admin API and emails it through our own sender) rather than calling
      // supabase.auth.resetPasswordForEmail() directly — see
      // /api/auth/forgot-password for why. That route always resolves
      // success regardless of whether the account exists, by design.
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Something went wrong. Please try again.');
      }
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="We'll email you a link to set a new password for your account"
      footer={
        <span>
          Remembered it after all?{' '}
          <Link href="/auth/signin" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
            Sign in
          </Link>
        </span>
      }
    >
      {sent ? (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac' }}
          role="status"
        >
          Check your inbox. A password reset link is on its way and may take a minute to arrive.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm mb-1.5" style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
              Email address
            </label>
            <input
              id="email" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required disabled={loading}
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
            {loading ? 'Sending…' : 'Send reset email'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
