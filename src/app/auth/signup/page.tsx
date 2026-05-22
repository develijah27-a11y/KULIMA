'use client';

import Link from 'next/link';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { AuthLayout } from '@/features/auth/components/AuthLayout';

export default function SignUpPage() {
  return (
    <AuthLayout title="Create Your Account" subtitle="Join Kulima for smart farm management">
      <AuthForm mode="signup" />
      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{' '}
        <Link href="/auth/signin" className="text-green-600 hover:text-green-700">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}