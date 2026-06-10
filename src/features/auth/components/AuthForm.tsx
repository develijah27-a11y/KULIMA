'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface AuthFormProps {
  mode: 'signin' | 'signup';
}

export function AuthForm({ mode }: AuthFormProps) {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Ref is synchronous — set BEFORE signUp() call so the auth listener sees it immediately
  const isSigningUpRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Only auto-redirect on SIGNED_IN when we are NOT in the middle of a sign-up flow.
      // (sign-up manages its own redirect after checking for duplicate accounts etc.)
      if (event === 'SIGNED_IN' && session && !isSigningUpRef.current) {
        router.push('/dashboard');
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'signup') {
        // Block the auth-state listener from auto-redirecting during sign-up
        isSigningUpRef.current = true;

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, phone_number: phoneNumber, location },
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
          },
        });

        // Always release the lock after signUp returns
        isSigningUpRef.current = false;

        if (signUpError) throw signUpError;

        // Supabase returns identities=[] when the email is already registered
        if (data.user?.identities && data.user.identities.length === 0) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }

        // Create profile server-side (bypasses RLS / email-confirmation race condition)
        if (data.user) {
          await fetch('/api/auth/create-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              fullName: fullName || data.user.email?.split('@')[0] || 'User',
              phoneNumber: phoneNumber || null,
              location: location || null,
            }),
          }).catch(() => {
            // Best effort — getOrCreateProfile in API routes will handle it on first real request
          });
        }

        if (data.session) {
          // Email confirmation is disabled — user is signed in immediately, redirect now
          router.push('/dashboard');
          router.refresh();
          return;
        }

        // Email confirmation is enabled — show success, stay on this page
        setSuccess('Account created! Check your email to confirm, then sign in.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        // onAuthStateChange will fire SIGNED_IN and redirect
      }
    } catch (err: unknown) {
      isSigningUpRef.current = false;
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      console.error('[Kulima Auth] Error during', mode, ':', err);
      if (msg === 'Failed to fetch' || msg.includes('NetworkError') || msg.includes('fetch')) {
        setError(
          'Network error — could not reach Supabase.\n\n' +
          'Open the browser console (F12 → Console) and look for a [Kulima] message showing your project ref.\n\n' +
          'Common fixes:\n' +
          '1. Check your internet connection\n' +
          '2. Visit supabase.com/dashboard — free tier pauses after 7 days of inactivity\n' +
          '3. Restart the dev server after editing .env.local (Ctrl+C then npm run dev)'
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {mode === 'signup' && (
        <>
          {/* Full Name */}
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'rgba(249,250,251,0.75)' }}
            >
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Hannington Mugisha"
              required
              disabled={loading}
              className="auth-input"
            />
          </div>

          {/* Phone + Location side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'rgba(249,250,251,0.75)' }}
              >
                Phone
                <span className="ml-1 text-xs" style={{ color: 'rgba(249,250,251,0.35)' }}>optional</span>
              </label>
              <input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+256 700 000000"
                disabled={loading}
                className="auth-input"
              />
            </div>
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'rgba(249,250,251,0.75)' }}
              >
                District
                <span className="ml-1 text-xs" style={{ color: 'rgba(249,250,251,0.35)' }}>optional</span>
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Kampala"
                disabled={loading}
                className="auth-input"
              />
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
        </>
      )}

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium mb-1.5"
          style={{ color: 'rgba(249,250,251,0.75)' }}
        >
          Email address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={loading}
          className="auth-input"
        />
      </div>

      {/* Password */}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium mb-1.5"
          style={{ color: 'rgba(249,250,251,0.75)' }}
        >
          Password
          {mode === 'signup' && (
            <span className="ml-1 text-xs" style={{ color: 'rgba(249,250,251,0.35)' }}>min. 6 characters</span>
          )}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={6}
          disabled={loading}
          className="auth-input"
        />
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm whitespace-pre-line"
          style={{
            background: 'rgba(22,163,74,0.08)',
            border: '1px solid rgba(22,163,74,0.3)',
            color: '#BBF7D0',
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.25)',
            color: '#86efac',
          }}
          role="status"
        >
          {success}
        </div>
      )}

      {/* Submit */}
      <button type="submit" disabled={loading} className="auth-btn" style={{ marginTop: '8px' }}>
        {loading
          ? mode === 'signup' ? 'Creating account…' : 'Signing in…'
          : mode === 'signup' ? 'Create account' : 'Sign in'}
      </button>

    </form>
  );
}
