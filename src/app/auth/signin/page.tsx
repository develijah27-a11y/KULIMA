'use client';

import Link from 'next/link';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { AuthLayout } from '@/features/auth/components/AuthLayout';

export default function SignInPage() {
  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Kulima account"
      footer={
        <span>
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/signup"
            style={{ color: 'var(--color-sprout)', fontWeight: 600 }}
          >
            Create one
          </Link>
        </span>
      }
    >
      <AuthForm mode="signin" />
    </AuthLayout>
  );
}
