'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AuthLayout } from '@/features/auth/components/AuthLayout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        // Supabase appends its own ?token_hash=...&type=recovery to this URL —
        // /auth/confirm verifies that token, then forwards to our `next` page.
        redirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent('/auth/reset-password')}`,
      });
      if (resetError) throw resetError;
      // Always show the same success message regardless of whether the email
      // exists — confirming/denying an account's existence here would let
      // anyone enumerate registered emails.
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
      subtitle="We'll email you a link to choose a new one"
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
          If an account exists for {email}, we've sent a link to reset the password. Check your inbox.
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
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
