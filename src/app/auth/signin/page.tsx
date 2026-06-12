'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { Suspense } from 'react';

function SignInContent() {
  const params = useSearchParams();
  const error = params.get('error');

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Kulima account"
      footer={
        <span>
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/signup"
            style={{ color: '#F97316', fontWeight: 700 }}
          >
            Create one
          </Link>
        </span>
      }
    >
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm mb-4 whitespace-pre-line"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)',
            color: '#FCA5A5',
          }}
          role="alert"
        >
          {error === 'missing_token'
            ? 'Invalid confirmation link. Please sign in or request a new confirmation email.'
            : error}
        </div>
      )}
      <AuthForm mode="signin" />
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
