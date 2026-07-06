'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { Suspense } from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';

function SignInContent() {
  const params = useSearchParams();
  const error  = params.get('error');
  const reason = params.get('reason');

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your AgriNova account"
      footer={
        <span>
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/signup"
            style={{ color: 'var(--color-primary)', fontWeight: 700 }}
          >
            Create one
          </Link>
        </span>
      }
    >
      {/* Session-expired security notice */}
      {reason === 'session_expired' && (
        <div
          className="rounded-xl px-4 py-3 text-sm mb-4 flex items-start gap-3"
          style={{
            background: 'rgba(251,191,36,0.10)',
            border: '1px solid rgba(251,191,36,0.30)',
            color: '#FDE68A',
          }}
          role="status"
          aria-live="polite"
        >
          <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            For your security, sessions expire after 12 hours. Please sign in again to continue.
          </span>
        </div>
      )}

      {/* Generic error param */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm mb-4 flex items-start gap-3 whitespace-pre-line"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)',
            color: '#FCA5A5',
          }}
          role="alert"
        >
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            {error === 'missing_token'
              ? 'Invalid confirmation link. Please sign in or request a new confirmation email.'
              : error}
          </span>
        </div>
      )}

      <AuthForm mode="signin" />

      <div className="text-center mt-4">
        <Link
          href="/auth/forgot-password"
          className="text-sm"
          style={{ color: 'rgba(240,253,244,0.55)', fontWeight: 600 }}
        >
          Forgot your password?
        </Link>
      </div>
    </AuthLayout>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
