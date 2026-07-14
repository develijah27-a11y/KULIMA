'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

interface AuthFormProps {
  mode: 'signin' | 'signup';
}

const supabase = createClient();

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPwd]  = useState(false);
  const [fullName, setFullName]     = useState('');
  const [phoneNumber, setPhone]     = useState('');
  const [location, setLocation]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [success, setSuccess]       = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resending, setResending]   = useState(false);
  const [resent, setResent]         = useState(false);

  const isSigningUpRef = useRef(false);
  const submitLockRef = useRef(false);
  // Only true after the user clicks Submit — prevents the INITIAL_SESSION
  // event (fired on page-load with an existing cookie) from auto-redirecting
  // the user without them entering credentials.
  const hasSubmittedRef = useRef(false);
  const [clearingSession, setClearingSession] = useState(false);

  // On the signup page: if there is already an active session, sign out via the
  // server endpoint so HttpOnly cookies are fully cleared, then reload clean.
  useEffect(() => {
    if (mode !== 'signup') return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setClearingSession(true);
      fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
        window.location.reload();
      });
    });
  }, [mode]);

  // Redirect to dashboard on SIGNED_IN only after the user submitted the form.
  // Without hasSubmittedRef, the INITIAL_SESSION event (fired when the page
  // loads with a valid cookie) would auto-redirect before the user types anything.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !isSigningUpRef.current && hasSubmittedRef.current) {
        fetch('/api/auth/verification-check', { method: 'POST' }).catch(() => {});
        router.push('/dashboard');
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    hasSubmittedRef.current = true;

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords don\'t match. Please re-type them.');
      submitLockRef.current = false;
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setNeedsConfirmation(false);
    setResent(false);

    try {
      if (mode === 'signup') {
        isSigningUpRef.current = true;

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, phone_number: phoneNumber, location },
            emailRedirectTo: `${window.location.origin}/auth/confirm`,
          },
        });

        isSigningUpRef.current = false;

        if (signUpError) throw signUpError;

        // Supabase returns identities=[] when email already exists AND email
        // confirmation is enabled.
        if (data.user?.identities && data.user.identities.length === 0) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }

        // When email confirmation is DISABLED, Supabase silently signs in the
        // existing owner if the email is already taken — detect this by checking
        // how old the account is. A genuinely new account was created seconds ago.
        if (data.user && data.session) {
          const createdAt = new Date(data.user.created_at).getTime();
          const ageSeconds = (Date.now() - createdAt) / 1000;
          if (ageSeconds > 30) {
            // This is an existing account — sign out immediately and show an error
            await supabase.auth.signOut();
            throw new Error('An account with this email already exists. Please sign in instead.');
          }
        }

        if (data.session && data.user) {
          // A session came back immediately — only possible if email
          // confirmation is off. Create the profile now, since this is the
          // one path where the user is already authenticated post-signUp().
          await fetch('/api/auth/create-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              fullName: fullName || data.user.email?.split('@')[0] || 'User',
              phoneNumber: phoneNumber || null,
              location: location || null,
            }),
          }).catch(() => {});
          router.push('/dashboard');
          router.refresh();
          return;
        }

        // Standard path: email confirmation is required, so there's no
        // session yet — the profile gets created in /auth/confirm/route.ts
        // once the user actually clicks the link and is authenticated.
        setSuccess(`Account created! We've sent a confirmation link to ${email} — click it to activate your account.`);
        setNeedsConfirmation(true);
      } else {
        // ── Sign in ──────────────────────────────────────────────────────────
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        // onAuthStateChange fires SIGNED_IN → router.push('/dashboard')
      }
    } catch (err: unknown) {
      isSigningUpRef.current = false;
      const msg = err instanceof Error ? err.message : 'Something went wrong';

      const lower = msg.toLowerCase();
      if (err instanceof TypeError || lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('fetch')) {
        setError(
          'Network error — cannot reach Supabase.\n\n' +
          '1. Check your internet connection\n' +
          '2. Visit supabase.com/dashboard — free tier pauses after 7 days of inactivity\n' +
          '3. Restart the dev server after editing .env.local'
        );
      } else if (lower.includes('invalid login credentials')) {
        setError('Wrong email or password. Please try again.');
      } else if (lower.includes('email not confirmed')) {
        setError('Your email address is not confirmed yet. Please check your inbox and click the confirmation link, then try signing in again.');
        setNeedsConfirmation(true);
      } else {
        // Only log errors that aren't expected auth failures
        console.error('[AgriNova Auth] Unexpected error during', mode, ':', err);
        setError(msg);
      }
    } finally {
      setLoading(false);
      submitLockRef.current = false;
    }
  };

  const resendConfirmation = async () => {
    if (!email || resending) return;
    setResending(true);
    setResent(false);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      });
      if (resendError) throw resendError;
      setResent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend the email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (clearingSession) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(240,253,244,0.55)', fontSize: 14 }}>
        Preparing sign-up form…
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      autoComplete={mode === 'signup' ? 'off' : 'on'}
    >
      {/* Hidden dummy inputs stop Chrome/Safari from injecting saved credentials */}
      {mode === 'signup' && (
        <>
          <input type="text" name="prevent_autofill" style={{ display: 'none' }} readOnly tabIndex={-1} />
          <input type="password" name="prevent_autofill_pw" style={{ display: 'none' }} readOnly tabIndex={-1} />
        </>
      )}

      {mode === 'signup' && (
        <>
          <div>
            <label htmlFor="fullName" className="block text-sm mb-1.5"
              style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
              Full name
            </label>
            <input
              id="fullName" type="text" value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
              autoComplete="off"
              required disabled={loading}
              className="auth-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="phoneNumber" className="block text-sm mb-1.5"
                style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
                Phone <span className="ml-1 text-xs" style={{ color: 'rgba(240,253,244,0.45)', fontWeight: 600 }}>optional</span>
              </label>
              <input
                id="phoneNumber" type="tel" value={phoneNumber}
                onChange={e => setPhone(e.target.value)}
                placeholder="+256 700 000000"
                autoComplete="off"
                disabled={loading} className="auth-input"
              />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm mb-1.5"
                style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
                District <span className="ml-1 text-xs" style={{ color: 'rgba(240,253,244,0.45)', fontWeight: 600 }}>optional</span>
              </label>
              <input
                id="location" type="text" value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Kampala"
                autoComplete="off"
                disabled={loading} className="auth-input"
              />
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
        </>
      )}

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm mb-1.5"
          style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
          Email address
        </label>
        <input
          id="email" type="email" value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete={mode === 'signup' ? 'off' : 'email'}
          required disabled={loading}
          className="auth-input"
        />
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm mb-1.5"
          style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
          Password
          {mode === 'signup' && (
            <span className="ml-1 text-xs" style={{ color: 'rgba(240,253,244,0.45)', fontWeight: 600 }}>
              min. 6 characters
            </span>
          )}
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={showPassword ? 'Enter your password' : '••••••••'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required minLength={6}
            disabled={loading}
            className="auth-input"
            style={{ paddingRight: 48 }}
          />
          <button
            type="button"
            onClick={() => setShowPwd(v => !v)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute', right: 14, top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none', padding: 4,
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              color: '#9CA3AF', borderRadius: 6,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
          >
            {showPassword ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {/* Confirm password — signup only. Catches typos and browser/OS
          "suggest a strong password" auto-fills silently replacing what the
          user actually typed, which reads to users as "the app forced a
          password on me" when it happens. */}
      {mode === 'signup' && (
        <div>
          <label htmlFor="confirmPassword" className="block text-sm mb-1.5"
            style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder={showPassword ? 'Re-enter your password' : '••••••••'}
            autoComplete="new-password"
            required minLength={6}
            disabled={loading}
            className="auth-input"
          />
        </div>
      )}

      {/* Error — red */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm whitespace-pre-line"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)',
            color: '#FCA5A5',
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Success — green */}
      {success && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: 'rgba(34,197,94,0.10)',
            border: '1px solid rgba(34,197,94,0.25)',
            color: '#86efac',
          }}
          role="status"
        >
          {success}
        </div>
      )}

      {/* Resend confirmation — shown after signup, or when sign-in is blocked
          on an unconfirmed email. Covers the expired-link / lost-email case
          modern apps always account for. */}
      {needsConfirmation && (
        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            onClick={resendConfirmation}
            disabled={resending}
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: 13, fontWeight: 700,
              color: resending ? 'rgba(240,253,244,0.35)' : 'var(--color-primary)',
              cursor: resending ? 'default' : 'pointer', textDecoration: 'underline',
            }}
          >
            {resending ? 'Sending…' : resent ? 'Email sent — check your inbox' : "Didn't get it? Resend confirmation email"}
          </button>
        </div>
      )}

      <button type="submit" disabled={loading} className="auth-btn" style={{ marginTop: 8 }}>
        {loading
          ? mode === 'signup' ? 'Creating account…' : 'Signing in…'
          : mode === 'signup' ? 'Create account' : 'Sign in'}
      </button>

      {mode === 'signup' && (
        <p style={{ fontSize: 11.5, color: 'rgba(240,253,244,0.45)', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
          By creating an account, you agree to AgriNova's{' '}
          <Link href="/terms" target="_blank" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Terms &amp; Conditions</Link>
          {' '}and{' '}
          <Link href="/privacy" target="_blank" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Privacy Policy</Link>.
        </p>
      )}

    </form>
  );
}
