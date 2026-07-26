'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

interface AuthFormProps {
  mode: 'signin' | 'signup';
}

// Stable singleton — never recreated across renders
const supabase = createClient();

const OTP_EXPIRY_SECONDS = 3600;

function formatCountdown(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
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

  // Refs for values that must not cause re-renders when changed
  const isSigningUpRef  = useRef(false);
  const submitLockRef   = useRef(false);
  // Track whether we are mid-submission so the onAuthStateChange listener
  // can redirect without needing hasSubmittedRef — fixes the race condition
  // where mobile keyboard "Go" fires submit but the ref assignment loses
  // the race against a re-render.
  const submittingRef   = useRef(false);

  // ── Sign-out any existing session on the signup page ─────────────────────
  useEffect(() => {
    if (mode !== 'signup') return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setClearingSession(true);
      fetch('/api/auth/logout', { method: 'POST' })
        .finally(() => window.location.reload());
    });
  }, [mode]);

  // ── Listen for SIGNED_IN — used for signup confirmation path only ────────
  // Sign-in redirects directly from signIn() below — we do NOT rely on
  // onAuthStateChange for the sign-in redirect because on mobile it depends
  // on a Supabase Realtime WebSocket connection which can fail silently,
  // leaving the user stuck on "Signing in…" forever.
  // This listener only handles the signup OTP verification path where
  // verifyOtp() triggers a SIGNED_IN event.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session && isSigningUpRef.current === false) {
        // Only act on this for the OTP/signup confirmation flow —
        // sign-in already redirected synchronously in signIn() below.
        setTimeout(() => {
          fetch('/api/auth/verification-check', { method: 'POST' }).catch(() => {});
        }, 0);
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // ── OTP countdown ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!codeSentAt) { setSecondsLeft(null); return; }
    const tick = () => {
      const rem = OTP_EXPIRY_SECONDS - Math.floor((Date.now() - codeSentAt) / 1000);
      setSecondsLeft(Math.max(0, rem));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [codeSentAt]);

  // ── Sign in ───────────────────────────────────────────────────────────────
  // ── Sign in ───────────────────────────────────────────────────────────────
  // Redirects SYNCHRONOUSLY — does NOT rely on onAuthStateChange.
  // On mobile, the Supabase Realtime WebSocket that delivers auth events
  // can fail silently, leaving the user stuck on "Signing in…" forever.
  // signInWithPassword returning a session is enough — redirect immediately.
  const signIn = useCallback(async () => {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    if (data.session) {
      setTimeout(() => {
        fetch('/api/auth/verification-check', { method: 'POST' }).catch(() => {});
      }, 0);
      router.push('/dashboard');
    }
  }, [email, password, router]);

  // ── Sign up ───────────────────────────────────────────────────────────────
  const signUp = useCallback(async () => {
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

    // Email already exists (email confirmation enabled)
    if (data.user?.identities && data.user.identities.length === 0) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    // Email confirmation disabled — Supabase signed in the existing owner silently
    if (data.user && data.session) {
      const ageSeconds = (Date.now() - new Date(data.user.created_at).getTime()) / 1000;
      if (ageSeconds > 30) {
        await supabase.auth.signOut();
        throw new Error('An account with this email already exists. Please sign in instead.');
      }
      // Genuinely new account + immediate session — create profile and redirect
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
      return;
    }

    // Standard path — email confirmation required
    setSuccess(`Account created! We sent a 6-digit code to ${email} — enter it below to activate your account.`);
    setNeedsConfirmation(true);
    setCodeSentAt(Date.now());
  }, [email, password, fullName, phoneNumber, location]);

  // ── handleSubmit ──────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Prevent double-submit (button tap + keyboard Go on mobile)
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    submittingRef.current = true;

    if (mode === 'signup' && password !== confirmPassword) {
      setError("Passwords don't match. Please re-type them.");
      submitLockRef.current = false;
      submittingRef.current = false;
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setNeedsConfirmation(false);
    setResent(false);

    try {
      if (mode === 'signup') {
        await signUp();
      } else {
        await signIn();
      }
    } catch (err: unknown) {
      isSigningUpRef.current = false;
      const msg   = err instanceof Error ? err.message : 'Something went wrong';
      const lower = msg.toLowerCase();

      if (err instanceof TypeError || lower.includes('failed to fetch') || lower.includes('networkerror')) {
        console.error('[AgriNova Auth] Connection error:', err);
        setError('No connection — please check your internet and try again.');
      } else if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
        setError('Wrong email or password. Please check and try again.');
      } else if (lower.includes('email not confirmed')) {
        setError('Email not confirmed yet — check your inbox for the link, then sign in.');
        setNeedsConfirmation(true);
      } else if (lower.includes('too many') || lower.includes('rate limit')) {
        setError('Too many attempts. Please wait a minute then try again.');
      } else if (lower.includes('user already registered') || lower.includes('already exists')) {
        setError('An account with this email already exists. Sign in instead.');
      } else if (lower.includes('password') && (lower.includes('weak') || lower.includes('strength'))) {
        setError('Password is too weak — use at least 6 characters.');
      } else if (lower.includes('invalid email') || lower.includes('unable to validate email')) {
        setError("That email address doesn't look right. Please check it.");
      } else {
        console.error('[AgriNova Auth] Unexpected error:', mode, err);
        setError(msg);
      }

      setLoading(false);
    } finally {
      submitLockRef.current = false;
      submittingRef.current = false;
      // Always reset loading — redirect happens via router.push in signIn(),
      // not via a state update here, so we must clear loading regardless.
      setLoading(false);
    }
  }, [mode, password, confirmPassword, signIn, signUp]);

  // ── verifyCode ────────────────────────────────────────────────────────────
  const verifyCode = useCallback(async () => {
    if (code.trim().length < 6 || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email, token: code.trim(), type: 'signup',
      });
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
      // Redirect directly — don't wait for onAuthStateChange
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired code';
      setError(
        msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')
          ? 'That code is incorrect or has expired. Please check your email or request a new one.'
          : msg,
      );
      setVerifying(false);
    }
  }, [code, verifying, email, mode, fullName, phoneNumber, location]);

  // ── resendConfirmation ────────────────────────────────────────────────────
  const resendConfirmation = useCallback(async () => {
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
  }, [email, resending]);

  // ── Clearing session ──────────────────────────────────────────────────────
  if (clearingSession) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(240,253,244,0.55)', fontSize: 14 }}>
        Preparing sign-up form…
      </div>
    );
  }

  // ── OTP step ──────────────────────────────────────────────────────────────
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
            secondsLeft > 0
              ? <p style={{ fontSize: 12, color: 'rgba(240,253,244,0.5)', textAlign: 'center', marginTop: 8 }}>
                  Code expires in{' '}
                  <span style={{ fontWeight: 700, color: secondsLeft < 60 ? '#FCA5A5' : 'var(--color-text-on-dark)' }}>
                    {formatCountdown(secondsLeft)}
                  </span>
                </p>
              : <p style={{ fontSize: 12, color: '#FCA5A5', textAlign: 'center', marginTop: 8, fontWeight: 700 }}>
                  This code has expired — request a new one below.
                </p>
          )}
        </div>

        <button type="button" onClick={verifyCode}
          disabled={verifying || code.trim().length < 6 || secondsLeft === 0}
          className="auth-btn">
          {verifying ? 'Verifying…' : 'Verify & Continue'}
        </button>

        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <button type="button" onClick={resendConfirmation} disabled={resending}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, fontWeight: 700,
              color: resending ? 'rgba(240,253,244,0.35)' : 'var(--color-primary)',
              cursor: resending ? 'default' : 'pointer', textDecoration: 'underline' }}>
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
  const emailInvalid = !!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const pwMismatch   = !!confirmPassword && confirmPassword !== password;
  const pwMatch      = !!confirmPassword && confirmPassword === password && password.length >= 6;

  return (
    <form onSubmit={handleSubmit} className="space-y-4"
      autoComplete={mode === 'signup' ? 'off' : 'on'}>

      {mode === 'signup' && (
        <>
          <input type="text" name="prevent_autofill" style={{ display: 'none' }} readOnly tabIndex={-1} />
          <input type="password" name="prevent_autofill_pw" style={{ display: 'none' }} readOnly tabIndex={-1} />
        </>
      )}

      {/* ── Signup-only fields ── */}
      {mode === 'signup' && (
        <>
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

      {/* ── Email ── */}
      <div>
        <label htmlFor="email" className="block text-sm mb-1.5"
          style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
          Email address
        </label>
        <input id="email" type="email" value={email}
          onChange={e => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          placeholder="you@example.com"
          autoComplete={mode === 'signup' ? 'off' : 'email'}
          required disabled={loading} className="auth-input"
          style={emailInvalid ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.15)' } : {}}
        />
        {emailInvalid && (
          <p style={{ fontSize: 11.5, color: '#FCA5A5', margin: '5px 0 0', fontWeight: 600 }}>
            Enter a valid email address
          </p>
        )}
      </div>

      {/* ── Password ── */}
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
              if (error) setError(null);
            }}
            placeholder={showPassword ? 'Enter your password' : '••••••••'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required minLength={6} disabled={loading} className="auth-input"
            style={{ paddingRight: 48 }}
          />
          <button type="button" onClick={() => setShowPwd(v => !v)} tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', padding: 4, cursor: 'pointer',
              display: 'flex', alignItems: 'center', color: '#9CA3AF', borderRadius: 6 }}>
            {showPassword ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
          </button>
        </div>

        {/* Live requirements — signup only */}
        {mode === 'signup' && (
          <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'At least 6 characters', met: password.length >= 6 },
              { label: 'Not only spaces', met: password.length > 0 && password.trim().length > 0 },
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

      {/* ── Confirm password ── */}
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
            style={pwMismatch
              ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.15)' }
              : pwMatch
                ? { borderColor: '#22C55E', boxShadow: '0 0 0 3px rgba(34,197,94,0.15)' }
                : {}}
          />
          {pwMismatch && <p style={{ fontSize: 11.5, color: '#FCA5A5', margin: '5px 0 0', fontWeight: 600 }}>Passwords don&rsquo;t match</p>}
          {pwMatch    && <p style={{ fontSize: 11.5, color: '#86efac', margin: '5px 0 0', fontWeight: 600 }}>Passwords match ✓</p>}
        </div>
      )}

      {/* ── Error / Success ── */}
      {error && (
        <div className="rounded-xl px-4 py-3 text-sm whitespace-pre-line" role="alert"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#FCA5A5' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl px-4 py-3 text-sm" role="status"
          style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac' }}>
          {success}
        </div>
      )}

      {/* ── Submit ── */}
      <button type="submit"
        disabled={loading || pwMismatch}
        className="auth-btn" style={{ marginTop: 8 }}>
        {loading
          ? mode === 'signup' ? 'Creating account…' : 'Signing in…'
          : mode === 'signup' ? 'Create account' : 'Sign in'}
      </button>

      {mode === 'signup' && (
        <p style={{ fontSize: 11.5, color: 'rgba(240,253,244,0.45)', textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
          By creating an account, you agree to AgriNova&rsquo;s{' '}
          <Link href="/terms" target="_blank" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Terms &amp; Conditions</Link>
          {' '}and{' '}
          <Link href="/privacy" target="_blank" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Privacy Policy</Link>.
        </p>
      )}
    </form>
  );
}
