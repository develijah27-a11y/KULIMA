'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { AppIcon } from '@/components/ui/AppIcon';
import { Wordmark } from '@/components/ui/Wordmark';
import {
  ArrowRight, Sparkles, ShieldCheck, Lock, Smartphone, Menu, X,
} from 'lucide-react';
import {
  PAPER, PAPER_2, INK, INK_MID, INK_MUTE, LINE, CARD,
  GREEN, GREEN_DEEP, GREEN_SOFT, FOREST, MINT, GOLD, GOLD_SOFT,
  FONT, HEAD_FONT, MONO_FONT,
} from './landing-tokens';

// Everything below the hero fold, code-split out so its JS isn't part of
// the bundle needed to paint and hydrate Nav/Hero — still server-rendered
// (ssr:true is next/dynamic's default), so there's no content/SEO
// regression, only the bundle is split. See LandingBelowFold.tsx.
const LandingBelowFold = dynamic(() => import('./LandingBelowFold'));

/* ─── Nav ─────────────────────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const links = [
    ['Features',     '#features'],
    ['How it works', '#how-it-works'],
    ['Trust',        '#trust'],
    ['Pricing',      '#pricing'],
  ];

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 64, display: 'flex', alignItems: 'center',
        padding: '0 clamp(16px,5vw,60px)',
        background: scrolled ? 'rgba(250,249,244,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px) saturate(180%)' : 'none',
        borderBottom: scrolled ? `1px solid ${LINE}` : 'none',
        transition: 'background 0.25s, backdrop-filter 0.25s, border-color 0.25s',
        fontFamily: FONT,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}>
          <AppIcon size={33} rounded={10} />
          <Wordmark color={INK} style={{ fontSize: 17 }} />
        </Link>

        {/* Desktop links */}
        <div style={{ flex: 1, justifyContent: 'center', gap: 4 }} className="nav-desktop-only">
          {links.map(([l, h]) => (
            <a key={l} href={h} style={{ fontSize: 13.5, fontWeight: 600, color: INK_MUTE, textDecoration: 'none', padding: '8px 14px', borderRadius: 8, transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = INK)}
              onMouseLeave={e => (e.currentTarget.style.color = INK_MUTE)}>{l}</a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div style={{ alignItems: 'center', gap: 8 }} className="nav-desktop-only">
          <Link href="/auth/signin" style={{ fontSize: 13.5, fontWeight: 700, color: INK_MID, textDecoration: 'none', padding: '9px 16px' }}>Sign in</Link>
          <Link href="/auth/signup" style={{ fontSize: 13.5, fontWeight: 800, color: '#fff', textDecoration: 'none', padding: '10px 22px', borderRadius: 11, background: GREEN, boxShadow: '0 4px 14px rgba(21,122,61,0.30)' }}>
            Create free account
          </Link>
        </div>

        {/* Mobile menu btn */}
        <button onClick={() => setMenuOpen(v => !v)} className="nav-mobile-only" style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: INK, padding: 6, minHeight: 'unset', minWidth: 'unset' }}>
          {menuOpen ? <X size={22}/> : <Menu size={22}/>}
        </button>
      </nav>

      {/* Mobile overlay menu */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99, background: PAPER, paddingTop: 64, flexDirection: 'column', fontFamily: FONT }} className="nav-mobile-only">
          <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {links.map(([l, h]) => (
              <a key={l} href={h} onClick={() => setMenuOpen(false)} style={{ fontSize: 18, fontWeight: 700, color: INK, textDecoration: 'none', padding: '15px 0', borderBottom: `1px solid ${LINE}` }}>{l}</a>
            ))}
          </div>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link href="/auth/signin" onClick={() => setMenuOpen(false)} style={{ fontSize: 15, fontWeight: 700, color: INK_MID, textDecoration: 'none', padding: '14px', textAlign: 'center', border: `1.5px solid ${LINE}`, borderRadius: 12 }}>Sign in</Link>
            <Link href="/auth/signup" onClick={() => setMenuOpen(false)} style={{ fontSize: 15, fontWeight: 800, color: '#fff', textDecoration: 'none', padding: '14px', textAlign: 'center', background: GREEN, borderRadius: 12 }}>Create free account</Link>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Hero ───────────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section style={{ background: PAPER, padding: 'clamp(84px,12vh,108px) clamp(16px,5vw,60px) clamp(40px,6vh,56px)', position: 'relative', overflow: 'hidden', fontFamily: FONT }}>
      {/* Fine dot-grid texture — the kind of quiet detail that reads as
          "designed," not just "styled." Faded via a radial mask so it
          never competes with the copy. */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(${INK} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
        opacity: 0.035,
        maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black 0%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black 0%, transparent 75%)',
      }} />
      {/* Ambient blobs */}
      <div aria-hidden style={{ position: 'absolute', top: -100, right: '6%', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${GREEN_SOFT} 0%, transparent 68%)`, pointerEvents: 'none', opacity: 0.85 }} />
      <div aria-hidden style={{ position: 'absolute', top: 60, left: '-4%', width: 380, height: 380, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD_SOFT} 0%, transparent 68%)`, pointerEvents: 'none', opacity: 0.7 }} />

      <div style={{ maxWidth: 1180, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(40px,6vw,80px)', flexWrap: 'wrap' }}>

          {/* Left — copy */}
          <div style={{ flex: '1 1 400px', minWidth: 0 }}>

            {/* Eyebrow pill */}
            <div className="landing-fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 99, background: CARD, border: `1px solid ${LINE}`, fontSize: 12, fontWeight: 700, color: GREEN_DEEP, marginBottom: 26, boxShadow: '0 2px 8px rgba(15,31,21,0.05)', animationDelay: '0ms' }}>
              <Sparkles size={13} color={GOLD} strokeWidth={2} /> Uganda&rsquo;s escrow-protected farm marketplace
            </div>

            {/* Headline */}
            <h1 className="landing-fade-up" style={{ fontSize: 'clamp(2.6rem,6.2vw,4.2rem)', fontWeight: 700, fontFamily: HEAD_FONT, letterSpacing: '-0.048em', lineHeight: 1.03, margin: '0 0 22px', color: INK, animationDelay: '65ms' }}>
              Farm smarter.<br />
              <span style={{ color: GREEN }}>Get paid,&nbsp;</span>
              <span style={{ color: GOLD }}>guaranteed.</span>
            </h1>

            {/* Body */}
            <p className="landing-fade-up" style={{ fontSize: 'clamp(15px,1.8vw,17.5px)', color: INK_MUTE, fontWeight: 400, lineHeight: 1.72, margin: '0 0 34px', maxWidth: 480, animationDelay: '140ms' }}>
              Sell direct. Diagnose crops instantly. Get paid in full, every time.
            </p>

            {/* CTAs */}
            <div className="landing-fade-up" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28, animationDelay: '215ms' }}>
              <Link href="/auth/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 14, background: GREEN, color: '#fff', fontWeight: 800, fontSize: 15.5, textDecoration: 'none', boxShadow: '0 12px 28px rgba(21,122,61,0.32)', letterSpacing: '-0.01em' }}>
                Create free account <ArrowRight size={17} strokeWidth={2.5} />
              </Link>
              <a href="#how-it-works" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 26px', borderRadius: 14, background: CARD, border: `1.5px solid ${LINE}`, color: INK_MID, fontWeight: 700, fontSize: 15.5, textDecoration: 'none' }}>
                See how it works
              </a>
            </div>

            {/* Trust signal row — concrete, checkable claims (payment rails,
                escrow, verification) read as more credible this close to
                the fold than another adjective in the headline would. */}
            <div className="landing-fade-up" style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 38, animationDelay: '250ms' }}>
              {[
                { icon: <Lock size={13} />, label: 'Escrow-protected' },
                { icon: <Smartphone size={13} />, label: 'MTN & Airtel Money' },
                { icon: <ShieldCheck size={13} />, label: 'ID-verified users' },
              ].map(({ icon, label }) => (
                <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: INK_MUTE }}>
                  <span style={{ color: GREEN, display: 'flex' }}>{icon}</span>{label}
                </span>
              ))}
            </div>

            {/* Stats row */}
            <div className="landing-fade-up" style={{ display: 'flex', gap: 32, flexWrap: 'wrap', animationDelay: '290ms' }}>
              {[['30+', 'Districts covered'], ['3 min', 'To sign up'], ['Free', 'Always for farmers']].map(([v, l]) => (
                <div key={l}>
                  <p style={{ fontSize: 22, fontWeight: 900, color: INK, margin: 0, letterSpacing: '-0.04em' }}>{v}</p>
                  <p style={{ fontSize: 11.5, color: INK_MUTE, margin: '3px 0 0', fontWeight: 600 }}>{l}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — phone, with a floating proof card for depth */}
          <div style={{ flex: '0 0 auto', position: 'relative', display: 'flex', justifyContent: 'center' }}>
            <div className="landing-fade-up landing-float phone-mockup-slot" style={{ animationDelay: '175ms' }}>
              <PhoneMockup />
            </div>
            <div
              aria-hidden
              className="landing-fade-up landing-badge-float hero-escrow-badge"
              style={{
                position: 'absolute', left: -34, bottom: 64, zIndex: 2, animationDelay: '420ms',
                display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px 11px 12px',
                borderRadius: 16, background: CARD, border: `1px solid ${LINE}`,
                boxShadow: '0 18px 40px rgba(15,31,21,0.16)',
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 11, background: GREEN_SOFT, color: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Lock size={16} strokeWidth={2.3} />
              </div>
              <div>
                <p style={{ fontSize: 12.5, fontWeight: 900, color: INK, margin: 0, letterSpacing: '-0.02em' }}>UGX 480,000</p>
                <p style={{ fontSize: 10, color: INK_MUTE, margin: '1px 0 0', fontWeight: 700 }}>held safely in escrow</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Live price ticker ───────────────────────────────────────────────────
   Scrolling mono-font strip fed by the same /api/market-prices endpoint
   the app's own dashboards use — real activity proof, not a mockup number.
   Falls back to a small static set (clearly still crop names, just not
   "live") if the fetch fails or returns nothing, so the ticker never shows
   an empty/broken strip. */
const TICKER_FALLBACK = [
  { crop: 'Maize', price: 1250 }, { crop: 'Beans', price: 3400 },
  { crop: 'Coffee', price: 9800 }, { crop: 'Cassava', price: 900 },
  { crop: 'Rice', price: 4200 }, { crop: 'Groundnuts', price: 5100 },
];

function PriceTicker() {
  const [rows, setRows] = useState<{ crop: string; price: number }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/market-prices')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(json => {
        if (cancelled) return;
        const averages: Record<string, number> = json?.averages ?? {};
        const entries = Object.entries(averages)
          .filter(([, v]) => typeof v === 'number' && v > 0)
          .map(([crop, price]) => ({ crop: crop.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), price }));
        setRows(entries.length > 0 ? entries : null);
      })
      .catch(() => { if (!cancelled) setRows(null); });
    return () => { cancelled = true; };
  }, []);

  const live = rows !== null;
  const data = rows ?? TICKER_FALLBACK;
  // Duplicate the row once so the CSS marquee can loop seamlessly at -50%.
  const strip = [...data, ...data];

  return (
    <div
      aria-label="District market prices"
      style={{
        background: FOREST, borderTop: `1px solid rgba(255,255,255,0.08)`, borderBottom: `1px solid rgba(255,255,255,0.08)`,
        overflow: 'hidden', position: 'relative', fontFamily: MONO_FONT,
      }}
    >
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 2, display: 'flex', alignItems: 'center',
        gap: 8, padding: '0 14px', background: FOREST, boxShadow: '18px 0 24px -6px rgba(13,43,24,0.9)',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: live ? MINT : 'rgba(255,255,255,0.35)', flexShrink: 0, boxShadow: live ? `0 0 6px ${MINT}` : 'none' }} aria-hidden />
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
          {live ? 'Live prices' : 'District prices'}
        </span>
      </div>
      <div className="price-ticker-track" style={{ display: 'flex', width: 'max-content', padding: '10px 0 10px 140px' }}>
        {strip.map((row, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 22px', whiteSpace: 'nowrap', borderRight: '1px solid rgba(255,255,255,0.10)' }}>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>{row.crop}</span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: MINT }}>UGX {row.price.toLocaleString()}/kg</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Social proof bar ────────────────────────────────────────────────────── */
function ProofBar() {
  return (
    <div style={{ background: CARD, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, padding: '16px clamp(16px,5vw,60px)', fontFamily: FONT }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(20px,5vw,52px)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: INK_MUTE, textTransform: 'uppercase', letterSpacing: '0.12em', whiteSpace: 'nowrap' }}>Works with</span>
        {['MTN Mobile Money', 'Airtel Money', 'Google Cloud AI', 'Stanbic Bank'].map(n => (
          <span key={n} style={{ fontSize: 13, fontWeight: 700, color: INK_MUTE, whiteSpace: 'nowrap' }}>{n}</span>
        ))}
      </div>
    </div>
  );
}

/* ─── Phone mockup ────────────────────────────────────────────────────────── */
function PhoneMockup() {
  return (
    <div className="phone-mockup" style={{ width: 244, height: 494, background: '#0A140C', borderRadius: 42, border: '8px solid #0F1F15', boxShadow: ['0 0 0 1px rgba(21,122,61,0.10)', '0 40px 80px rgba(15,31,21,0.28)', '0 20px 40px rgba(15,31,21,0.16)'].join(', '), overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)', width: 70, height: 10, background: '#0A140C', borderRadius: 99, zIndex: 10, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' }} />

      <div style={{ height: '100%', background: '#101A0D', display: 'flex', flexDirection: 'column' }}>
        {/* Status bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 16px 6px', fontSize: 7.5, fontWeight: 800, color: 'rgba(245,241,230,0.40)', letterSpacing: '0.04em' }}>
          <span>9:41</span>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <svg width="12" height="9" viewBox="0 0 14 10" fill="rgba(245,241,230,0.40)">
              <rect x="0" y="4" width="2" height="6" rx="0.5"/><rect x="3" y="2.5" width="2" height="7.5" rx="0.5"/>
              <rect x="6" y="1" width="2" height="9" rx="0.5"/><rect x="9" y="0" width="2" height="10" rx="0.5"/>
            </svg>
            <span>100%</span>
          </div>
        </div>

        <div style={{ flex: 1, padding: '8px 15px 0', overflowY: 'hidden' }}>
          <p style={{ fontSize: 8, fontWeight: 800, color: MINT, margin: '0 0 2px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Good morning</p>
          <p style={{ fontSize: 16, fontWeight: 900, color: '#F5F1E6', margin: '0 0 14px', letterSpacing: '-0.03em' }}>Namutebi Grace</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 9 }}>
            <div style={{ padding: '11px 12px', borderRadius: 13, background: '#123322', border: '1px solid rgba(95,224,160,0.18)' }}>
              <p style={{ fontSize: 7, fontWeight: 800, color: MINT, margin: '0 0 5px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Wallet</p>
              <p style={{ fontSize: 15, fontWeight: 900, color: '#F5F1E6', margin: 0, letterSpacing: '-0.03em' }}>480K</p>
              <p style={{ fontSize: 7, color: 'rgba(245,241,230,0.42)', margin: '2px 0 0', fontWeight: 600 }}>UGX balance</p>
            </div>
            <div style={{ padding: '11px 12px', borderRadius: 13, background: '#2B2007', border: '1px solid rgba(231,167,61,0.20)' }}>
              <p style={{ fontSize: 7, fontWeight: 800, color: GOLD, margin: '0 0 5px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Maize</p>
              <p style={{ fontSize: 15, fontWeight: 900, color: '#F5F1E6', margin: 0, letterSpacing: '-0.03em' }}>+12%</p>
              <p style={{ fontSize: 7, color: 'rgba(245,241,230,0.42)', margin: '2px 0 0', fontWeight: 600 }}>Price this week</p>
            </div>
          </div>

          <div style={{ padding: '10px 12px', borderRadius: 12, marginBottom: 9, background: '#141F10', border: '1px solid rgba(95,224,160,0.18)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: MINT, flexShrink: 0, boxShadow: `0 0 6px ${MINT}99` }} />
            <p style={{ fontSize: 9, fontWeight: 600, color: '#D3EFDB', margin: 0, lineHeight: 1.3 }}>Buyer offer accepted · 300 kg beans</p>
          </div>

          <div style={{ padding: '10px 12px', borderRadius: 12, background: '#0E1E28', border: '1px solid rgba(47,143,206,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 7, fontWeight: 800, color: '#4FA8D8', margin: '0 0 2px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Weather · Kampala</p>
              <p style={{ fontSize: 9, fontWeight: 600, color: '#B9DEF0', margin: 0 }}>Rain expected Thursday</p>
            </div>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4FA8D8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/>
              <line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/>
              <line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/>
              <line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/>
            </svg>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            {[{ l: 'Sell', c: MINT, bg: '#123322' }, { l: 'Buy', c: GOLD, bg: '#2B2007' }, { l: 'Doctor', c: '#C084FC', bg: '#231A3D' }].map(({ l, c, bg }) => (
              <div key={l} style={{ flex: 1, padding: '8px 4px', borderRadius: 10, background: bg, textAlign: 'center' }}>
                <p style={{ fontSize: 8.5, fontWeight: 800, color: c, margin: 0 }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '9px 16px 15px', borderTop: '1px solid rgba(245,241,230,0.05)', background: '#0D1611', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          {[{ label: 'Home', active: true }, { label: 'Market', active: false }, { label: 'Wallet', active: false }, { label: 'More', active: false }].map(({ label, active }) => (
            <div key={label} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ width: 20, height: 3, borderRadius: 99, background: active ? MINT : 'transparent', marginBottom: 1 }} />
              <div style={{ width: 22, height: 16, borderRadius: 5, background: active ? 'rgba(95,224,160,0.18)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 11, height: 9, borderRadius: 2.5, background: active ? MINT : 'rgba(245,241,230,0.20)' }} />
              </div>
              <p style={{ fontSize: 6.5, fontWeight: active ? 800 : 500, color: active ? MINT : 'rgba(245,241,230,0.30)', margin: 0 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Page root ───────────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <div style={{ background: PAPER, color: INK, fontFamily: FONT, overflowX: 'hidden' }}>
      {/* Phone mockup is built from fixed pixel values so its internal
          type/spacing stays crisp — scaled as a whole unit via `transform`
          (not resized) so it never crowds or overflows the smallest real
          phone viewports (~320px CSS width). The slot around it reserves
          the already-scaled footprint so nothing collapses or leaves a gap. */}
      <style>{`
        /* Desktop nav / mobile menu-button visibility toggle, written as
           plain CSS rather than Tailwind's hidden/md: utilities — those
           utilities were unreliably resolving in this build (computed
           style stayed display:flex below the md breakpoint), which left
           the full desktop nav overlapping the mobile hamburger button and
           overflowing the viewport on real phones. Explicit rules here are
           easy to verify and don't depend on utility-class generation. */
        .nav-desktop-only { display: none; }
        .nav-mobile-only { display: flex; }
        @media (min-width: 768px) {
          .nav-desktop-only { display: flex; }
          .nav-mobile-only { display: none; }
        }
        /* The "wide" (span 2) feature card doesn't fit two 275px grid
           tracks plus gap on narrow phones — CSS Grid doesn't auto-shrink
           an explicit span, so it was overflowing the viewport instead of
           collapsing to one column. */
        @media (max-width: 600px) {
          .feature-wide { grid-column: span 1 !important; flex-direction: column !important; align-items: flex-start !important; gap: 0 !important; }
        }
        /* Price ticker marquee — the strip array is rendered twice
           back-to-back in PriceTicker, so translating exactly -50% loops
           seamlessly with no visible seam or reset jump. */
        @keyframes priceTickerScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .price-ticker-track { animation: priceTickerScroll 32s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .price-ticker-track { animation: none; }
          .trust-stamp { transition: none !important; }
        }
        /* On-brand keyboard focus ring — the default browser outline reads
           as disconnected on pill/rounded-corner buttons at this scale, so
           this replaces it with a colour and offset that matches the rest
           of the page rather than removing it. Never hidden on :focus
           alone — only :focus-visible, so mouse clicks stay outline-free
           while keyboard/switch navigation always gets a visible ring. */
        a:focus-visible, button:focus-visible {
          outline: 2.5px solid ${GREEN};
          outline-offset: 3px;
          border-radius: 6px;
        }
        @media (max-width: 420px) {
          .phone-mockup-slot { width: 210px; height: 426px; }
          .phone-mockup { transform: scale(0.861); transform-origin: top center; }
        }
        @media (max-width: 350px) {
          .phone-mockup-slot { width: 184px; height: 373px; }
          .phone-mockup { transform: scale(0.754); transform-origin: top center; }
        }
        /* The floating escrow badge overlaps the phone's left edge by
           design (34px) — on narrow phones that would push it past the
           viewport edge and force horizontal scroll, so it tucks fully
           inside the mockup's footprint below 480px instead of hiding
           outright (still communicates the same trust signal). */
        @media (max-width: 480px) {
          .hero-escrow-badge { left: 4px !important; bottom: 40px !important; }
        }
        /* Two full-sentence columns get too tight below ~560px — stack
           "before" over "with Cropify" per row instead of side-by-side. */
        @media (max-width: 560px) {
          .why-different-row { grid-template-columns: 1fr !important; }
          .why-different-row > div:first-child { border-right: none !important; }
        }
      `}</style>
      <Nav />
      <Hero />
      <PriceTicker />
      <ProofBar />
      <LandingBelowFold />
    </div>
  );
}
