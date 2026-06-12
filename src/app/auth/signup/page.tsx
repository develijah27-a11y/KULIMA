'use client';

import Link from 'next/link';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { AuthLayout } from '@/features/auth/components/AuthLayout';

export default function SignUpPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start managing your farm smarter"
      footer={
        <span>
          Already have an account?{' '}
          <Link
            href="/auth/signin"
            style={{ color: '#F97316', fontWeight: 700 }}
          >
            Sign in
          </Link>
        </span>
      }
    >
      <AuthForm mode="signup" />
    </AuthLayout>
  );
}
