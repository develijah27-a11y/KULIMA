'use client';

import Link from 'next/link';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { AuthLayout } from '@/features/auth/components/AuthLayout';

export default function SignInPage() {
  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to your Kulima account">
      <AuthForm mode="signin" />
      <p className="mt-4 text-center text-sm text-gray-600">
        Don&apos;t have an account?{' '}
        <Link href="/auth/signup" className="text-green-600 hover:text-green-700">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}