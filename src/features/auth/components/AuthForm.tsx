'use client';
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

interface AuthFormProps {
  mode: 'signin' | 'signup';
}

const supabase = createClient();

const OTP_EXPIRY_SECONDS = 3600;

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();

  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPwd]            = useState(false);
  const [fullName, setFullName]               = useState('');
  const [phoneNumber, setPhone]               = useState('');
  const [location, setLocation]               = useState('');
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [success, setSuccess]                 = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resending, setResending]             = useState(false);
  const [resent, setResent]                   = useState(false);
  const [code, setCode]                       = useState('');
  const [verifying, setVerifying]             = useState(false);
  const [codeSentAt, setCodeSentAt]           = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft]         = useState<number | null>(null);
  const [clearingSession, setClearingSession] = useState(false);

  const isSigningUpRef  = useRef(false);
  const submitLockRef   = useRef(false);
  const hasSubmittedRef = useRef(false);

  // On signup page: clear any existing session first so form starts clean
  useEffect(() => {
    if (mode !== 'signup') return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setClearingSession(true);
      fetch('/api/auth/logout', { method: 'POST' }).finally(() => window.location.reload());
    });
  }, [mode]);

  // Redirect on SIGNED_IN — only after user actually submitted the form
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && !isSigningUpRef.current && hasSubmittedRef.current) {
        setTimeout(() => { fetch('/api/auth/verification-check', { method: 'POST' }).catch(() => {}); }, 0);
        router.push('/dashboard');
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // Live OTP countdown
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

  // ── handleSubmit ─────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    submitLockRef.current  = true;
    hasSubmittedRef.current = true;

    if (mode === 'signup' && password !== confirmPassword) {
      setError("Passwords don't match. Please re-type them.");
      submitLockRef.current = false;
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setNeedsConfirmation(false);
    setResent(false);

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

        if (data.user?.identities && data.user.identities.length === 0) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }

        if (data.user && data.session) {
          const ageSeconds = (Date.now() - new Date(data.user.created_at).getTime()) / 1000;
          if (ageSeconds > 30) {
            await supabase.auth.signOut();
            throw new Error('An account with this email already exists. Please sign in instead.');
          }
        }

        if (data.session && data.user) {
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
          return;
        }

        setSuccess(`Account created! We sent a 6-digit code to ${email} — enter it below to activate your account.`);
        setNeedsConfirmation(true);
        setCodeSentAt(Date.now());

      } else {
        // ── Sign in
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (data.session) {
          navigatingAway = true;
          setTimeout(() => { fetch('/api/auth/verification-check', { method: 'POST' }).catch(() => {}); }, 0);
          router.push('/dashboard');
        }
      }

    } catch (err: unknown) {
      isSigningUpRef.current = false;
      const msg   = err instanceof Error ? err.message : 'Something went wrong';
      const lower = msg.toLowerCase();

      // Task 6 — specific, actionable messages for every known Supabase error
      if (err instanceof TypeError || lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('fetch')) {
        console.error('[AgriNova Auth] Connection error during', mode, ':', err);
        setError('No connection — please check your internet and try again.');
      } else if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
        setError('Wrong email or password. Please check and try again.');
      } else if (lower.includes('email not confirmed')) {
        setError('Email not confirmed yet — check your inbox for the confirmation link, then sign in.');
        setNeedsConfirmation(true);
      } else if (lower.includes('too many') || lower.includes('rate limit') || lower.includes('429')) {
        setError('Too many attempts. Please wait a minute then try again.');
      } else if (lower.includes('user already registered') || lower.includes('already exists')) {
        setError('An account with this email already exists. Sign in instead.');
      } else if (lower.includes('password') && (lower.includes('weak') || lower.includes('strength'))) {
        setError('Password is too weak — use at least 6 characters.');
      } else if (lower.includes('invalid email') || lower.includes('unable to validate email')) {
        setError("That email address doesn't look right. Please check it.");
      } else {
        console.error('[AgriNova Auth] Unexpected error during', mode, ':', err);
        setError(msg);
      }

    } finally {
      if (!navigatingAway) setLoading(false);
      submitLockRef.current = false;
    }
  };

  // ── verifyCode ────────────────────────────────────────────────────────────
  const verifyCode = async () => {
    if (code.trim().length < 6 || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'signup' });
      if (verifyError) throw verifyError;

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

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired code';
      setError(
        msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')
          ? 'That code is incorrect or has expired. Please check your email or request a new one.'
          : msg
      );
    } finally {
      setVerifying(false);
    }
  };

  // ── resendConfirmation ────────────────────────────────────────────────────
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

  // ── Clearing session screen ───────────────────────────────────────────────
  if (clearingSession) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(240,253,244,0.55)', fontSize: 14 }}>
        Preparing sign-up form…
      </div>
    );
  }

  // ── OTP verification step ─────────────────────────────────────────────────
  if (needsConfirmation) {
    return (
      <div className="space-y-4">
        {success && (
          <div className="rounded-xl px-4 py-3 text-sm" role="status"
            style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac' }}>
            {success}
          </div>
        )}
        {error && (
          <div className="rounded-xl px-4 py-3 text-sm whitespace-pre-line" role="alert"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#FCA5A5' }}>
            {error}
          </div>
        )}

        <div>
          <label htmlFor="verifyCode" className="block text-sm mb-1.5"
            style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
            6-digit verification code
          </label>
          <input
            id="verifyCode" type="text" inputMode="numeric" autoComplete="one-time-code"
            maxLength={6} value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); verifyCode(); } }}
            placeholder="000000" disabled={verifying} className="auth-input"
            style={{ textAlign: 'center', fontSize: 22, letterSpacing: '0.4em', fontWeight: 800 }}
          />
          {secondsLeft !== null && (
            secondsLeft > 0 ? (
              <p style={{ fontSize: 12, color: 'rgba(240,253,244,0.5)', textAlign: 'center', marginTop: 8 }}>
                Code expires in{' '}
                <span style={{ fontWeight: 700, color: secondsLeft < 60 ? '#FCA5A5' : 'var(--color-text-on-dark)' }}>
                  {formatCountdown(secondsLeft)}
                </span>
              </p>
            ) : (
              <p style={{ fontSize: 12, color: '#FCA5A5', textAlign: 'center', marginTop: 8, fontWeight: 700 }}>
                This code has expired — request a new one below.
              </p>
            )
          )}
        </div>

        <button type="button" onClick={verifyCode}
          disabled={verifying || code.trim().length < 6 || secondsLeft === 0}
          className="auth-btn">
          {verifying ? 'Verifying…' : 'Verify & Continue'}
        </button>

        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <button type="button" onClick={resendConfirmation} disabled={resending}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, fontWeight: 700, color: resending ? 'rgba(240,253,244,0.35)' : 'var(--color-primary)', cursor: resending ? 'default' : 'pointer', textDecoration: 'underline' }}>
            {resending ? 'Sending…' : resent ? 'Email sent — check your inbox' : "Didn't get it? Resend code"}
          </button>
        </div>

        <Link href="/auth/signin"
          style={{ display: 'block', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'rgba(240,253,244,0.55)', marginTop: 4 }}>
          Back to sign in
        </Link>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4"
      autoComplete={mode === 'signup' ? 'off' : 'on'} style={{ paddingBottom: 8 }}>

      {mode === 'signup' && (
        <>
          <input type="text" name="prevent_autofill" style={{ display: 'none' }} readOnly tabIndex={-1} />
          <input type="password" name="prevent_autofill_pw" style={{ display: 'none' }} readOnly tabIndex={-1} />
        </>
      )}

      {mode === 'signup' && (
        <>
          {/* Full name — persistent label, helpful placeholder */}
          <div>
            <label htmlFor="fullName" className="block text-sm mb-1.5"
              style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
              Full name
            </label>
            <input id="fullName" type="text" value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Grace Namutebi"
              autoComplete="off" required disabled={loading} className="auth-input" />
          </div>

          {/* Phone + district in a 2-col grid with persistent labels */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="phoneNumber" className="block text-sm mb-1.5"
                style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
                Phone{' '}
                <span style={{ color: 'rgba(240,253,244,0.45)', fontWeight: 500, fontSize: 11 }}>optional</span>
              </label>
              <input id="phoneNumber" type="tel" value={phoneNumber}
                onChange={e => setPhone(e.target.value)}
                placeholder="+256 700 000000"
                autoComplete="off" disabled={loading} className="auth-input" />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm mb-1.5"
                style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
                District{' '}
                <span style={{ color: 'rgba(240,253,244,0.45)', fontWeight: 500, fontSize: 11 }}>optional</span>
              </label>
              <input id="location" type="text" value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Kampala"
                autoComplete="off" disabled={loading} className="auth-input" />
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
        </>
      )}

      {/* Email — persistent label + inline validation */}
      <div>
        <label htmlFor="email" className="block text-sm mb-1.5"
          style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
          Email address
        </label>
        <input id="email" type="email" value={email}
          onChange={e => {
            setEmail(e.target.value);
            if (error && (error.toLowerCase().includes('email') || error.toLowerCase().includes('account'))) setError(null);
          }}
          placeholder="you@example.com"
          autoComplete={mode === 'signup' ? 'off' : 'email'}
          required disabled={loading} className="auth-input"
          style={email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
            ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.15)' } : {}}
        />
        {email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
          <p style={{ fontSize: 11.5, color: '#FCA5A5', margin: '5px 0 0', fontWeight: 600 }}>
            Enter a valid email address
          </p>
        )}
      </div>

      {/* Password — persistent label + live strength requirements on signup */}
      <div>
        <label htmlFor="password" className="block text-sm mb-1.5"
          style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
          Password
        </label>
        <div style={{ position: 'relative' }}>
          <input id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              if (error && error.toLowerCase().includes('password')) setError(null);
            }}
            placeholder={showPassword ? 'Enter your password' : '••••••••'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required minLength={6} disabled={loading} className="auth-input"
            style={{ paddingRight: 48 }}
          />
          <button type="button" onClick={() => setShowPwd(v => !v)} tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#9CA3AF', borderRadius: 6 }}>
            {showPassword ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
          </button>
        </div>

        {/* Live password requirements — always visible on signup, never a disappearing placeholder */}
        {mode === 'signup' && (
          <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'At least 6 characters', met: password.length >= 6 },
              { label: 'Not only spaces',       met: password.length > 0 && password.trim().length > 0 },
            ].map(({ label, met }) => (
              <span key={label} style={{ fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
                color: password.length === 0 ? 'rgba(240,253,244,0.40)' : met ? '#86efac' : '#FCA5A5' }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9,
                  border: `1.5px solid ${password.length === 0 ? 'rgba(240,253,244,0.25)' : met ? '#86efac' : '#FCA5A5'}` }}>
                  {password.length > 0 && (met ? '✓' : '✕')}
                </span>
                {label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Confirm password — signup only, live match indicator */}
      {mode === 'signup' && (
        <div>
          <label htmlFor="confirmPassword" className="block text-sm mb-1.5"
            style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
            Confirm password
          </label>
          <input id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder={showPassword ? 'Re-enter your password' : '••••••••'}
            autoComplete="new-password" required minLength={6} disabled={loading}
            className="auth-input"
            style={confirmPassword && confirmPassword !== password
              ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.15)' }
              : confirmPassword && confirmPassword === password
                ? { borderColor: '#22C55E', boxShadow: '0 0 0 3px rgba(34,197,94,0.15)' }
                : {}}
          />
          {confirmPassword && confirmPassword !== password && (
            <p style={{ fontSize: 11.5, color: '#FCA5A5', margin: '5px 0 0', fontWeight: 600 }}>
              Passwords don&rsquo;t match
            </p>
          )}
          {confirmPassword && confirmPassword === password && password.length >= 6 && (
            <p style={{ fontSize: 11.5, color: '#86efac', margin: '5px 0 0', fontWeight: 600 }}>
              Passwords match ✓
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm whitespace-pre-line" role="alert"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#FCA5A5' }}>
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="rounded-xl px-4 py-3 text-sm" role="status"
          style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac' }}>
          {success}
        </div>
      )}

      {needsConfirmation && (
        <div style={{ textAlign: 'center' }}>
          <button type="button" onClick={resendConfirmation} disabled={resending}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, fontWeight: 700,
              color: resending ? 'rgba(240,253,244,0.35)' : 'var(--color-primary)',
              cursor: resending ? 'default' : 'pointer', textDecoration: 'underline' }}>
            {resending ? 'Sending…' : resent ? 'Email sent — check your inbox' : "Didn't get it? Resend confirmation email"}
          </button>
        </div>
      )}

      {/* Submit — sticky so it stays above the mobile keyboard */}
      <div style={{ position: 'sticky', bottom: 0, paddingTop: 8, paddingBottom: 4 }}>
        <button type="submit"
          disabled={loading || (mode === 'signup' && !!confirmPassword && confirmPassword !== password)}
          className="auth-btn">
          {loading
            ? mode === 'signup' ? 'Creating account…' : 'Signing in…'
            : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </div>

      {mode === 'signup' && (
        <p style={{ fontSize: 11.5, color: 'rgba(240,253,244,0.45)', textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>
          By creating an account, you agree to AgriNova&rsquo;s{' '}
          <Link href="/terms" target="_blank" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Terms &amp; Conditions</Link>
          {' '}and{' '}
          <Link href="/privacy" target="_blank" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Privacy Policy</Link>.
        </p>
      )}

    </form>
  );
}
