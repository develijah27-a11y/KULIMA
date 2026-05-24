'use client';

import { useState, useEffect, type FormEvent } from 'react';
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.push('/dashboard');
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, router]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, phone_number: phoneNumber, location },
          },
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          await supabase.from('profiles').upsert(
            {
              user_id: data.user.id,
              full_name: fullName,
              phone_number: phoneNumber || null,
              location: location || null,
            },
            { onConflict: 'user_id' }
          );
        }

        setSuccess('Account created! Check your email to confirm, then sign in.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
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
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.25)',
            color: '#fca5a5',
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
