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

// Matches the project's Auth → Email OTP expiry setting (Supabase dashboard,
// currently 3600s/1h). Purely a display countdown — the server is still the
// one that actually rejects an expired code; this just stops the user from
// being surprised by "invalid code" after sitting on the entry screen.
const OTP_EXPIRY_SECONDS = 3600;

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

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
  const [code, setCode]             = useState('');
  const [verifying, setVerifying]   = useState(false);
  const [codeSentAt, setCodeSentAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

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
        setTimeout(() => {
          fetch('/api/auth/verification-check', { method: 'POST' }).catch(() => {});
        }, 0);
        router.push('/dashboard');
        // No router.refresh() — see comment in handleSubmit
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // Live countdown to when the current code expires — recalculated from the
  // wall-clock send time each tick, so it stays correct even if the tab was
  // backgrounded and setInterval ticks got throttled/delayed.
  useEffect(() => {
    if (!codeSentAt) { setSecondsLeft(null); return; }
    const tick = () => {
      const remaining = OTP_EXPIRY_SECONDS - Math.floor((Date.now() - codeSentAt) / 1000);
      setSecondsLeft(Math.max(0, remaining));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [codeSentAt]);

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

    // Set once a successful path is about to navigate away, so `finally`
    // doesn't flip the button back to "Sign in" mid-redirect — that reset,
    // combined with sign-in depending solely on the async onAuthStateChange
    // listener below to redirect, is what let a slow/missed SIGNED_IN event
    // make it look like sign-in "just stops" with no error and no redirect.
    let navigatingAway = false;

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
          navigatingAway = true;
          router.push('/dashboard');
          // No router.refresh() — session cookie is set, push is enough
          return;
        }

        // Standard path: email confirmation is required, so there's no
        // session yet. The user can either type the 6-digit code below
        // (verified client-side against Supabase, then profile creation via
        // /api/auth/create-profile) or click the link in the same email,
        // which /auth/confirm/route.ts handles and creates the profile there.
        setSuccess(`Account created! We've sent a 6-digit code to ${email} — enter it below to activate your account.`);
        setNeedsConfirmation(true);
        setCodeSentAt(Date.now());
      } else {
        // ── Sign in ──────────────────────────────────────────────────────────
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        // Redirect immediately — signInWithPassword resolving with a session
        // and no error IS success, full stop. The onAuthStateChange listener
        // above also fires SIGNED_IN and redirects, but that's now a backup,
        // not the only path: waiting on it exclusively meant a delayed or
        // missed event left the user signed in with a stuck sign-in form.
        if (data.session) {
          navigatingAway = true;
          // Fire verification-check completely in background — don't let it
          // delay the redirect. The check is best-effort telemetry only.
          setTimeout(() => {
            fetch('/api/auth/verification-check', { method: 'POST' }).catch(() => {});
          }, 0);
          router.push('/dashboard');
          // Do NOT call router.refresh() here — it triggers a full server
          // re-render and adds 1-3 seconds of freeze on mobile. The session
          // cookie is already set by signInWithPassword; router.push is enough.
        }
      }
    } catch (err: unknown) {
      isSigningUpRef.current = false;
      const msg = err instanceof Error ? err.message : 'Something went wrong';

      const lower = msg.toLowerCase();
      if (err instanceof TypeError || lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('fetch')) {
        // The underlying cause (Supabase unreachable, project paused, local
        // env misconfigured) is a developer's problem to diagnose, not a
        // user's — log it for us, show them a normal "try again" message.
        console.error('[AgriNova Auth] Connection error during', mode, ':', err);
        setError('We couldn’t connect right now. Please check your internet connection and try again in a moment.');
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
      if (!navigatingAway) setLoading(false);
      submitLockRef.current = false;
    }
  };

  const verifyCode = async () => {
    if (code.trim().length < 6 || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email, token: code.trim(), type: 'signup',
      });
      if (verifyError) throw verifyError;

      // First time this account is confirmed — same profile-creation step
      // /auth/confirm/route.ts does for the link-click path, just triggered
      // from here since verifyOtp() ran client-side instead of server-side.
      // Only for a fresh signup: on the sign-in-blocked-by-unconfirmed-email
      // path the profile already exists, and fullName/phoneNumber/location
      // are empty state here (that form never collects them) — upserting
      // would blank out the real profile fields for an existing account.
      if (data.user && mode === 'signup') {
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
      }

      hasSubmittedRef.current = true;
      router.push('/dashboard');
      // No router.refresh() — unnecessary and slow on mobile
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired code';
      setError(msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')
        ? 'That code is incorrect or has expired. Please check your email or request a new one.'
        : msg);
    } finally {
      setVerifying(false);
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
      setCodeSentAt(Date.now());
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

  // Once signup succeeds and a confirmation email is on its way — or a
  // sign-in attempt is blocked because the email was never confirmed —
  // replace the form entirely with a code-entry step rather than leaving
  // "Create account"/"Sign in" sitting there right underneath the message.
  // A tester flagged the signup version of this as looking broken, and it
  // was: nothing good happens from clicking the button again.
  if (needsConfirmation) {
    return (
      <div className="space-y-4">
        {success && (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac' }}
            role="status"
          >
            {success}
          </div>
        )}

        {error && (
          <div
            className="rounded-xl px-4 py-3 text-sm whitespace-pre-line"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#FCA5A5' }}
            role="alert"
          >
            {error}
          </div>
        )}

        <div>
          <label htmlFor="verifyCode" className="block text-sm mb-1.5" style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
            6-digit verification code
          </label>
          <input
            id="verifyCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); verifyCode(); } }}
            placeholder="000000"
            disabled={verifying}
            className="auth-input"
            style={{ textAlign: 'center', fontSize: 22, letterSpacing: '0.4em', fontWeight: 800 }}
          />
          {secondsLeft !== null && (
            secondsLeft > 0 ? (
              <p style={{ fontSize: 12, color: 'rgba(240,253,244,0.5)', textAlign: 'center', marginTop: 8 }}>
                Code expires in <span style={{ fontWeight: 700, color: secondsLeft < 60 ? '#FCA5A5' : 'var(--color-text-on-dark)' }}>{formatCountdown(secondsLeft)}</span>
              </p>
            ) : (
              <p style={{ fontSize: 12, color: '#FCA5A5', textAlign: 'center', marginTop: 8, fontWeight: 700 }}>
                This code has expired — request a new one below.
              </p>
            )
          )}
        </div>

        <button
          type="button"
          onClick={verifyCode}
          disabled={verifying || code.trim().length < 6 || secondsLeft === 0}
          className="auth-btn"
        >
          {verifying ? 'Verifying…' : 'Verify & Continue'}
        </button>

        <div style={{ textAlign: 'center', paddingTop: 4 }}>
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
            {resending ? 'Sending…' : resent ? 'Email sent — check your inbox' : "Didn't get it? Resend code"}
          </button>
        </div>

        <Link
          href="/auth/signin"
          style={{ display: 'block', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'rgba(240,253,244,0.55)', marginTop: 4 }}
        >
          Back to sign in
        </Link>
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
