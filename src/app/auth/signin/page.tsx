'use client';

import Link from 'next/link';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { AuthLayout } from '@/features/auth/components/AuthLayout';

export default function SignInPage() {
  return (
    <AuthLayout 
      title="Welcome Back" 
      subtitle="Sign in to your account to continue"
      footer={
        <p className="text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="font-medium text-green-600 hover:text-green-500">
            Sign up
          </Link>
        </p>
      }
    >
      <AuthForm mode="signin" />
    </AuthLayout>
  );
}