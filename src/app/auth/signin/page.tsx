'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { AuthForm } from '@/features/auth/components/AuthForm';
import { AuthLayout } from '@/features/auth/components/AuthLayout';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

const supabase = createClient();

// Shown instead of the sign-in form when the visitor already has a valid
// session — e.g. they never signed out, or followed an old bookmark to
// /auth/signin. Previously this case was handled by silently redirecting
// straight to the dashboard server-side, which read as "the app logged me
// in without asking for a password." Being explicit about who's signed in
// and letting them choose is the standard, trustworthy pattern (same as
// Google/GitHub's account-picker on their own login pages).
function AlreadySignedIn({ email }: { email: string }) {
  const [signingOut, setSigningOut] = useState(false);

  async function switchAccount() {
    setSigningOut(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
          padding: '12px 14px', borderRadius: 12, marginBottom: 20,
          background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)',
        }}
      >
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: 'var(--color-primary)', color: '#06210F',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 15,
        }}>
          {email[0]?.toUpperCase() ?? 'U'}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 12, color: 'rgba(240,253,244,0.55)', fontWeight: 700, margin: 0 }}>Signed in as</p>
          <p style={{ fontSize: 13.5, color: 'var(--color-text-on-dark)', fontWeight: 800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
        </div>
      </div>

      {/* Use a plain <a> (full-page navigation) instead of Next.js <Link>.
          The session cookie is already in document.cookie from the previous
          sign-in, but <Link> fires a client-side fetch that can arrive at
          the middleware before the browser has fully flushed that cookie.
          A hard navigation guarantees cookies are sent with the request. */}
      <a href="/dashboard" className="auth-btn" style={{ display: 'block', textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box' }}>
        Continue to dashboard
      </a>

      <button
        type="button"
        onClick={switchAccount}
        disabled={signingOut}
        style={{
          marginTop: 14, background: 'none', border: 'none', padding: 0,
          fontSize: 13, fontWeight: 700, textDecoration: 'underline',
          color: signingOut ? 'rgba(240,253,244,0.35)' : 'rgba(240,253,244,0.65)',
          cursor: signingOut ? 'default' : 'pointer',
        }}
      >
        {signingOut ? 'Signing out…' : 'Not you? Sign out and use a different account'}
      </button>
    </div>
  );
}

function SignInContent() {
  const params = useSearchParams();
  const error  = params.get('error');
  const reason = params.get('reason');

  const [checking, setChecking] = useState(true);
  const [existingEmail, setExistingEmail] = useState<string | null>(null);

  useEffect(() => {
    // Skip the check entirely if we're here because a session just expired.
    if (reason === 'session_expired') { setChecking(false); return; }
    // ⚠️  Intentionally using getSession() here — NOT getUser().
    // This check is purely for the "you're already signed in as X" UI widget.
    // It reads from localStorage with zero network round-trip, so the form
    // appears instantly on mobile instead of blocking 500-2000 ms waiting for
    // a Supabase network call.
    //
    // getUser() is the right call in middleware (src/proxy.ts) where it runs
    // server-side and validates the JWT with Supabase on every protected
    // request.  Using getUser() here (client-side, on a public page) would
    // add an unnecessary network call and cause the same "logged in then
    // immediately bounced" symptom if the request races against cookie writes.
    //
    // DO NOT replace getSession() with getUser() on this client-side page.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setExistingEmail(session?.user?.email ?? null);
      setChecking(false);
    });
    // Hard safety: if getSession somehow hangs (e.g. localStorage locked),
    // show the form after 800ms so mobile users are never stuck on a spinner.
    const fallback = setTimeout(() => setChecking(false), 800);
    return () => clearTimeout(fallback);
  }, [reason]);

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Cropify account"
      footer={
        <span>
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/signup"
            style={{ color: 'var(--color-primary)', fontWeight: 700 }}
          >
            Create one
          </Link>
        </span>
      }
    >
      {/* Session-expired security notice */}
      {reason === 'session_expired' && (
        <div
          className="rounded-xl px-4 py-3 text-sm mb-4 flex items-start gap-3"
          style={{
            background: 'rgba(251,191,36,0.10)',
            border: '1px solid rgba(251,191,36,0.30)',
            color: '#FDE68A',
          }}
          role="status"
          aria-live="polite"
        >
          <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            For your security, sessions expire after 12 hours. Please sign in again to continue.
          </span>
        </div>
      )}

      {/* Password just reset — confirm and prompt a fresh sign-in with it */}
      {reason === 'password_reset' && (
        <div
          className="rounded-xl px-4 py-3 text-sm mb-4 flex items-start gap-3"
          style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', color: '#86efac' }}
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>Password updated. Sign in with your new password.</span>
        </div>
      )}

      {/* Generic error param */}
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm mb-4 flex items-start gap-3 whitespace-pre-line"
          style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)',
            color: '#FCA5A5',
          }}
          role="alert"
        >
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            {error === 'missing_token'
              ? 'Invalid confirmation link. Please sign in or request a new confirmation email.'
              : error}
          </span>
        </div>
      )}

      {checking ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div
            style={{
              width: 22, height: 22, margin: '0 auto 14px',
              border: '2.5px solid rgba(240,253,244,0.20)', borderTopColor: 'var(--color-primary)',
              borderRadius: '50%', animation: 'spin 0.8s linear infinite',
            }}
            aria-hidden="true"
          />
          <p style={{ color: 'rgba(240,253,244,0.75)', fontSize: 13, margin: 0 }}>Just a moment…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : existingEmail ? (
        <AlreadySignedIn email={existingEmail} />
      ) : (
        <>
          <AuthForm mode="signin" />
          <div className="text-center mt-4">
            <Link
              href="/auth/forgot-password"
              className="text-sm"
              style={{ color: 'rgba(240,253,244,0.75)', fontWeight: 600 }}
            >
              Forgot your password?
            </Link>
          </div>
        </>
      )}
    </AuthLayout>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
