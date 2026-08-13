'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff, Fingerprint, Loader2 } from 'lucide-react';
import { OtpInput } from '@/components/ui/OtpInput';

interface AuthFormProps {
  mode: 'signin' | 'signup';
}

// Stable singleton — never recreated across renders
const supabase = createClient();

const OTP_EXPIRY_SECONDS = 3600;
const RESEND_COOLDOWN_SECONDS = 30;

function formatCountdown(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export function AuthForm({ mode }: AuthFormProps) {
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
  const [resendCooldown, setResendCooldown]   = useState(0);
  const [otpErrorTick, setOtpErrorTick]       = useState(0);
  const [clearingSession, setClearingSession] = useState(false);
  const [agreedToTerms, setAgreedToTerms]     = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricLoading, setBiometricLoading]     = useState(false);

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

  // ── Detect platform biometric/passcode support (sign-in only) ────────────
  useEffect(() => {
    if (mode !== 'signin') return;
    if (typeof window === 'undefined' || !window.PublicKeyCredential) return;
    window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then(setBiometricSupported)
      .catch(() => setBiometricSupported(false));
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
  }, []);

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

  // ── Resend cooldown — 30s, prevents hammering the resend-email API ───────
  // Reuses codeSentAt (set both when the OTP screen first appears and on a
  // successful resend) so no separate "screen opened" signal is needed.
  useEffect(() => {
    if (!codeSentAt) { setResendCooldown(0); return; }
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    const id = setInterval(() => {
      setResendCooldown(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [codeSentAt]);

  // ── Shared helper: exchange client-side tokens for server-set cookies ────
  // After any client-side sign-in (signInWithPassword, verifyOtp, signUp
  // with immediate session), createBrowserClient has written the session to
  // document.cookie — but those are non-httpOnly client cookies.  The
  // middleware (src/proxy.ts) uses createServerClient which expects the
  // session to be in httpOnly cookies set via Set-Cookie response headers.
  // On desktop browsers the client cookie write can lose the race against
  // the navigation request, so the middleware sees no session and bounces
  // the user back to /auth/signin.
  //
  // The fix: POST the raw tokens to /api/auth/set-session first.  That
  // route calls supabase.auth.setSession() server-side, which causes
  // createServerClient's setAll() handler to write proper httpOnly Set-Cookie
  // headers on the response.  By the time that fetch() resolves, the browser
  // has applied those Set-Cookie headers — so the subsequent navigation
  // arrives at the middleware with the cookies already committed.
  const exchangeSessionAndRedirect = useCallback(async (
    session: { access_token: string; refresh_token: string },
  ) => {
    // POST tokens to set-session so the server writes proper httpOnly
    // sb-* cookies via Set-Cookie headers. If this call fails (network
    // blip, token already expired, rate limit), we fall back gracefully —
    // createBrowserClient already wrote the session to document.cookie and
    // the middleware can read those too.
    try {
      const res = await fetch('/api/auth/set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token:  session.access_token,
          refresh_token: session.refresh_token,
        }),
      });

      if (!res.ok) {
        // set-session failed — log it but don't block navigation.
        // The browser-written cookies from signInWithPassword are still
        // present and the middleware will read them on the next request.
        console.warn('[Cropify] set-session returned', res.status, '— navigating with browser cookies');
      }
    } catch (err) {
      // Network error — same fallback: browser cookies are present.
      console.warn('[Cropify] set-session fetch failed:', err);
    }

    // Fire verification nudge in the background — don't block navigation.
    fetch('/api/auth/verification-check', { method: 'POST' }).catch(() => {});

    // Full-page navigation so the browser sends all cookies
    // (both the httpOnly ones from set-session AND the browser-written ones).
    window.location.href = '/dashboard';
  }, []);

  // ── Sign in ───────────────────────────────────────────────────────────────
  // Redirects via exchangeSessionAndRedirect — does NOT rely on
  // onAuthStateChange (WebSocket can fail silently on mobile/flaky networks).
  const signIn = useCallback(async () => {
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    if (data.session) {
      await exchangeSessionAndRedirect(data.session);
    }
  }, [email, password, exchangeSessionAndRedirect]);

  // ── Sign in with biometrics/device passcode (WebAuthn passkey) ───────────
  const signInWithBiometrics = useCallback(async () => {
    const { data, error: passkeyError } = await supabase.auth.signInWithPasskey();
    if (passkeyError) throw passkeyError;
    if (data.session) {
      await exchangeSessionAndRedirect(data.session);
    }
  }, [exchangeSessionAndRedirect]);

  const handleBiometricClick = useCallback(async () => {
    if (biometricLoading || loading) return;
    setBiometricLoading(true);
    setError(null);
    try {
      await signInWithBiometrics();
    } catch (err: unknown) {
      // A cancelled/dismissed prompt is a normal "changed my mind," not an error worth alarming over.
      const name = (err as any)?.name;
      const msg  = err instanceof Error ? err.message : '';
      const isCancel = name === 'NotAllowedError' || /cancel|not allowed/i.test(msg);
      if (!isCancel) setError('Biometric sign-in didn’t work. Please try again or sign in with your password.');
    } finally {
      setBiometricLoading(false);
    }
  }, [biometricLoading, loading, signInWithBiometrics]);

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
      // Genuinely new account + immediate session — create profile then redirect.
      // Exchange tokens for server-set httpOnly cookies before navigating.
      await fetch('/api/auth/create-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.user.id,
          fullName: fullName || data.user.email?.split('@')[0] || 'User',
          phoneNumber: phoneNumber || null,
          location: location || null,
          termsAccepted: agreedToTerms,
        }),
      }).catch(() => {});
      await exchangeSessionAndRedirect(data.session);
      return;
    }

    // Standard path — email confirmation required
    setSuccess(`Account created! We sent a 6-digit code to ${email} — enter it below to activate your account.`);
    setNeedsConfirmation(true);
    setCodeSentAt(Date.now());
  }, [email, password, fullName, phoneNumber, location, agreedToTerms, exchangeSessionAndRedirect]);

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

    if (mode === 'signup' && !agreedToTerms) {
      setError('Please accept the Terms & Conditions to continue.');
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
        console.error('[Cropify Auth] Connection error:', err);
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
        setError('Password is too weak — use at least 8 characters.');
      } else if (lower.includes('invalid email') || lower.includes('unable to validate email')) {
        setError("That email address doesn't look right. Please check it.");
      } else {
        console.error('[Cropify Auth] Unexpected error:', mode, err);
        setError(msg);
      }

      setLoading(false);
    } finally {
      submitLockRef.current = false;
      submittingRef.current = false;
      // Always reset loading — a successful sign-in navigates away via
      // window.location in signIn(), not via a state update here, so we
      // must clear loading regardless (harmless on the success path since
      // the page is about to unload anyway).
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
            termsAccepted: agreedToTerms,
          }),
        }).catch(() => {});
      }
      // Exchange client tokens for server-set httpOnly cookies before
      // navigating — same desktop cookie-race fix as signIn().
      if (data.session) {
        await exchangeSessionAndRedirect(data.session);
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired code';
      setError(
        msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid')
          ? 'That code is incorrect or has expired. Please check your email or request a new one.'
          : msg,
      );
      setOtpErrorTick(t => t + 1);
      setVerifying(false);
    }
  }, [code, verifying, email, mode, fullName, phoneNumber, location, agreedToTerms, exchangeSessionAndRedirect]);

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
          <label className="block text-sm mb-1.5 text-center"
            style={{ color: 'var(--color-text-on-dark)', fontWeight: 800 }}>
            Enter the 6-digit code
          </label>
          <OtpInput
            length={6}
            value={code}
            onChange={setCode}
            onComplete={verifyCode}
            errorTick={otpErrorTick}
            disabled={verifying}
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
          <button type="button" onClick={resendConfirmation} disabled={resending || resendCooldown > 0}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, fontWeight: 700,
              color: resending || resendCooldown > 0 ? 'rgba(240,253,244,0.35)' : 'var(--color-primary)',
              cursor: resending || resendCooldown > 0 ? 'default' : 'pointer',
              textDecoration: resending || resendCooldown > 0 ? 'none' : 'underline' }}>
            {resending
              ? 'Sending…'
              : resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : resent
              ? 'Email sent — check your inbox'
              : "Didn't get it? Resend code"}
          </button>
        </div>

        <Link href="/auth/signin"
          style={{ display: 'block', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'rgba(240,253,244,0.75)', marginTop: 4 }}>
          Back to sign in
        </Link>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  const emailInvalid = !!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const pwMismatch   = !!confirmPassword && confirmPassword !== password;
  const pwMatch      = !!confirmPassword && confirmPassword === password && password.length >= 8;

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
            // Only enforce the 8-char minimum on signup — an existing
            // account's real (server-side) password could be shorter under
            // the old 6-char policy, and this is the sign-in form's field,
            // not a password-change field, so it must never block a
            // correct legacy password from being submitted.
            required minLength={mode === 'signup' ? 8 : undefined} disabled={loading} className="auth-input"
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
              { label: 'At least 8 characters', met: password.length >= 8 },
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
            autoComplete="new-password" required minLength={8} disabled={loading}
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

      {/* ── Terms acceptance (signup only) ── */}
      {mode === 'signup' && (
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={e => { setAgreedToTerms(e.target.checked); if (error) setError(null); }}
            disabled={loading}
            required
            style={{ marginTop: 3, width: 15, height: 15, flexShrink: 0, cursor: 'pointer', accentColor: 'var(--color-primary)' }}
          />
          <span style={{ fontSize: 12, color: 'rgba(240,253,244,0.7)', lineHeight: 1.5 }}>
            I agree to Cropify&rsquo;s{' '}
            <Link href="/terms" target="_blank" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Terms &amp; Conditions</Link>
            {' '}and{' '}
            <Link href="/privacy" target="_blank" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Privacy Policy</Link>.
          </span>
        </label>
      )}

      {/* ── Submit ── */}
      <button type="submit"
        disabled={loading || pwMismatch || (mode === 'signup' && !agreedToTerms)}
        className="auth-btn" style={{ marginTop: 8 }}>
        {loading
          ? mode === 'signup' ? 'Creating account…' : 'Signing in…'
          : mode === 'signup' ? 'Create account' : 'Sign in'}
      </button>

      {/* ── Biometric / device-passcode sign-in ── */}
      {mode === 'signin' && biometricSupported && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
            <span style={{ flex: 1, height: 1, background: 'rgba(240,253,244,0.14)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(240,253,244,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>or</span>
            <span style={{ flex: 1, height: 1, background: 'rgba(240,253,244,0.14)' }} />
          </div>
          <button
            type="button"
            onClick={handleBiometricClick}
            disabled={loading || biometricLoading}
            className="auth-btn"
            style={{
              marginTop: 0, background: 'transparent', border: '1.5px solid rgba(240,253,244,0.2)',
              color: 'var(--color-text-on-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {biometricLoading
              ? <><Loader2 size={16} className="animate-spin" /> Follow the prompt on your device…</>
              : <><Fingerprint size={17} /> Sign in with biometrics</>}
          </button>
        </>
      )}
    </form>
  );
}
